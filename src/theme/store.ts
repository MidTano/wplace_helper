import { writable } from 'svelte/store'
import { applyThemeByName, applyThemePrimary, loadThemeFromStorage } from './applyTheme'
import { listPresetNames, getPreset } from './presets'

const STORAGE_KEY = 'wph_theme_v1'

type ThemeState = { preset: string; primary: string }

function readStorage(): ThemeState {
  let preset = 'orange'
  let primary = '#f05123'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (typeof s?.preset === 'string') preset = s.preset
      if (typeof s?.primary === 'string') primary = s.primary
    } else {
      const names = listPresetNames()
      const idx = Math.floor(Math.random() * Math.max(1, names.length))
      preset = names[idx] || 'orange'
      const p = getPreset(preset)
      primary = p?.primary || primary
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, primary })) } catch {}
    }
  } catch {}
  return { preset, primary }
}

const initialState = readStorage()
export const themeStore = writable<ThemeState>(initialState)

try {
  loadThemeFromStorage()
} catch {}

export function setPreset(name: string) {
  themeStore.update(s => {
    const newState = { ...s, preset: name }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    } catch {}
    return newState
  })
  try { applyThemeByName(name) } catch {}
}

export function setPrimary(hex: string, preset?: string) {
  themeStore.update(s => {
    const newState = { ...s, primary: hex, preset: preset || s.preset }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    } catch {}
    return newState
  })
  try { applyThemePrimary(hex, preset || 'custom') } catch {}
}
