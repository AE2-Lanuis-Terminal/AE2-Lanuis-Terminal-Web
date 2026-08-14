/**
 * 模块：utils.ts — AE2 Lanuis Web/桌面前端自研逻辑。
 */

import type { ButtonVariants } from '@/components/ui/button'
import { preferTouchTargets } from '@/lib/platform'
import { cn } from '@/lib/utils'

type BtnSize = NonNullable<ButtonVariants['size']>

/** 触控端放大一档；桌面保持紧凑 */
export function touchAwareSize(desktop: BtnSize = 'default'): BtnSize {
  if (!preferTouchTargets()) return desktop
  if (desktop === 'xs' || desktop === 'sm') return 'default'
  if (desktop === 'default') return 'lg'
  if (desktop === 'icon-xs' || desktop === 'icon-sm') return 'icon'
  if (desktop === 'icon') return 'icon-lg'
  return desktop
}

export function fieldClass(extra?: string) {
  return cn(
    'h-9 rounded-[var(--app-radius-md)] border-[color:var(--glass-border)] bg-[var(--glass-bg-soft)] text-[13px] text-ink shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-[10px]',
    'placeholder:text-muted focus-visible:border-cyan/55 focus-visible:ring-cyan/20',
    preferTouchTargets() && 'h-11 text-[15px]',
    extra,
  )
}

/** 带 prefix / affix 的外壳：边框与玻璃态落在容器上 */
export function affixShellClass(compact?: boolean, extra?: string) {
  return cn(
    'group/affix flex min-w-0 items-center gap-0.5 rounded-[var(--app-radius-md)] border border-[color:var(--glass-border)] bg-[var(--glass-bg-soft)] text-[13px] text-ink shadow-[inset_0_1px_0_var(--glass-highlight)] backdrop-blur-[10px]',
    'hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-bg)]',
    'focus-within:border-cyan/55 focus-within:ring-2 focus-within:ring-cyan/20',
    'has-[[data-state=open]]:border-[color:var(--glass-border-bright)] has-[[data-state=open]]:bg-[var(--glass-bg)]',
    compact ? 'h-8' : 'h-9',
    preferTouchTargets() && !compact && 'h-11 text-[15px]',
    extra,
  )
}

/** 嵌入 affix 外壳内的输入 / 触发器：去掉自身边框 */
export function affixInnerClass(extra?: string) {
  return cn('h-full min-h-0 min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none ring-0', 'focus-visible:border-transparent focus-visible:ring-0', extra)
}

/** affix / prefix 内可点击控件 */
export function affixActionClass(extra?: string) {
  return cn(
    'inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-[var(--app-radius-sm)] px-1.5 text-[12px] font-medium text-muted transition-colors',
    'hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_18%,transparent)] hover:text-ink',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/25',
    'disabled:pointer-events-none disabled:opacity-50',
    extra,
  )
}
