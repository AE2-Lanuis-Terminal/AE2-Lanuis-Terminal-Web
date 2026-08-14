/// <reference types="vite/client" />

/**
 * - VITE_API_BASE_URL：开发时覆盖 API 根地址（纯 Web）
 * - VITE_USE_MOCK：仅影响 `npm run dev` 是否自动拉起独立 mock-server（非前端内嵌 mock）
 */

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
