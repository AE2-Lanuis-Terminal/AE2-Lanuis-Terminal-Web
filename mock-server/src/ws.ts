/**
 * Mock WebSocket：协议对齐主仓 docs/websocket.md（默认 8766）。
 */
import { WebSocketServer, type WebSocket } from 'ws'
import { mockItems } from './data.ts'
import { findSessionByToken, listMockJobs } from './handlers.ts'
import { matchesKindFilter, modIdOf, resolveItemKind } from './itemKind.ts'
import { pinCraftingToFront } from './pinCrafting.ts'
import type { Item } from './types.ts'

const PUSH_INTERVAL_MS = 500

type SubParams = {
  page: number
  pageSize: number
  kind: string
  filter: string
  sort: string
  order: string
  q: string
}

type ClientState = {
  authed: boolean
  account?: string
  sub?: SubParams
  working: Item[]
  revision: number
  timer?: ReturnType<typeof setInterval>
}

function filterSort(list: Item[], params: SubParams): Item[] {
  const needle = (params.q || '').trim().toLowerCase()
  const kind = params.kind || 'all'
  const filter = params.filter || 'all'
  const sort = params.sort || 'name'
  const order = params.order || 'asc'
  const desc = order === 'desc'
  let out = list.filter((it) => {
    if (!matchesKindFilter(resolveItemKind(it), kind)) return false
    if (filter === 'stocked' && !(BigInt(it.amount || '0') > 0n)) return false
    if (filter === 'craftable' && !it.craftable) return false
    if (!needle) return true
    return it.displayName.toLowerCase().includes(needle) || it.id.toLowerCase().includes(needle)
  })
  if (sort === 'amount') {
    out = [...out].sort((a, b) => {
      const d = BigInt(a.amount || '0') - BigInt(b.amount || '0')
      const c = d > 0n ? 1 : d < 0n ? -1 : 0
      return desc ? -c : c
    })
  } else if (sort === 'mod') {
    out = [...out].sort((a, b) => {
      const c = modIdOf(a.id).toLowerCase().localeCompare(modIdOf(b.id).toLowerCase())
      if (c !== 0) return desc ? -c : c
      const n = a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
      return desc ? -n : n
    })
  } else {
    out = [...out].sort((a, b) => {
      const c = a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
      return desc ? -c : c
    })
  }
  return out
}

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function pushSnapshot(ws: WebSocket, state: ClientState) {
  if (!state.authed || !state.sub) return
  for (const it of state.working) {
    if (!it.craftable && BigInt(it.amount || '0') > 10n) {
      const n = BigInt(it.amount)
      const delta = BigInt(Math.floor(Math.random() * 5) - 2 || 1)
      const next = n + delta
      it.amount = (next > 0n ? next : 1n).toString()
    }
  }
  const filtered = pinCraftingToFront(filterSort(state.working, state.sub), state.working, listMockJobs())
  const page = Math.max(1, state.sub.page || 1)
  const pageSize = Math.min(Math.max(1, state.sub.pageSize || 96), 256)
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)
  const busyCpuCount = listMockJobs().filter((j) => j.busy).length
  state.revision += 1
  send(ws, {
    type: 'storage.snapshot',
    revision: state.revision,
    pushIntervalMs: PUSH_INTERVAL_MS,
    page,
    pageSize,
    total: filtered.length,
    items,
    network: {
      online: true,
      itemTypes: state.working.length,
      cpuCount: listMockJobs().length,
      busyCpuCount,
    },
  })
}

export function startMockWs(opts: { port: number } | { server: import('node:http').Server }) {
  const wss = 'server' in opts ? new WebSocketServer({ server: opts.server }) : new WebSocketServer({ port: opts.port, host: '0.0.0.0' })

  wss.on('connection', (ws) => {
    const state: ClientState = {
      authed: false,
      working: mockItems.map((i) => ({ ...i })),
      revision: 0,
    }

    send(ws, {
      type: 'hello',
      service: 'ae2lanuis',
      pushIntervalMs: PUSH_INTERVAL_MS,
    })

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>
      } catch {
        send(ws, { type: 'error', code: 'bad_json', message: 'Invalid JSON' })
        return
      }
      const type = String(msg.type || '')

      if (type === 'auth') {
        const token = String(msg.token || '')
        const session = findSessionByToken(token)
        if (!session) {
          send(ws, { type: 'error', code: 'unauthorized', message: 'Invalid token' })
          return
        }
        state.authed = true
        state.account = session.account
        send(ws, {
          type: 'auth_ok',
          account: session.account,
          pushIntervalMs: PUSH_INTERVAL_MS,
        })
        return
      }

      if (type === 'ping') {
        send(ws, { type: 'pong' })
        return
      }

      if (!state.authed) {
        send(ws, { type: 'error', code: 'unauthorized', message: 'Auth required' })
        return
      }

      if (type === 'subscribe') {
        if (msg.channel && msg.channel !== 'storage') {
          send(ws, { type: 'error', code: 'bad_channel', message: 'Only storage channel' })
          return
        }
        state.sub = {
          page: Number(msg.page || 1) || 1,
          pageSize: Number(msg.pageSize || 96) || 96,
          kind: String(msg.kind || 'all'),
          filter: String(msg.filter || 'all'),
          sort: String(msg.sort || 'name'),
          order: String(msg.order || 'asc'),
          q: String(msg.q || ''),
        }
        if (state.timer) clearInterval(state.timer)
        pushSnapshot(ws, state)
        state.timer = setInterval(() => pushSnapshot(ws, state), PUSH_INTERVAL_MS)
        return
      }

      if (type === 'unsubscribe') {
        if (state.timer) clearInterval(state.timer)
        state.timer = undefined
        state.sub = undefined
        send(ws, { type: 'ok' })
        return
      }

      send(ws, { type: 'error', code: 'unknown_type', message: `Unknown type ${type}` })
    })

    ws.on('close', () => {
      if (state.timer) clearInterval(state.timer)
    })
  })

  return wss
}
