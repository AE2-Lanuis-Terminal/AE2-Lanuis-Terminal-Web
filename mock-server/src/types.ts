/**
 * Mock 服务 DTO（对齐 OpenAPI，不依赖前端 src）。
 */

export type Item = {
  key: string
  id: string
  displayName: string
  amount: string
  craftable: boolean
  kind?: string
  isFluid?: boolean
  amountPerUnit?: number
  iconUrl?: string
}

export type PatternProvider = {
  id?: string
  name?: string
  pos?: Record<string, unknown>
  priority?: number
  slotCount?: number
  usedSlots?: number
  movable?: boolean
  targets?: Array<{
    name?: string
    blockId?: string
    side?: string
    pos?: { x?: number; y?: number; z?: number; dimension?: string }
  }>
}

export type PatternInput = {
  item: Item
  multiplier?: string
  alternatives?: Item[]
}

export type Pattern = {
  id: string
  name?: string
  mode?: string
  slotIndex?: number
  primaryOutput?: Item
  outputs: Item[]
  inputs: PatternInput[]
  substitute?: boolean
  substituteFluids?: boolean
  definition?: Item
  provider?: PatternProvider
}

export type CraftJob = {
  cpuName: string
  busy: boolean
  status?: string
  detail?: string
  output?: Item
  progress?: string
  totalItems?: string
  progressPercent?: number
  crafted?: string
  requested?: string
  elapsedNanos?: string
}

export type CraftRecipeTreeInput = {
  item: Item
  missing?: boolean
  child?: CraftRecipeTreeNode
}

export type CraftRecipeTreeNode = {
  output: Item
  times: string
  mode?: string
  patternId?: string
  missing?: boolean
  inputs?: CraftRecipeTreeInput[]
}

export type ActingAsInfo = {
  playerUuid: string
  playerName: string
}

export type AdminBinding = {
  playerUuid: string
  playerName: string
  updatedAt: number
  playerOnline: boolean
  hasNetworkLink: boolean
  endpoint?: {
    terminalItemId?: string
    dimension?: string
    playerPos?: string
  }
  networkAvailable: boolean
  networkOnline: boolean
  itemTypes?: number
  cpuCount?: number
  busyCpuCount?: number
}

export type AuditEntry = {
  ts: number
  action: string
  actorUuid?: string
  actorName?: string
  targetUuid?: string
  targetName?: string
  detail?: string
}

export type SessionRecord = {
  account: string
  admin: boolean
  playerUuid: string
  actingAs?: ActingAsInfo
}
