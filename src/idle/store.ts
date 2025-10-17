import { writable, get } from 'svelte/store'
import type { IdleSettings, GifItem } from './types'
import { markElement } from '../wguard/core/dom-utils'

const STORAGE_KEY = 'wph_idle_settings_v1'
const DEFAULT_GIF_URL = 'https://media.tenor.com/cZCGGNbpWskAAAAi/miyulily-vtuber.gif'
const SEED_KEY = 'wph_idle_default_seed_v1'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function readSettings(): IdleSettings {
  let s: IdleSettings = { enabled: false, idleTimeoutSec: 360, hideDelaySec: 1, gifs: [], lastShownGifId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const j = JSON.parse(raw)
      if (typeof j?.enabled === 'boolean') s.enabled = !!j.enabled
      if (typeof j?.idleTimeoutSec === 'number') s.idleTimeoutSec = clamp(Math.round(j.idleTimeoutSec), 5, 7200)
      if (typeof j?.hideDelaySec === 'number') s.hideDelaySec = clamp(Math.round(j.hideDelaySec), 0, 60)
      if (Array.isArray(j?.gifs)) {
        s.gifs = j.gifs.map((g: any) => ({
          id: String(g?.id || ''),
          url: String(g?.url || ''),
          favorite: Boolean(g?.favorite),
          offsetX: Number.isFinite(g?.offsetX) ? Math.round(g.offsetX) : 0,
          offsetY: Number.isFinite(g?.offsetY) ? Math.round(g.offsetY) : 0,
          width: Number.isFinite(g?.width) ? Math.max(50, Math.round(g.width)) : null,
          height: Number.isFinite(g?.height) ? Math.max(50, Math.round(g.height)) : null,
          createdAt: Number.isFinite(g?.createdAt) ? Math.round(g.createdAt) : Date.now()
        })).filter((g: GifItem) => !!g.id && !!g.url)
      }
      if (typeof j?.lastShownGifId === 'string' || j?.lastShownGifId === null) s.lastShownGifId = j?.lastShownGifId ?? null
    }
  } catch {}
  return s
}

function persist(s: IdleSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

export const idleSettingsStore = writable<IdleSettings>(readSettings())

idleSettingsStore.subscribe((s) => { persist(s) })

function seedDefaultGifIfEmpty() {
  let s: IdleSettings | null = null
  try { s = get(idleSettingsStore) } catch { s = null }
  const empty = !s || !Array.isArray(s.gifs) || s.gifs.length === 0
  if (!empty) return
  try {
    const seeded = (() => { try { return !!localStorage.getItem(SEED_KEY) } catch { return false } })()
    if (seeded) return
  } catch {}
  const url = DEFAULT_GIF_URL
  if (typeof url !== 'string' || !url) return
  try {
    Promise.resolve(addGif(url, true)).then(() => { try { localStorage.setItem(SEED_KEY, '1') } catch {} })
  } catch {}
}

seedDefaultGifIfEmpty()

export function loadIdleSettings(): IdleSettings {
  const s = readSettings()
  idleSettingsStore.set(s)
  return s
}

export function saveIdleSettings(): void {
  persist(get(idleSettingsStore))
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function validateGifUrl(url: string): Promise<{ ok: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      if (typeof url !== 'string') return resolve({ ok: false, width: 0, height: 0 })
      const u = url.trim()
      let parsed: URL
      try { parsed = new URL(u) } catch { return resolve({ ok: false, width: 0, height: 0 }) }
      if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) return resolve({ ok: false, width: 0, height: 0 })
      const pathOk = parsed.pathname.toLowerCase().endsWith('.gif')
      if (!pathOk) return resolve({ ok: false, width: 0, height: 0 })
      const img = new Image()
      try { markElement(img) } catch {}
      let done = false
      const finish = (ok: boolean, w = 0, h = 0) => { if (done) return; done = true; resolve({ ok, width: w, height: h }) }
      img.onload = () => finish(true, img.naturalWidth || 0, img.naturalHeight || 0)
      img.onerror = () => finish(false)
      img.src = u
      setTimeout(() => finish(false), 15000)
    } catch { resolve({ ok: false, width: 0, height: 0 }) }
  })
}

export async function addGif(url: string, favorite: boolean = false): Promise<GifItem | null> {
  const { ok, width, height } = await validateGifUrl(url)
  if (!ok) return null
  const id = genId()
  const initW = width >= 50 ? width : null
  const initH = height >= 50 ? height : null
  let vw = 0, vh = 0
  try { vw = Math.max(0, window.innerWidth || 0); vh = Math.max(0, window.innerHeight || 0) } catch {}
  let dispH = initH ?? Math.max(50, Math.round(vh * 0.33))
  let dispW = initW ?? (height > 0 ? Math.max(50, Math.round(dispH * (width / height))) : dispH)
  const ox = Math.round((vw - dispW) / 2)
  const oy = Math.round((vh - dispH) / 2)
  const item: GifItem = { id, url: url.trim(), favorite: !!favorite, offsetX: ox, offsetY: oy, width: initW, height: initH, createdAt: Date.now() }
  idleSettingsStore.update(s => ({ ...s, gifs: [item, ...s.gifs] }))
  return item
}

export function removeGif(id: string) {
  idleSettingsStore.update(s => {
    const g = s.gifs.filter(x => x.id !== id)
    const last = s.lastShownGifId && s.lastShownGifId === id ? null : s.lastShownGifId
    return { ...s, gifs: g, lastShownGifId: last }
  })
}

export function toggleFavorite(id: string) {
  idleSettingsStore.update(s => {
    const g = s.gifs.map(x => x.id === id ? { ...x, favorite: !x.favorite } : x)
    return { ...s, gifs: g }
  })
}

export function updateGifOffsets(id: string, offsetX: number, offsetY: number) {
  const ox = Math.round(offsetX)
  const oy = Math.round(offsetY)
  idleSettingsStore.update(s => {
    const g = s.gifs.map(x => x.id === id ? { ...x, offsetX: ox, offsetY: oy } : x)
    return { ...s, gifs: g }
  })
}

export function updateGifSize(id: string, width: number | null, height: number | null) {
  const w = width == null ? null : Math.max(50, Math.round(width))
  const h = height == null ? null : Math.max(50, Math.round(height))
  idleSettingsStore.update(s => {
    const g = s.gifs.map(x => x.id === id ? { ...x, width: w, height: h } : x)
    return { ...s, gifs: g }
  })
}

export function setIdleTimeoutSec(value: number) {
  const v = clamp(Math.round(value), 5, 7200)
  idleSettingsStore.update(s => ({ ...s, idleTimeoutSec: v }))
}

export function setHideDelaySec(value: number) {
  const v = clamp(Math.round(value), 0, 60)
  idleSettingsStore.update(s => ({ ...s, hideDelaySec: v }))
}

export function setIdleEnabled(value: boolean) {
  const v = !!value
  idleSettingsStore.update(s => ({ ...s, enabled: v }))
}

export function getRandomFavoriteGif(excludeId?: string): GifItem | null {
  const s = get(idleSettingsStore)
  const list = s.gifs.filter(x => x.favorite)
  if (list.length === 0) return null
  let pool = list
  if (excludeId && list.length > 1) {
    pool = list.filter(x => x.id !== excludeId)
    if (pool.length === 0) pool = list
  }
  const idx = Math.floor(Math.random() * pool.length)
  const item = pool[idx]
  idleSettingsStore.update(st => ({ ...st, lastShownGifId: item.id }))
  return item
}
