/**
 * 全局浮层提示：支持 8 个锚点位置；接口类默认右上角。
 */
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type ToastVariant = 'info' | 'success' | 'error' | 'warning'

export type ToastItem = {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  position: ToastPosition
  createdAt: number
}

export type PushToastInput = {
  message: string
  title?: string
  variant?: ToastVariant
  /** 默认 top-right（接口提示） */
  position?: ToastPosition
  /** ms；默认 4200；0 不自动关闭 */
  duration?: number
}

const DEFAULT_POSITION: ToastPosition = 'top-right'
const DEFAULT_DURATION = 4200
const MAX_PER_CORNER = 5

let seq = 0

export const TOAST_POSITIONS: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])
  const timers = new Map<string, number>()

  const byPosition = computed(() => {
    const map = Object.fromEntries(TOAST_POSITIONS.map((p) => [p, [] as ToastItem[]])) as Record<ToastPosition, ToastItem[]>
    for (const item of items.value) map[item.position].push(item)
    return map
  })

  function dismiss(id: string) {
    items.value = items.value.filter((t) => t.id !== id)
    const handle = timers.get(id)
    if (handle != null) {
      window.clearTimeout(handle)
      timers.delete(id)
    }
  }

  function clearPosition(position: ToastPosition) {
    for (const t of items.value.filter((x) => x.position === position)) dismiss(t.id)
  }

  function push(input: PushToastInput) {
    const id = `toast-${Date.now()}-${++seq}`
    const position = input.position ?? DEFAULT_POSITION
    const variant = input.variant ?? 'info'
    const duration = input.duration ?? DEFAULT_DURATION

    const existing = items.value.filter((t) => t.position === position)
    if (existing.length >= MAX_PER_CORNER) {
      dismiss(existing[0]!.id)
    }

    items.value = [
      ...items.value,
      {
        id,
        title: input.title,
        message: input.message,
        variant,
        position,
        createdAt: Date.now(),
      },
    ]

    if (duration > 0) {
      timers.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      )
    }
    return id
  }

  function success(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
    return push({ ...opts, message, variant: 'success' })
  }

  function error(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
    return push({ ...opts, message, variant: 'error' })
  }

  function info(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
    return push({ ...opts, message, variant: 'info' })
  }

  function warning(message: string, opts?: Omit<PushToastInput, 'message' | 'variant'>) {
    return push({ ...opts, message, variant: 'warning' })
  }

  function clearAll() {
    for (const id of [...timers.keys()]) dismiss(id)
    items.value = []
  }

  return {
    items,
    byPosition,
    push,
    success,
    error,
    info,
    warning,
    dismiss,
    clearPosition,
    clearAll,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useToastStore, import.meta.hot))
}
