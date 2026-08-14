<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: boolean
  class?: HTMLAttributes['class']
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <!-- UI 结构 -->
  <Switch
    :model-value="modelValue"
    :disabled="disabled"
    :class="cn('data-[state=checked]:bg-cyan', props.class)"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  />
</template>
