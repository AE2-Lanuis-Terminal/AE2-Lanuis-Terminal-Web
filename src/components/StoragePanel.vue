<!--
  ME 库存：WebSocket 实时 snapshot；REST 兜底。
  可合成物品：数量预设 → 预览计划 → CraftConfirmDialog 确认提交。
  正在合成的条目独占置顶行（对齐 AE2 终端 pin 行），并根据 craftJobs 进度显示从左到右背景填充。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type CraftPlanResponse, type Item, type NetworkSummary } from '../api/client'
import ItemIcon from './ItemIcon.vue'
import ItemMetaTags from './ItemMetaTags.vue'
import McFormattedText from './McFormattedText.vue'
import ScrollFade from './ScrollFade.vue'
import { formatExactAmount, formatStackAmount } from '../lib/formatAmount'
import { connectStorageRealtime, type StorageRealtimeSession } from '../lib/storageRealtime'
import { useSwapKey } from '../composables/useSwapKey'
import { ITEM_KIND_FILTER_OPTIONS, ITEM_KIND_META, resolveItemKind } from '../lib/itemKind'
import { partitionPinnedCrafting } from '../lib/pinCraftingItems'
import { useCraftJobsStore } from '../stores/craftJobs'
import { jobProgressPercent } from '../lib/craftJobProgress'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CircleHelp, LayoutGridIcon } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { affixActionClass, AppButton, AppDialog, AppFadeSwap, AppInput, AppPagination, AppSelect, type AppSelectOption } from '@/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { stripMcFormat } from '@/lib/mcFormat'
import { cn } from '@/lib/utils'

const CraftConfirmDialog = defineAsyncComponent(() => import('./CraftConfirmDialog.vue'))

const COMPACT_KEY = 'ae2lanuis.storageCompact'

const emit = defineEmits<{
  network: [NetworkSummary]
}>()

const { t } = useI18n()
const q = ref('')
/** all | item | fluid | other */
const kind = ref('all')
/** all | stocked | craftable */
const filter = ref('all')
/** name | amount */
const sort = ref('name')
/** asc | desc */
const order = ref('asc')
/** 精简：仅图标 + 右下角数量 */
const compact = ref(typeof localStorage !== 'undefined' && localStorage.getItem(COMPACT_KEY) === '1')
const page = ref(1)

const kindOptions = computed<AppSelectOption[]>(() => [
  { value: 'all', label: t('storage.kindAll') },
  ...ITEM_KIND_FILTER_OPTIONS.map((id) => ({
    value: id,
    label: t(id === 'item' ? 'storage.kindItem' : id === 'fluid' ? 'storage.kindFluid' : 'storage.kindOther'),
  })),
])
const filterOptions = computed<AppSelectOption[]>(() => [
  { value: 'all', label: t('storage.filterAll') },
  { value: 'stocked', label: t('storage.filterStocked') },
  { value: 'craftable', label: t('storage.filterCraftable') },
])
const sortOptions = computed<AppSelectOption[]>(() => [
  { value: 'name', label: t('storage.sortName') },
  { value: 'amount', label: t('storage.sortAmount') },
  { value: 'mod', label: t('storage.sortMod') },
])
const orderToggleLabel = computed(() => (order.value === 'asc' ? t('storage.orderAsc') : t('storage.orderDesc')))

function toggleOrder() {
  order.value = order.value === 'asc' ? 'desc' : 'asc'
}

function toggleCompact() {
  compact.value = !compact.value
  localStorage.setItem(COMPACT_KEY, compact.value ? '1' : '0')
}

function itemLabel(item: Item) {
  return stripMcFormat(item.displayName) || item.id
}

const pageSize = ref(96)
const total = ref(0)
const items = ref<Item[]>([])
const loading = ref(true)
const error = ref('')
const selected = ref<Item | null>(null)
const detailOpen = ref(false)
const listSwapKey = useSwapKey([q, kind, filter, sort, order, page, pageSize], items)

/** 合成：数量 → 预览计划弹窗 */
const craftAmount = ref('1')
const planInfo = ref<CraftPlanResponse | null>(null)
const craftMessage = ref('')
const craftBusy = ref(false)
const confirmOpen = ref(false)

const AMOUNT_PRESETS = [1, 16, 64, 256, 1024] as const

let session: StorageRealtimeSession | null = null

const showExact = computed(() => {
  if (!selected.value) return false
  const display = formatStackAmount(selected.value)
  const raw = selected.value.amount || '0'
  if (selected.value.isFluid || resolveItemKind(selected.value) === 'fluid') {
    return display !== `${raw} mB`
  }
  return display !== raw
})

const canCraft = computed(() => Boolean(selected.value?.craftable))

const craftJobs = useCraftJobsStore()
const { busyJobs } = storeToRefs(craftJobs)

/** 正在合成的产出 → 进度%；同物品多 CPU 取较高值 */
const craftingProgressByKey = computed(() => {
  const map = new Map<string, number>()
  for (const job of busyJobs.value) {
    const out = job.output
    if (!out) continue
    const pct = jobProgressPercent(job)
    if (pct == null) continue
    for (const k of [out.key, out.id]) {
      if (!k) continue
      const prev = map.get(k) ?? 0
      if (pct >= prev) map.set(k, pct)
    }
  }
  return map
})

function craftProgress(item: Item): number | null {
  const m = craftingProgressByKey.value
  return m.get(item.key) ?? m.get(item.id) ?? null
}

/** 当前页安全网：合成中单独一行，其余保持原排序 */
const partitionedItems = computed(() => partitionPinnedCrafting(items.value, items.value, busyJobs.value, { onlyPresent: true }))
const pinnedItems = computed(() => partitionedItems.value.pinned)
const restItems = computed(() => partitionedItems.value.rest)

function craftProgressStyle(item: Item): Record<string, string> | undefined {
  const pct = craftProgress(item)
  if (pct == null) return undefined
  return { '--craft-progress': `${pct}%` }
}

/** 库存格子：按 kind 注册表上色；可合成左侧宽条；零库存虚线；合成中背景进度 */
function itemChipClass(item: Item) {
  let stocked = false
  try {
    stocked = BigInt(item.amount || '0') > 0n
  } catch {
    stocked = Number(item.amount) > 0
  }
  const kindId = resolveItemKind(item)
  return cn(
    'ui-glass-chip ui-hover-room text-left',
    compact.value
      ? 'relative inline-flex size-[3.25rem] items-center justify-center overflow-hidden rounded-[8px] p-0'
      : 'grid min-h-[76px] min-w-[140px] gap-0.5 rounded-[8px] p-2.5',
    ITEM_KIND_META[kindId].chipMod,
    item.craftable && 'ui-item-chip--craftable',
    !stocked && 'ui-item-chip--empty',
    craftProgress(item) != null && 'ui-item-chip--crafting',
  )
}

function gridClass() {
  return compact.value ? 'grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5' : 'grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5'
}

function applySubscribe() {
  session?.subscribe({
    q: q.value,
    kind: kind.value,
    filter: filter.value,
    sort: sort.value,
    order: order.value,
    page: page.value,
    pageSize: pageSize.value,
  })
}

function resetCraftState() {
  craftAmount.value = '1'
  planInfo.value = null
  craftMessage.value = ''
  craftBusy.value = false
  confirmOpen.value = false
}

function openDetail(item: Item) {
  selected.value = item
  resetCraftState()
  detailOpen.value = true
}

function onDetailOpen(open: boolean) {
  detailOpen.value = open
  if (!open) {
    selected.value = null
    resetCraftState()
  }
}

function applyPreset(n: number) {
  craftAmount.value = String(n)
  planInfo.value = null
  craftMessage.value = ''
}

watch(craftAmount, () => {
  planInfo.value = null
  if (!craftBusy.value) craftMessage.value = ''
})

/** 预览计划：缺料/字节不足仍打开确认框（盖在详情之上，不关一级） */
async function previewPlan() {
  if (!selected.value?.craftable) return
  craftBusy.value = true
  craftMessage.value = t('craft.calculating')
  try {
    planInfo.value = await api.plan({ key: selected.value.key, amount: craftAmount.value })
    craftMessage.value = ''
    confirmOpen.value = true
  } catch (e) {
    planInfo.value = null
    craftMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    craftBusy.value = false
  }
}

function onConfirmOpen(open: boolean) {
  confirmOpen.value = open
  if (!open) {
    planInfo.value = null
  }
}

function onCraftSubmitted() {
  confirmOpen.value = false
  planInfo.value = null
  onDetailOpen(false)
  void craftJobs.refresh()
}

/** REST 兜底：WS 不可用或用户点查询 */
async function loadRest() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      q: q.value,
      kind: kind.value,
      filter: filter.value,
      sort: sort.value,
      order: order.value,
      page: String(page.value),
      pageSize: String(pageSize.value),
    })
    const data = await api.items(params)
    items.value = data.items
    total.value = data.total
    emit('network', data.network)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function onPaginationChange() {
  loading.value = true
  applySubscribe()
}

/** 输入防抖：重发 subscribe，不改推送间隔 */
let timer: number | undefined
watch([q, kind, filter, sort, order], () => {
  page.value = 1
  loading.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => applySubscribe(), 200)
})

onMounted(async () => {
  session = await connectStorageRealtime({
    onSnapshot: (msg) => {
      items.value = msg.items
      total.value = msg.total
      loading.value = false
      error.value = ''
      emit('network', msg.network)
      if (selected.value && detailOpen.value) {
        const next = msg.items.find((i) => i.key === selected.value?.key)
        if (next) selected.value = next
      }
    },
    onStatus: () => {},
    onError: (m) => {
      error.value = m
    },
  })
  applySubscribe()
})

onUnmounted(() => {
  window.clearTimeout(timer)
  session?.close()
  session = null
})
</script>

<template>
  <section class="flex h-full min-h-[240px] min-w-[280px] flex-col overflow-hidden">
    <div class="mb-3 flex shrink-0 flex-wrap items-center gap-2">
      <AppInput v-model="q" compact mono class="min-w-[11rem] flex-1 basis-[11rem]" :placeholder="t('storage.search')">
        <template #affix>
          <button type="button" :class="affixActionClass()" @click="loadRest">
            {{ t('common.query') }}
          </button>
        </template>
      </AppInput>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <AppSelect v-model="kind" compact :options="kindOptions" :aria-label="t('storage.kind')" />
        <AppSelect v-model="filter" compact :options="filterOptions" :aria-label="t('storage.filter')" />
        <AppSelect v-model="sort" compact :options="sortOptions" :aria-label="t('storage.sort')">
          <template #affix>
            <button type="button" :class="affixActionClass('min-w-6 px-1')" :aria-label="orderToggleLabel" :title="orderToggleLabel" @click="toggleOrder">
              <ArrowUpNarrowWide v-if="order === 'asc'" class="size-3.5" aria-hidden="true" />
              <ArrowDownWideNarrow v-else class="size-3.5" aria-hidden="true" />
            </button>
          </template>
        </AppSelect>
        <button
          type="button"
          class="ui-btn !h-8 !min-w-8 !px-2"
          :class="compact ? '!border-cyan/50 !text-cyan' : undefined"
          :aria-pressed="compact"
          :aria-label="compact ? t('storage.viewDetailed') : t('storage.viewCompact')"
          :title="compact ? t('storage.viewDetailed') : t('storage.viewCompact')"
          @click="toggleCompact"
        >
          <LayoutGridIcon class="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <p v-if="error" class="mb-2 shrink-0 text-[13px] text-red">{{ error }}</p>

    <div class="relative min-h-0 flex-1" :aria-busy="loading || undefined">
      <div v-if="loading" class="ui-loading-bar" role="status" :aria-label="t('common.loading')" />
      <ScrollFade class="h-full min-h-0 overflow-auto" :class="loading && items.length ? 'opacity-55' : undefined">
        <AppFadeSwap :swap-key="listSwapKey" appear>
          <div class="flex flex-col gap-1.5">
            <!-- 置顶独占一行，不与下方库存共格 -->
            <div v-if="pinnedItems.length" :class="[gridClass(), 'border-b border-line pb-1.5']" role="list" :aria-label="t('storage.crafting')">
              <Tooltip v-for="item in pinnedItems" :key="`pin:${item.key}`" :disabled="!compact">
                <TooltipTrigger as-child>
                  <button type="button" :class="itemChipClass(item)" :style="craftProgressStyle(item)" :aria-busy="true" :aria-label="itemLabel(item)" @click="openDetail(item)">
                    <template v-if="compact">
                      <ItemIcon :item="item" flush class="relative z-[1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" />
                      <span class="ui-me-slot-amount mono max-w-[90%] truncate">{{ formatStackAmount(item) }}</span>
                    </template>
                    <div v-else class="flex items-start gap-2">
                      <span class="inline-block size-7 shrink-0">
                        <ItemIcon :item="item" />
                      </span>
                      <div class="min-w-0 flex-1 grid gap-0.5">
                        <strong class="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                          <McFormattedText :text="item.displayName" />
                        </strong>
                        <span class="mono text-[11px] font-bold text-ink">{{ formatStackAmount(item) }}</span>
                        <ItemMetaTags :item="item" crafting />
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  v-if="compact"
                  side="top"
                  :side-offset="6"
                  class="!max-w-[14rem] !border !border-line !bg-[var(--glass-bg-strong)] !px-2.5 !py-1.5 !text-ink shadow-[var(--glass-shadow)] [&_svg]:!bg-[var(--glass-bg-strong)] [&_svg]:!fill-[var(--glass-bg-strong)]"
                >
                  <span class="block max-w-full truncate text-[12px] font-medium">
                    <McFormattedText :text="item.displayName" />
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <div :class="gridClass()">
              <Tooltip v-for="item in restItems" :key="item.key" :disabled="!compact">
                <TooltipTrigger as-child>
                  <button type="button" :class="itemChipClass(item)" :style="craftProgressStyle(item)" :aria-label="itemLabel(item)" @click="openDetail(item)">
                    <template v-if="compact">
                      <ItemIcon :item="item" flush class="relative z-[1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" />
                      <span class="ui-me-slot-amount mono max-w-[90%] truncate">{{ formatStackAmount(item) }}</span>
                    </template>
                    <div v-else class="flex items-start gap-2">
                      <span class="inline-block size-7 shrink-0">
                        <ItemIcon :item="item" />
                      </span>
                      <div class="min-w-0 flex-1 grid gap-0.5">
                        <strong class="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                          <McFormattedText :text="item.displayName" />
                        </strong>
                        <span class="mono text-[11px] font-bold text-ink">{{ formatStackAmount(item) }}</span>
                        <ItemMetaTags :item="item" />
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  v-if="compact"
                  side="top"
                  :side-offset="6"
                  class="!max-w-[14rem] !border !border-line !bg-[var(--glass-bg-strong)] !px-2.5 !py-1.5 !text-ink shadow-[var(--glass-shadow)] [&_svg]:!bg-[var(--glass-bg-strong)] [&_svg]:!fill-[var(--glass-bg-strong)]"
                >
                  <span class="block max-w-full truncate text-[12px] font-medium">
                    <McFormattedText :text="item.displayName" />
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </AppFadeSwap>
      </ScrollFade>
    </div>

    <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="total" @change="onPaginationChange" />

    <AppDialog :open="detailOpen" prevent-open-focus :class="canCraft ? 'min-w-[18rem] max-w-[min(100%-1.5rem,22rem)] sm:max-w-[22rem]' : undefined" @update:open="onDetailOpen">
      <template #header>
        <div class="flex items-center gap-2 pr-7">
          <span v-if="selected" class="inline-block size-9 shrink-0">
            <ItemIcon :item="selected" />
          </span>
          <div class="min-w-0">
            <h2 class="m-0 text-[13px] font-semibold tracking-[-0.02em]">
              <McFormattedText v-if="selected" :text="selected.displayName" />
              <template v-else>{{ t('storage.detail') }}</template>
            </h2>
            <p v-if="selected" class="mono m-0 mt-0.5 truncate text-[11px] text-muted">{{ selected.id }}</p>
          </div>
        </div>
      </template>

      <template v-if="selected">
        <p class="m-0 text-[13px]">
          {{ t('storage.amount') }}
          <strong class="mono font-bold text-ink">{{ formatStackAmount(selected) }}</strong>
        </p>
        <p v-if="showExact" class="m-0 text-[12px] text-muted">
          {{ t('storage.amountExact') }}
          <span class="mono">{{ formatExactAmount(selected) }}</span>
        </p>
        <ItemMetaTags :item="selected" :crafting="craftProgress(selected) != null" />

        <div v-if="canCraft" class="mt-1 grid gap-2.5 border-t border-line pt-2.5">
          <label class="grid gap-1.5">
            <span class="text-xs text-muted">{{ t('craft.amount') }}</span>
            <AppInput v-model="craftAmount" mono compact />
            <div class="flex flex-wrap gap-1.5" role="group" :aria-label="t('craft.presets')">
              <button
                v-for="n in AMOUNT_PRESETS"
                :key="n"
                type="button"
                class="ui-btn mono !h-7 !min-w-9 !px-2 text-[11px]"
                :class="craftAmount === String(n) ? '!border-cyan/55 !text-cyan' : ''"
                @click="applyPreset(n)"
              >
                {{ n }}
              </button>
            </div>
          </label>
          <AppButton type="button" variant="primary" size="sm" class="w-full" :disabled="craftBusy" @click="previewPlan">
            {{ t('craft.previewPlan') }}
          </AppButton>
          <p class="m-0 flex items-start gap-1 text-[11px] leading-snug text-muted">
            <CircleHelp class="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <span>{{ t('craft.previewPlanHint') }}</span>
          </p>
          <p class="m-0 min-h-4 text-xs text-muted">{{ craftMessage }}</p>
        </div>
      </template>

      <template #footer>
        <AppButton type="button" variant="outline" size="sm" @click="onDetailOpen(false)">
          {{ t('common.close') }}
        </AppButton>
      </template>

      <!-- 二级确认：嵌套在一级 Dialog 内，叠在上方 -->
      <template #nested>
        <CraftConfirmDialog :open="confirmOpen" :plan="planInfo" @update:open="onConfirmOpen" @submitted="onCraftSubmitted" />
      </template>
    </AppDialog>
  </section>
</template>
