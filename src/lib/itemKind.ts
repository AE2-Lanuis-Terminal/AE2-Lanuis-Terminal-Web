/**
 * 库存条目类型注册表。
 * 新增一等类型时：补 ITEM_KIND_IDS / meta / i18n / CSS chip，并将服务端 DTO 的 kind 对齐。
 * 未注册的 kind 一律归入 other（筛选「其他」可见）。
 */

export const ITEM_KIND_IDS = ['item', 'fluid', 'other'] as const

export type ItemKindId = (typeof ITEM_KIND_IDS)[number]

/** 查询用：含「全部」 */
export type ItemKindFilter = 'all' | ItemKindId

export type ItemKindMeta = {
  id: ItemKindId
  /** ui-item-chip--* */
  chipMod: `ui-item-chip--${ItemKindId}`
  /** 标签文案 i18n key */
  labelKey: `storage.${ItemKindId}`
  /** Tailwind 文字色 class */
  tagTextClass: string
  /** 标签边框/底用的 CSS 色变量名（不含 var()） */
  tagColorVar: string
}

export const ITEM_KIND_META: Record<ItemKindId, ItemKindMeta> = {
  item: {
    id: 'item',
    chipMod: 'ui-item-chip--item',
    labelKey: 'storage.item',
    tagTextClass: 'text-green',
    tagColorVar: '--color-green',
  },
  fluid: {
    id: 'fluid',
    chipMod: 'ui-item-chip--fluid',
    labelKey: 'storage.fluid',
    tagTextClass: 'text-cyan',
    tagColorVar: '--color-cyan',
  },
  other: {
    id: 'other',
    chipMod: 'ui-item-chip--other',
    labelKey: 'storage.other',
    tagTextClass: 'text-muted',
    tagColorVar: '--color-muted',
  },
}

/** 筛选下拉顺序（不含 all） */
export const ITEM_KIND_FILTER_OPTIONS: ItemKindId[] = ['item', 'fluid', 'other']

export function isItemKindId(value: string): value is ItemKindId {
  return (ITEM_KIND_IDS as readonly string[]).includes(value)
}

/**
 * 归一化条目类型：优先 kind；兼容旧 isFluid / key 前缀；未知字符串 → other。
 */
export function resolveItemKind(item: { kind?: string | null; isFluid?: boolean; key?: string }): ItemKindId {
  const raw = (item.kind || '').trim().toLowerCase()
  if (isItemKindId(raw)) return raw
  if (raw) return 'other'
  if (item.isFluid) return 'fluid'
  const key = item.key || ''
  if (key.startsWith('fluid:')) return 'fluid'
  if (key.startsWith('item:')) return 'item'
  return 'other'
}

/** kind=other 匹配：非 item/fluid 的一等类型（含显式 other 与未来未注册值） */
export function matchesKindFilter(itemKind: ItemKindId | string, filter: string): boolean {
  const f = (filter || 'all').toLowerCase()
  if (!f || f === 'all') return true
  const k = resolveItemKind({ kind: itemKind })
  if (f === 'other') return k !== 'item' && k !== 'fluid'
  return k === f
}

/** 从注册名取模组命名空间；无冒号则整段返回 */
export function modIdOf(id: string): string {
  const colon = id.indexOf(':')
  return colon > 0 ? id.slice(0, colon) : id
}
