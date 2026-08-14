/**
 * HTTP 封装：浏览器用 axios；Tauri（尤其 Android）走 Rust http 插件，避开 WebView 明文/跨域限制。
 * 桌面登录前可传入 ConnectionConfig 覆盖基址。
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { isTauri, loadToken, resolveBaseUrl, type ConnectionConfig } from '@/lib/runtime'
import { ApiError } from './errors'

export { ApiError }

type RequestExtra = {
  /** 桌面登录/探测时使用表单中的主机端口 */
  desktopCfg?: ConnectionConfig
}

const service: AxiosInstance = axios.create({
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
})

service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = loadToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

service.interceptors.response.use(
  (res: AxiosResponse) => res,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const data = error.response?.data as { error?: { code?: string; message?: string } } | undefined
      const code = data?.error?.code || (error.code === 'ERR_NETWORK' ? 'network_error' : 'http_error')
      const message = data?.error?.message || error.message || error.response?.statusText || 'request failed'
      return Promise.reject(new ApiError(status, code, message))
    }
    return Promise.reject(error)
  },
)

export type RequestConfig = AxiosRequestConfig & RequestExtra

function buildHeaders(extra?: AxiosRequestConfig['headers']): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = loadToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (!extra) return headers
  const raw =
    typeof (extra as { toJSON?: () => Record<string, unknown> }).toJSON === 'function'
      ? (extra as { toJSON: () => Record<string, unknown> }).toJSON()
      : (extra as Record<string, unknown>)
  for (const [key, value] of Object.entries(raw)) {
    if (value == null || value === false) continue
    headers[key] = Array.isArray(value) ? value.map(String).join(', ') : String(value)
  }
  return headers
}

async function requestViaTauriHttp<T>(url: string, method: string, axiosConfig: AxiosRequestConfig): Promise<T> {
  const { fetch } = await import('@tauri-apps/plugin-http')
  const headers = buildHeaders(axiosConfig.headers)
  const hasBody = axiosConfig.data !== undefined && method !== 'GET' && method !== 'HEAD'
  if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(axiosConfig.data) : undefined,
      connectTimeout: 30_000,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 权限未放行端口通配时会瞬间失败，文案需原样透出便于排查
    if (/not allowed|scope|permission|denied/i.test(msg)) {
      throw new ApiError(0, 'network_error', msg)
    }
    throw new ApiError(0, 'network_error', msg || 'Network Error')
  }
  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const envelope = data as { error?: { code?: string; message?: string } } | undefined
    throw new ApiError(res.status, envelope?.error?.code || 'http_error', envelope?.error?.message || res.statusText || 'request failed')
  }
  return data as T
}

/**
 * 发 JSON API 请求；路径形如 `/api/v1/...`。
 */
export async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { desktopCfg, ...axiosConfig } = config
  const baseURL = resolveBaseUrl(desktopCfg)
  const method = (axiosConfig.method || 'GET').toUpperCase()
  const url = `${baseURL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

  if (isTauri()) {
    return requestViaTauriHttp<T>(url, method, axiosConfig)
  }

  const res = await service.request<T>({
    ...axiosConfig,
    baseURL,
    url: path,
    method,
  })
  return res.data
}

export { service as axiosInstance }
