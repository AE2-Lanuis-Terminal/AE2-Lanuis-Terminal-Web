/**
 * 登录会话与连接配置；OP 登录后可选用户端 / 管理端。
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client'
import { i18n } from '../i18n'
import {
  isTauri,
  loadConnectionConfig,
  loadShellMode,
  loadToken,
  resolveBaseUrl,
  saveConnectionConfig,
  saveShellMode,
  saveToken,
  type ConnectionConfig,
  type ShellMode,
} from '../lib/runtime'
import type { ActingAsInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const desktop = isTauri()
  const config = ref<ConnectionConfig>(loadConnectionConfig())
  const account = ref(config.value.account)
  const password = ref('')
  const remember = ref(false)
  const token = ref(loadToken())
  const authenticated = ref(!!token.value)
  const admin = ref(false)
  const shellMode = ref<ShellMode | ''>(loadShellMode())
  /** OP 登录后待选择模式 */
  const pendingModeChoice = ref(false)
  const actingAs = ref<ActingAsInfo | null>(null)
  const busy = ref(false)
  const message = ref('')
  const error = ref(false)

  const baseUrl = computed(() => resolveBaseUrl(config.value))
  const showServerFields = computed(() => desktop)
  const tt = (key: string) => String(i18n.global.t(key))

  function persistConfig() {
    saveConnectionConfig({
      ...config.value,
      account: account.value,
    })
  }

  async function probeHealth() {
    const health = await api.health(desktop ? config.value : undefined)
    if (health.service !== 'ae2lanuis') {
      throw new Error(tt('auth.badService'))
    }
  }

  async function login() {
    busy.value = true
    message.value = tt('auth.connecting')
    error.value = false
    try {
      if (desktop) {
        if (!config.value.serverHost.trim()) throw new Error(tt('auth.needHost'))
        persistConfig()
        await probeHealth()
      }
      const res = await api.login({ account: account.value.trim(), password: password.value, remember: remember.value }, desktop ? config.value : undefined)
      token.value = res.token
      saveToken(res.token)
      authenticated.value = true
      admin.value = !!res.admin
      actingAs.value = null
      persistConfig()
      password.value = ''
      message.value = tt('auth.connected')
      if (admin.value) {
        pendingModeChoice.value = true
        shellMode.value = ''
        saveShellMode('')
      } else {
        pendingModeChoice.value = false
        shellMode.value = 'user'
        saveShellMode('user')
      }
    } catch (e) {
      authenticated.value = false
      admin.value = false
      pendingModeChoice.value = false
      actingAs.value = null
      saveToken('')
      token.value = ''
      error.value = true
      message.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }

  function chooseShellMode(mode: ShellMode) {
    if (!admin.value && mode === 'admin') return
    shellMode.value = mode
    saveShellMode(mode)
    pendingModeChoice.value = false
  }

  async function restoreSession() {
    if (!token.value) {
      authenticated.value = false
      admin.value = false
      actingAs.value = null
      return
    }
    try {
      const s = await api.session()
      authenticated.value = !!s.authenticated
      admin.value = !!(s.authenticated && s.admin)
      actingAs.value = s.actingAs ?? null
      if (!authenticated.value) {
        saveToken('')
        token.value = ''
        admin.value = false
        actingAs.value = null
        shellMode.value = ''
        saveShellMode('')
      } else if (s.account) {
        account.value = s.account
        if (admin.value && !shellMode.value) {
          shellMode.value = 'user'
          saveShellMode('user')
        }
        if (!admin.value) {
          shellMode.value = 'user'
          saveShellMode('user')
        }
      }
    } catch {
      authenticated.value = false
      admin.value = false
      actingAs.value = null
      saveToken('')
      token.value = ''
    }
  }

  async function enterNetwork(playerUuid: string) {
    const s = await api.adminActAs(playerUuid)
    actingAs.value = s.actingAs ?? { playerUuid, playerName: '' }
    shellMode.value = 'user'
    saveShellMode('user')
  }

  async function leaveActAs() {
    await api.adminClearActAs()
    actingAs.value = null
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    token.value = ''
    saveToken('')
    authenticated.value = false
    admin.value = false
    pendingModeChoice.value = false
    actingAs.value = null
    shellMode.value = ''
    saveShellMode('')
  }

  function lock() {
    void logout()
  }

  return {
    desktop,
    config,
    account,
    password,
    remember,
    token,
    authenticated,
    admin,
    shellMode,
    pendingModeChoice,
    actingAs,
    busy,
    message,
    error,
    baseUrl,
    showServerFields,
    login,
    chooseShellMode,
    restoreSession,
    enterNetwork,
    leaveActAs,
    logout,
    lock,
    persistConfig,
  }
})
