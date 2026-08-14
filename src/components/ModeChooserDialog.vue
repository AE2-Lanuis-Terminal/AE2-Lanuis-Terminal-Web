<!--
  OP 登录后选择进入用户端或管理端。
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { AppButton, AppDialog } from '@/ui'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { pendingModeChoice } = storeToRefs(auth)

async function pick(mode: 'user' | 'admin') {
  auth.chooseShellMode(mode)
  if (mode === 'admin') {
    try {
      await auth.leaveActAs()
    } catch {
      /* ignore */
    }
    await router.replace({ name: 'admin' })
  } else {
    await router.replace({ name: 'terminal' })
  }
}
</script>

<template>
  <AppDialog
    :open="pendingModeChoice"
    :title="t('mode.title')"
    :description="t('mode.lead')"
    class="!max-w-[22rem]"
    @update:open="
      (v) => {
        if (!v && pendingModeChoice) pick('user')
      }
    "
  >
    <div class="grid gap-2">
      <AppButton class="h-10 w-full justify-start" variant="primary" @click="pick('user')">
        {{ t('mode.user') }}
      </AppButton>
      <p class="m-0 text-[0.69rem] text-muted">{{ t('mode.userHint') }}</p>
      <AppButton class="mt-1 h-10 w-full justify-start" @click="pick('admin')">
        {{ t('mode.admin') }}
      </AppButton>
      <p class="m-0 text-[0.69rem] text-muted">{{ t('mode.adminHint') }}</p>
    </div>
  </AppDialog>
</template>
