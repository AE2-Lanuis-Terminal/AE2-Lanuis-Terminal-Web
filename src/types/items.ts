/**
 * GET /api/v1/items
 */
import type { Item, NetworkSummary, PageQuery, PageResult } from './common'

/** 库存列表查询 */
export interface ItemsQuery extends PageQuery {
  q?: string
  /** all | item | fluid | other（other=非 item/fluid，含未来未注册类型） */
  kind?: string
  /** all | stocked | craftable */
  filter?: string
  /** name | amount | mod */
  sort?: string
  /** asc | desc */
  order?: string
}

/** 库存列表响应 */
export interface ItemsResponse extends PageResult<Item> {
  network: NetworkSummary
  /** 服务端网格内容指纹；未变时可跳过推送 */
  contentRevision?: number
}
