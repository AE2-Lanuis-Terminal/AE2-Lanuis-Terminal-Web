/**
 * 将正在合成的产出置顶，对齐 AE2 终端 pin 行（非公开 PinnedKeys）。
 * 使用库存数量，不用 job.output 的请求量；同物品多 CPU 只留一行。
 * 默认不受当前搜索/筛选影响；onlyPresent 时只重排已在列表中的行（当前页安全网）。
 */
import type { Item } from '@/types'

export type CraftingJobLike = {
  busy: boolean
  output?: Pick<Item, 'key' | 'id'> & Partial<Item>
}

function rememberKeys(target: Set<string>, item: { key?: string; id?: string }) {
  if (item.key) target.add(item.key)
  if (item.id) target.add(item.id)
}

/** 拆出置顶行与其余列表，供 UI 分两行网格渲染 */
export function partitionPinnedCrafting(sorted: Item[], inventory: Item[], jobs: CraftingJobLike[], opts?: { onlyPresent?: boolean }): { pinned: Item[]; rest: Item[] } {
  const onlyPresent = opts?.onlyPresent === true
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
    if (!live && onlyPresent) continue
    const row = live ?? ({ ...out } as Item)
    if (!row.key && !row.id) continue
    pinned.push(row)
    rememberKeys(pinnedKeys, row)
    rememberKeys(pinnedKeys, out)
  }

  if (pinned.length === 0) return { pinned: [], rest: sorted }

  const rest = sorted.filter((it) => !((it.key && pinnedKeys.has(it.key)) || (it.id && pinnedKeys.has(it.id))))
  return { pinned, rest }
}

export function pinCraftingToFront(sorted: Item[], inventory: Item[], jobs: CraftingJobLike[], opts?: { onlyPresent?: boolean }): Item[] {
  const { pinned, rest } = partitionPinnedCrafting(sorted, inventory, jobs, opts)
  if (pinned.length === 0) return sorted
  return [...pinned, ...rest]
}
