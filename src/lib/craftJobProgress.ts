/**
 * 合成任务进度展示：优先最终产物数量（crafted/requested），进度条用 progressPercent。
 */
import type { CraftJob } from '@/types/crafting'

export type CraftJobProgressFields = Pick<CraftJob, 'progress' | 'totalItems' | 'progressPercent' | 'crafted' | 'requested'>

/** 数量文案：优先已交付/请求量；否则用进度百分比估算 */
export function jobQuantity(job: CraftJobProgressFields): { progress: string; total: string } | null {
  if (job.requested != null) {
    if (job.crafted != null) return { progress: job.crafted, total: job.requested }
    const pct = Number(job.progressPercent)
    if (Number.isFinite(pct)) {
      try {
        const total = BigInt(job.requested)
        if (total <= 0n) return { progress: '0', total: job.requested }
        let done = BigInt(Math.round((Number(total) * Math.min(100, Math.max(0, pct))) / 100))
        if (pct < 99.5 && done >= total) done = total - 1n
        if (pct <= 0) done = 0n
        return { progress: done.toString(), total: job.requested }
      } catch {
        return { progress: '0', total: job.requested }
      }
    }
    return { progress: '0', total: job.requested }
  }
  if (job.progress != null && job.totalItems != null) {
    return { progress: job.progress, total: job.totalItems }
  }
  return null
}

export function jobProgressPercent(job: CraftJobProgressFields): number | null {
  const n = Number(job.progressPercent)
  if (Number.isFinite(n)) return Math.min(100, Math.max(0, n))
  const ratio = (done?: string, total?: string) => {
    if (done == null || total == null) return null
    try {
      const p = BigInt(done)
      const t = BigInt(total)
      if (t <= 0n) return null
      return Math.min(100, Math.max(0, Number((p * 1000n) / t) / 10))
    } catch {
      return null
    }
  }
  return ratio(job.crafted, job.requested) ?? ratio(job.progress, job.totalItems)
}

export function hasJobProgress(job: CraftJobProgressFields): boolean {
  return jobQuantity(job) != null || jobProgressPercent(job) != null
}
