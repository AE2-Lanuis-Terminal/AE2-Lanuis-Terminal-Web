/**
 * 存储 WebSocket 连接诊断：RTT / 流量 / 重连等，供顶栏状态面板读取。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { NetworkSummary } from '@/types'

export type RealtimeLinkStatus = 'idle' | 'connecting' | 'open' | 'closed'

export const useRealtimeStore = defineStore('realtime', () => {
  const status = ref<RealtimeLinkStatus>('idle')
  const pushIntervalMs = ref(0)
  const rttMs = ref<number | null>(null)
  const bytesSent = ref(0)
  const bytesReceived = ref(0)
  const connectCount = ref(0)
  const reconnectCount = ref(0)
  const revision = ref(0)
  const wsUrl = ref('')
  const network = ref<NetworkSummary>({
    online: false,
    itemTypes: 0,
    cpuCount: 0,
    busyCpuCount: 0,
  })

  let reconnectHandler: (() => void) | null = null

  const live = computed(() => status.value === 'open')

  function resetSessionCounters() {
    bytesSent.value = 0
    bytesReceived.value = 0
    rttMs.value = null
    revision.value = 0
  }

  function resetAll() {
    status.value = 'idle'
    pushIntervalMs.value = 0
    resetSessionCounters()
    connectCount.value = 0
    reconnectCount.value = 0
    wsUrl.value = ''
    network.value = { online: false, itemTypes: 0, cpuCount: 0, busyCpuCount: 0 }
    reconnectHandler = null
  }

  function setReconnectHandler(fn: (() => void) | null) {
    reconnectHandler = fn
  }

  function reconnect() {
    reconnectHandler?.()
  }

  function noteSent(bytes: number) {
    bytesSent.value += bytes
  }

  function noteReceived(bytes: number) {
    bytesReceived.value += bytes
  }

  return {
    status,
    live,
    pushIntervalMs,
    rttMs,
    bytesSent,
    bytesReceived,
    connectCount,
    reconnectCount,
    revision,
    wsUrl,
    network,
    resetSessionCounters,
    resetAll,
    setReconnectHandler,
    reconnect,
    noteSent,
    noteReceived,
  }
})

export function formatTrafficMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2)
}
