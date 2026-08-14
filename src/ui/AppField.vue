<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const props = defineProps<{
  label?: string
  class?: HTMLAttributes['class']
  htmlFor?: string
}>()
</script>

<template>
  <div :class="cn('grid gap-1.5', props.class)">
    <!-- UI 结构 -->
    <Label
      v-if="label || $slots.label"
      :for="htmlFor"
      class="ui-label !mb-0 text-[0.69rem] font-semibold tracking-[0.02em] text-[color-mix(in_srgb,var(--color-ink)_72%,var(--color-muted))]"
    >
      <!-- UI 结构 -->
      <slot name="label">{{ label }}</slot>
    </Label>
    <!-- UI 结构 -->
    <slot />
  </div>
</template>
