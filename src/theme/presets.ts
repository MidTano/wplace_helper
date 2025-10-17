import { ThemePreset, ThemeTokens } from './types'
import { chooseOnColor, lighten, withAlpha } from './color'

const DEFAULT_NEUTRALS = {
  bg: '#111111',
  surface: '#181a20',
  surface2: '#1f222b',
  border: 'rgba(255,255,255,0.15)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)'
}

const DEFAULT_STATUSES = {
  success: '#69f0ae',
  onSuccess: '#000000',
  warning: '#ffb74d',
  onWarning: '#000000',
  error: '#e53935',
  onError: '#ffffff'
}

function buildTokens(primary: string, base?: Partial<typeof DEFAULT_NEUTRALS>, st?: Partial<typeof DEFAULT_STATUSES>): ThemeTokens {
  const p = primary
  const p2 = lighten(p, 0.12)
  const onP = chooseOnColor(p)
  const glow = withAlpha(p, 0.45)
  const ring = withAlpha(p, 0.28)
  const ne = { ...DEFAULT_NEUTRALS, ...(base || {}) }
  const ss = { ...DEFAULT_STATUSES, ...(st || {}) }
  const onS = chooseOnColor(ss.success)
  const onW = chooseOnColor(ss.warning)
  const onE = chooseOnColor(ss.error)
  return {
    primary: p,
    primary2: p2,
    onPrimary: onP,
    primaryGlow: glow,
    focusRing: ring,
    bg: ne.bg,
    surface: ne.surface,
    surface2: ne.surface2,
    border: ne.border,
    text: ne.text,
    muted: ne.muted,
    success: ss.success,
    onSuccess: ss.onSuccess || onS,
    warning: ss.warning,
    onWarning: ss.onWarning || onW,
    error: ss.error,
    onError: ss.onError || onE
  }
}

const PRESETS: Record<string, ThemePreset> = {
  orange: { name: 'orange', primary: '#f05123' },
  red: { name: 'red', primary: '#ff3b30' },
  blue: { name: 'blue', primary: '#007aff' },
  green: { name: 'green', primary: '#34c759' },
  purple: { name: 'purple', primary: '#9b59b6' },
  gray: { name: 'gray', primary: '#9e9e9e' }
}

export function buildTokensFromPreset(preset: ThemePreset): ThemeTokens {
  return buildTokens(preset.primary, preset.neutrals, preset.statuses)
}

export function getPreset(name: string): ThemePreset | undefined {
  const key = name === 'defaultOrange' ? 'orange' : name
  return PRESETS[key]
}

export function listPresetNames(): string[] {
  return Object.keys(PRESETS)
}
