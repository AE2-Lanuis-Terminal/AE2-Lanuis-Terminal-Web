<!--
  将已选样板批量移动到目标供应器（填空槽）。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternProviderBoard } from '@/types'
import McFormattedText from './McFormattedText.vue'
import { AppButton, AppDialog } from '@/ui'
import { stripMcFormat } from '@/lib/mcFormat'

const props = defineProps<{
  open: boolean
  providers: PatternProviderBoard[]
  selectedCount: number
  excludeProviderIds?: string[]
  busy?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [providerId: string]
}>()

const { t } = useI18n()
const picked = ref('')

const candidates = computed(() =>
  props.providers
    .filter((p) => p.movable !== false)
    .filter((p) => !(props.excludeProviderIds || []).includes(p.id))
    .map((p) => {
      const free = Math.max(0, (p.slotCount ?? 0) - (p.usedSlots ?? 0))
      return { ...p, free }
    })
    .filter((p) => p.free > 0)
    .sort((a, b) => stripMcFormat(a.name).localeCompare(stripMcFormat(b.name))),
)

watch(
  () => props.open,
  (v) => {
    if (v) picked.value = candidates.value[0]?.id || ''
  },
)

const canConfirm = computed(() => !!picked.value && props.selectedCount > 0 && (candidates.value.find((c) => c.id === picked.value)?.free ?? 0) >= props.selectedCount)

function onOpen(v: boolean) {
  if (!props.busy) emit('update:open', v)
}

function confirm() {
  if (!canConfirm.value || props.busy) return
  emit('confirm', picked.value)
}
</script>

<template>
  <AppDialog :open="open" class="min-w-[18rem] max-w-[min(100%-1.5rem,24rem)] sm:max-w-[24rem]" @update:open="onOpen">
    <template #header>
      <h2 class="m-0 text-[13px] font-semibold tracking-[-0.02em]">{{ t('patterns.moveTitle') }}</h2>
      <p class="m-0 mt-1 text-[12px] text-muted">{{ t('patterns.moveHint') }}</p>
    </template>

    <p class="m-0 text-[12px] text-muted">{{ t('patterns.selectedCount', { n: selectedCount }) }}</p>
    <div class="mt-2 grid max-h-[40vh] gap-1.5 overflow-auto">
      <button
        v-for="p in candidates"
        :key="p.id"
        type="button"
        class="ui-glass-chip flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left"
        :class="picked === p.id ? 'border-[color:var(--glass-border-bright)] ring-1 ring-cyan/35' : undefined"
        :disabled="p.free < selectedCount || busy"
        @click="picked = p.id"
      >
        <span class="min-w-0">
          <strong class="block truncate text-[12.5px]"><McFormattedText :text="p.name" /></strong>
          <span class="mono text-[10px] text-muted">{{ p.id }}</span>
        </span>
        <span class="mono shrink-0 text-[11px] text-cyan">{{ t('patterns.moveFree', { n: p.free }) }}</span>
      </button>
      <p v-if="!candidates.length" class="m-0 text-[12px] text-muted">{{ t('patterns.empty') }}</p>
    </div>

    <template #footer>
      <AppButton type="button" variant="outline" size="sm" :disabled="busy" @click="onOpen(false)">
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton type="button" variant="primary" size="sm" :disabled="!canConfirm || busy" @click="confirm">
        {{ busy ? t('patterns.moveBusy') : t('patterns.moveConfirm') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
