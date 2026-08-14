/**
 * 设计稿 px（以 16px=1rem 为基准）→ rem 字符串，最多两位小数。
 * 边框/圆角/阴影等宜继续用 px；布局与字号走 rem 以配合界面缩放。
 */
export function pxRem(px: number): string {
  const v = Math.round((px / 16) * 100) / 100
  if (Number.isInteger(v)) return `${v}rem`
  return `${v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}rem`
}
