<!--
  语言切换：复用 AppSelect 玻璃下拉，避免系统原生菜单。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings'
import type { LocalePreference } from '../i18n'
import { AppSelect, type AppSelectOption } from '@/ui'

const { t } = useI18n()
const settings = useSettingsStore()
const { locale } = storeToRefs(settings)

const options = computed<AppSelectOption[]>(() => [
  { value: 'system', label: t('locale.system') },
  { value: 'zh-CN', label: t('locale.zh') },
  { value: 'en', label: t('locale.en') },
])

function onLocale(value: string) {
  settings.setUiLocale(value as LocalePreference)
}
</script>

<template>
  <AppSelect :model-value="locale" compact :options="options" :aria-label="t('settings.language')" @update:model-value="onLocale" />
</template>
