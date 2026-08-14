<!--
  全局 ME 物品槽：空槽 / 输入 / 产物 / 替代；可选 tip、清除、拖拽、焦点与投放高亮。
-->
<script setup lang="ts">
import type { Item } from '@/types'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { XIcon } from '@lucide/vue'
import { computed } from 'vue'
import { stripMcFormat } from '@/lib/mcFormat'
import { pxRem } from '@/lib/pxRem'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    item?: Item | null
    size?: number
    /** 角标数量；默认取 item.amount；传 '' 则不显示 */
    amount?: string
    /** 为 true 时 amount==='1' 不显示角标（编码产物常用） */
    hideOne?: boolean
    /** input=常规；output=产物高光；alt=替代弱化 */
    variant?: 'input' | 'output' | 'alt'
    /** 悬浮显示名称与 id */
    tip?: boolean
    /** 禁用按压缩放（预览格） */
    plain?: boolean
    focused?: boolean
    dropTarget?: boolean
    /** 有物品时显示右上角清除 */
    clearable?: boolean
    emptyLabel?: string
    clearLabel?: string
    draggable?: boolean
  }>(),
  {
    item: null,
    size: 32,
    variant: 'input',
    tip: false,
    plain: false,
    focused: false,
    dropTarget: false,
    clearable: false,
    draggable: false,
    hideOne: false,
  },
)

const emit = defineEmits<{
  click: []
  clear: []
  dragstart: [e: DragEvent]
  dragover: [e: DragEvent]
  dragleave: []
  drop: [e: DragEvent]
  dragend: []
}>()

const label = computed(() => {
  if (props.item) return stripMcFormat(props.item.displayName) || props.item.id
  return props.emptyLabel || ''
})

const amountText = computed(() => {
  if (props.amount !== undefined) return props.amount
  const raw = props.item?.amount || ''
  if (!raw) return ''
  if (props.hideOne && raw === '1') return ''
  return raw
})

const shellClass = computed(() =>
  cn(
    'ui-me-slot relative overflow-hidden p-0',
    !props.item && 'ui-me-slot--empty',
    props.variant === 'output' && 'ui-me-slot--output',
    props.variant === 'alt' && 'ui-me-slot--alt',
    props.plain && 'ui-me-slot--static',
    props.focused && 'ring-2 ring-cyan/50 border-[color:var(--glass-border-bright)]',
    props.dropTarget && 'ring-2 ring-cyan brightness-110',
  ),
)

const clearClass = cn(
  'absolute -right-1 -top-1 z-20 flex size-4 items-center justify-center rounded-full',
  'border border-[color:var(--glass-border-bright)] bg-[color:var(--glass-bg-strong)] text-muted shadow-[var(--glass-shadow)]',
  'opacity-0 transition-opacity hover:text-ink',
  'group-hover:opacity-100 group-active:opacity-100',
  'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50',
)

const sizeStyle = computed(() => {
  const v = pxRem(props.size)
  return { width: v, height: v }
})

function onClear(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  emit('clear')
}
</script>

<template>
  <div class="group relative inline-flex" :style="sizeStyle">
    <Tooltip v-if="tip && item">
      <TooltipTrigger as-child>
        <button
          type="button"
          tabindex="-1"
          :class="shellClass"
          class="size-full"
          :draggable="draggable && !!item"
          :aria-label="label"
          @click="emit('click')"
          @dragstart="emit('dragstart', $event)"
          @dragover="emit('dragover', $event)"
          @dragleave="emit('dragleave')"
          @drop="emit('drop', $event)"
          @dragend="emit('dragend')"
        >
          <ItemIcon :item="item" flush class="relative z-[1] size-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" />
          <span v-if="amountText" class="ui-me-slot-amount mono">×{{ amountText }}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        :side-offset="8"
        class="!max-w-[16rem] !gap-0.5 !border !border-line !bg-[var(--glass-bg-strong)] !px-2.5 !py-1.5 !text-ink shadow-[var(--glass-shadow)] [&_svg]:!bg-[var(--glass-bg-strong)] [&_svg]:!fill-[var(--glass-bg-strong)]"
      >
        <span class="block max-w-full truncate text-[0.75rem] font-medium">
          <McFormattedText :text="item.displayName || item.id" />
        </span>
        <span class="mono block max-w-full truncate text-[0.63rem] text-muted">{{ item.id }}</span>
      </TooltipContent>
    </Tooltip>

    <button
      v-else
      type="button"
      :class="shellClass"
      class="size-full"
      :draggable="draggable && !!item"
      :title="label || undefined"
      :aria-label="label || undefined"
      @click="emit('click')"
      @dragstart="emit('dragstart', $event)"
      @dragover="emit('dragover', $event)"
      @dragleave="emit('dragleave')"
      @drop="emit('drop', $event)"
      @dragend="emit('dragend')"
    >
      <ItemIcon v-if="item" :item="item" flush class="relative z-[1] size-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" />
      <span v-if="item && amountText" class="ui-me-slot-amount mono">×{{ amountText }}</span>
    </button>

    <button v-if="clearable && item" type="button" :class="clearClass" :aria-label="clearLabel || emptyLabel || 'clear'" tabindex="-1" @click="onClear" @pointerdown.stop>
      <XIcon class="size-2.5" stroke-width="3" />
    </button>
  </div>
</template>
