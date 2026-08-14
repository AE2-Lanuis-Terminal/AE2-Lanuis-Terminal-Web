<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<
    SwitchRootProps & {
      class?: HTMLAttributes['class']
      size?: 'sm' | 'default'
    }
  >(),
  {
    size: 'default',
  },
)

const emits = defineEmits<SwitchRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'size')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SwitchRoot
    v-slot="slotProps"
    data-slot="switch"
    :data-size="size"
    v-bind="forwarded"
    :class="
      cn(
        // 轨道：关闭态也保持可见（凹槽 + 描边），避免透明消失
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full outline-none transition-[background-color,border-color,box-shadow]',
        'border border-[color:var(--color-line-bright)]',
        'bg-[color-mix(in_srgb,var(--color-slot)_92%,#000000)]',
        'shadow-[inset_0_1px_2px_color-mix(in_srgb,#000_45%,transparent)]',
        'data-checked:border-[color:color-mix(in_srgb,var(--color-cyan)_55%,var(--color-line))]',
        'data-checked:bg-cyan',
        'data-checked:shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_22%,transparent),0_0_10px_color-mix(in_srgb,var(--color-cyan)_28%,transparent)]',
        'focus-visible:ring-2 focus-visible:ring-cyan/35 focus-visible:ring-offset-0',
        'data-disabled:cursor-not-allowed data-disabled:opacity-45',
        'data-[size=default]:h-[1.125rem] data-[size=default]:w-8',
        'data-[size=sm]:h-3.5 data-[size=sm]:w-6',
        'after:absolute after:-inset-x-3 after:-inset-y-2',
        props.class,
      )
    "
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="
        cn(
          'pointer-events-none block rounded-full ring-0 transition-transform will-change-transform',
          'bg-[color:var(--color-ink)] shadow-[0_1px_2px_color-mix(in_srgb,#000_50%,transparent)]',
          'data-[state=checked]:bg-[color:var(--primary-foreground)]',
          'group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-2.5',
          'translate-x-[0.13rem]',
          'group-data-[size=default]/switch:data-[state=checked]:translate-x-[0.94rem]',
          'group-data-[size=sm]/switch:data-[state=checked]:translate-x-[0.69rem]',
        )
      "
    >
      <slot name="thumb" v-bind="slotProps" />
    </SwitchThumb>
  </SwitchRoot>
</template>
