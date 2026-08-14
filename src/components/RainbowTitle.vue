<!--
  主标题彩虹走马灯：整段文字共享一条循环渐变，CSS 平移 background-position。
  关闭动画（data-motion=off / prefers-reduced-motion）时停在起点色带。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    text?: string
    class?: HTMLAttributes['class']
    as?: 'h1' | 'h2' | 'strong' | 'span' | 'p'
  }>(),
  { as: 'strong' },
)
</script>

<template>
  <component :is="as" :class="cn('ui-rainbow-title truncate text-[13px] font-semibold tracking-[-0.02em]', $props.class)">
    {{ text }}
  </component>
</template>
