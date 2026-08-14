<!--
  App* 封装：Fluix 玻璃选择器；compact 时宽度随文字；下拉宽度与外壳对齐。
  选项不用右侧勾选占位（以文字色表示选中），避免窄下拉高亮被裁。
  注意：勿用可选 Boolean 作「默认跟 compact」的开关（Vue 会默认成 false）。
  Reka SelectTrigger 在 pointer 打开时会 mousedown.preventDefault，避免抢焦点，
  但会让工具条里的搜索框保持选中；开合时需自行收焦点。
-->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { preferTouchTargets } from '@/lib/platform'
import AppFieldAffix from './AppFieldAffix.vue'
import { affixInnerClass } from './utils'

export type AppSelectOption = { value: string; label: string }

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options: AppSelectOption[]
    placeholder?: string
    class?: HTMLAttributes['class']
    contentClass?: HTMLAttributes['class']
    disabled?: boolean
    compact?: boolean
    /** 拉满父级（表单）；compact 工具条默认不拉满 */
    block?: boolean
    ariaLabel?: string
  }>(),
  { compact: false, block: false },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()

const slots = useSlots()
const hasAddon = computed(() => !!(slots.prefix || slots.affix))
/** compact 且未 block → 随文字；表单用默认非 compact 或显式 block */
const fit = computed(() => props.compact && !props.block)
const open = ref(false)
const shellRef = ref<HTMLElement | null>(null)
const baseWidthPx = ref<number | null>(null)

let ro: ResizeObserver | undefined

function measureBase() {
  const el = shellRef.value
  if (!el) {
    baseWidthPx.value = null
    return
  }
  // ceil：避免亚像素比触发器略窄导致右侧高亮被 overflow 裁切
  baseWidthPx.value = Math.ceil(el.getBoundingClientRect().width)
}

function triggerEl() {
  return shellRef.value?.querySelector<HTMLElement>('[data-slot="select-trigger"]') ?? null
}

/** 清掉仍停在搜索框上的焦点/选区，避免连点下拉时搜索一直呈选中态 */
function releaseForeignTextFocus() {
  const active = document.activeElement
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return
  if (shellRef.value?.contains(active)) return
  active.blur()
}

function focusTrigger() {
  triggerEl()?.focus({ preventScroll: true })
}

function onOpenChange(v: boolean) {
  open.value = v
  if (!v) return
  releaseForeignTextFocus()
  void nextTick(() => {
    // 列表获得焦点前先落到触发器，避免 previouslyFocused 仍是搜索框
    if (!open.value) return
    focusTrigger()
  })
}

/** 拦截 FocusScope 对 previouslyFocused（常为搜索框）的 select() 还原 */
function onCloseAutoFocus(event: Event) {
  event.preventDefault()
  requestAnimationFrame(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body && !shellRef.value?.contains(active)) {
      // 已点到其它下拉/按钮时不要抢焦点
      if (active.getAttribute('data-slot') === 'select-trigger' || active.closest('[data-slot="select-content"]')) return
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        // 误落到搜索时清掉选区
        active.blur()
        focusTrigger()
        return
      }
      return
    }
    focusTrigger()
  })
}

watch(open, async (v) => {
  if (!v) return
  await nextTick()
  measureBase()
})

watch(shellRef, (el) => {
  ro?.disconnect()
  ro = undefined
  if (!el || typeof ResizeObserver === 'undefined') return
  ro = new ResizeObserver(() => measureBase())
  ro.observe(el)
  measureBase()
})

onBeforeUnmount(() => {
  ro?.disconnect()
})

const triggerClass = computed(() =>
  cn(
    hasAddon.value
      ? affixInnerClass(cn('justify-between gap-1.5 pr-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:opacity-80', fit.value ? 'w-auto flex-none' : 'w-full'))
      : cn(
          'gap-1.5 rounded-[var(--app-radius-md)] border-[color:var(--glass-border)] bg-[var(--glass-bg-soft)] text-[0.81rem] text-ink shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-[10px]',
          'hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-bg)]',
          'focus-visible:border-cyan/55 focus-visible:ring-2 focus-visible:ring-cyan/20',
          'data-[state=open]:border-[color:var(--glass-border-bright)] data-[state=open]:bg-[var(--glass-bg)]',
          '[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted [&_svg]:opacity-80',
          fit.value ? '!w-fit max-w-none flex-none' : 'w-full',
        ),
    props.compact ? 'h-8 min-h-8 px-2 py-0' : 'h-9 px-2.5',
    preferTouchTargets() && !props.compact && !hasAddon.value && 'h-11 text-[0.94rem]',
  ),
)

const contentClass = computed(() =>
  cn(
    // min-w-0：覆盖默认 min-w-36；宽度由 contentStyle 与触发器对齐
    'ui-glass-strong z-[80] min-w-0 overflow-y-auto overflow-x-hidden rounded-[var(--app-radius-lg)] border-[color:var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 text-ink shadow-[var(--glass-shadow)]',
    'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-[side=bottom]:data-open:slide-in-from-top-2 duration-200',
    'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:data-closed:slide-out-to-top-2 data-closed:duration-150',
    'data-[side=bottom]:translate-y-0 data-[side=top]:translate-y-0 data-[side=left]:translate-x-0 data-[side=right]:translate-x-0',
    // 去掉勾选占位，避免窄下拉把高亮裁在右侧
    '[&_[data-slot=select-item]]:!px-2.5 [&_[data-slot=select-item]>span.absolute]:!hidden',
    props.contentClass,
  ),
)

const contentStyle = computed(() => {
  if (baseWidthPx.value) {
    const w = `${baseWidthPx.value}px`
    return { minWidth: w, width: w, maxWidth: w }
  }
  return {
    minWidth: 'var(--reka-select-trigger-width)',
    width: 'var(--reka-select-trigger-width)',
    maxWidth: 'var(--reka-select-trigger-width)',
  }
})

const itemClass = cn(
  'cursor-pointer rounded-[var(--app-radius-md)] py-1.5 text-[0.81rem] text-ink outline-none',
  'data-[highlighted]:bg-[color-mix(in_srgb,var(--color-cyan-dim)_22%,var(--glass-bg))] data-[highlighted]:text-ink',
  'data-[state=checked]:text-cyan',
  'focus:bg-[color-mix(in_srgb,var(--color-cyan-dim)_22%,var(--glass-bg))] focus:text-ink',
)
</script>

<template>
  <div ref="shellRef" :class="cn(fit ? 'inline-flex w-auto shrink-0' : 'flex w-full min-w-0', props.class)">
    <AppFieldAffix v-if="hasAddon" :compact="compact" :disabled="disabled" :block="!fit" :class="fit ? 'w-auto' : 'w-full'">
      <template v-if="$slots.prefix" #prefix>
        <slot name="prefix" />
      </template>
      <Select :model-value="modelValue" :disabled="disabled" @update:model-value="(v) => $emit('update:modelValue', String(v ?? ''))" @update:open="onOpenChange">
        <SelectTrigger :size="compact ? 'sm' : 'default'" :aria-label="ariaLabel" :class="triggerClass">
          <SelectValue :placeholder="placeholder" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" :side-offset="4" :class="contentClass" :style="contentStyle" @close-auto-focus="onCloseAutoFocus">
          <SelectItem v-for="opt in options" :key="opt.value" :value="opt.value" :class="itemClass">
            <span class="block truncate">{{ opt.label }}</span>
          </SelectItem>
        </SelectContent>
      </Select>
      <template v-if="$slots.affix" #affix>
        <slot name="affix" />
      </template>
    </AppFieldAffix>
    <Select v-else :model-value="modelValue" :disabled="disabled" @update:model-value="(v) => $emit('update:modelValue', String(v ?? ''))" @update:open="onOpenChange">
      <SelectTrigger :size="compact ? 'sm' : 'default'" :aria-label="ariaLabel" :class="triggerClass">
        <SelectValue :placeholder="placeholder" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" :side-offset="4" :class="contentClass" :style="contentStyle" @close-auto-focus="onCloseAutoFocus">
        <SelectItem v-for="opt in options" :key="opt.value" :value="opt.value" :class="itemClass">
          <span class="block truncate">{{ opt.label }}</span>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
