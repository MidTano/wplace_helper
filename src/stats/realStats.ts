import { MASTER_COLORS } from '../editor/palette';
import { getStencilManager } from '../template/stencilManager';
import { isAutoRunning } from '../screen/autoPainter';
import { getPersistentItem, setPersistentItem } from '../wguard/stealth/store';

type BootStats = {
  manual: {
    yesterday: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    week: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    allTime: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
  };
  auto: {
    yesterday: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    week: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    allTime: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
  };
};

type DayEntry = {
  d: string;
  mt: number;
  mc: number;
  at: number;
  ac: number;
  mh?: string;
  ah?: string;
};

type Store = {
  v: 1;
  days: DayEntry[];
};

const COOKIE_KEY = 'wph_stats_v1';
const STORE_KEY = 'wguard:stats:v1';
const PAL_LEN = MASTER_COLORS.length;

let inited = false;
let lastManualTs = 0;
let lastAutoTs = 0;

const histCache = new Map<string, { manual: Uint16Array; auto: Uint16Array }>();

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

function dayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function clampDtMs(dt: number): number {
  if (!Number.isFinite(dt)) return 0;
  if (dt < 0) return 0;
  return Math.min(2000, Math.round(dt));
}

function rgbToHex(rgb: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0');
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

function encodeU16(arr: Uint16Array): string {
  try {
    const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      const sub = u8.subarray(i, Math.min(u8.length, i + chunk));
      s += String.fromCharCode(...sub);
    }
    return btoa(s);
  } catch {
    return '';
  }
}

function decodeU16(s: string): Uint16Array {
  try {
    if (!s) return new Uint16Array(PAL_LEN);
    const bin = atob(s);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i) & 255;
    const u16 = new Uint16Array(u8.buffer.slice(0));
    if (u16.length !== PAL_LEN) return new Uint16Array(PAL_LEN);
    return u16;
  } catch {
    return new Uint16Array(PAL_LEN);
  }
}

function readCookieRaw(name: string): string | null {
  try {
    const parts = String(document.cookie || '').split(';');
    for (const p of parts) {
      const t = p.trim();
      if (!t) continue;
      if (t.startsWith(name + '=')) return t.slice(name.length + 1);
    }
  } catch {}
  return null;
}

function writeCookieRaw(name: string, value: string, maxAgeSec: number): void {
  try {
    const safe = encodeURIComponent(value);
    document.cookie = `${name}=${safe}; path=/; max-age=${Math.max(60, maxAgeSec | 0)}; samesite=lax`;
  } catch {}
}

function loadStore(): Store {
  try {
    try {
      const rawS = getPersistentItem(STORE_KEY);
      if (rawS) {
        const parsedS = JSON.parse(rawS);
        if (parsedS && parsedS.v === 1 && Array.isArray(parsedS.days)) {
          const daysS: DayEntry[] = [];
          for (const it of parsedS.days) {
            if (!it || typeof it.d !== 'string') continue;
            daysS.push({
              d: String(it.d),
              mt: Number(it.mt) || 0,
              mc: Number(it.mc) || 0,
              at: Number(it.at) || 0,
              ac: Number(it.ac) || 0,
              mh: typeof it.mh === 'string' ? it.mh : undefined,
              ah: typeof it.ah === 'string' ? it.ah : undefined,
            });
          }
          return { v: 1, days: daysS };
        }
      }
    } catch {}
    const raw0 = readCookieRaw(COOKIE_KEY);
    if (!raw0) return { v: 1, days: [] };
    const raw = decodeURIComponent(raw0);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.days)) return { v: 1, days: [] };
    const days: DayEntry[] = [];
    for (const it of parsed.days) {
      if (!it || typeof it.d !== 'string') continue;
      days.push({
        d: String(it.d),
        mt: Number(it.mt) || 0,
        mc: Number(it.mc) || 0,
        at: Number(it.at) || 0,
        ac: Number(it.ac) || 0,
        mh: typeof it.mh === 'string' ? it.mh : undefined,
        ah: typeof it.ah === 'string' ? it.ah : undefined,
      });
    }
    return { v: 1, days };
  } catch {
    return { v: 1, days: [] };
  }
}

function pruneDays(days: DayEntry[], keep: number): DayEntry[] {
  try {
    const sorted = days.slice().sort((a, b) => String(a.d).localeCompare(String(b.d)));
    return sorted.slice(Math.max(0, sorted.length - keep));
  } catch {
    return days.slice(-keep);
  }
}

function saveStore(store: Store): void {
  try {
    try { setPersistentItem(STORE_KEY, JSON.stringify({ v: 1, days: store.days })); } catch {}
    let days = pruneDays(store.days, 30);
    let s = JSON.stringify({ v: 1, days });
    if (s.length > 3600) {
      days = pruneDays(days, 14);
      s = JSON.stringify({ v: 1, days });
    }
    if (s.length > 3600) {
      days = pruneDays(days, 7);
      s = JSON.stringify({ v: 1, days });
    }
    writeCookieRaw(COOKIE_KEY, s, 3600 * 24 * 365);
  } catch {}
}

function getDay(store: Store, key: string): DayEntry {
  let day = store.days.find(x => x.d === key);
  if (!day) {
    day = { d: key, mt: 0, mc: 0, at: 0, ac: 0, mh: encodeU16(new Uint16Array(PAL_LEN)), ah: encodeU16(new Uint16Array(PAL_LEN)) };
    store.days.push(day);
  } else {
    if (typeof day.mh !== 'string') day.mh = encodeU16(new Uint16Array(PAL_LEN));
    if (typeof day.ah !== 'string') day.ah = encodeU16(new Uint16Array(PAL_LEN));
  }
  return day;
}

function getHist(day: DayEntry): { manual: Uint16Array; auto: Uint16Array } {
  const cached = histCache.get(day.d);
  if (cached) return cached;
  const manual = decodeU16(day.mh || '');
  const auto = decodeU16(day.ah || '');
  const h = { manual, auto };
  histCache.set(day.d, h);
  return h;
}

function flushHist(day: DayEntry): void {
  const h = histCache.get(day.d);
  if (!h) return;
  day.mh = encodeU16(h.manual);
  day.ah = encodeU16(h.auto);
}

function incHist(day: DayEntry, mode: 'manual' | 'auto', colorIdx: number): void {
  try {
    if (!Number.isFinite(colorIdx)) return;
    const idx = Math.max(0, Math.min(PAL_LEN - 1, colorIdx | 0));
    const h = getHist(day);
    const arr = mode === 'manual' ? h.manual : h.auto;
    const v = arr[idx] | 0;
    if (v < 65535) arr[idx] = (v + 1) as any;
  } catch {}
}

function incHistN(day: DayEntry, mode: 'manual' | 'auto', colorIdx: number, n: number): void {
  try {
    if (!Number.isFinite(colorIdx) || !Number.isFinite(n)) return;
    const idx = Math.max(0, Math.min(PAL_LEN - 1, colorIdx | 0));
    const add = Math.max(0, Math.min(65535, n | 0));
    if (!add) return;
    const h = getHist(day);
    const arr = mode === 'manual' ? h.manual : h.auto;
    const v = arr[idx] | 0;
    const next = v + add;
    arr[idx] = (next > 65535 ? 65535 : next) as any;
  } catch {}
}

function sumHist(days: DayEntry[], mode: 'manual' | 'auto'): Uint32Array {
  const out = new Uint32Array(PAL_LEN);
  for (const d of days) {
    try {
      const h = getHist(d);
      const arr = mode === 'manual' ? h.manual : h.auto;
      for (let i = 0; i < PAL_LEN; i++) out[i] += arr[i] | 0;
    } catch {}
  }
  return out;
}

function pickBest(hist: Uint32Array): { idx: number; count: number } {
  let bestIdx = 0;
  let best = 0;
  for (let i = 0; i < hist.length; i++) {
    const v = hist[i] | 0;
    if (v > best) { best = v; bestIdx = i; }
  }
  return { idx: bestIdx, count: best };
}

function ratioDelta(cur: number, prev: number): number {
  try {
    const c = Number(cur) || 0;
    const p = Number(prev) || 0;
    if (p <= 0) return c > 0 ? 1 : 0;
    return (c - p) / p;
  } catch {
    return 0;
  }
}

function windowDays(store: Store, endKey: string, len: number): DayEntry[] {
  const sorted = pruneDays(store.days, 60);
  const idx = sorted.findIndex(d => d.d === endKey);
  if (idx < 0) return [];
  const start = Math.max(0, idx - len + 1);
  return sorted.slice(start, idx + 1);
}

function prevWindowDays(store: Store, endKey: string, len: number): DayEntry[] {
  const sorted = pruneDays(store.days, 60);
  const idx = sorted.findIndex(d => d.d === endKey);
  if (idx < 0) return [];
  const endPrev = idx - len;
  if (endPrev < 0) return [];
  const startPrev = Math.max(0, endPrev - len + 1);
  return sorted.slice(startPrev, endPrev + 1);
}

function sumTimeClicks(days: DayEntry[], mode: 'manual' | 'auto'): { timeSec: number; clicks: number } {
  let ms = 0;
  let clicks = 0;
  for (const d of days) {
    if (mode === 'manual') { ms += Number(d.mt) || 0; clicks += Number(d.mc) || 0; }
    else { ms += Number(d.at) || 0; clicks += Number(d.ac) || 0; }
  }
  return { timeSec: Math.round(ms / 1000), clicks };
}

function buildSlice(mode: 'manual' | 'auto', daysNow: DayEntry[], daysPrev: DayEntry[]): { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } } {
  const cur = sumTimeClicks(daysNow, mode);
  const prev = sumTimeClicks(daysPrev, mode);
  const hCur = sumHist(daysNow, mode);
  const hPrev = sumHist(daysPrev, mode);
  const best = pickBest(hCur);
  const prevBestCount = (best.idx >= 0 && best.idx < hPrev.length) ? (hPrev[best.idx] | 0) : 0;
  const color = MASTER_COLORS[Math.max(0, Math.min(MASTER_COLORS.length - 1, best.idx | 0))];
  return {
    timeSec: cur.timeSec,
    timeDelta: ratioDelta(cur.timeSec, prev.timeSec),
    clicks: cur.clicks,
    clicksDelta: ratioDelta(cur.clicks, prev.clicks),
    bestColor: {
      name: String(color?.name || 'Unknown'),
      count: best.count,
      hex: rgbToHex(color?.rgb || [0, 0, 0]),
      delta: ratioDelta(best.count, prevBestCount),
    },
  };
}

export function getBootStats(): BootStats {
  const store = loadStore();
  const today = dayKey();

  const todayDays = windowDays(store, today, 1);
  const prevDayDays = prevWindowDays(store, today, 1);

  const weekDays = windowDays(store, today, 7);
  const prevWeekDays = prevWindowDays(store, today, 7);

  const allDays = pruneDays(store.days, 3650);

  const z = { timeSec: 0, timeDelta: 0, clicks: 0, clicksDelta: 0, bestColor: { name: 'Unknown', count: 0, hex: '#000000', delta: 0 } };

  const manualToday = todayDays.length ? buildSlice('manual', todayDays, prevDayDays) : z;
  const manualWeek = weekDays.length ? buildSlice('manual', weekDays, prevWeekDays) : z;

  const autoToday = todayDays.length ? buildSlice('auto', todayDays, prevDayDays) : z;
  const autoWeek = weekDays.length ? buildSlice('auto', weekDays, prevWeekDays) : z;

  const manualAll = allDays.length ? buildSlice('manual', allDays, []) : z;
  const autoAll = allDays.length ? buildSlice('auto', allDays, []) : z;

  manualAll.timeDelta = 0;
  manualAll.clicksDelta = 0;
  manualAll.bestColor.delta = 0;

  autoAll.timeDelta = 0;
  autoAll.clicksDelta = 0;
  autoAll.bestColor.delta = 0;

  return {
    manual: { yesterday: manualToday, week: manualWeek, allTime: manualAll },
    auto: { yesterday: autoToday, week: autoWeek, allTime: autoAll },
  };
}

function recordTileUpdated(): void {
  try {
    const sm = getStencilManager();
    const auto = !!(isAutoRunning && isAutoRunning());
    if (!auto) return;

    const store = loadStore();
    const key = dayKey();
    const day = getDay(store, key);

    day.ac = (Number(day.ac) || 0) + 1;
    const idx = (sm as any).autoSelectedMasterIdx;
    if (idx != null && Number.isFinite(idx as any)) incHist(day, 'auto', Number(idx));

    flushHist(day);
    saveStore(store);
  } catch {}
}

export function recordManualPlacedFromRemaining(before: number[] | null | undefined, after: number[] | null | undefined): void {
  try {
    if (!Array.isArray(before) || !Array.isArray(after)) return;
    if (before.length !== after.length) return;
    if (!before.length) return;
    const store = loadStore();
    const day = getDay(store, dayKey());
    let sum = 0;
    const len = Math.min(PAL_LEN, before.length, after.length);
    for (let i = 0; i < len; i++) {
      const b = Number(before[i]) | 0;
      const a = Number(after[i]) | 0;
      const d = b - a;
      if (d > 0) {
        sum += d;
        incHistN(day, 'manual', i, d);
      }
    }
    if (sum > 0) {
      day.mc = (Number(day.mc) || 0) + sum;
      flushHist(day);
      saveStore(store);
    }
  } catch {}
}

export function recordManualTick(active: boolean): void {
  const now = Date.now();
  const dt = lastManualTs ? clampDtMs(now - lastManualTs) : 0;
  lastManualTs = now;
  if (!active || dt <= 0) return;
  try {
    const store = loadStore();
    const day = getDay(store, dayKey(now));
    day.mt = (Number(day.mt) || 0) + dt;
    saveStore(store);
  } catch {}
}

export function recordAutoTick(active: boolean): void {
  const now = Date.now();
  const dt = lastAutoTs ? clampDtMs(now - lastAutoTs) : 0;
  lastAutoTs = now;
  if (!active || dt <= 0) return;
  try {
    const store = loadStore();
    const day = getDay(store, dayKey(now));
    day.at = (Number(day.at) || 0) + dt;
    saveStore(store);
  } catch {}
}

export function initRealStats(): void {
  if (inited) return;
  inited = true;

  try {
    setInterval(() => {
      try { recordAutoTick(!!(isAutoRunning && isAutoRunning())); } catch {}
    }, 800);
  } catch {}

  try {
    window.addEventListener('message', (ev: any) => {
      try {
        const d = ev?.data;
        if (!d || d.source !== 'wplace-svelte') return;
        if (d.action === 'selectColor' && typeof d.id === 'number') {
          try { getStencilManager().setPendingColorIdx(Number(d.id)); } catch {}
          return;
        }
        if (d.action === 'tileUpdated') recordTileUpdated();
      } catch {}
    });
  } catch {}

  try {
    const onColorPick = (ev: Event) => {
      try {
        const t = (ev as any).target as HTMLElement | null;
        if (!t) return;
        const el = (t.closest && t.closest('button[id^="color-"]')) ? (t.closest('button[id^="color-"]') as HTMLButtonElement) : null;
        if (!el) return;
        const idStr = String(el.id || '').replace(/[^0-9]/g, '');
        const idNum = Number(idStr);
        if (!Number.isFinite(idNum)) return;
        try { getStencilManager().setPendingColorIdx(idNum); } catch {}
      } catch {}
    };
    document.addEventListener('click', onColorPick as any, true);
    document.addEventListener('pointerdown', onColorPick as any, true);
  } catch {}
}
