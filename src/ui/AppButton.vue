<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Button, type ButtonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { touchAwareSize } from './utils'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant'] | 'primary' | 'ghost-quiet' | 'danger'
    size?: ButtonVariants['size']
    class?: HTMLAttributes['class']
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    block?: boolean
  }>(),
  {
    variant: 'outline',
    size: 'default',
    type: 'button',
    disabled: false,
    block: false,
  },
)

const resolvedVariant = (): ButtonVariants['variant'] => {
  if (props.variant === 'primary' || props.variant === 'danger') return 'default'
  if (props.variant === 'ghost-quiet') return 'ghost'
  return props.variant ?? 'outline'
}
</script>

<template>
  <Button
    :type="type"
    :variant="resolvedVariant()"
    :size="touchAwareSize(size ?? 'default')"
    :disabled="disabled"
    :class="
      cn(
        variant === 'outline' &&
          'border-[color:var(--glass-border)] bg-[var(--glass-bg-soft)] text-muted shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-[10px] transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[inset_0_1px_0_var(--glass-highlight),var(--glass-hover-glow)]',
        variant === 'ghost-quiet' &&
          'text-muted transition-[background-color,color,box-shadow] duration-200 hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]',
        variant === 'primary' &&
          'border-cyan/40 bg-[linear-gradient(180deg,#1a6f88_0%,#14586c_100%)] text-[#effbff] shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_28%,transparent)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_4px_14px_color-mix(in_srgb,#0b3a48_30%,transparent),var(--glass-hover-glow)]',
        variant === 'danger' &&
          'border-red/45 bg-[linear-gradient(180deg,#b03a3a_0%,#8a2a2a_100%)] text-[#fff4f4] shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_22%,transparent)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_4px_14px_color-mix(in_srgb,#5a1818_35%,transparent),var(--glass-hover-glow)]',
        block && 'w-full',
        props.class,
      )
    "
  >
    <slot />
  </Button>
</template>
