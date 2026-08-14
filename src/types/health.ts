/**
 * GET /api/v1/health
 */

/** WebSocket 发现信息（port=0 或 sameAsHttp 表示与 HTTP 同端口） */
export interface WebsocketInfo {
  enabled: boolean
  port: number
  pushIntervalMs: number
  running?: boolean
  /** 与 HTTP 共用对外端口 */
  sameAsHttp?: boolean
}

/** 健康检查响应 */
export interface HealthResponse {
  ok: boolean
  /** 必须为 ae2lanuis，前端据此校验服务身份 */
  service: string
  version: string
  /** 可选：当前会话数 */
  sessions?: number
  websocket?: WebsocketInfo
}
