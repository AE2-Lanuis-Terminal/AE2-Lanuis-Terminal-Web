<!--
  全局浮层提示宿主：8 锚点；接口类默认走右上角。
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { XIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { TOAST_POSITIONS, useToastStore, type ToastItem, type ToastPosition } from '@/stores/toast'

const { t } = useI18n()
const store = useToastStore()
const { byPosition } = storeToRefs(store)

const anchorClass: Record<ToastPosition, string> = {
  'top-left': 'app-toast-anchor--top-left items-start',
  'top-center': 'app-toast-anchor--top-center items-center',
  'top-right': 'app-toast-anchor--top-right items-end',
  'middle-left': 'app-toast-anchor--middle-left items-start justify-center',
  'middle-right': 'app-toast-anchor--middle-right items-end justify-center',
  'bottom-left': 'app-toast-anchor--bottom-left items-start',
  'bottom-center': 'app-toast-anchor--bottom-center items-center',
  'bottom-right': 'app-toast-anchor--bottom-right items-end',
}

const stackDir: Record<ToastPosition, string> = {
  'top-left': 'flex-col',
  'top-center': 'flex-col',
  'top-right': 'flex-col',
  'middle-left': 'flex-col',
  'middle-right': 'flex-col',
  'bottom-left': 'flex-col-reverse',
  'bottom-center': 'flex-col-reverse',
  'bottom-right': 'flex-col-reverse',
}

function chipClass(toast: ToastItem) {
  return cn(
    'ui-glass-chip pointer-events-auto flex w-[min(100vw-1.5rem,20rem)] items-start gap-2.5 rounded-[10px] px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.28)]',
    toast.variant === 'success' && 'border-[color:color-mix(in_srgb,var(--color-cyan)_45%,var(--glass-border-bright))]',
    toast.variant === 'error' && 'border-[color:color-mix(in_srgb,var(--color-red)_50%,var(--glass-border-bright))]',
    toast.variant === 'warning' && 'border-[color:color-mix(in_srgb,#e8a838_50%,var(--glass-border-bright))]',
    toast.variant === 'info' && 'border-[color:var(--glass-border-bright)]',
  )
}

function titleClass(toast: ToastItem) {
  if (toast.variant === 'success') return 'text-cyan'
  if (toast.variant === 'error') return 'text-red'
  if (toast.variant === 'warning') return 'text-[color:#e8a838]'
  return 'text-ink'
}

function defaultTitle(toast: ToastItem) {
  if (toast.title) return toast.title
  if (toast.variant === 'success') return t('toast.success')
  if (toast.variant === 'error') return t('toast.error')
  if (toast.variant === 'warning') return t('toast.warning')
  return t('toast.info')
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[90]" aria-live="polite" aria-relevant="additions">
    <div
      v-for="pos in TOAST_POSITIONS"
      :key="pos"
      class="app-toast-anchor pointer-events-none absolute flex max-h-[min(70vh,32rem)] w-[min(100vw-1.5rem,20rem)] overflow-hidden"
      :class="[anchorClass[pos], stackDir[pos]]"
    >
      <TransitionGroup name="ui-app-toast" tag="div" class="pointer-events-none flex gap-2" :class="stackDir[pos]">
        <div v-for="toast in byPosition[pos]" :key="toast.id" :class="chipClass(toast)" role="status">
          <div class="min-w-0 flex-1">
            <p class="m-0 text-[0.75rem] font-medium" :class="titleClass(toast)">{{ defaultTitle(toast) }}</p>
            <p class="m-0 mt-0.5 text-[0.69rem] leading-snug text-muted break-words">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-muted hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_16%,transparent)] hover:text-ink"
            :aria-label="t('common.close')"
            @click="store.dismiss(toast.id)"
          >
            <XIcon class="size-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.app-toast-anchor--top-left {
  top: max(0.75rem, var(--safe-top));
  left: max(0.75rem, var(--safe-left));
}
.app-toast-anchor--top-center {
  top: max(0.75rem, var(--safe-top));
  left: 50%;
  transform: translateX(-50%);
}
.app-toast-anchor--top-right {
  top: max(0.75rem, var(--safe-top));
  right: max(0.75rem, var(--safe-right));
}
.app-toast-anchor--middle-left {
  top: 50%;
  left: max(0.75rem, var(--safe-left));
  transform: translateY(-50%);
}
.app-toast-anchor--middle-right {
  top: 50%;
  right: max(0.75rem, var(--safe-right));
  transform: translateY(-50%);
}
.app-toast-anchor--bottom-left {
  bottom: max(0.75rem, var(--safe-bottom));
  left: max(0.75rem, var(--safe-left));
}
.app-toast-anchor--bottom-center {
  bottom: max(0.75rem, var(--safe-bottom));
  left: 50%;
  transform: translateX(-50%);
}
.app-toast-anchor--bottom-right {
  bottom: max(0.75rem, var(--safe-bottom));
  right: max(0.75rem, var(--safe-right));
}

.ui-app-toast-enter-active,
.ui-app-toast-leave-active {
  transition: opacity 0.2s ease,
    transform 0.2s ease;
}
.ui-app-toast-enter-from,
.ui-app-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.37rem);
}
.ui-app-toast-leave-active {
  position: absolute;
}
</style>
