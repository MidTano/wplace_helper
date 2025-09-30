import { MASTER_COLORS } from '../editor/palette';
 
import { getStencilManager } from '../template/stencilManager';
import { getAutoConfig } from './autoConfig';
import { getSelectedFile, getOriginCoords } from '../overlay/state';

function waitForBmContext(totalTimeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const d: any = (ev as any)?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'bm:context' && d.ok) {
        if (!done) { done = true; cleanup(); resolve(true); }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'bm:interceptStart' }, '*'); } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'bm:triggerPaint' }, '*'); } catch {}
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(false); } }, Math.max(500, totalTimeoutMs));
  });
}

function getBmRequestContext(): { token: string; requestOptions: any; originalBody: string; timestamp: number } | null {
  try { return (window as any).__bmRequestContext || null; } catch { return null; }
}

function isBmContextValid(maxAgeMs = 10000): boolean {
  try {
    const ctx = getBmRequestContext();
    if (!ctx) return false;
    return (Date.now() - Number(ctx.timestamp || 0)) < Math.max(1000, maxAgeMs);
  } catch { return false; }
}

function clearBmRequestContext() {
  try { (window as any).__bmRequestContext = null; } catch {}
  try { window.postMessage({ source: 'wplace-svelte', action: 'bm:clearContext' }, '*'); } catch {}
}

async function placeWithCachedContext(chunkX: number, chunkY: number, coords: number[], colors: number[]): Promise<Response> {
  const ctx = getBmRequestContext();
  if (!ctx) throw new Error('No valid cached context');
  const placed = await bmPlace(chunkX, chunkY, coords, colors, 12000);
  const status = Number(placed?.status || 0);
  if (status === 401 || status === 403) {
    clearBmRequestContext();
    throw new Error('Authentication failed with cached context');
  }
  return new Response('', { status, statusText: String(status) });
}

async function armBlueMarbleContext(): Promise<void> { try { await waitForBmContext(8000); } catch {} }

function bmPlace(chunkX: number, chunkY: number, coords: number[], colors: number[], timeoutMs = 12000): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const d: any = (ev as any)?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'bm:placed') {
        if (!done) { done = true; cleanup(); resolve({ ok: d.ok === true, status: Number(d.status || 0) }); }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'bm:place', chunkX, chunkY, coords: coords.slice(), colors: colors.slice() }, '*'); } catch {}
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve({ ok: false, status: 0 }); } }, Math.max(1000, timeoutMs));
  });
}

function bmPlaceWithIntercept(chunkX: number, chunkY: number, coords: number[], colors: number[], timeoutMs = 15000): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const d: any = (ev as any)?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'bm:placed') {
        if (!done) { done = true; cleanup(); resolve({ ok: d.ok === true, status: Number(d.status || 0) }); }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'bm:placeIntercept', chunkX, chunkY, coords: coords.slice(), colors: colors.slice() }, '*'); } catch {}
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve({ ok: false, status: 0 }); } }, Math.max(1000, timeoutMs));
  });
}


function collectPendingChunksMulti(): Array<[[number, number], Array<[number, number, number]>]> {
  try {
    const sm = getStencilManager();
    const grouped = (sm as any).getPendingGroupedByColor?.();
    const out: Array<[[number, number], Array<[number, number, number]>]> = [];
    if (!grouped || typeof grouped[Symbol.iterator] !== 'function') return out;
    const dMult = Math.max(1, Number(sm?.drawMult || 1));
    const cfg = getAutoConfig();
    const onlySel = !!(cfg as any)?.bmOnlySelected;
    const selIdxRaw = (cfg as any)?.bmSelectedMasterIdx;
    const selIdx = (selIdxRaw == null || !Number.isFinite(selIdxRaw)) ? null : Number(selIdxRaw);
    const mode = String((cfg as any)?.bmMode || 'random');
    const items: Array<[string, Map<number, Array<[number, number]>>]> = [];
    for (const it of grouped as Map<string, Map<number, Array<[number, number]>>>) items.push(it);
    if (mode === 'scan') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ay !== by) return ay - by;
        return ax - bx;
      });
    } else {
      shuffle(items);
    }
    for (const [k, colorMap] of items) {
      const parts = String(k).split(',');
      const cx = Number(parts[0]) || 0;
      const cy = Number(parts[1]) || 0;
      const pixels: Array<[number, number, number]> = [];
      const entries: Array<[number, Array<[number, number]>]> = [];
      for (const ent of colorMap) entries.push(ent);
      try {
        const allowed = getAutoAllowedMasters();
        if (Array.isArray(allowed) && allowed.length) {
          const set = new Set(allowed.map(n=>Number(n)));
          const filtered = entries.filter(e => set.has(e[0]));
          entries.length = 0; for (const e of filtered) entries.push(e);
        }
      } catch {}
      if (onlySel && selIdx != null) {
        const filtered = entries.filter(e => e[0] === selIdx);
        entries.length = 0; for (const e of filtered) entries.push(e);
      }
      for (const [masterIdx, arr] of entries) {
        const btnId = mapMasterIndexToButton(masterIdx);
        if (btnId == null || btnId < 0) continue;
        if (mode === 'scan') {
          arr.sort((p1, p2) => (p1[1] - p2[1]) || (p1[0] - p2[0]));
        } else {
          shuffle(arr);
        }
        for (const p of arr) {
          const x = Math.max(0, Math.round(p[0] / dMult));
          const y = Math.max(0, Math.round(p[1] / dMult));
          pixels.push([x, y, btnId]);
        }
      }
      if (pixels.length) out.push([[cx, cy], pixels]);
    }
    return out;
  } catch { return []; }
}

 


async function placeAllColorsDirect(): Promise<boolean> {
  try { getStencilManager().setPendingColorIdx(null as any); } catch {}
  const chunks = collectPendingChunksMulti();
  if (!chunks.length) return false;
  if (!running) return false;
  
  let remaining = Math.floor(Number((await fetchCharges())?.count) || 0);
  let placed = false;
  
  for (let gi = 0; gi < chunks.length && running; gi++) {
    if (!running) break;
    
    const group = chunks[gi];
    let idx = 0;
    
    while (idx < group[1].length && running) {
      if (!running) break;
      
      if (remaining <= 0) {
        break;
      }
      
      const cfg = getAutoConfig();
      const batchLimit = Math.max(0, Number((cfg as any)?.bmBatchLimit || 0));
      const cap = batchLimit > 0 ? batchLimit : (group[1].length - idx);
      const take = Math.min(remaining, cap, group[1].length - idx);
      const coordsFlat: number[] = [];
      const colorsArr: number[] = [];
      
      for (let k = 0; k < take; k++) {
        const p = group[1][idx + k];
        coordsFlat.push(p[0], p[1]);
        colorsArr.push(p[2]);
      }
      
      let result: any = null;
      let status = 0;
      
      try {
        result = await placeWithCachedContext(group[0][0], group[0][1], coordsFlat, colorsArr);
        status = Number((result as any)?.status || 0);
      } catch (e) {
        if (!running) break;
        try {
          result = await bmPlaceWithIntercept(group[0][0], group[0][1], coordsFlat, colorsArr, 15000);
          status = Number((result as any)?.status || 0);
        } catch {
          status = 0;
        }
      }
      
      if (!running) break;
      
      if (status === 0) {
        try {
          result = await bmPlaceWithIntercept(group[0][0], group[0][1], coordsFlat, colorsArr, 15000);
          status = Number((result as any)?.status || 0);
        } catch {}
      }
      
      if (!running) break;
      
      if (status === 429) {
        const continued = await sleepInterruptible(30000);
        if (!continued || !running) break;
        continue;
      }
      
      if (status === 401 || status === 403) {
        clearBmRequestContext();
        try {
          const retry = await bmPlaceWithIntercept(group[0][0], group[0][1], coordsFlat, colorsArr, 15000);
          const st = Number((retry as any)?.status || 0);
          if (st >= 200 && st < 300) {
            status = st;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
      
      if (status >= 200 && status < 300) {
        try {
          const freshCharges = await fetchCharges();
          if (freshCharges) {
            remaining = Math.floor(Number(freshCharges.count) || 0);
          } else {
            remaining -= take;
          }
        } catch {
          remaining -= take;
        }
        
        idx += take;
        placed = true;
        
        try { window.postMessage({ source: 'wplace-svelte', action: 'reloadTiles' }, '*'); } catch {}
        
        if (!running) break;
        
        try {
          const cfgT = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
          const tw = Math.max(200, Math.min(3000, Number.isFinite(cfgT) ? Math.round(cfgT * 1000) : 2000));
          await waitForTileRefresh(tw);
        } catch {}
        
        if (!running) break;
        
        const continued = await sleepInterruptible(200);
        if (!continued || !running) break;
      } else {
        idx += take;
      }
    }
  }
  return placed;
}
 let running = false;
 let timer: number | null = null;
const LS_ALLOWED = 'wplace:auto-allowed-masters:v1';


let lastCountsKnown: number[] | null = null;



export function isAutoRunning() { return running; }




export function getAutoSavedCounts(): number[] | null {
  try { return lastCountsKnown ? lastCountsKnown.slice() : null; } catch { return null; }
}

function waitForTileRefresh(timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
      try { if (raf != null) cancelAnimationFrame(raf); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const d: any = (ev as any)?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'tileUpdated') {
        if (!done) { done = true; cleanup(); resolve(true); }
      }
    };
    let raf: number | null = null;
    const tick = () => {
      if (!running && !done) { done = true; cleanup(); resolve(false); return; }
      raf = requestAnimationFrame(tick);
    };
    try { window.addEventListener('message', onMsg); } catch {}
    raf = requestAnimationFrame(tick);
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(false); } }, Math.max(200, timeoutMs));
  });
}


 

 

export async function startAutoPainter(_intervalMs = 35000) {
  if (running) return true;
  try {
    try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
    
    running = true;
    
    runAutoLoop();
    return true;
  } catch (e) {
    stopAutoPainter();
    return false;
  }
}

export function stopAutoPainter() {
  running = false;
  if (timer != null) { clearTimeout(timer); timer = null; }
  
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
}

export function stopAutoPainterManual() {
  stopAutoPainter();
}

function getImageKey(): string {
  try {
    const f: any = getSelectedFile && getSelectedFile();
    if (f && (typeof f.name === 'string') && Number.isFinite(f.size)) {
      return `${String(f.name)}|${Number(f.size)||0}`;
    }
  } catch {}
  try {
    const c = getOriginCoords && getOriginCoords();
    if (c && Array.isArray(c)) return `coords:${c.join(',')}`;
  } catch {}
  return 'global';
}


export function getAutoAllowedMasters(): number[] {
  const key = `${LS_ALLOWED}:${getImageKey()}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) { return arr.filter((n: any)=> Number.isFinite(n)).map((n:any)=>Number(n)); }
  } catch {}
  return [];
}

export function setAutoAllowedMasters(list: number[]) {
  try {
    const uniq = Array.from(new Set(list.filter(n=> Number.isFinite(n)).map(n=>Number(n))));
    const key = `${LS_ALLOWED}:${getImageKey()}`;
    localStorage.setItem(key, JSON.stringify(uniq));
    
  } catch {}
}

 



type ColorButton = { id: number; rgb: [number, number, number]; paid: boolean; label?: string };
let colorButtons: ColorButton[] | null = null;
let masterToButton: (number | null)[] | null = null;    

const buttonCache = new Map<string, number>();

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
}

function sleepInterruptible(ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (!running) {
        resolve(false);
        return;
      }
      if (Date.now() - start >= ms) {
        resolve(true);
        return;
      }
      setTimeout(check, Math.min(500, ms));
    };
    check();
  });
}

async function fetchCharges(): Promise<{ count: number; max: number; rechargeTime: number } | null> {
  try {
    const res = await fetch('https://backend.wplace.live/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    const c = (data && data.charges) || {};
    return { count: Math.floor(Number(c.count) || 0), max: Math.floor(Number(c.max) || 0), rechargeTime: Math.floor(Number(c.rechargeTime) || 0) };
  } catch { return null; }
}

 

async function requestColorButtons(timeoutMs = 800): Promise<ColorButton[]> {
  async function once(): Promise<ColorButton[]> {
    return new Promise((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const onMsg = (ev: MessageEvent) => {
        const d: any = (ev as any)?.data;
        if (!d || d.source !== 'wplace-svelte') return;
        if (d.action === 'colorButtons' && d.reqId === reqId) {
          window.removeEventListener('message', onMsg);
          resolve(Array.isArray(d.buttons) ? d.buttons : []);
        }
      };
      window.addEventListener('message', onMsg);
      try { window.postMessage({ source: 'wplace-svelte', action: 'queryColors', reqId }, '*'); } catch {}
      setTimeout(() => { window.removeEventListener('message', onMsg); resolve([]); }, timeoutMs);
    });
  }
  let res = await once();
  if (!res || res.length === 0) {
    try { window.postMessage({ source: 'wplace-svelte', action: 'bm:triggerPaint' }, '*'); } catch {}
    await new Promise(r => setTimeout(r, Math.max(300, timeoutMs)));
    res = await once();
    if (!res || res.length === 0) {
      await new Promise(r => setTimeout(r, Math.max(300, timeoutMs)));
      res = await once();
    }
  }
  return res || [];
}

async function ensureColorMap() {
  if (!colorButtons || colorButtons.length === 0) {
    colorButtons = await requestColorButtons(900);
  }
  
  if (colorButtons && colorButtons.length) {
    const available = colorButtons.filter(b => !b.paid && b.id > 0);
    
    try { buttonCache.clear(); } catch {}
    for (const b of available) {
      const key = `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`;
      buttonCache.set(key, b.id);
    }
  }
  
  
  const availableNow = (colorButtons || []).filter(b => !b.paid && b.id > 0);
  if (!availableNow.length) { 
    masterToButton = MASTER_COLORS.map(() => null); 
    return; 
  }
  
  
  const rgbToButtonMap = new Map<string, number>();
  for (const b of availableNow) {
    const rgbKey = `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`;
    rgbToButtonMap.set(rgbKey, b.id);
  }
  
  masterToButton = MASTER_COLORS.map((mc) => {
    const rgbKey = `${mc.rgb[0]},${mc.rgb[1]},${mc.rgb[2]}`;
    const buttonId = rgbToButtonMap.get(rgbKey) ?? null;
    return buttonId;
  });
}


function mapMasterIndexToButton(idx: number): number | null {
  if (!masterToButton || idx < 0 || idx >= masterToButton.length) return null;
  const buttonId = masterToButton[idx];
  return (buttonId != null && buttonId >= 0) ? buttonId : null;
}

 

async function runAutoLoop() {
  try {
    await ensureColorMap();
    while (running) {
      if (!running) break;
      
      const chunks = collectPendingChunksMulti();
      
      if (!chunks || chunks.length === 0) {
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
        
        const cfg = getAutoConfig();
        const secSeries = Number((cfg as any)?.seriesWaitSec);
        const waitMs = Math.max(1000, Number.isFinite(secSeries) ? Math.round(secSeries * 1000) : 90000);
        const continued = await sleepInterruptible(waitMs);
        if (!continued || !running) break;
        continue;
      }
      
      if (!running) break;
      
      try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
      
      if (!isBmContextValid(10000)) {
        await armBlueMarbleContext();
      }
      
      await placeAllColorsDirect();
      if (!running) break;
      
      try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
      
      const cfg = getAutoConfig();
      const secSeries = Number((cfg as any)?.seriesWaitSec);
      const waitMs = Math.max(1000, Number.isFinite(secSeries) ? Math.round(secSeries * 1000) : 90000);
      const continued = await sleepInterruptible(waitMs);
      if (!continued || !running) break;
    }
  } catch {}
}

