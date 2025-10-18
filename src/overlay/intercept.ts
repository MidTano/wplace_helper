import { setOriginCoords, rebuildStencilFromState, isMoveMode, setMoveMode } from './state';
import { getStencilManager } from '../template/stencilManager';
import { readChannelPayload } from '../wguard/core/channel';
import { showCenterNotice } from '../ui/centerNotice';
import { t } from '../i18n';
import { markElement } from '../wguard';

function canonicalizeTileUrl(url: string): string | null {
  try {
    const u = new URL(url, location.href);
    
    const parts = u.pathname.split('/').filter(Boolean);
    const tilesIdx = parts.findIndex(p => p === 'tiles');
    if (tilesIdx === -1 || tilesIdx + 2 >= parts.length) return null;
    const segs: string[] = [];
    
    if (parts[0] === 'files' && /^s\d+$/i.test(parts[1] || '')) {
      segs.push('files', parts[1]);
    } else if (/^s\d+$/i.test(parts[0] || '')) {
      segs.push('files', parts[0]);
    }
    
    const x = parts[tilesIdx + 1];
    const y = parts[tilesIdx + 2].replace(/\.png.*/i, '');
    segs.push('tiles', x, `${y}.png`);
    const path = '/' + segs.join('/');
    return u.origin + path;
  } catch {
    return null;
  }
}

function extractTileXY(url: string): [number, number] | null {
  try {
    const u = new URL(url, location.href);
    const parts = u.pathname.split('/').filter(Boolean);
    const tilesIdx = parts.findIndex(p => p === 'tiles');
    if (tilesIdx === -1 || tilesIdx + 2 >= parts.length) return null;
    const x = Number(parts[tilesIdx + 1].replace(/\D+/g, ''));
    const y = Number(parts[tilesIdx + 2].replace(/\D+/g, ''));
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
    return null;
  } catch { return null; }
}

function extractTilePixelFromPixel(url: string): [number, number, number, number] | null {
  try {
    const u = new URL(url, location.href);
    const parts = u.pathname.split('/').filter(Boolean);
    const tileYPart = parts[parts.length - 1];
    const tileXPart = parts[parts.length - 2];
    const tileY = Number(String(tileYPart).replace(/\D+/g, ''));
    const tileX = Number(String(tileXPart).replace(/\D+/g, ''));
    const qs = new URLSearchParams(u.search);
    const xStr = qs.get('x');
    const yStr = qs.get('y');
    
    if (xStr == null || yStr == null) return null;
    const pxX = Number(xStr);
    const pxY = Number(yStr);
    if ([tileX, tileY, pxX, pxY].every(n => Number.isFinite(n))) return [tileX, tileY, pxX, pxY];
    return null;
  } catch { return null; }
}

function inject(callback: () => void) {
  const script = document.createElement('script');
  markElement(script);
  try {
    const withNonce = document.querySelector('script[nonce]') as HTMLScriptElement | null;
    const nonce = (withNonce && (withNonce.nonce || withNonce.getAttribute('nonce'))) || '';
    if (nonce) {
      
      (script as any).nonce = nonce;
      script.setAttribute('nonce', String(nonce));
    }
  } catch {}
  script.textContent = `(${callback})();`;
  document.documentElement?.appendChild(script);
  script.remove();
}

function installPageFetchInjection() {
  inject(() => {
    const LEGACY_CHANNEL_SOURCE = 'wplace-svelte';
    function readChannel(){
      try{
        const raw = sessionStorage.getItem('wguard:user-config');
        if(raw){
          const data = JSON.parse(raw);
          const ch = data && data.config && data.config.obfuscation && data.config.obfuscation.channelSource;
          if(typeof ch === 'string' && ch) return ch;
        }
      }catch{}
      return 'wguard-svelte';
    }
    const WGUARD_CHANNEL_SOURCE = readChannel();
    
    function normalizeChannelData(data: any): any {
      if (!data || typeof data !== 'object') return null;
      const source = data.source;
      if (source !== LEGACY_CHANNEL_SOURCE && source !== WGUARD_CHANNEL_SOURCE) return null;
      return { ...data, source: WGUARD_CHANNEL_SOURCE };
    }
    
    function readChannelPayload(event: any): any {
      return normalizeChannelData(event?.data);
    }
    
    function sendChannel(payload: any): void {
      try {
        window.postMessage({ ...payload, source: WGUARD_CHANNEL_SOURCE }, '*');
      } catch {}
    }
    
    const fetchedBlobQueue = new Map();
    let __bm_interceptActive = false;
    let __bm_cachedContext: any = null;
    let __bm_ctxTs = 0;
    let __bm_pendingIntercept: any = null;
    let __bm_formatValid = true;
    let __bm_ignoreProtection = false;

    function syncBypassFlag() {
      try {
        const raw = localStorage.getItem('wguard:auto-config');
        if (raw) {
          const parsed = JSON.parse(raw);
          __bm_ignoreProtection = !!parsed.wguardBypassProtection;
        }
      } catch {}
    }

    syncBypassFlag();

    function findOpenPaintButton(): HTMLButtonElement | null {
      try {
        const sel1 = 'button.btn.btn-primary.btn-lg.sm\\:btn-xl.relative.z-30';
        let btn = document.querySelector(sel1) as HTMLButtonElement | null;
        if (btn && !btn.disabled) return btn;
        const sel2 = 'div.absolute.bottom-3.left-1\\/2.z-30.-translate-x-1\\/2 > button.btn.btn-primary';
        btn = document.querySelector(sel2) as HTMLButtonElement | null;
        if (btn && !btn.disabled) return btn;
        const list = Array.from(document.querySelectorAll('button.btn.btn-primary')) as HTMLButtonElement[];
        for (const b of list) {
          const txt = (b.textContent || '').toLowerCase();
          if (!b.disabled && txt.includes('paint')) return b;
        }
      } catch {}
      return null;
    }
    function isEditModeOpen(): boolean {
      try {
        const el1 = document.querySelector('div.tooltip[data-tip="Transparent"] button#color-0') as HTMLButtonElement | null;
        if (el1) return true;
        const el2 = document.querySelector('button#color-0[aria-label="Transparent"]') as HTMLButtonElement | null;
        if (el2) return true;
      } catch {}
      return false;
    }
    function findConfirmButton(): HTMLButtonElement | null {
      try {
        const dialog = document.querySelector('div[role="dialog"]') as HTMLElement | null;
        if (dialog) {
          const btn = dialog.querySelector('button.btn.btn-primary:not([disabled])') as HTMLButtonElement | null;
          if (btn) return btn;
        }
        const modal = document.querySelector('.relative.px-3') as HTMLElement | null;
        if (modal) {
          const btn2 = modal.querySelector('button.btn.btn-primary:not([disabled])') as HTMLButtonElement | null;
          if (btn2) return btn2;
        }
      } catch {}
      return null;
    }
    function getCanvasCenter(): { x: number; y: number } | null {
      try {
        const canvas = document.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement | null;
        if (!canvas) return null;
        const r = canvas.getBoundingClientRect();
        const randX = r.left + Math.random() * Math.max(r.width, 1);
        const randY = r.top + Math.random() * Math.max(r.height, 1);
        return { x: Math.round(randX), y: Math.round(randY) };
      } catch { return null; }
    }
    async function waitForEditUI(timeoutMs = 2000): Promise<boolean> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (isEditModeOpen()) return true;
        await new Promise(r => setTimeout(r, 100));
      }
      return isEditModeOpen();
    }
    window.addEventListener('message', (event) => {
      const data = readChannelPayload(event);
      if (!data) return;
      if (data.action === 'bm:setBypass') {
        const flag = (data as any).enabled;
        if (flag === 'sync') {
          syncBypassFlag();
        } else {
          __bm_ignoreProtection = flag === true || flag === 'true' || flag === 1 || flag === '1';
        }
        return;
      }
      
      if (data.blobID && data.blobData && !data.endpoint) {
        const cb = fetchedBlobQueue.get(data.blobID);
        if (typeof cb === 'function') {
          try { cb(data.blobData); } catch {}
        }
      
      if (data.action === 'reloadTiles') {
        try {
          const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
          for (const img of imgs) {
            const src = img.currentSrc || img.src || '';
            if (!src) continue;
            if (!/\/(files\/s\d+\/)?tiles\//i.test(src)) continue;
            try {
              const canon = (window as any).canonicalizeTileUrl ? (window as any).canonicalizeTileUrl(src) : null;
              const ustr = canon || src;
              const u = new URL(ustr, location.href);
              u.searchParams.set('b', String(Date.now()));
              img.src = u.toString();
            } catch {}
          }
        } catch {}
      }
        fetchedBlobQueue.delete(data.blobID);
      }

      
      if (data.action === 'bm:interceptStart') {
        __bm_interceptActive = true;
        sendChannel({ action: 'bm:interceptArmed' });
      }
      if (data.action === 'bm:triggerPaint') {
        (async () => {
          try {
            await new Promise(r => setTimeout(r, 100));
            const openBtn = findOpenPaintButton();
            if (openBtn && !openBtn.disabled) {
              openBtn.focus();
              await new Promise(r => setTimeout(r, 80));
              openBtn.click();
              await new Promise(r => setTimeout(r, 120));
              await waitForEditUI(2000);
            }
          } catch {}
        })();
      }
      if (data.action === 'bm:clearContext') {
        try { __bm_cachedContext = null; } catch {}
        try { __bm_ctxTs = 0; } catch {}
        try { (window as any).__bmRequestContext = null; } catch {}
      }
      if (data.action === 'bm:placeIntercept' && data && typeof data.chunkX === 'number' && typeof data.chunkY === 'number' && Array.isArray(data.coords) && Array.isArray(data.colors)) {
        (async () => {
          try {
            __bm_interceptActive = true;
            __bm_pendingIntercept = { chunkX: Number(data.chunkX)||0, chunkY: Number(data.chunkY)||0, coords: data.coords.slice(), colors: data.colors.slice() };
            await new Promise(r => setTimeout(r, 120));
            let editOk = isEditModeOpen();
            if (!editOk) {
              const openBtn2 = findOpenPaintButton();
              if (openBtn2 && !openBtn2.disabled) {
                openBtn2.focus();
                await new Promise(r => setTimeout(r, 80));
                openBtn2.click();
                await new Promise(r => setTimeout(r, 200));
              }
              editOk = await waitForEditUI(2000);
            }
            if (editOk) {
              const center = getCanvasCenter();
              if (center) {
                sendChannel({ action: 'pageClick', x: center.x, y: center.y });
                const waitMs = 2800 + Math.random() * 800;
                await new Promise(r => setTimeout(r, waitMs));
              }
              let finalBtn = findConfirmButton();
              if (!finalBtn) { await new Promise(r => setTimeout(r, 200)); finalBtn = findConfirmButton(); }
              if (finalBtn && !finalBtn.disabled) {
                finalBtn.focus();
                await new Promise(r => setTimeout(r, 80));
                finalBtn.click();
                await new Promise(r => setTimeout(r, 120));
              } else {
              }
            } else {
            }
          } catch {}
        })();
      }
      if (data.action === 'bm:place' && typeof (data as any)?.chunkX === 'number' && typeof (data as any)?.chunkY === 'number' && Array.isArray((data as any)?.coords) && Array.isArray((data as any)?.colors)) {
        (async () => {
          try {
            if (!__bm_formatValid && !__bm_ignoreProtection) {
              sendChannel({ action: 'bm:placed', ok: false, status: 0, reason: 'format_error' });
              return;
            }
            if (!__bm_cachedContext || !__bm_ctxTs || (Date.now() - __bm_ctxTs) > 10000) {
              sendChannel({ action: 'bm:placed', ok: false, status: 0, reason: 'noctx' });
              return;
            }
            if (!__bm_cachedContext.fp) {
              sendChannel({ action: 'bm:placed', ok: false, status: 0, reason: 'no_fp' });
              return;
            }
            const opts = JSON.parse(JSON.stringify(__bm_cachedContext.requestOptions || {}));
            const coords = ((data as any).coords as unknown[]).slice();
            const colors = ((data as any).colors as unknown[]).slice();
            const body = { 
              colors,
              coords,
              fp: __bm_cachedContext.fp,
              t: __bm_cachedContext.token 
            };
            opts.method = 'POST';
            opts.body = JSON.stringify(body);
            const url = `https://backend.wplace.live/s0/pixel/${Number(data.chunkX)||0}/${Number(data.chunkY)||0}`;
            const resp = await fetch(url, opts);
            const ok = resp && (resp.status >= 200 && resp.status < 300);
            sendChannel({ action: 'bm:placed', ok, status: resp.status });
          } catch (e) {
            sendChannel({ action: 'bm:placed', ok: false, status: 0 });
          }
        })();
      }
    
      if (data.action === 'pageClick' && typeof data.x === 'number' && typeof data.y === 'number') {
        const x = Number(data.x);
        const y = Number(data.y);
        try {
          const container = document.querySelector('div.maplibregl-canvas-container') as any;
          const canvas = document.querySelector('canvas.maplibregl-canvas') as any;
          const rect = canvas && typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
          const map = (window as any).map || (container && (container._map || container.__map)) || (canvas && (canvas._map || canvas.__map));
          const target: any = canvas || container || document.elementFromPoint(x, y) || document.body;
          const dispatchKey = (type: 'keydown' | 'keyup') => {
            try {
              const evt = new KeyboardEvent(type, { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true, cancelable: true, composed: true });
              try { Object.defineProperty(evt, 'keyCode', { get: () => 32 }); } catch {}
              try { Object.defineProperty(evt, 'which', { get: () => 32 }); } catch {}
              document.dispatchEvent(evt);
            } catch {}
          };
          const pickPoint = (): { x: number; y: number } => {
            if (rect) {
              const px = rect.left + Math.random() * Math.max(rect.width, 1);
              const py = rect.top + Math.random() * Math.max(rect.height, 1);
              return { x: Math.round(px), y: Math.round(py) };
            }
            const w = Math.max(window.innerWidth || document.documentElement?.clientWidth || 0, 1);
            const h = Math.max(window.innerHeight || document.documentElement?.clientHeight || 0, 1);
            return { x: Math.round(Math.random() * (w - 1)), y: Math.round(Math.random() * (h - 1)) };
          };
          const points: { x: number; y: number }[] = [];
          points.push({ x: Math.round(x), y: Math.round(y) });
          const pointerInit = (px: number, py: number): PointerEventInit => ({ bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: px, clientY: py, pressure: 0 });
          const mouseInit = (px: number, py: number, buttons = 0): MouseEventInit => ({ bubbles: true, cancelable: true, composed: true, clientX: px, clientY: py, button: 0, buttons });
          const moveOnce = (px: number, py: number) => {
            const pointerEvent = new PointerEvent('pointermove', pointerInit(px, py));
            target.dispatchEvent(pointerEvent);
            const mouseEvent = new MouseEvent('mousemove', mouseInit(px, py));
            try { Object.defineProperty(mouseEvent, 'which', { get: () => 1 }); } catch {}
            target.dispatchEvent(mouseEvent);
            if (map && typeof map.unproject === 'function' && typeof map.fire === 'function') {
              try {
                const lngLat = map.unproject([px, py]);
                map.fire('mousemove', { type: 'mousemove', point: { x: px, y: py }, lngLat, originalEvent: mouseEvent });
              } catch {}
            }
          };
          const first = points[0];
          dispatchKey('keydown');
          target.dispatchEvent(new PointerEvent('pointerover', pointerInit(first.x, first.y)));
          target.dispatchEvent(new MouseEvent('mouseover', mouseInit(first.x, first.y)));
          moveOnce(first.x, first.y);
          const minDuration = 2600;
          const maxDuration = 3400;
          const targetDuration = minDuration + Math.random() * (maxDuration - minDuration);
          let accumulated = 0;
          while (accumulated < targetDuration) {
            const delayStep = 60 + Math.random() * 140;
            accumulated += delayStep;
            const pt = pickPoint();
            setTimeout(() => {
              moveOnce(pt.x, pt.y);
            }, accumulated);
          }
          setTimeout(() => {
            dispatchKey('keyup');
          }, accumulated + 200);
        } catch {}
      }
   
      if (data.action === 'queryColors' && data.reqId) {
        try {
          const buttons = Array.from(document.querySelectorAll('button[id^="color-"]')) as HTMLButtonElement[];
          const out: any[] = [];
          for (const btn of buttons) {
            try {
              const idStr = String(btn.id || '').replace(/[^0-9]/g, '');
              const idNum = Number(idStr) || 0;
              
              if (idNum === 0) continue;
            
              let rgb: [number, number, number] = [0,0,0];
              const inline = (btn.getAttribute('style') || '').toLowerCase();
              const re = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;
              let m = inline.match(re);
              if (!m) {
                const cs = getComputedStyle(btn);
                const bc = (cs.getPropertyValue('background') || cs.getPropertyValue('background-color') || '').toLowerCase();
                m = bc.match(re);
              }
              if (m) rgb = [Number(m[1])||0, Number(m[2])||0, Number(m[3])||0];
              const label = btn.getAttribute('aria-label') || '';
              let paid = false;
              try {
                const svgs = Array.from(btn.getElementsByTagName('svg')) as SVGElement[];
                for (const el of svgs) {
                  const cs2 = getComputedStyle(el as any);
                  const rect = (el as any).getBoundingClientRect ? (el as any).getBoundingClientRect() : { width: 0, height: 0 };
                  if (cs2 && cs2.display !== 'none' && cs2.visibility !== 'hidden' && rect.width > 0 && rect.height > 0) { paid = true; break; }
                }
              } catch {}
              out.push({ id: idNum, rgb, paid, label });
            } catch {}
          }
          try {
            const freeRgbKeys = out.filter(v => v && !v.paid && Array.isArray(v.rgb))
              .map(v => `${v.rgb[0]},${v.rgb[1]},${v.rgb[2]}`);
            (window as any).__wph_lastColorButtons = out;
            (window as any).__wph_lastFreeRgbKeys = freeRgbKeys;
            
          } catch {}
          sendChannel({ action: 'colorButtons', reqId: data.reqId, buttons: out, freeRgbKeys: (window as any).__wph_lastFreeRgbKeys || [] });
        } catch {
          sendChannel({ action: 'colorButtons', reqId: data.reqId, buttons: [] });
        }
      }
     
      if (data.action === 'selectColor' && typeof data.id === 'number') {
        try {
          const btn = document.getElementById(`color-${data.id}`) as HTMLButtonElement | null;
          if (btn) {
            const rect = btn.getBoundingClientRect();
            const x = Math.max(rect.left + 2, Math.min(rect.right - 2, rect.left + rect.width / 2));
            const y = Math.max(rect.top + 2, Math.min(rect.bottom - 2, rect.top + rect.height / 2));
            const baseMouse: MouseEventInit = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };
            const basePointer: any = { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, pressure: 0 };
            btn.dispatchEvent(new PointerEvent('pointerover', basePointer));
            btn.dispatchEvent(new MouseEvent('mouseover', baseMouse));
            btn.dispatchEvent(new PointerEvent('pointermove', { ...basePointer, pressure: 0 }));
            btn.dispatchEvent(new MouseEvent('mousemove', baseMouse));
            btn.dispatchEvent(new PointerEvent('pointerdown', { ...basePointer, buttons: 1, pressure: 0.5 }));
            const md = new MouseEvent('mousedown', { ...baseMouse, buttons: 1 });
            try { Object.defineProperty(md, 'which', { get: () => 1 }); } catch {}
            btn.dispatchEvent(md);
            setTimeout(() => {
              btn.dispatchEvent(new PointerEvent('pointerup', { ...basePointer, buttons: 0, pressure: 0 }));
              const mu = new MouseEvent('mouseup', { ...baseMouse, buttons: 0 });
              try { Object.defineProperty(mu, 'which', { get: () => 1 }); } catch {}
              btn.dispatchEvent(mu);
              const clk = new MouseEvent('click', baseMouse);
              try { Object.defineProperty(clk, 'which', { get: () => 1 }); } catch {}
              btn.dispatchEvent(clk);
              try { (btn as any).click && (btn as any).click(); } catch {}
            }, 10);
          }
        } catch {}
      }
    });

    const originalFetch = window.fetch;
    try { (window as any).__wplace_rawFetch = originalFetch; } catch {}
    window.fetch = async function(...args) {
      try {
        const endpoint0: any = (args && args[0]) || '';
        const endpointStr = (endpoint0 instanceof Request) ? endpoint0.url : String(endpoint0 || '');
        if (/sentry\.io/i.test(endpointStr) || /\/envelope\b/i.test(endpointStr)) {
        
          return new Response('', { status: 204, statusText: 'No Content' });
        }
        
        const url = args[0];
        const options = args[1] || {};
        const method = (options.method || 'GET').toUpperCase();
        
        if (__bm_interceptActive && method === 'POST' && typeof url === 'string' && /\/s0\/pixel\/[0-9]+\/[0-9]+(\b|\/|\?)/.test(url)) {
          try {
            const originalBody = JSON.parse(String(options.body || '{}'));
            const token = originalBody['t'];
            const fp = originalBody['fp'];
            const colors = originalBody['colors'];
            const coords = originalBody['coords'];
            
            if (!token || !fp || !Array.isArray(colors) || !Array.isArray(coords)) {
              __bm_formatValid = false;
              __bm_interceptActive = false;
              if (__bm_ignoreProtection) {
                try {
                  const resp = await (originalFetch as any).apply(this, args);
                  try { sendChannel({ action: 'bm:placed', ok: resp && resp.status >= 200 && resp.status < 300, status: resp?.status ?? 0, reason: 'bypass' }); } catch {}
                  return resp;
                } catch (err) {
                  try { sendChannel({ action: 'bm:placed', ok: false, status: 0, reason: 'bypass_error' }); } catch {}
                  throw err;
                }
              }
              if (__bm_pendingIntercept) {
                sendChannel({ action: 'bm:formatError', reasonCode: 'format_error', reason: 'format_error', detail: 'Invalid request format detected', endpoint: url });
              }
              try { sendChannel({ action: 'bm:placed', ok: false, status: 0, reason: 'format_error' }); } catch {}
              try {
                console.warn('[wplace-helper] blocked pixel request (invalid body)', { url, options });
              } catch {}
              return new Response('', { status: 409, statusText: 'Template mismatch' });
            }
            
            __bm_formatValid = true;
            const baseOpts = { method: 'POST', headers: options.headers || {} } as any;
            __bm_cachedContext = { token, fp, originalBody: options.body, requestOptions: baseOpts };
            __bm_ctxTs = Date.now();
            try { (window as any).__bmRequestContext = { token, fp, originalBody: String(options.body||''), requestOptions: baseOpts, timestamp: __bm_ctxTs }; } catch {}
            if (__bm_pendingIntercept && Array.isArray(__bm_pendingIntercept.coords) && Array.isArray(__bm_pendingIntercept.colors)) {
              const body = { colors: __bm_pendingIntercept.colors.slice(), coords: __bm_pendingIntercept.coords.slice(), fp: fp, t: token } as any;
              const newUrl = `https://backend.wplace.live/s0/pixel/${Number(__bm_pendingIntercept.chunkX)||0}/${Number(__bm_pendingIntercept.chunkY)||0}`;
              const newOptions = { ...options, body: JSON.stringify(body) } as any;
              __bm_interceptActive = false;
              try {
                console.log('[wplace-helper] sending intercepted pixel request', { url: newUrl, request: body });
              } catch {}
              const resp = await (originalFetch as any).call(window, newUrl, newOptions);
              try {
                console.log('[wplace-helper] intercepted pixel response', { url: newUrl, status: resp?.status });
              } catch {}
              sendChannel({ action: 'bm:context', ok: true });
              sendChannel({ action: 'bm:placed', ok: resp && resp.status >= 200 && resp.status < 300, status: resp.status });
              __bm_pendingIntercept = null;
              return resp;
            } else {
              __bm_interceptActive = false;
              sendChannel({ action: 'bm:context', ok: true });
              try {
                console.warn('[wplace-helper] blocked pixel request (no pending intercept)', { url, options });
              } catch {}
              if (__bm_ignoreProtection) {
                try {
                  const resp = await (originalFetch as any).apply(this, args);
                  try { sendChannel({ action: 'bm:placed', ok: resp && resp.status >= 200 && resp.status < 300, status: resp?.status ?? 0, reason: 'bypass' }); } catch {}
                  return resp;
                } catch (err) {
                  try { sendChannel({ action: 'bm:placed', ok: false, status: 0, reason: 'bypass_error' }); } catch {}
                  throw err;
                }
              }
              return new Response('', { status: 409, statusText: 'Template mismatch' });
            }
          } catch (e) {
            __bm_interceptActive = false;
            return (originalFetch as any).apply(this, args);
          }
        }
      } catch {}
      const response = await originalFetch.apply(this, args);
      try {
        const endpoint = ((args[0] instanceof Request) ? args[0]?.url : args[0]) || '';
        const cloned = response.clone();
        const ct = (cloned.headers?.get?.('content-type') || '').toLowerCase();
      
        try {
          const u = new URL(String(endpoint), location.href);
          const parts = u.pathname.split('/').filter(Boolean).map(s => s.toLowerCase());
          const hasMeSegment = parts.includes('me');
          if (hasMeSegment && ct.includes('json')) {
            try {
              const json = await cloned.json();
              window.postMessage({ source: 'wplace-svelte', endpoint: String(endpoint), jsonData: json }, '*');
            } catch {}
          }
        } catch {}
      
        if (/\/pixel\//i.test(String(endpoint))) {
          window.postMessage({ source: 'wplace-svelte', endpoint: endpoint }, '*');
          try { window.dispatchEvent(new CustomEvent('tutorial:map-pixel-clicked', { detail: { endpoint: endpoint } })); } catch {}
        }
       
        if (ct.includes('image/') && !String(endpoint).includes('openfreemap') && !String(endpoint).includes('maps')) {
          const blink = Date.now();
          const blob = await cloned.blob();
          return new Promise((resolve) => {
            const id = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Math.random()).slice(2);
            fetchedBlobQueue.set(id, (processed: any) => {
              resolve(new Response(processed, { headers: cloned.headers, status: cloned.status, statusText: cloned.statusText }));
            });
            sendChannel({ endpoint: String(endpoint), blobID: id, blobData: blob, blink, status: cloned.status, ok: (cloned as any).ok === true });
          });
        }
      } catch {}
      return response;
    }
  });
}

function installPageXHRInjection() {
  inject(() => {
    function readChannel(){
      try{
        const raw = sessionStorage.getItem('wguard:user-config');
        if(raw){
          const data = JSON.parse(raw);
          const ch = data && data.config && data.config.obfuscation && data.config.obfuscation.channelSource;
          if(typeof ch === 'string' && ch) return ch;
        }
      }catch{}
      return 'wguard-svelte';
    }
    const WGUARD_CHANNEL_SOURCE = readChannel();
    
    function sendChannel(payload: any): void {
      try {
        window.postMessage({ ...payload, source: WGUARD_CHANNEL_SOURCE }, '*');
      } catch {}
    }
    
    try {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      (XMLHttpRequest.prototype as any).open = function(...args: any[]) {
        try { (this as any).__wplace_svelte_endpoint = args?.[1]; } catch {}
        return (originalOpen as any).apply(this, args);
      };
      (XMLHttpRequest.prototype as any).send = function(this: any, ...args: any[]) {
        try {
          this.addEventListener('loadend', function(this: any) {
            try {
              const endpoint = (this as any).__wplace_svelte_endpoint || '';
              const ct = String(this.getResponseHeader('content-type') || '').toLowerCase();
              const urlStr = String(endpoint);
         
              try {
                const u = new URL(urlStr, location.href);
                const parts = u.pathname.split('/').filter(Boolean).map(s => s.toLowerCase());
                if (parts.includes('me') && ct.includes('json')) {
                  let json: any = null;
                  try {
                    if ((this as XMLHttpRequest).responseType === '' || (this as XMLHttpRequest).responseType === 'text') {
                      json = JSON.parse((this as XMLHttpRequest).responseText || 'null');
                    } else {
                      json = (this as any).response;
                    }
                  } catch {}
                  if (json) {
                    sendChannel({ endpoint: urlStr, jsonData: json });
                  }
                }
              } catch {}
              
              if (/\/pixel\//i.test(urlStr)) {
                sendChannel({ endpoint: urlStr });
              }
            } catch {}
          });
        } catch {}
        return (originalSend as any).apply(this, args);
      };
    } catch {}
  });
}

let lastAlertClose: (() => void) | null = null;

export function installInterceptors() {
  installPageFetchInjection();
  installPageXHRInjection();

  window.addEventListener('message', async (event: MessageEvent) => {
    const data = readChannelPayload(event);
    if (!data) return;
    try {
      if (typeof data.endpoint === 'string' && /\/pixel\//i.test(data.endpoint)) {
        try { window.dispatchEvent(new CustomEvent('tutorial:map-pixel-clicked', { detail: { endpoint: data.endpoint } })); } catch {}

        if (isMoveMode && isMoveMode()) {
          const coords = extractTilePixelFromPixel(data.endpoint);
          if (coords) {
            setOriginCoords(coords);
            try { await rebuildStencilFromState(); } catch {}

            try { setMoveMode && setMoveMode(false); } catch {}
          }
        }
      }
      if (data.action === 'bm:formatError') {
        try {
          if (lastAlertClose) { lastAlertClose(); lastAlertClose = null; }
          const title = t('wguard.alert.title');
          const message = t('wguard.alert.message');
          const reasonCode = typeof data.reasonCode === 'string' ? data.reasonCode : (typeof data.reason === 'string' ? data.reason : 'default');
          const reasonKey = `wguard.alert.reason.${reasonCode}`;
          const reasonTextRaw = t(reasonKey);
          const reasonText = reasonTextRaw === reasonKey ? t('wguard.alert.reason.default') : reasonTextRaw;
          const endpointLine = typeof data.endpoint === 'string' ? `\n${t('wguard.alert.endpoint').replace('{url}', data.endpoint)}` : '';
          lastAlertClose = showCenterNotice(`${title}\n${message}\n${reasonText}${endpointLine}`, 6000, undefined, { delay: 2000 });
        } catch {}
      }
      if (data.blobID && data.blobData && typeof data.endpoint === 'string') {
        const canonical = canonicalizeTileUrl(data.endpoint);
        const tileXY = extractTileXY(canonical || data.endpoint);
        if (tileXY) {
          try {
            const outBlob = await getStencilManager().drawOnTile(data.blobData as Blob, tileXY);
            window.postMessage({ source: 'wplace-svelte', blobID: data.blobID, blobData: outBlob, blink: data.blink }, '*');

            try {
              const status = typeof data.status === 'number' ? Number(data.status) : undefined;
              const ok = (data.ok === true) || (typeof status === 'number' && status >= 200 && status < 300);
              if (ok) {
                window.postMessage({ source: 'wplace-svelte', action: 'tileUpdated', endpoint: canonical || data.endpoint, tileXY, status, ok }, '*');
              }
            } catch {}
          } catch {}
        }
      }
    } catch {}
  });
}


