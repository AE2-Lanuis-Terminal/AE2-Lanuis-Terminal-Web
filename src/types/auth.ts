/**
 * POST /api/v1/auth/login | logout · GET /api/v1/auth/session
 */
import type { OkResult } from './common'

/** 登录请求 */
export interface LoginRequest {
  account: string
  password: string
  remember?: boolean
}

export interface ActingAsInfo {
  playerUuid: string
  playerName: string
}

/** 登录响应 */
export interface LoginResponse {
  ok: boolean
  account: string
  token: string
  displayName: string
  admin?: boolean
}

/** 注销响应 */
export type LogoutResponse = OkResult

/** 会话探测响应 */
export interface SessionResponse {
  authenticated: boolean
  account?: string
  admin?: boolean
  actingAs?: ActingAsInfo
}
