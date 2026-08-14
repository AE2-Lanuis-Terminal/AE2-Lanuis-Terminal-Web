/**
 * 合成任务轮询、完成推送开关与右下角 Toast。
 * 登录后全局 watch；JobsPanel / Dock 共用同一份 jobs。
 * 右下角进度仅显示用户在任务列表里手动 pin 的忙碌任务。
 */

import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api/client'
import { ensureCraftNotifyPermission, notifyCraftComplete } from '@/lib/craftNotify'
import type { CraftJob, Item } from '@/types'

const NOTIFY_KEY = 'ae2lanuis.craftNotifyComplete'
const POLL_BUSY_MS = 2000
const POLL_IDLE_MS = 5000
const TOAST_TTL_MS = 6000

export type CraftCompleteToast = {
  id: string
  cpuName: string
  output?: Item
  detail?: string
  createdAt: number
}

function readNotifyComplete(): boolean {
  const v = localStorage.getItem(NOTIFY_KEY)
  if (v === '0' || v === 'off' || v === 'false') return false
  return true
}

function jobSnapshot(job: CraftJob) {
  return {
    busy: job.busy,
    output: job.output,
    detail: job.detail,
  }
}

export const useCraftJobsStore = defineStore('craftJobs', () => {
  const jobs = ref<CraftJob[]>([])
  const message = ref('')
  const notifyComplete = ref(readNotifyComplete())
  const toasts = ref<CraftCompleteToast[]>([])
  const dockCollapsed = ref(false)
  const watching = ref(false)
  /** 用户手动 pin 的 CPU 名；空闲后自动移除 */
  const pinnedCpuNames = ref<string[]>([])

  /** cpuName → 上一轮忙碌快照（用于检测完成） */
  let prev = new Map<string, ReturnType<typeof jobSnapshot>>()
  let timer: number | undefined
  const toastTimers = new Map<string, number>()

  const busyJobs = computed(() => jobs.value.filter((j) => j.busy))
  const pinnedBusyJobs = computed(() => jobs.value.filter((j) => j.busy && pinnedCpuNames.value.includes(j.cpuName)))

  function isPinned(cpuName: string) {
    return pinnedCpuNames.value.includes(cpuName)
  }

  function pinJob(cpuName: string) {
    if (pinnedCpuNames.value.includes(cpuName)) return
    pinnedCpuNames.value = [...pinnedCpuNames.value, cpuName]
  }

  function unpinJob(cpuName: string) {
    pinnedCpuNames.value = pinnedCpuNames.value.filter((n) => n !== cpuName)
  }

  function togglePin(cpuName: string) {
    if (isPinned(cpuName)) unpinJob(cpuName)
    else pinJob(cpuName)
  }

  /** 任务空闲或消失时清掉 pin，避免残留空卡片 */
  function prunePins(next: CraftJob[]) {
    const busyNames = new Set(next.filter((j) => j.busy).map((j) => j.cpuName))
    pinnedCpuNames.value = pinnedCpuNames.value.filter((n) => busyNames.has(n))
  }

  function setNotifyComplete(enabled: boolean) {
    notifyComplete.value = enabled
    localStorage.setItem(NOTIFY_KEY, enabled ? '1' : '0')
    if (enabled) void ensureCraftNotifyPermission()
  }

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
    const handle = toastTimers.get(id)
    if (handle != null) {
      window.clearTimeout(handle)
      toastTimers.delete(id)
    }
  }

  function pushToast(cpuName: string, snap: ReturnType<typeof jobSnapshot>) {
    const id = `${cpuName}-${Date.now()}`
    toasts.value = [
      ...toasts.value,
      {
        id,
        cpuName,
        output: snap.output,
        detail: snap.detail,
        createdAt: Date.now(),
      },
    ].slice(-5)
    const handle = window.setTimeout(() => dismissToast(id), TOAST_TTL_MS)
    toastTimers.set(id, handle)
    void notifyCraftComplete({
      cpuName,
      displayName: snap.output?.displayName,
      detail: snap.detail,
    })
  }

  function detectCompletions(next: CraftJob[]) {
    if (!notifyComplete.value) {
      return
    }
    for (const [cpuName, snap] of prev) {
      if (!snap.busy || !snap.output) continue
      const cur = next.find((j) => j.cpuName === cpuName)
      // 仅当该 CPU 整单结束（busy→idle）才推送；处理样板中途交付不触发
      if (cur?.busy) continue
      pushToast(cpuName, snap)
    }
  }

  function scheduleNext() {
    window.clearTimeout(timer)
    if (!watching.value) return
    const ms = busyJobs.value.length > 0 ? POLL_BUSY_MS : POLL_IDLE_MS
    timer = window.setTimeout(() => void refresh(), ms)
  }

  async function refresh() {
    if (!watching.value) return
    try {
      const data = await api.jobs()
      detectCompletions(data.jobs)
      prunePins(data.jobs)
      const nextPrev = new Map<string, ReturnType<typeof jobSnapshot>>()
      for (const job of data.jobs) {
        nextPrev.set(job.cpuName, jobSnapshot(job))
      }
      prev = nextPrev
      jobs.value = data.jobs
      message.value = ''
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    } finally {
      scheduleNext()
    }
  }

  async function cancel(cpuName: string) {
    try {
      await api.cancel(cpuName)
      message.value = ''
      const snap = prev.get(cpuName)
      if (snap) prev.set(cpuName, { ...snap, busy: false })
      unpinJob(cpuName)
      await refresh()
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    }
  }

  function startWatching() {
    if (watching.value) return
    watching.value = true
    if (notifyComplete.value) void ensureCraftNotifyPermission()
    void refresh()
  }

  function stopWatching() {
    watching.value = false
    window.clearTimeout(timer)
    timer = undefined
    jobs.value = []
    message.value = ''
    pinnedCpuNames.value = []
    prev = new Map()
    for (const id of [...toastTimers.keys()]) dismissToast(id)
  }

  function setDockCollapsed(v: boolean) {
    dockCollapsed.value = v
  }

  return {
    jobs,
    busyJobs,
    pinnedBusyJobs,
    pinnedCpuNames,
    message,
    notifyComplete,
    toasts,
    dockCollapsed,
    watching,
    isPinned,
    pinJob,
    unpinJob,
    togglePin,
    setNotifyComplete,
    setDockCollapsed,
    dismissToast,
    refresh,
    cancel,
    startWatching,
    stopWatching,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCraftJobsStore, import.meta.hot))
}
