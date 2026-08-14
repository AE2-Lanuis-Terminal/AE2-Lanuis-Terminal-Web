/**
 * 跨接口共用结构。
 */

import type { ItemKindId } from '@/lib/itemKind'

/** ME 库存/合成目录行 */
export interface Item {
  /** 服务端稳定键（提交合成用） */
  key: string
  /** 注册名或流体 id */
  id: string
  /** 展示名 */
  displayName: string
  /** 数量字符串，避免大整数精度丢失 */
  amount: string
  /** 是否可自动合成 */
  craftable: boolean
  /**
   * 条目类型：item / fluid / other；未来可扩展。
   * 缺省时前端用 isFluid / key 前缀回退。
   */
  kind?: ItemKindId | string
  /** @deprecated 兼容旧接口；请用 kind。true 等价 kind=fluid */
  isFluid?: boolean
  /** 一「单位」对应的内部数量（流体 Forge 常为 1000 mB） */
  amountPerUnit?: number
  iconUrl?: string
}

/** 通用分页查询 */
export interface PageQuery {
  page?: number
  pageSize?: number
}

/** 仅含 ok 的成功体 */
export interface OkResult {
  ok: boolean
}

/** 库存接口附带的网络摘要 */
export interface NetworkSummary {
  online: boolean
  itemTypes: number
  cpuCount: number
  busyCpuCount: number
}

/** 通用分页结果 */
export interface PageResult<T> {
  page: number
  pageSize: number
  total: number
  items: T[]
}
