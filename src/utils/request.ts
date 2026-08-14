/**
 * HTTP 封装（axios）：统一基址、Bearer、错误信封。
 * 桌面登录前可传入 ConnectionConfig 覆盖基址。
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { loadToken, resolveBaseUrl, type ConnectionConfig } from '@/lib/runtime'
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

/**
 * 发 JSON API 请求；路径形如 `/api/v1/...`。
 */
export async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { desktopCfg, ...axiosConfig } = config
  const baseURL = resolveBaseUrl(desktopCfg)
  const method = (axiosConfig.method || 'GET').toUpperCase()

  const res = await service.request<T>({
    ...axiosConfig,
    baseURL,
    url: path,
    method,
  })
  return res.data
}

export { service as axiosInstance }
