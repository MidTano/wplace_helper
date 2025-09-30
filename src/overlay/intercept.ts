import { setOriginCoords, rebuildStencilFromState, isMoveMode, setMoveMode } from './state';
import { getStencilManager } from '../template/stencilManager';

function canonicalizeTileUrl(url: string): string | null {
  try {
    const u = new URL(url, location.href);
    
    const parts = u.pathname.split('/').filter(Boolean);
    const tilesIdx = parts.findIndex(p => p === 'tiles');
    if (tilesIdx === -1 || tilesIdx + 2 >= parts.length) return null;
    let i = 0;
    const segs: string[] = [];
    
    if (parts[0] === 'files' && /^s\d+$/i.test(parts[1] || '')) {
      segs.push('files', parts[1]);
      i = 2;
    } else if (/^s\d+$/i.test(parts[0] || '')) {
      segs.push('files', parts[0]);
      i = 1;
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
    const fetchedBlobQueue = new Map();
    let __bm_interceptActive = false;
    let __bm_cachedContext: any = null;
    let __bm_ctxTs = 0;
    let __bm_pendingIntercept: any = null;
    

    
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
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
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
      const data = event?.data;
      if (!data || data.source !== 'wplace-svelte') return;
      
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
        try { window.postMessage({ source: 'wplace-svelte', action: 'bm:interceptArmed' }, '*'); } catch {}
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
              const ok = await waitForEditUI(2000);
            } else {
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
                try { window.postMessage({ source: 'wplace-svelte', action: 'pageClick', x: center.x, y: center.y }, '*'); } catch {}
                await new Promise(r => setTimeout(r, 200));
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
      if (data.action === 'bm:place' && data && typeof data.chunkX === 'number' && typeof data.chunkY === 'number' && Array.isArray(data.coords) && Array.isArray(data.colors)) {
        (async () => {
          try {
            if (!__bm_cachedContext || !__bm_ctxTs || (Date.now() - __bm_ctxTs) > 10000) {
              window.postMessage({ source: 'wplace-svelte', action: 'bm:placed', ok: false, status: 0, reason: 'noctx' }, '*');
              return;
            }
            const opts = JSON.parse(JSON.stringify(__bm_cachedContext.requestOptions || {}));
            const body = { 
              colors: data.colors.slice(), 
              coords: data.coords.slice(), 
              t: __bm_cachedContext.token 
            };
            opts.method = 'POST';
            opts.body = JSON.stringify(body);
            const url = `https://backend.wplace.live/s0/pixel/${Number(data.chunkX)||0}/${Number(data.chunkY)||0}`;
            const resp = await fetch(url, opts);
            const ok = resp && (resp.status >= 200 && resp.status < 300);
            window.postMessage({ source: 'wplace-svelte', action: 'bm:placed', ok, status: resp.status }, '*');
          } catch (e) {
            window.postMessage({ source: 'wplace-svelte', action: 'bm:placed', ok: false, status: 0 }, '*');
          }
        })();
      }
    
      if (data.action === 'pageClick' && typeof data.x === 'number' && typeof data.y === 'number') {
        const x = Number(data.x);
        const y = Number(data.y);
        try {
         
          const container = document.querySelector('div.maplibregl-canvas-container') as any;
          const canvas = document.querySelector('canvas.maplibregl-canvas') as any;
          const map = (window as any).map || (container && (container._map || container.__map)) || (canvas && (canvas._map || canvas.__map));
          if (map && typeof map.unproject === 'function' && typeof map.fire === 'function') {
            const lngLat = map.unproject([x, y]);
            const originalEvent = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
            try { Object.defineProperty(originalEvent, 'which', { get: () => 1 }); } catch {}
            map.fire('click', { type: 'click', point: { x, y }, lngLat, originalEvent });
            return;
          }
        
          const target: any = canvas || container || document.elementFromPoint(x, y) || document.body;
          const baseMouse: MouseEventInit = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };
          const basePointer: any = { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, pressure: 0 };
        
          target.dispatchEvent(new PointerEvent('pointerover', basePointer));
          target.dispatchEvent(new MouseEvent('mouseover', baseMouse));
          target.dispatchEvent(new PointerEvent('pointermove', { ...basePointer, pressure: 0 }));
          target.dispatchEvent(new MouseEvent('mousemove', baseMouse));
         
          target.dispatchEvent(new PointerEvent('pointerdown', { ...basePointer, buttons: 1, pressure: 0.5 }));
          const md = new MouseEvent('mousedown', { ...baseMouse, buttons: 1 });
          try { Object.defineProperty(md, 'which', { get: () => 1 }); } catch {}
          target.dispatchEvent(md);
          setTimeout(() => {
         
            target.dispatchEvent(new PointerEvent('pointerup', { ...basePointer, buttons: 0, pressure: 0 }));
            const mu = new MouseEvent('mouseup', { ...baseMouse, buttons: 0 });
            try { Object.defineProperty(mu, 'which', { get: () => 1 }); } catch {}
            target.dispatchEvent(mu);
            const clk = new MouseEvent('click', baseMouse);
            try { Object.defineProperty(clk, 'which', { get: () => 1 }); } catch {}
            target.dispatchEvent(clk);
            try { target.click && target.click(); } catch {}
          }, 30);
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
              const m = inline.match(/rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/);
              if (m) {
                rgb = [Number(m[1])||0, Number(m[2])||0, Number(m[3])||0];
              } else {
                const cs = getComputedStyle(btn);
                const bc = (cs.getPropertyValue('background-color') || '').toLowerCase();
                const mc = bc.match(/rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/);
                if (mc) rgb = [Number(mc[1])||0, Number(mc[2])||0, Number(mc[3])||0];
              }
              const label = btn.getAttribute('aria-label') || '';
              const paid = !!btn.querySelector('svg');
              out.push({ id: idNum, rgb, paid, label });
            } catch {}
          }
          window.postMessage({ source: 'wplace-svelte', action: 'colorButtons', reqId: data.reqId, buttons: out }, '*');
        } catch {
          window.postMessage({ source: 'wplace-svelte', action: 'colorButtons', reqId: data.reqId, buttons: [] }, '*');
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
        
        if (__bm_interceptActive && method === 'POST' && typeof url === 'string' && url.includes('/pixel/')) {
          try {
            const originalBody = JSON.parse(String(options.body || '{}'));
            const token = originalBody['t'];
            if (!token) {
              throw new Error("Could not find security token 't'");
            }
            const baseOpts = { method: 'POST', headers: options.headers || {} } as any;
            __bm_cachedContext = { token, originalBody: options.body, requestOptions: baseOpts };
            __bm_ctxTs = Date.now();
            try { (window as any).__bmRequestContext = { token, originalBody: String(options.body||''), requestOptions: baseOpts, timestamp: __bm_ctxTs }; } catch {}
            if (__bm_pendingIntercept && Array.isArray(__bm_pendingIntercept.coords) && Array.isArray(__bm_pendingIntercept.colors)) {
              const body = { colors: __bm_pendingIntercept.colors.slice(), coords: __bm_pendingIntercept.coords.slice(), t: token } as any;
              const newUrl = `https://backend.wplace.live/s0/pixel/${Number(__bm_pendingIntercept.chunkX)||0}/${Number(__bm_pendingIntercept.chunkY)||0}`;
              const newOptions = { ...options, body: JSON.stringify(body) } as any;
              __bm_interceptActive = false;
              const resp = await (originalFetch as any).call(window, newUrl, newOptions);
              try { window.postMessage({ source: 'wplace-svelte', action: 'bm:context', ok: true }, '*'); } catch {}
              try { window.postMessage({ source: 'wplace-svelte', action: 'bm:placed', ok: resp && resp.status >= 200 && resp.status < 300, status: resp.status }, '*'); } catch {}
              __bm_pendingIntercept = null;
              return resp;
            } else {
              __bm_interceptActive = false;
              try { window.postMessage({ source: 'wplace-svelte', action: 'bm:context', ok: true }, '*'); } catch {}
            }
          } catch (e) {}
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
          window.postMessage({ source: 'wplace-svelte', endpoint: String(endpoint) }, '*');
        }
       
        if (ct.includes('image/') && !String(endpoint).includes('openfreemap') && !String(endpoint).includes('maps')) {
          const blink = Date.now();
          const blob = await cloned.blob();
          return new Promise((resolve) => {
            const id = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Math.random()).slice(2);
            fetchedBlobQueue.set(id, (processed: any) => {
              resolve(new Response(processed, { headers: cloned.headers, status: cloned.status, statusText: cloned.statusText }));
            });
            window.postMessage({ source: 'wplace-svelte', endpoint: String(endpoint), blobID: id, blobData: blob, blink, status: cloned.status, ok: (cloned as any).ok === true }, '*');
          });
        }
      } catch {}
      return response;
    }
  });
}

function installPageXHRInjection() {
  inject(() => {
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
                    window.postMessage({ source: 'wplace-svelte', endpoint: urlStr, jsonData: json }, '*');
                  }
                }
              } catch {}
              
              if (/\/pixel\//i.test(urlStr)) {
                window.postMessage({ source: 'wplace-svelte', endpoint: urlStr }, '*');
              }
            } catch {}
          });
        } catch {}
        return (originalSend as any).apply(this, args);
      };
    } catch {}
  });
}

export function installInterceptors() {
  installPageFetchInjection();
  installPageXHRInjection();

  window.addEventListener('message', async (event: MessageEvent) => {
    const data = (event as any)?.data;
    if (!data || data.source !== 'wplace-svelte') return;
    try {
      if (typeof data.endpoint === 'string' && /\/pixel\//i.test(data.endpoint)) {
     
        if (isMoveMode && isMoveMode()) {
          const coords = extractTilePixelFromPixel(data.endpoint);
          if (coords) {
            setOriginCoords(coords);
            try { await rebuildStencilFromState(); } catch {}
         
            try { setMoveMode && setMoveMode(false); } catch {}
          }
        }
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


