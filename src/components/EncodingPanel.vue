<!--
  Encoding panel: recipe grid + resolve + encode to provider.
  Pick items by click / HTML5 drag.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight, Plus } from '@lucide/vue'
import { api, type EncodingMode, type EncodingSlot, type EncodingStonecuttingOption, type Item, type PatternProviderBoard } from '../api/client'
import ItemSlot from './ItemSlot.vue'
import McFormattedText from './McFormattedText.vue'
import PatternMoveTargetDialog from './PatternMoveTargetDialog.vue'
import ScrollFade from './ScrollFade.vue'
import { preferTouchTargets } from '@/lib/platform'
import { pxRem } from '@/lib/pxRem'
import { ApiError } from '@/utils/errors'
import { stripMcFormat } from '@/lib/mcFormat'
import { toastError, toastSuccess } from '@/lib/toast'
import { AppButton, AppInput, AppSwitch } from '@/ui'

type SlotKind = 'craft' | 'processIn' | 'processOut' | 'smith' | 'stone'

type DragPayload = { source: 'catalog'; item: Item } | { source: 'slot'; kind: SlotKind; index: number; item: Item }

const DND_MIME = 'application/x-ae2-lanuis-encoding'

const { t } = useI18n()
const touchUi = preferTouchTargets()
const slotPx = touchUi ? 48 : 40
/** ????????????? 3?3????? */
const processSlotPx = touchUi ? 42 : 34
const craftGapPx = 8 // gap-2
const craftOutPx = slotPx + 4
/** ????????? 2 ????? */
const craftOutOffsetPx = slotPx + craftGapPx - (craftOutPx - slotPx) / 2

const smithLabels = computed(() => [t('encoding.smithTemplate'), t('encoding.smithBase'), t('encoding.smithAddition')])

const mode = ref<EncodingMode>('crafting')
const modes: EncodingMode[] = ['crafting', 'processing', 'smithing', 'stonecutting']

const blankPatterns = ref('0')
const substitute = ref(false)
const substituteFluids = ref(true)

const craftSlots = ref<(Item | null)[]>(Array.from({ length: 9 }, () => null))
const processInputs = ref<(Item | null)[]>(Array.from({ length: 9 }, () => null))
const processOutputs = ref<(Item | null)[]>(Array.from({ length: 9 }, () => null))
const smithSlots = ref<(Item | null)[]>([null, null, null])
const stoneInput = ref<Item | null>(null)
const stoneOptions = ref<EncodingStonecuttingOption[]>([])
const stoneRecipeId = ref('')

const focusKind = ref<SlotKind>('craft')
const focusIndex = ref(0)
const dropOver = ref('')

const previewOutput = ref<Item | null>(null)
const canEncode = ref(false)
const warning = ref('')
const recipeId = ref('')
const craftingShape = ref('')

const itemQ = ref('')
const items = ref<Item[]>([])
const itemsLoading = ref(false)

const providers = ref<PatternProviderBoard[]>([])
const providerId = ref('')
const providerPickerOpen = ref(false)
/** ???????????????? */
const pendingEncodeAfterPick = ref(false)

const encoding = ref(false)

let resolveTimer: ReturnType<typeof setTimeout> | undefined
let itemTimer: ReturnType<typeof setTimeout> | undefined

const blankOk = computed(() => {
  const n = Number(blankPatterns.value)
  return Number.isFinite(n) ? n > 0 : blankPatterns.value !== '0'
})

/** footer ?????????????????? */
const footerHint = computed(() => {
  if (mode.value === 'stonecutting' && stoneInput.value && !stoneOptions.value.length) {
    return t('encoding.noStoneRecipes')
  }
  return warning.value.trim() || ''
})

function modeLabel(m: EncodingMode) {
  const map: Record<EncodingMode, string> = {
    crafting: t('patterns.modeCrafting'),
    processing: t('patterns.modeProcessing'),
    smithing: t('patterns.modeSmithing'),
    stonecutting: t('patterns.modeStonecutting'),
  }
  return map[m]
}

function dropKey(kind: SlotKind, index: number) {
  return `${kind}:${index}`
}

function isFocused(kind: SlotKind, index: number) {
  return focusKind.value === kind && focusIndex.value === index
}

function isDropTarget(kind: SlotKind, index: number) {
  return dropOver.value === dropKey(kind, index)
}

function toSlot(item: Item | null, index: number): EncodingSlot | null {
  if (!item) return null
  return { key: item.key, id: item.id, amount: item.amount || '1', index }
}

function buildInputs(): EncodingSlot[] {
  if (mode.value === 'crafting') {
    return craftSlots.value.map((it, i) => toSlot(it, i)).filter(Boolean) as EncodingSlot[]
  }
  if (mode.value === 'processing') {
    return processInputs.value.map((it, i) => toSlot(it, i)).filter(Boolean) as EncodingSlot[]
  }
  if (mode.value === 'smithing') {
    return smithSlots.value.map((it, i) => toSlot(it, i)).filter(Boolean) as EncodingSlot[]
  }
  const s = toSlot(stoneInput.value, 0)
  return s ? [s] : []
}

function buildOutputs(): EncodingSlot[] {
  if (mode.value !== 'processing') return []
  return processOutputs.value.map((it, i) => toSlot(it, i)).filter(Boolean) as EncodingSlot[]
}

function getSlot(kind: SlotKind, index: number): Item | null {
  if (kind === 'craft') return craftSlots.value[index] ?? null
  if (kind === 'processIn') return processInputs.value[index] ?? null
  if (kind === 'processOut') return processOutputs.value[index] ?? null
  if (kind === 'smith') return smithSlots.value[index] ?? null
  return stoneInput.value
}

function writeSlot(kind: SlotKind, index: number, item: Item | null) {
  if (kind === 'craft') {
    craftSlots.value[index] = item
    craftSlots.value = [...craftSlots.value]
  } else if (kind === 'processIn') {
    processInputs.value[index] = item
    processInputs.value = [...processInputs.value]
  } else if (kind === 'processOut') {
    processOutputs.value[index] = item
    processOutputs.value = [...processOutputs.value]
  } else if (kind === 'smith') {
    smithSlots.value[index] = item
    smithSlots.value = [...smithSlots.value]
  } else {
    stoneInput.value = item
  }
}

function clearGrid() {
  craftSlots.value = Array.from({ length: 9 }, () => null)
  processInputs.value = Array.from({ length: 9 }, () => null)
  processOutputs.value = Array.from({ length: 9 }, () => null)
  smithSlots.value = [null, null, null]
  stoneInput.value = null
  stoneOptions.value = []
  stoneRecipeId.value = ''
  previewOutput.value = null
  canEncode.value = false
  warning.value = ''
  recipeId.value = ''
  craftingShape.value = ''
}

function setFocus(kind: SlotKind, index: number) {
  focusKind.value = kind
  focusIndex.value = index
}

function placeItem(item: Item, kind = focusKind.value, index = focusIndex.value) {
  const copy: Item = kind === 'processOut' ? { ...item, amount: item.amount || '1' } : { ...item, amount: '1' }
  writeSlot(kind, index, copy)
  setFocus(kind, index)
}

function clearSlot(kind: SlotKind, index: number) {
  writeSlot(kind, index, null)
  setFocus(kind, index)
}

function onSlotClick(kind: SlotKind, index: number) {
  setFocus(kind, index)
}

function readDrag(e: DragEvent): DragPayload | null {
  const raw = e.dataTransfer?.getData(DND_MIME) || e.dataTransfer?.getData('text/plain')
  if (!raw) return null
  try {
    return JSON.parse(raw) as DragPayload
  } catch {
    return null
  }
}

function onCatalogDragStart(e: DragEvent, item: Item) {
  if (touchUi || !e.dataTransfer) return
  const payload: DragPayload = { source: 'catalog', item }
  e.dataTransfer.setData(DND_MIME, JSON.stringify(payload))
  e.dataTransfer.setData('text/plain', JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copy'
}

function onSlotDragStart(e: DragEvent, kind: SlotKind, index: number) {
  const item = getSlot(kind, index)
  if (touchUi || !item || !e.dataTransfer) {
    e.preventDefault()
    return
  }
  const payload: DragPayload = { source: 'slot', kind, index, item }
  e.dataTransfer.setData(DND_MIME, JSON.stringify(payload))
  e.dataTransfer.setData('text/plain', JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'move'
  setFocus(kind, index)
}

function onSlotDragOver(e: DragEvent, kind: SlotKind, index: number) {
  if (touchUi) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move'
  dropOver.value = dropKey(kind, index)
}

function onSlotDragLeave(kind: SlotKind, index: number) {
  if (dropOver.value === dropKey(kind, index)) dropOver.value = ''
}

function onSlotDrop(e: DragEvent, kind: SlotKind, index: number) {
  if (touchUi) return
  e.preventDefault()
  dropOver.value = ''
  const payload = readDrag(e)
  if (!payload) return

  if (payload.source === 'catalog') {
    placeItem(payload.item, kind, index)
    return
  }

  if (payload.kind === kind && payload.index === index) return

  const target = getSlot(kind, index)
  writeSlot(kind, index, { ...payload.item })
  writeSlot(payload.kind, payload.index, target)
  setFocus(kind, index)
}

function onDragEnd() {
  dropOver.value = ''
}

async function refreshStatus() {
  try {
    const s = await api.encoding.status()
    blankPatterns.value = s.blankPatterns || '0'
  } catch {
    /* ignore */
  }
}

async function refreshProviders() {
  try {
    const res = await api.patterns.providers(new URLSearchParams())
    providers.value = res.providers || []
    if (providerId.value && !providers.value.some((p) => p.id === providerId.value)) {
      providerId.value = ''
    }
  } catch {
    providers.value = []
  }
}

async function searchItems() {
  itemsLoading.value = true
  try {
    const params = new URLSearchParams({
      q: itemQ.value.trim(),
      page: '1',
      pageSize: '96',
      sort: 'name',
      order: 'asc',
    })
    const res = await api.items(params)
    items.value = res.items || []
  } catch {
    items.value = []
  } finally {
    itemsLoading.value = false
  }
}

function scheduleItemSearch() {
  if (itemTimer) clearTimeout(itemTimer)
  itemTimer = setTimeout(() => {
    void searchItems()
  }, 200)
}

async function runResolve() {
  warning.value = ''
  try {
    const body = {
      mode: mode.value,
      inputs: buildInputs(),
      outputs: buildOutputs(),
      substitute: substitute.value,
      substituteFluids: substituteFluids.value,
      recipeId: mode.value === 'stonecutting' ? stoneRecipeId.value || undefined : undefined,
    }
    const res = await api.encoding.resolve(body)
    canEncode.value = !!res.canEncode
    previewOutput.value = res.primaryOutput || null
    recipeId.value = res.recipeId || ''
    craftingShape.value = res.craftingShape || ''
    // ?????????????/mock ???????
    warning.value = res.warning || ''
  } catch {
    canEncode.value = false
    previewOutput.value = null
    recipeId.value = ''
    craftingShape.value = ''
    warning.value = ''
  }
}

function scheduleResolve() {
  if (resolveTimer) clearTimeout(resolveTimer)
  resolveTimer = setTimeout(() => {
    void runResolve()
  }, 250)
}

async function loadStoneOptions() {
  stoneOptions.value = []
  if (!stoneInput.value) {
    stoneRecipeId.value = ''
    return
  }
  try {
    const res = await api.encoding.stonecuttingOptions({
      input: { key: stoneInput.value.key, id: stoneInput.value.id },
    })
    stoneOptions.value = res.options || []
    if (stoneRecipeId.value && !stoneOptions.value.some((o) => o.recipeId === stoneRecipeId.value)) {
      stoneRecipeId.value = ''
    }
    if (!stoneRecipeId.value && stoneOptions.value[0]) {
      stoneRecipeId.value = stoneOptions.value[0].recipeId
    }
  } catch {
    stoneOptions.value = []
  }
}

async function doEncode(explicitProviderId?: string) {
  if (!canEncode.value) {
    toastError(warning.value || t('encoding.cannotEncode'))
    return
  }
  if (!blankOk.value) {
    toastError(t('encoding.needBlank'))
    return
  }
  const pid = explicitProviderId || providerId.value
  if (!pid) {
    pendingEncodeAfterPick.value = true
    providerPickerOpen.value = true
    return
  }
  encoding.value = true
  try {
    const res = await api.encoding.encode({
      mode: mode.value,
      inputs: buildInputs(),
      outputs: buildOutputs(),
      substitute: substitute.value,
      substituteFluids: substituteFluids.value,
      recipeId: mode.value === 'stonecutting' ? stoneRecipeId.value || undefined : undefined,
      providerId: pid,
    })
    providerId.value = pid
    toastSuccess(t('encoding.encodeOk', { slot: res.slotIndex }))
    await Promise.all([refreshStatus(), refreshProviders()])
  } catch (e) {
    toastError(e instanceof ApiError ? e.message : String(e))
  } finally {
    encoding.value = false
  }
}

/** ?????????????????? */
function startUpload() {
  if (!canEncode.value) {
    toastError(warning.value || t('encoding.cannotEncode'))
    return
  }
  if (!blankOk.value) {
    toastError(t('encoding.needBlank'))
    return
  }
  pendingEncodeAfterPick.value = true
  providerPickerOpen.value = true
}

function onProviderPicked(id: string) {
  const shouldEncode = pendingEncodeAfterPick.value
  pendingEncodeAfterPick.value = false
  providerId.value = id
  providerPickerOpen.value = false
  if (shouldEncode) void doEncode(id)
}

function onProviderPickerOpenUpdate(open: boolean) {
  providerPickerOpen.value = open
  if (!open) pendingEncodeAfterPick.value = false
}

function addProcessIn() {
  if (processInputs.value.length >= 27) return
  processInputs.value = [...processInputs.value, null]
}

function addProcessOut() {
  if (processOutputs.value.length >= 27) return
  processOutputs.value = [...processOutputs.value, null]
}

function processAddClass() {
  return [
    'flex shrink-0 items-center justify-center rounded-[6px] border border-dashed',
    'border-[color:color-mix(in_srgb,var(--color-line-bright)_55%,transparent)]',
    'text-muted transition-[border-color,color,background,transform]',
    'hover:border-cyan/45 hover:bg-[color:color-mix(in_srgb,var(--color-cyan)_8%,transparent)] hover:text-cyan',
    'active:scale-[0.97]',
  ].join(' ')
}

watch(mode, () => {
  clearGrid()
  if (mode.value === 'crafting') setFocus('craft', 0)
  else if (mode.value === 'processing') setFocus('processIn', 0)
  else if (mode.value === 'smithing') setFocus('smith', 0)
  else setFocus('stone', 0)
  scheduleResolve()
})

watch([craftSlots, processInputs, processOutputs, smithSlots, stoneInput, stoneRecipeId, substitute, substituteFluids], () => scheduleResolve(), { deep: true })

watch(stoneInput, () => {
  void loadStoneOptions().then(() => scheduleResolve())
})

watch(itemQ, () => scheduleItemSearch())

onMounted(() => {
  void refreshStatus()
  void refreshProviders()
  void searchItems()
  scheduleResolve()
})

onUnmounted(() => {
  if (resolveTimer) clearTimeout(resolveTimer)
  if (itemTimer) clearTimeout(itemTimer)
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-clip">
    <!-- modes + blank count -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex flex-wrap gap-0.5 rounded-[10px] border border-[color:var(--glass-border)] bg-[color:var(--glass-fill)] p-0.5" role="tablist">
        <button
          v-for="m in modes"
          :key="m"
          type="button"
          role="tab"
          class="rounded-[8px] px-3 py-1.5 text-[0.78rem] font-medium transition-[background,color,box-shadow]"
          :class="mode === m ? 'bg-[color:var(--glass-bg-strong)] text-ink shadow-[var(--glass-shadow)] ring-1 ring-cyan/30' : 'text-muted hover:text-ink'"
          :aria-selected="mode === m"
          @click="mode = m"
        >
          {{ modeLabel(m) }}
        </button>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <span class="mono rounded-full border border-[color:var(--glass-border)] px-2.5 py-1 text-[0.69rem]" :class="blankOk ? 'text-cyan' : 'text-red'">
          {{ t('encoding.blankPatterns', { n: blankPatterns }) }}
        </span>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 gap-3 overflow-clip lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,20rem)]">
      <!-- workspace -->
      <div class="flex min-h-0 flex-col gap-3 overflow-clip">
        <section class="ui-me-recipe-tray relative z-[1] flex min-h-0 flex-1 flex-col overflow-clip !p-0">
          <div class="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center overflow-clip px-4 py-4 sm:px-5 sm:py-5">
            <!-- crafting: ??????????? -->
            <div v-if="mode === 'crafting'" class="relative z-[1] flex flex-nowrap items-start justify-center gap-x-4">
              <div class="grid shrink-0 grid-cols-3 gap-2" role="group" :aria-label="t('encoding.inputs')">
                <ItemSlot
                  v-for="(slot, i) in craftSlots"
                  :key="i"
                  :item="slot"
                  :size="slotPx"
                  :focused="isFocused('craft', i)"
                  :drop-target="isDropTarget('craft', i)"
                  :draggable="!touchUi"
                  clearable
                  :empty-label="t('encoding.emptySlot')"
                  :clear-label="t('encoding.clearSlot')"
                  @click="onSlotClick('craft', i)"
                  @clear="clearSlot('craft', i)"
                  @dragstart="onSlotDragStart($event, 'craft', i)"
                  @dragover="onSlotDragOver($event, 'craft', i)"
                  @dragleave="onSlotDragLeave('craft', i)"
                  @drop="onSlotDrop($event, 'craft', i)"
                  @dragend="onDragEnd"
                />
              </div>
              <div class="flex shrink-0 flex-col items-center gap-2" :style="{ marginTop: pxRem(craftOutOffsetPx) }">
                <div class="flex items-center gap-x-4">
                  <span class="ui-me-recipe-arrow shrink-0" aria-hidden="true">
                    <ArrowRight class="size-4" />
                  </span>
                  <ItemSlot :item="previewOutput" :size="craftOutPx" variant="output" plain amount="" :empty-label="t('encoding.output')" />
                </div>
                <div class="flex min-w-[6.5rem] flex-col gap-1.5" role="group" :aria-label="t('encoding.substituteGroup')">
                  <label class="flex cursor-pointer items-center justify-between gap-2 text-[0.63rem] text-muted hover:text-ink">
                    <span>{{ t('encoding.substitute') }}</span>
                    <AppSwitch size="sm" :model-value="substitute" @update:model-value="substitute = $event" />
                  </label>
                  <label class="flex cursor-pointer items-center justify-between gap-2 text-[0.63rem] text-muted hover:text-ink">
                    <span>{{ t('encoding.substituteFluids') }}</span>
                    <AppSwitch size="sm" :model-value="substituteFluids" @update:model-value="substituteFluids = $event" />
                  </label>
                </div>
              </div>
            </div>

            <!-- processing: compact 3x3 + add on 4th row col 1 -->
            <div v-else-if="mode === 'processing'" class="relative z-[1] flex flex-nowrap items-center justify-center gap-2">
              <div
                class="w-fit shrink-0 rounded-[8px] border border-[color:var(--glass-border)] bg-[color:color-mix(in_srgb,var(--color-slot)_35%,transparent)] p-1.5"
                :aria-label="t('encoding.inputs')"
              >
                <div class="grid grid-cols-3 gap-1">
                  <ItemSlot
                    v-for="(slot, i) in processInputs"
                    :key="'in' + i"
                    :item="slot"
                    :size="processSlotPx"
                    :focused="isFocused('processIn', i)"
                    :drop-target="isDropTarget('processIn', i)"
                    :draggable="!touchUi"
                    clearable
                    :empty-label="t('encoding.emptySlot')"
                    :clear-label="t('encoding.clearSlot')"
                    @click="onSlotClick('processIn', i)"
                    @clear="clearSlot('processIn', i)"
                    @dragstart="onSlotDragStart($event, 'processIn', i)"
                    @dragover="onSlotDragOver($event, 'processIn', i)"
                    @dragleave="onSlotDragLeave('processIn', i)"
                    @drop="onSlotDrop($event, 'processIn', i)"
                    @dragend="onDragEnd"
                  />
                  <button
                    v-if="processInputs.length < 27"
                    type="button"
                    :class="processAddClass()"
                    :style="{ width: pxRem(processSlotPx), height: pxRem(processSlotPx) }"
                    :title="t('encoding.addSlot')"
                    :aria-label="t('encoding.addSlot')"
                    @click="addProcessIn"
                  >
                    <Plus class="size-3.5" stroke-width="2.25" />
                  </button>
                </div>
              </div>

              <span class="ui-me-recipe-arrow shrink-0" aria-hidden="true">
                <ArrowRight class="size-3.5" />
              </span>

              <div
                class="w-fit shrink-0 rounded-[8px] border border-[color:color-mix(in_srgb,var(--color-cyan)_22%,var(--glass-border))] bg-[color:color-mix(in_srgb,var(--color-cyan)_6%,transparent)] p-1.5"
                :aria-label="t('encoding.outputs')"
              >
                <div class="grid grid-cols-3 gap-1">
                  <ItemSlot
                    v-for="(slot, i) in processOutputs"
                    :key="'out' + i"
                    :item="slot"
                    :size="processSlotPx"
                    variant="output"
                    hide-one
                    :focused="isFocused('processOut', i)"
                    :drop-target="isDropTarget('processOut', i)"
                    :draggable="!touchUi"
                    clearable
                    :empty-label="t('encoding.emptySlot')"
                    :clear-label="t('encoding.clearSlot')"
                    @click="onSlotClick('processOut', i)"
                    @clear="clearSlot('processOut', i)"
                    @dragstart="onSlotDragStart($event, 'processOut', i)"
                    @dragover="onSlotDragOver($event, 'processOut', i)"
                    @dragleave="onSlotDragLeave('processOut', i)"
                    @drop="onSlotDrop($event, 'processOut', i)"
                    @dragend="onDragEnd"
                  />
                  <button
                    v-if="processOutputs.length < 27"
                    type="button"
                    :class="processAddClass()"
                    :style="{ width: pxRem(processSlotPx), height: pxRem(processSlotPx) }"
                    :title="t('encoding.addSlot')"
                    :aria-label="t('encoding.addSlot')"
                    @click="addProcessOut"
                  >
                    <Plus class="size-3.5" stroke-width="2.25" />
                  </button>
                </div>
              </div>
            </div>

            <!-- smithing: ?????????/????????? -->
            <div v-else-if="mode === 'smithing'" class="relative z-[1] flex flex-col items-center justify-center gap-3">
              <div class="grid items-center justify-center gap-x-3 gap-y-1.5" style="grid-template-columns: repeat(3, auto) auto auto">
                <span v-for="(label, i) in smithLabels" :key="'sl' + i" class="text-center text-[0.63rem] font-medium tracking-wide text-muted">{{ label }}</span>
                <span aria-hidden="true" />
                <span class="text-center text-[0.63rem] font-medium tracking-wide text-muted">{{ t('encoding.output') }}</span>

                <ItemSlot
                  v-for="(_, i) in smithLabels"
                  :key="'ss' + i"
                  :item="smithSlots[i] ?? null"
                  :size="slotPx"
                  :focused="isFocused('smith', i)"
                  :drop-target="isDropTarget('smith', i)"
                  :draggable="!touchUi"
                  clearable
                  :empty-label="t('encoding.emptySlot')"
                  :clear-label="t('encoding.clearSlot')"
                  @click="onSlotClick('smith', i)"
                  @clear="clearSlot('smith', i)"
                  @dragstart="onSlotDragStart($event, 'smith', i)"
                  @dragover="onSlotDragOver($event, 'smith', i)"
                  @drop="onSlotDrop($event, 'smith', i)"
                  @dragleave="onSlotDragLeave('smith', i)"
                  @dragend="onDragEnd"
                />
                <span class="ui-me-recipe-arrow shrink-0 justify-self-center" aria-hidden="true">
                  <ArrowRight class="size-4" />
                </span>
                <ItemSlot :item="previewOutput" :size="craftOutPx" variant="output" plain amount="" :empty-label="t('encoding.output')" />
              </div>
              <label class="flex cursor-pointer items-center gap-2 text-[0.63rem] text-muted hover:text-ink">
                <span>{{ t('encoding.substitute') }}</span>
                <AppSwitch size="sm" :model-value="substitute" @update:model-value="substitute = $event" />
              </label>
            </div>

            <!-- stonecutting: ?????????/????????? -->
            <div v-else class="relative z-[1] flex flex-col items-center justify-center gap-3">
              <div class="grid grid-cols-[auto_auto_auto] items-center justify-center gap-x-3 gap-y-1.5">
                <span class="text-center text-[0.63rem] font-medium tracking-wide text-muted">{{ t('encoding.input') }}</span>
                <span aria-hidden="true" />
                <span class="text-center text-[0.63rem] font-medium tracking-wide text-muted">{{ t('encoding.output') }}</span>

                <ItemSlot
                  :item="stoneInput"
                  :size="slotPx"
                  :focused="isFocused('stone', 0)"
                  :drop-target="isDropTarget('stone', 0)"
                  :draggable="!touchUi"
                  clearable
                  :empty-label="t('encoding.emptySlot')"
                  :clear-label="t('encoding.clearSlot')"
                  @click="onSlotClick('stone', 0)"
                  @clear="clearSlot('stone', 0)"
                  @dragstart="onSlotDragStart($event, 'stone', 0)"
                  @dragover="onSlotDragOver($event, 'stone', 0)"
                  @dragleave="onSlotDragLeave('stone', 0)"
                  @drop="onSlotDrop($event, 'stone', 0)"
                  @dragend="onDragEnd"
                />
                <span class="ui-me-recipe-arrow shrink-0 justify-self-center" aria-hidden="true">
                  <ArrowRight class="size-4" />
                </span>
                <ItemSlot :item="previewOutput" :size="craftOutPx" variant="output" plain amount="" :empty-label="t('encoding.output')" />
              </div>
              <label class="flex cursor-pointer items-center gap-2 text-[0.63rem] text-muted hover:text-ink">
                <span>{{ t('encoding.substitute') }}</span>
                <AppSwitch size="sm" :model-value="substitute" @update:model-value="substitute = $event" />
              </label>

              <div v-if="stoneOptions.length" class="grid w-full max-w-md gap-1">
                <button
                  v-for="opt in stoneOptions"
                  :key="opt.recipeId"
                  type="button"
                  class="flex items-center gap-2.5 rounded-[9px] border border-transparent px-2 py-1.5 text-left transition-[border-color,background]"
                  :class="
                    stoneRecipeId === opt.recipeId
                      ? 'border-[color:var(--glass-border-bright)] bg-[color:var(--glass-bg-strong)] ring-1 ring-cyan/30'
                      : 'hover:border-[color:var(--glass-border)] hover:bg-[color:var(--glass-fill)]'
                  "
                  @click="stoneRecipeId = opt.recipeId"
                >
                  <ItemSlot :item="opt.output" :size="32" variant="output" plain amount="" />
                  <span class="min-w-0">
                    <strong class="block truncate text-[0.78rem]"><McFormattedText :text="opt.output.displayName" /></strong>
                    <span class="mono block truncate text-[0.63rem] text-muted">{{ opt.recipeId }}</span>
                  </span>
                </button>
              </div>
            </div>

            <p v-if="recipeId" class="relative z-[1] m-0 mt-2 text-center mono text-[0.63rem] text-muted">{{ recipeId }}{{ craftingShape ? ` / ${craftingShape}` : '' }}</p>
          </div>

          <footer
            class="relative z-[1] shrink-0 border-t border-[color:color-mix(in_srgb,var(--color-line-bright)_28%,var(--glass-border))] bg-[color:color-mix(in_srgb,var(--color-panel)_28%,transparent)] px-3 py-2.5 sm:px-4"
          >
            <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <AppButton type="button" variant="danger" size="sm" @click="clearGrid">{{ t('encoding.clear') }}</AppButton>
              <p class="m-0 min-w-0 truncate px-1 text-center text-[0.75rem] text-muted" :class="footerHint ? undefined : 'invisible'" :title="footerHint || undefined">
                {{ footerHint || '\u00a0' }}
              </p>
              <div class="flex flex-wrap items-center justify-end gap-1.5">
                <AppButton type="button" variant="outline" size="sm" :disabled="encoding || !canEncode || !blankOk" @click="startUpload">
                  {{ encoding ? t('encoding.encoding') : t('encoding.upload') }}
                </AppButton>
                <AppButton type="button" variant="primary" size="sm" :disabled="encoding || !canEncode || !blankOk" @click="doEncode()">
                  {{ encoding ? t('encoding.encoding') : t('encoding.encode') }}
                </AppButton>
              </div>
            </div>
          </footer>
        </section>
      </div>

      <!-- item catalog -->
      <aside class="flex min-h-0 flex-col gap-2 overflow-clip rounded-[12px] border border-[color:var(--glass-border)] bg-[color:var(--glass-fill)] p-2.5">
        <AppInput v-model="itemQ" :placeholder="t('encoding.searchItems')" class="w-full" />
        <p class="m-0 text-[0.69rem] leading-snug text-muted">{{ t('encoding.pickHint') }}</p>
        <ScrollFade class="min-h-0 flex-1">
          <div class="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
            <button
              v-for="it in items"
              :key="it.key"
              type="button"
              class="group flex flex-col items-center gap-1 rounded-[9px] border border-transparent p-1 transition-[border-color,background,transform] hover:border-[color:var(--glass-border)] hover:bg-[color:var(--glass-bg-strong)] active:scale-[0.97]"
              :draggable="!touchUi"
              :title="stripMcFormat(it.displayName)"
              @click="placeItem(it)"
              @dragstart="onCatalogDragStart($event, it)"
              @dragend="onDragEnd"
            >
              <ItemSlot :item="it" :size="40" plain amount="" />
              <span class="w-full truncate text-center text-[0.56rem] leading-tight text-muted">{{ stripMcFormat(it.displayName) }}</span>
            </button>
          </div>
          <p v-if="!itemsLoading && !items.length" class="m-0 py-8 text-center text-[0.75rem] text-muted">{{ t('encoding.noItems') }}</p>
        </ScrollFade>
      </aside>
    </div>

    <PatternMoveTargetDialog
      :open="providerPickerOpen"
      :providers="providers"
      :selected-count="1"
      :busy="encoding"
      @update:open="onProviderPickerOpenUpdate"
      @confirm="onProviderPicked"
    />
  </div>
</template>
