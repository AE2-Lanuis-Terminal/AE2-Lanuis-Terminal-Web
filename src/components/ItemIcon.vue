<!--
  ME 物品图标：固定正方形槽，避免列表 flex/grid 把图挤瘦（preflight 的 max-width:100% + height:auto）。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Item } from '@/types'
import { ITEM_ICON_PLACEHOLDER, isItemIconPlaceholder, resolveItemIconUrl } from '@/lib/itemIcon'
import { stripMcFormat } from '@/lib/mcFormat'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    item: Pick<Item, 'id' | 'iconUrl' | 'displayName' | 'isFluid'>
    size?: number
    /** 贴边填满格子时去掉圆角 */
    flush?: boolean
  }>(),
  { size: 32, flush: false },
)

const src = ref(resolveItemIconUrl(props.item))
const failed = ref(false)

const showPlaceholder = computed(() => failed.value || isItemIconPlaceholder(src.value))
const label = computed(() => stripMcFormat(props.item.displayName) || props.item.id)
const boxStyle = computed(() => {
  const px = `${props.size}px`
  return { width: px, height: px, minWidth: px, minHeight: px }
})

watch(
  () => [props.item.id, props.item.iconUrl, props.item.isFluid] as const,
  () => {
    failed.value = false
    src.value = resolveItemIconUrl(props.item)
  },
)

function onError() {
  if (failed.value) return
  failed.value = true
  src.value = ITEM_ICON_PLACEHOLDER
}
</script>

<template>
  <span class="inline-flex shrink-0 overflow-hidden" :class="flush ? 'rounded-none' : 'rounded-sm'" :style="boxStyle" role="img" :aria-label="label">
    <span v-if="showPlaceholder" class="ui-item-icon-placeholder block size-full" />
    <img
      v-else
      :src="src"
      :alt="label"
      :width="size"
      :height="size"
      draggable="false"
      loading="lazy"
      decoding="async"
      :class="cn('block size-full max-h-none max-w-none object-contain [image-rendering:pixelated]', 'bg-[color-mix(in_srgb,var(--color-line)_35%,transparent)]')"
      @error="onError"
    />
  </span>
</template>
