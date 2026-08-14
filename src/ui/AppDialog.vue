<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
  layer：嵌套弹窗叠层（0=底层，1=二级…）；内容始终高于同层蒙层。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    description?: string
    class?: HTMLAttributes['class']
    /** 嵌套层级：二级确认等应传 1，盖在一级之上 */
    layer?: number
  }>(),
  { layer: 0 },
)

defineEmits<{
  'update:open': [value: boolean]
}>()

/** 蒙层 z；内容必须更高，避免 isolate 蒙层盖住面板 */
const overlayZClass = computed(() => {
  const n = Math.max(0, Math.min(4, props.layer ?? 0))
  return ['z-50', 'z-[60]', 'z-[70]', 'z-[80]', 'z-[90]'][n]
})

const contentZClass = computed(() => {
  const n = Math.max(0, Math.min(4, props.layer ?? 0))
  return ['z-[55]', 'z-[65]', 'z-[75]', 'z-[85]', 'z-[95]'][n]
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      :class="
        cn('ui-glass-strong ui-dialog-panel w-fit min-w-[16.5rem] max-w-[min(100%-1.5rem,20rem)] gap-0 border-line p-0 text-ink sm:max-w-[20rem]', contentZClass, props.class)
      "
      :overlay-class="cn('bg-black/45', overlayZClass)"
    >
      <DialogHeader v-if="title || description || $slots.header" class="border-b border-line px-3 py-2.5 text-left">
        <slot name="header">
          <DialogTitle v-if="title" class="text-[14px] font-semibold tracking-[-0.02em]">
            {{ title }}
          </DialogTitle>
          <DialogDescription v-if="description" class="mt-1 text-[12px] text-muted">
            {{ description }}
          </DialogDescription>
        </slot>
      </DialogHeader>
      <div class="grid gap-1.5 px-3 py-2.5">
        <slot />
      </div>
      <DialogFooter v-if="$slots.footer" class="rounded-b-[inherit] border-line bg-transparent px-3 py-2">
        <slot name="footer" />
      </DialogFooter>
      <slot name="nested" />
    </DialogContent>
  </Dialog>
</template>
