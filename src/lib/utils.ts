/**
 * 模块：utils.ts — AE2 Lanuis Web/桌面前端自研逻辑。
 */

import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
