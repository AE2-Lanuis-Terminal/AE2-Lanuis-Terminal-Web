/**
 * 全局提示便捷入口（默认右上角，适合接口结果）。
 */
import { useToastStore, type PushToastInput, type ToastPosition } from '@/stores/toast'

export type { ToastPosition, PushToastInput }

export function toast() {
  return useToastStore()
}

export function toastSuccess(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
  return useToastStore().success(message, { position: 'top-right', ...opts })
}

export function toastError(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
  return useToastStore().error(message, { position: 'top-right', ...opts })
}

export function toastInfo(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
  return useToastStore().info(message, { position: 'top-right', ...opts })
}

export function toastWarning(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
  return useToastStore().warning(message, { position: 'top-right', ...opts })
}
