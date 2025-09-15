import { MASTER_COLORS } from '../editor/palette';
import { t } from '../i18n';
import { getStencilManager } from '../template/stencilManager';
import { hasStream, ensureVideo, captureScreenSnapshot, snapshotToClient, showClickMarker } from './captureManager';
import { getAutoConfig } from './autoConfig';
import { getSelectedFile, getOriginCoords } from '../overlay/state';

let running = false;
let timer: number | null = null;
let selectedMasterIdx: number | null = null;
let selectedButtonId: number | null = null;
let tileUpdateListener: ((ev: MessageEvent) => void) | null = null;
let scanDebounce: number | null = null;
const LS_ALLOWED = 'wplace:auto-allowed-masters:v1';
let allowedMastersCache: number[] | null = null;

let pendingColorSettle = false;

let restartCycle = false; 

let autoRestartScheduled = false;

let allowAutoRestart = true;

let autoIntervalMs = 35000;

let lastCountsKnown: number[] | null = null;



export function isAutoRunning() { return running; }



async function buildRandomColorOrder(): Promise<Array<{ idx: number, btnId: number }>> {
  await ensureColorMap();
  const counts = (()=>{ try { return (lastCountsKnown && Array.isArray(lastCountsKnown)) ? lastCountsKnown : getStencilManager().getRemainingCountsTotal(); } catch { return []; } })() as number[];
  let allowed = getAutoAllowedMasters();
  if (!allowed.length) {
    allowed = (counts || []).map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
  }
  const allowedSet = new Set(allowed);
  const out: Array<{ idx: number, btnId: number }> = [];
  for (let i = 0; i < MASTER_COLORS.length; i++) {
    if (!allowedSet.has(i)) continue;
    if (Array.isArray(counts) && counts[i] <= 0) continue;
    const btnId = mapMasterIndexToButton(i) ?? -1;
    if (btnId < 0 || !availableButtonIds.has(btnId)) continue;
    out.push({ idx: i, btnId });
  }
  
  for (let k = out.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; const t = out[k]; out[k] = out[j]; out[j] = t; }
  return out;
}

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


function waitForFirstTileTwice(totalTimeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    let firstKey: string | null = null;
    let count = 0;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
      try { if (raf != null) cancelAnimationFrame(raf); } catch {}
    };
    const keyOf = (d: any): string => {
      try {
        if (Array.isArray(d?.tileXY)) {
          const x = Number(d.tileXY[0]);
          const y = Number(d.tileXY[1]);
          if (Number.isFinite(x) && Number.isFinite(y)) return `${x},${y}`;
        }
      } catch {}
      return String(d?.endpoint || '');
    };
    const onMsg = (ev: MessageEvent) => {
      const d: any = (ev as any)?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'tileUpdated') {
        const k = keyOf(d);
        if (!firstKey) {
          firstKey = k; count = 1;
        } else if (k === firstKey) {
          count++;
          if (count >= 2 && !done) { done = true; cleanup(); resolve(true); }
        }
      }
    };
    let raf: number | null = null;
    const tick = () => {
      if (!running && !done) { done = true; cleanup(); resolve(false); return; }
      raf = requestAnimationFrame(tick);
    };
    try { window.addEventListener('message', onMsg); } catch {}
    raf = requestAnimationFrame(tick);
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(false); } }, Math.max(400, totalTimeoutMs));
  });
}

async function seedButtonsFromPage() {
  try {
    
    try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
    
    await ensureEditingMode();
    await sleep(260);
    const btns = await requestColorButtons(900);
    if (btns && btns.length) {
      for (const b of btns) {
        if (!b) continue;
        
        if (!b.paid && b.id > 0) {
          const k = `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`;
          if (!buttonCache.has(k)) buttonCache.set(k, b.id);
        }
      }
    }
    
    try { lastCountsKnown = getStencilManager().getRemainingCountsTotal()?.slice?.() || null; } catch { lastCountsKnown = null; }
  } catch {}
}

async function handlePaintOut() {
  if (autoRestartScheduled) return;
  autoRestartScheduled = true;
  
  stopAutoPainter();
  if (!allowAutoRestart) { autoRestartScheduled = false; return; }
  
  try { await clickCenterBottomButton(2); } catch {}
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  
  try { openPaletteSimple(); } catch {}
  try { await ensureEditingMode(); } catch {}
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'reloadTiles' }, '*'); } catch {}
  try { await waitForTileRefresh(3000); } catch {}
  await sleep(autoIntervalMs);
  if (!allowAutoRestart) { autoRestartScheduled = false; return; }
  
  try { colorButtons = await requestColorButtons(1000); } catch {}
  await ensureColorMap();
  try { lastCountsKnown = getStencilManager().getRemainingCountsTotal()?.slice?.() || lastCountsKnown; } catch {}
  
  try {
    
    if (!allowAutoRestart || !hasStream()) { autoRestartScheduled = false; return; }
    
    await ensureEditingMode();
    
    await chooseRandomAvailableColor();
    const ok = await ensureVideo();
    if (!ok || !allowAutoRestart) { autoRestartScheduled = false; return; }
    running = true;
    runAutoLoop();
  } finally {
    autoRestartScheduled = false;
  }
}

export async function startAutoPainter(intervalMs = 35000) {
  if (running) return true;
  try {
    
    try {
      const cfg = getAutoConfig();
      const sec = Number((cfg as any)?.paintOutWaitSec);
      autoIntervalMs = Math.max(1000, Number.isFinite(sec) ? Math.round(sec * 1000) : 35000);
    } catch { autoIntervalMs = 35000; }
    autoRestartScheduled = false;
    allowAutoRestart = true;
    
    if (!getStencilManager().enhanced) {
      try { alert(t('automode.alert.enableEnhanced')); } catch {}
      return false;
    }
    
    if (!hasStream()) return false;
    
    try { openPaletteSimple(); } catch {}
    
    const editOk = await ensureEditingMode();
    if (!editOk) return false;
    
    await seedButtonsFromPage();
    
    await ensureColorMap();
    await chooseRandomAvailableColor();
    pendingColorSettle = true;
    const ok = await ensureVideo();
    if (!ok) throw new Error('ensureVideo failed');

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
  if (scanDebounce != null) { clearTimeout(scanDebounce); scanDebounce = null; }
  if (tileUpdateListener) { try { window.removeEventListener('message', tileUpdateListener); } catch {} tileUpdateListener = null; }
  
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
}

export function stopAutoPainterManual() {
  
  allowAutoRestart = false;
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

async function switchToAnotherColorOrStop(): Promise<boolean> {
  
  await ensureColorMap();
  await chooseRandomAvailableColor();
  if (selectedButtonId == null || selectedMasterIdx == null) {
    stopAutoPainter();
    return false;
  }
  return true;
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

async function scanAndClick(): Promise<number> {
  if (!running) return 0;
  
  try {
    const outEl = document.querySelector('body > div:nth-child(1) > section > ol') as HTMLElement | null;
    if (outEl) {
      await handlePaintOut();
      return 0;
    }
  } catch {}
  
  if (!isPaletteOpen()) {
    const ok = await ensureEditingMode();
    if (!ok) { stopAutoPainter(); return 0; }
  }
  
  
  try { 
    await ensureColorMap(); 
    
  } catch (e) {
    console.error('Failed to update color map:', e);
  }
  const snap = captureScreenSnapshot();
  if (!snap) return 0;
  const vw = snap.width, vh = snap.height;
  if (vw < 2 || vh < 2) return 0;

  
  const enhanced = !!getStencilManager().enhanced;
  if (!enhanced) return 0;
  const palette: [number, number, number][] = MASTER_COLORS.map(c => [c.rgb[0], c.rgb[1], c.rgb[2]]);

  
  const cfg = getAutoConfig();
  const step = Math.max(1, (cfg.scanStep|0) || 1); 
  const data = snap.data.data;
  
  const singleColorMode = (selectedMasterIdx != null && selectedButtonId != null);
  const threshSq = (cfg.enhancedThresh|0) * (cfg.enhancedThresh|0);
  const exactModeCfg = ((cfg.enhancedThresh|0) <= 1);
  
  const strictExact = !singleColorMode;
  const exactModeEffective = (strictExact || exactModeCfg);
  const threshSqEff = exactModeEffective ? 0 : threshSq;
  const detectionBlue: [number, number, number] = [0, 0, 240];
  
  
  const allowedIdxs: number[] = (!singleColorMode && masterToButton) ? 
    masterToButton.map((buttonId, masterIdx) => (buttonId != null && buttonId >= 0 ? masterIdx : -1)).filter(i => i >= 0) : [];
  const paletteAllowed: [number, number, number][] = (!singleColorMode) ? allowedIdxs.map(i => palette[i]) : [detectionBlue];

  
  const buckets = new Map<number, Array<[number, number]>>();
  let clicks = 0;
  const minDist = Math.max(0, cfg.minDist|0); 
  const maxTargets = Infinity; 
  
  const cell = Math.max(1, minDist);
  const grid = new Map<string, Array<[number, number]>>();
  const keyOf = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  
  const ys: number[] = [];
  const xs: number[] = [];
  const yStart = Math.floor(Math.random() * step);
  const xStart = Math.floor(Math.random() * step);
  for (let y = yStart; y < vh; y += step) ys.push(y);
  for (let x = xStart; x < vw; x += step) xs.push(x);
  
  for (let i = ys.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = ys[i]; ys[i] = ys[j]; ys[j] = t; }
  for (let i = xs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = xs[i]; xs[i] = xs[j]; xs[j] = t; }

  for (let yi = 0; yi < ys.length; yi++) {
    if (!running) return clicks;
    const y = ys[yi];
    const row = y * vw * 4;
    for (let xi = 0; xi < xs.length; xi++) {
      if (!running) return clicks;
      const x = xs[xi];
      const i = row + x * 4;
      const a = data[i + 3];
      if (a < 200) continue; 
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let best = -1, bestD = Infinity;
      for (let p = 0; p < paletteAllowed.length; p++) {
        const pr = paletteAllowed[p][0], pg = paletteAllowed[p][1], pb = paletteAllowed[p][2];
        const dr = r - pr, dg = g - pg, db = b - pb;
        const d = dr*dr + dg*dg + db*db;
        if (d < bestD) { bestD = d; best = p; }
        if (exactModeEffective && d === 0) break;
      }
      
      let neighborsOk = false;
      if (best >= 0 && bestD <= threshSqEff) {
        if (singleColorMode) {
          neighborsOk = true;
        } else {
          let agree = 0, total = 0;
          const offs = [ [0,0], [1,0], [-1,0], [0,1], [0,-1] ];
          for (let oi = 0; oi < offs.length; oi++) {
            const nx = x + offs[oi][0];
            const ny = y + offs[oi][1];
            if (nx < 0 || ny < 0 || nx >= vw || ny >= vh) continue;
            const ni = (ny * vw + nx) * 4;
            const na = data[ni + 3];
            if (na < 200) continue;
            const nr = data[ni], ng = data[ni + 1], nb = data[ni + 2];
            let b2 = -1, d2 = Infinity;
            for (let p = 0; p < paletteAllowed.length; p++) {
              const pr = paletteAllowed[p][0], pg = paletteAllowed[p][1], pb = paletteAllowed[p][2];
              const dr2 = nr - pr, dg2 = ng - pg, db2 = nb - pb;
              const dd = dr2*dr2 + dg2*dg2 + db2*db2;
              if (dd < d2) { d2 = dd; b2 = p; }
              if (exactModeEffective && dd === 0) { d2 = 0; b2 = p; break; }
            }
            total++;
            if (b2 === best && d2 <= threshSqEff) agree++;
          }
          neighborsOk = agree >= 3;
        }
      }
      if (best >= 0 && bestD <= threshSqEff && neighborsOk) {
        const targetRGB: [number, number, number] = paletteAllowed[best];
        const [rx, ry] = refinePointToClusterCenter(snap as any, x, y, targetRGB, threshSqEff);
        const pt = snapshotToClient(snap, rx, ry);
        if (!pt) continue;
        const [cx, cy] = pt;
        
        const tm = document.querySelector('.topmenu-root') as HTMLElement | null;
        if (tm) {
          const tr = tm.getBoundingClientRect();
          if (cx >= tr.left && cx <= tr.right && cy >= tr.top && cy <= tr.bottom) continue;
        }
        
        let tooClose = false;
        if (minDist > 0) {
          const gx = Math.floor(cx / cell), gy = Math.floor(cy / cell);
          for (let oy = -1; oy <= 1 && !tooClose; oy++) {
            for (let ox = -1; ox <= 1 && !tooClose; ox++) {
              const arr = grid.get(`${gx + ox},${gy + oy}`);
              if (!arr) continue;
              for (let k = 0; k < arr.length; k++) {
                const t = arr[k];
                const dx = t[0] - cx, dy = t[1] - cy;
                if (dx*dx + dy*dy < minDist*minDist) { tooClose = true; break; }
              }
            }
          }
        }
        if (!tooClose) {
          
          const masterIdx = singleColorMode ? (selectedMasterIdx as number) : allowedIdxs[best];
          const btnId = singleColorMode ? (selectedButtonId as number) : mapMasterIndexToButton(masterIdx);
          if (btnId == null || btnId < 0) continue; 
          if (!availableButtonIds.has(btnId)) continue; 
          const arr = buckets.get(btnId);
          if (arr) arr.push([cx, cy]); else buckets.set(btnId, [[cx, cy]]);
          
          if (minDist > 0) {
            const k = keyOf(cx, cy);
            const arr = grid.get(k);
            if (arr) arr.push([cx, cy]); else grid.set(k, [[cx, cy]]);
          }
        }
      }
    }
  }

  if (!buckets.size) return 0;
  
  const ids = Array.from(buckets.keys());
  shuffle(ids);
  for (const id of ids) {
    if (!running) break;
    
    try {
      const outEl = document.querySelector('body > div:nth-child(1) > section > ol') as HTMLElement | null;
      if (outEl) { await handlePaintOut(); return clicks; }
    } catch {}
    const list = buckets.get(id)!;
    shuffle(list);
    if (!running) break;
    
    try {
      const outEl2 = document.querySelector('body > div:nth-child(1) > section > ol') as HTMLElement | null;
      if (outEl2) { await handlePaintOut(); return clicks; }
    } catch {}
    
    await selectColor(id);
    {
      const cfg = getAutoConfig();
      try {
        const tSec = Number((cfg as any)?.tileUpdatedTimeoutSec);
        const tMs = Number.isFinite(tSec) ? Math.round(tSec * 1000) : 3000;
        const total = Math.min(12000, Math.max(800, 2 * tMs + 1000));
        await waitForFirstTileTwice(total);
      } catch {}
      const sSec = Number((cfg as any)?.switchPreWaitSec);
      await sleep(Number.isFinite(sSec) ? Math.max(0, Math.round(sSec * 1000)) : 0);
    }
    for (let i = 0; i < list.length; i++) {
      if (!running) break;
      
      try {
        const outEl3 = document.querySelector('body > div:nth-child(1) > section > ol') as HTMLElement | null;
        if (outEl3) { await handlePaintOut(); return clicks; }
      } catch {}
      const [cx, cy] = list[i];
      showClickMarker(cx, cy);
      await synthClick(cx, cy);
      await new Promise(r => setTimeout(r, Math.max(0, cfg.interClickDelayMs|0)));
      clicks++;
    }
  }
  return clicks;
}

async function synthClick(x: number, y: number) {
  
  try {
    window.postMessage({ source: 'wplace-svelte', action: 'pageClick', x, y }, '*');
  } catch {}
}


type ColorButton = { id: number; rgb: [number, number, number]; paid: boolean; label?: string };
let colorButtons: ColorButton[] | null = null;
let masterToButton: (number | null)[] | null = null;    

const buttonCache = new Map<string, number>();

let availableButtonIds = new Set<number>();

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function refinePointToClusterCenter(
  snap: { width: number; height: number; data: ImageData },
  x: number,
  y: number,
  matchRGB: [number, number, number],
  threshSq: number
): [number, number] {
  try {
    const vw = snap.width, vh = snap.height;
    const data = snap.data.data;
    const R = 3; 
    let sumX = 0, sumY = 0, cnt = 0;
    const y0 = Math.max(0, y - R);
    const y1 = Math.min(vh - 1, y + R);
    const x0 = Math.max(0, x - R);
    const x1 = Math.min(vw - 1, x + R);
    for (let ny = y0; ny <= y1; ny++) {
      const row = ny * vw * 4;
      for (let nx = x0; nx <= x1; nx++) {
        const i = row + nx * 4;
        const a = data[i + 3];
        if (a < 200) continue; 
        const dr = data[i] - matchRGB[0];
        const dg = data[i + 1] - matchRGB[1];
        const db = data[i + 2] - matchRGB[2];
        const dd = dr * dr + dg * dg + db * db;
        if (dd <= threshSq) { sumX += nx; sumY += ny; cnt++; }
      }
    }
    if (cnt > 0) return [sumX / cnt, sumY / cnt];
  } catch {}
  return [x, y];
}

function openPaletteSimple(): boolean {
  const sels = [
    'body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-6wmtgk > div.absolute.bottom-3.left-1\\/2.z-30.-translate-x-1\\/2 > button',
    'div.absolute.bottom-3.left-1\\/2.z-30.-translate-x-1\\/2 > button',
    'div.absolute.bottom-3.left-1\\/2.-translate-x-1\\/2 > button',
    'div.absolute.bottom-3.left-1\\/2 > button',
    'div.bottom-3 [class*="left-1\\/2"] button',
    'button[aria-label="Открыть палитру"], button[title*="палитр" i]'
  ];
  for (const sel of sels) {
    try {
      const btn = document.querySelector(sel) as HTMLElement | null;
      if (btn) {
        if (typeof (btn as any).click === 'function') {
          (btn as any).click();
          try { setTimeout(()=>{ try{ (btn as any).click(); } catch{} }, 120); } catch {}
          return true;
        }
        try {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          try { setTimeout(()=>{ try{ btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch{} }, 120); } catch {}
          return true;
        } catch {}
      }
    } catch {}
  }
  return false;
}

function isPaletteOpen(): boolean {
  try {
    const sel = 'body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-6wmtgk > div.absolute.bottom-0.left-0.z-50.w-full > div > div > div.mb-4.mt-3';
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return false;
    const st = getComputedStyle(el);
    return !!(st && st.display !== 'none' && st.visibility !== 'hidden' && el.clientHeight > 0);
  } catch { return false; }
}

async function ensureEditingMode(retries = 5): Promise<boolean> {
  if (isPaletteOpen()) return true;
  for (let i = 0; i < retries; i++) {
    try { openPaletteSimple() || (await clickCenterBottomButton()); } catch {}
    await sleep(220 + i * 150);
    if (isPaletteOpen()) return true;
    
    try {
      const btns = await requestColorButtons(500);
      if (btns && btns.length) return true;
    } catch {}
  }
  return isPaletteOpen();
}


async function clickCenterBottomButton(times = 1): Promise<boolean> {
  const sels = [
    'body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-6wmtgk > div.absolute.bottom-0.left-0.z-50.w-full > div > div > div.relative.h-12.sm\\:h-14 > div.absolute.bottom-0.left-1\\/2.-translate-x-1\\/2 > button',
    'div.absolute.bottom-0.left-0.z-50.w-full div.relative.h-12 div.absolute.bottom-0.left-1/2.-translate-x-1/2 > button',
    'div.absolute.bottom-0.left-0 [class*="left-1/2"] button',
  ];
  for (let t = 0; t < Math.max(1, times); t++) {
    for (const sel of sels) {
      try {
        const btn = document.querySelector(sel) as HTMLElement | null;
        if (btn) {
          if (typeof (btn as any).click === 'function') {
            (btn as any).click();
          } else {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
          await sleep(50);
          break;
        }
      } catch {}
    }
  }
  return true;
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
    try { openPaletteSimple(); } catch {}
    await sleep(240);
    res = await once();
  }
  return res || [];
}

async function ensureColorMap() {
  if (!colorButtons) {
    colorButtons = await requestColorButtons();
  }
  
  if (colorButtons && colorButtons.length) {
    
    const available = colorButtons.filter(b => !b.paid && b.id > 0);
    
    try { availableButtonIds = new Set(available.map(b => b.id)); } catch { availableButtonIds = new Set(); }
    
    
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
  
  masterToButton = MASTER_COLORS.map((mc, masterIdx) => {
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

async function selectColor(id: number) {
  try { window.postMessage({ source: 'wplace-svelte', action: 'selectColor', id }, '*'); } catch {}
  
  await new Promise(r => setTimeout(r, 20));
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'reloadTiles' }, '*'); } catch {}
  pendingColorSettle = true;
}

async function chooseRandomAvailableColor() {
  
  colorButtons = await requestColorButtons();
  const avail = (colorButtons || []).filter(b => !b.paid && b.id > 0);
  if (!avail.length) { selectedMasterIdx = null; selectedButtonId = null; return; }
  
  let allowed = getAutoAllowedMasters();
  if (!allowed.length) {
    try {
      const countsLive = getStencilManager().getRemainingCountsTotal();
      const countsUse = (lastCountsKnown && Array.isArray(lastCountsKnown)) ? lastCountsKnown : countsLive;
      allowed = (countsUse || []).map((v: number, i: number) => v > 0 ? i : -1).filter((i: number) => i >= 0);
    } catch { allowed = []; }
  }
  const allowedSet = new Set(allowed);
  
  const counts = (()=>{ try { return (lastCountsKnown && Array.isArray(lastCountsKnown)) ? lastCountsKnown : getStencilManager().getRemainingCountsTotal(); } catch { return []; } })() as number[];
  const candidates: Array<{ idx: number, btnId: number }>= [];
  for (const b of avail) {
    
    let bestIdx = -1; let bestD = Infinity;
    for (let i = 0; i < MASTER_COLORS.length; i++) {
      const mr = MASTER_COLORS[i].rgb[0], mg = MASTER_COLORS[i].rgb[1], mb = MASTER_COLORS[i].rgb[2];
      const dr = (b.rgb[0] | 0) - mr;
      const dg = (b.rgb[1] | 0) - mg;
      const db = (b.rgb[2] | 0) - mb;
      const d = dr*dr + dg*dg + db*db;
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    const idx = bestIdx;
    if (idx < 0) continue;
    if (allowedSet.size && !allowedSet.has(idx)) continue;
    if (Array.isArray(counts) && counts[idx] <= 0) continue;
    const btnId = b.id;
    if (btnId == null || btnId < 0) continue;
    candidates.push({ idx, btnId });
  }
  if (!candidates.length) { selectedMasterIdx = null; selectedButtonId = null; return; }
  const pick = candidates[(Math.random() * candidates.length) | 0];
  selectedMasterIdx = pick.idx;
  
  selectedButtonId = pick.btnId;
  
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  await ensureEditingMode();
  await sleep(180);
  if (selectedButtonId != null) { await selectColor(selectedButtonId); }
  try { getStencilManager().setAutoSelectedMasterIdx(selectedMasterIdx); } catch {}
}

async function chooseNextAvailableColor(): Promise<boolean> {
  await ensureColorMap();
  
  const counts = (()=>{ try { return (lastCountsKnown && Array.isArray(lastCountsKnown)) ? lastCountsKnown : getStencilManager().getRemainingCountsTotal(); } catch { return []; } })() as number[];
  let allowed = getAutoAllowedMasters();
  if (!allowed.length) {
    allowed = counts.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
  }
  const allowedSet = new Set(allowed);
  const candidates: Array<{ idx: number, btnId: number }>= [];
  for (let i = 0; i < MASTER_COLORS.length; i++) {
    if (!allowedSet.has(i)) continue;
    if (Array.isArray(counts) && counts[i] <= 0) continue;
    const btnId = mapMasterIndexToButton(i) ?? -1;
    if (btnId < 0) continue;
    candidates.push({ idx: i, btnId });
  }
  if (!candidates.length) { selectedMasterIdx = null; selectedButtonId = null; stopAutoPainter(); return false; }
  
  let pool = candidates.slice();
  if (pool.length > 1) {
    if (selectedMasterIdx != null) pool = pool.filter(c => c.idx !== selectedMasterIdx);
    if (selectedButtonId != null && pool.length > 1) pool = pool.filter(c => c.btnId !== selectedButtonId);
    if (!pool.length) pool = candidates.slice();
  }
  
  const next = pool[(Math.random() * pool.length) | 0];
  selectedMasterIdx = next.idx;
  selectedButtonId = next.btnId;
  
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  await ensureEditingMode();
  await sleep(180);
  await selectColor(selectedButtonId);
  try { getStencilManager().setAutoSelectedMasterIdx(selectedMasterIdx); } catch {}
  pendingColorSettle = true;
  return true;
}

async function runAutoLoop() {
  try {
    while (running) {
      
      if (!isPaletteOpen()) {
        const ok = await ensureEditingMode();
        if (!ok) { await sleep(400); continue; }
      }
      
      const order = await buildRandomColorOrder();
      
      if (!order || order.length === 0) {
        
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
        await clickCenterBottomButton(1);
        try {
          const cfgT = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
          const tw = Math.max(200, Math.min(3000, Number.isFinite(cfgT) ? Math.round(cfgT * 1000) : 2000));
          await waitForTileRefresh(tw);
        } catch {}
        
        try { await showAllColorsAndRefresh(300); } catch {}
        
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
        
        {
          const cfg = getAutoConfig();
          const sec = Number((cfg as any)?.paintOutWaitSec);
          const waitMs = Math.max(1000, Number.isFinite(sec) ? Math.round(sec * 1000) : 35000);
          await sleep(waitMs);
        }
        continue;
      }
      
      try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
      for (const c of order) {
        if (!running) break;
        
        try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
        await ensureEditingMode();
        await sleep(180);
        await selectColor(c.btnId);
        try { selectedMasterIdx = c.idx; selectedButtonId = c.btnId; getStencilManager().setAutoSelectedMasterIdx(selectedMasterIdx as any); } catch {}
        pendingColorSettle = true;
        
        { const cfg = getAutoConfig();
          try {
            const tSec = Number((cfg as any)?.tileUpdatedTimeoutSec);
            const tMs = Number.isFinite(tSec) ? Math.round(tSec * 1000) : 3000;
            const total = Math.min(12000, Math.max(800, 2 * tMs + 1000));
            await waitForFirstTileTwice(total);
          } catch {}
          const sSec = Number((cfg as any)?.switchPreWaitSec);
          await sleep(Number.isFinite(sSec) ? Math.max(0, Math.round(sSec * 1000)) : 0);
        }
        if (!running) break;
        await scanAndClick();
        if (!running) break;
        await sleep(2000); 
        if (!isPaletteOpen()) {
          const ok2 = await ensureEditingMode();
          if (!ok2) { await sleep(400); break; }
        }
      }
      if (!running) break;
      
      await clickCenterBottomButton(1);
      try {
        const cfgT2 = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
        const tw2 = Math.max(200, Math.min(3000, Number.isFinite(cfgT2) ? Math.round(cfgT2 * 1000) : 2000));
        await waitForTileRefresh(tw2);
      } catch {}
      
      try { await showAllColorsAndRefresh(300); } catch {}
      
      try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
      
      {
        const cfg = getAutoConfig();
        const sec = Number((cfg as any)?.paintOutWaitSec);
        const waitMs = Math.max(1000, Number.isFinite(sec) ? Math.round(sec * 1000) : 35000);
        await sleep(waitMs);
      }
    }
  } catch {}
}

async function showAllColorsAndRefresh(waitMs = 300) {
  try {
    try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
    
    try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintShowAllStart' }, '*'); } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'reloadTiles' }, '*'); } catch {}
    await ensureEditingMode();
    
    try {
      const tw = Math.max(200, Math.min(1200, Number(waitMs)||300));
      await waitForTileRefresh(tw);
    } catch {}
    await sleep(waitMs);
    try { colorButtons = await requestColorButtons(900); } catch {}
    await ensureColorMap();
    
    try { lastCountsKnown = getStencilManager().getRemainingCountsTotal()?.slice?.() || lastCountsKnown; } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintShowAllEnd' }, '*'); } catch {}
  } catch {}
}
