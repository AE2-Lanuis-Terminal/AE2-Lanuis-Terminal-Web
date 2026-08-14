/**
 * ME 数量展示：物品用 k/M/G 缩写；流体按 amountPerUnit 换算桶/mB。
 */
import type { Item } from '@/types'
import { resolveItemKind } from '@/lib/itemKind'

const DEFAULT_FLUID_UNIT = 1000n

const COMPACT_UNITS = [
  { div: 10n ** 18n, suffix: 'E' },
  { div: 10n ** 15n, suffix: 'P' },
  { div: 10n ** 12n, suffix: 'T' },
  { div: 10n ** 9n, suffix: 'G' },
  { div: 10n ** 6n, suffix: 'M' },
  /** 未满 10k 保持原样，避免千级过早缩写 */
  { div: 10n ** 3n, suffix: 'k', min: 10n ** 4n },
] as const

/** 大整数紧凑显示（≥10k 起用 k/M/G…） */
export function formatCompactCount(amount: string | number | bigint): string {
  const n = typeof amount === 'bigint' ? amount : BigInt(amount || '0')
  const abs = n < 0n ? -n : n
  for (const u of COMPACT_UNITS) {
    const min = 'min' in u ? u.min : u.div
    if (abs >= min) {
      const whole = abs / u.div
      const rem = abs % u.div
      const tenths = (rem * 10n) / u.div
      const hundredths = ((rem * 100n) / u.div) % 10n
      let body = whole.toString()
      if (tenths > 0n || hundredths > 0n) {
        body += `.${tenths}${hundredths > 0n ? hundredths : ''}`
      } else if (whole < 10n) {
        // 个位数单位时保留一位小数观感，与 AE 终端接近
        body += '.0'
      }
      return `${n < 0n ? '-' : ''}${body}${u.suffix}`
    }
  }
  return n.toString()
}

export function formatStackAmount(item: Pick<Item, 'amount' | 'kind' | 'amountPerUnit'>): string {
  const raw = BigInt(item.amount || '0')
  if (resolveItemKind(item) !== 'fluid') {
    return formatCompactCount(raw)
  }
  const unit = item.amountPerUnit && item.amountPerUnit > 0 ? BigInt(item.amountPerUnit) : DEFAULT_FLUID_UNIT
  if (raw < unit) {
    return `${raw} mB`
  }
  const whole = raw / unit
  const rem = raw % unit
  if (rem === 0n) {
    return `${formatCompactCount(whole)} B`
  }
  // 桶整数部分可缩写；小数部分仅在未缩写时展示
  if (whole >= 10000n) {
    return `${formatCompactCount(whole)} B`
  }
  const millis = (rem * 1000n) / unit
  const frac = millis.toString().padStart(3, '0').replace(/0+$/, '')
  return `${whole}.${frac} B`
}

/** 弹窗内展示的精确数量（物品为个数，流体为内部单位 mB） */
export function formatExactAmount(item: Pick<Item, 'amount' | 'kind'>): string {
  const raw = item.amount || '0'
  return resolveItemKind(item) === 'fluid' ? `${raw} mB` : raw
}
