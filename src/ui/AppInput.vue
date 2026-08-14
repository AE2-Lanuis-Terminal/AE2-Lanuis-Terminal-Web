<!--
  App* 封装：支持 prefix / affix；工具条内用 flex-1 占剩余宽，勿默认 w-full 独占一行。
  type=number 时加 ui-no-spin，避免系统步进器与自定义 affix 抢样式。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useSlots } from 'vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import AppFieldAffix from './AppFieldAffix.vue'
import { affixInnerClass, fieldClass } from './utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    class?: HTMLAttributes['class']
    type?: string
    placeholder?: string
    disabled?: boolean
    autocomplete?: string
    mono?: boolean
    /** 工具条紧凑高度 */
    compact?: boolean
    ariaLabel?: string
  }>(),
  { compact: false },
)

defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const slots = useSlots()
const hasAddon = computed(() => !!(slots.prefix || slots.affix))
const isNumber = computed(() => props.type === 'number')
</script>

<template>
  <AppFieldAffix v-if="hasAddon" :compact="compact" :disabled="disabled" :block="false" :class="cn('min-w-0', props.class)">
    <template v-if="$slots.prefix" #prefix>
      <slot name="prefix" />
    </template>
    <Input
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :aria-label="ariaLabel"
      :class="cn(affixInnerClass(cn('w-full', mono ? 'mono' : undefined, isNumber && 'ui-no-spin')), compact ? 'h-8 text-[0.81rem]' : undefined)"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <template v-if="$slots.affix" #affix>
      <slot name="affix" />
    </template>
  </AppFieldAffix>
  <Input
    v-else
    :model-value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :aria-label="ariaLabel"
    :class="cn(fieldClass(cn(mono ? 'mono' : undefined, isNumber && 'ui-no-spin')), compact && 'h-8', props.class)"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
