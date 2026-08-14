<!--
  App.vue 业务组件。
  文案走 i18n；桌面注意拖窗与标题栏控件。
-->
<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import SettingsDialog from './components/SettingsDialog.vue'
import ModeChooserDialog from './components/ModeChooserDialog.vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isDesktopChrome } from './lib/runtime'
import { useSettingsStore } from './stores/settings'

const DesktopShellHost = defineAsyncComponent(() => import('./components/DesktopShellHost.vue'))
const desktop = isDesktopChrome()
const settings = useSettingsStore()

onMounted(() => {
  settings.hydrate()
})
</script>

<template>
  <TooltipProvider :delay-duration="220">
    <RouterView />
    <SettingsDialog />
    <ModeChooserDialog />
    <DesktopShellHost v-if="desktop" />
  </TooltipProvider>
</template>
