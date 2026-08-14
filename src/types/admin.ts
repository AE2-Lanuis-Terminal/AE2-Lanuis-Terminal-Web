/**
 * GET /api/v1/admin/bindings · act-as · audit
 */

export interface AdminEndpoint {
  terminalItemId?: string
  dimension?: string
  playerPos?: string
}

export interface AdminBinding {
  playerUuid: string
  playerName: string
  updatedAt: number
  playerOnline: boolean
  hasNetworkLink: boolean
  endpoint?: AdminEndpoint
  networkAvailable: boolean
  networkOnline: boolean
  itemTypes?: number
  cpuCount?: number
  busyCpuCount?: number
}

export interface AdminBindingsResponse {
  ok: boolean
  total: number
  bindings: AdminBinding[]
}

export interface AuditEntry {
  ts: number
  action: string
  actorUuid?: string
  actorName?: string
  targetUuid?: string
  targetName?: string
  detail?: string
}

export interface AdminAuditResponse {
  ok: boolean
  page: number
  pageSize: number
  total: number
  entries: AuditEntry[]
}
