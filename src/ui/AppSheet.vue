<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const props = defineProps<{
  open?: boolean
  title?: string
  description?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  class?: HTMLAttributes['class']
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <!-- UI 结构 -->
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <!-- UI 结构 -->
    <SheetContent :side="side || 'bottom'" :class="cn('ui-glass-strong border-line text-ink', props.class)">
      <SheetHeader v-if="title || description || $slots.header">
        <!-- UI 结构 -->
        <slot name="header">
          <SheetTitle v-if="title">{{ title }}</SheetTitle>
          <SheetDescription v-if="description">{{ description }}</SheetDescription>
        </slot>
      </SheetHeader>
      <div class="mt-2 min-h-0 flex-1 overflow-auto px-1 pb-2">
        <!-- UI 结构 -->
        <slot />
      </div>
      <div v-if="$slots.footer" class="mt-auto border-t border-line pt-3">
        <!-- UI 结构 -->
        <slot name="footer" />
      </div>
    </SheetContent>
  </Sheet>
</template>
