/**
 * Mock `/api/v1` 路由：对齐 OpenAPI（含 admin / act-as / audit）。
 * 登录：任意非空账号密码；账号为 `admin`（不区分大小写）时带 OP。
 */
import { MOCK_VERSION, mockCatalog, mockItems, mockJobs } from './data.ts'
import { listPatternsFlat, listProviderBoards, movePatterns } from './patternBoards.ts'
import { matchesKindFilter, modIdOf, resolveItemKind } from './itemKind.ts'
import { pinCraftingToFront } from './pinCrafting.ts'
import type { AdminBinding, AuditEntry, CraftJob, CraftRecipeTreeNode, Item, Pattern, SessionRecord } from './types.ts'

export class MockHttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'MockHttpError'
    this.status = status
    this.code = code
  }
}

export type MockRequestInput = {
  method: string
  url: string
  data?: unknown
  headers?: Record<string, string>
}

type PlanCache = {
  planId: string
  key: string
  amount: string
  account: string
  expiresAt: number
}

const PLAN_TTL_MS = 60_000
const sessions = new Map<string, SessionRecord>()
const plans = new Map<string, PlanCache>()
let jobsState: CraftJob[] = mockJobs.map((j) => ({ ...j, output: j.output ? { ...j.output } : undefined }))
const auditLog: AuditEntry[] = []

const MOCK_BINDINGS: AdminBinding[] = [
  {
    playerUuid: '11111111-1111-1111-1111-111111111111',
    playerName: 'admin',
    updatedAt: Math.floor(Date.now() / 1000) - 120,
    playerOnline: true,
    hasNetworkLink: true,
    endpoint: {
      terminalItemId: 'ae2:wireless_terminal',
      dimension: 'minecraft:overworld',
      playerPos: '120, 64, -45',
    },
    networkAvailable: true,
    networkOnline: true,
    itemTypes: mockItems.length,
    cpuCount: mockJobs.length,
    busyCpuCount: mockJobs.filter((j) => j.busy).length,
  },
  {
    playerUuid: '22222222-2222-2222-2222-222222222222',
    playerName: 'Steve',
    updatedAt: Math.floor(Date.now() / 1000) - 3600,
    playerOnline: true,
    hasNetworkLink: true,
    endpoint: {
      terminalItemId: 'ae2:wireless_terminal',
      dimension: 'minecraft:overworld',
      playerPos: '8, 70, 12',
    },
    networkAvailable: true,
    networkOnline: true,
    itemTypes: Math.max(12, Math.floor(mockItems.length / 2)),
    cpuCount: 2,
    busyCpuCount: 1,
  },
  {
    playerUuid: '33333333-3333-3333-3333-333333333333',
    playerName: 'Alex',
    updatedAt: Math.floor(Date.now() / 1000) - 86400,
    playerOnline: false,
    hasNetworkLink: true,
    endpoint: {
      terminalItemId: 'ae2:wireless_terminal',
      dimension: 'minecraft:the_nether',
      playerPos: '0, 80, 0',
    },
    networkAvailable: false,
    networkOnline: false,
    itemTypes: -1,
    cpuCount: 0,
    busyCpuCount: 0,
  },
]

function uuidForAccount(account: string): string {
  const lower = account.toLowerCase()
  const hit = MOCK_BINDINGS.find((b) => b.playerName.toLowerCase() === lower)
  if (hit) return hit.playerUuid
  return `00000000-0000-4000-8000-${Buffer.from(account).toString('hex').padEnd(12, '0').slice(0, 12)}`
}

function isAdminAccount(account: string): boolean {
  return account.trim().toLowerCase() === 'admin'
}

function pushAudit(entry: Omit<AuditEntry, 'ts'> & { ts?: number }) {
  auditLog.unshift({ ts: entry.ts ?? Date.now(), ...entry })
  if (auditLog.length > 500) auditLog.length = 500
}

function clearJobProgress(job: CraftJob) {
  job.busy = false
  job.status = 'idle'
  delete job.detail
  delete job.output
  delete job.progress
  delete job.totalItems
  delete job.progressPercent
  delete job.crafted
  delete job.requested
  delete job.elapsedNanos
}

function tickMockJobsProgress() {
  for (const job of jobsState) {
    if (!job.busy) continue
    const total = BigInt(job.totalItems || job.requested || '64')
    let progress = BigInt(job.progress || job.crafted || '0')
    const step = total / 12n + 1n
    progress += step
    if (progress >= total) {
      clearJobProgress(job)
      continue
    }
    job.progress = progress.toString()
    job.totalItems = total.toString()
    job.progressPercent = Number((progress * 1000n) / total) / 10
    job.crafted = progress.toString()
    job.requested = total.toString()
  }
}

function parsePath(url: string): { pathname: string; search: URLSearchParams } {
  const q = url.includes('?') ? url.slice(url.indexOf('?')) : ''
  const pathname = (url.split('?')[0] || '').replace(/\/$/, '') || '/'
  return { pathname, search: new URLSearchParams(q.startsWith('?') ? q.slice(1) : q) }
}

function readBearer(headers?: Record<string, string>): string {
  if (!headers) return ''
  const raw = headers.Authorization || headers.authorization || Object.entries(headers).find(([k]) => k.toLowerCase() === 'authorization')?.[1] || ''
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim())
  return m?.[1]?.trim() || ''
}

function requireSession(headers?: Record<string, string>): SessionRecord {
  const token = readBearer(headers)
  const s = token ? sessions.get(token) : undefined
  if (!s) throw new MockHttpError(401, 'unauthorized', 'Not authenticated (mock)')
  return s
}

function requireAdmin(headers?: Record<string, string>): SessionRecord {
  const s = requireSession(headers)
  if (!s.admin) throw new MockHttpError(403, 'forbidden', 'Admin required (mock)')
  return s
}

function sessionPayload(s: SessionRecord) {
  return {
    authenticated: true,
    account: s.account,
    admin: s.admin,
    ...(s.actingAs ? { actingAs: s.actingAs } : {}),
  }
}

function paginate<T>(list: T[], page: number, pageSize: number) {
  const p = Math.max(1, page)
  const size = Math.min(Math.max(1, pageSize), 256)
  const start = (p - 1) * size
  return {
    page: p,
    pageSize: size,
    total: list.length,
    items: list.slice(start, start + size),
  }
}

function filterItems(list: Item[], q: string, kind: string, filter: string, sort: string, order: string): Item[] {
  const needle = q.trim().toLowerCase()
  let out = list.filter((it) => {
    if (!matchesKindFilter(resolveItemKind(it), kind)) return false
    if (filter === 'stocked' && !(BigInt(it.amount || '0') > 0n)) return false
    if (filter === 'craftable' && !it.craftable) return false
    if (!needle) return true
    return it.displayName.toLowerCase().includes(needle) || it.id.toLowerCase().includes(needle)
  })
  const desc = order === 'desc'
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

function findItem(key: string): Item | undefined {
  return mockItems.find((i) => i.key === key) || mockCatalog.find((i) => i.key === key)
}

function patternOutputHay(p: Pattern): string {
  return [p.name, p.primaryOutput?.displayName, p.primaryOutput?.id, p.definition?.displayName, p.definition?.id, ...p.outputs.map((o) => `${o.displayName} ${o.id}`)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function patternInputHay(p: Pattern): string {
  return p.inputs
    .flatMap((inp) => [`${inp.item.displayName} ${inp.item.id}`, ...(inp.alternatives || []).map((a) => `${a.displayName} ${a.id}`)])
    .join(' ')
    .toLowerCase()
}

function filterPatterns(list: Pattern[], q: string, qOutput: string, qInput: string, mode: string): Pattern[] {
  const needle = q.trim().toLowerCase()
  const outNeedle = qOutput.trim().toLowerCase()
  const inNeedle = qInput.trim().toLowerCase()
  return list.filter((p) => {
    if (mode && mode !== 'all' && p.mode !== mode) return false
    const outHay = patternOutputHay(p)
    const inHay = patternInputHay(p)
    if (outNeedle && !outHay.includes(outNeedle)) return false
    if (inNeedle && !inHay.includes(inNeedle)) return false
    if (!needle) return true
    return outHay.includes(needle) || inHay.includes(needle) || `${p.id} ${p.mode}`.toLowerCase().includes(needle)
  })
}

function mockPlanTree(output: Item, amount: string, missing: Item[]): CraftRecipeTreeNode {
  const missingKeys = new Set(missing.map((m) => m.key))
  const times = amount
  if (output.id === 'ae2:fluix_crystal') {
    return {
      output: { ...output, amount },
      times,
      mode: 'crafting',
      patternId: 'fp-fluix@pp-overworld-main',
      missing: false,
      inputs: [
        {
          item: {
            key: 'item:ae2:certus_quartz_crystal',
            id: 'ae2:certus_quartz_crystal',
            displayName: 'Certus Quartz Crystal',
            amount: times,
            craftable: true,
            iconUrl: '/api/v1/icons/item/ae2/certus_quartz_crystal',
          },
          missing: false,
          child: {
            output: {
              key: 'item:ae2:certus_quartz_crystal',
              id: 'ae2:certus_quartz_crystal',
              displayName: 'Certus Quartz Crystal',
              amount: times,
              craftable: true,
              iconUrl: '/api/v1/icons/item/ae2/certus_quartz_crystal',
            },
            times,
            mode: 'processing',
            patternId: 'fp-certus@pp-overworld-auto',
            missing: false,
            inputs: [
              {
                item: {
                  key: 'item:ae2:certus_quartz_dust',
                  id: 'ae2:certus_quartz_dust',
                  displayName: 'Certus Quartz Dust',
                  amount: times,
                  craftable: false,
                  iconUrl: '/api/v1/icons/item/ae2/certus_quartz_dust',
                },
                missing: false,
              },
            ],
          },
        },
        {
          item: {
            key: 'item:minecraft:quartz',
            id: 'minecraft:quartz',
            displayName: 'Nether Quartz',
            amount: times,
            craftable: false,
            iconUrl: '/api/v1/icons/item/minecraft/quartz',
          },
          missing: false,
        },
        {
          item: {
            key: 'item:minecraft:redstone',
            id: 'minecraft:redstone',
            displayName: 'Redstone Dust',
            amount: times,
            craftable: false,
            iconUrl: '/api/v1/icons/item/minecraft/redstone',
          },
          missing: false,
        },
      ],
    }
  }
  return {
    output: { ...output, amount },
    times,
    mode: missing.length ? 'processing' : 'crafting',
    patternId: missing.length ? 'fp-silicon@pp-overworld-main' : undefined,
    missing: missingKeys.has(output.key),
    inputs: missing.map((m) => ({
      item: m,
      missing: true,
    })),
  }
}

function bodyOf<T extends Record<string, unknown>>(data: unknown): T {
  if (data && typeof data === 'object') return data as T
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T
    } catch {
      return {} as T
    }
  }
  return {} as T
}

export async function dispatchMock(input: MockRequestInput): Promise<unknown> {
  const method = input.method.toUpperCase()
  const { pathname, search } = parsePath(input.url)

  if (method === 'GET' && pathname === '/api/v1/health') {
    return {
      ok: true,
      service: 'ae2lanuis',
      version: MOCK_VERSION,
      sessions: sessions.size,
      websocket: {
        enabled: true,
        port: (() => {
          const httpPort = Number(process.env.MOCK_HTTP_PORT || 8765)
          const wsEnv = process.env.MOCK_WS_PORT
          const ws = wsEnv === undefined || wsEnv === '' || wsEnv === '0' ? 0 : Number(wsEnv)
          return !ws || ws === httpPort ? httpPort : ws
        })(),
        pushIntervalMs: 500,
        running: true,
        sameAsHttp: (() => {
          const httpPort = Number(process.env.MOCK_HTTP_PORT || 8765)
          const wsEnv = process.env.MOCK_WS_PORT
          const ws = wsEnv === undefined || wsEnv === '' || wsEnv === '0' ? 0 : Number(wsEnv)
          return !ws || ws === httpPort
        })(),
      },
    }
  }

  if (method === 'POST' && pathname === '/api/v1/auth/login') {
    const body = bodyOf<{ account?: string; password?: string }>(input.data)
    const account = (body.account || '').trim()
    const password = body.password ?? ''
    if (!account || !password) {
      throw new MockHttpError(400, 'invalid_credentials', 'Account and password required (mock)')
    }
    const token = `mock-${crypto.randomUUID()}`
    const admin = isAdminAccount(account)
    const playerUuid = uuidForAccount(account)
    sessions.set(token, { account, admin, playerUuid })
    pushAudit({
      action: 'login',
      actorUuid: playerUuid,
      actorName: account,
      detail: admin ? 'admin login' : 'user login',
    })
    return {
      ok: true,
      account,
      token,
      displayName: account,
      admin,
    }
  }

  if (method === 'POST' && pathname === '/api/v1/auth/logout') {
    const token = readBearer(input.headers)
    if (token) sessions.delete(token)
    return { ok: true }
  }

  if (method === 'GET' && pathname === '/api/v1/auth/session') {
    const token = readBearer(input.headers)
    const s = token ? sessions.get(token) : undefined
    if (!s) return { authenticated: false }
    return sessionPayload(s)
  }

  if (method === 'GET' && pathname === '/api/v1/admin/bindings') {
    requireAdmin(input.headers)
    const bindings = MOCK_BINDINGS.map((b) => ({
      ...b,
      busyCpuCount: b.playerName === 'admin' ? jobsState.filter((j) => j.busy).length : b.busyCpuCount,
      cpuCount: b.playerName === 'admin' ? jobsState.length : b.cpuCount,
      itemTypes: b.playerName === 'admin' ? mockItems.length : b.itemTypes,
    }))
    return { ok: true, total: bindings.length, bindings }
  }

  if (method === 'POST' && pathname === '/api/v1/admin/session/act-as') {
    const s = requireAdmin(input.headers)
    const body = bodyOf<{ playerUuid?: string }>(input.data)
    const target = MOCK_BINDINGS.find((b) => b.playerUuid === body.playerUuid)
    if (!target) throw new MockHttpError(404, 'not_found', 'Player binding not found (mock)')
    if (!target.playerOnline || !target.networkAvailable || !target.networkOnline) {
      throw new MockHttpError(503, 'network_unavailable', 'Network offline or unreachable (mock)')
    }
    s.actingAs = { playerUuid: target.playerUuid, playerName: target.playerName }
    pushAudit({
      action: 'act_as',
      actorUuid: s.playerUuid,
      actorName: s.account,
      targetUuid: target.playerUuid,
      targetName: target.playerName,
    })
    return sessionPayload(s)
  }

  if (method === 'POST' && pathname === '/api/v1/admin/session/clear-act-as') {
    const s = requireAdmin(input.headers)
    if (s.actingAs) {
      pushAudit({
        action: 'clear_act_as',
        actorUuid: s.playerUuid,
        actorName: s.account,
        targetUuid: s.actingAs.playerUuid,
        targetName: s.actingAs.playerName,
      })
    }
    delete s.actingAs
    return { ok: true }
  }

  if (method === 'GET' && pathname === '/api/v1/admin/audit') {
    requireAdmin(input.headers)
    const q = (search.get('q') || '').trim().toLowerCase()
    const page = Number(search.get('page') || '1') || 1
    const pageSize = Number(search.get('pageSize') || '50') || 50
    const filtered = q
      ? auditLog.filter((e) => [e.action, e.actorName, e.targetName, e.detail, e.actorUuid, e.targetUuid].filter(Boolean).join(' ').toLowerCase().includes(q))
      : auditLog
    const pageData = paginate(filtered, page, pageSize)
    return {
      ok: true,
      page: pageData.page,
      pageSize: pageData.pageSize,
      total: pageData.total,
      entries: pageData.items,
    }
  }

  if (method === 'GET' && pathname === '/api/v1/items') {
    requireSession(input.headers)
    const q = search.get('q') || ''
    const kind = search.get('kind') || 'all'
    const filter = search.get('filter') || 'all'
    const sort = search.get('sort') || 'name'
    const order = search.get('order') || 'asc'
    const page = Number(search.get('page') || '1') || 1
    const pageSize = Number(search.get('pageSize') || '96') || 96
    const filtered = pinCraftingToFront(filterItems(mockItems, q, kind, filter, sort, order), mockItems, jobsState)
    const pageData = paginate(filtered, page, pageSize)
    return {
      ...pageData,
      network: {
        online: true,
        itemTypes: mockItems.length,
        cpuCount: jobsState.length,
        busyCpuCount: jobsState.filter((j) => j.busy).length,
      },
    }
  }

  if (method === 'GET' && pathname === '/api/v1/crafting/catalog') {
    requireSession(input.headers)
    const q = search.get('q') || ''
    const page = Number(search.get('page') || '1') || 1
    const pageSize = Number(search.get('pageSize') || '96') || 96
    const filtered = pinCraftingToFront(filterItems(mockCatalog, q, 'all', 'craftable', search.get('sort') || 'name', search.get('order') || 'asc'), mockCatalog, jobsState)
    return paginate(filtered, page, pageSize)
  }

  if (method === 'GET' && pathname === '/api/v1/pattern-providers') {
    requireSession(input.headers)
    const q = search.get('q') || ''
    const qOutput = search.get('qOutput') || ''
    const qInput = search.get('qInput') || ''
    const mode = search.get('mode') || 'all'
    const filtering = !!(q.trim() || qOutput.trim() || qInput.trim() || (mode && mode !== 'all'))
    const providers = listProviderBoards()
      .map((board) => {
        const slots = board.slots
          .map((s) => {
            if (!s.pattern) return filtering ? null : s
            if (!filterPatterns([s.pattern], q, qOutput, qInput, mode).length) {
              return filtering ? null : { index: s.index, pattern: null }
            }
            return s
          })
          .filter((s): s is NonNullable<typeof s> => s != null)
        if (filtering && !slots.some((s) => s.pattern)) return null
        return {
          ...board,
          usedSlots: board.slots.filter((s) => s.pattern).length,
          slots: filtering ? slots.filter((s) => s.pattern) : board.slots,
        }
      })
      .filter((b): b is NonNullable<typeof b> => b != null)
    return { ok: true, providers }
  }

  if (method === 'POST' && pathname === '/api/v1/patterns/move') {
    const session = requireSession(input.headers)
    const body = bodyOf<{ moves?: Array<{ from?: { providerId?: string; slotIndex?: number }; to?: { providerId?: string; slotIndex?: number } }> }>(input.data)
    try {
      const moves = (body.moves || []).map((m) => ({
        from: { providerId: String(m.from?.providerId || ''), slotIndex: Number(m.from?.slotIndex) },
        to: {
          providerId: String(m.to?.providerId || ''),
          slotIndex: m.to?.slotIndex == null ? undefined : Number(m.to.slotIndex),
        },
      }))
      movePatterns(moves)
      pushAudit({
        action: 'pattern_move',
        actorUuid: session.playerUuid,
        actorName: session.account,
        detail: `ops=${moves.length}`,
      })
      return { ok: true }
    } catch (e) {
      const err = e as Error & { code?: string; status?: number }
      throw new MockHttpError(err.status || 400, err.code || 'bad_request', err.message || 'move failed')
    }
  }

  if (method === 'GET' && pathname === '/api/v1/patterns') {
    requireSession(input.headers)
    const q = search.get('q') || ''
    const qOutput = search.get('qOutput') || ''
    const qInput = search.get('qInput') || ''
    const mode = search.get('mode') || 'all'
    const page = Number(search.get('page') || '1') || 1
    const pageSize = Number(search.get('pageSize') || '50') || 50
    const filtered = filterPatterns(listPatternsFlat(), q, qOutput, qInput, mode)
    return paginate(filtered, page, pageSize)
  }

  if (method === 'POST' && pathname === '/api/v1/crafting/plan') {
    const session = requireSession(input.headers)
    const body = bodyOf<{ key?: string; amount?: string }>(input.data)
    const item = body.key ? findItem(body.key) : undefined
    if (!item) throw new MockHttpError(400, 'invalid_item', 'Unknown item key (mock)')
    const amount = body.amount || '1'
    const planId = `plan-${crypto.randomUUID()}`
    const amountNum = Math.max(1, Number(amount) || 1)
    const bytesRequired = amountNum * 1024
    const bytesAvailable = 256_000
    const cpuCount = jobsState.length
    const idleCpuCount = jobsState.filter((j) => !j.busy).length
    const coProcessors = idleCpuCount * 2
    const missing: Item[] =
      item.id === 'ae2:silicon'
        ? [
            {
              key: 'item:minecraft:quartz',
              id: 'minecraft:quartz',
              displayName: 'Nether Quartz',
              amount: '2',
              craftable: false,
              iconUrl: '/api/v1/icons/item/minecraft/quartz',
            },
          ]
        : []
    const bytesOk = bytesAvailable >= bytesRequired
    const canSubmit = missing.length === 0 && bytesOk && idleCpuCount > 0
    let warning = ''
    if (missing.length > 0) warning = 'Missing ingredients (mock)'
    else if (idleCpuCount <= 0) warning = 'No idle crafting CPU (mock)'
    else if (!bytesOk) warning = 'Insufficient crafting CPU storage (mock)'
    const usedItems: Item[] =
      missing.length === 0
        ? [
            {
              key: 'item:minecraft:redstone',
              id: 'minecraft:redstone',
              displayName: 'Redstone Dust',
              amount: String(amountNum),
              craftable: false,
              iconUrl: '/api/v1/icons/item/minecraft/redstone',
            },
          ]
        : []
    plans.set(planId, {
      planId,
      key: item.key,
      amount,
      account: session.account,
      expiresAt: Date.now() + PLAN_TTL_MS,
    })
    return {
      planId,
      ok: true,
      canSubmit,
      bytes: String(bytesRequired),
      bytesAvailable: String(bytesAvailable),
      coProcessors,
      cpuCount,
      idleCpuCount,
      multiplePaths: item.id === 'ae2:fluix_crystal',
      usedItems,
      tree: mockPlanTree(item, amount, missing),
      cpus: jobsState.map((j) => ({
        cpuName: j.cpuName,
        busy: j.busy,
        bytesAvailable: String(bytesAvailable),
        coProcessors: 2,
        suitable: !j.busy && bytesOk,
      })),
      warning,
      missing,
      output: { ...item, amount },
    }
  }

  if (method === 'POST' && pathname === '/api/v1/crafting/submit') {
    const session = requireSession(input.headers)
    const body = bodyOf<{ planId?: string; key?: string; amount?: string; cpuName?: string }>(input.data)
    let key = body.key
    let amount = body.amount || '1'
    if (body.planId) {
      const cached = plans.get(body.planId)
      if (!cached || cached.expiresAt < Date.now() || cached.account !== session.account) {
        throw new MockHttpError(400, 'plan_expired', 'Plan expired or invalid (mock)')
      }
      key = cached.key
      amount = cached.amount
      plans.delete(body.planId)
    }
    if (!key) throw new MockHttpError(400, 'invalid_item', 'Missing planId or key (mock)')
    const item = findItem(key)
    if (!item) throw new MockHttpError(400, 'invalid_item', 'Unknown item key (mock)')

    const idle = body.cpuName ? jobsState.find((j) => j.cpuName === body.cpuName && !j.busy) : jobsState.find((j) => !j.busy)
    if (body.cpuName && !idle) {
      throw new MockHttpError(400, 'cpu_busy', 'Crafting CPU busy or missing (mock)')
    }
    if (idle) {
      idle.busy = true
      idle.status = 'crafting'
      idle.detail = `${item.id} x${amount}`
      idle.output = { ...item, amount: String(amount) }
      idle.progress = '0'
      idle.totalItems = String(amount)
      idle.progressPercent = 0
      idle.crafted = '0'
      idle.requested = String(amount)
    }
    pushAudit({
      action: 'craft_submit',
      actorUuid: session.playerUuid,
      actorName: session.account,
      detail: `${item.id} x${amount}`,
    })
    return {
      ok: true,
      message: 'Craft submitted (mock)',
      jobId: `job-${crypto.randomUUID()}`,
    }
  }

  if (method === 'GET' && pathname === '/api/v1/crafting/jobs') {
    requireSession(input.headers)
    tickMockJobsProgress()
    return { jobs: jobsState.map((j) => ({ ...j, output: j.output ? { ...j.output } : undefined })) }
  }

  if (method === 'POST' && pathname === '/api/v1/crafting/cancel') {
    const session = requireSession(input.headers)
    const body = bodyOf<{ cpuName?: string }>(input.data)
    const cpu = jobsState.find((j) => j.cpuName === body.cpuName)
    if (!cpu || !cpu.busy) {
      throw new MockHttpError(400, 'cpu_not_found_or_idle', 'CPU not found or idle (mock)')
    }
    clearJobProgress(cpu)
    pushAudit({
      action: 'craft_cancel',
      actorUuid: session.playerUuid,
      actorName: session.account,
      detail: body.cpuName,
    })
    return { ok: true, message: 'Cancelled (mock)' }
  }

  throw new MockHttpError(404, 'not_found', `No mock handler for ${method} ${pathname}`)
}

export function listMockJobs(): CraftJob[] {
  return jobsState
}

export function findSessionByToken(token: string): SessionRecord | undefined {
  return sessions.get(token)
}

/** 1×1 PNG（透明），供图标接口占位 */
export const PLACEHOLDER_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
