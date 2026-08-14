<!-- 合成计划配方树：画布入口（vue-flow 异步加载，避免首屏打进主包） -->
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { CraftRecipeTreeNode } from '@/types'

const CraftRecipeTreeCanvas = defineAsyncComponent(() => import('./CraftRecipeTreeCanvas.vue'))

defineProps<{
  node: CraftRecipeTreeNode
  modeLabel?: (mode?: string) => string
}>()
</script>

<template>
  <CraftRecipeTreeCanvas :node="node" :mode-label="modeLabel" />
</template>
