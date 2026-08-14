<!--
  仅主窗桌面壳：托盘文案、关闭请求、右键守卫、跨窗 settings hydrate。
  Web / 设置窗不挂载业务副作用。
-->
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore, SETTINGS_CHANGED } from '../stores/settings'
import { exitApp, hideMainWindow, installDesktopContextMenuGuard, isMainWindow, onDesktopEvent, syncTrayMenuLabels } from '../lib/window'
import { canUseSystemTray, canUseWindowChrome, isDesktopChrome } from '../lib/runtime'
import CloseConfirmDialog from './CloseConfirmDialog.vue'

const desktop = isDesktopChrome()
const { t, locale } = useI18n()
const settings = useSettingsStore()

const unlisteners: Array<() => void> = []
const mainWindow = desktop && isMainWindow() && canUseWindowChrome()

async function handleCloseRequest() {
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

async function syncTrayLabels() {
  await syncTrayMenuLabels({
    show: t('tray.show'),
    settings: t('tray.settings'),
    exit: t('tray.exit'),
    tooltip: t('common.brand') + ' · ' + t('common.product'),
  })
}

onMounted(() => {
  if (!desktop) return

  // 拦截系统右键；业务菜单经 onDesktopContextMenu 按需注册
  unlisteners.push(installDesktopContextMenuGuard())

  void onDesktopEvent(SETTINGS_CHANGED, () => {
    settings.hydrate()
  }).then((u) => u && unlisteners.push(u))

  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('ae2lanuis.') || e.key === 'ae2lanuis.locale') {
      settings.hydrate()
    }
  }
  window.addEventListener('storage', onStorage)
  unlisteners.push(() => window.removeEventListener('storage', onStorage))

  if (!mainWindow) return

  if (canUseSystemTray()) {
    void syncTrayLabels()
  }

  void onDesktopEvent('window-close-requested', () => {
    void handleCloseRequest()
  }).then((u) => u && unlisteners.push(u))

  void onDesktopEvent('tray-request-exit', () => {
    if (settings.closeBehavior === 'ask') {
      settings.openCloseConfirm()
    } else {
      void exitApp()
    }
  }).then((u) => u && unlisteners.push(u))
})

watch(locale, () => {
  if (mainWindow && canUseSystemTray()) void syncTrayLabels()
})

onUnmounted(() => {
  for (const u of unlisteners) u()
})
</script>

<template>
  <CloseConfirmDialog v-if="mainWindow" />
</template>
