<!--
  输入/选择共用外壳：prefix（左）与 affix（右）落在同一玻璃边框内。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { affixShellClass } from './utils'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    /** false 时随内容收缩，不拉满父级 */
    block?: boolean
    class?: HTMLAttributes['class']
    disabled?: boolean
  }>(),
  { compact: false, block: true, disabled: false },
)
</script>

<template>
  <div
    data-slot="app-field-affix"
    :data-disabled="disabled ? '' : undefined"
    :class="cn(affixShellClass(compact), block ? 'w-full' : 'w-auto shrink-0', disabled && 'pointer-events-none opacity-50', props.class)"
  >
    <div v-if="$slots.prefix" data-slot="prefix" class="flex shrink-0 items-center pl-1.5 text-muted">
      <slot name="prefix" />
    </div>
    <div data-slot="affix-control" class="flex min-h-0 min-w-0 flex-1 items-center">
      <slot />
    </div>
    <div v-if="$slots.affix" data-slot="affix" class="flex shrink-0 items-center gap-0.5 pr-1 text-muted" @pointerdown.stop>
      <slot name="affix" />
    </div>
  </div>
</template>
