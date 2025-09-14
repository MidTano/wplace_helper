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
    
    let __antiIdle = {
      enabled: false,
      timer: null as any,
      intervalMs: 10000,
      patched: false,
    };
    function patchVisibilityAPIs() {
      if (__antiIdle.patched) return;
      try {
        const docP = (Document.prototype as any);
        try { Object.defineProperty(docP, 'hidden', { get: () => false }); } catch {}
        try { Object.defineProperty(docP, 'visibilityState', { get: () => 'visible' }); } catch {}
        try { (Document.prototype as any).hasFocus = function() { return true; }; } catch {}
      } catch {}
      try {
        window.addEventListener('blur', () => setTimeout(() => { try { window.dispatchEvent(new Event('focus')); } catch {} }, 50), true);
        document.addEventListener('visibilitychange', () => {
          try { (document as any).visibilityState = 'visible'; (document as any).hidden = false; } catch {}
        }, true);
        window.addEventListener('pagehide', (e) => { try { (e as any).preventDefault && (e as any).preventDefault(); } catch {} }, true);
        
        try {
          const origBeacon = (navigator as any).sendBeacon ? (navigator as any).sendBeacon.bind(navigator) : null;
          (navigator as any).sendBeacon = function(url: any, data?: any) {
            try {
              const u = String(url || '');
              if (/sentry\.io/i.test(u) || /\/envelope\b/i.test(u)) return true;
            } catch {}
            return origBeacon ? origBeacon(url, data) : false;
          };
        } catch {}
        
        const origAdd = Document.prototype.addEventListener;
        (Document.prototype as any).addEventListener = function(type: any, listener: any, options: any) {
          try {
            if (String(type).toLowerCase() === 'visibilitychange' && typeof listener === 'function') {
              const wrapped = function(ev: any) {
                try { (document as any).visibilityState = 'visible'; (document as any).hidden = false; } catch {}
                try { return listener.call(this, ev); } catch {}
              };
              return (origAdd as any).call(this, type, wrapped, options);
            }
          } catch {}
          return (origAdd as any).call(this, type, listener, options);
        };
        
        try {
          Object.defineProperty(document, 'onvisibilitychange', {
            configurable: true,
            enumerable: true,
            get() { return (document as any).__wplace_vis_handler || null; },
            set(fn: any) {
              try {
                const h = (e: any) => { try { (document as any).visibilityState = 'visible'; (document as any).hidden = false; } catch {}; try { fn && fn.call(document, e); } catch {} };
                (document as any).__wplace_vis_handler = h;
                
                document.removeEventListener('visibilitychange', (document as any).__wplace_vis_handler);
                document.addEventListener('visibilitychange', h, true);
              } catch {}
            }
          } as any);
        } catch {}
      } catch {}
      __antiIdle.patched = true;
    }
    function pickRandomTarget(): Element | null {
      try {
        const candidates = Array.from(document.querySelectorAll('button, a, [role], input, textarea, select, div')) as Element[];
        const vis = candidates.filter(el => {
          const r = (el as HTMLElement).getBoundingClientRect?.();
          if (!r) return false;
          const inView = r.width > 6 && r.height > 6 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
          const cs = getComputedStyle(el as Element as HTMLElement);
          return inView && cs.visibility !== 'hidden' && cs.display !== 'none';
        });
        if (vis.length === 0) return document.body;
        return vis[Math.floor(Math.random() * vis.length)];
      } catch { return document.body; }
    }

    function startAntiIdle(ms: number) {
      try { patchVisibilityAPIs(); } catch {}
      __antiIdle.enabled = true;
      __antiIdle.intervalMs = Math.max(2000, Number(ms) || 10000);
      try { if (__antiIdle.timer) clearInterval(__antiIdle.timer); } catch {}
      
      
      __antiIdle.timer = null; 
    }
    function stopAntiIdle() {
      __antiIdle.enabled = false;
      try { if (__antiIdle.timer) clearInterval(__antiIdle.timer); } catch {}
      __antiIdle.timer = null;
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

      if (data.action === 'antiIdle:start') {
        try { startAntiIdle(Number(data.intervalMs) || 10000); } catch {}
      }
      if (data.action === 'antiIdle:stop') {
        try { stopAntiIdle(); } catch {}
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
    window.fetch = async function(...args) {
      try {
        const endpoint0: any = (args && args[0]) || '';
        const endpointStr = (endpoint0 instanceof Request) ? endpoint0.url : String(endpoint0 || '');
        if (/sentry\.io/i.test(endpointStr) || /\/envelope\b/i.test(endpointStr)) {
        
          return new Response('', { status: 204, statusText: 'No Content' });
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
            fetchedBlobQueue.set(id, (processed) => {
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
      (XMLHttpRequest.prototype as any).send = function(...args: any[]) {
        try {
          this.addEventListener('loadend', function() {
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


