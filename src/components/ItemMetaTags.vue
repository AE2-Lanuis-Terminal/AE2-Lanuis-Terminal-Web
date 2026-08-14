<!--
  物品元信息标签：类型按 kind 注册表着色；合成中时只显示「合成中」，不叠「可合成」。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Item } from '@/types'
import { cn } from '@/lib/utils'
import { ITEM_KIND_META, resolveItemKind } from '@/lib/itemKind'

const props = withDefaults(
  defineProps<{
    item: Pick<Item, 'kind' | 'craftable'>
    crafting?: boolean
    class?: string
  }>(),
  {},
)

const { t } = useI18n()
const kind = computed(() => resolveItemKind(props.item))
const meta = computed(() => ITEM_KIND_META[kind.value])
</script>

<template>
  <div :class="cn('flex flex-wrap gap-1', props.class)">
    <span
      class="inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[0.63rem] font-medium leading-none tracking-[0.02em] backdrop-blur-sm"
      :class="meta.tagTextClass"
      :style="{
        borderColor: `color-mix(in srgb, var(${meta.tagColorVar}) 40%, var(--glass-border))`,
        background: `color-mix(in srgb, var(${meta.tagColorVar}) 12%, var(--glass-bg-soft))`,
      }"
    >
      {{ t(meta.labelKey) }}
    </span>
    <span
      v-if="crafting"
      class="inline-flex items-center rounded-[4px] border border-[color-mix(in_srgb,var(--color-cyan)_40%,var(--glass-border))] bg-[color-mix(in_srgb,var(--color-cyan)_12%,var(--glass-bg-soft))] px-1.5 py-0.5 text-[0.63rem] font-medium leading-none tracking-[0.02em] text-cyan backdrop-blur-sm"
    >
      {{ t('storage.crafting') }}
    </span>
    <span
      v-if="item.craftable && !crafting"
      class="inline-flex items-center rounded-[4px] border border-[color-mix(in_srgb,var(--color-amber)_40%,var(--glass-border))] bg-[color-mix(in_srgb,var(--color-amber)_12%,var(--glass-bg-soft))] px-1.5 py-0.5 text-[0.63rem] font-medium leading-none tracking-[0.02em] text-amber backdrop-blur-sm"
    >
      {{ t('storage.craftable') }}
    </span>
  </div>
</template>
