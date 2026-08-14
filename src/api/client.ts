/**
 * HTTP API 表：与模组 `/api/v1` 一一对应。
 * 底层走 `@/utils/request`（axios）；类型见 `@/types`。
 */
import { request } from '@/utils/request'
import type { ConnectionConfig } from '@/lib/runtime'
import type {
  CatalogResponse,
  CraftCancelRequest,
  CraftCancelResponse,
  CraftJobsResponse,
  CraftPlanRequest,
  CraftPlanResponse,
  CraftSubmitRequest,
  CraftSubmitResponse,
  HealthResponse,
  ItemsResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  PatternsResponse,
  PatternProvidersResponse,
  PatternMoveRequest,
  SessionResponse,
  AdminBindingsResponse,
  AdminAuditResponse,
  EncodingStatusResponse,
  EncodingResolveRequest,
  EncodingResolveResponse,
  EncodingStonecuttingOptionsRequest,
  EncodingStonecuttingOptionsResponse,
  EncodingEncodeRequest,
  EncodingEncodeResponse,
} from '@/types'

export type * from '@/types'
export { ApiError } from '@/utils/errors'

export const api = {
  /** GET /api/v1/health */
  health: (cfg?: ConnectionConfig) =>
    request<HealthResponse>('/api/v1/health', {
      desktopCfg: cfg,
    }),

  /** POST /api/v1/auth/login */
  login: (body: LoginRequest, cfg?: ConnectionConfig) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      data: body,
      desktopCfg: cfg,
    }),

  /** POST /api/v1/auth/logout */
  logout: () => request<LogoutResponse>('/api/v1/auth/logout', { method: 'POST' }),

  /** GET /api/v1/auth/session */
  session: () => request<SessionResponse>('/api/v1/auth/session'),

  /** GET /api/v1/admin/bindings（需 OP） */
  adminBindings: () => request<AdminBindingsResponse>('/api/v1/admin/bindings'),

  /** POST /api/v1/admin/session/act-as */
  adminActAs: (playerUuid: string) =>
    request<SessionResponse>('/api/v1/admin/session/act-as', {
      method: 'POST',
      data: { playerUuid },
    }),

  /** POST /api/v1/admin/session/clear-act-as */
  adminClearActAs: () => request<{ ok: boolean }>('/api/v1/admin/session/clear-act-as', { method: 'POST' }),

  /** GET /api/v1/admin/audit */
  adminAudit: (params: URLSearchParams) => request<AdminAuditResponse>(`/api/v1/admin/audit?${params}`),

  /** GET /api/v1/items */
  items: (params: URLSearchParams) => request<ItemsResponse>(`/api/v1/items?${params}`),

  /** GET /api/v1/patterns · pattern-providers · patterns/move */
  patterns: {
    list: (params: URLSearchParams) => request<PatternsResponse>(`/api/v1/patterns?${params}`),
    providers: (params?: URLSearchParams) => request<PatternProvidersResponse>(`/api/v1/pattern-providers${params ? `?${params}` : ''}`),
    move: (body: PatternMoveRequest) => request<{ ok: boolean }>('/api/v1/patterns/move', { method: 'POST', data: body }),
  },

  /** GET /api/v1/crafting/catalog */
  catalog: (params: URLSearchParams) => request<CatalogResponse>(`/api/v1/crafting/catalog?${params}`),

  /** POST /api/v1/crafting/plan */
  plan: (body: CraftPlanRequest) => request<CraftPlanResponse>('/api/v1/crafting/plan', { method: 'POST', data: body }),

  /** POST /api/v1/crafting/submit */
  submit: (body: CraftSubmitRequest) =>
    request<CraftSubmitResponse>('/api/v1/crafting/submit', {
      method: 'POST',
      data: body,
    }),

  /** GET /api/v1/crafting/jobs */
  jobs: () => request<CraftJobsResponse>('/api/v1/crafting/jobs'),

  /** POST /api/v1/crafting/cancel */
  cancel: (cpuName: string) =>
    request<CraftCancelResponse>('/api/v1/crafting/cancel', {
      method: 'POST',
      data: { cpuName } satisfies CraftCancelRequest,
    }),

  /** /api/v1/encoding/* */
  encoding: {
    status: () => request<EncodingStatusResponse>('/api/v1/encoding/status'),
    resolve: (body: EncodingResolveRequest) =>
      request<EncodingResolveResponse>('/api/v1/encoding/resolve', { method: 'POST', data: body }),
    stonecuttingOptions: (body: EncodingStonecuttingOptionsRequest) =>
      request<EncodingStonecuttingOptionsResponse>('/api/v1/encoding/stonecutting/options', { method: 'POST', data: body }),
    encode: (body: EncodingEncodeRequest) =>
      request<EncodingEncodeResponse>('/api/v1/encoding/encode', { method: 'POST', data: body }),
  },
}
