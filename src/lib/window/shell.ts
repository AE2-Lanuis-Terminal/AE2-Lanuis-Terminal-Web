/**
 * 托盘、主窗显隐、设置窗与桌面事件桥接（invoke / listen）。
 * 非 Tauri 环境全部 no-op，便于与 Web 共用调用点。
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { isTauri } from '../runtime'

export async function showMainWindow() {
  if (!isTauri()) return
  await invoke('show_main_window_cmd')
}

export async function hideMainWindow() {
  if (!isTauri()) return
  await invoke('hide_main_window_cmd')
}

/** 真正退出进程（非关到托盘） */
export async function exitApp() {
  if (!isTauri()) return
  await invoke('exit_app')
}

/** Windows 上须走 async 命令，避免 WebView2 同步建窗死锁 */
export async function openSettingsWindow() {
  if (!isTauri()) return
  await invoke('open_settings_window')
}

export async function closeSettingsWindow() {
  if (!isTauri()) return
  await invoke('close_settings_window')
}

/** 托盘菜单文案随 i18n 变更同步到 Rust */
export async function syncTrayMenuLabels(payload: { show: string; settings: string; exit: string; tooltip: string }) {
  if (!isTauri()) return
  await invoke('sync_tray_menu_labels', { payload })
}

export type DesktopShellEvent = 'window-close-requested' | 'tray-request-exit' | 'settings-changed'

export async function onDesktopEvent(event: DesktopShellEvent, handler: () => void): Promise<UnlistenFn | undefined> {
  if (!isTauri()) return undefined
  return listen(event, () => handler())
}
