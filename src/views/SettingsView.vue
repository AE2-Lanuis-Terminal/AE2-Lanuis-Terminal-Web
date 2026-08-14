<!--
  桌面独立设置窗：全页 SettingsForm。
  Web 访问 /settings 时改弹窗并回到终端。
-->
<script setup lang="ts">
import { onMounted, onUnmounted, type ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import MeControllerLogo from '../components/MeControllerLogo.vue'
import RainbowTitle from '../components/RainbowTitle.vue'
import SettingsForm from '../components/SettingsForm.vue'
import WindowTitlebarControls from '../components/WindowTitlebarControls.vue'
import { bindTauriWindowDragRegion } from '../composables/bindTauriWindowDragRegion'
import { preferSettingsWindow } from '../lib/platform'
import { toggleMaximizeAppWindow } from '../lib/window'
import { canUseWindowChrome } from '../lib/runtime'
import { useSettingsStore } from '../stores/settings'

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const chrome = canUseWindowChrome()

let detachTitleBarPointerDrag: (() => void) | undefined

function resolveHostElement(el: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (el == null) return null
  if (el instanceof HTMLElement) return el
  const node = (el as ComponentPublicInstance).$el
  return node instanceof HTMLElement ? node : null
}

function setTitleBarRef(el: Element | ComponentPublicInstance | null) {
  detachTitleBarPointerDrag?.()
  detachTitleBarPointerDrag = undefined
  const host = resolveHostElement(el)
  if (!host || !chrome) return
  detachTitleBarPointerDrag = bindTauriWindowDragRegion(host)
}

async function onTitleBarDblclick(e: MouseEvent) {
  if (!chrome) return
  const target = e.target
  if (target instanceof Element && target.closest('[data-tauri-drag-region-exclude]')) return
  await toggleMaximizeAppWindow()
}

onMounted(() => {
  settings.hydrate()
  // Web：旧书签 /settings → 弹窗，不占整页
  if (!preferSettingsWindow()) {
    settings.settingsOpen = true
    void router.replace({ name: 'terminal' })
  }
})

onUnmounted(() => {
  detachTitleBarPointerDrag?.()
})
</script>

<template>
  <div v-if="preferSettingsWindow()" class="me-surface flex h-dvh min-h-0 flex-col text-ink">
    <header :ref="setTitleBarRef" class="ui-glass-bar flex h-12 shrink-0 select-none items-center gap-2 border-b py-1 pl-3 pr-1.5" @dblclick="onTitleBarDblclick">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <MeControllerLogo size="sm" :pulse="false" />
        <RainbowTitle class="min-w-0" :text="t('settings.title')" />
      </div>
      <div class="flex h-8 shrink-0 items-center" data-tauri-drag-region-exclude>
        <WindowTitlebarControls />
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-auto px-4 py-4" data-tauri-drag-region-exclude>
      <SettingsForm />
    </main>
  </div>
</template>
