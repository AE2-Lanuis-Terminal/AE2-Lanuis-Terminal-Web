/**
 * 桌面右键菜单代理：拦截系统菜单并分发给业务 handler。
 */

import { canUseWindowChrome } from './platform'

export type DesktopContextMenuPayload = {
  x: number
  y: number
  target: EventTarget | null
  originalEvent: MouseEvent
}

export type DesktopContextMenuHandler = (payload: DesktopContextMenuPayload) => void | boolean | Promise<void | boolean>

type Listener = {
  id: number
  handler: DesktopContextMenuHandler
}

let seq = 0
const listeners: Listener[] = []
let installed = false

function onContextMenu(e: MouseEvent) {
  // 桌面端完全代理：一律拦截系统/浏览器菜单
  e.preventDefault()
  e.stopPropagation()

  const payload: DesktopContextMenuPayload = {
    x: e.clientX,
    y: e.clientY,
    target: e.target,
    originalEvent: e,
  }

  // 后注册优先（便于局部覆盖）
  for (let i = listeners.length - 1; i >= 0; i -= 1) {
    const result = listeners[i]?.handler(payload)
    if (result === false) break
  }
}

/** 安装全局右键拦截（仅桌面 chrome）。幂等。 */
export function installDesktopContextMenuGuard(): () => void {
  if (!canUseWindowChrome()) return () => {}
  if (installed) return () => uninstallDesktopContextMenuGuard()
  window.addEventListener('contextmenu', onContextMenu, true)
  installed = true
  return () => uninstallDesktopContextMenuGuard()
}

export function uninstallDesktopContextMenuGuard() {
  if (!installed) return
  window.removeEventListener('contextmenu', onContextMenu, true)
  installed = false
}

/**
 * 按需注册右键处理。返回取消函数。
 * handler 返回 `false` 可阻止后续更早注册的监听器继续执行。
 */
export function onDesktopContextMenu(handler: DesktopContextMenuHandler): () => void {
  const id = ++seq
  listeners.push({ id, handler })
  return () => {
    const idx = listeners.findIndex((l) => l.id === id)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

/** 临时替换为唯一处理器（用于局部页面）。 */
export function setDesktopContextMenuHandler(handler: DesktopContextMenuHandler | null): () => void {
  listeners.length = 0
  if (!handler) return () => {}
  return onDesktopContextMenu(handler)
}

export function clearDesktopContextMenuHandlers() {
  listeners.length = 0
}
