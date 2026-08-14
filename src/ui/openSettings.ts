/**
 * 打开设置：桌面独立窗；Web/Android 用主界面弹窗。
 * 桌面 window API 动态导入，避免 Web 首屏带上 @tauri-apps。
 */

import { preferSettingsWindow } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settings'

export async function openAppSettings() {
  if (preferSettingsWindow()) {
    const { openSettingsWindow } = await import('@/lib/window/shell')
    await openSettingsWindow()
    return
  }
  // 写状态而非调 action，避免 HMR 后旧 store 实例缺方法
  useSettingsStore().settingsOpen = true
}
