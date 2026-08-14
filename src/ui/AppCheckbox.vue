<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { preferTouchTargets } from '@/lib/platform'

const props = defineProps<{
  modelValue?: boolean | 'indeterminate'
  label?: string
  class?: HTMLAttributes['class']
  id?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const cid = props.id || `chk-${Math.random().toString(36).slice(2, 9)}`

function onUpdate(v: boolean | 'indeterminate') {
  emit('update:modelValue', v === true)
}
</script>

<template>
  <!-- w-fit：grid 表单里不要拉满行宽，仅勾选框+文案可点 -->
  <label :class="cn('inline-flex w-fit max-w-full items-center gap-2 text-[12.5px] text-muted', preferTouchTargets() && 'min-h-11 gap-3 text-[14px]', props.class)">
    <Checkbox
      :id="cid"
      :model-value="modelValue === true"
      class="border-line data-[state=checked]:border-cyan data-[state=checked]:bg-cyan data-[state=checked]:text-primary-foreground"
      @update:model-value="onUpdate"
    />
    <Label v-if="label || $slots.default" :for="cid" class="cursor-pointer font-normal text-muted">
      <slot>{{ label }}</slot>
    </Label>
  </label>
</template>
