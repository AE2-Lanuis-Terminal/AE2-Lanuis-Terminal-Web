/**
 * 连接配置与 API 基址；平台能力从 `./platform` 再导出。
 * 不可依赖构建期 `TAURI_*`；一律运行时检测。
 *
 * resolveBaseUrl 优先级：桌面用户配置 → VITE_API_BASE_URL → location.origin。
 * token 空字符串时 removeItem，避免残留假会话。
 */

import { isTauri } from './platform'

export {
  canUseSystemTray,
  canUseWindowChrome,
  getPlatform,
  isDesktopChrome,
  isMobileShell,
  isTauri,
  isWeb,
  preferSettingsWindow,
  preferTouchTargets,
  type AppPlatform,
} from './platform'

const KEYS = {
  host: 'ae2lanuis.serverHost',
  port: 'ae2lanuis.serverPort',
  protocol: 'ae2lanuis.protocol',
  account: 'ae2lanuis.account',
  token: 'ae2lanuis.token',
  shellMode: 'ae2lanuis.shellMode',
} as const

export type ShellMode = 'user' | 'admin'

export function loadShellMode(): ShellMode | '' {
  const v = localStorage.getItem(KEYS.shellMode)
  return v === 'user' || v === 'admin' ? v : ''
}

export function saveShellMode(mode: ShellMode | '') {
  if (mode === 'user' || mode === 'admin') localStorage.setItem(KEYS.shellMode, mode)
  else localStorage.removeItem(KEYS.shellMode)
}

/** 桌面登录可编辑的服务器连接信息 */
export type ConnectionConfig = {
  serverHost: string
  serverPort: number
  protocol: 'http' | 'https'
  account: string
}

export function loadConnectionConfig(): ConnectionConfig {
  return {
    serverHost: localStorage.getItem(KEYS.host) || '127.0.0.1',
    serverPort: Number(localStorage.getItem(KEYS.port) || '8765') || 8765,
    protocol: (localStorage.getItem(KEYS.protocol) as 'http' | 'https') || 'http',
    account: localStorage.getItem(KEYS.account) || '',
  }
}

export function saveConnectionConfig(cfg: Partial<ConnectionConfig>) {
  if (cfg.serverHost != null) localStorage.setItem(KEYS.host, cfg.serverHost)
  if (cfg.serverPort != null) localStorage.setItem(KEYS.port, String(cfg.serverPort))
  if (cfg.protocol != null) localStorage.setItem(KEYS.protocol, cfg.protocol)
  if (cfg.account != null) localStorage.setItem(KEYS.account, cfg.account)
}

export function loadToken(): string {
  return localStorage.getItem(KEYS.token) || ''
}

export function saveToken(token: string) {
  if (token) localStorage.setItem(KEYS.token, token)
  else localStorage.removeItem(KEYS.token)
}

/**
 * 解析当前请求应使用的 API 根地址（无尾斜杠）。
 * @param desktop 登录前探测时传入表单中的配置；省略则读 localStorage
 */
export function resolveBaseUrl(desktop?: ConnectionConfig): string {
  if (isTauri()) {
    const cfg = desktop || loadConnectionConfig()
    return `${cfg.protocol}://${cfg.serverHost}:${cfg.serverPort}`.replace(/\/$/, '')
  }
  const env = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
  if (env) return env
  return typeof window !== 'undefined' ? window.location.origin : ''
}
