<!--
  CloseConfirmDialog.vue 业务组件。
  文案走 i18n；桌面注意拖窗与标题栏控件。
-->
<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSettingsStore, type CloseBehavior } from '../stores/settings'
import { exitApp, hideMainWindow } from '../lib/window'
import { AppButton, AppCheckbox, AppDialog } from '@/ui'

const { t } = useI18n()
const settings = useSettingsStore()
const { closeConfirmOpen } = storeToRefs(settings)
const remember = ref(false)

async function choose(action: Extract<CloseBehavior, 'tray' | 'exit'>) {
  if (remember.value) {
    settings.setCloseBehavior(action)
  }
  settings.closeCloseConfirm()
  remember.value = false
  if (action === 'tray') {
    await hideMainWindow()
  } else {
    await exitApp()
  }
}

function onCancel() {
  settings.closeCloseConfirm()
  remember.value = false
}
</script>

<template>
  <AppDialog :open="closeConfirmOpen" :title="t('closeConfirm.title')" :description="t('closeConfirm.lead')" @update:open="(v) => !v && onCancel()">
    <AppButton variant="outline" block class="!h-9 justify-start" @click="choose('tray')">
      <!-- UI 结构 -->
      {{ t('closeConfirm.toTray') }}
    </AppButton>
    <AppButton variant="primary" block @click="choose('exit')">
      <!-- UI 结构 -->
      {{ t('closeConfirm.exit') }}
    </AppButton>
    <AppCheckbox v-model="remember" :label="t('closeConfirm.remember')" class="mt-1" />
    <AppButton variant="outline" block class="mt-1" @click="onCancel">
      <!-- UI 结构 -->
      {{ t('common.cancel') }}
    </AppButton>
  </AppDialog>
</template>
