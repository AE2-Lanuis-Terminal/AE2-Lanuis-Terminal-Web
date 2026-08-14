<!--
  ME 样板供应器槽位板：固定槽位拖拽（同组/跨组交换或移入空槽），不改本地槽位数。
  桌面细指针：HTML5 DnD；触控/粗指针：长按 + 指针拖。
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
import { usePatternPointerDrag, type PatternDropHit } from '../composables/usePatternPointerDrag'
import { useSwapKey } from '../composables/useSwapKey'
import { preferTouchTargets } from '@/lib/platform'
import { ChevronDownIcon } from '@lucide/vue'
import { affixActionClass, AppButton, AppDialog, AppFadeSwap, AppInput, AppSelect, type AppSelectOption } from '@/ui'
import { cn } from '@/lib/utils'
import { stripMcFormat } from '@/lib/mcFormat'

type SlotKey = string // providerId:slotIndex

const { t } = useI18n()
const touchUi = preferTouchTargets()
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
/** 正在拖的槽（仅高亮，不改 slots 数组） */
const dragKeys = ref<SlotKey[]>([])
const dropTarget = ref<string>('') // providerId or providerId:slotIndex
const collapsedIds = ref<Set<string>>(new Set())
const listSwapKey = useSwapKey([qOutput, qInput, mode], providers)
const scrollFade = ref<{ getScrollEl?: () => HTMLElement | null | undefined } | null>(null)

function getScrollEl() {
  return scrollFade.value?.getScrollEl?.() ?? null
}

const modeOptions = computed<AppSelectOption[]>(() => [
  { value: 'all', label: t('patterns.modeAll') },
  { value: 'crafting', label: t('patterns.modeCrafting') },
  { value: 'processing', label: t('patterns.modeProcessing') },
  { value: 'smithing', label: t('patterns.modeSmithing') },
  { value: 'stonecutting', label: t('patterns.modeStonecutting') },
  { value: 'other', label: t('patterns.modeOther') },
])

const selectedCount = computed(() => selectedKeys.value.size)
const dragging = computed(() => dragKeys.value.length > 0)

const slotSizeClass = touchUi ? 'size-12' : 'size-11'
const gridMaxClass = touchUi ? 'max-w-[calc(3rem*9+0.375rem*8)]' : 'max-w-[calc(2.75rem*9+0.375rem*8)]'

const ghostPattern = computed(() => {
  const key = dragKeys.value[0]
  if (!key) return null
  const { providerId, slotIndex } = parseSlotKey(key)
  const board = providers.value.find((b) => b.id === providerId)
  return board?.slots.find((s) => s.index === slotIndex)?.pattern ?? null
})

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

function craftingShapeLabel(shape?: string) {
  if (shape === 'shaped') return t('patterns.craftingShapeShaped')
  if (shape === 'shapeless') return t('patterns.craftingShapeShapeless')
  return shape || ''
}

function providerTargetsText(provider?: PatternProvider) {
  const list = provider?.targets
  if (!list?.length) return ''
  return list
    .map((tg) => {
      const side = tg.side ? ` (${tg.side})` : ''
      return `${tg.name || tg.blockId || '?'}${side}`
    })
    .join(' · ')
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

function isDraggingSlot(providerId: string, slotIndex: number) {
  return dragKeys.value.includes(slotKey(providerId, slotIndex))
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
  const key = slotKey(providerId, slotIndex)
  return cn(
    'ui-me-slot pattern-chip relative inline-flex items-center justify-center overflow-hidden rounded-[7px] p-0',
    slotSizeClass,
    hasPattern && boardMovable(providerId) ? (touchUi ? 'touch-manipulation' : 'cursor-grab active:cursor-grabbing') : undefined,
    !hasPattern && 'border-dashed opacity-65',
    isSelected(providerId, slotIndex) && 'ring-2 ring-cyan/50 border-[color:var(--glass-border-bright)]',
    isDraggingSlot(providerId, slotIndex) && 'opacity-40',
    dropTarget.value === key && 'pattern-slot--drop-target ring-2 ring-cyan/70',
    pressKey.value === key && 'pattern-slot--pressing',
  )
}

function boardMovable(providerId: string) {
  return providers.value.find((b) => b.id === providerId)?.movable !== false
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
    await load()
  } finally {
    moving.value = false
  }
}

function buildMovesToProvider(toProviderId: string, toSlotIndex?: number, keys = [...selectedKeys.value]): PatternMoveOp[] {
  if (!keys.length) return []
  const moves: PatternMoveOp[] = []
  if (toSlotIndex != null && keys.length === 1) {
    const from = parseSlotKey(keys[0]!)
    if (from.providerId === toProviderId && from.slotIndex === toSlotIndex) return []
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

function beginDragKeys(board: PatternProviderBoard, slotIndex: number): SlotKey[] | null {
  if (board.movable === false || moving.value) return null
  const key = slotKey(board.id, slotIndex)
  let keys = [key]
  if (selectMode.value && selectedKeys.value.has(key) && selectedKeys.value.size > 1) {
    keys = [...selectedKeys.value]
  } else if (!selectMode.value) {
    selectedKeys.value = new Set([key])
  }
  dragKeys.value = keys
  dropTarget.value = ''
  return keys
}

/** 专用拖影：浏览器对 live 节点常不裁圆角，且会带上拖中 opacity */
function buildPatternDragImage(sourceEl: HTMLElement, count: number): HTMLElement {
  const size = Math.max(sourceEl.offsetWidth || 44, sourceEl.offsetHeight || 44)
  const root = document.createElement('div')
  root.className = 'pattern-drag-ghost-root'
  root.style.width = `${size}px`
  root.style.height = `${size}px`

  const wrap = document.createElement('div')
  wrap.className = 'pattern-drag-ghost'
  wrap.style.width = `${size}px`
  wrap.style.height = `${size}px`

  const img = sourceEl.querySelector('img')
  if (img instanceof HTMLImageElement) {
    const clone = img.cloneNode(true) as HTMLImageElement
    clone.removeAttribute('loading')
    clone.draggable = false
    clone.className = 'pattern-drag-ghost__img'
    wrap.appendChild(clone)
  } else {
    const ph = sourceEl.querySelector('.ui-item-icon-placeholder')
    if (ph) {
      const clone = ph.cloneNode(true) as HTMLElement
      clone.classList.add('pattern-drag-ghost__img')
      wrap.appendChild(clone)
    }
  }
  root.appendChild(wrap)

  if (count > 1) {
    const badge = document.createElement('span')
    badge.className = 'pattern-drag-ghost__badge'
    badge.textContent = String(count)
    root.appendChild(badge)
  }
  return root
}

function onDragStart(ev: DragEvent, board: PatternProviderBoard, slotIndex: number, hasPattern: boolean) {
  if (touchUi || !hasPattern) {
    ev.preventDefault()
    return
  }
  const keys = beginDragKeys(board, slotIndex)
  if (!keys) {
    ev.preventDefault()
    return
  }
  ev.dataTransfer?.setData('text/plain', keys.join(','))
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    const el = ev.currentTarget as HTMLElement | null
    if (el) {
      try {
        const ghostEl = buildPatternDragImage(el, keys.length)
        document.body.appendChild(ghostEl)
        const half = Math.round((el.clientWidth || 44) / 2)
        ev.dataTransfer.setDragImage(ghostEl, half, half)
        // 需保留一帧供浏览器截图，再移除
        requestAnimationFrame(() => ghostEl.remove())
      } catch {
        // ignore
      }
    }
  }
}

function onDragEnd() {
  dragKeys.value = []
  dropTarget.value = ''
}

function canAcceptDrop(board: PatternProviderBoard) {
  return board.movable !== false && dragKeys.value.length > 0 && !moving.value
}

function applyDropHit(hit: PatternDropHit | null) {
  if (!hit) {
    dropTarget.value = ''
    return
  }
  const board = providers.value.find((b) => b.id === hit.providerId)
  if (!board || board.movable === false) {
    dropTarget.value = ''
    return
  }
  if (hit.slotIndex != null) {
    const key = slotKey(hit.providerId, hit.slotIndex)
    if (dragKeys.value.length === 1 && dragKeys.value[0] === key) {
      dropTarget.value = hit.providerId
      return
    }
    dropTarget.value = key
    return
  }
  dropTarget.value = hit.providerId
}

function onDragOverBoard(ev: DragEvent, board: PatternProviderBoard) {
  if (!canAcceptDrop(board)) return
  ev.preventDefault()
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
  if (!dropTarget.value.includes(':')) {
    dropTarget.value = board.id
  }
  autoScrollFromClientY(ev.clientY)
}

function onDragOverSlot(ev: DragEvent, board: PatternProviderBoard, slotIndex: number) {
  if (!canAcceptDrop(board)) return
  ev.preventDefault()
  ev.stopPropagation()
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
  const key = slotKey(board.id, slotIndex)
  if (dragKeys.value.length === 1 && dragKeys.value[0] === key) {
    dropTarget.value = board.id
  } else {
    dropTarget.value = key
  }
  autoScrollFromClientY(ev.clientY)
}

function onDragLeaveBoard(ev: DragEvent, board: PatternProviderBoard) {
  const related = ev.relatedTarget as Node | null
  const cur = ev.currentTarget as HTMLElement
  if (related && cur.contains(related)) return
  if (dropTarget.value === board.id || dropTarget.value.startsWith(`${board.id}:`)) {
    dropTarget.value = ''
  }
}

function autoScrollFromClientY(clientY: number) {
  const el = getScrollEl()
  if (!el || !dragging.value) return
  const rect = el.getBoundingClientRect()
  const edge = 52
  if (clientY < rect.top + edge) {
    const t = (edge - (clientY - rect.top)) / edge
    el.scrollTop -= Math.max(2, Math.ceil(14 * t))
  } else if (clientY > rect.bottom - edge) {
    const t = (edge - (rect.bottom - clientY)) / edge
    el.scrollTop += Math.max(2, Math.ceil(14 * t))
  }
}

async function commitDrop(board: PatternProviderBoard, toSlotIndex?: number) {
  if (!canAcceptDrop(board)) return
  const keys = dragKeys.value.length ? [...dragKeys.value] : []
  dragKeys.value = []
  dropTarget.value = ''
  if (!keys.length) return

  selectedKeys.value = new Set(keys)
  if (keys.length === 1 && toSlotIndex != null) {
    await applyMoves(buildMovesToProvider(board.id, toSlotIndex, keys))
    return
  }
  await applyMoves(buildMovesToProvider(board.id, undefined, keys))
}

async function onDropBoard(ev: DragEvent, board: PatternProviderBoard) {
  ev.preventDefault()
  if (!canAcceptDrop(board)) return
  const target = dropTarget.value
  if (target.startsWith(`${board.id}:`)) {
    const { slotIndex } = parseSlotKey(target)
    await commitDrop(board, slotIndex)
    return
  }
  await commitDrop(board)
}

async function onDropSlot(ev: DragEvent, board: PatternProviderBoard, slotIndex: number) {
  ev.preventDefault()
  ev.stopPropagation()
  if (!canAcceptDrop(board)) return
  await commitDrop(board, slotIndex)
}

const { ghost, pressKey, shouldSuppressClick, onPointerDown } = usePatternPointerDrag({
  enabled: () => touchUi && !moving.value,
  onBegin: (providerId, slotIndex) => {
    const board = providers.value.find((b) => b.id === providerId)
    if (!board) return false
    const slot = board.slots.find((s) => s.index === slotIndex)
    if (!slot?.pattern) return false
    return !!beginDragKeys(board, slotIndex)
  },
  onHover: applyDropHit,
  onDrop: (hit) => {
    void (async () => {
      if (!hit) {
        onDragEnd()
        return
      }
      const board = providers.value.find((b) => b.id === hit.providerId)
      if (!board || !canAcceptDrop(board)) {
        onDragEnd()
        return
      }
      await commitDrop(board, hit.slotIndex)
    })()
  },
  onCancel: onDragEnd,
})

function onSlotPointerDown(ev: PointerEvent, board: PatternProviderBoard, slotIndex: number, hasPattern: boolean) {
  if (!touchUi || !hasPattern || board.movable === false || moving.value) return
  onPointerDown(ev, board.id, slotIndex, getScrollEl())
}

function onSlotContextMenu(ev: Event) {
  if (touchUi) ev.preventDefault()
}

watch(dragging, (on) => {
  const el = getScrollEl()
  if (!el) return
  el.classList.toggle('touch-none', on)
  el.classList.toggle('overscroll-none', on)
})

function onSlotClick(board: PatternProviderBoard, slotIndex: number, pattern: Pattern | null | undefined) {
  if (shouldSuppressClick() || dragging.value) return
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
  <section class="flex h-full min-h-[240px] min-w-[280px] flex-col overflow-hidden" :class="dragging && 'pattern-board--dragging'">
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

    <p v-else-if="touchUi && providers.length" class="mb-2 shrink-0 text-[11px] text-muted">
      {{ t('patterns.dragHintTouch') }}
    </p>

    <p v-if="error || moveError" class="mb-2 shrink-0 text-[13px] text-red">{{ error || moveError }}</p>

    <div class="relative min-h-0 flex-1" :aria-busy="loading || undefined">
      <div v-if="loading" class="ui-loading-bar" role="status" :aria-label="t('common.loading')" />
      <ScrollFade ref="scrollFade" :class="cn('h-full min-h-0', loading && providers.length && 'opacity-55')">
        <AppFadeSwap :swap-key="listSwapKey" appear>
          <p v-if="!providers.length && !loading" class="text-muted">{{ t('patterns.empty') }}</p>
          <div v-else class="grid gap-3 p-0.5">
            <section
              v-for="board in providers"
              :key="board.id"
              class="grid gap-1.5 rounded-[10px] border border-transparent p-1 transition-[border-color,box-shadow,background-color]"
              :data-pattern-drop-board="board.movable !== false ? '' : undefined"
              :data-pattern-provider-id="board.id"
              :class="
                dropTarget === board.id || dropTarget.startsWith(`${board.id}:`)
                  ? 'border-[color:var(--glass-border-bright)] bg-[color-mix(in_srgb,var(--color-cyan-dim)_10%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-cyan)_40%,transparent)]'
                  : undefined
              "
              @dragover="onDragOverBoard($event, board)"
              @dragleave="onDragLeaveBoard($event, board)"
              @drop="onDropBoard($event, board)"
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
                <div class="min-h-0" :class="isCollapsed(board.id) ? 'overflow-hidden' : 'overflow-visible'">
                  <div class="grid grid-cols-9 gap-1.5 py-0.5" :class="gridMaxClass">
                    <div
                      v-for="slot in board.slots"
                      :key="`${board.id}:${slot.index}`"
                      class="relative"
                      :class="slotSizeClass"
                      data-pattern-drop-slot
                      :data-pattern-provider-id="board.id"
                      :data-pattern-slot-index="slot.index"
                      @dragover="onDragOverSlot($event, board, slot.index)"
                      @drop="onDropSlot($event, board, slot.index)"
                    >
                      <div
                        role="button"
                        tabindex="0"
                        :draggable="!touchUi && !!slot.pattern && board.movable !== false && !moving"
                        :class="patternChipClass(board.id, slot.index, !!slot.pattern)"
                        :aria-label="slot.pattern ? primaryName(slot.pattern) : t('patterns.emptySlot')"
                        :title="slot.pattern ? primaryName(slot.pattern) : undefined"
                        @click="onSlotClick(board, slot.index, slot.pattern)"
                        @keydown.enter.prevent="onSlotClick(board, slot.index, slot.pattern)"
                        @keydown.space.prevent="onSlotClick(board, slot.index, slot.pattern)"
                        @pointerdown="onSlotPointerDown($event, board, slot.index, !!slot.pattern)"
                        @contextmenu="onSlotContextMenu"
                        @dragstart="onDragStart($event, board, slot.index, !!slot.pattern)"
                        @dragend="onDragEnd"
                      >
                        <ItemIcon
                          v-if="slot.pattern"
                          :item="slot.pattern.primaryOutput"
                          flush
                          class="pointer-events-none relative z-0 size-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                        />
                        <span v-else class="sr-only">
                          {{ dropTarget === slotKey(board.id, slot.index) ? t('patterns.dropHere') : t('patterns.emptySlot') }}
                        </span>
                      </div>
                      <span
                        v-if="selectMode && slot.pattern"
                        class="pointer-events-none absolute -top-1 -right-1 z-[2] flex size-3.5 items-center justify-center rounded-[3px] border border-line text-[8px] leading-none"
                        :class="isSelected(board.id, slot.index) ? 'bg-cyan text-[#041018]' : 'bg-[color-mix(in_srgb,var(--color-panel)_80%,transparent)] text-muted'"
                      >
                        {{ isSelected(board.id, slot.index) ? '✓' : '' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </AppFadeSwap>
      </ScrollFade>
    </div>

    <!-- 触控拖拽幽灵层 -->
    <Teleport to="body">
      <div
        v-if="ghost.active && ghostPattern"
        class="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2"
        :style="{ left: `${ghost.x}px`, top: `${ghost.y}px` }"
        aria-hidden="true"
      >
        <div class="pattern-drag-ghost-root relative" :class="slotSizeClass">
          <div class="pattern-drag-ghost pattern-drag-ghost--live size-full">
            <ItemIcon v-if="ghostPattern.primaryOutput" :item="ghostPattern.primaryOutput" flush class="pattern-drag-ghost__icon size-full" />
          </div>
          <span v-if="dragKeys.length > 1" class="pattern-drag-ghost__badge">{{ dragKeys.length }}</span>
        </div>
      </div>
    </Teleport>

    <AppDialog :open="detailOpen" class="min-w-[18rem] max-w-[min(100%-1.5rem,28rem)] sm:max-w-[28rem]" @update:open="onDetailOpen">
      <template #header>
        <div class="flex items-center gap-2.5 pr-7">
          <PatternItemSlot v-if="selected?.primaryOutput" :item="selected.primaryOutput" :size="34" amount="" variant="output" :tip="false" />
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
            {{ t('patterns.workMode') }}:
            <span class="text-ink">{{ modeLabel(selected.mode) }}</span>
          </p>
          <p v-if="selected.craftingShape" class="m-0">
            {{ t('patterns.craftingShape') }}:
            <span class="text-ink">{{ craftingShapeLabel(selected.craftingShape) }}</span>
          </p>
          <p v-if="selected.encoder" class="m-0">
            {{ t('patterns.encoder') }}:
            <span class="text-ink">{{ selected.encoder }}</span>
          </p>
          <p v-if="selected.recipeId" class="mono m-0 text-[11px]">
            {{ t('patterns.recipeId') }}:
            <span class="text-ink">{{ selected.recipeId }}</span>
          </p>
          <p v-if="selected.slotIndex != null" class="m-0">
            {{ t('patterns.slotIndex') }}:
            <span class="mono text-ink">{{ selected.slotIndex }}</span>
          </p>
          <p class="m-0">
            {{ t('patterns.provider') }}:
            <McFormattedText class="text-ink" :text="selected.provider?.name || t('patterns.providerUnknown')" />
          </p>
          <p v-if="selected.provider?.priority != null" class="m-0">
            {{ t('patterns.priority') }}:
            <span class="mono text-ink">{{ selected.provider.priority }}</span>
          </p>
          <p v-if="providerPosText(selected.provider)" class="mono m-0 text-[11px]">
            {{ providerPosText(selected.provider) }}
          </p>
          <p v-if="providerTargetsText(selected.provider)" class="m-0">
            {{ t('patterns.targets') }}:
            <span class="text-ink">{{ providerTargetsText(selected.provider) }}</span>
          </p>
          <p class="m-0">
            {{ t('patterns.substitute') }}:
            <span class="text-ink">{{ selected.substitute ? t('patterns.yes') : t('patterns.no') }}</span>
          </p>
          <p class="m-0">
            {{ t('patterns.substituteFluids') }}:
            <span class="text-ink">{{ selected.substituteFluids ? t('patterns.yes') : t('patterns.no') }}</span>
          </p>
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

<style scoped>
/* 样板槽在滚动/折叠容器内：避免 translateY 顶边被裁切，改用描边高亮 */
:deep(.pattern-chip:hover),
:deep(.pattern-chip:active) {
  transform: none;
}

:deep(.pattern-slot--drop-target) {
  border-color: color-mix(in srgb, var(--color-cyan) 70%, var(--glass-border)) !important;
  background: color-mix(in srgb, var(--color-cyan-dim) 22%, var(--color-slot));
  transform: none !important;
}

:deep(.pattern-slot--pressing) {
  transform: scale(0.94) !important;
  opacity: 0.85;
}
</style>

<style>
/* 外层不裁切，角标可溢出；内层 clip 保证图与边框同圆角 */
.pattern-drag-ghost-root {
  position: relative;
  overflow: visible;
  pointer-events: none;
}

/* HTML5 setDragImage 挂到 body：屏外供截图 */
body > .pattern-drag-ghost-root {
  position: fixed;
  top: -9999px;
  left: -9999px;
}

.pattern-drag-ghost {
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 7px;
  clip-path: inset(0 round 7px);
  border: 1px solid color-mix(in srgb, var(--color-line-bright) 55%, var(--glass-border));
  background: linear-gradient(155deg, color-mix(in srgb, var(--color-panel) 55%, transparent) 0%, color-mix(in srgb, var(--color-slot) 88%, #000000) 100%);
  box-shadow:
    inset 0 2px 4px color-mix(in srgb, #000000 45%, transparent),
    0 8px 22px color-mix(in srgb, #000000 42%, transparent);
  opacity: 0.96;
  pointer-events: none;
}

.pattern-drag-ghost--live {
  opacity: 0.95;
  box-shadow:
    inset 0 2px 4px color-mix(in srgb, #000000 45%, transparent),
    0 8px 24px color-mix(in srgb, #000000 45%, transparent),
    0 0 0 2px color-mix(in srgb, var(--color-cyan) 45%, transparent);
}

.pattern-drag-ghost__img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: contain;
  image-rendering: pixelated;
  background: transparent !important;
  border-radius: 0;
}

.pattern-drag-ghost__icon {
  border-radius: 0 !important;
}

.pattern-drag-ghost__icon img,
.pattern-drag-ghost__icon > span {
  background: transparent !important;
  border-radius: 0 !important;
  filter: none;
  box-shadow: none;
}

.pattern-drag-ghost__badge {
  position: absolute;
  top: -5px;
  right: -5px;
  z-index: 2;
  display: flex;
  min-width: 1.15rem;
  height: 1.15rem;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--color-cyan, #3cf);
  color: #041018;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 1px 4px color-mix(in srgb, #000000 40%, transparent);
}

/* 全局：指针拖期间抑制选择与浏览器默认手势 */
body.pattern-pointer-dragging {
  user-select: none;
  -webkit-user-select: none;
  overscroll-behavior: none;
  cursor: grabbing !important;
}

body.pattern-pointer-dragging * {
  cursor: grabbing !important;
}
</style>
