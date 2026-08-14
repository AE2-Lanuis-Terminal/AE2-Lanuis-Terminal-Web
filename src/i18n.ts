/**
 * vue-i18n 入口；文案表在 locales。
 * 偏好可为 system（默认）或锁定 zh-CN / en；resolve 后再写入 vue-i18n。
 */

import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zhCN from './locales/zh-CN'

export type AppLocale = 'zh-CN' | 'en'
export type LocalePreference = 'system' | AppLocale

const STORAGE_KEY = 'ae2lanuis.locale'

export function readLocalePreference(): LocalePreference {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh-CN' || saved === 'en' || saved === 'system') return saved
  return 'system'
}

/** 将偏好解析为实际文案语言 */
export function resolveLocale(pref: LocalePreference = readLocalePreference()): AppLocale {
  if (pref === 'zh-CN' || pref === 'en') return pref
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

function applyDocumentLang(locale: AppLocale) {
  document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export function applyResolvedLocale(pref: LocalePreference = readLocalePreference()) {
  const locale = resolveLocale(pref)
  i18n.global.locale.value = locale
  applyDocumentLang(locale)
}

/** 写入语言偏好（含 system）并刷新实际 locale */
export function setLocalePreference(pref: LocalePreference) {
  localStorage.setItem(STORAGE_KEY, pref)
  applyResolvedLocale(pref)
}

if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    if (readLocalePreference() === 'system') applyResolvedLocale('system')
  })
}
