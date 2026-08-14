/**
 * Mock 供应器 9 槽内存板：由 mockPatterns 初始化，支持 move。
 */
import { mockPatterns } from './data.ts'
import type { Pattern, PatternProvider } from './types.ts'

export type PatternSlot = { index: number; pattern: Pattern | null }

export type ProviderBoard = PatternProvider & {
  slotCount: number
  usedSlots: number
  movable: boolean
  slots: PatternSlot[]
}

const SLOT_COUNT = 9

function clonePattern(p: Pattern, provider: PatternProvider, slotIndex: number): Pattern {
  return {
    ...p,
    id: `${p.id.split('@')[0]}@${provider.id}`,
    slotIndex,
    provider: { ...provider },
    primaryOutput: p.primaryOutput ? { ...p.primaryOutput } : p.primaryOutput,
    outputs: p.outputs.map((o) => ({ ...o })),
    inputs: p.inputs.map((inp) => ({
      ...inp,
      item: { ...inp.item },
      alternatives: inp.alternatives?.map((a) => ({ ...a })),
    })),
    definition: p.definition ? { ...p.definition } : undefined,
  }
}

function emptySlots(): PatternSlot[] {
  return Array.from({ length: SLOT_COUNT }, (_, index) => ({ index, pattern: null }))
}

function buildBoards(): ProviderBoard[] {
  const byId = new Map<string, ProviderBoard>()
  for (const p of mockPatterns) {
    const provider = p.provider
    if (!provider?.id) continue
    let board = byId.get(provider.id)
    if (!board) {
      board = {
        ...provider,
        slotCount: SLOT_COUNT,
        usedSlots: 0,
        movable: true,
        slots: emptySlots(),
      }
      byId.set(provider.id, board)
    }
    const empty = board.slots.find((s) => !s.pattern)
    if (!empty) continue
    empty.pattern = clonePattern(p, board, empty.index)
  }
  for (const board of byId.values()) {
    board.usedSlots = board.slots.filter((s) => s.pattern).length
  }
  return [...byId.values()].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
}

let boards: ProviderBoard[] = buildBoards()

export function listProviderBoards(): ProviderBoard[] {
  return boards.map((b) => {
    const { slots, ...providerMeta } = b
    return {
      ...b,
      usedSlots: slots.filter((s) => s.pattern).length,
      slots: slots.map((s) => ({
        index: s.index,
        pattern: s.pattern
          ? {
              ...s.pattern,
              slotIndex: s.index,
              provider: { ...providerMeta },
            }
          : null,
      })),
    }
  })
}

export function listPatternsFlat(): Pattern[] {
  const out: Pattern[] = []
  for (const b of boards) {
    for (const s of b.slots) {
      if (s.pattern) out.push({ ...s.pattern, slotIndex: s.index, provider: { ...b } })
    }
  }
  return out
}

export function resetPatternBoards() {
  boards = buildBoards()
}

type SlotRef = { providerId: string; slotIndex: number }
type MoveOp = { from: SlotRef; to: { providerId: string; slotIndex?: number } }

export function movePatterns(ops: MoveOp[]): void {
  if (!ops.length) throw Object.assign(new Error('moves must not be empty'), { code: 'bad_request', status: 400 })

  type Snap = { id: string; slots: (Pattern | null)[] }
  const working = new Map<string, Snap>()

  function ensure(id: string): Snap {
    let s = working.get(id)
    if (s) return s
    const board = boards.find((b) => b.id === id)
    if (!board || !board.movable) {
      throw Object.assign(new Error(`Provider not found or not movable: ${id}`), {
        code: 'provider_not_found',
        status: 400,
      })
    }
    s = { id, slots: board.slots.map((x) => (x.pattern ? { ...x.pattern } : null)) }
    working.set(id, s)
    return s
  }

  for (const op of ops) {
    const from = ensure(op.from.providerId)
    const to = op.from.providerId === op.to.providerId ? from : ensure(op.to.providerId)
    const fromSlot = op.from.slotIndex
    if (fromSlot < 0 || fromSlot >= from.slots.length) {
      throw Object.assign(new Error('Invalid source slotIndex'), { code: 'bad_slot', status: 400 })
    }
    const src = from.slots[fromSlot]
    if (!src) {
      throw Object.assign(new Error('Source slot is empty'), { code: 'slot_empty', status: 400 })
    }
    let toSlot = op.to.slotIndex
    if (toSlot == null) {
      toSlot = to.slots.findIndex((p, i) => !p && !(op.from.providerId === op.to.providerId && i === fromSlot))
      if (toSlot < 0) {
        throw Object.assign(new Error('Target provider has no empty slot'), { code: 'target_full', status: 400 })
      }
    }
    if (toSlot < 0 || toSlot >= to.slots.length) {
      throw Object.assign(new Error('Invalid target slotIndex'), { code: 'bad_slot', status: 400 })
    }
    if (op.from.providerId === op.to.providerId && fromSlot === toSlot) continue
    const dest = to.slots[toSlot]
    from.slots[fromSlot] = dest
    to.slots[toSlot] = src
  }

  for (const snap of working.values()) {
    const board = boards.find((b) => b.id === snap.id)!
    board.slots = snap.slots.map((pattern, index) => ({
      index,
      pattern: pattern ? clonePattern(pattern, board, index) : null,
    }))
    board.usedSlots = board.slots.filter((s) => s.pattern).length
  }
}
