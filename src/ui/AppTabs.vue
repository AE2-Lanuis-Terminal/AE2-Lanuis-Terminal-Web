<!--
  App* 封装组件：统一 Fluix 外观与触控尺寸；业务勿直连 components/ui。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export type AppTabItem = { value: string; label: string }

const props = defineProps<{
  modelValue?: string
  items: AppTabItem[]
  class?: HTMLAttributes['class']
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <Tabs :model-value="modelValue" :class="cn('w-full', props.class)" @update:model-value="(v) => $emit('update:modelValue', String(v))">
    <TabsList class="h-auto w-full justify-start gap-1 rounded-none border-b border-line bg-transparent p-0">
      <TabsTrigger
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="ui-tab rounded-[var(--app-radius-md)] data-[state=active]:border-cyan-dim/70 data-[state=active]:bg-[color-mix(in_srgb,var(--color-cyan-dim)_18%,var(--color-panel))] data-[state=active]:text-ink"
      >
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
    <slot />
    <!-- 模板元素 -->
    <template v-for="item in items" :key="`panel-${item.value}`">
      <TabsContent :value="item.value" class="mt-3 outline-none">
        <slot :name="item.value" />
      </TabsContent>
    </template>
  </Tabs>
</template>
