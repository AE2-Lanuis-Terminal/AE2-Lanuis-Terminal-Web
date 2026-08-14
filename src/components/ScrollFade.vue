<!--
  可滚动容器：上下边缘渐隐；仅在出现滚动条且已下滚时显示回到顶部（按钮叠在 mask 外，避免被渐隐裁切）。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowUpToLineIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'

const SHOW_AFTER_PX = 72

const props = withDefaults(
  defineProps<{
    class?: string
    /** 渐隐高度（设计稿 px，渲染为 rem） */
    fade?: number
    /** 关闭回到顶部按钮 */
    backTop?: boolean
  }>(),
  { fade: 8, backTop: true },
)

const { t } = useI18n()
const root = useTemplateRef<HTMLElement>('root')
const fadeTop = ref(false)
const fadeBottom = ref(false)
/** 内容超出视口（会出现滚动条） */
const scrollable = ref(false)
/** 已下滚足够距离 */
const scrolled = ref(false)
let ro: ResizeObserver | undefined

function update() {
  const el = root.value
  if (!el) return
  const { scrollTop, scrollHeight, clientHeight } = el
  const max = scrollHeight - clientHeight
  const canScroll = max > 1
  scrollable.value = canScroll
  scrolled.value = canScroll && scrollTop > SHOW_AFTER_PX
  if (!canScroll) {
    fadeTop.value = false
    fadeBottom.value = false
    return
  }
  fadeTop.value = scrollTop > 1
  fadeBottom.value = scrollTop < max - 1
}

function scrollToTop() {
  root.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  update()
  const el = root.value
  if (!el) return
  el.addEventListener('scroll', update, { passive: true })
  ro = new ResizeObserver(() => update())
  ro.observe(el)
  if (el.firstElementChild) ro.observe(el.firstElementChild)
})

onBeforeUnmount(() => {
  root.value?.removeEventListener('scroll', update)
  ro?.disconnect()
})

defineExpose({
  update,
  scrollToTop,
  /** 实际产生滚动的节点（外层仅布局） */
  getScrollEl: () => root.value,
})
</script>

<template>
  <!-- grid 同格叠层：由内容撑开高度（兼容仅 max-h 的用法），按钮不进 mask -->
  <div :class="cn('relative grid min-h-0 grid-cols-1 grid-rows-1', props.class, 'overflow-hidden')">
    <div
      ref="root"
      class="ui-scroll-fade col-start-1 row-start-1 min-h-0 min-w-0 overflow-auto"
      :style="{ '--scroll-fade': `${Math.round((fade / 16) * 100) / 100}rem` }"
      :data-fade-top="fadeTop ? 'true' : 'false'"
      :data-fade-bottom="fadeBottom ? 'true' : 'false'"
    >
      <slot />
    </div>

    <div class="pointer-events-none col-start-1 row-start-1 relative z-10 min-h-0 min-w-0 overflow-hidden">
      <Transition name="ui-overlay-fade">
        <button
          v-if="backTop && scrollable && scrolled"
          type="button"
          class="ui-glass-chip pointer-events-auto absolute right-2.5 bottom-2.5 inline-flex size-8 items-center justify-center rounded-[var(--app-radius-md)] text-ink shadow-[var(--glass-shadow-sm)] transition-[color,background-color,border-color] hover:border-[color:var(--glass-border-bright)] hover:text-cyan [&_svg]:size-4 [&_svg]:shrink-0"
          :aria-label="t('common.backToTop')"
          :title="t('common.backToTop')"
          @click="scrollToTop"
        >
          <ArrowUpToLineIcon :size="16" :stroke-width="2" aria-hidden="true" />
        </button>
      </Transition>
    </div>
  </div>
</template>
