/**
 * 触控/粗指针：长按后指针拖拽（HTML5 DnD 在移动端几乎不可用）。
 * 桌面细指针仍走 HTML5；本 composable 仅在 enabled 时介入。
 */
import { onUnmounted, ref } from 'vue'

const LONG_PRESS_MS = 380
const MOVE_CANCEL_PX = 12
const EDGE_SCROLL_PX = 52

export type PatternDropHit = { providerId: string; slotIndex?: number }

export function usePatternPointerDrag(opts: {
  enabled: () => boolean
  onBegin: (providerId: string, slotIndex: number) => boolean
  onHover: (hit: PatternDropHit | null) => void
  onDrop: (hit: PatternDropHit | null) => void
  onCancel: () => void
}) {
  const ghost = ref<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })
  /** 长按计时中的槽 key，用于按下态反馈 */
  const pressKey = ref('')
  let pressTimer: number | undefined
  let startX = 0
  let startY = 0
  let active = false
  let suppressClickUntil = 0
  let scrollEl: HTMLElement | null = null
  let pendingProviderId = ''
  let pendingSlotIndex = -1

  function shouldSuppressClick() {
    return Date.now() < suppressClickUntil
  }

  function clearPressTimer() {
    if (pressTimer != null) {
      window.clearTimeout(pressTimer)
      pressTimer = undefined
    }
    pressKey.value = ''
  }

  function haptic(ms = 12) {
    try {
      navigator.vibrate?.(ms)
    } catch {
      // ignore
    }
  }

  function hitTest(x: number, y: number): PatternDropHit | null {
    const stack = document.elementsFromPoint(x, y)
    for (const node of stack) {
      if (!(node instanceof Element)) continue
      const slot = node.closest('[data-pattern-drop-slot]') as HTMLElement | null
      if (slot?.dataset.patternProviderId != null && slot.dataset.patternSlotIndex != null) {
        const slotIndex = Number(slot.dataset.patternSlotIndex)
        if (Number.isFinite(slotIndex)) {
          return { providerId: slot.dataset.patternProviderId, slotIndex }
        }
      }
      const board = node.closest('[data-pattern-drop-board]') as HTMLElement | null
      if (board?.dataset.patternProviderId) {
        return { providerId: board.dataset.patternProviderId }
      }
    }
    return null
  }

  function updateAutoScroll(clientY: number) {
    if (!scrollEl) return
    const rect = scrollEl.getBoundingClientRect()
    if (clientY < rect.top + EDGE_SCROLL_PX) {
      const t = (EDGE_SCROLL_PX - (clientY - rect.top)) / EDGE_SCROLL_PX
      scrollEl.scrollTop -= Math.max(2, Math.ceil(14 * t))
    } else if (clientY > rect.bottom - EDGE_SCROLL_PX) {
      const t = (EDGE_SCROLL_PX - (rect.bottom - clientY)) / EDGE_SCROLL_PX
      scrollEl.scrollTop += Math.max(2, Math.ceil(14 * t))
    }
  }

  function onPointerMove(ev: PointerEvent) {
    if (!active) {
      if (pressTimer == null) return
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
        clearPressTimer()
      }
      return
    }
    ev.preventDefault()
    ghost.value = { x: ev.clientX, y: ev.clientY, active: true }
    opts.onHover(hitTest(ev.clientX, ev.clientY))
    updateAutoScroll(ev.clientY)
  }

  function teardownListeners() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  function endDrag(ev: PointerEvent | null, commit: boolean) {
    clearPressTimer()
    teardownListeners()
    document.body.classList.remove('pattern-pointer-dragging')
    ghost.value = { x: ghost.value.x, y: ghost.value.y, active: false }
    if (!active) return
    active = false
    suppressClickUntil = Date.now() + 450
    if (commit && ev) {
      const hit = hitTest(ev.clientX, ev.clientY)
      opts.onDrop(hit)
      if (hit) haptic(10)
    } else {
      opts.onCancel()
    }
  }

  function onPointerUp(ev: PointerEvent) {
    endDrag(ev, true)
  }

  function onPointerCancel() {
    endDrag(null, false)
  }

  function beginActive() {
    if (!opts.onBegin(pendingProviderId, pendingSlotIndex)) {
      clearPressTimer()
      teardownListeners()
      return
    }
    active = true
    pressKey.value = ''
    haptic(16)
    ghost.value = { x: startX, y: startY, active: true }
    document.body.classList.add('pattern-pointer-dragging')
    opts.onHover(hitTest(startX, startY))
  }

  function onPointerDown(
    ev: PointerEvent,
    providerId: string,
    slotIndex: number,
    scrollRoot: HTMLElement | null | undefined,
  ) {
    if (!opts.enabled()) return
    if (ev.button !== 0) return

    scrollEl = scrollRoot ?? null
    startX = ev.clientX
    startY = ev.clientY
    pendingProviderId = providerId
    pendingSlotIndex = slotIndex
    clearPressTimer()
    pressKey.value = `${providerId}:${slotIndex}`
    pressTimer = window.setTimeout(beginActive, LONG_PRESS_MS)

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  onUnmounted(() => {
    clearPressTimer()
    if (active) {
      active = false
      opts.onCancel()
    }
    teardownListeners()
    document.body.classList.remove('pattern-pointer-dragging')
  })

  return {
    ghost,
    pressKey,
    shouldSuppressClick,
    onPointerDown,
  }
}
