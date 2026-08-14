<!--
  配方树：@vue-flow/core + NodeToolbar。
  注意：不要给 VueFlow 设动态 id，否则 NodeToolbar 的 useVueFlow() 对不上实例。
-->
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { CraftRecipeTreeInput, CraftRecipeTreeNode, Item } from '@/types'
import CraftFlowNode, { type CraftFlowNodeData } from './CraftFlowNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const props = defineProps<{
  node: CraftRecipeTreeNode
  modeLabel?: (mode?: string) => string
}>()

const SLOT = 36
const COL_GAP = 56
const ROW_GAP = 12
const PAD = 24
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5

const nodeTypes = { craftItem: markRaw(CraftFlowNode) }

function isPatternHighlight(n: Pick<CraftRecipeTreeNode, 'patternId' | 'mode'>): boolean {
  return Boolean(n.patternId) && n.mode !== 'leaf'
}

function edgeChildren(inputs: CraftRecipeTreeInput[]): Array<{ kind: 'node'; node: CraftRecipeTreeNode } | { kind: 'leaf'; item: Item; missing?: boolean }> {
  const out: Array<{ kind: 'node'; node: CraftRecipeTreeNode } | { kind: 'leaf'; item: Item; missing?: boolean }> = []
  for (const edge of inputs) {
    if (edge.child) out.push({ kind: 'node', node: edge.child })
    else if (edge.item) out.push({ kind: 'leaf', item: edge.item, missing: edge.missing })
  }
  return out
}

function subtreeHeight(node: CraftRecipeTreeNode): number {
  const kids = edgeChildren(node.inputs)
  if (!kids.length) return SLOT
  let sum = 0
  for (const kid of kids) {
    sum += kid.kind === 'node' ? subtreeHeight(kid.node) : SLOT
  }
  return Math.max(SLOT, sum + ROW_GAP * (kids.length - 1))
}

function toFlowGraph(root: CraftRecipeTreeNode): { nodes: Node<CraftFlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<CraftFlowNodeData>[] = []
  const edges: Edge[] = []
  let seq = 0

  function place(node: CraftRecipeTreeNode, depth: number, top: number): string {
    const h = subtreeHeight(node)
    const x = PAD + depth * (SLOT + COL_GAP)
    const y = top + (h - SLOT) / 2
    const id = `n-${seq++}`
    nodes.push({
      id,
      type: 'craftItem',
      position: { x, y },
      data: {
        item: node.output,
        amount: node.output?.amount || node.times,
        missing: node.missing,
        highlight: isPatternHighlight(node),
      },
      draggable: false,
      selectable: true,
    })

    const kids = edgeChildren(node.inputs)
    let childTop = top
    for (const kid of kids) {
      const kidH = kid.kind === 'node' ? subtreeHeight(kid.node) : SLOT
      let childId: string
      if (kid.kind === 'node') {
        childId = place(kid.node, depth + 1, childTop)
      } else {
        childId = `l-${seq++}`
        nodes.push({
          id: childId,
          type: 'craftItem',
          position: { x: PAD + (depth + 1) * (SLOT + COL_GAP), y: childTop + (kidH - SLOT) / 2 },
          data: {
            item: kid.item,
            amount: kid.item.amount,
            missing: kid.missing,
            highlight: false,
          },
          draggable: false,
          selectable: true,
        })
      }
      edges.push({
        id: `${id}->${childId}`,
        source: id,
        target: childId,
        type: 'step',
        animated: false,
        style: { stroke: 'color-mix(in srgb, var(--color-muted) 75%, transparent)', strokeWidth: 1.5 },
      })
      childTop += kidH + ROW_GAP
    }
    return id
  }

  place(root, 0, PAD)
  return { nodes, edges }
}

const graph = computed(() => toFlowGraph(props.node))
</script>

<template>
  <div class="craft-flow h-full min-h-[12rem] w-full overflow-hidden bg-[color-mix(in_srgb,var(--glass-bg-soft)_55%,transparent)]">
    <VueFlow
      :nodes="graph.nodes"
      :edges="graph.edges"
      :node-types="nodeTypes"
      :min-zoom="MIN_ZOOM"
      :max-zoom="MAX_ZOOM"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="true"
      :select-nodes-on-drag="false"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :pan-on-scroll="false"
      :elevate-nodes-on-select="true"
      :multi-selection-key-code="null"
      fit-view-on-init
      :fit-view-options="{ padding: 0.2 }"
      class="h-full w-full"
    >
      <Background :gap="16" :size="1" pattern-color="color-mix(in srgb, var(--color-line) 55%, transparent)" />
      <Controls :show-interactive="false" position="bottom-right" />
    </VueFlow>
  </div>
</template>

<style scoped>
.craft-flow :deep(.vue-flow) {
  background: transparent;
}
.craft-flow :deep(.vue-flow__viewport),
.craft-flow :deep(.vue-flow__transformationpane) {
  overflow: visible;
}
.craft-flow :deep(.vue-flow__edge-path) {
  stroke: color-mix(in srgb, var(--color-muted) 75%, transparent);
}
.craft-flow :deep(.vue-flow__controls) {
  border: 1px solid var(--color-line);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: none;
  background: color-mix(in srgb, var(--glass-bg) 92%, transparent);
}
.craft-flow :deep(.vue-flow__controls-button) {
  border: none;
  border-bottom: 1px solid var(--color-line);
  background: transparent;
  fill: var(--color-ink);
}
.craft-flow :deep(.vue-flow__controls-button:hover) {
  background: color-mix(in srgb, var(--color-cyan) 12%, transparent);
}
.craft-flow :deep(.vue-flow__pane) {
  cursor: grab;
}
.craft-flow :deep(.vue-flow__pane:active) {
  cursor: grabbing;
}
.craft-flow :deep(.vue-flow__node) {
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  width: auto !important;
  height: auto !important;
  overflow: visible;
}
.craft-flow :deep(.vue-flow__node-craftItem) {
  padding: 0;
  overflow: visible;
}
.craft-flow :deep(.vue-flow__node-toolbar) {
  z-index: 50 !important;
  pointer-events: none;
}
.craft-flow :deep(.vue-flow__handle) {
  opacity: 0;
  pointer-events: none;
}
</style>
