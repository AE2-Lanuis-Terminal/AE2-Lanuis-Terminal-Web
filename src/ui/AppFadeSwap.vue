<!--
  全局内容切换：按 swapKey 做 out-in 过渡；受 html[data-motion=off] 统一关闭。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    swapKey: string | number
    /** 对应 base.css 中 ui-* Transition 名 */
    name?: 'ui-list-fade' | 'ui-view-fade' | 'ui-overlay-fade' | 'ui-overlay-pop' | 'ui-overlay-scale'
    appear?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { name: 'ui-list-fade', appear: false },
)
</script>

<template>
  <Transition :name="name" mode="out-in" :appear="appear">
    <div :key="String(swapKey)" :class="cn('min-h-0', $props.class)">
      <slot />
    </div>
  </Transition>
</template>
