/**
 * 兼容再导出：托盘 / 主窗 / 设置窗命令，实现见 `./window/shell`。
 */

export { showMainWindow, hideMainWindow, exitApp, openSettingsWindow, closeSettingsWindow, syncTrayMenuLabels, onDesktopEvent } from './window/shell'
export type { DesktopShellEvent } from './window/shell'
