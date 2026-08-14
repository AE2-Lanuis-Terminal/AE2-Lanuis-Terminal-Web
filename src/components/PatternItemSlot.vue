<!--
  样板材料槽：内凹立体格 + 数量角标；悬浮显示名称（与 id）。
-->
<script setup lang="ts">
import type { Item } from '@/types'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { stripMcFormat } from '@/lib/mcFormat'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    item: Item
    size?: number
    /** 角标数量；默认 item.amount；传空串则不显示 */
    amount?: string
    /** input=常规凹槽；output=产物高光；alt=替代弱化 */
    variant?: 'input' | 'output' | 'alt'
  }>(),
  { size: 32, variant: 'input' },
)

const tipName = () => stripMcFormat(props.item.displayName) || props.item.id
const amountText = () => {
  if (props.amount !== undefined) return props.amount
  return props.item.amount || ''
}
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <button
        type="button"
        :class="cn('ui-me-slot', variant === 'output' && 'ui-me-slot--output', variant === 'alt' && 'ui-me-slot--alt')"
        :style="{ width: `${size + 10}px`, height: `${size + 10}px` }"
        :aria-label="tipName()"
      >
        <ItemIcon :item="item" :size="size" flush class="relative z-[1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" />
        <span v-if="amountText()" class="ui-me-slot-amount mono">×{{ amountText() }}</span>
      </button>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      :side-offset="8"
      class="!max-w-[16rem] !gap-0.5 !border !border-line !bg-[var(--glass-bg-strong)] !px-2.5 !py-1.5 !text-ink shadow-[var(--glass-shadow)] [&_svg]:!bg-[var(--glass-bg-strong)] [&_svg]:!fill-[var(--glass-bg-strong)]"
    >
      <span class="block max-w-full truncate text-[12px] font-medium">
        <McFormattedText :text="item.displayName || item.id" />
      </span>
      <span class="mono block max-w-full truncate text-[10px] text-muted">{{ item.id }}</span>
    </TooltipContent>
  </Tooltip>
</template>
