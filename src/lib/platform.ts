/**
 * 运行时平台检测：Web / Tauri 桌面 / 未来 Tauri Android。
 * 勿依赖构建期 `TAURI_*` 环境变量（Web build 不会注入）。
 */

export type AppPlatform = 'web' | 'desktop' | 'android'

function hasTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function readTauriOs(): string | undefined {
  try {
    // Tauri 2 可能注入；不可用时回退 UA
    const env = (window as unknown as { __TAURI_OS_PLUGIN_INTERNALS__?: { os?: string } }).__TAURI_OS_PLUGIN_INTERNALS__
    return env?.os
  } catch {
    return undefined
  }
}

/** 粗粒度平台：web | desktop | android */
export function getPlatform(): AppPlatform {
  if (!hasTauri()) return 'web'
  const os = (readTauriOs() || '').toLowerCase()
  if (os.includes('android')) return 'android'
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** 任意 Tauri WebView（桌面或移动） */
export function isTauri(): boolean {
  return hasTauri()
}

/** Windows/macOS/Linux 桌面壳：自定义标题栏、托盘、多窗口 */
export function isDesktopChrome(): boolean {
  return getPlatform() === 'desktop'
}

/** 未来 Android（及同类移动壳）：无系统级多窗/托盘 */
export function isMobileShell(): boolean {
  return getPlatform() === 'android'
}

/** 浏览器 Web 端 */
export function isWeb(): boolean {
  return getPlatform() === 'web'
}

/** 可拖窗 / 最小化最大化 / 独立设置窗 */
export function canUseWindowChrome(): boolean {
  return isDesktopChrome()
}

/** 系统托盘与关闭到托盘 */
export function canUseSystemTray(): boolean {
  return isDesktopChrome()
}

/** 设置：桌面开独立窗；Web/Android 用弹窗 */
export function preferSettingsWindow(): boolean {
  return isDesktopChrome()
}

/** 触控友好尺寸（Android 或粗指针） */
export function preferTouchTargets(): boolean {
  if (isMobileShell()) return true
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}
