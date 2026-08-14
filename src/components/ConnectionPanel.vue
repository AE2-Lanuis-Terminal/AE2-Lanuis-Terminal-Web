<!--
  Web：fixed 遮罩居中卡片；桌面：h-dvh 整窗表单。
  仅桌面绑定拖窗与标题栏控件；协议/主机字段受 showServerFields 控制。
  支持 #/?account= 预填账号（游戏内 password 链接），打开后只需输密码。
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type ComponentPublicInstance } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import MeControllerLogo from './MeControllerLogo.vue'
import RainbowTitle from './RainbowTitle.vue'
import SettingsButton from './SettingsButton.vue'
import WindowTitlebarControls from './WindowTitlebarControls.vue'
import { bindTauriWindowDragRegion } from '../composables/bindTauriWindowDragRegion'
import { toggleMaximizeAppWindow } from '../lib/window'
import { canUseWindowChrome, isTauri } from '../lib/runtime'
import { AppButton, AppCheckbox, AppField, AppInput, AppSelect } from '@/ui'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const { showServerFields, config, account, password, remember, busy, message, error } = storeToRefs(auth)
const shell = isTauri()
const chrome = canUseWindowChrome()
/** 来自游戏内链接预填的账号：只读，焦点落在密码 */
const accountFromLink = ref(false)
const webPasswordEl = ref<HTMLInputElement | null>(null)

const protocolOptions = [
  { value: 'http', label: 'http' },
  { value: 'https', label: 'https' },
]

const accountLocked = computed(() => accountFromLink.value && !!account.value.trim())

function applyAccountFromQuery() {
  const raw = route.query.account
  const name = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? String(raw[0] || '').trim() : ''
  if (!name) return
  account.value = name
  accountFromLink.value = true
}

let detachTitleBarPointerDrag: (() => void) | undefined

function resolveHostElement(el: Element | ComponentPublicInstance | null): HTMLElement | null {
  if (el == null) return null
  if (el instanceof HTMLElement) return el
  const node = (el as ComponentPublicInstance).$el
  return node instanceof HTMLElement ? node : null
}

function setShellRef(el: Element | ComponentPublicInstance | null) {
  detachTitleBarPointerDrag?.()
  detachTitleBarPointerDrag = undefined
  const host = resolveHostElement(el)
  if (!host || !chrome) return
  // 桌面拖窗：单击后 startDragging，保留双击最大化
  detachTitleBarPointerDrag = bindTauriWindowDragRegion(host)
}

async function onShellDblclick(e: MouseEvent) {
  if (!chrome) return
  const target = e.target
  if (target instanceof Element && target.closest('[data-tauri-drag-region-exclude]')) return
  await toggleMaximizeAppWindow()
}

onMounted(async () => {
  applyAccountFromQuery()
  if (accountLocked.value) {
    await nextTick()
    webPasswordEl.value?.focus()
  }
})

onUnmounted(() => {
  detachTitleBarPointerDrag?.()
})
</script>

<template>
  <!-- Web：居中浮层 -->
  <div v-if="!shell" class="contents">
    <Transition name="ui-overlay-fade" appear>
      <div class="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,10,14,0.55)] p-4 pt-[max(1rem,var(--safe-top))] pb-[max(1rem,var(--safe-bottom))] backdrop-blur-xl">
        <Transition name="ui-overlay-scale" appear>
          <section class="ui-glass-strong w-full max-w-[400px] overflow-hidden rounded-[12px]">
            <div class="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <MeControllerLogo size="lg" />
              <div class="min-w-0">
                <RainbowTitle as="h2" class="!text-[15px]" :text="t('auth.lead')" />
              </div>
            </div>

            <form class="ui-hover-room grid gap-3 p-4" @submit.prevent="auth.login()">
              <label>
                <span class="ui-label">{{ t('auth.account') }}</span>
                <input v-model="account" class="ui-field mono" autocomplete="username" :readonly="accountLocked" :placeholder="t('auth.accountPlaceholder')" />
              </label>
              <label>
                <span class="ui-label">{{ t('auth.password') }}</span>
                <input ref="webPasswordEl" v-model="password" class="ui-field mono" type="password" autocomplete="current-password" :placeholder="t('auth.passwordPlaceholder')" />
              </label>
              <label class="inline-flex w-fit max-w-full items-center gap-2 text-[12.5px] text-muted">
                <input v-model="remember" type="checkbox" class="accent-cyan" />
                <span>{{ t('auth.remember') }}</span>
              </label>
              <button class="ui-btn-primary" type="submit" :disabled="busy">
                {{ busy ? t('auth.connecting') : t('auth.submit') }}
              </button>
              <p class="m-0 min-h-4 text-xs" :class="error ? 'text-red' : 'text-muted'">{{ message }}</p>
            </form>

            <p class="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-muted">
              {{ t('auth.note') }}
              <code class="mt-1.5 block text-[11px]">{{ t('auth.cmd') }}</code>
            </p>
          </section>
        </Transition>
      </div>
    </Transition>
  </div>

  <!-- 桌面：整窗即 ME 连接面板 -->
  <div v-else :ref="setShellRef" class="me-surface flex h-dvh min-h-0 flex-col text-ink select-none" @dblclick="onShellDblclick">
    <!-- 顶栏：品牌、状态、窗口控件 -->
    <header class="ui-glass-bar app-safe-header flex shrink-0 items-center gap-2 border-b pb-1 pl-3 pr-1.5">
      <div class="flex min-w-0 flex-1 items-center gap-2.5">
        <MeControllerLogo size="sm" />
        <RainbowTitle class="min-w-0" :text="t('auth.lead')" />
      </div>
      <!-- 排除拖窗：按钮区需可点击 -->
      <div class="flex h-8 shrink-0 items-center gap-0.5" data-tauri-drag-region-exclude>
        <!-- 设置入口或表单 -->
        <SettingsButton />
        <!-- 桌面最小化/最大化/关闭 -->
        <WindowTitlebarControls />
      </div>
    </header>

    <!-- 排除拖窗：按钮区需可点击 -->
    <div class="min-h-0 flex-1 overflow-auto px-4 py-4" data-tauri-drag-region-exclude>
      <form class="grid gap-3" @submit.prevent="auth.login()">
        <template v-if="showServerFields">
          <AppField :label="t('auth.serverIp')">
            <AppInput v-model="config.serverHost" mono autocomplete="off" :placeholder="t('auth.serverIpPlaceholder')" />
          </AppField>
          <div class="grid grid-cols-2 gap-2.5">
            <AppField :label="t('auth.port')">
              <AppInput v-model="config.serverPort" mono type="number" :placeholder="t('auth.portPlaceholder')" />
            </AppField>
            <AppField :label="t('auth.protocol')">
              <AppSelect v-model="config.protocol" :options="protocolOptions" />
            </AppField>
          </div>
        </template>

        <AppField :label="t('auth.account')">
          <AppInput v-model="account" mono autocomplete="username" :disabled="accountLocked" :placeholder="t('auth.accountPlaceholder')" />
        </AppField>
        <AppField :label="t('auth.password')">
          <AppInput v-model="password" mono type="password" autocomplete="current-password" :placeholder="t('auth.passwordPlaceholder')" />
        </AppField>
        <AppCheckbox v-model="remember" :label="t('auth.remember')" />

        <AppButton variant="primary" type="submit" block :disabled="busy">
          {{ busy ? t('auth.connecting') : t('auth.submit') }}
        </AppButton>
        <p class="m-0 min-h-4 text-xs" :class="error ? 'text-red' : 'text-muted'">{{ message }}</p>
      </form>

      <p class="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        {{ t('auth.note') }}
        <code class="mt-1.5 block text-[11px]">{{ t('auth.cmd') }}</code>
      </p>
    </div>
  </div>
</template>
