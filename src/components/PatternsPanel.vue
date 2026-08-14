<!--
  ME 样板供应器槽位板：容量、选择高亮、拖拽/批量移动。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type Pattern, type PatternProvider, type PatternProviderBoard, type PatternMoveOp } from '../api/client'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import PatternItemSlot from './PatternItemSlot.vue'
import PatternMoveTargetDialog from './PatternMoveTargetDialog.vue'
import PatternRecipePreview from './PatternRecipePreview.vue'
import ScrollFade from './ScrollFade.vue'
import { useSwapKey } from '../composables/useSwapKey'
import { ChevronDownIcon } from '@lucide/vue'
import { affixActionClass, AppButton, AppDialog, AppFadeSwap, AppInput, AppSelect, type AppSelectOption } from '@/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { stripMcFormat } from '@/lib/mcFormat'

type SlotKey = string // providerId:slotIndex

const { t } = useI18n()
const qOutput = ref('')
const qInput = ref('')
const mode = ref('all')
const providers = ref<PatternProviderBoard[]>([])
const loading = ref(true)
const error = ref('')
const moveError = ref('')
const selected = ref<Pattern | null>(null)
const detailOpen = ref(false)
const selectMode = ref(false)
const selectedKeys = ref<Set<SlotKey>>(new Set())
const moveOpen = ref(false)
const moving = ref(false)
const dragKeys = ref<SlotKey[]>([])
const dropTarget = ref<string>('') // providerId or providerId:slotIndex
/** 收起的供应器 id */
const collapsedIds = ref<Set<string>>(new Set())
const listSwapKey = useSwapKey([qOutput, qInput, mode], providers)

const modeOptions = computed<AppSelectOption[]>(() => [
  { value: 'all', label: t('patterns.modeAll') },
  { value: 'crafting', label: t('patterns.modeCrafting') },
  { value: 'processing', label: t('patterns.modeProcessing') },
  { value: 'smithing', label: t('patterns.modeSmithing') },
  { value: 'stonecutting', label: t('patterns.modeStonecutting') },
  { value: 'other', label: t('patterns.modeOther') },
])

const selectedCount = computed(() => selectedKeys.value.size)

function slotKey(providerId: string, slotIndex: number): SlotKey {
  return `${providerId}:${slotIndex}`
}

function parseSlotKey(key: SlotKey): { providerId: string; slotIndex: number } {
  const i = key.lastIndexOf(':')
  return { providerId: key.slice(0, i), slotIndex: Number(key.slice(i + 1)) }
}

function modeLabel(m: string) {
  const map: Record<string, string> = {
    crafting: t('patterns.modeCrafting'),
    processing: t('patterns.modeProcessing'),
    smithing: t('patterns.modeSmithing'),
    stonecutting: t('patterns.modeStonecutting'),
    other: t('patterns.modeOther'),
  }
  return map[m] || m
}

function providerPosText(provider?: PatternProvider) {
  if (!provider?.pos) return ''
  const { x, y, z, dimension } = provider.pos
  return t('patterns.providerPos', { x, y, z, dimension })
}

function patternTitle(p: Pattern) {
  return p.name || p.primaryOutput?.displayName || p.id
}

function primaryName(p: Pattern) {
  return stripMcFormat(p.primaryOutput?.displayName || p.name || p.id)
}

function isCollapsed(providerId: string) {
  return collapsedIds.value.has(providerId)
}

function toggleCollapsed(providerId: string) {
  const next = new Set(collapsedIds.value)
  if (next.has(providerId)) next.delete(providerId)
  else next.add(providerId)
  collapsedIds.value = next
}

function modeTagClass() {
  return cn(
    'inline-flex w-fit items-center rounded-[4px] border border-line',
    'bg-[color-mix(in_srgb,var(--glass-bg-soft)_88%,transparent)] px-1.5 py-0.5',
    'text-[10px] font-medium leading-none tracking-[0.02em] text-muted',
  )
}

function capacityText(board: PatternProviderBoard) {
  const total = board.slotCount ?? board.slots.length
  const used = board.usedSlots ?? board.slots.filter((s) => s.pattern).length
  return t('patterns.capacity', { used, total })
}

function isSelected(providerId: string, slotIndex: number) {
  return selectedKeys.value.has(slotKey(providerId, slotIndex))
}

function toggleSelect(providerId: string, slotIndex: number) {
  const key = slotKey(providerId, slotIndex)
  const next = new Set(selectedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedKeys.value = next
}

function selectAllGroup(board: PatternProviderBoard) {
  const next = new Set(selectedKeys.value)
  for (const s of board.slots) {
    if (s.pattern && s.index != null) next.add(slotKey(board.id, s.index))
  }
  selectedKeys.value = next
}

function clearSelection() {
  selectedKeys.value = new Set()
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) clearSelection()
}

function openDetail(p: Pattern) {
  if (selectMode.value) return
  selected.value = p
  detailOpen.value = true
}

function onDetailOpen(open: boolean) {
  detailOpen.value = open
  if (!open) selected.value = null
}

function patternChipClass(providerId: string, slotIndex: number, hasPattern: boolean) {
  return cn(
    'ui-me-slot relative inline-flex size-11 items-center justify-center rounded-[7px] p-0',
    !hasPattern && 'border-dashed opacity-65',
    isSelected(providerId, slotIndex) && 'ring-2 ring-cyan/50 border-[color:var(--glass-border-bright)]',
    dropTarget.value === slotKey(providerId, slotIndex) && 'ring-2 ring-cyan/60',
  )
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (mode.value && mode.value !== 'all') params.set('mode', mode.value)
    if (qOutput.value.trim()) params.set('qOutput', qOutput.value.trim())
    if (qInput.value.trim()) params.set('qInput', qInput.value.trim())
    const data = await api.patterns.providers(params)
    providers.value = data.providers || []
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function applyMoves(moves: PatternMoveOp[]) {
  if (!moves.length || moving.value) return
  moving.value = true
  moveError.value = ''
  try {
    await api.patterns.move({ moves })
    clearSelection()
    moveOpen.value = false
    await load()
  } catch (e) {
    moveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    moving.value = false
  }
}

function buildMovesToProvider(toProviderId: string, toSlotIndex?: number): PatternMoveOp[] {
  const keys = [...selectedKeys.value]
  if (!keys.length) return []
  const moves: PatternMoveOp[] = []
  if (toSlotIndex != null && keys.length === 1) {
    const from = parseSlotKey(keys[0]!)
    moves.push({ from, to: { providerId: toProviderId, slotIndex: toSlotIndex } })
    return moves
  }
  for (const key of keys) {
    const from = parseSlotKey(key)
    if (from.providerId === toProviderId && toSlotIndex == null) continue
    moves.push({ from, to: { providerId: toProviderId } })
  }
  return moves
}

async function onMoveConfirm(providerId: string) {
  await applyMoves(buildMovesToProvider(providerId))
}

function onDragStart(ev: DragEvent, providerId: string, slotIndex: number, hasPattern: boolean) {
  if (!hasPattern) {
    ev.preventDefault()
    return
  }
  const key = slotKey(providerId, slotIndex)
  let keys = [key]
  if (selectMode.value && selectedKeys.value.has(key) && selectedKeys.value.size > 1) {
    keys = [...selectedKeys.value]
  } else if (!selectMode.value) {
    selectedKeys.value = new Set([key])
  }
  dragKeys.value = keys
  ev.dataTransfer?.setData('text/plain', keys.join(','))
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  dragKeys.value = []
  dropTarget.value = ''
}

function onDragOverProvider(ev: DragEvent, board: PatternProviderBoard) {
  if (board.movable === false || !dragKeys.value.length) return
  ev.preventDefault()
  dropTarget.value = board.id
}

function onDragOverSlot(ev: DragEvent, board: PatternProviderBoard, slotIndex: number) {
  if (board.movable === false || !dragKeys.value.length) return
  ev.preventDefault()
  dropTarget.value = slotKey(board.id, slotIndex)
}

async function onDropProvider(ev: DragEvent, board: PatternProviderBoard) {
  ev.preventDefault()
  if (board.movable === false) return
  const keys = dragKeys.value.length ? dragKeys.value : (ev.dataTransfer?.getData('text/plain') || '').split(',').filter(Boolean)
  selectedKeys.value = new Set(keys)
  dropTarget.value = ''
  dragKeys.value = []
  await applyMoves(buildMovesToProvider(board.id))
}

async function onDropSlot(ev: DragEvent, board: PatternProviderBoard, slotIndex: number) {
  ev.preventDefault()
  if (board.movable === false) return
  const keys = dragKeys.value.length ? dragKeys.value : (ev.dataTransfer?.getData('text/plain') || '').split(',').filter(Boolean)
  selectedKeys.value = new Set(keys)
  dropTarget.value = ''
  dragKeys.value = []
  if (keys.length === 1) {
    await applyMoves(buildMovesToProvider(board.id, slotIndex))
  } else {
    await applyMoves(buildMovesToProvider(board.id))
  }
}

function onSlotClick(board: PatternProviderBoard, slotIndex: number, pattern: Pattern | null | undefined) {
  if (!pattern) return
  if (selectMode.value) {
    toggleSelect(board.id, slotIndex)
    return
  }
  openDetail(pattern)
}

let timer: number | undefined
watch([qOutput, qInput, mode], () => {
  loading.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void load(), 200)
})

onMounted(() => {
  void load()
})

onUnmounted(() => {
  window.clearTimeout(timer)
})
</script>

<template>
  <section class="flex h-full min-h-[240px] min-w-[280px] flex-col overflow-hidden">
    <div class="mb-3 flex shrink-0 flex-wrap items-center gap-2">
      <AppInput v-model="qOutput" compact mono class="min-w-[9rem] flex-1 basis-[9rem]" :placeholder="t('patterns.searchOutput')" />
      <AppInput v-model="qInput" compact mono class="min-w-[9rem] flex-1 basis-[9rem]" :placeholder="t('patterns.searchInput')">
        <template #affix>
          <button type="button" :class="affixActionClass()" @click="load">
            {{ t('common.query') }}
          </button>
        </template>
      </AppInput>
      <AppSelect v-model="mode" compact :options="modeOptions" :aria-label="t('patterns.mode')" />
      <AppButton type="button" size="sm" :variant="selectMode ? 'primary' : 'outline'" @click="toggleSelectMode">
        {{ selectMode ? t('patterns.selectDone') : t('patterns.select') }}
      </AppButton>
    </div>

    <div v-if="selectMode" class="ui-glass-chip mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-[8px] px-2.5 py-1.5">
      <span class="text-[12px] text-muted">{{ t('patterns.selectedCount', { n: selectedCount }) }}</span>
      <AppButton type="button" size="sm" variant="outline" :disabled="!selectedCount" @click="clearSelection">
        {{ t('patterns.clearSelection') }}
      </AppButton>
      <AppButton type="button" size="sm" variant="primary" :disabled="!selectedCount || moving" @click="moveOpen = true">
        {{ t('patterns.moveTo') }}
      </AppButton>
    </div>

    <p v-if="error || moveError" class="mb-2 shrink-0 text-[13px] text-red">{{ error || moveError }}</p>

    <div class="relative min-h-0 flex-1" :aria-busy="loading || undefined">
      <div v-if="loading" class="ui-loading-bar" role="status" :aria-label="t('common.loading')" />
      <ScrollFade class="h-full min-h-0 overflow-auto" :class="loading && providers.length ? 'opacity-55' : undefined">
        <AppFadeSwap :swap-key="listSwapKey" appear>
          <p v-if="!providers.length && !loading" class="text-muted">{{ t('patterns.empty') }}</p>
          <div v-else class="grid gap-3">
            <section
              v-for="board in providers"
              :key="board.id"
              class="grid gap-1.5 rounded-[10px] border border-transparent transition-[border-color,box-shadow]"
              :class="dropTarget === board.id ? 'border-[color:var(--glass-border-bright)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-cyan)_35%,transparent)]' : undefined"
              @dragover="onDragOverProvider($event, board)"
              @drop="onDropProvider($event, board)"
            >
              <header class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button
                  type="button"
                  class="inline-flex max-w-full items-center gap-0.5 rounded-[5px] py-0.5 pr-1 text-left text-muted transition-colors hover:bg-[var(--app-on-surface-08)] hover:text-ink"
                  :aria-expanded="!isCollapsed(board.id)"
                  :aria-label="isCollapsed(board.id) ? t('patterns.expand') : t('patterns.collapse')"
                  @click.stop="toggleCollapsed(board.id)"
                >
                  <span class="inline-flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
                    <ChevronDownIcon class="size-3.5 transition-transform duration-200 ease-out" :class="isCollapsed(board.id) && '-rotate-90'" />
                  </span>
                  <h3 class="m-0 text-[12px] font-semibold tracking-[-0.01em] text-ink">
                    <McFormattedText :text="board.name || t('patterns.providerUnknown')" />
                  </h3>
                </button>
                <span
                  class="mono rounded-[4px] border border-line bg-[color-mix(in_srgb,var(--glass-bg-soft)_88%,transparent)] px-1.5 py-0.5 text-[10px] text-cyan"
                  :title="t('patterns.capacityHint')"
                >
                  {{ capacityText(board) }}
                </span>
                <span v-if="board.movable === false" class="text-[10px] text-muted">{{ t('patterns.notMovable') }}</span>
                <span v-if="providerPosText(board)" class="mono text-[11px] text-muted">{{ providerPosText(board) }}</span>
                <button
                  v-if="selectMode && board.movable !== false && !isCollapsed(board.id)"
                  type="button"
                  class="ml-auto text-[11px] text-cyan hover:underline"
                  @click="selectAllGroup(board)"
                >
                  {{ t('patterns.selectAllGroup') }}
                </button>
              </header>

              <div class="grid transition-[grid-template-rows] duration-200 ease-out" :class="isCollapsed(board.id) ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'">
                <div class="min-h-0 overflow-hidden">
                  <div class="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
                    <Tooltip v-for="slot in board.slots" :key="`${board.id}-${slot.index}`" :disabled="!slot.pattern">
                      <TooltipTrigger as-child>
                        <button
                          type="button"
                          draggable="true"
                          :class="patternChipClass(board.id, slot.index, !!slot.pattern)"
                          :aria-label="slot.pattern ? primaryName(slot.pattern) : t('patterns.emptySlot')"
                          @click="onSlotClick(board, slot.index, slot.pattern)"
                          @dragstart="onDragStart($event, board.id, slot.index, !!slot.pattern)"
                          @dragend="onDragEnd"
                          @dragover="onDragOverSlot($event, board, slot.index)"
                          @drop="onDropSlot($event, board, slot.index)"
                        >
                          <template v-if="slot.pattern">
                            <ItemIcon :item="slot.pattern.primaryOutput" :size="28" flush class="relative z-[1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
                            <span
                              v-if="selectMode"
                              class="absolute -top-1 -right-1 z-[2] flex size-3.5 items-center justify-center rounded-[3px] border border-line text-[8px] leading-none"
                              :class="isSelected(board.id, slot.index) ? 'bg-cyan text-[#041018]' : 'bg-[color-mix(in_srgb,var(--color-panel)_80%,transparent)] text-muted'"
                            >
                              {{ isSelected(board.id, slot.index) ? '✓' : '' }}
                            </span>
                          </template>
                          <span v-else class="sr-only">
                            {{ dropTarget === slotKey(board.id, slot.index) ? t('patterns.dropHere') : t('patterns.emptySlot') }}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        v-if="slot.pattern"
                        side="top"
                        :side-offset="6"
                        class="!max-w-[14rem] !border !border-line !bg-[var(--glass-bg-strong)] !px-2.5 !py-1.5 !text-ink shadow-[var(--glass-shadow)] [&_svg]:!bg-[var(--glass-bg-strong)] [&_svg]:!fill-[var(--glass-bg-strong)]"
                      >
                        <span class="block max-w-full truncate text-[12px] font-medium">
                          <McFormattedText :text="slot.pattern.primaryOutput?.displayName || patternTitle(slot.pattern)" />
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </AppFadeSwap>
      </ScrollFade>
    </div>

    <AppDialog :open="detailOpen" class="min-w-[18rem] max-w-[min(100%-1.5rem,28rem)] sm:max-w-[28rem]" @update:open="onDetailOpen">
      <template #header>
        <div class="flex items-center gap-2.5 pr-7">
          <PatternItemSlot v-if="selected?.primaryOutput" :item="selected.primaryOutput" :size="34" amount="" variant="output" />
          <div class="min-w-0">
            <span v-if="selected" :class="modeTagClass()">{{ modeLabel(selected.mode) }}</span>
            <h2 class="m-0 mt-0.5 text-[13px] font-semibold tracking-[-0.02em]">
              <McFormattedText v-if="selected" :text="patternTitle(selected)" />
              <template v-else>{{ t('patterns.detail') }}</template>
            </h2>
            <p v-if="selected" class="mono m-0 mt-0.5 truncate text-[11px] text-muted">{{ selected.id }}</p>
          </div>
        </div>
      </template>

      <template v-if="selected">
        <div class="grid gap-1 text-[12px] text-muted">
          <p class="m-0">
            {{ t('patterns.provider') }}:
            <McFormattedText class="text-ink" :text="selected.provider?.name || t('patterns.providerUnknown')" />
          </p>
          <p v-if="providerPosText(selected.provider)" class="mono m-0 text-[11px]">
            {{ providerPosText(selected.provider) }}
          </p>
          <p class="m-0">
            {{ t('patterns.substitute') }}:
            <span class="text-ink">{{ selected.substitute ? t('patterns.yes') : t('patterns.no') }}</span>
          </p>
          <p class="m-0">
            {{ t('patterns.substituteFluids') }}:
            <span class="text-ink">{{ selected.substituteFluids ? t('patterns.yes') : t('patterns.no') }}</span>
          </p>
          <div v-if="selected.definition" class="flex items-center gap-2">
            <span>{{ t('patterns.definition') }}:</span>
            <PatternItemSlot :item="selected.definition" :size="18" amount="" />
            <McFormattedText class="truncate" :text="selected.definition.displayName" />
          </div>
        </div>

        <div class="mt-1 grid gap-2 border-t border-line pt-2.5">
          <p class="m-0 text-xs text-muted">{{ t('patterns.recipe') }}</p>
          <PatternRecipePreview :inputs="selected.inputs" :outputs="selected.outputs" />
        </div>
      </template>

      <template #footer>
        <AppButton type="button" variant="outline" size="sm" @click="onDetailOpen(false)">
          {{ t('common.close') }}
        </AppButton>
      </template>
    </AppDialog>

    <PatternMoveTargetDialog v-model:open="moveOpen" :providers="providers" :selected-count="selectedCount" :busy="moving" @confirm="onMoveConfirm" />
  </section>
</template>
