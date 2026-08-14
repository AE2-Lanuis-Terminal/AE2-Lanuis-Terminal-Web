/**
 * 桌面窗口通用 API
 * - current：当前 WebView 窗口操作（最小化/最大化/关闭/拖拽等）
 * - shell：托盘、退出、设置窗等跨窗口命令
 * - layout：登录/终端尺寸模式
 */

export * from './current'
export * from './shell'
export * from './layout'
export {
  clearDesktopContextMenuHandlers,
  installDesktopContextMenuGuard,
  onDesktopContextMenu,
  setDesktopContextMenuHandler,
  uninstallDesktopContextMenuGuard,
  type DesktopContextMenuHandler,
  type DesktopContextMenuPayload,
} from '../contextMenu'
