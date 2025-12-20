import { playSendOrbitalEffect, SendEffectColor } from '../effects/SendEffect';
import { MASTER_COLORS } from '../editor/palette';
 
import { getStencilManager } from '../template/stencilManager';
import { getAutoConfig } from './autoConfig';
import { t } from '../i18n';
import { showCenterNotice } from '../ui/centerNotice';
import { getSelectedFile, getOriginCoords } from '../overlay/state';
import { getPersistentItem, setPersistentItem, removePersistentItem } from '../wguard/stealth/store';
import { normalizeChannelData, postChannelMessage } from '../wguard/core/channel';
import { listenWGuardEvent, WGuardEvents } from '../wguard/core/events';
import { hasStream, ensureVideo, captureScreenSnapshot, showClickMarker, resetCaptureState, clearSnapshotCache } from './captureManager';
import { log, setLoggingEnabled, getLoggingEnabled } from '../overlay/log';

let enhancedNoticeActive = false;
let enhancedNoticeTimer: number | null = null;
let enhancedOverlayResetNeeded = false;

let enhancedGuardUnsub: (() => void) | null = null;

function ensureEnhancedGuard() {
  try {
    if (enhancedGuardUnsub) return;
    enhancedGuardUnsub = listenWGuardEvent(WGuardEvents.ENHANCED, (detail: any) => {
      try {
        const on = !!(detail && (detail as any).on);
        if (!on && running) stopAutoPainter();
      } catch {}
    });
  } catch {
    enhancedGuardUnsub = null;
  }
}

let canvasInputBlockerDispose: (() => void) | null = null;

function installCanvasInputBlocker() {
  try {
    if (canvasInputBlockerDispose) return;
    const getTargets = () => {
      const canvas = document.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement | null;
      const container = document.querySelector('div.maplibregl-canvas-container') as HTMLDivElement | null;
      const bar = (document.querySelector('body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-1uha8ag > div.absolute.bottom-0.left-0.z-50.w-full') || document.querySelector('div.absolute.bottom-0.left-0.z-50.w-full')) as HTMLDivElement | null;
      return { canvas, container, bar };
    };
    const shouldBlock = (ev: Event): boolean => {
      try {
        const anyEv: any = ev as any;
        if (!anyEv || anyEv.isTrusted !== true) return false;
        const { canvas, container, bar } = getTargets();
        if (!canvas && !container && !bar) return false;
        const path: any[] = (anyEv.composedPath && typeof anyEv.composedPath === 'function') ? anyEv.composedPath() : [];
        if (Array.isArray(path) && path.length) {
          if (canvas && path.includes(canvas)) return true;
          if (container && path.includes(container)) return true;
          if (bar && path.includes(bar)) return true;
        }
        const t = anyEv.target as any;
        if (container && t && container.contains && container.contains(t)) return true;
        if (canvas && t && canvas.contains && canvas.contains(t)) return true;
        if (bar && t && bar.contains && bar.contains(t)) return true;
      } catch {}
      return false;
    };
    const handler = (ev: Event) => {
      try {
        if (!running) return;
        if (!shouldBlock(ev)) return;
        try { (ev as any).preventDefault && (ev as any).preventDefault(); } catch {}
        try { (ev as any).stopImmediatePropagation && (ev as any).stopImmediatePropagation(); } catch {}
        try { (ev as any).stopPropagation && (ev as any).stopPropagation(); } catch {}
      } catch {}
    };
    const opts: AddEventListenerOptions = { capture: true, passive: false };
    const types = ['pointermove','pointerdown','pointerup','pointerover','pointerout','pointerenter','pointerleave','mousemove','mousedown','mouseup','mouseenter','mouseleave','click','dblclick','contextmenu','wheel'];
    for (const t of types) {
      try { document.addEventListener(t, handler as any, opts); } catch {}
    }
    canvasInputBlockerDispose = () => {
      const o: AddEventListenerOptions = { capture: true };
      for (const t of types) {
        try { document.removeEventListener(t, handler as any, o); } catch {}
      }
    };
  } catch {}
}

function removeCanvasInputBlocker() {
  try { canvasInputBlockerDispose && canvasInputBlockerDispose(); } catch {}
  canvasInputBlockerDispose = null;
}

function readChannelPayload(event: MessageEvent | { data?: any } | null | undefined) {
  return normalizeChannelData((event as any)?.data);
}

function sendChannel(payload: Record<string, any>) {
  postChannelMessage(payload);
}
let running = false;
let runEpoch = 0;
const LS_ALLOWED = 'wguard:auto-allowed-masters:v1';
const LS_AUTORUN = 'wguard:auto-run:v1';

let lastCountsKnown: number[] | null = null;

export function isAutoRunning() { return running; }

export function getAutoSavedCounts(): number[] | null {
  try { return lastCountsKnown ? lastCountsKnown.slice() : null; } catch { return null; }
}

export async function startAutoPainter(_intervalMs = 35000) {
  if (running) return true;
  try {
    try { ensureEnhancedGuard(); } catch {}
    try { setLoggingEnabled(true); log('auto', 'start', { logs: getLoggingEnabled(), ts: Date.now() }); } catch {}
    try {
      const cfg0 = getAutoConfig() as any;
      const method0 = String(cfg0?.captureMethod || 'canvas');
      if (method0 === 'display') {
        clearSnapshotCache();
      } else {
        resetCaptureState();
      }
    } catch {
      try { resetCaptureState(); } catch {}
    }
    try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
    try {
      const allowed = getAutoAllowedMasters();
      try { (getStencilManager() as any).setAutoSelectedMasters?.(Array.isArray(allowed) && allowed.length ? allowed : null); } catch {}
    } catch {}
    try {
      const sm = getStencilManager();
      if (!sm || !sm.enhanced) {
        if (!enhancedNoticeActive) {
          enhancedNoticeActive = true;
          try { showCenterNotice(t('automode.alert.enableEnhanced') || 'Включите «Улучшенные цвета»', 3200); } catch {}
          try {
            if (enhancedNoticeTimer) clearTimeout(enhancedNoticeTimer);
            enhancedNoticeTimer = window.setTimeout(() => {
              try { enhancedNoticeActive = false; } catch {}
              try { enhancedNoticeTimer = null; } catch {}
            }, 4000);
          } catch {}
        }
        return false;
      }
    } catch {}
    
    runEpoch = (runEpoch + 1) | 0;
    running = true;
    try { installCanvasInputBlocker(); } catch {}
    try { 
      const cfg = getAutoConfig() as any;
      if (cfg && cfg.persistAutoRun) {
        setPersistentItem(LS_AUTORUN, JSON.stringify({ running: true, ts: Date.now() }));
      } else {
        removePersistentItem(LS_AUTORUN);
      }
    } catch {}
    
    runAutoLoop();
    return true;
  } catch (e) {
    stopAutoPainter();
    return false;
  }
}

export function stopAutoPainter() {
  running = false;
  runEpoch = (runEpoch + 1) | 0;
  try { resetCaptureState(); } catch {}
  try { removeCanvasInputBlocker(); } catch {}
 
  
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  try {
    const allowed = getAutoAllowedMasters();
    try { (getStencilManager() as any).setAutoSelectedMasters?.(Array.isArray(allowed) && allowed.length ? allowed : null); } catch {}
  } catch {}
  
  sendChannel({ action: 'autoPaintCycleEnd' });
  try {
    const cfg = getAutoConfig() as any;
    if (cfg && cfg.persistAutoRun) {
      setPersistentItem(LS_AUTORUN, JSON.stringify({ running: false, ts: Date.now() }));
    } else {
      removePersistentItem(LS_AUTORUN);
    }
  } catch {}
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
    const raw = getPersistentItem(key);
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
    setPersistentItem(key, JSON.stringify(uniq));
    
  } catch {}
}

export type ColorButton = { id: number; rgb: [number, number, number]; paid: boolean; label?: string; paidSvg?: boolean; paidBitmap?: boolean };
let colorButtons: ColorButton[] | null = null;
let masterToButton: (number | null)[] | null = null;    
const buttonCache = new Map<string, number>();
const buttonRgbCache = new Map<number, SendEffectColor>();
let sentAfterComplete = false;
let selectedButtonId: number | null = null;
let colorCacheLastUpdateAt = 0;
let colorCacheRefreshInFlight: Promise<void> | null = null;

export function getCachedColorButtons(): ColorButton[] {
  try { return Array.isArray(colorButtons) ? colorButtons.slice() : []; } catch { return []; }
}

export function getCachedButtonIdByRgb(rgb: [number, number, number]): number | null {
  try {
    if (!rgb || rgb.length < 3) return null;
    const k = `${rgb[0]},${rgb[1]},${rgb[2]}`;
    const id = buttonCache.get(k);
    return (id != null && id >= 0) ? id : null;
  } catch {
    return null;
  }
}

export function getCachedMasterToButton(): (number | null)[] {
  try { return Array.isArray(masterToButton) ? masterToButton.slice() : []; } catch { return []; }
}

function sleepInterruptible(ms: number, epoch = runEpoch): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (!running || runEpoch !== epoch) {
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, Number(ms) || 0)));
}

function countColorButtonsDom(): number {
  try {
    const btns = Array.from(document.querySelectorAll('button[id^="color-"]')) as HTMLElement[];
    if (!btns.length) return 0;
    let n = 0;
    for (const btn of btns) {
      try {
        const r = (btn as any).getBoundingClientRect ? (btn as any).getBoundingClientRect() : null;
        if (!r) { n++; continue; }
        if ((Number(r.width) || 0) > 0 && (Number(r.height) || 0) > 0) n++;
      } catch {}
    }
    return n;
  } catch {
    return 0;
  }
}

function hasAnyColorButtonsDom(minCount = 1): boolean {
  try {
    return countColorButtonsDom() >= Math.max(1, Number(minCount) || 1);
  } catch {
    return false;
  }
}

async function waitForColorButtonsDom(maxWaitMs = 6000, pollMs = 75, minCount = 8): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < Math.max(100, maxWaitMs)) {
    if (hasAnyColorButtonsDom(minCount)) return true;
    await sleep(pollMs);
  }
  return hasAnyColorButtonsDom(minCount);
}

function isPaintOutDetected(): boolean {
  try {
    const el = document.querySelector('body > div:nth-child(1) > section > ol') as HTMLElement | null;
    return !!el;
  } catch { return false; }
}

async function clickCenterBottomButton(times = 1): Promise<boolean> {
  const sels = [
    'body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-6wmtgk > div.absolute.bottom-0.left-0.z-50.w-full > div > div > div.relative.h-12.sm\\:h-14 > div.absolute.bottom-0.left-1\\/2.-translate-x-1\\/2 > button',
    'div.absolute.bottom-0.left-0.z-50.w-full div.relative.h-12 div.absolute.bottom-0.left-1/2.-translate-x-1/2 > button',
    'div.absolute.bottom-0.left-0 [class*="left-1/2"] button'
  ];
  let any = false;
  for (let t = 0; t < Math.max(1, times); t++) {
    for (const sel of sels) {
      try {
        const btn = document.querySelector(sel) as HTMLElement | null;
        if (btn) {
          if (typeof (btn as any).click === 'function') { (btn as any).click(); }
          else { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
          any = true;
          await sleep(60);
          break;
        }
      } catch {}
    }
  }
  return any;
}

async function tryClickConfirmDialog(): Promise<boolean> {
  try {
    const dialog = document.querySelector('div[role="dialog"], [role="alertdialog"]') as HTMLElement | null;
    if (!dialog) return false;
    const btns = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[];
    let clicked = false;
    for (const b of btns.reverse()) {
      if (b && !b.disabled) { try { b.focus(); } catch {}; try { b.click(); } catch {}; clicked = true; break; }
    }
    await sleep(80);
    return clicked;
  } catch { return false; }
}

async function performPaintOutSend(): Promise<void> {
  try { log('auto', 'paintOut:send:try'); } catch {}
  let ok = false;
  try { ok = await clickCenterBottomButton(2); } catch {}
  if (!ok) { try { await tryClickConfirmDialog(); } catch {} }
}

async function onPaintOutWait(): Promise<void> {
  try { await performPaintOutSend(); } catch {}
  try { sendChannel({ action: 'reloadTiles' }); } catch {}
  try {
    const cfgT = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
    const tMs = Number.isFinite(cfgT) ? Math.round(cfgT * 1000) : 3000;
    const total = Math.min(12000, Math.max(800, tMs + 800));
    await waitForFirstTileTwice(total);
  } catch {}
  const cfg = getAutoConfig();
  const secSeries = Number((cfg as any)?.seriesWaitSec);
  const baseMs = Math.max(1000, Number.isFinite(secSeries) ? Math.round(secSeries * 1000) : 90000);
  const rmax = Math.max(0, Number((cfg as any)?.randomExtraWaitMaxSec || 0));
  const rndSec = rmax > 0 ? (1 + Math.floor(Math.random() * Math.max(1, rmax))) : 0;
  const waitMs = baseMs + rndSec * 1000;
  try { log('auto', 'paintOut:wait', waitMs); } catch {}
  try {
    const sm = getStencilManager();
    enhancedOverlayResetNeeded = !!sm?.enhanced;
    try { sm?.setAutoSelectedMasterIdx?.(null as any); } catch {}
  } catch {}
  try { await sleepInterruptible(waitMs, runEpoch); } catch { await sleep(waitMs); }
}

async function ensureEditingMode(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const btns = await requestColorButtons(700);
      if (btns && btns.length) return true;
    } catch {}
    try { sendChannel({ action: 'bm:triggerPaint' }); } catch {}
    await sleep(300 + i * 150);
  }
  try {
    const btns2 = await requestColorButtons(900);
    if (btns2 && btns2.length) return true;
  } catch {}
  return false;
}

function waitForFirstTileTwice(totalTimeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    let firstKey: string | null = null;
    let count = 0;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg as any); } catch {}
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
      const data = readChannelPayload(ev) as any;
      if (!data) return;
      if (data.action === 'tileUpdated') {
        const k = keyOf(data);
        if (!firstKey) { firstKey = k; count = 1; }
        else if (k === firstKey) { count++; if (count >= 2 && !done) { done = true; cleanup(); resolve(true); } }
      }
    };
    let raf: number | null = null;
    const tick = () => {
      if (!running && !done) { done = true; cleanup(); resolve(false); return; }
      raf = requestAnimationFrame(tick);
    };
    try { window.addEventListener('message', onMsg as any); } catch {}
    raf = requestAnimationFrame(tick);
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(false); } }, Math.max(400, totalTimeoutMs));
  });
}

async function selectColor(buttonId: number): Promise<void> {
  selectedButtonId = Number.isFinite(buttonId) ? Number(buttonId) : null;
  try { sendChannel({ action: 'selectColor', id: buttonId }); } catch {}
  await sleep(20);
  try { sendChannel({ action: 'reloadTiles' }); } catch {}
}

 

async function requestColorButtons(timeoutMs = 800): Promise<ColorButton[]> {
  const normalize = (arr0: any[]): ColorButton[] => {
    const method = String((getAutoConfig() as any)?.colorDetectMethod || 'dom');
    const arr = (arr0 || []).map((b: any) => {
      try {
        if (!b || typeof b !== 'object') return b;
        const paidSvg = b.paidSvg != null ? !!b.paidSvg : !!b.paid;
        const paidBitmap = b.paidBitmap != null ? !!b.paidBitmap : !!b.paid;
        const paid = method === 'packets' ? paidBitmap : paidSvg;
        return { ...b, paid, paidSvg, paidBitmap };
      } catch {
        return b;
      }
    });
    return arr as any;
  };

  const queryOnce = async (tMs: number): Promise<ColorButton[]> => {
    return new Promise((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const onMsg = (ev: MessageEvent) => {
        const data = readChannelPayload(ev) as any;
        if (!data) return;
        if (data.action === 'colorButtons' && data.reqId === reqId) {
          window.removeEventListener('message', onMsg);
          const arr0 = Array.isArray(data.buttons) ? data.buttons : [];
          const arr = normalize(arr0);
          try {
            const paidCount = arr.filter((b: any) => b?.paid).length;
            const freeCount = arr.length - paidCount;
            console.log('[wph][auto] colors received', { reqId, total: arr.length, paid: paidCount, free: freeCount });
          } catch {}
          try { log('auto', 'colors:recv', arr.length); } catch {}
          resolve(arr);
        }
      };
      window.addEventListener('message', onMsg);
      sendChannel({ action: 'queryColors', reqId });
      setTimeout(() => { window.removeEventListener('message', onMsg); resolve([]); }, tMs);
    });
  };

  let res = await queryOnce(timeoutMs);
  if (res && res.length) return res;

  try { sendChannel({ action: 'bm:triggerPaint' }); } catch {}
  try { await sleep(120); } catch {}
  try { await waitForColorButtonsDom(6000, 75); } catch {}
  res = await queryOnce(Math.max(400, timeoutMs));
  if (res && res.length) return res;

  try { await sleep(200); } catch {}
  res = await queryOnce(Math.max(400, timeoutMs));
  return res || [];
}

async function refreshColorCacheIfPaletteOpen(): Promise<void> {
  if (!hasAnyColorButtonsDom(8)) return;
  const now = Date.now();
  if (now - colorCacheLastUpdateAt < 250) return;
  if (colorCacheRefreshInFlight) {
    await colorCacheRefreshInFlight;
    return;
  }
  try { console.log('[wph][auto] refreshColorCacheIfPaletteOpen:start'); } catch {}
  colorCacheRefreshInFlight = (async () => {
    try {
      const btns = await new Promise<ColorButton[]>((resolve) => {
        const reqId = Math.random().toString(36).slice(2);
        const onMsg = (ev: MessageEvent) => {
          const data = readChannelPayload(ev) as any;
          if (!data) return;
          if (data.action === 'colorButtons' && data.reqId === reqId) {
            window.removeEventListener('message', onMsg);
            const method = String((getAutoConfig() as any)?.colorDetectMethod || 'dom');
            const arr0 = Array.isArray(data.buttons) ? data.buttons : [];
            const arr = arr0.map((b: any) => {
              try {
                if (!b || typeof b !== 'object') return b;
                const paidSvg = b.paidSvg != null ? !!b.paidSvg : !!b.paid;
                const paidBitmap = b.paidBitmap != null ? !!b.paidBitmap : !!b.paid;
                const paid = method === 'packets' ? paidBitmap : paidSvg;
                return { ...b, paid, paidSvg, paidBitmap };
              } catch {
                return b;
              }
            });
            resolve(arr as any);
          }
        };
        window.addEventListener('message', onMsg);
        try { sendChannel({ action: 'queryColors', reqId }); } catch {}
        setTimeout(() => { window.removeEventListener('message', onMsg); resolve([]); }, 350);
      });
      if (btns && btns.length) {
        colorButtons = btns;
        colorCacheLastUpdateAt = Date.now();
        try { await ensureColorMap(); } catch {}
        try {
          const paidCount = btns.filter(b => b?.paid).length;
          const freeCount = btns.length - paidCount;
          console.log('[wph][auto] refreshColorCacheIfPaletteOpen:applied', { total: btns.length, paid: paidCount, free: freeCount });
        } catch {}
      }
    } catch {}
    finally { colorCacheRefreshInFlight = null; }
  })();
  await colorCacheRefreshInFlight;
}

async function ensureColorMap() {
  if (!colorButtons || colorButtons.length === 0) {
    colorButtons = await requestColorButtons(900);
  }
  
  if (colorButtons && colorButtons.length) {
    try { buttonCache.clear(); } catch {}
    try { buttonRgbCache.clear(); } catch {}

    for (const b of colorButtons) {
      if (!b || !Array.isArray(b.rgb)) continue;
      const rgb: SendEffectColor = [b.rgb[0], b.rgb[1], b.rgb[2]];
      buttonRgbCache.set(b.id, rgb);
    }

    const available = colorButtons.filter(b => b && !b.paid && Number.isFinite(b.id) && b.id > 0);
    for (const b of available) {
      const key = `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`;
      buttonCache.set(key, b.id);
    }
  }
  
  
  const availableNow = (colorButtons || []).filter(b => b && !b.paid && Number.isFinite(b.id) && b.id > 0);
  if (!availableNow.length) { 
    try {
      const paidCount = colorButtons ? colorButtons.length : 0;
      console.warn('[wph][auto] ensureColorMap: no free colors', { total: colorButtons ? colorButtons.length : 0, paidCount });
    } catch {}
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

function getButtonColor(buttonId: number): SendEffectColor | null {
  if (!Number.isFinite(buttonId)) return null;
  const cached = buttonRgbCache.get(buttonId);
  if (cached) return cached;
  if (colorButtons && colorButtons.length) {
    for (const b of colorButtons) {
      if (b && b.id === buttonId && Array.isArray(b.rgb)) {
        const rgb: SendEffectColor = [b.rgb[0], b.rgb[1], b.rgb[2]];
        buttonRgbCache.set(buttonId, rgb);
        return rgb;
      }
    }
  }
  return null;
}


async function runAutoLoop() {
  const epoch = runEpoch;
  try {
    await ensureColorMap();
    let nextCycleAt = 0;
    while (running && runEpoch === epoch) {
      try { log('auto', 'loop', { ts: Date.now() }); } catch {}
      if (!running || runEpoch !== epoch) break;
      
      try {
        const nowGate = Date.now();
        if (nowGate < nextCycleAt) {
          const toWait = Math.max(0, nextCycleAt - nowGate);
          const cont = await sleepInterruptible(toWait, epoch);
          if (!cont || !running || runEpoch !== epoch) break;
        }
      } catch {}

      try {
        if (isPaintOutDetected()) {
          try { sendChannel({ action: 'autoPaintCycleStart' }); } catch {}
          try { sendChannel({ action: 'autoPaintCycleEnd' }); } catch {}
          await onPaintOutWait();
          if (!running || runEpoch !== epoch) break;
          continue;
        }
      } catch {}
      
      let hasPending = false;
      try {
        const sm = getStencilManager() as any;
        const counts = sm?.getRemainingCountsTotal?.();
        if (counts && Array.isArray(counts)) {
          const allowed = getAutoAllowedMasters();
          const allowedSet = (Array.isArray(allowed) && allowed.length) ? new Set(allowed.map(n => Number(n))) : null;
          for (let i = 0; i < counts.length; i++) {
            if (allowedSet && !allowedSet.has(i)) continue;
            if (((counts[i] as any) | 0) > 0) { hasPending = true; break; }
          }
        }
      } catch {}
      if (hasPending) sentAfterComplete = false;

  if (!hasPending) {
        try { log('auto', 'loop:noChunks'); } catch {}
        try { sendChannel({ action: 'autoPaintCycleStart' }); } catch {}
        try { sendChannel({ action: 'autoPaintCycleEnd' }); } catch {}
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
        if (!sentAfterComplete) {
          try { await performPaintOutSend(); } catch {}
          try { sendChannel({ action: 'reloadTiles' }); } catch {}
          try {
            const cfgT = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
            const tMs = Number.isFinite(cfgT) ? Math.round(cfgT * 1000) : 3000;
            const total = Math.min(12000, Math.max(800, tMs + 800));
            await waitForFirstTileTwice(total);
          } catch {}
          try {
            const sm = getStencilManager();
            enhancedOverlayResetNeeded = !!sm?.enhanced;
            try { sm?.setAutoSelectedMasterIdx?.(null as any); } catch {}
          } catch {}
          sentAfterComplete = true;
        }
        const cfg = getAutoConfig();
    const secSeries = Number((cfg as any)?.seriesWaitSec);
    const baseMs = Math.max(1000, Number.isFinite(secSeries) ? Math.round(secSeries * 1000) : 90000);
    const rmax = Math.max(0, Number((cfg as any)?.randomExtraWaitMaxSec || 0));
    const rndSec = rmax > 0 ? (1 + Math.floor(Math.random() * Math.max(1, rmax))) : 0;
    const waitMs = baseMs + rndSec * 1000;
    const continued = await sleepInterruptible(waitMs, epoch);
    if (!continued || !running || runEpoch !== epoch) break;
    continue;
  }
  
  if (!running || runEpoch !== epoch) break;
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
  try {
    if (enhancedOverlayResetNeeded) {
      enhancedOverlayResetNeeded = false;
      try { sendChannel({ action: 'reloadTiles' }); } catch {}
      await sleep(160);
    }
  } catch {}
  await placeViaUiLegacy();
  if (!running || runEpoch !== epoch) break;
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
  
  const cfg = getAutoConfig();
  const secSeries = Number((cfg as any)?.seriesWaitSec);
  const baseMs = Math.max(1000, Number.isFinite(secSeries) ? Math.round(secSeries * 1000) : 90000);
  const rmax = Math.max(0, Number((cfg as any)?.randomExtraWaitMaxSec || 0));
  const rndSec = rmax > 0 ? (1 + Math.floor(Math.random() * Math.max(1, rmax))) : 0;
  const waitMs = baseMs + rndSec * 1000;
  nextCycleAt = Date.now() + waitMs;
  const continued = await sleepInterruptible(waitMs, epoch);
  if (!continued || !running || runEpoch !== epoch) break;
    }
  } catch {}
}

async function placeViaUiLegacy(): Promise<boolean> {
  try {
    const epoch = runEpoch;
    const sm = getStencilManager();
    try { log('auto', 'legacy:start'); } catch {}
    if (!sm.enhanced) { try { log('auto', 'legacy:enhanced=false'); } catch {} return false; }
    const ok = await ensureVideo();
    try { log('auto', 'legacy:ensureVideo', ok); } catch {}
    if (!ok) { try { log('auto', 'legacy:videoFailed'); } catch {} return false; }
    if (!hasStream()) { try { log('auto', 'legacy:stream=false'); } catch {} return false; }
    await ensureColorMap();
    try {
      sendChannel({ action: 'reloadTiles' });
      const cfgT0 = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
      const tMs0 = Number.isFinite(cfgT0) ? Math.round(cfgT0 * 1000) : 3000;
      const total0 = Math.min(12000, Math.max(800, tMs0 + 800));
      await waitForFirstTileTwice(total0);
    } catch {}
    try { if (isPaintOutDetected()) { await onPaintOutWait(); return true; } } catch {}
    const cfg = getAutoConfig();
    const counts = (sm as any).getRemainingCountsTotal?.() as number[] | undefined;
    try { log('auto', 'legacy:counts', Array.isArray(counts) ? counts.length : -1); } catch {}
    const colorOrder = String((cfg as any)?.bmColorOrder || 'highToLow');
    const allowed = getAutoAllowedMasters();
    const allowedSet = new Set((allowed || []).map(n => Number(n)));
    const allowedList = allowedSet.size ? Array.from(allowedSet) : null;

    const captureMethod = String((cfg as any)?.captureMethod || 'canvas');
    const strictBlue = captureMethod === 'display';
    const blueTol = 18;
    const blueR0 = 0;
    const blueG0 = 0;
    const blueB0 = 240;

    const entries: Array<{ idx: number; btnId: number; count: number }> = [];
    if (Array.isArray(counts) && counts.length) {
      for (let i = 0; i < counts.length; i++) {
        if (allowedSet.size && !allowedSet.has(i)) continue;
        const btnTest = mapMasterIndexToButton(i);
        if (btnTest == null || btnTest < 0) continue;
        const c = counts[i] | 0;
        if (c > 0) entries.push({ idx: i, btnId: btnTest, count: c });
      }
    }
    if (colorOrder === 'random') {
      for (let i = entries.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = entries[i];
        entries[i] = entries[j];
        entries[j] = t;
      }
    } else {
      entries.sort((a, b) => {
        const d = colorOrder === 'lowToHigh' ? (a.count - b.count) : (b.count - a.count);
        if (d !== 0) return d;
        return a.idx - b.idx;
      });
    }
    if (!entries.length) { try { log('auto', 'legacy:noColors'); } catch {} return false; }

    const editOk = await ensureEditingMode();
    try { log('auto', 'legacy:editOk', editOk); } catch {}
    if (!editOk) { try { log('auto', 'legacy:editFailed'); } catch {} return false; }

    const clickDelay = Math.max(0, Number((cfg as any)?.interClickDelayMs) | 0);
    const mode = String((cfg as any)?.bmMode || 'random');
    const batchLimit = Math.max(0, Number((cfg as any)?.bmBatchLimit) | 0);
    const effectOn = !!(cfg as any)?.sendEffectEnabled;
    const effectBatch: SendEffectColor[] = [];
    let clickedTotal = 0;
    let stopAll = false;

    try { if (getLoggingEnabled()) log('auto', 'legacy:timing', { interClickDelayMs: Number((cfg as any)?.interClickDelayMs), clickDelay }); } catch {}

    for (let ci = 0; ci < entries.length && running && runEpoch === epoch; ci++) {
      const { idx: colorIdx, btnId } = entries[ci];
      try { log('auto', 'legacy:color', { i: ci, idx: colorIdx, btnId }); } catch {}
      try { sm.setAutoSelectedMasterIdx(null as any); } catch {}
      try { (sm as any).setAutoSelectedMasters?.(allowedList); } catch {}
      await sleep(160);
      try { log('auto', 'legacy:selectColor', btnId); } catch {}
      await selectColor(btnId);
      try { sm.setAutoSelectedMasterIdx(colorIdx as any); } catch {}
      try {
        try { sendChannel({ action: 'reloadTiles' }); } catch {}
        const cfgT = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
        const tMs = Number.isFinite(cfgT) ? Math.round(cfgT * 1000) : 3000;
        const total = Math.min(12000, Math.max(800, 2 * tMs + 1000));
        await waitForFirstTileTwice(total);
        try { log('auto', 'legacy:tileUpdatedWaitDone', total); } catch {}
      } catch {}
      try {
        const sSec = Number((getAutoConfig() as any)?.switchPreWaitSec);
        await sleep(Number.isFinite(sSec) ? Math.max(0, Math.round(sSec * 1000)) : 0);
      } catch {}

      let didPaintThisColor = false;
      for (let attempt = 0; attempt < 2 && running && runEpoch === epoch; attempt++) {
        const snap = captureScreenSnapshot();
        if (!snap) { try { log('auto', 'legacy:noSnapshot'); } catch {} break; }
        const vw = snap.width, vh = snap.height;
        if (vw < 2 || vh < 2) { try { log('auto', 'legacy:badDims'); } catch {} break; }
        const snapRect = (snap as any).rect;
        const snapScaleX = (snapRect && snapRect.width) ? (Number(snapRect.width) / Math.max(1, vw)) : 1;
        const snapScaleY = (snapRect && snapRect.height) ? (Number(snapRect.height) / Math.max(1, vh)) : 1;
        const snapInvScale = 1 / Math.max(1e-6, (snapScaleX + snapScaleY) / 2);
        if (attempt === 0) {
          try { log('auto', 'legacy:snapshot', vw, vh); } catch {}
          try { log('auto', 'legacy:rectSnap', { left: Number(snapRect?.left || 0), top: Number(snapRect?.top || 0), width: Number(snapRect?.width || 0), height: Number(snapRect?.height || 0), scaleX: snapScaleX, scaleY: snapScaleY }); } catch {}
        }
        const data = snap.data.data;
        const alphaMin = 120;
        const blueMin = 130;
        const blueDom = 70;
        const step = 2;
        const minDist = Math.max(0, Number((cfg as any)?.minDist) | 0);
        const minDistSnap = Math.max(0, Math.round(minDist * snapInvScale));
        const cell = Math.max(1, minDistSnap);
        const grid = new Map<string, Array<[number, number]>>();
        const keyOf = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
        const ys: number[] = []; const xs: number[] = [];
        const yStart = Math.floor(Math.random() * step);
        const xStart = Math.floor(Math.random() * step);
        for (let y = yStart; y < vh; y += step) ys.push(y);
        for (let x = xStart; x < vw; x += step) xs.push(x);
        for (let i = ys.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = ys[i]; ys[i] = ys[j]; ys[j] = t; }
        for (let i = xs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = xs[i]; xs[i] = xs[j]; xs[j] = t; }

        const targets: Array<[number, number, number, number]> = [];
        for (let yi = 0; yi < ys.length; yi++) {
          if (!running || runEpoch !== epoch) break;
          const y = ys[yi];
          const row = y * vw * 4;
          for (let xi = 0; xi < xs.length; xi++) {
            if (!running || runEpoch !== epoch) break;
            const x = xs[xi];
            const i = row + x * 4;
            const a = data[i + 3];
            if (a < alphaMin) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (strictBlue) {
              if (Math.abs(r - blueR0) > blueTol) continue;
              if (Math.abs(g - blueG0) > blueTol) continue;
              if (Math.abs(b - blueB0) > blueTol) continue;
            } else {
              if (b < blueMin) continue;
              if ((b - r) < blueDom) continue;
              if ((b - g) < blueDom) continue;
            }
            let agree = 0;
            const offs = [ [0,0], [1,0], [-1,0], [0,1], [0,-1] ];
            for (let oi = 0; oi < offs.length; oi++) {
              const nx = x + (offs as any)[oi][0];
              const ny = y + (offs as any)[oi][1];
              if (nx < 0 || ny < 0 || nx >= vw || ny >= vh) continue;
              const ni = (ny * vw + nx) * 4;
              const na = data[ni + 3];
              if (na < alphaMin) continue;
              const nr = data[ni], ng = data[ni + 1], nb = data[ni + 2];
              if (strictBlue) {
                if (Math.abs(nr - blueR0) > blueTol) continue;
                if (Math.abs(ng - blueG0) > blueTol) continue;
                if (Math.abs(nb - blueB0) > blueTol) continue;
              } else {
                if (nb < blueMin) continue;
                if ((nb - nr) < blueDom) continue;
                if ((nb - ng) < blueDom) continue;
              }
              agree++;
            }
            if (agree < 3) continue;
            let rx = x, ry = y;
            try {
              const R = 3;
              let sumX = 0, sumY = 0, cnt = 0;
              const y0 = Math.max(0, y - R);
              const y1 = Math.min(vh - 1, y + R);
              const x0 = Math.max(0, x - R);
              const x1 = Math.min(vw - 1, x + R);
              for (let ny = y0; ny <= y1; ny++) {
                const row2 = ny * vw * 4;
                for (let nx = x0; nx <= x1; nx++) {
                  const ii = row2 + nx * 4;
                  const aa = data[ii + 3];
                  if (aa < alphaMin) continue;
                  const rr = data[ii], gg = data[ii + 1], bb = data[ii + 2];
                  if (strictBlue) {
                    if (Math.abs(rr - blueR0) > blueTol) continue;
                    if (Math.abs(gg - blueG0) > blueTol) continue;
                    if (Math.abs(bb - blueB0) > blueTol) continue;
                  } else {
                    if (bb < blueMin) continue;
                    if ((bb - rr) < blueDom) continue;
                    if ((bb - gg) < blueDom) continue;
                  }
                  sumX += nx; sumY += ny; cnt++;
                }
              }
              if (cnt > 0) { rx = sumX / cnt; ry = sumY / cnt; }
            } catch {}
            const nxx = rx / Math.max(1, vw);
            const nyy = ry / Math.max(1, vh);
            if (!Number.isFinite(nxx) || !Number.isFinite(nyy)) continue;
            let tooClose = false;
            if (minDistSnap > 0) {
              const gx = Math.floor(rx / cell), gy = Math.floor(ry / cell);
              for (let oy = -1; oy <= 1 && !tooClose; oy++) {
                for (let ox = -1; ox <= 1 && !tooClose; ox++) {
                  const arr = grid.get(`${gx + ox},${gy + oy}`);
                  if (!arr) continue;
                  for (let k = 0; k < arr.length; k++) {
                    const t = arr[k];
                    const dx = t[0] - rx, dy = t[1] - ry;
                    if (dx*dx + dy*dy < minDistSnap*minDistSnap) { tooClose = true; break; }
                  }
                }
              }
            }
            if (!tooClose) {
              targets.push([nxx, nyy, rx, ry]);
              if (minDistSnap > 0) {
                const k = keyOf(rx, ry);
                const arr = grid.get(k);
                if (arr) arr.push([rx, ry]); else grid.set(k, [[rx, ry]]);
              }
            }
          }
        }

        try { log('auto', 'legacy:targets', { idx: colorIdx, attempt, n: targets.length }); } catch {}
        if (!targets.length) {
          if (attempt === 0) {
            try {
              sendChannel({ action: 'reloadTiles' });
              const cfgT1 = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
              const tMs1 = Number.isFinite(cfgT1) ? Math.round(cfgT1 * 1000) : 3000;
              const total1 = Math.min(12000, Math.max(800, tMs1 + 800));
              await waitForFirstTileTwice(total1);
            } catch {}
            try {
              const sSec2 = Number((getAutoConfig() as any)?.switchPreWaitSec);
              await sleep(Number.isFinite(sSec2) ? Math.max(0, Math.round(sSec2 * 1000)) : 0);
            } catch {}
            continue;
          }
          break;
        }

        const list = targets.slice();
        try {
          if (mode === 'topDown') {
            list.sort((a, b) => (a[3] - b[3]) || (a[2] - b[2]));
          } else if (mode === 'bottomUp') {
            list.sort((a, b) => (b[3] - a[3]) || (a[2] - b[2]));
          } else if (mode === 'leftRight') {
            list.sort((a, b) => (a[2] - b[2]) || (a[3] - b[3]));
          } else if (mode === 'rightLeft') {
            list.sort((a, b) => (b[2] - a[2]) || (a[3] - b[3]));
          } else if (mode === 'diagDown') {
            list.sort((a, b) => ((a[2] + a[3]) - (b[2] + b[3])) || (a[2] - b[2]) || (a[3] - b[3]));
          } else if (mode === 'diagUp') {
            list.sort((a, b) => ((a[2] - a[3]) - (b[2] - b[3])) || (a[2] - b[2]) || (a[3] - b[3]));
          } else if (mode === 'diagDownRight') {
            const w = Math.max(1, vw);
            list.sort((a, b) => (((w - 1 - a[2]) + a[3]) - ((w - 1 - b[2]) + b[3])) || (b[2] - a[2]) || (a[3] - b[3]));
          } else if (mode === 'diagUpRight') {
            const w = Math.max(1, vw);
            const h = Math.max(1, vh);
            list.sort((a, b) => (((w - 1 - a[2]) + (h - 1 - a[3])) - ((w - 1 - b[2]) + (h - 1 - b[3]))) || (b[2] - a[2]) || (a[3] - b[3]));
          } else if (mode === 'centerOut' || mode === 'edgesIn') {
            const cx = (vw - 1) / 2;
            const cy = (vh - 1) / 2;
            list.sort((a, b) => {
              const dax = a[2] - cx;
              const day = a[3] - cy;
              const dbx = b[2] - cx;
              const dby = b[3] - cy;
              const da = dax * dax + day * day;
              const db = dbx * dbx + dby * dby;
              if (da !== db) return mode === 'centerOut' ? (da - db) : (db - da);
              return (a[3] - b[3]) || (a[2] - b[2]);
            });
          } else if (mode === 'random') {
            for (let i = list.length - 1; i > 0; i--) {
              const j = (Math.random() * (i + 1)) | 0;
              const t = list[i];
              list[i] = list[j];
              list[j] = t;
            }
          }
        } catch {}
        let clickedThisColor = 0;
        for (let i = 0; i < list.length && running && runEpoch === epoch; i++) {
          const [nx, ny, sx, sy] = list[i];
          const canvasNow = document.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement | null;
          const rectNow = canvasNow ? canvasNow.getBoundingClientRect() : (snap as any).rect;
          const rectW = Math.max(1, Number((rectNow as any)?.width || 0));
          const rectH = Math.max(1, Number((rectNow as any)?.height || 0));
          const cx = Number((rectNow as any)?.left || 0) + nx * rectW;
          const cy = Number((rectNow as any)?.top || 0) + ny * rectH;
          try {
            if (isPaintOutDetected()) {
              await onPaintOutWait();
              stopAll = true;
              break;
            }
          } catch {}
          try {
            if (getLoggingEnabled() && ((clickedTotal & 127) === 0)) {
              log('auto', 'legacy:click', { i, nx, ny, sx, sy, rect: { left: Number((rectNow as any)?.left || 0), top: Number((rectNow as any)?.top || 0), width: Number((rectNow as any)?.width || 0), height: Number((rectNow as any)?.height || 0) }, client: { x: Math.round(cx), y: Math.round(cy) } });
            }
          } catch {}
          try { if (getLoggingEnabled() && ((clickedTotal & 255) === 0)) showClickMarker(cx, cy); } catch {}
          try { sendChannel({ action: 'pagePaint', x: Math.round(cx), y: Math.round(cy) }); } catch {}
          clickedThisColor++;
          clickedTotal++;
          if (effectOn) { const sid = (selectedButtonId != null) ? selectedButtonId : btnId; const c = getButtonColor(sid); if (c) effectBatch.push(c); }
          if (clickDelay > 0) {
            const cont = await sleepInterruptible(clickDelay, epoch);
            if (!cont || !running || runEpoch !== epoch) break;
          } else {
            if (!running || runEpoch !== epoch) break;
          }
          if (batchLimit > 0 && clickedTotal >= batchLimit) { stopAll = true; break; }
        }
        didPaintThisColor = clickedThisColor > 0;
        if (stopAll || !running || runEpoch !== epoch) break;
        if (didPaintThisColor) break;
      }
      if (stopAll || !running || runEpoch !== epoch) break;
    }

    if (running && runEpoch === epoch && clickedTotal > 0) {
      try { await performPaintOutSend(); } catch {}
      try { sendChannel({ action: 'reloadTiles' }); } catch {}
      try {
        const cfgT = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
        const tMs = Number.isFinite(cfgT) ? Math.round(cfgT * 1000) : 3000;
        const total = Math.min(12000, Math.max(800, tMs + 800));
        await waitForFirstTileTwice(total);
      } catch {}
      try {
        const sm2 = getStencilManager();
        enhancedOverlayResetNeeded = !!sm2?.enhanced;
        try { sm2?.setAutoSelectedMasterIdx?.(null as any); } catch {}
      } catch {}
      try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
      if (effectOn && effectBatch.length) { try { playSendOrbitalEffect(effectBatch.slice()); } catch {} }
      effectBatch.length = 0;
    }
    try { log('auto', 'legacy:done', { clicked: clickedTotal, stopAll }); } catch {}
    return clickedTotal > 0;
  } catch { return false; }
}
