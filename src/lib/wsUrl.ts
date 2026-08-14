/**
 * WebSocket 基址：与 HTTP 同主机；端口来自 health.websocket（0 / 缺省 / sameAsHttp → 与 HTTP 同端口）。
 */
import { resolveBaseUrl, type ConnectionConfig } from '@/lib/runtime'
import type { WebsocketInfo } from '@/types'

/**
 * 由 HTTP API base 推导 WS URL。
 */
export function resolveWsUrl(ws?: WebsocketInfo | null, desktop?: ConnectionConfig): string {
  const httpBase = resolveBaseUrl(desktop)
  let host = '127.0.0.1'
  let proto = 'ws'
  let httpPort = 8765
  try {
    const u = new URL(httpBase || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8765'))
    host = u.hostname
    proto = u.protocol === 'https:' ? 'wss' : 'ws'
    if (u.port) httpPort = Number(u.port)
    else httpPort = u.protocol === 'https:' ? 443 : 80
  } catch {
    // keep defaults
  }
  const configured = ws?.port
  const sameAsHttp = ws?.sameAsHttp === true || configured == null || configured <= 0
  const port = sameAsHttp ? httpPort : configured
  return `${proto}://${host}:${port}`
}
