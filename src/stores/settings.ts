/**
 * 主题、字体、动画、关闭行为、语言的单一数据源。
 * 写入 localStorage，并同步 documentElement dataset 驱动 CSS。
 * 桌面端 emit settings-changed，供设置窗与主窗互相同步。
 * 关闭行为 ask/tray/exit 仅桌面托盘场景有意义。
 */

import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { applyResolvedLocale, readLocalePreference, type LocalePreference } from '../i18n'
import { ensureFontLoaded, type FontPreset } from '../lib/fonts'
import { isTauri } from '../lib/runtime'

export type ColorScheme = 'dark' | 'light' | 'system'
export type { FontPreset, LocalePreference }
/** 关闭按钮：询问 / 最小化到托盘 / 直接退出 */
export type CloseBehavior = 'ask' | 'tray' | 'exit'

const KEYS = {
  scheme: 'ae2lanuis.colorScheme',
  font: 'ae2lanuis.fontPreset',
  locale: 'ae2lanuis.locale',
  closeBehavior: 'ae2lanuis.closeBehavior',
  animations: 'ae2lanuis.animations',
} as const

const SETTINGS_CHANGED = 'settings-changed'

function readScheme(): ColorScheme {
  const v = localStorage.getItem(KEYS.scheme)
  if (v === 'dark' || v === 'light' || v === 'system') return v
  return 'dark'
}

function readFont(): FontPreset {
  const v = localStorage.getItem(KEYS.font)
  if (v === 'fusion-pixel' || v === 'dm-sans' || v === 'jetbrains-mono' || v === 'system') return v
  return 'system'
}

function readCloseBehavior(): CloseBehavior {
  const v = localStorage.getItem(KEYS.closeBehavior)
  if (v === 'ask' || v === 'tray' || v === 'exit') return v
  return 'ask'
}

function readAnimationsEnabled(): boolean {
  const v = localStorage.getItem(KEYS.animations)
  if (v === '0' || v === 'off' || v === 'false') return false
  return true
}

function resolveDark(scheme: ColorScheme): boolean {
  if (scheme === 'dark') return true
  if (scheme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(scheme: ColorScheme) {
  const dark = resolveDark(scheme)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.classList.toggle('light', !dark)
}

function applyFont(preset: FontPreset) {
  document.documentElement.dataset.appFont = preset
}

function applyAnimations(enabled: boolean) {
  document.documentElement.dataset.motion = enabled ? 'on' : 'off'
}

async function broadcastSettingsChanged() {
  if (!isTauri()) return
  try {
    const { emit } = await import('@tauri-apps/api/event')
    await emit(SETTINGS_CHANGED, {})
  } catch {
    /* ignore */
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const colorScheme = ref<ColorScheme>(readScheme())
  const fontPreset = ref<FontPreset>(readFont())
  const closeBehavior = ref<CloseBehavior>(readCloseBehavior())
  const animationsEnabled = ref(readAnimationsEnabled())
  /** 语言偏好（含跟随系统）；实际文案语言由 i18n resolve */
  const locale = ref<LocalePreference>(readLocalePreference())
  const closeConfirmOpen = ref(false)
  /** Web/Android 设置弹窗；桌面仍走独立窗 */
  const settingsOpen = ref(false)

  /** 从 localStorage 重读并套用 DOM；供跨窗 settings-changed / 启动时调用 */
  function hydrate() {
    colorScheme.value = readScheme()
    fontPreset.value = readFont()
    closeBehavior.value = readCloseBehavior()
    animationsEnabled.value = readAnimationsEnabled()
    locale.value = readLocalePreference()
    applyTheme(colorScheme.value)
    applyFont(fontPreset.value)
    void ensureFontLoaded(fontPreset.value)
    applyAnimations(animationsEnabled.value)
    applyResolvedLocale(locale.value)
  }

  function setColorScheme(scheme: ColorScheme) {
    colorScheme.value = scheme
    localStorage.setItem(KEYS.scheme, scheme)
    applyTheme(scheme)
    void broadcastSettingsChanged()
  }

  function setFontPreset(preset: FontPreset) {
    fontPreset.value = preset
    localStorage.setItem(KEYS.font, preset)
    applyFont(preset)
    void ensureFontLoaded(preset)
    void broadcastSettingsChanged()
  }

  function setCloseBehavior(behavior: CloseBehavior) {
    closeBehavior.value = behavior
    localStorage.setItem(KEYS.closeBehavior, behavior)
    void broadcastSettingsChanged()
  }

  function setAnimationsEnabled(enabled: boolean) {
    animationsEnabled.value = enabled
    localStorage.setItem(KEYS.animations, enabled ? '1' : '0')
    applyAnimations(enabled)
    void broadcastSettingsChanged()
  }

  function setUiLocale(next: LocalePreference) {
    locale.value = next
    localStorage.setItem(KEYS.locale, next)
    applyResolvedLocale(next)
    void broadcastSettingsChanged()
  }

  function openCloseConfirm() {
    closeConfirmOpen.value = true
  }

  function closeCloseConfirm() {
    closeConfirmOpen.value = false
  }

  function openSettings() {
    settingsOpen.value = true
  }

  function closeSettings() {
    settingsOpen.value = false
  }

  watch(colorScheme, (scheme) => applyTheme(scheme))

  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      if (colorScheme.value === 'system') applyTheme('system')
    })
    window.addEventListener('languagechange', () => {
      if (locale.value === 'system') applyResolvedLocale('system')
    })
  }

  return {
    colorScheme,
    fontPreset,
    closeBehavior,
    animationsEnabled,
    locale,
    closeConfirmOpen,
    settingsOpen,
    hydrate,
    setColorScheme,
    setFontPreset,
    setCloseBehavior,
    setAnimationsEnabled,
    setUiLocale,
    openCloseConfirm,
    closeCloseConfirm,
    openSettings,
    closeSettings,
  }
})

export { SETTINGS_CHANGED }

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
