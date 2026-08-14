/**
 * 桌面主窗在「登录窄窗」与「终端工作区」间切换逻辑尺寸。
 * 先 unmaximize 再 setSize，否则最大化状态下改尺寸无效或错位。
 */

import { isTauri } from '../runtime'
import { centerAppWindow, setAppWindowLogicalSize, setAppWindowMinLogicalSize, unmaximizeAppWindow } from './current'

/** 未登录：贴合 ConnectionPanel */
export const DESKTOP_LOGIN_SIZE = { width: 460, height: 640 } as const

/** 已登录：终端工作区 */
export const DESKTOP_TERMINAL_SIZE = { width: 1280, height: 800 } as const

export async function applyDesktopWindowMode(mode: 'login' | 'terminal') {
  if (!isTauri()) return
  const size = mode === 'login' ? DESKTOP_LOGIN_SIZE : DESKTOP_TERMINAL_SIZE
  try {
    await unmaximizeAppWindow()
    await setAppWindowMinLogicalSize(mode === 'login' ? 420 : 900, mode === 'login' ? 560 : 600)
    await setAppWindowLogicalSize(size.width, size.height)
    await centerAppWindow()
  } catch {
    /* webview 尚未就绪等瞬态错误可忽略 */
  }
}
