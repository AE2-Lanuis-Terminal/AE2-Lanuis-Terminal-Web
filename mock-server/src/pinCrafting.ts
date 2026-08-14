import type { Item } from './types.ts'

export type CraftingJobLike = {
  busy: boolean
  output?: Pick<Item, 'key' | 'id'> & Partial<Item>
}

function rememberKeys(target: Set<string>, item: { key?: string; id?: string }) {
  if (item.key) target.add(item.key)
  if (item.id) target.add(item.id)
}

export function pinCraftingToFront(sorted: Item[], inventory: Item[], jobs: CraftingJobLike[]): Item[] {
  const byKey = new Map<string, Item>()
  for (const it of inventory) {
    if (it.key) byKey.set(it.key, it)
    if (it.id) byKey.set(it.id, it)
  }

  const pinned: Item[] = []
  const pinnedKeys = new Set<string>()
  for (const job of jobs) {
    if (!job.busy || !job.output) continue
    const out = job.output
    if ((out.key && pinnedKeys.has(out.key)) || (out.id && pinnedKeys.has(out.id))) continue
    const live = (out.key ? byKey.get(out.key) : undefined) || (out.id ? byKey.get(out.id) : undefined)
    const row = live ?? ({ ...out } as Item)
    if (!row.key && !row.id) continue
    pinned.push(row)
    rememberKeys(pinnedKeys, row)
    rememberKeys(pinnedKeys, out)
  }

  if (pinned.length === 0) return sorted
  const rest = sorted.filter((it) => !((it.key && pinnedKeys.has(it.key)) || (it.id && pinnedKeys.has(it.id))))
  return [...pinned, ...rest]
}
