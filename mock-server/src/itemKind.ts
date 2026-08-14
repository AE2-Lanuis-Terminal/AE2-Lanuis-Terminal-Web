/** 库存 kind 筛选（自包含，不引用前端 @/lib） */

export type ItemKindId = 'item' | 'fluid' | 'other'

export function resolveItemKind(item: { kind?: string | null }): ItemKindId {
  const raw = (item.kind || '').trim().toLowerCase()
  if (raw === 'item' || raw === 'fluid' || raw === 'other') return raw
  return 'other'
}

export function matchesKindFilter(itemKind: ItemKindId | string, filter: string): boolean {
  const f = (filter || 'all').toLowerCase()
  if (!f || f === 'all') return true
  const k = resolveItemKind({ kind: itemKind })
  if (f === 'other') return k !== 'item' && k !== 'fluid'
  return k === f
}

export function modIdOf(id: string): string {
  const colon = id.indexOf(':')
  return colon > 0 ? id.slice(0, colon) : id
}
