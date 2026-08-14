<!--
  ME 物品图标：铺满上层容器；勿在此设宽高（由父级定尺寸）。
  object-contain + 取消 preflight 的 max-width 压缩，避免被挤扁。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Item } from '@/types'
import { ITEM_ICON_PLACEHOLDER, isItemIconPlaceholder, resolveItemIconUrl } from '@/lib/itemIcon'
import { stripMcFormat } from '@/lib/mcFormat'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    item: Pick<Item, 'id' | 'iconUrl' | 'displayName' | 'kind'>
    /** 贴边填满格子时去掉圆角 */
    flush?: boolean
  }>(),
  { flush: false },
)

const src = ref(resolveItemIconUrl(props.item))
const failed = ref(false)

const showPlaceholder = computed(() => failed.value || isItemIconPlaceholder(src.value))
const label = computed(() => stripMcFormat(props.item.displayName) || props.item.id)

watch(
  () => [props.item.id, props.item.iconUrl, props.item.kind] as const,
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
  <span :class="cn('block size-full min-h-0 min-w-0 overflow-hidden', flush ? 'rounded-none' : 'rounded-sm')" role="img" :aria-label="label">
    <span v-if="showPlaceholder" class="ui-item-icon-placeholder block size-full" />
    <img
      v-else
      :src="src"
      :alt="label"
      draggable="false"
      loading="lazy"
      decoding="async"
      :class="cn('block size-full max-h-none max-w-none object-contain [image-rendering:pixelated]', 'bg-[color-mix(in_srgb,var(--color-line)_35%,transparent)]')"
      @error="onError"
    />
  </span>
</template>
