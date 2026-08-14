<!--
  打开设置：桌面独立窗，Web/Android 弹窗（openAppSettings）。
  data-tauri-drag-region-exclude：避免点齿轮时触发拖窗。
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AppButton } from '@/ui'
import { openAppSettings } from '@/ui/openSettings'

const { t } = useI18n()
</script>

<template>
  <AppButton
    variant="ghost-quiet"
    size="icon"
    class="!size-8 !rounded-sm shrink-0 text-muted"
    data-tauri-drag-region-exclude
    :aria-label="t('settings.open')"
    @click="openAppSettings"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.51 1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.51-1 1.7 1.7 0 0 0-.34-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.86.34H9a1.7 1.7 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.51 1.7 1.7 0 0 0 1.86-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.86V9c.26.6.86 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"
      />
    </svg>
  </AppButton>
</template>
