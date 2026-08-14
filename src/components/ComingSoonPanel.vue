<!-- 未实现模块的占位：标题 +「待开发」提示 -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  /** i18n key，如 tabs.patterns */
  titleKey: string
}>()

const { t } = useI18n()
</script>

<template>
  <section class="flex h-full min-h-[15rem] min-w-[17.5rem] flex-col items-center justify-center overflow-hidden py-10 text-center">
    <h3 class="m-0 text-[0.94rem] font-medium text-ink">{{ t(titleKey) }}</h3>
    <p class="m-0 mt-2 text-[0.81rem] text-muted">{{ t('common.comingSoon') }}</p>
  </section>
</template>
