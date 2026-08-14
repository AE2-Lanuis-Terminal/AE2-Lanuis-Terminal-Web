<!--
  Web/Android 设置弹窗；桌面独立窗仍用 SettingsView。
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import SettingsForm from './SettingsForm.vue'
import { useSettingsStore } from '../stores/settings'
import { AppButton, AppDialog } from '@/ui'
import ScrollFade from './ScrollFade.vue'

const { t } = useI18n()
const settings = useSettingsStore()
const { settingsOpen } = storeToRefs(settings)

function onOpen(open: boolean) {
  settings.settingsOpen = open
}
</script>

<template>
  <AppDialog :open="settingsOpen" :title="t('settings.title')" class="min-w-[19rem] max-w-[min(100%-1.5rem,26rem)] sm:max-w-[26rem]" @update:open="onOpen">
    <ScrollFade class="max-h-[min(70dvh,28rem)] overflow-auto pr-0.5">
      <SettingsForm />
    </ScrollFade>
    <template #footer>
      <AppButton type="button" variant="outline" size="sm" @click="settings.settingsOpen = false">
        {{ t('common.close') }}
      </AppButton>
    </template>
  </AppDialog>
</template>
