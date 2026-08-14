<!--
  主题/字体/语言/动画对 Web 与桌面均可用。
  关闭行为分区仅 canUseSystemTray（桌面）显示。
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSettingsStore, type CloseBehavior, type ColorScheme, type FontPreset } from '../stores/settings'
import type { LocalePreference } from '../i18n'
import { AppSwitch } from '@/ui'
import { canUseSystemTray } from '../lib/runtime'

const { t } = useI18n()
const settings = useSettingsStore()
const { colorScheme, fontPreset, locale, closeBehavior, animationsEnabled } = storeToRefs(settings)
const showCloseBehavior = canUseSystemTray()

const schemes: { id: ColorScheme; labelKey: string }[] = [
  { id: 'dark', labelKey: 'settings.themeDark' },
  { id: 'light', labelKey: 'settings.themeLight' },
  { id: 'system', labelKey: 'settings.themeSystem' },
]

const fonts: { id: FontPreset; labelKey: string }[] = [
  { id: 'system', labelKey: 'settings.fontSystem' },
  { id: 'fusion-pixel', labelKey: 'settings.fontPixel' },
  { id: 'dm-sans', labelKey: 'settings.fontDmSans' },
  { id: 'jetbrains-mono', labelKey: 'settings.fontMono' },
]

const locales: { id: LocalePreference; labelKey: string }[] = [
  { id: 'system', labelKey: 'locale.system' },
  { id: 'zh-CN', labelKey: 'locale.zh' },
  { id: 'en', labelKey: 'locale.en' },
]

const closeBehaviors: { id: CloseBehavior; labelKey: string }[] = [
  { id: 'ask', labelKey: 'settings.closeAsk' },
  { id: 'tray', labelKey: 'settings.closeTray' },
  { id: 'exit', labelKey: 'settings.closeExit' },
]
</script>

<template>
  <div class="grid gap-4">
    <section>
      <div class="ui-label !mb-1.5">{{ t('settings.theme') }}</div>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="item in schemes"
          :key="item.id"
          type="button"
          class="ui-glass-chip h-8 rounded-[5px] text-[12px] font-medium transition-colors"
          :class="
            colorScheme === item.id
              ? '!border-[color:var(--glass-border-bright)] bg-[color-mix(in_srgb,var(--color-cyan-dim)_22%,var(--glass-bg))] text-ink'
              : 'text-muted hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]'
          "
          @click="settings.setColorScheme(item.id)"
        >
          {{ t(item.labelKey) }}
        </button>
      </div>
    </section>

    <section>
      <div class="ui-label !mb-1.5">{{ t('settings.font') }}</div>
      <div class="grid gap-1.5">
        <button
          v-for="item in fonts"
          :key="item.id"
          type="button"
          class="ui-glass-chip flex h-9 items-center justify-between rounded-[5px] px-3 text-left text-[13px] transition-colors"
          :class="
            fontPreset === item.id
              ? '!border-[color:var(--glass-border-bright)] bg-[color-mix(in_srgb,var(--color-cyan-dim)_18%,var(--glass-bg))] text-ink'
              : 'text-muted hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]'
          "
          @click="settings.setFontPreset(item.id)"
        >
          <span>{{ t(item.labelKey) }}</span>
          <span v-if="fontPreset === item.id" class="text-[10px] font-semibold tracking-wide text-cyan"> ✓ </span>
        </button>
      </div>
    </section>

    <section>
      <div class="ui-label !mb-1.5">{{ t('settings.language') }}</div>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="item in locales"
          :key="item.id"
          type="button"
          class="ui-glass-chip h-8 rounded-[5px] text-[12px] font-medium transition-colors"
          :class="
            locale === item.id
              ? '!border-[color:var(--glass-border-bright)] bg-[color-mix(in_srgb,var(--color-cyan-dim)_22%,var(--glass-bg))] text-ink'
              : 'text-muted hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]'
          "
          @click="settings.setUiLocale(item.id)"
        >
          {{ t(item.labelKey) }}
        </button>
      </div>
    </section>

    <section>
      <div class="ui-label !mb-1.5">{{ t('settings.motion') }}</div>
      <div class="ui-glass-chip flex h-9 items-center justify-between rounded-[5px] px-3 text-[13px]">
        <span class="text-ink">{{ t('settings.animations') }}</span>
        <AppSwitch :model-value="animationsEnabled" @update:model-value="settings.setAnimationsEnabled($event)" />
      </div>
      <p class="mt-1.5 text-[11px] text-muted">{{ t('settings.animationsHint') }}</p>
    </section>

    <section v-if="showCloseBehavior">
      <div class="ui-label !mb-1.5">{{ t('settings.closeBehavior') }}</div>
      <div class="grid gap-1.5">
        <button
          v-for="item in closeBehaviors"
          :key="item.id"
          type="button"
          class="ui-glass-chip flex h-9 items-center justify-between rounded-[5px] px-3 text-left text-[13px] transition-colors"
          :class="
            closeBehavior === item.id
              ? '!border-[color:var(--glass-border-bright)] bg-[color-mix(in_srgb,var(--color-cyan-dim)_18%,var(--glass-bg))] text-ink'
              : 'text-muted hover:border-[color:var(--glass-border-bright)] hover:bg-[var(--glass-hover-bg)] hover:text-ink hover:shadow-[var(--glass-hover-glow)]'
          "
          @click="settings.setCloseBehavior(item.id)"
        >
          <span>{{ t(item.labelKey) }}</span>
          <span v-if="closeBehavior === item.id" class="text-[10px] font-semibold tracking-wide text-cyan"> ✓ </span>
        </button>
      </div>
    </section>
  </div>
</template>
