/**
 * 按当前字体预设按需注入 @font-face / fontsource，避免把 3MB+ 像素字体与未选字体打进首屏 CSS。
 */

export type FontPreset = 'fusion-pixel' | 'dm-sans' | 'jetbrains-mono' | 'system'

const loaded = new Set<FontPreset>()

function injectFusionPixel(url: string) {
  const id = 'ae2-font-fusion-pixel'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `@font-face{font-family:'Fusion Pixel';font-style:normal;font-weight:400;font-display:swap;src:url('${url}') format('truetype')}`
  document.head.appendChild(style)
}

/** 幂等；system 无需加载 */
export async function ensureFontLoaded(preset: FontPreset): Promise<void> {
  if (preset === 'system' || loaded.has(preset)) return
  loaded.add(preset)

  if (preset === 'fusion-pixel') {
    const url = (await import('@fontpkg/fusion-pixel/fusion-pixel.ttf?url')).default
    injectFusionPixel(url)
    try {
      await document.fonts.load('16px "Fusion Pixel"')
    } catch {
      /* ignore */
    }
    return
  }

  if (preset === 'dm-sans') {
    await Promise.all([
      import('@fontsource/dm-sans/latin-400.css'),
      import('@fontsource/dm-sans/latin-500.css'),
      import('@fontsource/dm-sans/latin-600.css'),
      import('@fontsource/dm-sans/latin-700.css'),
    ])
    return
  }

  if (preset === 'jetbrains-mono') {
    await Promise.all([import('@fontsource/jetbrains-mono/latin-400.css'), import('@fontsource/jetbrains-mono/latin-500.css')])
  }
}
