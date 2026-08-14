<!--
  管理端独立壳：网络列表 + 审计日志；视觉与用户终端分离。
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { AdminBinding, AuditEntry } from '@/types'
import { AppButton, AppField, AppInput } from '@/ui'
import ScrollFade from '@/components/ScrollFade.vue'
import WindowTitlebarControls from '@/components/WindowTitlebarControls.vue'
import SettingsButton from '@/components/SettingsButton.vue'
import { canUseWindowChrome } from '@/lib/runtime'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { account, admin } = storeToRefs(auth)
const chrome = canUseWindowChrome()

const section = ref<'networks' | 'logs'>('networks')
const bindings = ref<AdminBinding[]>([])
const bindMsg = ref('')
const bindErr = ref(false)
const bindBusy = ref(false)

const logs = ref<AuditEntry[]>([])
const logQ = ref('')
const logPage = ref(1)
const logTotal = ref(0)
const logMsg = ref('')
const logErr = ref(false)
const logBusy = ref(false)
const pageSize = 50

const onlineCount = computed(() => bindings.value.filter((b) => b.networkOnline).length)

async function refreshBindings() {
  bindBusy.value = true
  bindErr.value = false
  bindMsg.value = t('common.loading')
  try {
    const res = await api.adminBindings()
    bindings.value = res.bindings || []
    bindMsg.value = t('admin.loaded', { total: res.total ?? bindings.value.length })
  } catch (e) {
    bindErr.value = true
    bindMsg.value = e instanceof Error ? e.message : String(e)
    bindings.value = []
  } finally {
    bindBusy.value = false
  }
}

async function refreshLogs() {
  logBusy.value = true
  logErr.value = false
  logMsg.value = t('common.loading')
  try {
    const params = new URLSearchParams({
      page: String(logPage.value),
      pageSize: String(pageSize),
    })
    if (logQ.value.trim()) params.set('q', logQ.value.trim())
    const res = await api.adminAudit(params)
    logs.value = res.entries || []
    logTotal.value = res.total ?? 0
    logMsg.value = t('adminLogs.loaded', { total: logTotal.value })
  } catch (e) {
    logErr.value = true
    logMsg.value = e instanceof Error ? e.message : String(e)
    logs.value = []
  } finally {
    logBusy.value = false
  }
}

function queryLogs() {
  logPage.value = 1
  void refreshLogs()
}

function prevLogPage() {
  logPage.value--
  void refreshLogs()
}

function nextLogPage() {
  logPage.value++
  void refreshLogs()
}

async function enter(row: AdminBinding) {
  if (!row.networkOnline || !row.networkAvailable) return
  bindBusy.value = true
  try {
    await auth.enterNetwork(row.playerUuid)
    await router.push({ name: 'terminal' })
  } catch (e) {
    bindErr.value = true
    bindMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    bindBusy.value = false
  }
}

async function goUserShell() {
  auth.chooseShellMode('user')
  try {
    await auth.leaveActAs()
  } catch {
    /* ignore */
  }
  await router.push({ name: 'terminal' })
}

function formatTs(ms: number) {
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return String(ms)
  }
}

function yn(v: boolean) {
  return v ? t('admin.yes') : t('admin.no')
}

onMounted(async () => {
  if (!admin.value) {
    await router.replace({ name: 'terminal' })
    return
  }
  await refreshBindings()
})

watch(section, (s) => {
  if (s === 'logs') void refreshLogs()
})
</script>

<template>
  <div class="admin-shell flex h-dvh min-h-0 flex-col bg-[#0e1218] text-[#e8eef7]">
    <header class="app-safe-header flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#121821] px-4 pb-2.5" :class="chrome ? 'select-none' : ''">
      <div class="min-w-0 flex-1">
        <p class="m-0 text-[11px] uppercase tracking-[0.14em] text-[#7d8fa8]">{{ t('adminShell.badge') }}</p>
        <h1 class="m-0 truncate text-[15px] font-semibold tracking-[-0.02em]">{{ t('adminShell.title') }}</h1>
      </div>
      <p class="m-0 hidden text-xs text-[#7d8fa8] sm:block">{{ account }}</p>
      <AppButton class="!h-8" @click="goUserShell">{{ t('adminShell.toUser') }}</AppButton>
      <AppButton class="!h-8" @click="auth.lock()">{{ t('common.lock') }}</AppButton>
      <div class="flex items-center gap-1" data-tauri-drag-region-exclude>
        <SettingsButton />
        <WindowTitlebarControls />
      </div>
    </header>

    <nav class="flex shrink-0 gap-1 border-b border-white/10 bg-[#10151d] px-4 py-2">
      <button
        type="button"
        class="rounded px-3 py-1.5 text-[13px] transition-colors"
        :class="section === 'networks' ? 'bg-white/10 text-white' : 'text-[#7d8fa8] hover:bg-white/5'"
        @click="section = 'networks'"
      >
        {{ t('adminShell.networks') }}
        <span class="ml-1 text-[11px] opacity-70">{{ onlineCount }}/{{ bindings.length }}</span>
      </button>
      <button
        type="button"
        class="rounded px-3 py-1.5 text-[13px] transition-colors"
        :class="section === 'logs' ? 'bg-white/10 text-white' : 'text-[#7d8fa8] hover:bg-white/5'"
        @click="section = 'logs'"
      >
        {{ t('adminShell.logs') }}
      </button>
    </nav>

    <main class="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <!-- 网络 -->
      <section v-if="section === 'networks'" class="flex min-h-0 flex-1 flex-col">
        <div class="mb-3 flex shrink-0 items-center justify-between gap-2">
          <p class="m-0 text-sm text-[#9aabc2]">{{ t('admin.lead') }}</p>
          <AppButton class="!h-8" :disabled="bindBusy" @click="refreshBindings">{{ t('common.refresh') }}</AppButton>
        </div>
        <p class="mb-2 min-h-4 shrink-0 text-xs" :class="bindErr ? 'text-red-400' : 'text-[#7d8fa8]'">{{ bindMsg }}</p>
        <ScrollFade class="min-h-0 flex-1 overflow-auto">
          <p v-if="!bindings.length && !bindBusy" class="text-[#7d8fa8]">{{ t('admin.empty') }}</p>
          <div v-else class="grid gap-2 lg:grid-cols-2">
            <article v-for="row in bindings" :key="row.playerUuid" class="rounded-lg border border-white/10 bg-[#151b24] p-3.5">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <strong class="block truncate text-[14px]">{{ row.playerName || '—' }}</strong>
                  <p class="mono m-0 mt-0.5 truncate text-[11px] text-[#7d8fa8]">{{ row.playerUuid }}</p>
                </div>
                <div class="flex flex-wrap gap-1">
                  <span class="rounded px-1.5 py-0.5 text-[11px]" :class="row.playerOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-[#7d8fa8]'">
                    {{ t('admin.playerOnline') }} {{ yn(row.playerOnline) }}
                  </span>
                  <span class="rounded px-1.5 py-0.5 text-[11px]" :class="row.networkOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-[#7d8fa8]'">
                    {{ t('admin.networkOnline') }} {{ yn(row.networkOnline) }}
                  </span>
                </div>
              </div>
              <dl class="mt-2 grid gap-1 text-[12px] text-[#b7c4d6]">
                <div class="flex gap-2">
                  <dt class="text-[#7d8fa8]">{{ t('admin.terminal') }}</dt>
                  <dd class="mono m-0 truncate">{{ row.endpoint?.terminalItemId || '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-[#7d8fa8]">{{ t('admin.dimension') }}</dt>
                  <dd class="mono m-0 truncate">{{ row.endpoint?.dimension || '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-[#7d8fa8]">{{ t('admin.position') }}</dt>
                  <dd class="mono m-0 truncate">{{ row.endpoint?.playerPos || '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-[#7d8fa8]">{{ t('admin.cpu') }}</dt>
                  <dd class="m-0">{{ row.busyCpuCount ?? 0 }}/{{ row.cpuCount ?? 0 }}</dd>
                </div>
              </dl>
              <div class="mt-3">
                <AppButton class="!h-8" variant="primary" :disabled="!row.networkOnline || !row.networkAvailable || bindBusy" @click="enter(row)">
                  {{ row.networkOnline ? t('admin.enterNetwork') : t('admin.networkOffline') }}
                </AppButton>
              </div>
            </article>
          </div>
        </ScrollFade>
      </section>

      <!-- 日志 -->
      <section v-else class="flex min-h-0 flex-1 flex-col">
        <form class="mb-3 flex shrink-0 flex-wrap items-end gap-2" @submit.prevent="queryLogs">
          <AppField class="min-w-[12rem] flex-1" :label="t('adminLogs.query')">
            <AppInput v-model="logQ" :placeholder="t('adminLogs.queryPh')" />
          </AppField>
          <AppButton class="!h-8" type="submit" :disabled="logBusy">{{ t('common.query') }}</AppButton>
          <AppButton class="!h-8" type="button" :disabled="logBusy" @click="refreshLogs">{{ t('common.refresh') }}</AppButton>
        </form>
        <p class="mb-2 min-h-4 shrink-0 text-xs" :class="logErr ? 'text-red-400' : 'text-[#7d8fa8]'">{{ logMsg }}</p>
        <ScrollFade class="min-h-0 flex-1 overflow-auto">
          <p v-if="!logs.length && !logBusy" class="text-[#7d8fa8]">{{ t('adminLogs.empty') }}</p>
          <table v-else class="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
            <thead class="sticky top-0 bg-[#121821] text-[#7d8fa8]">
              <tr>
                <th class="border-b border-white/10 px-2 py-2 font-medium">{{ t('adminLogs.time') }}</th>
                <th class="border-b border-white/10 px-2 py-2 font-medium">{{ t('adminLogs.action') }}</th>
                <th class="border-b border-white/10 px-2 py-2 font-medium">{{ t('adminLogs.actor') }}</th>
                <th class="border-b border-white/10 px-2 py-2 font-medium">{{ t('adminLogs.target') }}</th>
                <th class="border-b border-white/10 px-2 py-2 font-medium">{{ t('adminLogs.detail') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in logs" :key="`${e.ts}-${i}`" class="border-b border-white/5 hover:bg-white/[0.03]">
                <td class="whitespace-nowrap px-2 py-2 text-[#9aabc2]">{{ formatTs(e.ts) }}</td>
                <td class="mono px-2 py-2">{{ e.action }}</td>
                <td class="px-2 py-2">{{ e.actorName || e.actorUuid || '—' }}</td>
                <td class="px-2 py-2">{{ e.targetName || e.targetUuid || '—' }}</td>
                <td class="max-w-[240px] truncate px-2 py-2 text-[#9aabc2]">{{ e.detail || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </ScrollFade>
        <div class="mt-2 flex shrink-0 items-center justify-end gap-2 text-xs text-[#7d8fa8]">
          <AppButton class="!h-7" :disabled="logPage <= 1 || logBusy" @click="prevLogPage">{{ t('common.prevPage') }}</AppButton>
          <span>{{ logPage }} / {{ Math.max(1, Math.ceil(logTotal / pageSize)) }}</span>
          <AppButton class="!h-7" :disabled="logPage * pageSize >= logTotal || logBusy" @click="nextLogPage">{{ t('common.nextPage') }}</AppButton>
        </div>
      </section>
    </main>
  </div>
</template>
