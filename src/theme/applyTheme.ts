import { ThemeTokens } from './types'
import { buildTokensFromPreset, getPreset } from './presets'

const STORAGE_KEY = 'wph_theme_v1'

type Host = ShadowRoot | HTMLElement | Document | null | undefined

function resolveHost(): HTMLElement | null {
  try {
    const host = (window as any).__wphPortalHost as Host
    if (host && (host as any).host && (host as any).host instanceof HTMLElement) {
      return (host as any).host as HTMLElement
    }
    if (host && host instanceof HTMLElement) return host
    const el = document.getElementById('wph-theme-root')
    if (el) return el
    return document.documentElement
  } catch {
    return document.documentElement
  }
}

function setToken(el: HTMLElement, name: string, value: string) {
  const v = String(value || '').trim()
  try { el.style.setProperty(`--wph-${name}`, v) } catch {}
  try {
    const root = document.documentElement
    if (el !== root) root.style.setProperty(`--wph-${name}`, v)
  } catch {}
}

export function applyTheme(tokens: ThemeTokens) {
  const el = resolveHost()
  if (!el) return
  setToken(el, 'primary', tokens.primary)
  setToken(el, 'primary2', tokens.primary2)
  setToken(el, 'primary-2', tokens.primary2)
  setToken(el, 'onPrimary', tokens.onPrimary)
  setToken(el, 'on-primary', tokens.onPrimary)
  setToken(el, 'primaryGlow', tokens.primaryGlow)
  setToken(el, 'primary-glow', tokens.primaryGlow)
  setToken(el, 'focusRing', tokens.focusRing)
  setToken(el, 'focus-ring', tokens.focusRing)

  setToken(el, 'bg', tokens.bg)
  setToken(el, 'surface', tokens.surface)
  setToken(el, 'surface2', tokens.surface2)
  setToken(el, 'surface-2', tokens.surface2)
  setToken(el, 'border', tokens.border)
  setToken(el, 'text', tokens.text)
  setToken(el, 'muted', tokens.muted)

  setToken(el, 'success', tokens.success)
  setToken(el, 'onSuccess', tokens.onSuccess)
  setToken(el, 'on-success', tokens.onSuccess)
  setToken(el, 'warning', tokens.warning)
  setToken(el, 'onWarning', tokens.onWarning)
  setToken(el, 'on-warning', tokens.onWarning)
  setToken(el, 'error', tokens.error)
  setToken(el, 'onError', tokens.onError)
  setToken(el, 'on-error', tokens.onError)

  setToken(el, 'info-bg', tokens.surface)
  setToken(el, 'info-border', tokens.border)
  setToken(el, 'info-text', tokens.text)
  setToken(el, 'info-muted', tokens.muted)
  setToken(el, 'info-accent', tokens.primary)
  setToken(el, 'info-on-accent', tokens.onPrimary)
  setToken(el, 'info-glow', tokens.primaryGlow)
  setToken(el, 'info-surface2', tokens.surface2)
  setToken(el, 'kbd-bg', tokens.surface)
  setToken(el, 'kbd-fg', tokens.primary)
  setToken(el, 'kbd-border', tokens.primary)
  setToken(el, 'backdrop', 'rgba(0,0,0,0.4)')
}

export function applyThemeByName(name: string) {
  const p = getPreset(name)
  if (!p) return
  const tokens = buildTokensFromPreset(p)
  applyTheme(tokens)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: name, primary: p.primary })) } catch {}
}

export function applyThemePrimary(hex: string, presetName?: string) {
  const name = presetName || 'custom'
  const tokens = buildTokensFromPreset({ name, primary: hex })
  applyTheme(tokens)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: name, primary: hex })) } catch {}
}

export function loadThemeFromStorage() {
  let name = 'orange'
  let primary = '#f05123'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (typeof s?.preset === 'string') name = s.preset
      if (typeof s?.primary === 'string') primary = s.primary
    }
  } catch {}
  // legacy alias
  if (name === 'defaultOrange') name = 'orange'
  if (name && getPreset(name)) {
    applyThemeByName(name)
  } else if (primary) {
    applyThemePrimary(primary, 'custom')
  } else {
    applyThemeByName('orange')
  }
}
