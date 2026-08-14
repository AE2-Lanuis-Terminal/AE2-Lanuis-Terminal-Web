<!--
  Vue Flow 节点：点击选中后 NodeToolbar 显示详情；点空白处取消选中即关闭。
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import { Handle, Position } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import type { Item } from '@/types'
import ItemIcon from './ItemIcon.vue'
import McFormattedText from './McFormattedText.vue'
import { cn } from '@/lib/utils'

export interface CraftFlowNodeData {
  item?: Item
  amount: string
  missing?: boolean
  highlight: boolean
}

const props = defineProps<NodeProps<CraftFlowNodeData>>()

const slotClass = computed(() =>
  cn(
    'nodrag nopan nowheel relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-[3px] border p-0',
    props.data.highlight
      ? 'border-[color-mix(in_srgb,var(--color-amber)_85%,var(--glass-border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-amber)_35%,transparent)]'
      : 'border-line bg-[color-mix(in_srgb,var(--glass-bg)_88%,transparent)]',
    props.selected ? 'ring-1 ring-cyan/70' : undefined,
    props.data.missing ? 'opacity-90' : undefined,
  ),
)
</script>

<template>
  <div class="nodrag nopan relative size-9">
    <NodeToolbar :node-id="id" :is-visible="selected" :position="Position.Top" :offset="10" align="center">
      <div
        class="pointer-events-none max-w-[16rem] rounded-md border border-line bg-[color-mix(in_srgb,var(--glass-bg)_96%,transparent)] px-2 py-1 text-[11px] leading-snug text-ink shadow-md"
      >
        <span class="inline-flex max-w-full items-center gap-1">
          <McFormattedText v-if="data.item" class="truncate" :text="data.item.displayName" />
          <span class="mono shrink-0 text-cyan">×{{ data.amount }}</span>
        </span>
      </div>
    </NodeToolbar>

    <Handle type="target" :position="Position.Left" class="!pointer-events-none !h-1 !w-1 !border-0 !bg-transparent" />

    <div :class="slotClass">
      <ItemIcon v-if="data.item" :item="data.item" flush />
    </div>

    <Handle type="source" :position="Position.Right" class="!pointer-events-none !h-1 !w-1 !border-0 !bg-transparent" />
  </div>
</template>
