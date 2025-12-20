import { decodeV2 } from '../topmenu/qrmusic/codec';
import { getPalette } from '../editor/palette';
import { captureScreenSnapshot, snapshotToClient } from '../screen/captureManager';
import { markElement } from '../wguard';
import { getStencilManager } from '../template/stencilManager';
import { isAutoRunning } from '../screen/autoPainter';
import { getAutoConfig } from '../screen/autoConfig';
import MediaOverlay from '../media/MediaOverlay.svelte';
import MediaOverlayTikTok from '../media/MediaOverlayTikTok.svelte';
import MediaOverlaySpotify from '../media/MediaOverlaySpotify.svelte';
import MediaOverlaySoundCloud from '../media/MediaOverlaySoundCloud.svelte';
import CaptchaModal from './CaptchaModal.svelte';
import { generateQrScannerWorkerCode } from './screenScannerWorkerCode';

type Service = 'youtube' | 'tiktok' | 'soundcloud' | 'spotify' | 'unknown';

const FREE32: Array<[number, number, number]> = getPalette('free').slice(0, 32) as any;

const RGB_TO_FREE = (() => {
  const m = new Map<number, number>();
  for (let i = 0; i < FREE32.length; i++) {
    const c = FREE32[i];
    const k = ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
    m.set(k, i);
  }
  return m;
})();

const ANCH_COLS = [0, 5, 10, 15, 20, 25, 30, 31];
const AC = 16;
const ANCH_KEYS = new Set(['0,0', '4,0', '0,4', '4,4', '2,0', '0,2', '4,2', '2,4', '2,2']);

const ANCH_POS: Array<{ x: number; y: number; v: number }> = [
  { x: 0, y: 0, v: ANCH_COLS[0] },
  { x: 4, y: 0, v: ANCH_COLS[1] },
  { x: 0, y: 4, v: ANCH_COLS[2] },
  { x: 4, y: 4, v: ANCH_COLS[3] },
  { x: 2, y: 0, v: ANCH_COLS[4] },
  { x: 0, y: 2, v: ANCH_COLS[5] },
  { x: 4, y: 2, v: ANCH_COLS[6] },
  { x: 2, y: 4, v: ANCH_COLS[7] },
  { x: 2, y: 2, v: AC },
];

const SYMBOL_COORDS: Array<[number, number]> = (() => {
  const coords: Array<[number, number]> = [];
  for (let y = 0; y < 5; y++) {
    const xs = y % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const x of xs) {
      const key = `${x},${y}`;
      if (ANCH_KEYS.has(key)) continue;
      coords.push([x, y]);
    }
  }
  return coords;
})();

function isQrMusicEnabled(): boolean {
  try {
    return !!(window as any).__wph_qrmusic_on;
  } catch {
    return false;
  }
}

function isScannerSuppressed(): boolean {
  try {
    if (isAutoRunning && isAutoRunning()) return true;
  } catch {}
  try {
    const sm = getStencilManager();
    if (sm && (sm as any).enhanced) return true;
  } catch {}
  return false;
}

function freeIdxAtExact(data: Uint8ClampedArray, i: number): number | null {
  const r = data[i] | 0;
  const g = data[i + 1] | 0;
  const b = data[i + 2] | 0;
  const k = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  const exact = RGB_TO_FREE.get(k);
  return exact == null ? null : exact;
}

function freeIdxAtSafe(data: Uint8ClampedArray, i: number): number {
  const exact = freeIdxAtExact(data, i);
  if (exact != null) return exact;
  const r = data[i] | 0;
  const g = data[i + 1] | 0;
  const b = data[i + 2] | 0;
  let best = 0;
  let bd = 1e12;
  for (let j = 0; j < FREE32.length; j++) {
    const c = FREE32[j];
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bd) {
      bd = d;
      best = j;
      if (d === 0) break;
    }
  }
  return best;
}

function anchorsMatchExact(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  s: number
): boolean {
  if (x0 < 0 || y0 < 0) return false;
  const size = 5 * s;
  if (x0 + size >= w || y0 + size >= h) return false;
  const mid = Math.max(0, Math.floor(s / 2));
  for (const a of ANCH_POS) {
    const cx = (x0 + a.x * s + mid) | 0;
    const cy = (y0 + a.y * s + mid) | 0;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return false;
    const idx = (cy * w + cx) * 4;
    const ex = freeIdxAtExact(data, idx);
    if (ex == null) return false;
    const fi = ex % FREE32.length;
    if (fi !== (a.v % FREE32.length)) return false;
  }
  return true;
}

function tryDecodeAtSafe(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  s: number
): { ok: true; symbols: number[]; x0: number; y0: number; size: number } | { ok: false } {
  if (x0 < 0 || y0 < 0) return { ok: false };
  const size = 5 * s;
  if (x0 + size >= w || y0 + size >= h) return { ok: false };

  const mid = Math.max(0, Math.floor(s / 2));
  for (const a of ANCH_POS) {
    const cx = (x0 + a.x * s + mid) | 0;
    const cy = (y0 + a.y * s + mid) | 0;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return { ok: false };
    const idx = (cy * w + cx) * 4;
    const fi = freeIdxAtSafe(data, idx) % FREE32.length;
    if (fi !== (a.v % FREE32.length)) return { ok: false };
  }

  const symbols: number[] = [];
  for (const [sx, sy] of SYMBOL_COORDS) {
    const cx = (x0 + sx * s + mid) | 0;
    const cy = (y0 + sy * s + mid) | 0;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return { ok: false };
    const idx = (cy * w + cx) * 4;
    const fi = freeIdxAtSafe(data, idx) % FREE32.length;
    symbols.push(fi);
  }

  const dec = decodeV2(symbols);
  if (!dec || !dec.ok) return { ok: false };
  return { ok: true, symbols, x0, y0, size };
}

function tryDecodeAtFast(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  s: number
): { ok: true; symbols: number[]; x0: number; y0: number; size: number } | { ok: false } {
  if (!anchorsMatchExact(data, w, h, x0, y0, s)) return { ok: false };
  const size = 5 * s;
  const mid = Math.max(0, Math.floor(s / 2));
  const symbols: number[] = [];
  for (const [sx, sy] of SYMBOL_COORDS) {
    const cx = (x0 + sx * s + mid) | 0;
    const cy = (y0 + sy * s + mid) | 0;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return { ok: false };
    const idx = (cy * w + cx) * 4;
    const fi = freeIdxAtSafe(data, idx) % FREE32.length;
    symbols.push(fi);
  }
  const dec = decodeV2(symbols);
  if (!dec || !dec.ok) return { ok: false };
  return { ok: true, symbols, x0, y0, size };
}

function detectOnSnapshot():
  | { items: Array<{ symbols: number[]; x0: number; y0: number; size: number }>; snap: NonNullable<ReturnType<typeof captureScreenSnapshot>> }
  | null {
  const snap = captureScreenSnapshot();
  if (!snap) return null;

  const w = snap.width | 0;
  const h = snap.height | 0;
  if (w <= 0 || h <= 0) return null;

  const data = snap.data.data;
  const lumSample = (() => {
    const step = 16;
    const budgetMs = 2;
    const t0s = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
    let sum = 0;
    let cnt = 0;
    for (let y = 0; y < h; y += step) {
      const row = y * w * 4;
      for (let x = 0; x < w; x += step) {
        const ti = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
        if (ti - t0s > budgetMs) return cnt ? (sum / cnt) : 128;
        const i = row + x * 4;
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        cnt++;
      }
    }
    return cnt ? (sum / cnt) : 128;
  })();

  const nowTs = Date.now();
  const t0 = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : nowTs;

  const maxItems = 6;
  const items: Array<{ symbols: number[]; x0: number; y0: number; size: number }> = [];
  const boxes: Array<{ x0: number; y0: number; size: number }> = [];

  const isOverlapping = (x0: number, y0: number, size: number): boolean => {
    const pad = Math.max(2, Math.floor(size / 5));
    const l = x0 - pad;
    const t = y0 - pad;
    const r = x0 + size + pad;
    const b = y0 + size + pad;
    for (const bb of boxes) {
      const pad2 = Math.max(2, Math.floor(bb.size / 5));
      const l2 = bb.x0 - pad2;
      const t2 = bb.y0 - pad2;
      const r2 = bb.x0 + bb.size + pad2;
      const b2 = bb.y0 + bb.size + pad2;
      if (l < r2 && r > l2 && t < b2 && b > t2) return true;
    }
    return false;
  };

  const addItem = (r: { symbols: number[]; x0: number; y0: number; size: number }) => {
    if (items.length >= maxItems) return;
    items.push({ symbols: r.symbols, x0: r.x0, y0: r.y0, size: r.size });
    boxes.push({ x0: r.x0, y0: r.y0, size: r.size });
    lastAnyFoundTs = nowTs;
    robustScanState = null;
    fuzzyScanState = null;
  };

  const prefer = lastFound;
  if (prefer) {
    const r0 = tryDecodeAtFast(data, w, h, prefer.x0, prefer.y0, prefer.s);
    if (r0.ok) addItem(r0);
    if (!r0.ok) {
      const r1 = tryDecodeAtSafe(data, w, h, prefer.x0, prefer.y0, prefer.s);
      if (r1.ok) addItem(r1);
    }
  }

  const step = 4;
  const thrAdj = Math.min(12000, Math.max(0, Math.round((140 - lumSample) * 160)));
  const thrMain = 12000 + thrAdj;
  const scales = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
  const scalesRobust = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];
  const ac = FREE32[AC % FREE32.length];

  const nearAc = (i: number, thr: number): boolean => {
    const r = data[i] | 0;
    const g = data[i + 1] | 0;
    const b = data[i + 2] | 0;
    const dr = r - ac[0];
    const dg = g - ac[1];
    const db = b - ac[2];
    const d = dr * dr + dg * dg + db * db;
    return d <= thr;
  };

  for (let y = 0; y < h; y += step) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += step) {
      if (items.length >= maxItems) break;
      const i = row + x * 4;
      const ex = freeIdxAtExact(data, i);
      let match = false;
      if (ex != null && ex % FREE32.length === (AC % FREE32.length)) match = true;
      else if (nearAc(i, thrMain)) match = true;
      if (!match) continue;

      for (const s of scales) {
        if (items.length >= maxItems) break;
        const x0 = (x - 2 * s) | 0;
        const y0 = (y - 2 * s) | 0;
        const size = 5 * s;
        if (isOverlapping(x0, y0, size)) continue;
        const r = tryDecodeAtFast(data, w, h, x0, y0, s);
        if (r.ok) { addItem(r); break; }
        const rSafe = tryDecodeAtSafe(data, w, h, x0, y0, s);
        if (rSafe.ok) { addItem(rSafe); break; }

        const off = Math.max(1, Math.floor(s / 3));
        for (let dy = -off; dy <= off; dy += off) {
          for (let dx = -off; dx <= off; dx += off) {
            if (!dx && !dy) continue;
            const x1 = (x0 + dx) | 0;
            const y1 = (y0 + dy) | 0;
            if (isOverlapping(x1, y1, size)) continue;
            const r2 = tryDecodeAtFast(data, w, h, x1, y1, s);
            if (r2.ok) { addItem(r2); dy = off + 1; break; }
            const r2s = tryDecodeAtSafe(data, w, h, x1, y1, s);
            if (r2s.ok) { addItem(r2s); dy = off + 1; break; }
          }
        }
      }
    }
    if (items.length >= maxItems) break;
  }

  if (!items.length) {
    const hungry = nowTs - lastAnyFoundTs > 3200;
    const stepR = hungry ? 2 : 3;
    const thrR = hungry ? 22000 : 16000;
    const budgetMs = hungry ? 28 : 18;

    if (!robustScanState || robustScanState.step !== stepR || robustScanState.thr !== thrR) {
      if (nowTs - lastRobustScanTs > 1800) {
        lastRobustScanTs = nowTs;
        robustScanState = { x: 0, y: 0, step: stepR, thr: thrR };
      }
    }

    if (robustScanState) {
      let y = robustScanState.y | 0;
      let xStart = robustScanState.x | 0;
      for (; y < h; y += robustScanState.step) {
        const row = y * w * 4;
        for (let x = xStart; x < w; x += robustScanState.step) {
          if (items.length >= maxItems) break;
          const ti = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
          if (ti - t0 > budgetMs) {
            robustScanState.x = x;
            robustScanState.y = y;
            xStart = 0;
            y = h;
            break;
          }
          const i = row + x * 4;
          if (!nearAc(i, robustScanState.thr)) continue;
          for (const s of scalesRobust) {
            if (items.length >= maxItems) break;
            const x0 = (x - 2 * s) | 0;
            const y0 = (y - 2 * s) | 0;
            const size = 5 * s;
            if (isOverlapping(x0, y0, size)) continue;
            const r = tryDecodeAtSafe(data, w, h, x0, y0, s);
            if (!r.ok) continue;
            addItem(r);
            break;
          }
        }
        if (items.length >= maxItems) break;
        xStart = 0;
      }

      if (items.length) {
        robustScanState = null;
      } else {
        if (y >= h) robustScanState = null;
      }
    }
  }

  const now = nowTs;
  const fuzzyAllowed = (now - lastFuzzyScanTs > 3200) || !!fuzzyScanState;
  if (fuzzyAllowed) {
    if (!fuzzyScanState) lastFuzzyScanTs = now;
    const thr = 14000;
    const step2 = 8;
    const budgetMs = 12;
    if (!fuzzyScanState) fuzzyScanState = { x: 0, y: 0 };
    let y = fuzzyScanState.y | 0;
    let xStart = fuzzyScanState.x | 0;
    for (; y < h; y += step2) {
      const row = y * w * 4;
      for (let x = xStart; x < w; x += step2) {
        if (items.length >= maxItems) break;
        const ti = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
        if (ti - t0 > budgetMs) {
          fuzzyScanState.x = x;
          fuzzyScanState.y = y;
          xStart = 0;
          y = h;
          break;
        }
        const i = row + x * 4;
        if (!nearAc(i, thr)) continue;
        for (const s of scalesRobust) {
          if (items.length >= maxItems) break;
          const x0 = (x - 2 * s) | 0;
          const y0 = (y - 2 * s) | 0;
          const size = 5 * s;
          if (isOverlapping(x0, y0, size)) continue;
          const rr = tryDecodeAtSafe(data, w, h, x0, y0, s);
          if (!rr.ok) continue;
          addItem(rr);
          break;
        }
      }
      if (items.length >= maxItems) break;
      xStart = 0;
    }

    if (items.length) {
      fuzzyScanState = null;
    } else {
      if (y >= h) fuzzyScanState = null;
    }
  }

  if (!items.length) {
    const budgetMs = 20;
    const stepFine = 2;
    const thrFine = 28000;
    const scalesFine = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];
    const startT = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
    for (let y = 0; y < h; y += stepFine) {
      const row = y * w * 4;
      for (let x = 0; x < w; x += stepFine) {
        if (items.length >= maxItems) break;
        const ti = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
        if (ti - startT > budgetMs) { y = h; break; }
        const i = row + x * 4;
        if (!nearAc(i, thrFine)) continue;
        for (const s of scalesFine) {
          if (items.length >= maxItems) break;
          const x0 = (x - 2 * s) | 0;
          const y0 = (y - 2 * s) | 0;
          const size = 5 * s;
          if (isOverlapping(x0, y0, size)) continue;
          const r = tryDecodeAtSafe(data, w, h, x0, y0, s);
          if (!r.ok) continue;
          addItem(r);
          break;
        }
      }
    }
  }

  if (!items.length) {
    const budgetMs = 22;
    const stepMicro = 1;
    const thrMicro = 36000;
    const scalesMicro = [1, 2, 3, 4, 5, 6, 8, 10];
    const startMicro = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
    for (let y = 0; y < h; y += stepMicro) {
      const row = y * w * 4;
      for (let x = 0; x < w; x += stepMicro) {
        if (items.length >= maxItems) break;
        const ti = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : Date.now();
        if (ti - startMicro > budgetMs) { y = h; break; }
        const i = row + x * 4;
        if (!nearAc(i, thrMicro)) continue;
        for (const s of scalesMicro) {
          if (items.length >= maxItems) break;
          const x0 = (x - 2 * s) | 0;
          const y0 = (y - 2 * s) | 0;
          const size = 5 * s;
          if (isOverlapping(x0, y0, size)) continue;
          const r = tryDecodeAtSafe(data, w, h, x0, y0, s);
          if (!r.ok) continue;
          addItem(r);
          break;
        }
      }
    }
  }

  if (!items.length) return null;
  return { items, snap };
}

let overlayRoot: HTMLDivElement | null = null;
let overlayStyle: HTMLStyleElement | null = null;

type OverlayItem = { ring: HTMLDivElement; btn: HTMLButtonElement; badge: HTMLDivElement };
let overlayItems: OverlayItem[] = [];
let hoverCount = 0;

let lastKey = '';
let lastKeyTs = 0;
let lastOpenKey = '';
let lastOpenTs = 0;

let captchaModalInst: any = null;

let scanWorker: Worker | null = null;
let scanWorkerUrl = '';
let scanEpoch = 0;
let scanJobSeq = 0;
let scanPending = false;
let scanPendingEpoch = 0;
let scanPendingSnap: NonNullable<ReturnType<typeof captureScreenSnapshot>> | null = null;

function ensureOverlay() {
  if (overlayRoot && overlayStyle) return;

  const style = document.createElement('style');
  try {
    markElement(style);
  } catch {}
  style.textContent = `
.wph-qrm-scan{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;}
.wph-qrm-scan .ring{position:absolute;left:0;top:0;border-radius:var(--qrm-radius, 12px);border:var(--qrm-bw, 2px) solid var(--qrm-border, var(--wph-primary, #f05123));box-shadow:var(--qrm-shadow, 0 0 0 2px rgba(0,0,0,0.65),0 0 24px var(--wph-primaryGlow, rgba(240,81,35,0.55)),inset 0 0 18px var(--wph-primaryGlow, rgba(240,81,35,0.22)));transform:translateZ(0);}
.wph-qrm-scan .ring::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;}
.wph-qrm-scan .ring::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;}
.wph-qrm-scan .btn{position:absolute;left:0;top:0;width:100%;height:100%;background:transparent;border:none;outline:none;cursor:pointer;pointer-events:auto;border-radius:var(--qrm-radius, 12px);}
.wph-qrm-scan .badge{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:var(--wph-surface, rgba(12,12,14,0.65));border:1px solid var(--wph-border, rgba(255,255,255,0.18));color:var(--wph-primary, #f05123);backdrop-filter:blur(6px);box-shadow:0 10px 24px rgba(0,0,0,0.25);pointer-events:none;}
.wph-qrm-scan .badge svg{width:18px;height:18px;display:block;opacity:0.95;fill:currentColor;}
.wph-qrm-scan[data-anim="classic"]{--qrm-radius:12px;--qrm-bw:2px;}
.wph-qrm-scan[data-anim="classic"] .ring{overflow:hidden;}
.wph-qrm-scan[data-anim="classic"] .ring::after{inset:-30% 0;background:linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 60%, rgba(255,255,255,0) 100%);mix-blend-mode:screen;filter:blur(0.2px);animation:wph-qrm-scanLine 1.65s ease-in-out infinite;}
.wph-qrm-scan[data-anim="neon"]{--qrm-radius:14px;--qrm-bw:2px;--qrm-shadow:0 0 0 2px rgba(0,0,0,0.65),0 0 34px var(--wph-primaryGlow, rgba(240,81,35,0.7)),inset 0 0 24px var(--wph-primaryGlow, rgba(240,81,35,0.28));}
.wph-qrm-scan[data-anim="neon"] .ring{animation:wph-qrm-neonPulse 1.15s ease-in-out infinite;}
.wph-qrm-scan[data-anim="double"]{--qrm-radius:12px;--qrm-bw:2px;}
.wph-qrm-scan[data-anim="double"] .ring{animation:wph-qrm-doublePulse 1.35s ease-in-out infinite;}
.wph-qrm-scan[data-anim="double"] .ring::before{inset:5px;border:2px solid rgba(255,255,255,0.24);box-shadow:inset 0 0 12px rgba(0,0,0,0.22);animation:wph-qrm-doubleInner 1.35s ease-in-out infinite;}
.wph-qrm-scan[data-anim="dashed"]{--qrm-radius:12px;--qrm-bw:0px;--qrm-dash-bw:3px;--qrm-dash-l:10px;--qrm-dash-g:8px;}
.wph-qrm-scan[data-anim="dashed"] .ring{border:0;}
.wph-qrm-scan[data-anim="dashed"] .ring::before{inset:0;border-radius:inherit;box-sizing:border-box;padding:var(--qrm-dash-bw, 3px);will-change:background-position;background:
repeating-linear-gradient(90deg, var(--qrm-border, var(--wph-primary, #f05123)) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 0 0/100% var(--qrm-dash-bw, 3px) no-repeat,
repeating-linear-gradient(180deg, var(--qrm-border, var(--wph-primary, #f05123)) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 100% 0/var(--qrm-dash-bw, 3px) 100% no-repeat,
repeating-linear-gradient(90deg, var(--qrm-border, var(--wph-primary, #f05123)) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 0 100%/100% var(--qrm-dash-bw, 3px) no-repeat,
repeating-linear-gradient(180deg, var(--qrm-border, var(--wph-primary, #f05123)) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 0 0/var(--qrm-dash-bw, 3px) 100% no-repeat;
background-position:0 0, 100% 0, 0 100%, 0 0;-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;filter:drop-shadow(0 0 6px var(--wph-primaryGlow, rgba(240,81,35,0.45)));animation:wph-qrm-dashMarch 1.2s linear infinite;}
.wph-qrm-scan[data-anim="corners"]{--qrm-radius:0px;--qrm-bw:0px;--qrm-shadow:none;}
.wph-qrm-scan[data-anim="corners"] .ring{background:transparent;}
.wph-qrm-scan[data-anim="corners"] .ring::before{inset:0;border-radius:0;--qrm-corner-l:min(22px, 20%);--qrm-corner-t:clamp(2px, 2.6%, 4px);background:
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left top/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left top/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right top/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right top/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left bottom/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left bottom/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right bottom/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right bottom/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat;
transform-origin:center;animation:wph-qrm-cornerPop 1.05s ease-in-out infinite;}
.wph-qrm-scan[data-anim="glass"]{--qrm-radius:16px;--qrm-bw:1px;--qrm-border:rgba(255,255,255,0.24);--qrm-shadow:0 10px 36px rgba(0,0,0,0.38),0 0 0 2px rgba(0,0,0,0.55),inset 0 0 0 1px rgba(255,255,255,0.08);}
.wph-qrm-scan[data-anim="glass"] .ring{background:radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.00) 100%);backdrop-filter:blur(10px);overflow:hidden;}
.wph-qrm-scan[data-anim="glass"] .ring::after{inset:0;background:linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0) 60%);mix-blend-mode:overlay;transform:translateX(-120%);animation:wph-qrm-glassShine 2.65s ease-in-out infinite;}
.wph-qrm-scan[data-anim="pixel"]{--qrm-radius:0px;--qrm-bw:3px;--qrm-shadow:0 0 0 2px rgba(0,0,0,0.65),0 0 18px var(--wph-primaryGlow, rgba(240,81,35,0.45));}
.wph-qrm-scan[data-anim="pixel"] .ring{overflow:hidden;}
.wph-qrm-scan[data-anim="pixel"] .ring::before{inset:-3px;border-radius:inherit;background:
linear-gradient(90deg, rgba(240,81,35,0.35) 0 50%, rgba(0,0,0,0) 50% 100%),
linear-gradient(0deg, rgba(240,81,35,0.25) 0 50%, rgba(0,0,0,0) 50% 100%);
background-size:6px 6px,6px 6px;mix-blend-mode:screen;opacity:0.9;animation:wph-qrm-pixelNoise 0.22s linear infinite;}
.wph-qrm-scan[data-anim="pixel"] .ring::after{inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.1);opacity:0.75;animation:wph-qrm-pixelGlow 0.7s ease-in-out infinite;}

@keyframes wph-qrm-neonPulse{0%{transform:scale(1);filter:brightness(1);}50%{transform:scale(1.03);filter:brightness(1.35);}100%{transform:scale(1);filter:brightness(1);}}
@keyframes wph-qrm-dashMarch{to{background-position:calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px)) 0, 100% calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px)), calc(-1 * (var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 100%, 0 calc(-1 * (var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px)));}}
@keyframes wph-qrm-scanLine{0%{transform:translateY(-120%);opacity:0;}18%{opacity:0.62;}45%{opacity:0.18;}100%{transform:translateY(120%);opacity:0;}}
@keyframes wph-qrm-glassShine{0%{transform:translateX(-120%);opacity:0;}20%{opacity:0.95;}55%{opacity:0.55;}100%{transform:translateX(120%);opacity:0;}}
@keyframes wph-qrm-cornerPop{0%{transform:scale(0.96);}50%{transform:scale(1.02);}100%{transform:scale(0.96);}}
@keyframes wph-qrm-doublePulse{0%{transform:translateZ(0) scale(1);}50%{transform:translateZ(0) scale(1.03);}100%{transform:translateZ(0) scale(1);}}
@keyframes wph-qrm-doubleInner{0%{opacity:0.75;transform:scale(0.98);}50%{opacity:1;transform:scale(1.02);}100%{opacity:0.75;transform:scale(0.98);}}
@keyframes wph-qrm-pixelNoise{0%{background-position:0 0,0 0;}50%{background-position:3px 3px, -3px -3px;}100%{background-position:6px 6px, -6px -6px;}}
@keyframes wph-qrm-pixelGlow{0%{opacity:0.55;}50%{opacity:1;}100%{opacity:0.55;}}
`;
  document.head.appendChild(style);
  overlayStyle = style;

  const root = document.createElement('div');
  try {
    markElement(root);
  } catch {}
  root.className = 'wph-qrm-scan';
  document.body.appendChild(root);

  overlayRoot = root;
  overlayItems = [];
}

function ensureOverlayCount(count: number) {
  ensureOverlay();
  if (!overlayRoot) return;
  const root = overlayRoot;
  const mkItem = (): OverlayItem => {
    const ring = document.createElement('div');
    try {
      markElement(ring);
    } catch {}
    ring.className = 'ring';

    const btn = document.createElement('button');
    try {
      markElement(btn);
    } catch {}
    btn.type = 'button';
    btn.className = 'btn';
    btn.tabIndex = 0;

    const badge = document.createElement('div');
    try {
      markElement(badge);
    } catch {}
    badge.className = 'badge';
    btn.appendChild(badge);

    const setHover = (on: boolean) => {
      if (on) hoverCount = (hoverCount + 1) | 0;
      else hoverCount = Math.max(0, (hoverCount - 1) | 0);
      hoverLock = hoverCount > 0;
    };

    btn.addEventListener('pointerenter', () => { setHover(true); }, { passive: true } as any);
    btn.addEventListener('pointerleave', () => { setHover(false); }, { passive: true } as any);
    btn.addEventListener('focus', () => { setHover(true); }, { passive: true } as any);
    btn.addEventListener('blur', () => { setHover(false); }, { passive: true } as any);

    try {
      btn.addEventListener('wheel', (e) => stopEventHard(e), { passive: false } as any);
    } catch {}
    try {
      btn.addEventListener('pointerdown', (e) => stopEventHard(e), { passive: false } as any);
    } catch {}
    try {
      btn.addEventListener('pointermove', (e) => { try { if ((e as any).buttons) stopEventHard(e); } catch {} }, { passive: false } as any);
    } catch {}
    try {
      btn.addEventListener('touchstart', (e) => stopEventHard(e), { passive: false } as any);
      btn.addEventListener('touchmove', (e) => stopEventHard(e), { passive: false } as any);
    } catch {}
    try {
      btn.addEventListener('contextmenu', (e) => stopEventHard(e), { passive: false } as any);
    } catch {}

    btn.addEventListener('click', () => {
      try {
        const k = (btn as any).__wph_qrm_key as string;
        const syms = (btn as any).__wph_qrm_syms as number[];
        if (!k || !Array.isArray(syms)) return;
        const now = Date.now();
        if (lastOpenKey === k && now - lastOpenTs < 900) return;
        lastOpenKey = k;
        lastOpenTs = now;
        openFromSymbols(syms).catch(() => {});
      } catch {}
    });

    root.appendChild(ring);
    root.appendChild(btn);
    return { ring, btn, badge };
  };

  while (overlayItems.length < count) overlayItems.push(mkItem());
}

function hideOverlay() {
  try {
    if (overlayRoot) overlayRoot.style.display = 'none';
    hoverCount = 0;
    hoverLock = false;
  } catch {}
}

function showOverlay(idx: number, rect: { left: number; top: number; width: number; height: number }, key: string, symbols: number[]) {
  ensureOverlayCount(idx + 1);
  if (!overlayRoot) return;
  const it = overlayItems[idx];
  if (!it) return;

  try {
    const cfg = getAutoConfig();
    const raw = (cfg && (cfg as any).qrOverlayAnim) ? String((cfg as any).qrOverlayAnim) : 'classic';
    const anim = (raw === 'classic' || raw === 'neon' || raw === 'double' || raw === 'dashed' || raw === 'corners' || raw === 'glass' || raw === 'pixel') ? raw : 'classic';
    (overlayRoot as any).dataset.anim = anim;
  } catch {}

  overlayRoot.style.display = 'block';
  overlayRoot.style.left = '0px';
  overlayRoot.style.top = '0px';

  const minSize = 50;
  const rawW = Math.max(1, Math.round(rect.width));
  const rawH = Math.max(1, Math.round(rect.height));
  const side = Math.max(minSize, Math.max(rawW, rawH));
  const w = side;
  const h = side;
  const cx = rect.left + rawW / 2;
  const cy = rect.top + rawH / 2;
  const vw = Math.max(0, window.innerWidth | 0);
  const vh = Math.max(0, window.innerHeight | 0);
  const left = Math.max(0, Math.min(Math.round(cx - w / 2), Math.max(0, vw - w)));
  const top = Math.max(0, Math.min(Math.round(cy - h / 2), Math.max(0, vh - h)));

  it.ring.style.display = 'block';
  it.btn.style.display = 'block';

  it.ring.style.left = left + 'px';
  it.ring.style.top = top + 'px';
  it.ring.style.width = w + 'px';
  it.ring.style.height = h + 'px';

  it.btn.style.left = left + 'px';
  it.btn.style.top = top + 'px';
  it.btn.style.width = w + 'px';
  it.btn.style.height = h + 'px';

  try {
    const dec = decodeV2(symbols);
    const svc = (dec && dec.ok) ? String((dec as any).service || '') : '';
    const b = getServiceBadgeHtml(svc);
    it.badge.innerHTML = b.html;
    it.btn.title = b.title;
  } catch {
    try {
      it.badge.innerHTML = getServiceBadgeHtml('unknown').html;
      it.btn.title = 'Link';
    } catch {}
  }

  (it.btn as any).__wph_qrm_key = key;
  (it.btn as any).__wph_qrm_syms = symbols;
}

function showCaptchaModal(shortUrl: string, onRetry: () => void) {
  if (captchaModalInst) return;
  captchaModalInst = new CaptchaModal({ target: document.body, props: { shortUrl } });
  try {
    captchaModalInst.$on('retry', () => {
      try {
        if (captchaModalInst) {
          captchaModalInst.$destroy();
          captchaModalInst = null;
        }
      } catch {}
      onRetry();
    });
    captchaModalInst.$on('closed', () => {
      try {
        if (captchaModalInst) {
          captchaModalInst.$destroy();
          captchaModalInst = null;
        }
      } catch {}
    });
  } catch {}
}

function extractUrlFromYandexRedirect(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.hostname === 'sba.yandex.ru' && url.pathname === '/redirect') {
      const target = url.searchParams.get('url');
      if (target) {
        try {
          return decodeURIComponent(target);
        } catch {
          return target;
        }
      }
    }
  } catch {}
  return null;
}

function gmResolve(url: string): Promise<string | null> {
  const gm = (window as any).GM_xmlhttpRequest || ((window as any).GM && (window as any).GM.xmlHttpRequest);
  if (!gm) return Promise.resolve(null);
  return new Promise((res) => {
    try {
      gm({
        method: 'GET',
        url,
        headers: { Accept: 'text/html' },
        onload: (r: any) => {
          try {
            let u = String(r?.finalUrl || '').trim();
            const extracted = extractUrlFromYandexRedirect(u);
            if (extracted) u = extracted;
            res(u || null);
          } catch {
            res(null);
          }
        },
        onerror: () => res(null),
      } as any);
    } catch {
      res(null);
    }
  });
}

async function expandShort(_provider: string, slug: string): Promise<string | undefined> {
  try {
    const httpsUrl = `https://clck.ru/${encodeURIComponent(slug || '')}`;
    let fin = await gmResolve(httpsUrl);
    if (fin) {
      const extracted = extractUrlFromYandexRedirect(fin);
      if (extracted) fin = extracted;
      return fin;
    }
    try {
      const r = await fetch(httpsUrl, { method: 'GET', redirect: 'follow' as RequestRedirect });
      if (r && r.url && r.url !== httpsUrl) {
        let u = r.url;
        const extracted = extractUrlFromYandexRedirect(u);
        if (extracted) u = extracted;
        return u;
      }
    } catch {}
    try {
      const httpUrl = `http://clck.ru/${encodeURIComponent(slug || '')}`;
      let fin2 = await gmResolve(httpUrl);
      if (fin2) {
        const extracted = extractUrlFromYandexRedirect(fin2);
        if (extracted) fin2 = extracted;
        return fin2;
      }
    } catch {}
  } catch {}
  return undefined;
}

function extractYouTubeId(u: string): string {
  try {
    const url = new URL(u);
    const h = url.hostname.toLowerCase();
    if (h === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split(/[/?#]/)[0];
      if (id) return id;
    }
    if (h.endsWith('youtube.com')) {
      if (/^\/shorts\//.test(url.pathname)) {
        const id = url.pathname.split('/')[2] || '';
        if (id) return id;
      }
      const id = url.searchParams.get('v') || '';
      if (id) return id;
    }
  } catch {}
  return '';
}

function extractTikTokId(u: string): string {
  try {
    const url = new URL(u);
    const m = url.pathname.match(/\/video\/(\d+)/);
    if (m) return m[1];
  } catch {}
  return '';
}

function extractTikTokShortCode(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    if (/^(?:vt|vm)\.tiktok\.com$/.test(host)) {
      const p = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      if (p[0]) return p[0];
    }
    if (host.endsWith('tiktok.com')) {
      const from = url.searchParams.get('fromUrl') || '';
      if (from) {
        const seg = String(from).replace(/^\/+/, '').split('/')[0] || '';
        if (seg) return seg;
      }
      const p = url.pathname.replace(/^\/+/, '');
      const seg = (p.split('/')[0] || '').trim();
      if (seg && !/^@/.test(seg) && !/^video$/i.test(seg)) return seg;
    }
  } catch {}
  return '';
}

async function resolveTikTokIdFromCode(code: string): Promise<string> {
  if (!code) return '';
  const tries = [`https://vt.tiktok.com/${code}/`, `https://vm.tiktok.com/${code}/`];
  for (const url of tries) {
    const fin = await gmResolve(url);
    const id = fin ? extractTikTokId(fin) : '';
    if (id) return id;
  }
  return '';
}

async function resolveTikTokIdViaOEmbed(u: string): Promise<string> {
  const gm = (window as any).GM_xmlhttpRequest || ((window as any).GM && (window as any).GM.xmlHttpRequest);
  const endpoint = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(u);
  if (gm) {
    try {
      const html = await new Promise<string | null>((resolve) => {
        try {
          gm({
            method: 'GET',
            url: endpoint,
            headers: { Accept: 'application/json' },
            onload: (r: any) => {
              try {
                resolve(String(r?.responseText || '') || null);
              } catch {
                resolve(null);
              }
            },
            onerror: () => resolve(null),
          } as any);
        } catch {
          resolve(null);
        }
      });
      if (html) {
        try {
          const json = JSON.parse(html);
          const h = String(json?.html || '');
          const m = h.match(/\/video\/(\d+)/);
          if (m && m[1]) return m[1];
        } catch {}
      }
    } catch {}
  }
  try {
    const res = await fetch(endpoint, { method: 'GET' });
    if (res.ok) {
      const json: any = await res.json().catch(() => null);
      const h = String(json?.html || '');
      const m = h.match(/\/video\/(\d+)/);
      if (m && m[1]) return m[1];
    }
  } catch {}
  return '';
}

function cleanSoundCloud(u: string): string {
  try {
    const url = new URL(u);
    if (url.hostname.toLowerCase().endsWith('soundcloud.com')) {
      const keys: string[] = [];
      url.searchParams.forEach((_, k) => {
        if (/^utm_/i.test(k) || k === 'si') keys.push(k);
      });
      for (const k of keys) url.searchParams.delete(k);
      return url.toString();
    }
  } catch {}
  return u;
}

async function normalizeSoundCloud(u: string): Promise<string> {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    if (host === 'on.soundcloud.com') {
      const fin = await gmResolve(u);
      if (fin) return cleanSoundCloud(fin);
    }
    if (host.endsWith('soundcloud.com')) return cleanSoundCloud(u);
  } catch {}
  return u;
}

function cleanSpotify(u: string): string {
  try {
    const url = new URL(u);
    const h = url.hostname.toLowerCase();
    if (h.endsWith('spotify.com')) {
      const keys: string[] = [];
      url.searchParams.forEach((_, k) => {
        if (/^utm_/i.test(k) || k === 'si') keys.push(k);
      });
      for (const k of keys) url.searchParams.delete(k);
      return url.toString();
    }
  } catch {}
  return u;
}

async function normalizeSpotify(u: string): Promise<string> {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    if (host === 'spotify.link') {
      const fin = await gmResolve(u);
      if (fin) return cleanSpotify(fin);
    }
    if (host.endsWith('spotify.com')) return cleanSpotify(u);
  } catch {}
  return u;
}

const openMap = new Map<string, any>();

function canOpenOnce(key: string): boolean {
  const now = Date.now();
  if (lastOpenKey === key && now - lastOpenTs < 900) return false;
  lastOpenKey = key;
  lastOpenTs = now;
  return true;
}

function openYouTube(id: string) {
  if (!id) return;
  const key = 'yt:' + id;
  if (openMap.has(key)) return;
  if (!canOpenOnce(key)) return;
  const inst: any = new MediaOverlay({ target: document.body, props: { videoId: id } as any });
  openMap.set(key, inst);
  try {
    inst.$on('closed', () => {
      try {
        openMap.delete(key);
      } catch {}
    });
  } catch {}
}

function openTikTok(id: string) {
  if (!id) return;
  const key = 'tt:' + id;
  if (openMap.has(key)) return;
  if (!canOpenOnce(key)) return;
  const inst: any = new MediaOverlayTikTok({ target: document.body, props: { videoId: id } as any });
  openMap.set(key, inst);
  try {
    inst.$on('closed', () => {
      try {
        openMap.delete(key);
      } catch {}
    });
  } catch {}
}

function openSpotify(url: string) {
  if (!url) return;
  const key = 'sp:' + url;
  if (openMap.has(key)) return;
  if (!canOpenOnce(key)) return;
  const inst: any = new MediaOverlaySpotify({ target: document.body, props: { sourceUrl: url, title: 'Spotify' } as any });
  openMap.set(key, inst);
  try {
    inst.$on('closed', () => {
      try {
        openMap.delete(key);
      } catch {}
    });
  } catch {}
}

function openSoundCloud(url: string) {
  if (!url) return;
  const key = 'sc:' + url;
  if (openMap.has(key)) return;
  if (!canOpenOnce(key)) return;
  const inst: any = new MediaOverlaySoundCloud({ target: document.body, props: { sourceUrl: url, title: 'SoundCloud' } as any });
  openMap.set(key, inst);
  try {
    inst.$on('closed', () => {
      try {
        openMap.delete(key);
      } catch {}
    });
  } catch {}
}

async function openFromSymbols(symbols: number[]): Promise<void> {
  const dec = decodeV2(symbols);
  if (!dec || !dec.ok) return;

  const key = `${String(dec.service)}:${String(dec.slug)}`;
  if (!canOpenOnce(key)) return;

  const processUrl = async () => {
    let finalUrl = await expandShort(dec.provider, dec.slug);
    if (!finalUrl) {
      const short = 'https://clck.ru/' + encodeURIComponent(dec.slug || '');
      const fin = await gmResolve(short);
      if (fin) finalUrl = fin;
    }
    if (!finalUrl) {
      try {
        const cached = localStorage.getItem(`wph:qrm:clck:${dec.slug}`) || '';
        if (cached) finalUrl = cached;
      } catch {}
    }
    if (!finalUrl) {
      const shortUrl = 'https://clck.ru/' + encodeURIComponent(dec.slug || '');
      showCaptchaModal(shortUrl, () => {
        openFromSymbols(symbols).catch(() => {});
      });
      return null;
    }
    return finalUrl;
  };

  const finalUrl = await processUrl();
  if (!finalUrl) return;

  if ((dec.service as Service) === 'youtube') {
    const id = extractYouTubeId(finalUrl);
    if (id) openYouTube(id);
    return;
  }

  if ((dec.service as Service) === 'tiktok') {
    let id = extractTikTokId(finalUrl);
    if (!id) {
      const code = extractTikTokShortCode(finalUrl);
      if (code) id = await resolveTikTokIdFromCode(code);
    }
    if (!id) id = await resolveTikTokIdViaOEmbed(finalUrl);
    if (id) openTikTok(id);
    return;
  }

  if ((dec.service as Service) === 'spotify') {
    const spUrl = await normalizeSpotify(finalUrl);
    openSpotify(spUrl);
    return;
  }

  if ((dec.service as Service) === 'soundcloud') {
    const scUrl = await normalizeSoundCloud(finalUrl);
    openSoundCloud(scUrl);
  }
}

let started = false;
let timer: number | null = null;

let movingUntil = 0;
let lastFound: { x0: number; y0: number; s: number } | null = null;
let lastFuzzyScanTs = 0;
let lastRobustScanTs = 0;
let lastAnyFoundTs = 0;
let robustScanState: { x: number; y: number; step: number; thr: number } | null = null;
let fuzzyScanState: { x: number; y: number } | null = null;
let hoverLock = false;

function stopEventHard(e: any) {
  try {
    if (e && e.preventDefault) e.preventDefault();
  } catch {}
  try {
    if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
  } catch {}
  try {
    if (e && e.stopPropagation) e.stopPropagation();
  } catch {}
}

function getServiceBadgeHtml(service: string): { html: string; title: string } {
  const s = String(service || 'unknown');
  if (s === 'youtube') {
    return {
      title: 'YouTube',
      html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12z" /></svg>`,
    };
  }
  if (s === 'tiktok') {
    return {
      title: 'TikTok',
      html: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.656 1.029c1.637-0.025 3.262-0.012 4.886-0.025 0.054 2.031 0.878 3.859 2.189 5.213l-0.002-0.002c1.411 1.271 3.247 2.095 5.271 2.235l0.028 0.002v5.036c-1.912-0.048-3.71-0.489-5.331-1.247l0.082 0.034c-0.784-0.377-1.447-0.764-2.077-1.196l0.052 0.034c-0.012 3.649 0.012 7.298-0.025 10.934-0.103 1.853-0.719 3.543-1.707 4.954l0.020-0.031c-1.652 2.366-4.328 3.919-7.371 4.011l-0.014 0c-0.123 0.006-0.268 0.009-0.414 0.009-1.73 0-3.347-0.482-4.725-1.319l0.040 0.023c-2.508-1.509-4.238-4.091-4.558-7.094l-0.004-0.041c-0.025-0.625-0.037-1.25-0.012-1.862 0.49-4.779 4.494-8.476 9.361-8.476 0.547 0 1.083 0.047 1.604 0.136l-0.056-0.008c0.025 1.849-0.050 3.699-0.050 5.548-0.423-0.153-0.911-0.242-1.42-0.242-1.868 0-3.457 1.194-4.045 2.861l-0.009 0.030c-0.133 0.427-0.21 0.918-0.21 1.426 0 0.206 0.013 0.41 0.037 0.61l-0.002-0.024c0.332 2.046 2.086 3.59 4.201 3.59 0.061 0 0.121-0.001 0.181-0.004l-0.009 0c1.463-0.044 2.733-0.831 3.451-1.994l0.010-0.018c0.267-0.372 0.45-0.822 0.511-1.311l0.001-0.014c0.125-2.237 0.075-4.461 0.087-6.698 0.012-5.036-0.012-10.060 0.025-15.083z"></path></svg>`,
    };
  }
  if (s === 'spotify') {
    return {
      title: 'Spotify',
      html: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/></svg>`,
    };
  }
  if (s === 'soundcloud') {
    return {
      title: 'SoundCloud',
      html: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26,25H16c-0.6,0-1-0.4-1-1V8.1c0-0.5,0.4-0.9,0.9-1C16.3,7,16.7,7,17,7c3.2,0,6.4,2.7,7.5,6.2c0.5-0.1,1-0.2,1.5-0.2 c3.3,0,6,2.7,6,6S29.3,25,26,25z"/><path d="M13,25c-0.6,0-1-0.4-1-1V10c0-0.6,0.4-1,1-1s1,0.4,1,1v14C14,24.6,13.6,25,13,25z"/><path d="M10,24c-0.6,0-1-0.4-1-1v-7c0-0.6,0.4-1,1-1s1,0.4,1,1v7C11,23.6,10.6,24,10,24z"/><path d="M7,25c-0.6,0-1-0.4-1-1V13c0-0.6,0.4-1,1-1s1,0.4,1,1v11C8,24.6,7.6,25,7,25z"/><path d="M4,24c-0.6,0-1-0.4-1-1v-6c0-0.6,0.4-1,1-1s1,0.4,1,1v6C5,23.6,4.6,24,4,24z"/><path d="M1,23c-0.6,0-1-0.4-1-1v-4c0-0.6,0.4-1,1-1s1,0.4,1,1v4C2,22.6,1.6,23,1,23z"/></svg>`,
    };
  }
  return { title: 'Link', html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0z"/><path fill="currentColor" d="M7 17a4 4 0 0 1 0-5.7l2-2a4 4 0 0 1 5.7 0 1 1 0 0 1-1.4 1.4 2 2 0 0 0-2.8 0l-2 2A2 2 0 1 0 11 15.3a1 1 0 0 1 1.4 1.4A4 4 0 0 1 7 17z" opacity="0.8"/><path fill="currentColor" d="M13 7a4 4 0 0 1 6.8 2.8 4 4 0 0 1-1.1 2.8l-2 2a4 4 0 0 1-5.7 0 1 1 0 0 1 1.4-1.4 2 2 0 0 0 2.8 0l2-2A2 2 0 1 0 13 8.7a1 1 0 0 1-1.4-1.4A4 4 0 0 1 13 7z" opacity="0.8"/></svg>` };
}

function noteMoving() {
  const now = Date.now();
  if (hoverLock) return;
  movingUntil = now + 500;
  lastFound = null;
  try {
    if (scanWorker) scanWorker.postMessage({ type: 'reset' });
  } catch {}
  try {
    hideOverlay();
  } catch {}
}

function loop() {
  try {
    if (!started) return;
    if (document.hidden) {
      hideOverlay();
      try {
        if (scanWorker) scanWorker.postMessage({ type: 'reset' });
      } catch {}
      timer = window.setTimeout(loop, 900);
      return;
    }
    if (!isQrMusicEnabled()) {
      hideOverlay();
      try {
        if (scanWorker) scanWorker.postMessage({ type: 'reset' });
      } catch {}
      timer = window.setTimeout(loop, 650);
      return;
    }

    if (isScannerSuppressed()) {
      hideOverlay();
      try {
        if (scanWorker) scanWorker.postMessage({ type: 'reset' });
      } catch {}
      timer = window.setTimeout(loop, 1200);
      return;
    }

    const now0 = Date.now();
    if (now0 < movingUntil) {
      hideOverlay();
      timer = window.setTimeout(loop, 600);
      return;
    }

    if (scanWorker) {
      if (scanPending) {
        timer = window.setTimeout(loop, 220);
        return;
      }

      const snap = captureScreenSnapshot();
      if (!snap) {
        hideOverlay();
        timer = window.setTimeout(loop, 1200);
        return;
      }

      let buf: ArrayBuffer | null = null;
      try {
        const arr = snap.data.data;
        buf = arr.buffer.slice(0);
      } catch {
        buf = null;
      }
      if (!buf) {
        hideOverlay();
        timer = window.setTimeout(loop, 1200);
        return;
      }

      scanPending = true;
      scanPendingEpoch = ++scanEpoch;
      scanPendingSnap = snap;
      const jobId = ++scanJobSeq;
      try {
        scanWorker.postMessage({ type: 'scan', jobId, epoch: scanPendingEpoch, width: snap.width | 0, height: snap.height | 0, pixels: buf }, [buf]);
      } catch {
        scanPending = false;
        scanPendingEpoch = 0;
        scanPendingSnap = null;
      }

      timer = window.setTimeout(loop, 450);
      return;
    }

    const det = detectOnSnapshot();
    if (!det || !det.items || !det.items.length) {
      hideOverlay();
      timer = window.setTimeout(loop, 1200);
      return;
    }

    const key = det.items.map((it) => it.symbols.join(',')).join('|');
    const now = Date.now();
    if (key && key === lastKey && now - lastKeyTs < 250) {
      timer = window.setTimeout(loop, 200);
      return;
    }
    lastKey = key;
    lastKeyTs = now;

    const first = det.items[0];
    lastFound = { x0: first.x0, y0: first.y0, s: Math.max(1, Math.round(first.size / 5)) };

    ensureOverlayCount(det.items.length);
    for (let i = 0; i < det.items.length; i++) {
      const it = det.items[i];
      const tl = snapshotToClient(det.snap, it.x0, it.y0);
      const br = snapshotToClient(det.snap, it.x0 + it.size, it.y0 + it.size);
      if (!tl || !br) continue;
      const left = Math.min(tl[0], br[0]);
      const top = Math.min(tl[1], br[1]);
      const width = Math.abs(br[0] - tl[0]);
      const height = Math.abs(br[1] - tl[1]);
      showOverlay(i, { left, top, width, height }, it.symbols.join(','), it.symbols);
    }

    if (overlayRoot) {
      for (let j = det.items.length; j < overlayItems.length; j++) {
        try {
          overlayItems[j].ring.style.display = 'none';
          overlayItems[j].btn.style.display = 'none';
        } catch {}
      }
    }

    timer = window.setTimeout(loop, 1200);
  } catch {
    try {
      hideOverlay();
    } catch {}
    timer = window.setTimeout(loop, 1200);
  }
}

export function initQrScreenScanner(): void {
  try {
    if ((window as any).__wph_qrm_screen_scanner_inited) return;
    (window as any).__wph_qrm_screen_scanner_inited = true;
  } catch {}

  try {
    const code = generateQrScannerWorkerCode();
    const blob = new Blob([code], { type: 'text/javascript' });
    scanWorkerUrl = URL.createObjectURL(blob);
    scanWorker = new Worker(scanWorkerUrl);
    scanWorker.onmessage = (ev: MessageEvent<any>) => {
      const d = ev && (ev as any).data ? (ev as any).data : null;
      if (!d || d.type !== 'result') return;
      const epoch = (d.epoch | 0) || 0;
      if (!scanPending || epoch !== scanPendingEpoch) return;
      scanPending = false;
      scanPendingEpoch = 0;
      const snap = scanPendingSnap;
      scanPendingSnap = null;
      if (!snap) return;
      const items = Array.isArray(d.items) ? d.items : [];
      if (!items.length) {
        hideOverlay();
        return;
      }

      const key = items.map((it: any) => Array.isArray(it?.symbols) ? it.symbols.join(',') : '').join('|');
      const now = Date.now();
      if (key && key === lastKey && now - lastKeyTs < 250) return;
      lastKey = key;
      lastKeyTs = now;

      ensureOverlayCount(items.length);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const x0 = (it && isFinite(it.x0) ? (it.x0 | 0) : 0);
        const y0 = (it && isFinite(it.y0) ? (it.y0 | 0) : 0);
        const size = (it && isFinite(it.size) ? (it.size | 0) : 0);
        const syms = Array.isArray(it?.symbols) ? it.symbols.map((v: any) => (v | 0)) : [];
        if (!syms.length || size <= 0) continue;
        const tl = snapshotToClient(snap, x0, y0);
        const br = snapshotToClient(snap, x0 + size, y0 + size);
        if (!tl || !br) continue;
        const left = Math.min(tl[0], br[0]);
        const top = Math.min(tl[1], br[1]);
        const width = Math.abs(br[0] - tl[0]);
        const height = Math.abs(br[1] - tl[1]);
        showOverlay(i, { left, top, width, height }, syms.join(','), syms);
      }

      if (overlayRoot) {
        for (let j = items.length; j < overlayItems.length; j++) {
          try {
            overlayItems[j].ring.style.display = 'none';
            overlayItems[j].btn.style.display = 'none';
          } catch {}
        }
      }
    };
    try {
      scanWorker.postMessage({ type: 'init', palette: FREE32 });
    } catch {}
  } catch {
    try {
      if (scanWorker) {
        scanWorker.terminate();
        scanWorker = null;
      }
    } catch {}
    try {
      if (scanWorkerUrl) {
        URL.revokeObjectURL(scanWorkerUrl);
        scanWorkerUrl = '';
      }
    } catch {}
    scanWorker = null;
    scanWorkerUrl = '';
  }

  try {
    window.addEventListener('wheel', () => noteMoving(), { passive: true });
  } catch {}
  try {
    window.addEventListener('pointerdown', () => noteMoving(), { passive: true });
  } catch {}
  try {
    window.addEventListener('pointermove', (e: PointerEvent) => {
      try {
        if ((e.buttons | 0) !== 0) noteMoving();
      } catch {}
    }, { passive: true } as any);
  } catch {}
  try {
    window.addEventListener('touchstart', () => noteMoving(), { passive: true } as any);
    window.addEventListener('touchmove', () => noteMoving(), { passive: true } as any);
  } catch {}

  try {
    window.addEventListener('wheel', (e: any) => { try { if (hoverLock) stopEventHard(e); } catch {} }, { capture: true, passive: false } as any);
    window.addEventListener('pointerdown', (e: any) => { try { if (hoverLock) stopEventHard(e); } catch {} }, { capture: true, passive: false } as any);
    window.addEventListener('pointermove', (e: any) => { try { if (hoverLock && (e && e.buttons)) stopEventHard(e); } catch {} }, { capture: true, passive: false } as any);
    window.addEventListener('touchmove', (e: any) => { try { if (hoverLock) stopEventHard(e); } catch {} }, { capture: true, passive: false } as any);
  } catch {}

  started = true;
  try {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  } catch {}
  loop();
}
