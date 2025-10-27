import { playSendOrbitalEffect, SendEffectColor } from '../effects/SendEffect';
import { MASTER_COLORS } from '../editor/palette';
 
import { getStencilManager } from '../template/stencilManager';
import { getAutoConfig } from './autoConfig';
import { t } from '../i18n';
import { showCenterNotice } from '../ui/centerNotice';
import { getSelectedFile, getOriginCoords } from '../overlay/state';
import { getPersistentItem, setPersistentItem, removePersistentItem } from '../wguard/stealth/store';
import { normalizeChannelData, postChannelMessage } from '../wguard/core/channel';
import { hasStream, ensureVideo, captureScreenSnapshot, snapshotToClient, showClickMarker } from './captureManager';
import { log } from '../overlay/log';

let formatErrorDetected = false;
let enhancedNoticeActive = false;
let enhancedNoticeTimer: number | null = null;
let enhancedOverlayResetNeeded = false;

function shouldBlockFormat(reason?: string): boolean {
  if (reason === 'bypass') {
    return false;
  }
  if (reason === 'format_error') {
    try {
      const cfg: any = getAutoConfig();
      if (cfg?.wguardBypassProtection) return false;
    } catch {}
  }
  return true;
}

function readChannelPayload(event: MessageEvent | { data?: any } | null | undefined) {
  return normalizeChannelData((event as any)?.data);
}

function sendChannel(payload: Record<string, any>) {
  postChannelMessage(payload);
}

function waitForBmContext(totalTimeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const data = readChannelPayload(ev) as any;
      if (!data) return;
      if (data.action === 'bm:context' && data.ok) {
        if (!done) { done = true; cleanup(); resolve(true); }
      }
      if (data.action === 'bm:formatError') {
        const reason = typeof (data as any)?.reasonCode === 'string' ? (data as any).reasonCode : (typeof (data as any)?.reason === 'string' ? (data as any).reason : '');
        if (shouldBlockFormat(String(reason || ''))) {
          formatErrorDetected = true;
          if (!done) { done = true; cleanup(); resolve(false); }
        } else {
          if (!done) { done = true; cleanup(); resolve(true); }
        }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    sendChannel({ action: 'bm:interceptStart' });
    sendChannel({ action: 'bm:triggerPaint' });
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
  sendChannel({ action: 'bm:clearContext' });
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
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const data = readChannelPayload(ev) as any;
      if (!data) return;
      if (data.action === 'bm:placed') {
        if (data.reason === 'format_error' || data.reason === 'no_fp') {
          if (shouldBlockFormat(String(data.reason || ''))) {
            formatErrorDetected = true;
            try {
              const cfg: any = getAutoConfig();
              if (!cfg || cfg.persistAutoRun !== true) {
                stopAutoPainter();
              }
            } catch {}
          }
        }
        if (!done) { done = true; cleanup(); resolve({ ok: data.ok === true, status: Number(data.status || 0) }); }
      }
      if (data.action === 'bm:formatError') {
        const reason = typeof (data as any)?.reasonCode === 'string' ? (data as any).reasonCode : (typeof (data as any)?.reason === 'string' ? (data as any).reason : '');
        if (!shouldBlockFormat(String(reason || ''))) {
          if (!done) { done = true; cleanup(); resolve({ ok: true, status: 0 }); }
          return;
        }
        formatErrorDetected = true;
        try {
          const cfg: any = getAutoConfig();
          if (!cfg || cfg.persistAutoRun !== true) {
            stopAutoPainter();
          }
        } catch {}
        if (!done) { done = true; cleanup(); resolve({ ok: false, status: 0 }); }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    sendChannel({ action: 'bm:place', chunkX, chunkY, coords: coords.slice(), colors: colors.slice() });
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
      const data = readChannelPayload(ev) as any;
      if (!data) return;
      if (data.action === 'bm:placed') {
        if (data.reason === 'format_error' || data.reason === 'no_fp') {
          if (shouldBlockFormat(String(data.reason || ''))) {
            formatErrorDetected = true;
            try {
              const cfg: any = getAutoConfig();
              if (!cfg || cfg.persistAutoRun !== true) {
                stopAutoPainter();
              }
            } catch {}
          }
        }
        if (!done) { done = true; cleanup(); resolve({ ok: data.ok === true, status: Number(data.status || 0) }); }
      }
      if (data.action === 'bm:formatError') {
        const reason = typeof (data as any)?.reasonCode === 'string' ? (data as any).reasonCode : (typeof (data as any)?.reason === 'string' ? (data as any).reason : '');
        if (shouldBlockFormat(String(reason || ''))) {
          formatErrorDetected = true;
          try {
            const cfg: any = getAutoConfig();
            if (!cfg || cfg.persistAutoRun !== true) {
              stopAutoPainter();
            }
          } catch {}
        }
        if (!done) { done = true; cleanup(); resolve({ ok: false, status: 0 }); }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    sendChannel({ action: 'bm:placeIntercept', chunkX, chunkY, coords: coords.slice(), colors: colors.slice() });
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve({ ok: false, status: 0 }); } }, Math.max(1000, timeoutMs));
  });
}


function securePlace(chunkX: number, chunkY: number, coords: number[], colors: number[], timeoutMs = 20000): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      try { window.removeEventListener('message', onMsg); } catch {}
      try { if (to) clearTimeout(to as any); } catch {}
    };
    const onMsg = (ev: MessageEvent) => {
      const data = readChannelPayload(ev) as any;
      if (!data) return;
      if (data.action === 'secure:placed') {
        if (!done) { done = true; cleanup(); resolve({ ok: data.ok === true, status: Number(data.status || 0) }); }
      }
    };
    try { window.addEventListener('message', onMsg); } catch {}
    sendChannel({ action: 'secure:place', chunkX, chunkY, coords: coords.slice(), colors: colors.slice() });
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve({ ok: false, status: 0 }); } }, Math.max(1000, timeoutMs));
  });
}


function collectPendingChunksMulti(): Array<[[number, number], Array<[number, number, number]>]> {
  try {
    const sm = getStencilManager();
    try { sm.setAutoSelectedMasterIdx(null as any); } catch {}
    const grouped = (sm as any).getPendingGroupedByColor?.();
    const out: Array<[[number, number], Array<[number, number, number]>]> = [];
    if (!grouped || typeof grouped[Symbol.iterator] !== 'function') return out;
    const dMult = Math.max(1, Number(sm?.drawMult || 1));
    const cfg = getAutoConfig();
    const onlySel = !!(cfg as any)?.bmOnlySelected;
    const multi = !!(cfg as any)?.bmMultiColor;
    const selIdxRaw = (cfg as any)?.bmSelectedMasterIdx;
    const selIdx = (selIdxRaw == null || !Number.isFinite(selIdxRaw)) ? null : Number(selIdxRaw);
    const mode = String((cfg as any)?.bmMode || 'random');
    const items: Array<[string, Map<number, Array<[number, number]>>]> = [];
    for (const it of grouped as Map<string, Map<number, Array<[number, number]>>>) items.push(it);
    let allowedSet: Set<number> | null = null;
    try {
      const allowed = getAutoAllowedMasters();
      if (Array.isArray(allowed) && allowed.length) allowedSet = new Set(allowed.map(n=>Number(n)));
    } catch {}
    let globalPick: number | null = null;
    if (!multi) {
      if (selIdx != null) {
        globalPick = selIdx;
      } else {
        try {
          const counts = (getStencilManager() as any).getRemainingCountsTotal?.();
          if (counts && Array.isArray(counts) && counts.length) {
            let best = -1, bestC = -1;
            for (let i = 0; i < counts.length; i++) {
              if (allowedSet && !allowedSet.has(i)) continue;
              const c = counts[i] | 0;
              if (c > bestC) { best = i; bestC = c; }
            }
            if (best >= 0) globalPick = best;
          }
        } catch {}
      }
    }
    let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
    let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
    for (const [k] of items) {
      const p = k.split(',');
      const x = Number(p[0]) || 0, y = Number(p[1]) || 0;
      if (x < minCx) minCx = x;
      if (x > maxCx) maxCx = x;
      if (y < minCy) minCy = y;
      if (y > maxCy) maxCy = y;
    }
    for (const [, colorMap] of items) {
      for (const arr of colorMap.values()) {
        for (const point of arr) {
          const px = Number(point?.[0]) || 0;
          const py = Number(point?.[1]) || 0;
          if (px < minPx) minPx = px;
          if (px > maxPx) maxPx = px;
          if (py < minPy) minPy = py;
          if (py > maxPy) maxPy = py;
        }
      }
    }
    const tDim = Math.max(1, Math.max(1, Number((sm as any)?.tileSize || 0)) * Math.max(1, Number(sm?.drawMult || 1)));
    const centerPx = (minPx + maxPx) / 2;
    const centerPy = (minPy + maxPy) / 2;

    if (mode === 'topDown') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ay !== by) return ay - by;
        return ax - bx;
      });
    } else if (mode === 'bottomUp') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ay !== by) return by - ay;
        return ax - bx;
      });
    } else if (mode === 'leftRight') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ax !== bx) return ax - bx;
        return ay - by;
      });
    } else if (mode === 'rightLeft') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ax !== bx) return bx - ax;
        return ay - by;
      });
    } else if (mode === 'snakeRow') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ay !== by) return ay - by;
        const parity = Math.abs(ay - minCy) & 1;
        return parity === 0 ? (ax - bx) : (bx - ax);
      });
    } else if (mode === 'snakeCol') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        if (ax !== bx) return ax - bx;
        const parity = Math.abs(ax - minCx) & 1;
        return parity === 0 ? (ay - by) : (by - ay);
      });
    } else if (mode === 'diagDown') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        const sa = ax + ay;
        const sb = bx + by;
        if (sa !== sb) return sa - sb;
        return ax - bx;
      });
    } else if (mode === 'diagUp') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        const da = ax - ay;
        const db = bx - by;
        if (da !== db) return da - db;
        return ax - bx;
      });
    } else if (mode === 'centerOut' || mode === 'edgesIn') {
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0, ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0, by = Number(bp[1]) || 0;
        const tileCenterX = (ax + 0.5) * tDim;
        const tileCenterY = (ay + 0.5) * tDim;
        const tileCenterXb = (bx + 0.5) * tDim;
        const tileCenterYb = (by + 0.5) * tDim;
        const da = (tileCenterX - centerPx) * (tileCenterX - centerPx) + (tileCenterY - centerPy) * (tileCenterY - centerPy);
        const db = (tileCenterXb - centerPx) * (tileCenterXb - centerPx) + (tileCenterYb - centerPy) * (tileCenterYb - centerPy);
        if (da !== db) return mode === 'centerOut' ? da - db : db - da;
        if (ay !== by) return ay - by;
        return ax - bx;
      });
    } else if (mode === 'diagDownRight') {
      const wCells = Math.max(1, Math.floor(tDim / dMult));
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0;
        const ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0;
        const by = Number(bp[1]) || 0;
        const x1 = Math.floor(ax / dMult);
        const y1 = Math.floor(ay / dMult);
        const x2 = Math.floor(bx / dMult);
        const y2 = Math.floor(by / dMult);
        const s1 = (wCells - 1 - x1) + y1;
        const s2 = (wCells - 1 - x2) + y2;
        if (s1 !== s2) return s1 - s2;
        return x2 - x1;
      });
    } else if (mode === 'diagUpRight') {
      const wCells = Math.max(1, Math.floor(tDim / dMult));
      items.sort((a, b) => {
        const ap = a[0].split(',');
        const bp = b[0].split(',');
        const ax = Number(ap[0]) || 0;
        const ay = Number(ap[1]) || 0;
        const bx = Number(bp[0]) || 0;
        const by = Number(bp[1]) || 0;
        const x1 = Math.floor(ax / dMult);
        const y1 = Math.floor(ay / dMult);
        const x2 = Math.floor(bx / dMult);
        const y2 = Math.floor(by / dMult);
        const d1 = (wCells - 1 - x1) - y1;
        const d2 = (wCells - 1 - x2) - y2;
        if (d1 !== d2) return d1 - d2;
        return x2 - x1;
      });
    } else {
      shuffle(items);
    }
    const tilePixLists: Array<{ cx: number; cy: number; pixels: Array<[number, number, number]> }> = [];
    for (const [k, colorMap] of items) {
      const parts = String(k).split(',');
      const cx = Number(parts[0]) || 0;
      const cy = Number(parts[1]) || 0;
      const pixels: Array<[number, number, number]> = [];
      const entries: Array<[number, Array<[number, number]>]> = [];
      for (const ent of colorMap) entries.push(ent);
      try {
        if (allowedSet && allowedSet.size) {
          const filtered = entries.filter(e => allowedSet!.has(e[0]));
          entries.length = 0; for (const e of filtered) entries.push(e);
        }
      } catch {}
      if (!multi && onlySel && selIdx != null) {
        const filtered = entries.filter(e => e[0] === selIdx);
        entries.length = 0; for (const e of filtered) entries.push(e);
      }
      if (!multi && globalPick != null) {
        const filtered2 = entries.filter(e => e[0] === globalPick);
        entries.length = 0; for (const e of filtered2) entries.push(e);
      }
      const merged: Array<[number, number, number]> = [];
      for (const [masterIdx, arr] of entries) {
        const btnId = mapMasterIndexToButton(masterIdx);
        if (btnId == null || btnId < 0) continue;
        for (const p of arr) merged.push([p[0], p[1], btnId]);
      }
      if (mode === 'topDown') {
        merged.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
      } else if (mode === 'bottomUp') {
        merged.sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
      } else if (mode === 'leftRight') {
        merged.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
      } else if (mode === 'rightLeft') {
        merged.sort((a, b) => (b[0] - a[0]) || (a[1] - b[1]));
      } else if (mode === 'snakeRow') {
        merged.sort((a, b) => {
          const r1 = Math.floor(a[1] / dMult);
          const r2 = Math.floor(b[1] / dMult);
          if (r1 !== r2) return r1 - r2;
          const parity = r1 & 1;
          return parity === 0 ? (a[0] - b[0]) : (b[0] - a[0]);
        });
      } else if (mode === 'snakeCol') {
        merged.sort((a, b) => {
          const c1 = Math.floor(a[0] / dMult);
          const c2 = Math.floor(b[0] / dMult);
          if (c1 !== c2) return c1 - c2;
          const parity = c1 & 1;
          return parity === 0 ? (a[1] - b[1]) : (b[1] - a[1]);
        });
      } else if (mode === 'diagDown') {
        merged.sort((a, b) => {
          const x1 = Math.floor(a[0] / dMult), y1 = Math.floor(a[1] / dMult);
          const x2 = Math.floor(b[0] / dMult), y2 = Math.floor(b[1] / dMult);
          const s1 = x1 + y1, s2 = x2 + y2;
          if (s1 !== s2) return s1 - s2;
          return x1 - x2;
        });
      } else if (mode === 'diagUp') {
        merged.sort((a, b) => {
          const x1 = Math.floor(a[0] / dMult), y1 = Math.floor(a[1] / dMult);
          const x2 = Math.floor(b[0] / dMult), y2 = Math.floor(b[1] / dMult);
          const d1 = x1 - y1, d2 = x2 - y2;
          if (d1 !== d2) return d1 - d2;
          return x1 - x2;
        });
      } else if (mode === 'diagDownRight') {
        const wCells = Math.max(1, Math.floor(tDim / dMult));
        merged.sort((a, b) => {
          const x1 = Math.floor(a[0] / dMult), y1 = Math.floor(a[1] / dMult);
          const x2 = Math.floor(b[0] / dMult), y2 = Math.floor(b[1] / dMult);
          const s1 = (wCells - 1 - x1) + y1;
          const s2 = (wCells - 1 - x2) + y2;
          if (s1 !== s2) return s1 - s2;
          return x2 - x1;
        });
      } else if (mode === 'diagUpRight') {
        const wCells = Math.max(1, Math.floor(tDim / dMult));
        merged.sort((a, b) => {
          const x1 = Math.floor(a[0] / dMult), y1 = Math.floor(a[1] / dMult);
          const x2 = Math.floor(b[0] / dMult), y2 = Math.floor(b[1] / dMult);
          const d1 = (wCells - 1 - x1) - y1;
          const d2 = (wCells - 1 - x2) - y2;
          if (d1 !== d2) return d1 - d2;
          return x2 - x1;
        });
      } else if (mode === 'centerOut' || mode === 'edgesIn') {
        merged.sort((a, b) => {
          const dx1 = a[0] - centerPx;
          const dy1 = a[1] - centerPy;
          const dx2 = b[0] - centerPx;
          const dy2 = b[1] - centerPy;
          const d1 = dx1 * dx1 + dy1 * dy1;
          const d2 = dx2 * dx2 + dy2 * dy2;
          if (d1 !== d2) {
            return mode === 'centerOut' ? d1 - d2 : d2 - d1;
          }
          return mode === 'centerOut' ? (a[0] - b[0] || a[1] - b[1]) : (b[0] - a[0] || b[1] - a[1]);
        });
      } else {
        shuffle(merged);
      }
      for (const p of merged) {
        const x = Math.max(0, Math.round(p[0] / dMult));
        const y = Math.max(0, Math.round(p[1] / dMult));
        pixels.push([x, y, p[2]]);
      }
      if (pixels.length) tilePixLists.push({ cx, cy, pixels });
    }
    for (const t of tilePixLists) {
      if (t.pixels.length) out.push([[t.cx, t.cy], t.pixels]);
    }
    return out;
  } catch { return []; }
}

 


async function placeAllColorsDirect(): Promise<boolean> {
  try { getStencilManager().setPendingColorIdx(null as any); } catch {}
  const chunks = collectPendingChunksMulti();
  if (!chunks.length) return false;
  if (!running || formatErrorDetected) return false;
  
  let remaining = Math.floor(Number((await fetchCharges())?.count) || 0);
  let placed = false;
  let cyclePlaced = 0;
  
  for (let gi = 0; gi < chunks.length && running; gi++) {
    if (!running || formatErrorDetected) break;
    
    const group = chunks[gi];
    let idx = 0;
    
    while (idx < group[1].length && running) {
      if (!running || formatErrorDetected) break;
      
      if (remaining <= 0) {
        break;
      }
      
      const cfg = getAutoConfig();
      const batchLimit = Math.max(0, Number((cfg as any)?.bmBatchLimit || 0));
      if (batchLimit > 0 && cyclePlaced >= batchLimit) return true;
      const cap = batchLimit > 0 ? Math.max(1, batchLimit - cyclePlaced) : (group[1].length - idx);
      const take = Math.min(remaining, cap, group[1].length - idx);
      if (take <= 0) return true;
      const coordsFlat: number[] = [];
      const colorsArr: number[] = [];
      const sendBatch: SendEffectColor[] = [];
      
      for (let k = 0; k < take; k++) {
        const p = group[1][idx + k];
        coordsFlat.push(p[0], p[1]);
        colorsArr.push(p[2]);
        const color = getButtonColor(p[2]);
        if (color) sendBatch.push(color);
      }
      
      let result: any = null;
      let status = 0;
      try {
        result = await securePlace(group[0][0], group[0][1], coordsFlat, colorsArr, 20000);
        status = Number((result as any)?.status || 0);
      } catch { status = 0; }
      if (!running || formatErrorDetected) break;
      if (status === 0) {
        try { result = await securePlace(group[0][0], group[0][1], coordsFlat, colorsArr, 20000); status = Number((result as any)?.status || 0); } catch {}
      }
      if (!running || formatErrorDetected) break;
      if (status === 429) {
        return placed;
      }
      if (status === 451) {
        const now = Date.now();
        legalBlockUntil = Math.max(legalBlockUntil, now + legalBlockCooldownMs);
        if (now >= legalNoticeCooldownUntil) {
          legalNoticeCooldownUntil = now + 60000;
          try { showCenterNotice(`${t('automode.legalBlock.title')}` + '\n' + t('automode.legalBlock.body'), 4000); } catch {}
          try { window.postMessage({ source: 'wplace-svelte', action: 'auto:legalBlock', until: legalBlockUntil }, '*'); } catch {}
        }
        return placed;
      }

      if (status >= 200 && status < 300) {
        const cfgNow = getAutoConfig() as any;
        if (cfgNow?.sendEffectEnabled && sendBatch.length) {
          playSendOrbitalEffect(sendBatch);
        }
        try {
          let got: any = null;
          for (let tr = 0; tr < 3; tr++) {
            const fc = await fetchCharges();
            if (fc && Number.isFinite(fc.count)) { got = fc; break; }
            await new Promise(r => setTimeout(r, 300 + tr * 200));
          }
          if (got) {
            remaining = Math.floor(Number(got.count) || 0);
            try { window.postMessage({ source: 'wplace-svelte', action: 'charges:update', charges: { count: Math.floor(Number(got.count)||0), max: Math.floor(Number(got.max)||0) } }, '*'); } catch {}
          }
          else { remaining -= take; }
        } catch {
          remaining -= take;
        }
        
        idx += take;
        placed = true;
        cyclePlaced += take;
        
        sendChannel({ action: 'reloadTiles' });
        
        try {
          const bl = Math.max(0, Number(cfgNow?.bmBatchLimit || 0));
          if (bl > 0 && cyclePlaced >= bl) {
            return true;
          }
        } catch {}
      } else {
        idx += take;
      }
    }
  }
  return placed;
}
let running = false;
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
    formatErrorDetected = false;
    try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
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
    
    running = true;
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
  formatErrorDetected = false;
  
  try { getStencilManager().setAutoSelectedMasterIdx(null as any); } catch {}
  
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

 



type ColorButton = { id: number; rgb: [number, number, number]; paid: boolean; label?: string };
let colorButtons: ColorButton[] | null = null;
let masterToButton: (number | null)[] | null = null;    

const buttonCache = new Map<string, number>();
const buttonRgbCache = new Map<number, SendEffectColor>();

let lastAutoBuyKind = '';
let lastAutoBuyTs = 0;
let autoBuyInFlight = false;
const autoBuyCooldownMs = 60000;
const legalBlockCooldownMs = 5 * 60 * 1000;
let legalBlockUntil = 0;
let legalNoticeCooldownUntil = 0;
let sentAfterComplete = false;
let selectedButtonId: number | null = null;

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, Number(ms) || 0)));
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
  try { await sleepInterruptible(waitMs); } catch { await sleep(waitMs); }
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

async function maybeAutoBuy(profile: any): Promise<any> {
  try {
    if (autoBuyInFlight) return null;
    const cfg = getAutoConfig();
    if (!cfg?.autoBuyPlus30 && !cfg?.autoBuyPlus5Max) return null;
    const dropletsRaw = profile && profile.droplets;
    const droplets = Number(dropletsRaw || 0);
    if (!Number.isFinite(droplets) || droplets <= 500) return null;
    let kind = '';
    let productId = 0;
    if (cfg.autoBuyPlus30) {
      kind = 'plus30';
      productId = 80;
    } else if (cfg.autoBuyPlus5Max) {
      kind = 'plus5';
      productId = 70;
    }
    if (!kind || !productId) return null;
    if (kind === lastAutoBuyKind && (Date.now() - lastAutoBuyTs) < autoBuyCooldownMs) return null;
    autoBuyInFlight = true;
    try {
      const res = await fetch('https://backend.wplace.live/purchase', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ product: { id: productId, amount: 1 } })
      });
      const raw = res ? await res.text() : '';
      let payload: any = null;
      if (raw) {
        try { payload = JSON.parse(raw); } catch {}
      }
      const success = res && res.ok && !(payload && (payload.error || payload.success === false || payload.status === 'error'));
      if (success) {
        lastAutoBuyKind = kind;
        lastAutoBuyTs = Date.now();
        const message = kind === 'plus30' ? t('settings.autobuy.toast.plus30') : t('settings.autobuy.toast.plus5');
        try { window.postMessage({ source: 'wplace-svelte', action: 'autobuy:success', message, kind }, '*'); } catch {}
        try {
          const confirm = await fetch('https://backend.wplace.live/me', { credentials: 'include' });
          if (confirm && confirm.ok) {
            return await confirm.json();
          }
        } catch {}
      } else {
        lastAutoBuyTs = Date.now();
        const errors: string[] = [];
        if (payload) {
          const errFields = [payload.error, payload.message, payload.reason, payload.detail, payload.statusText];
          errFields.forEach((val) => {
            if (typeof val === 'string') {
              const trimmed = val.trim();
              if (trimmed && !errors.includes(trimmed)) errors.push(trimmed);
            }
          });
          if (Array.isArray(payload.errors)) {
            payload.errors.forEach((val: any) => {
              if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed && !errors.includes(trimmed)) errors.push(trimmed);
              }
              if (val && typeof val.message === 'string') {
                const trimmed = val.message.trim();
                if (trimmed && !errors.includes(trimmed)) errors.push(trimmed);
              }
            });
          }
        }
        const errMsg = errors.length ? errors.join('\n') : t('settings.autobuy.toast.error');
        try { window.postMessage({ source: 'wplace-svelte', action: 'autobuy:error', message: errMsg, kind, payload }, '*'); } catch {}
      }
    } finally {
      autoBuyInFlight = false;
    }
  } catch {
    autoBuyInFlight = false;
    try { window.postMessage({ source: 'wplace-svelte', action: 'autobuy:error', message: t('settings.autobuy.toast.error') }, '*'); } catch {}
  }
  return null;
}

async function fetchCharges(): Promise<{ count: number; max: number; rechargeTime: number } | null> {
  try {
    const res = await fetch('https://backend.wplace.live/me', { credentials: 'include' });
    if (!res.ok) return null;
    let data = await res.json();
    const updated = await maybeAutoBuy(data);
    if (updated) data = updated;
    const c = (data && data.charges) || {};
    return { count: Math.floor(Number(c.count) || 0), max: Math.floor(Number(c.max) || 0), rechargeTime: Math.floor(Number(c.rechargeTime) || 0) };
  } catch { return null; }
}

 

async function requestColorButtons(timeoutMs = 800): Promise<ColorButton[]> {
  async function once(): Promise<ColorButton[]> {
    return new Promise((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const onMsg = (ev: MessageEvent) => {
        const data = readChannelPayload(ev) as any;
        if (!data) return;
        if (data.action === 'colorButtons' && data.reqId === reqId) {
          window.removeEventListener('message', onMsg);
          const arr = Array.isArray(data.buttons) ? data.buttons : [];
          try { log('auto', 'colors:recv', arr.length); } catch {}
          resolve(arr);
        }
      };
      window.addEventListener('message', onMsg);
      sendChannel({ action: 'queryColors', reqId });
      setTimeout(() => { window.removeEventListener('message', onMsg); resolve([]); }, timeoutMs);
    });
  }
  let res = await once();
  if (!res || res.length === 0) {
    sendChannel({ action: 'bm:triggerPaint' });
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
  try {
    await ensureColorMap();
    let nextCycleAt = 0;
    while (running) {
      if (!running) break;
      
      try {
        const nowGate = Date.now();
        if (nowGate < nextCycleAt) {
          const toWait = Math.max(0, nextCycleAt - nowGate);
          const cont = await sleepInterruptible(toWait);
          if (!cont || !running) break;
        }
      } catch {}

      try {
        const nowLegal = Date.now();
        if (nowLegal < legalBlockUntil) {
          const waitLegal = Math.max(1000, legalBlockUntil - nowLegal);
          nextCycleAt = Math.max(nextCycleAt, nowLegal + waitLegal);
          const contLegal = await sleepInterruptible(waitLegal);
          if (!contLegal || !running) break;
          continue;
        }
      } catch {}
      
      try {
        if (isPaintOutDetected()) {
          try { sendChannel({ action: 'autoPaintCycleStart' }); } catch {}
          try { sendChannel({ action: 'autoPaintCycleEnd' }); } catch {}
          await onPaintOutWait();
          continue;
        }
      } catch {}
      
      const chunks = collectPendingChunksMulti();
      if (chunks && chunks.length > 0) sentAfterComplete = false;

  if (!chunks || chunks.length === 0) {
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
    const continued = await sleepInterruptible(waitMs);
    if (!continued || !running) break;
    continue;
  }
  
  if (!running) break;
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
  try {
    if (enhancedOverlayResetNeeded) {
      enhancedOverlayResetNeeded = false;
      try { sendChannel({ action: 'reloadTiles' }); } catch {}
      await sleep(160);
    }
  } catch {}
  await placeViaUiLegacy();
  if (!running) break;
  
  try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
  
  const cfg = getAutoConfig();
  const secSeries = Number((cfg as any)?.seriesWaitSec);
  const baseMs = Math.max(1000, Number.isFinite(secSeries) ? Math.round(secSeries * 1000) : 90000);
  const rmax = Math.max(0, Number((cfg as any)?.randomExtraWaitMaxSec || 0));
  const rndSec = rmax > 0 ? (1 + Math.floor(Math.random() * Math.max(1, rmax))) : 0;
  const waitMs = baseMs + rndSec * 1000;
  nextCycleAt = Date.now() + waitMs;
  const continued = await sleepInterruptible(waitMs);
  if (!continued || !running) break;
    }
  } catch {}
}

async function placeViaUiLegacy(): Promise<boolean> {
  try {
    const sm = getStencilManager();
    try { log('auto', 'legacy:start'); } catch {}
    if (!sm.enhanced) { try { log('auto', 'legacy:enhanced=false'); } catch {} return false; }
    if (!hasStream()) { try { log('auto', 'legacy:stream=false'); } catch {} return false; }
    const ok = await ensureVideo();
    try { log('auto', 'legacy:ensureVideo', ok); } catch {}
    if (!ok) { try { log('auto', 'legacy:videoFailed'); } catch {} return false; }
    await ensureColorMap();
    try {
      sendChannel({ action: 'reloadTiles' });
      const cfgT0 = Number((getAutoConfig() as any)?.tileUpdatedTimeoutSec);
      const tMs0 = Number.isFinite(cfgT0) ? Math.round(cfgT0 * 1000) : 3000;
      const total0 = Math.min(12000, Math.max(800, tMs0 + 800));
      await waitForFirstTileTwice(total0);
    } catch {}
    try { if (isPaintOutDetected()) { await onPaintOutWait(); return true; } } catch {}
    const counts = (sm as any).getRemainingCountsTotal?.() as number[] | undefined;
    try { log('auto', 'legacy:counts', Array.isArray(counts) ? counts.length : -1); } catch {}
    const allowed = getAutoAllowedMasters();
    let bestIdx = -1, bestC = -1;
    const allowedSet = new Set((allowed || []).map(n => Number(n)));
    if (Array.isArray(counts) && counts.length) {
      for (let i = 0; i < counts.length; i++) {
        if (allowedSet.size && !allowedSet.has(i)) continue;
        const btnTest = mapMasterIndexToButton(i);
        if (btnTest == null) continue;
        const c = counts[i] | 0;
        if (c > bestC) { bestC = c; bestIdx = i; }
      }
    }
    try { log('auto', 'legacy:bestIdx', bestIdx, bestC); } catch {}
    if (bestIdx < 0) { try { log('auto', 'legacy:noBestIdx'); } catch {} return false; }
    const btnId = mapMasterIndexToButton(bestIdx);
    try { log('auto', 'legacy:btnId', btnId); } catch {}
    if (btnId == null || btnId < 0) { try { log('auto', 'legacy:noBtnId'); } catch {} return false; }
    const editOk = await ensureEditingMode();
    try { log('auto', 'legacy:editOk', editOk); } catch {}
    if (!editOk) { try { log('auto', 'legacy:editFailed'); } catch {} return false; }
    try { sm.setAutoSelectedMasterIdx(null as any); } catch {}
    await sleep(160);
    try { log('auto', 'legacy:selectColor', btnId); } catch {}
    await selectColor(btnId);
    try { sm.setAutoSelectedMasterIdx(bestIdx as any); } catch {}
    try {
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
    const snap = captureScreenSnapshot();
    if (!snap) { try { log('auto', 'legacy:noSnapshot'); } catch {} return false; }
    const vw = snap.width, vh = snap.height;
    try { log('auto', 'legacy:snapshot', vw, vh); } catch {}
    if (vw < 2 || vh < 2) { try { log('auto', 'legacy:badDims'); } catch {} return false; }
    const cfg = getAutoConfig();
    const step = 2;
    const data = snap.data.data;
    const thresh = Number((cfg as any)?.enhancedThresh) | 0;
    const threshSq = thresh * thresh;
    const exactMode = thresh <= 1;
    const threshSqEff = exactMode ? 0 : threshSq;
    const matchRGB: [number, number, number] = [0, 0, 240];
    const minDist = Math.max(0, Number((cfg as any)?.minDist) | 0);
    const cell = Math.max(1, minDist);
    const grid = new Map<string, Array<[number, number]>>();
    const keyOf = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const ys: number[] = []; const xs: number[] = [];
    const yStart = Math.floor(Math.random() * step);
    const xStart = Math.floor(Math.random() * step);
    for (let y = yStart; y < vh; y += step) ys.push(y);
    for (let x = xStart; x < vw; x += step) xs.push(x);
    for (let i = ys.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = ys[i]; ys[i] = ys[j]; ys[j] = t; }
    for (let i = xs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = xs[i]; xs[i] = xs[j]; xs[j] = t; }
    const targets: Array<[number, number]> = [];
    for (let yi = 0; yi < ys.length; yi++) {
      if (!running) break;
      const y = ys[yi];
      const row = y * vw * 4;
      for (let xi = 0; xi < xs.length; xi++) {
        if (!running) break;
        const x = xs[xi];
        const i = row + x * 4;
        const a = data[i + 3];
        if (a < 200) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dr = r - matchRGB[0], dg = g - matchRGB[1], db = b - matchRGB[2];
        const d = dr*dr + dg*dg + db*db;
        if (d > threshSqEff) continue;
        let agree = 0, total = 0;
        const offs = [ [0,0], [1,0], [-1,0], [0,1], [0,-1] ];
        for (let oi = 0; oi < offs.length; oi++) {
          const nx = x + (offs as any)[oi][0];
          const ny = y + (offs as any)[oi][1];
          if (nx < 0 || ny < 0 || nx >= vw || ny >= vh) continue;
          const ni = (ny * vw + nx) * 4;
          const na = data[ni + 3];
          if (na < 200) continue;
          const nr = data[ni], ng = data[ni + 1], nb = data[ni + 2];
          const dr2 = nr - matchRGB[0], dg2 = ng - matchRGB[1], db2 = nb - matchRGB[2];
          const dd = dr2*dr2 + dg2*dg2 + db2*db2;
          total++;
          if (dd <= threshSqEff) agree++;
        }
        const neighborsOk = agree >= 3;
        if (!neighborsOk) continue;
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
              if (aa < 200) continue;
              const dr3 = data[ii] - matchRGB[0];
              const dg3 = data[ii + 1] - matchRGB[1];
              const db3 = data[ii + 2] - matchRGB[2];
              const dd3 = dr3*dr3 + dg3*dg3 + db3*db3;
              if (dd3 <= threshSqEff) { sumX += nx; sumY += ny; cnt++; }
            }
          }
          if (cnt > 0) { rx = sumX / cnt; ry = sumY / cnt; }
        } catch {}
        const pt = snapshotToClient(snap as any, rx, ry);
        if (!pt) continue;
        const [cx, cy] = pt;
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
          targets.push([cx, cy]);
          if (minDist > 0) {
            const k = keyOf(cx, cy);
            const arr = grid.get(k);
            if (arr) arr.push([cx, cy]); else grid.set(k, [[cx, cy]]);
          }
        }
      }
    }
    if (!targets.length) return false;
    try { log('auto', 'legacy:targets', targets.length); } catch {}
    try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleStart' }, '*'); } catch {}
    const list = targets.slice();
    const cfg2 = getAutoConfig();
    const batchLimit = Math.max(0, Number((cfg2 as any)?.bmBatchLimit) | 0);
    const effectOn = !!(cfg2 as any)?.sendEffectEnabled;
    const effectBatch: SendEffectColor[] = [];
    let clicked = 0;
    let sentBatch = false;
    for (let i = 0; i < list.length && running; i++) {
      const [cx, cy] = list[i];
      try {
        if (isPaintOutDetected()) {
          await onPaintOutWait();
          if (effectOn && effectBatch.length) { try { playSendOrbitalEffect(effectBatch.slice()); } catch {} }
          sentBatch = true;
          break;
        }
      } catch {}
      try { log('auto', 'legacy:click', i, Math.round(cx), Math.round(cy)); } catch {}
      showClickMarker(cx, cy);
      try { sendChannel({ action: 'pageClick', x: Math.round(cx), y: Math.round(cy) }); } catch {}
      clicked++;
      if (effectOn) { const sid = (selectedButtonId != null) ? selectedButtonId : btnId; const c = getButtonColor(sid); if (c) effectBatch.push(c); }
      await sleep(Math.max(0, Number((cfg2 as any)?.interClickDelayMs) | 0));
      if (batchLimit > 0 && (clicked % batchLimit) === 0 && running) {
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
        try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
        if (effectOn && effectBatch.length) { try { playSendOrbitalEffect(effectBatch.slice()); } catch {} }
        effectBatch.length = 0;
        sentBatch = true;
      }
    }
    if (running && !sentBatch) {
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
      try { window.postMessage({ source: 'wplace-svelte', action: 'autoPaintCycleEnd' }, '*'); } catch {}
      if (effectOn && effectBatch.length) { try { playSendOrbitalEffect(effectBatch.slice()); } catch {} }
      effectBatch.length = 0;
    }
    return true;
  } catch { return false; }
}
