import { decodeV2 } from '../topmenu/qrmusic/codec';
import { getPalette } from '../editor/palette';

type ScanItem = { symbols: number[]; x0: number; y0: number; size: number };

type ScanMsg = { type: 'scan'; jobId: number; epoch: number; width: number; height: number; pixels: ArrayBuffer };
type ResetMsg = { type: 'reset' };

type MsgIn = ScanMsg | ResetMsg;

type ScanResultMsg = { type: 'result'; jobId: number; epoch: number; items: ScanItem[] };

type RGB = [number, number, number];

const FREE32: RGB[] = getPalette('free').slice(0, 32) as any;

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

function anchorsMatchExact(data: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, s: number): boolean {
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

function tryDecodeAtSafe(data: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, s: number): { ok: true; symbols: number[]; x0: number; y0: number; size: number } | { ok: false } {
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

function tryDecodeAtFast(data: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, s: number): { ok: true; symbols: number[]; x0: number; y0: number; size: number } | { ok: false } {
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

let lastFound: { x0: number; y0: number; s: number } | null = null;
let lastFuzzyScanTs = 0;
let lastRobustScanTs = 0;
let lastAnyFoundTs = 0;
let robustScanState: { x: number; y: number; step: number; thr: number } | null = null;
let fuzzyScanState: { x: number; y: number } | null = null;

function resetState() {
  lastFound = null;
  lastFuzzyScanTs = 0;
  lastRobustScanTs = 0;
  lastAnyFoundTs = 0;
  robustScanState = null;
  fuzzyScanState = null;
}

function detectOnPixels(data: Uint8ClampedArray, w: number, h: number, nowTs: number): ScanItem[] {
  if (w <= 0 || h <= 0) return [];

  const t0 = (typeof performance !== 'undefined' && performance && performance.now) ? performance.now() : nowTs;
  const maxItems = 6;
  const items: ScanItem[] = [];
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

  const step = 10;
  const scales = [2, 3, 4, 5, 6, 8, 10, 12, 16];
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
      if (ex == null) continue;
      const fi = ex % FREE32.length;
      if (fi !== (AC % FREE32.length)) continue;

      for (const s of scales) {
        if (items.length >= maxItems) break;
        const x0 = (x - 2 * s) | 0;
        const y0 = (y - 2 * s) | 0;
        const size = 5 * s;
        if (isOverlapping(x0, y0, size)) continue;
        const r = tryDecodeAtFast(data, w, h, x0, y0, s);
        if (r.ok) {
          addItem(r);
          break;
        }

        const off = Math.max(1, Math.floor(s / 3));
        for (let dy = -off; dy <= off; dy += off) {
          for (let dx = -off; dx <= off; dx += off) {
            if (!dx && !dy) continue;
            const x1 = (x0 + dx) | 0;
            const y1 = (y0 + dy) | 0;
            if (isOverlapping(x1, y1, size)) continue;
            const r2 = tryDecodeAtFast(data, w, h, x1, y1, s);
            if (!r2.ok) continue;
            addItem(r2);
            dy = off + 1;
            break;
          }
        }
      }
    }
    if (items.length >= maxItems) break;
  }

  if (!items.length) {
    const hungry = nowTs - lastAnyFoundTs > 4200;
    const stepR = hungry ? 3 : 6;
    const thrR = hungry ? 14000 : 9800;
    const budgetMs = hungry ? 10 : 6;

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

  const fuzzyAllowed = (nowTs - lastFuzzyScanTs > 3200) || !!fuzzyScanState;
  if (fuzzyAllowed) {
    if (!fuzzyScanState) lastFuzzyScanTs = nowTs;
    const thr = 7800;
    const step2 = 16;
    const budgetMs = 4;
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

  if (items.length) {
    const first = items[0];
    lastFound = { x0: first.x0, y0: first.y0, s: Math.max(1, Math.round(first.size / 5)) };
  }

  return items;
}

(self as any).onmessage = (ev: MessageEvent<MsgIn>) => {
  const msg: any = ev?.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'reset') {
    resetState();
    return;
  }

  if (msg.type === 'scan') {
    const m = msg as ScanMsg;
    const jobId = (m.jobId | 0) || 0;
    const epoch = (m.epoch | 0) || 0;
    const width = (m.width | 0) || 0;
    const height = (m.height | 0) || 0;
    let pixels: Uint8ClampedArray;
    try {
      pixels = new Uint8ClampedArray(m.pixels);
    } catch {
      pixels = new Uint8ClampedArray();
    }

    const items = detectOnPixels(pixels, width, height, Date.now());
    const out: ScanResultMsg = { type: 'result', jobId, epoch, items };
    try {
      (self as any).postMessage(out);
    } catch {}
  }
};
