/**
 * GET /api/v1/patterns · pattern-providers · patterns/move
 */
import type { Item, PageQuery, PageResult } from './common'

/** 样板模式（与 AE2 IPatternDetails 对齐） */
export type PatternMode = 'crafting' | 'processing' | 'smithing' | 'stonecutting' | 'other'

/** 样板供应器朝向的邻接方块 */
export interface PatternProviderTarget {
  name: string
  blockId: string
  side: string
  pos?: { x: number; y: number; z: number; dimension: string }
}

/** 样板所在供应器（Pattern Provider） */
export interface PatternProvider {
  id: string
  /** 分组显示名：自定义名 > 朝向机器名 > 供应器自身 */
  name: string
  pos?: { x: number; y: number; z: number; dimension: string }
  priority?: number
  /** 样板库存槽位数（vanilla = 9） */
  slotCount?: number
  /** 已占用槽位数 */
  usedSlots?: number
  /** 是否支持槽位读写移动 */
  movable?: boolean
  /** 朝向的方块列表（可空） */
  targets?: PatternProviderTarget[]
}

/** 样板输入槽：主材料 + 可选替代 */
export interface PatternInput {
  item: Item
  /** 倍数（字符串，避免大整数精度丢失） */
  multiplier: string
  alternatives?: Item[]
}

/** 单条样板 DTO；id = patternFingerprint + "@" + provider.id */
export interface Pattern {
  id: string
  /** 编码样板悬停名（砧重命名 / 彩色显示名），可含 § 颜色码 */
  name: string
  mode: PatternMode | string
  /** 在供应器 patternInv 中的下标 */
  slotIndex?: number
  primaryOutput: Item
  outputs: Item[]
  inputs: PatternInput[]
  substitute: boolean
  substituteFluids: boolean
  /** 编码样板物品本身 */
  definition?: Item
  provider?: PatternProvider
}

export interface PatternSlot {
  index: number
  pattern?: Pattern | null
}

export interface PatternProviderBoard extends PatternProvider {
  slots: PatternSlot[]
}

export interface PatternProvidersResponse {
  ok: boolean
  providers: PatternProviderBoard[]
}

export interface PatternSlotRef {
  providerId: string
  slotIndex: number
}

export interface PatternMoveOp {
  from: PatternSlotRef
  to: { providerId: string; slotIndex?: number }
}

export interface PatternMoveRequest {
  moves: PatternMoveOp[]
}

/** GET /api/v1/patterns 查询 */
export interface PatternsQuery extends PageQuery {
  /** 兼容：匹配产出或输入（OR） */
  q?: string
  /** 只匹配产出（primaryOutput / outputs / definition） */
  qOutput?: string
  /** 只匹配输入（inputs + alternatives）；与 qOutput 同时存在时 AND */
  qInput?: string
  /** all | crafting | processing | smithing | stonecutting | other */
  mode?: string
}

/** 样板分页响应 */
export type PatternsResponse = PageResult<Pattern>
