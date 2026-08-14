<!--
  样板材料槽：内凹立体格 + 数量角标；可选悬浮显示名称（与 id）。
  触发器默认 tabindex=-1，避免对话框打开时焦点落入导致 tooltip 自动弹出。
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
    /** 是否启用悬浮提示；详情 header 等已有名称时可关 */
    tip?: boolean
  }>(),
  { size: 32, variant: 'input', tip: true },
)

const tipName = () => stripMcFormat(props.item.displayName) || props.item.id
const amountText = () => {
  if (props.amount !== undefined) return props.amount
  return props.item.amount || ''
}

function slotClass() {
  return cn('ui-me-slot overflow-hidden p-0', variantClass(), !props.tip && 'ui-me-slot--static')
}

function variantClass() {
  if (props.variant === 'output') return 'ui-me-slot--output'
  if (props.variant === 'alt') return 'ui-me-slot--alt'
  return undefined
}
</script>

<template>
  <Tooltip v-if="tip">
    <TooltipTrigger as-child>
      <button type="button" tabindex="-1" :class="slotClass()" :style="{ width: `${size}px`, height: `${size}px` }" :aria-label="tipName()">
        <ItemIcon :item="item" flush class="relative z-[1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" />
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
  <div v-else :class="slotClass()" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="tipName()">
    <ItemIcon :item="item" flush class="relative z-[1] drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" />
    <span v-if="amountText()" class="ui-me-slot-amount mono">×{{ amountText() }}</span>
  </div>
</template>
