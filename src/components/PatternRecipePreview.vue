<!--
  样板材料预览：凹陷托盘 + 立体槽位；悬浮显示名称。
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowRight } from '@lucide/vue'
import type { Item, PatternInput } from '@/types'
import ItemSlot from './ItemSlot.vue'

defineProps<{
  inputs: PatternInput[]
  outputs: Item[]
}>()

const { t } = useI18n()

/** 与材料槽垂直居中 */
const sepWrap = 'shrink-0 self-center'
</script>

<template>
  <div class="ui-me-recipe-tray">
    <div class="relative z-[1] flex flex-wrap items-start gap-x-2 gap-y-2.5">
      <template v-for="(inp, idx) in inputs" :key="`in-${idx}-${inp.item.key}`">
        <div class="inline-flex flex-col items-center gap-1.5">
          <ItemSlot :item="inp.item" :size="30" tip />
          <div v-if="inp.alternatives?.length" class="flex max-w-[8rem] flex-wrap items-center justify-center gap-1" :aria-label="t('patterns.alternatives')">
            <span class="ui-me-recipe-sep px-1 text-[0.56rem]">{{ t('patterns.or') }}</span>
            <ItemSlot v-for="alt in inp.alternatives" :key="alt.key" :item="alt" :size="16" amount="" variant="alt" tip />
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
        <ItemSlot :item="out" :size="30" variant="output" tip />
        <span v-if="idx < outputs.length - 1" :class="sepWrap" aria-hidden="true">
          <span class="ui-me-recipe-sep">+</span>
        </span>
      </template>
    </div>
  </div>
</template>
