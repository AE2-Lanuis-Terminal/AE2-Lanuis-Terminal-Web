<!--
  App* 封装：Fluix 风格开关；关闭态保持可见轨道。业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    class?: HTMLAttributes['class']
    disabled?: boolean
    size?: 'sm' | 'default'
  }>(),
  { size: 'default' },
)

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <Switch :model-value="modelValue" :disabled="disabled" :size="size" :class="cn(props.class)" @update:model-value="$emit('update:modelValue', Boolean($event))" />
</template>
