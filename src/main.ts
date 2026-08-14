/**
 * 创建 Pinia/Router/i18n 前先写入 theme/font/motion，减少首屏闪烁。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n, resolveLocale } from './i18n'
import { ensureFontLoaded, type FontPreset } from './lib/fonts'
import { getPlatform } from './lib/platform'
import './styles/base.css'

document.documentElement.lang = resolveLocale() === 'zh-CN' ? 'zh-CN' : 'en'
document.documentElement.dataset.platform = getPlatform()

const savedScheme = localStorage.getItem('ae2lanuis.colorScheme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const bootDark = savedScheme === 'light' ? false : savedScheme === 'system' ? prefersDark : true
document.documentElement.dataset.theme = bootDark ? 'dark' : 'light'
const savedFont = localStorage.getItem('ae2lanuis.fontPreset')
const bootFont: FontPreset = savedFont === 'fusion-pixel' || savedFont === 'dm-sans' || savedFont === 'jetbrains-mono' || savedFont === 'system' ? savedFont : 'system'
document.documentElement.dataset.appFont = bootFont
document.documentElement.dataset.motion = localStorage.getItem('ae2lanuis.animations') === '0' ? 'off' : 'on'
const savedScale = Number(localStorage.getItem('ae2lanuis.uiScale'))
document.documentElement.dataset.uiScale = savedScale === 2 || savedScale === 3 || savedScale === 4 ? String(savedScale) : '1'

void ensureFontLoaded(bootFont)

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(router).use(i18n).mount('#app')
