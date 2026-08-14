/**
 * 当前 WebView 对应的 Tauri 窗口操作（最小化 / 最大化 / 拖动 / 尺寸）。
 * 非桌面环境一律 no-op 或返回安全默认值，便于业务层无分支调用。
 */

import { LogicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow, type Window } from '@tauri-apps/api/window'
import { isTauri } from '../runtime'

/** 与 Rust 侧 label 约定一致 */
export const WINDOW_LABEL = {
  main: 'main',
  settings: 'settings',
} as const

export type AppWindowLabel = (typeof WINDOW_LABEL)[keyof typeof WINDOW_LABEL]

/** 当前 WebView 窗口；浏览器环境为 null */
export function getAppWindow(): Window | null {
  if (!isTauri()) return null
  return getCurrentWindow()
}

export function getAppWindowLabel(): string {
  return getAppWindow()?.label ?? 'web'
}

export function isMainWindow(): boolean {
  return getAppWindowLabel() === WINDOW_LABEL.main
}

export function isSettingsWindow(): boolean {
  return getAppWindowLabel() === WINDOW_LABEL.settings
}

export async function minimizeAppWindow() {
  const win = getAppWindow()
  if (!win) return
  await win.minimize()
}

export async function toggleMaximizeAppWindow() {
  const win = getAppWindow()
  if (!win) return
  await win.toggleMaximize()
}

export async function closeAppWindow() {
  const win = getAppWindow()
  if (!win) return
  await win.close()
}

export async function isAppWindowMaximized(): Promise<boolean> {
  const win = getAppWindow()
  if (!win) return false
  return win.isMaximized()
}

/** 由拖窗阈值逻辑调用；勿在 pointerdown 瞬间调用以免吞双击 */
export async function startDraggingAppWindow() {
  const win = getAppWindow()
  if (!win) return
  await win.startDragging()
}

export async function onAppWindowResized(handler: () => void): Promise<(() => void) | undefined> {
  const win = getAppWindow()
  if (!win) return undefined
  return win.onResized(() => handler())
}

export async function setAppWindowLogicalSize(width: number, height: number) {
  const win = getAppWindow()
  if (!win) return
  await win.setSize(new LogicalSize(width, height))
}

export async function setAppWindowMinLogicalSize(width: number, height: number) {
  const win = getAppWindow()
  if (!win) return
  await win.setMinSize(new LogicalSize(width, height))
}

export async function centerAppWindow() {
  const win = getAppWindow()
  if (!win) return
  await win.center()
}

/** 已最大化时先还原，便于随后改逻辑尺寸（登录/工作区切换） */
export async function unmaximizeAppWindow() {
  const win = getAppWindow()
  if (!win) return
  if (await win.isMaximized()) {
    await win.unmaximize()
  }
}
