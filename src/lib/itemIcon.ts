/**
 * 物品图标 URL：拼 API 基址；缺省按 id 回退 `/api/v1/icons/...`。
 */
import { resolveBaseUrl } from '@/lib/runtime'
import type { Item } from '@/types'

/** 16×16 缺失材质棋盘（紫/黑），替代 1×1 色点放大 */
export const ITEM_ICON_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">` +
      `<rect width="8" height="8" fill="#f800f8"/>` +
      `<rect x="8" width="8" height="8" fill="#2b2b2b"/>` +
      `<rect y="8" width="8" height="8" fill="#2b2b2b"/>` +
      `<rect x="8" y="8" width="8" height="8" fill="#f800f8"/>` +
      `</svg>`,
  )

/**
 * 解析物品/流体图标绝对地址（相对 iconUrl 或按 id 拼 API）。
 */
export function resolveItemIconUrl(item: Pick<Item, 'id' | 'iconUrl' | 'isFluid'>, baseUrl?: string): string {
  const id = (item.id || '').trim()
  const icon = (item.iconUrl || '').trim()
  if (!icon) {
    if (id.includes(':')) {
      const [ns, ...rest] = id.split(':')
      const path = rest.join(':')
      const kind = item.isFluid ? 'fluid' : 'item'
      return joinApi(`/api/v1/icons/${kind}/${ns}/${path}`, baseUrl)
    }
    return ITEM_ICON_PLACEHOLDER
  }
  if (/^https?:\/\//i.test(icon) || icon.startsWith('data:')) {
    return icon
  }
  return joinApi(icon.startsWith('/') ? icon : `/${icon}`, baseUrl)
}

export function isItemIconPlaceholder(src: string): boolean {
  return src === ITEM_ICON_PLACEHOLDER
}

function joinApi(path: string, baseUrl?: string): string {
  const base = (baseUrl ?? resolveBaseUrl()).replace(/\/$/, '')
  if (!base) return path
  return `${base}${path}`
}
