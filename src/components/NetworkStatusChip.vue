<!--
  顶栏网络状态：点击展开连接诊断面板（Teleport，避免顶栏裁切）。
-->
<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ChevronDownIcon, RefreshCwIcon, XIcon } from '@lucide/vue'
import type { NetworkSummary } from '../api/client'
import { formatTrafficMb, useRealtimeStore } from '../stores/realtime'

const props = defineProps<{
  network: NetworkSummary
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { t } = useI18n()
const rt = useRealtimeStore()
const { status, live, rttMs, bytesSent, bytesReceived, connectCount, reconnectCount, revision, wsUrl } = storeToRefs(rt)

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const headerConnected = computed(() => props.network.online || live.value)
const wsStateLabel = computed(() => {
  if (status.value === 'open') return t('status.wsOnline')
  if (status.value === 'connecting') return t('status.wsConnecting')
  return t('status.wsOffline')
})
const trafficLabel = computed(() => `↑ ${formatTrafficMb(bytesSent.value)} / ↓ ${formatTrafficMb(bytesReceived.value)} MB`)
const rttLabel = computed(() => (rttMs.value == null ? t('status.rttNone') : t('status.rttValue', { ms: rttMs.value })))
const endpointLabel = computed(() => wsUrl.value || t('status.endpointNone'))

onClickOutside(
  panel,
  () => {
    open.value = false
  },
  { ignore: [root] },
)

function updatePanelPosition() {
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const width = 288
  const left = Math.min(rect.left, window.innerWidth - width - 8)
  panelStyle.value = {
    position: 'fixed',
    top: `${Math.round(rect.bottom + 6)}px`,
    left: `${Math.max(8, Math.round(left))}px`,
    width: `${width}px`,
    zIndex: '200',
  }
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePanelPosition()
  }
}

function closePanel() {
  open.value = false
}

function onReconnect() {
  rt.reconnect()
  emit('refresh')
}

watch(open, async (v) => {
  if (!v) return
  await nextTick()
  updatePanelPosition()
})

useEventListener(window, 'resize', () => {
  if (open.value) updatePanelPosition()
})
useEventListener(
  window,
  'scroll',
  () => {
    if (open.value) updatePanelPosition()
  },
  true,
)

onUnmounted(() => {
  open.value = false
})
</script>

<template>
  <div ref="root" class="relative min-w-0" data-tauri-drag-region-exclude>
    <button
      type="button"
      class="mono inline-flex h-7 max-w-full items-center gap-1.5 rounded-[var(--app-radius-md)] px-1.5 text-[0.69rem] transition-colors hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_14%,transparent)]"
      :aria-expanded="open"
      :aria-label="t('status.details')"
      @click="toggle"
    >
      <span class="ui-status-dot" :class="network.online ? 'bg-green shadow-[0_0_6px_#6fd992]' : 'bg-amber'" />
      <span class="truncate" :class="network.online ? 'text-green' : 'text-amber'">
        {{ network.online ? t('status.online') : t('status.waiting') }}
      </span>
      <ChevronDownIcon class="size-3.5 shrink-0 text-muted transition-transform duration-200" :class="open && 'rotate-180'" aria-hidden="true" />
    </button>
  </div>

  <Teleport to="body">
    <Transition name="ui-overlay-pop">
      <div
        v-if="open"
        ref="panel"
        class="ui-glass-strong overflow-hidden rounded-[var(--app-radius-lg)] border-[color:var(--glass-border)] text-ink shadow-[var(--glass-shadow)]"
        :style="panelStyle"
        role="dialog"
        :aria-label="t('status.details')"
      >
        <div class="flex items-start gap-2 border-b border-line px-3 py-2">
          <span class="mt-1 size-2.5 shrink-0 rounded-[3px]" :class="headerConnected ? 'bg-green shadow-[0_0_6px_#6fd992]' : 'bg-amber'" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <strong class="block truncate text-[0.75rem] font-semibold tracking-[-0.01em]">
              {{ headerConnected ? t('status.liveConnected') : t('status.liveIdle') }}
            </strong>
            <p class="mono m-0 mt-0.5 truncate text-[0.63rem] text-muted">
              {{ t('status.items', { count: network.itemTypes }) }}
              <span class="mx-1 text-line">·</span>
              {{ t('status.cpu', { busy: network.busyCpuCount, total: network.cpuCount }) }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--color-cyan-dim)_16%,transparent)] hover:text-ink"
            :aria-label="t('common.close')"
            @click="closePanel"
          >
            <XIcon class="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <dl class="m-0 px-3 py-1 text-[0.69rem]">
          <div class="flex items-center justify-between gap-3 border-b border-line/70 py-1.5">
            <dt class="m-0 text-muted">{{ t('status.wsLabel') }}</dt>
            <dd class="mono m-0 text-ink" :class="live ? 'text-green' : undefined">{{ wsStateLabel }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-b border-line/70 py-1.5">
            <dt class="m-0 text-muted">{{ t('status.rttLabel') }}</dt>
            <dd class="mono m-0 text-ink">{{ rttLabel }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-b border-line/70 py-1.5">
            <dt class="m-0 text-muted">{{ t('status.trafficLabel') }}</dt>
            <dd class="mono m-0 text-ink">{{ trafficLabel }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-b border-line/70 py-1.5">
            <dt class="m-0 text-muted">{{ t('status.connectsLabel') }}</dt>
            <dd class="mono m-0 text-ink">
              {{ t('status.connectsValue', { connects: connectCount, reconnects: reconnectCount }) }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3 border-b border-line/70 py-1.5">
            <dt class="m-0 text-muted">{{ t('status.revisionLabel') }}</dt>
            <dd class="mono m-0 text-ink">{{ revision }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3 py-1.5">
            <dt class="m-0 shrink-0 text-muted">{{ t('status.endpointLabel') }}</dt>
            <dd class="mono m-0 max-w-[11rem] truncate text-right text-ink" :title="endpointLabel">
              {{ endpointLabel }}
            </dd>
          </div>
        </dl>

        <div class="border-t border-line p-2">
          <button type="button" class="ui-btn flex h-8 w-full items-center justify-center gap-1.5 text-[0.75rem]" @click="onReconnect">
            <RefreshCwIcon class="size-3.5" aria-hidden="true" />
            {{ t('status.reconnect') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
