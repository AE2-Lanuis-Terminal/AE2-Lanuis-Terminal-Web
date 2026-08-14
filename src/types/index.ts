/**
 * 类型模块聚合导出（与 `api` / `utils` 同级）。
 * OpenAPI 生成见 generated.ts（npm run gen:api）；业务代码优先用手写 *Request/*Response。
 */
export type { Item, NetworkSummary, OkResult, PageQuery, PageResult } from './common'
export type { HealthResponse, WebsocketInfo } from './health'
export type { LoginRequest, LoginResponse, LogoutResponse, SessionResponse, ActingAsInfo } from './auth'
export type { AdminBinding, AdminBindingsResponse, AdminEndpoint, AdminAuditResponse, AuditEntry } from './admin'
export type { ItemsQuery, ItemsResponse } from './items'
export type {
  CatalogQuery,
  CatalogResponse,
  CraftCancelRequest,
  CraftCancelResponse,
  CraftJob,
  CraftJobStatusEntry,
  CraftJobsResponse,
  CraftPlanCpu,
  CraftPlanRequest,
  CraftPlanResponse,
  CraftRecipeTreeInput,
  CraftRecipeTreeNode,
  CraftSubmitRequest,
  CraftSubmitResponse,
} from './crafting'
export type {
  Pattern,
  PatternInput,
  PatternMode,
  PatternProvider,
  PatternProviderTarget,
  PatternSlot,
  PatternProviderBoard,
  PatternProvidersResponse,
  PatternSlotRef,
  PatternMoveOp,
  PatternMoveRequest,
  PatternsQuery,
  PatternsResponse,
} from './patterns'
export type {
  EncodingMode,
  EncodingSlot,
  EncodingStatusResponse,
  EncodingResolveRequest,
  EncodingResolveResponse,
  EncodingStonecuttingOptionsRequest,
  EncodingStonecuttingOption,
  EncodingStonecuttingOptionsResponse,
  EncodingEncodeRequest,
  EncodingEncodeResponse,
} from './encoding'
export type { paths as OpenApiPaths, components as OpenApiComponents } from './generated'
