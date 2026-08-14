/**
 * 存储实时通道：auth → subscribe storage → storage.snapshot。
 * 推送间隔由服务端配置；客户端只读 hello/auth_ok 中的 pushIntervalMs。
 * 诊断指标写入 realtime store（RTT / 流量 / 重连）。
 */
import { api } from '@/api/client'
import { loadToken } from '@/lib/runtime'
import { resolveWsUrl } from '@/lib/wsUrl'
import { useRealtimeStore } from '@/stores/realtime'
import type { Item, NetworkSummary, WebsocketInfo } from '@/types'

export type StorageSubscribeParams = {
  q?: string
  kind?: string
  filter?: string
  sort?: string
  order?: string
  page?: number
  pageSize?: number
}

export type StorageSnapshotMsg = {
  type: 'storage.snapshot'
  revision: number
  pushIntervalMs?: number
  contentRevision?: number
  page: number
  pageSize: number
  total: number
  items: Item[]
  network: NetworkSummary
}

export type StorageRealtimeHandlers = {
  onSnapshot: (msg: StorageSnapshotMsg) => void
  onStatus?: (text: string) => void
  onError?: (message: string) => void
  onInterval?: (ms: number) => void
}

export type StorageRealtimeSession = {
  subscribe: (params: StorageSubscribeParams) => void
  reconnect: () => void
  close: () => void
}

const PING_INTERVAL_MS = 5000

/**
 * 连接并订阅存储；调用方负责 close。
 */
export async function connectStorageRealtime(handlers: StorageRealtimeHandlers): Promise<StorageRealtimeSession> {
  const rt = useRealtimeStore()

  let wsInfo: WebsocketInfo | null = null
  try {
    const health = await api.health()
    wsInfo = health.websocket ?? null
    if (wsInfo && wsInfo.enabled === false) {
      handlers.onError?.('WebSocket disabled on server')
      rt.status = 'idle'
      return { subscribe: () => {}, reconnect: () => {}, close: () => {} }
    }
    if (wsInfo?.pushIntervalMs) {
      rt.pushIntervalMs = wsInfo.pushIntervalMs
      handlers.onInterval?.(wsInfo.pushIntervalMs)
    }
  } catch {
    // 仍尝试默认端口
  }

  const url = resolveWsUrl(wsInfo)
  const token = loadToken()
  if (!token) {
    handlers.onError?.('Not authenticated')
    return { subscribe: () => {}, reconnect: () => {}, close: () => {} }
  }

  rt.wsUrl = url

  let closed = false
  let suppressingAutoReconnect = false
  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined
  let pingTimer: number | undefined
  let pingSentAt = 0
  let currentSub: StorageSubscribeParams = {
    page: 1,
    pageSize: 96,
    kind: 'all',
    filter: 'all',
    sort: 'name',
    order: 'asc',
    q: '',
  }
  let authed = false

  const clearPing = () => {
    window.clearInterval(pingTimer)
    pingTimer = undefined
    pingSentAt = 0
  }

  const send = (obj: unknown) => {
    if (socket?.readyState !== WebSocket.OPEN) return
    const raw = JSON.stringify(obj)
    socket.send(raw)
    rt.noteSent(new TextEncoder().encode(raw).length)
  }

  const subscribe = (params: StorageSubscribeParams) => {
    currentSub = { ...currentSub, ...params }
    if (!authed) return
    send({
      type: 'subscribe',
      channel: 'storage',
      q: currentSub.q ?? '',
      kind: currentSub.kind ?? 'all',
      filter: currentSub.filter ?? 'all',
      sort: currentSub.sort ?? 'name',
      order: currentSub.order ?? 'asc',
      page: currentSub.page ?? 1,
      pageSize: currentSub.pageSize ?? 96,
    })
  }

  const startPing = () => {
    clearPing()
    pingTimer = window.setInterval(() => {
      if (!authed || socket?.readyState !== WebSocket.OPEN) return
      pingSentAt = performance.now()
      send({ type: 'ping' })
    }, PING_INTERVAL_MS)
  }

  const open = (fromReconnect: boolean) => {
    if (closed) return
    authed = false
    clearPing()
    rt.status = 'connecting'
    handlers.onStatus?.('connecting')
    if (fromReconnect) {
      rt.reconnectCount += 1
    }
    rt.connectCount += 1
    rt.resetSessionCounters()

    socket = new WebSocket(url)
    socket.addEventListener('open', () => {
      rt.status = 'open'
      handlers.onStatus?.('open')
      send({ type: 'auth', token })
    })
    socket.addEventListener('message', (ev) => {
      const raw = String(ev.data)
      rt.noteReceived(new TextEncoder().encode(raw).length)
      let msg: { type?: string; [k: string]: unknown }
      try {
        msg = JSON.parse(raw)
      } catch {
        return
      }
      if (msg.type === 'hello' || msg.type === 'auth_ok') {
        const ms = Number(msg.pushIntervalMs)
        if (Number.isFinite(ms) && ms > 0) {
          rt.pushIntervalMs = ms
          handlers.onInterval?.(ms)
        }
      }
      if (msg.type === 'auth_ok') {
        authed = true
        startPing()
        subscribe(currentSub)
      }
      if (msg.type === 'pong' && pingSentAt > 0) {
        rt.rttMs = Math.max(0, Math.round(performance.now() - pingSentAt))
        pingSentAt = 0
      }
      if (msg.type === 'storage.snapshot') {
        const snap = msg as StorageSnapshotMsg
        if (typeof snap.revision === 'number') rt.revision = snap.revision
        if (snap.network) rt.network = snap.network
        if (snap.pushIntervalMs) rt.pushIntervalMs = snap.pushIntervalMs
        handlers.onSnapshot(snap)
      }
      if (msg.type === 'error') {
        handlers.onError?.(String(msg.message || msg.code || 'ws error'))
      }
    })
    socket.addEventListener('close', () => {
      authed = false
      clearPing()
      rt.status = 'closed'
      handlers.onStatus?.('closed')
      if (!closed && !suppressingAutoReconnect) {
        reconnectTimer = window.setTimeout(() => open(true), 2000)
      }
    })
    socket.addEventListener('error', () => {
      handlers.onError?.('WebSocket connection error')
    })
  }

  const reconnect = () => {
    if (closed) return
    window.clearTimeout(reconnectTimer)
    suppressingAutoReconnect = true
    try {
      socket?.close()
    } finally {
      suppressingAutoReconnect = false
    }
    open(true)
  }

  open(false)
  rt.setReconnectHandler(reconnect)

  return {
    subscribe,
    reconnect,
    close: () => {
      closed = true
      window.clearTimeout(reconnectTimer)
      clearPing()
      rt.setReconnectHandler(null)
      suppressingAutoReconnect = true
      socket?.close()
      socket = null
      rt.status = 'closed'
    },
  }
}
