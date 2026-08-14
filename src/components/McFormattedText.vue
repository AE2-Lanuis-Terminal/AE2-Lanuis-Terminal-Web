<!--
  渲染 Minecraft §/& 颜色与样式码；无格式码时等同纯文本。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { parseMcFormat, segmentStyle, stripMcFormat } from '@/lib/mcFormat'

const props = defineProps<{
  text?: string | null
  /** 额外 class 加在根节点 */
  class?: string
}>()

const segments = computed(() => parseMcFormat(props.text))
const plain = computed(() => stripMcFormat(props.text))
</script>

<template>
  <span :class="props.class" :title="plain">
    <span v-for="(seg, i) in segments" :key="i" :style="segmentStyle(seg)" :class="seg.obfuscated ? 'mc-obfuscated' : undefined">{{ seg.text }}</span>
  </span>
</template>

<style scoped>
@keyframes mc-obfuscate {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.mc-obfuscated {
  animation: mc-obfuscate 0.12s steps(2) infinite;
}
</style>
