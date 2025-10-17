export type RGB = { r: number; g: number; b: number }
export type HSL = { h: number; s: number; l: number }

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function hexToRgb(hex: string): RGB {
  let v = String(hex || '').trim().replace(/^0x/i, '')
  if (!v.startsWith('#')) v = '#' + v
  v = v.toLowerCase()
  if (v.length === 4) {
    const r = v[1], g = v[2], b = v[3]
    v = `#${r}${r}${g}${g}${b}${b}`
  }
  const m = /^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(v)
  if (!m) return { r: 0, g: 0, b: 0 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s, l }
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360
  s = clamp(s, 0, 1)
  l = clamp(l, 0, 1)
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360
  const tc = [hk + 1 / 3, hk, hk - 1 / 3]
  const rgb = tc.map(t => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  })
  return { r: Math.round(rgb[0] * 255), g: Math.round(rgb[1] * 255), b: Math.round(rgb[2] * 255) }
}

export function lighten(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex)
  const hsl = rgbToHsl(r, g, b)
  const l = clamp(hsl.l + ratio, 0, 1)
  const { r: rr, g: gg, b: bb } = hslToRgb(hsl.h, hsl.s, l)
  return rgbToHex(rr, gg, bb)
}

export function darken(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex)
  const hsl = rgbToHsl(r, g, b)
  const l = clamp(hsl.l - ratio, 0, 1)
  const { r: rr, g: gg, b: bb } = hslToRgb(hsl.h, hsl.s, l)
  return rgbToHex(rr, gg, bb)
}

function srgbToLinear(v: number): number {
  const x = v / 255
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a)
  const L2 = relativeLuminance(b)
  const hi = Math.max(L1, L2)
  const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

export function chooseOnColor(bgHex: string): string {
  const w = '#ffffff'
  const k = '#000000'
  const cw = contrastRatio(bgHex, w)
  const ck = contrastRatio(bgHex, k)
  return cw >= ck ? w : k
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  const a = clamp(alpha, 0, 1)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
