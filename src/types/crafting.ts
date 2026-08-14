/**
 * 合成：catalog / plan / submit / jobs / cancel
 */
import type { Item, OkResult, PageQuery, PageResult } from './common'

/** GET /api/v1/crafting/catalog 查询 */
export interface CatalogQuery extends PageQuery {
  q?: string
  sort?: string
}

/** 可合成目录响应（字段同分页结果） */
export type CatalogResponse = PageResult<Item>

/** POST /api/v1/crafting/plan 请求 */
export interface CraftPlanRequest {
  key: string
  amount: string
}

/** 配方树边：材料 + 可选子树 */
export interface CraftRecipeTreeInput {
  item?: Item
  missing?: boolean
  child?: CraftRecipeTreeNode
}

/** 合成计划配方树节点（递归） */
export interface CraftRecipeTreeNode {
  output?: Item
  times: string
  /** pattern mode 或 "leaf" */
  mode?: string
  patternId?: string
  missing?: boolean
  inputs: CraftRecipeTreeInput[]
}

/** 合成计划中可选的合成 CPU */
export interface CraftPlanCpu {
  cpuName: string
  busy: boolean
  bytesAvailable: string
  coProcessors: number
  /** 空闲且存储足够当前计划 */
  suitable: boolean
}

/** 合成计划响应 */
export interface CraftPlanResponse {
  planId: string
  ok: boolean
  /** 缺料 / 字节不足 / 无空闲 CPU 时为 false */
  canSubmit: boolean
  bytes: string
  bytesAvailable: string
  coProcessors: number
  cpuCount: number
  idleCpuCount: number
  multiplePaths: boolean
  usedItems: Item[]
  tree?: CraftRecipeTreeNode
  /** 可选 CPU 列表（含忙碌；suitable 表示可提交到该 CPU） */
  cpus?: CraftPlanCpu[]
  warning: string
  missing: Item[]
  output: Item
}

/** POST /api/v1/crafting/submit 请求 */
export interface CraftSubmitRequest {
  planId?: string
  key?: string
  amount?: string
  /** 指定合成 CPU；省略则自动选择 */
  cpuName?: string
}

/** 提交合成响应 */
export interface CraftSubmitResponse {
  ok: boolean
  message: string
  jobId?: string
}

/** 单个合成 CPU 任务行 */
export interface CraftJob {
  cpuName: string
  busy: boolean
  status: string
  detail?: string
  /** 目标产出（忙碌时） */
  output?: Item
  /** 合成树已处理量（进度条）；脏数据时可能等于 crafted */
  progress?: string
  /** 合成树总量；脏数据时可能等于 requested */
  totalItems?: string
  /** 0–100；优先来自合成树，否则最终产物比例 */
  progressPercent?: number
  /** 最终产物已交付量 */
  crafted?: string
  /** 最终产物请求量 */
  requested?: string
  /** 已耗时（纳秒） */
  elapsedNanos?: string
}

/** GET /api/v1/crafting/jobs 响应 */
export interface CraftJobsResponse {
  jobs: CraftJob[]
}

/** POST /api/v1/crafting/cancel 请求 */
export interface CraftCancelRequest {
  cpuName: string
}

/** 取消任务响应 */
export interface CraftCancelResponse extends OkResult {
  message: string
}
