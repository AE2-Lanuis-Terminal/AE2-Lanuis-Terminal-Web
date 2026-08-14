<!--
  用户端终端工作区（与管理端布局分离）。
  桌面未登录：整窗 ConnectionPanel；Web 未登录：浮层。
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, defineAsyncComponent, type ComponentPublicInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRealtimeStore } from '../stores/realtime'
import ConnectionPanel from '../components/ConnectionPanel.vue'
import MeControllerLogo from '../components/MeControllerLogo.vue'
import NetworkStatusChip from '../components/NetworkStatusChip.vue'
import RainbowTitle from '../components/RainbowTitle.vue'
import SettingsButton from '../components/SettingsButton.vue'
import WindowTitlebarControls from '../components/WindowTitlebarControls.vue'
import { bindTauriWindowDragRegion } from '../composables/bindTauriWindowDragRegion'
import { applyDesktopWindowMode, toggleMaximizeAppWindow } from '../lib/window'
import { api } from '../api/client'
import { canUseWindowChrome, isTauri } from '../lib/runtime'
import { useCraftJobsStore } from '../stores/craftJobs'

const StoragePanel = defineAsyncComponent(() => import('../components/StoragePanel.vue'))
const JobsPanel = defineAsyncComponent(() => import('../components/JobsPanel.vue'))
const PatternsPanel = defineAsyncComponent(() => import('../components/PatternsPanel.vue'))
const EncodingPanel = defineAsyncComponent(() => import('../components/EncodingPanel.vue'))
const CraftJobsDock = defineAsyncComponent(() => import('../components/CraftJobsDock.vue'))

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const realtime = useRealtimeStore()
const craftJobs = useCraftJobsStore()
const { authenticated, admin, actingAs, pendingModeChoice } = storeToRefs(auth)
const tabs = ['storage', 'jobs', 'patterns', 'encoding'] as const
type TabId = (typeof tabs)[number]
const tab = ref<TabId>('storage')
const network = ref({ online: false, itemTypes: 0, cpuCount: 0, busyCpuCount: 0 })
const desktop = isTauri()
const chrome = canUseWindowChrome()

let detachTitleBarPointerDrag: (() => void) | undefined

function resolveHostElement(el: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (el == null) return null
  if (el instanceof HTMLElement) return el
  const node = (el as ComponentPublicInstance).$el
  return node instanceof HTMLElement ? node : null
}

function setTitleBarRef(el: Element | ComponentPublicInstance | null) {
  detachTitleBarPointerDrag?.()
  detachTitleBarPointerDrag = undefined
  const host = resolveHostElement(el)
  if (!host || !chrome) return
  detachTitleBarPointerDrag = bindTauriWindowDragRegion(host)
}

async function onTitleBarDblclick(e: MouseEvent) {
  if (!chrome) return
  const target = e.target
  if (target instanceof Element && target.closest('[data-tauri-drag-region-exclude]')) return
  await toggleMaximizeAppWindow()
}

async function refreshNetwork() {
  if (!authenticated.value || pendingModeChoice.value) return
  try {
    const data = await api.items(new URLSearchParams({ page: '1', pageSize: '1' }))
    network.value = data.network
  } catch {
    network.value = { online: false, itemTypes: 0, cpuCount: 0, busyCpuCount: 0 }
  }
}

async function syncDesktopWindow() {
  if (!desktop) return
  await applyDesktopWindowMode(authenticated.value ? 'terminal' : 'login')
}

async function returnToAdmin() {
  try {
    await auth.leaveActAs()
  } catch {
    /* ignore */
  }
  auth.chooseShellMode('admin')
  await router.push({ name: 'admin' })
}

function openAdminShell() {
  auth.chooseShellMode('admin')
  void router.push({ name: 'admin' })
}

onMounted(async () => {
  await auth.restoreSession()
  if (auth.admin && auth.shellMode === 'admin' && !auth.actingAs) {
    await router.replace({ name: 'admin' })
    return
  }
  await syncDesktopWindow()
  await refreshNetwork()
  if (authenticated.value && !pendingModeChoice.value) craftJobs.startWatching()
})

onUnmounted(() => {
  detachTitleBarPointerDrag?.()
  craftJobs.stopWatching()
})

watch(authenticated, (v) => {
  void syncDesktopWindow()
  if (v && !pendingModeChoice.value) {
    void refreshNetwork()
    craftJobs.startWatching()
  } else {
    realtime.resetAll()
    craftJobs.stopWatching()
  }
})

watch(pendingModeChoice, (pending) => {
  if (!pending && authenticated.value) {
    void refreshNetwork()
    craftJobs.startWatching()
  }
})

watch(actingAs, () => {
  void refreshNetwork()
})
</script>

<template>
  <ConnectionPanel v-if="desktop && !authenticated" />

  <div v-else class="me-surface flex h-dvh min-h-0 flex-col text-ink">
    <header
      :ref="setTitleBarRef"
      class="ui-glass-bar app-safe-header relative z-50 flex shrink-0 items-center gap-3 border-b pb-1 pl-4 pr-1.5"
      :class="chrome ? 'select-none' : 'px-4'"
      @dblclick="onTitleBarDblclick"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <MeControllerLogo size="sm" :pulse="network.online" />
        <RainbowTitle class="min-w-0" :text="t('common.product')" />
      </div>

      <div class="flex min-w-0 flex-1 items-center overflow-visible">
        <NetworkStatusChip :network="network" @refresh="refreshNetwork" />
      </div>

      <div class="flex h-8 shrink-0 items-center gap-1" data-tauri-drag-region-exclude>
        <button v-if="admin && !actingAs" type="button" class="ui-btn" @click="openAdminShell">
          {{ t('adminShell.open') }}
        </button>
        <SettingsButton />
        <WindowTitlebarControls />
      </div>
    </header>

    <div v-if="actingAs" class="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[0.78rem]">
      <span>{{ t('admin.actingAs', { name: actingAs.playerName || actingAs.playerUuid }) }}</span>
      <button type="button" class="ui-btn !h-7" @click="returnToAdmin">
        {{ t('admin.backToAdmin') }}
      </button>
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col transition-[filter,opacity] duration-200"
      :class="{ 'pointer-events-none select-none opacity-35 blur-[3px]': !authenticated || pendingModeChoice }"
    >
      <nav class="ui-glass-bar flex shrink-0 items-center gap-2 border-b px-4 py-1.5">
        <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          <button v-for="item in tabs" :key="item" type="button" class="ui-tab shrink-0" :class="{ 'ui-tab--active': tab === item }" @click="tab = item">
            {{ t(`tabs.${item}`) }}
          </button>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="ui-btn" @click="refreshNetwork">
            {{ t('common.refresh') }}
          </button>
          <button type="button" class="ui-btn" @click="auth.lock()">
            {{ t('common.lock') }}
          </button>
        </div>
      </nav>

      <main class="flex min-h-0 min-w-[20rem] flex-1 flex-col overflow-hidden px-4 py-3">
        <Transition name="ui-view-fade" mode="out-in">
          <StoragePanel v-if="tab === 'storage' && authenticated && !pendingModeChoice" :key="tab" @network="network = $event" />
          <JobsPanel v-else-if="tab === 'jobs' && authenticated && !pendingModeChoice" :key="tab" />
          <PatternsPanel v-else-if="tab === 'patterns' && authenticated && !pendingModeChoice" :key="tab" />
          <EncodingPanel v-else-if="tab === 'encoding' && authenticated && !pendingModeChoice" :key="tab" />
          <div v-else :key="'idle'" class="flex min-h-[12.5rem] items-center justify-center py-10 text-center text-[0.81rem] text-muted">
            {{ pendingModeChoice ? t('mode.waiting') : t('status.notConnected') }}
          </div>
        </Transition>
      </main>
    </div>

    <ConnectionPanel v-if="!desktop && !authenticated" />
    <CraftJobsDock v-if="authenticated && !pendingModeChoice" />
  </div>
</template>
