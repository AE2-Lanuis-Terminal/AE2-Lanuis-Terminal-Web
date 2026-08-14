<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const props = defineProps<{
  orientation?: 'horizontal' | 'vertical'
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <!-- UI 结构 -->
  <Separator :orientation="orientation || 'horizontal'" :class="cn('bg-line', props.class)" />
</template>
