<!--
  合成确认：摘要 + CPU + 材料列表（总数/库存/要合成）；合成树另开弹窗。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NetworkIcon } from '@lucide/vue'
import type { CraftPlanResponse, Item } from '@/types'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import CraftRecipeTree from './CraftRecipeTree.vue'
import { formatStackAmount } from '../lib/formatAmount'
import { AppButton, AppDialog, AppSelect, type AppSelectOption } from '@/ui'
import { api } from '../api/client'

const props = defineProps<{
  open: boolean
  plan: CraftPlanResponse | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const { t } = useI18n()
const busy = ref(false)
const message = ref('')
const treeOpen = ref(false)
/** `__auto__` = 自动选择（Reka Select 禁止空字符串 value） */
const CPU_AUTO = '__auto__'
const selectedCpu = ref(CPU_AUTO)
/** 关闭动画期间仍保留内容，避免主体先空、footer 后消失 */
const viewPlan = ref<CraftPlanResponse | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      message.value = ''
      treeOpen.value = false
      if (props.plan) viewPlan.value = props.plan
      const suitable = (viewPlan.value?.cpus ?? []).filter((c) => c.suitable)
      selectedCpu.value = suitable.length === 1 ? suitable[0]!.cpuName : CPU_AUTO
    } else {
      treeOpen.value = false
    }
  },
)

watch(
  () => props.plan,
  (p) => {
    if (props.open && p) viewPlan.value = p
  },
)

const cpuOptions = computed<AppSelectOption[]>(() => {
  const opts: AppSelectOption[] = [{ value: CPU_AUTO, label: t('craft.cpuAuto') }]
  for (const cpu of viewPlan.value?.cpus ?? []) {
    if (!cpu.suitable) continue
    opts.push({
      value: cpu.cpuName,
      label: `${cpu.cpuName} · ${t('craft.cpuOptionMeta', { bytes: cpu.bytesAvailable, co: cpu.coProcessors })}`,
    })
  }
  return opts
})

/** 材料行：优先用接口 total/stock/toCraft，否则用 used+missing 拼 */
const materialRows = computed(() => {
  const plan = viewPlan.value
  if (!plan) return [] as Array<Item & { total: string; stock: string; toCraft: string }>
  const missingMap = new Map(plan.missing.map((m) => [m.key, m]))
  const rows: Array<Item & { total: string; stock: string; toCraft: string }> = []
  const seen = new Set<string>()

  for (const it of plan.usedItems ?? []) {
    seen.add(it.key)
    const miss = missingMap.get(it.key)
    const usedAmt = BigInt(it.amount || '0')
    const missAmt = BigInt(miss?.amount || '0')
    const total = it.total ?? String(usedAmt + missAmt)
    const stock = it.stock ?? it.amount
    const toCraft = it.toCraft ?? (miss ? miss.amount : '0')
    rows.push({ ...it, total, stock, toCraft })
  }
  for (const miss of plan.missing) {
    if (seen.has(miss.key)) continue
    rows.push({
      ...miss,
      total: miss.total ?? miss.amount,
      stock: miss.stock ?? '0',
      toCraft: miss.toCraft ?? miss.amount,
    })
  }
  return rows
})

function onOpen(v: boolean) {
  emit('update:open', v)
}

async function submit() {
  const plan = viewPlan.value
  if (!plan?.canSubmit) return
  const cpuName = selectedCpu.value === CPU_AUTO ? '' : selectedCpu.value
  if (cpuName) {
    const row = plan.cpus?.find((c) => c.cpuName === cpuName)
    if (!row?.suitable) {
      message.value = t('craft.cpuUnsuitable')
      return
    }
  }
  busy.value = true
  message.value = ''
  try {
    await api.submit({
      planId: plan.planId,
      ...(cpuName ? { cpuName } : {}),
    })
    emit('submitted')
    emit('update:open', false)
  } catch (e) {
    message.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function modeLabel(mode?: string) {
  if (!mode || mode === 'leaf') return t('craft.treeLeaf')
  const map: Record<string, string> = {
    crafting: t('patterns.modeCrafting'),
    processing: t('patterns.modeProcessing'),
    smithing: t('patterns.modeSmithing'),
    stonecutting: t('patterns.modeStonecutting'),
    other: t('patterns.modeOther'),
  }
  return map[mode] || mode
}

function needsCraft(row: { toCraft: string }) {
  try {
    return BigInt(row.toCraft || '0') > 0n
  } catch {
    return Number(row.toCraft) > 0
  }
}
</script>

<template>
  <AppDialog
    :open="open"
    :layer="1"
    class="!flex !max-h-[min(92vh,40rem)] !w-[min(96vw,36rem)] !min-w-0 !max-w-[min(96vw,36rem)] !flex-col sm:!max-w-[min(96vw,36rem)]"
    @update:open="onOpen"
  >
    <template #header>
      <div class="flex items-center gap-2 pr-7">
        <span v-if="viewPlan?.output" class="inline-block size-9 shrink-0">
          <ItemIcon :item="viewPlan.output" />
        </span>
        <div class="min-w-0">
          <h2 class="m-0 text-[0.81rem] font-semibold tracking-[-0.02em]">
            <template v-if="viewPlan?.output">
              <McFormattedText :text="viewPlan.output.displayName" />
              <span class="mono text-cyan"> × {{ viewPlan.output.amount }}</span>
            </template>
          </h2>
        </div>
      </div>
    </template>

    <template v-if="viewPlan">
      <div class="relative flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <AppButton
          v-if="viewPlan.tree"
          type="button"
          variant="outline"
          size="sm"
          class="absolute top-0 right-0 z-[1] !h-7 gap-1 !px-2"
          :aria-label="t('craft.viewTree')"
          :title="t('craft.viewTree')"
          @click="treeOpen = true"
        >
          <NetworkIcon class="size-3.5" aria-hidden="true" />
          <span class="text-[0.69rem]">{{ t('craft.viewTree') }}</span>
        </AppButton>

        <div class="grid shrink-0 gap-1 pr-24 text-[0.75rem]">
          <p class="mono m-0">
            {{ t('craft.bytes', { bytes: viewPlan.bytes }) }}
            <span class="text-muted"> / {{ t('craft.bytesAvailable', { bytes: viewPlan.bytesAvailable }) }}</span>
          </p>
          <p class="m-0 text-muted">
            {{ t('craft.coProcessors', { count: viewPlan.coProcessors }) }}
            · {{ t('craft.idleCpu', { idle: viewPlan.idleCpuCount, total: viewPlan.cpuCount }) }}
          </p>
          <p v-if="viewPlan.multiplePaths" class="m-0 text-[0.69rem] text-amber">{{ t('craft.multiplePaths') }}</p>
          <p v-if="viewPlan.warning" class="m-0 text-amber">{{ viewPlan.warning }}</p>
        </div>

        <label class="flex shrink-0 items-center gap-2 pr-24">
          <span class="shrink-0 text-xs text-muted">{{ t('craft.selectCpu') }}</span>
          <AppSelect v-model="selectedCpu" class="min-w-0 flex-1" compact :options="cpuOptions" :aria-label="t('craft.selectCpu')" />
        </label>

        <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
          <strong class="shrink-0 text-[0.75rem]">{{ t('craft.materials') }}</strong>
          <div class="min-h-0 flex-1 overflow-auto overscroll-contain rounded-[8px] border border-line">
            <table class="w-full border-collapse text-left text-[0.75rem]">
              <thead class="sticky top-0 z-[1] bg-[color:var(--glass-bg-strong)] text-[0.63rem] tracking-wide text-muted">
                <tr>
                  <th class="px-2 py-1.5 font-medium">{{ t('craft.colItem') }}</th>
                  <th class="mono px-2 py-1.5 text-right font-medium">{{ t('craft.colTotal') }}</th>
                  <th class="mono px-2 py-1.5 text-right font-medium">{{ t('craft.colStock') }}</th>
                  <th class="mono px-2 py-1.5 text-right font-medium">{{ t('craft.colToCraft') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in materialRows" :key="row.key" class="border-t border-line/70">
                  <td class="px-2 py-1.5">
                    <div class="flex min-w-0 items-center gap-2">
                      <span class="inline-block size-5 shrink-0">
                        <ItemIcon :item="row" />
                      </span>
                      <span class="min-w-0 truncate"><McFormattedText :text="row.displayName" /></span>
                    </div>
                  </td>
                  <td class="mono px-2 py-1.5 text-right text-ink">{{ formatStackAmount({ ...row, amount: row.total }) }}</td>
                  <td class="mono px-2 py-1.5 text-right text-muted">{{ formatStackAmount({ ...row, amount: row.stock }) }}</td>
                  <td class="mono px-2 py-1.5 text-right" :class="needsCraft(row) ? 'text-amber' : 'text-muted'">
                    {{ formatStackAmount({ ...row, amount: row.toCraft }) }}
                  </td>
                </tr>
                <tr v-if="!materialRows.length">
                  <td colspan="4" class="px-2 py-6 text-center text-muted">{{ t('patterns.empty') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-if="message" class="m-0 shrink-0 text-xs text-red">{{ message }}</p>
      </div>
    </template>

    <template #footer>
      <AppButton type="button" variant="outline" size="sm" :disabled="busy" @click="onOpen(false)">
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton type="button" variant="primary" size="sm" :disabled="!viewPlan?.canSubmit || busy" @click="submit">
        {{ t('craft.submit') }}
      </AppButton>
    </template>

    <template #nested>
      <AppDialog
        :open="treeOpen"
        :layer="2"
        class="!flex !max-h-[min(92vh,48rem)] !w-[min(96vw,80rem)] !min-w-0 !max-w-[min(96vw,80rem)] !flex-col sm:!max-w-[min(96vw,80rem)]"
        @update:open="treeOpen = $event"
      >
        <template #header>
          <h2 class="m-0 pr-7 text-[0.81rem] font-semibold tracking-[-0.02em]">{{ t('craft.treeTitle') }}</h2>
        </template>
        <div v-if="viewPlan?.tree" class="h-[min(70vh,36rem)] min-h-[16rem] w-full overflow-hidden rounded-md border border-line">
          <CraftRecipeTree :node="viewPlan.tree" :mode-label="modeLabel" />
        </div>
        <template #footer>
          <AppButton type="button" variant="outline" size="sm" @click="treeOpen = false">
            {{ t('common.close') }}
          </AppButton>
        </template>
      </AppDialog>
    </template>
  </AppDialog>
</template>
