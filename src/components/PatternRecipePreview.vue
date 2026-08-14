<!--
  样板材料预览：凹陷托盘 + 立体槽位；悬浮显示名称。
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowRight } from '@lucide/vue'
import type { Item, PatternInput } from '@/types'
import PatternItemSlot from './PatternItemSlot.vue'

defineProps<{
  inputs: PatternInput[]
  outputs: Item[]
}>()

const { t } = useI18n()

/** 与主槽垂直居中（主槽约 40px） */
const sepWrap = 'mt-[10px] shrink-0 self-start'
</script>

<template>
  <div class="ui-me-recipe-tray">
    <div class="relative z-[1] flex flex-wrap items-start gap-x-2 gap-y-2.5">
      <template v-for="(inp, idx) in inputs" :key="`in-${idx}-${inp.item.key}`">
        <div class="inline-flex flex-col items-center gap-1.5">
          <PatternItemSlot :item="inp.item" :size="30" />
          <div v-if="inp.alternatives?.length" class="flex max-w-[8rem] flex-wrap items-center justify-center gap-1" :aria-label="t('patterns.alternatives')">
            <span class="ui-me-recipe-sep px-1 text-[9px]">{{ t('patterns.or') }}</span>
            <PatternItemSlot v-for="alt in inp.alternatives" :key="alt.key" :item="alt" :size="16" amount="" variant="alt" />
          </div>
        </div>
        <span v-if="idx < inputs.length - 1" :class="sepWrap" aria-hidden="true">
          <span class="ui-me-recipe-sep">+</span>
        </span>
      </template>

      <span :class="sepWrap" aria-hidden="true">
        <span class="ui-me-recipe-arrow">
          <ArrowRight class="size-3.5" />
        </span>
      </span>

      <template v-for="(out, idx) in outputs" :key="`out-${idx}-${out.key}`">
        <PatternItemSlot :item="out" :size="30" variant="output" />
        <span v-if="idx < outputs.length - 1" :class="sepWrap" aria-hidden="true">
          <span class="ui-me-recipe-sep">+</span>
        </span>
      </template>
    </div>
  </div>
</template>
