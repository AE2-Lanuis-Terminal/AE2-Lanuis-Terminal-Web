/**
 * Minecraft 传统格式码（§ / &）解析：颜色与粗斜体等样式。
 * 例：`4安§7LV§r能源仓` → 灰「LV」+ 重置后默认色「能源仓」。
 */

export type McFormatSegment = {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
}

/** Java 版经典 16 色 */
const MC_COLORS: Record<string, string> = {
  '0': '#000000',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  a: '#55ff55',
  b: '#55ffff',
  c: '#ff5555',
  d: '#ff55ff',
  e: '#ffff55',
  f: '#ffffff',
}

const FORMAT_RE = /[§&]([0-9a-fk-orx])/gi

/**
 * 去掉所有格式码，得到纯文本（搜索、alt、排序用）。
 */
export function stripMcFormat(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(FORMAT_RE, '').replace(/\u00a7./g, '')
}

/**
 * 将带 §/& 的字符串拆成带样式的片段。
 */
export function parseMcFormat(raw: string | null | undefined): McFormatSegment[] {
  if (!raw) return []
  // 统一成 §，并处理字面 \u00a7
  const input = raw.replace(/\u00a7/g, '§')
  const segments: McFormatSegment[] = []
  let color: string | undefined
  let bold = false
  let italic = false
  let underline = false
  let strikethrough = false
  let obfuscated = false
  let buf = ''

  const flush = () => {
    if (!buf) return
    segments.push({
      text: buf,
      color,
      bold: bold || undefined,
      italic: italic || undefined,
      underline: underline || undefined,
      strikethrough: strikethrough || undefined,
      obfuscated: obfuscated || undefined,
    })
    buf = ''
  }

  const resetStyle = () => {
    color = undefined
    bold = false
    italic = false
    underline = false
    strikethrough = false
    obfuscated = false
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if ((ch === '§' || ch === '&') && i + 1 < input.length) {
      const code = input[i + 1].toLowerCase()
      // §xRRGGBB（简化：§x + 6 个 §? 或直接 6 hex；常见为 §x§r§r§g§g§b§b）
      if (code === 'x') {
        flush()
        const hex = tryParseHexAfterX(input, i + 2)
        if (hex) {
          color = hex.color
          i = hex.nextIndex - 1
          continue
        }
        i += 1
        continue
      }
      if (MC_COLORS[code]) {
        flush()
        color = MC_COLORS[code]
        i += 1
        continue
      }
      if (code === 'r') {
        flush()
        resetStyle()
        i += 1
        continue
      }
      if (code === 'l') {
        flush()
        bold = true
        i += 1
        continue
      }
      if (code === 'o') {
        flush()
        italic = true
        i += 1
        continue
      }
      if (code === 'n') {
        flush()
        underline = true
        i += 1
        continue
      }
      if (code === 'm') {
        flush()
        strikethrough = true
        i += 1
        continue
      }
      if (code === 'k') {
        flush()
        obfuscated = true
        i += 1
        continue
      }
      // 未知码：跳过标记符
      i += 1
      continue
    }
    buf += ch
  }
  flush()
  return segments.length ? segments : [{ text: input }]
}

/**
 * 解析 §x§R§R§G§G§B§B 或紧随的 6 位 hex。
 */
function tryParseHexAfterX(input: string, start: number): { color: string; nextIndex: number } | null {
  let hex = ''
  let i = start
  while (i < input.length && hex.length < 6) {
    const c = input[i]
    if ((c === '§' || c === '&') && i + 1 < input.length) {
      hex += input[i + 1]
      i += 2
      continue
    }
    if (/[0-9a-f]/i.test(c)) {
      hex += c
      i += 1
      continue
    }
    break
  }
  if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
    return { color: `#${hex}`, nextIndex: i }
  }
  return null
}

export function segmentStyle(seg: McFormatSegment): Record<string, string> {
  const style: Record<string, string> = {}
  if (seg.color) style.color = seg.color
  if (seg.bold) style.fontWeight = '700'
  if (seg.italic) style.fontStyle = 'italic'
  const deco: string[] = []
  if (seg.underline) deco.push('underline')
  if (seg.strikethrough) deco.push('line-through')
  if (deco.length) style.textDecoration = deco.join(' ')
  return style
}
