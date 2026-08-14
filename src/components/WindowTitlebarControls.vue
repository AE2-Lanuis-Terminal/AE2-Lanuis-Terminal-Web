<!--
  自定义标题栏：最小化 / 最大化 / 关闭。
  设置窗关闭直接关；主窗关闭遵循 closeBehavior（ask → 确认框）。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { canUseWindowChrome } from '@/lib/runtime'
import { useSettingsStore } from '@/stores/settings'
import {
  closeAppWindow,
  exitApp,
  getAppWindowLabel,
  hideMainWindow,
  isAppWindowMaximized,
  isSettingsWindow,
  minimizeAppWindow,
  onAppWindowResized,
  toggleMaximizeAppWindow,
  WINDOW_LABEL,
} from '@/lib/window'

const { t } = useI18n()
const settings = useSettingsStore()

const isDesktop = computed(() => canUseWindowChrome())
const isMaximized = ref(false)
const windowLabel = ref<string>(WINDOW_LABEL.main)

let unlistenResize: (() => void) | undefined

async function syncMaximized() {
  if (!isDesktop.value) return
  try {
    isMaximized.value = await isAppWindowMaximized()
  } catch {
    /* webview 未就绪等 */
  }
}

function onMinimize() {
  void minimizeAppWindow()
}

function onToggleMaximize() {
  void (async () => {
    await toggleMaximizeAppWindow()
    await syncMaximized()
  })()
}

async function onClose() {
  // 设置窗不受主窗「关到托盘」策略影响
  if (isSettingsWindow() || windowLabel.value === WINDOW_LABEL.settings) {
    await closeAppWindow()
    return
  }
  const behavior = settings.closeBehavior
  if (behavior === 'tray') {
    await hideMainWindow()
    return
  }
  if (behavior === 'exit') {
    await exitApp()
    return
  }
  settings.openCloseConfirm()
}

onMounted(() => {
  if (!isDesktop.value) return
  windowLabel.value = getAppWindowLabel()
  void (async () => {
    await syncMaximized()
    unlistenResize = await onAppWindowResized(() => {
      void syncMaximized()
    })
  })()
})

onUnmounted(() => {
  unlistenResize?.()
})
</script>

<template>
  <div v-if="isDesktop" class="inline-flex shrink-0 items-center" data-tauri-drag-region-exclude>
    <button
      type="button"
      class="inline-flex h-8 w-10 items-center justify-center rounded-sm text-muted transition-[background-color,color,box-shadow] duration-150 hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]"
      :aria-label="t('window.minimize')"
      @click="onMinimize"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path fill="currentColor" d="M1 5.75h10v1.5H1z" />
      </svg>
    </button>
    <button
      type="button"
      class="inline-flex h-8 w-10 items-center justify-center rounded-sm text-muted transition-[background-color,color,box-shadow] duration-150 hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]"
      :aria-label="isMaximized ? t('window.restore') : t('window.maximize')"
      @click="onToggleMaximize"
    >
      <svg v-if="!isMaximized" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="1.25" d="M2.25 2.25h7.5v7.5h-7.5z" />
      </svg>
      <svg v-else width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="1.25" d="M3.5 4.25h5.25v5.25H3.5zM2.25 2.75h5.25V4" />
      </svg>
    </button>
    <button
      type="button"
      class="inline-flex h-8 w-10 items-center justify-center rounded-sm text-muted transition-colors hover:bg-[#e81123] hover:text-white"
      :aria-label="t('window.close')"
      @click="onClose"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path fill="currentColor" d="M2.22 1.47 6 5.25l3.78-3.78 1.06 1.06L7.06 6.3l3.78 3.78-1.06 1.06L6 7.37l-3.78 3.78-1.06-1.06L4.94 6.3 1.16 2.53z" />
      </svg>
    </button>
  </div>
</template>
