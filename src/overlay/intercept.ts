import { setOriginCoords, rebuildStencilFromState, isMoveMode, setMoveMode } from './state';
import { getStencilManager } from '../template/stencilManager';
import { readChannelPayload } from '../wguard/core/channel';
import { showCenterNotice } from '../ui/centerNotice';
import { t } from '../i18n';
import { markElement } from '../wguard';
import { log } from './log';

try { log('int', 'loaded'); } catch {}
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
    let WGUARD_CHANNEL_SOURCE = readChannel();
    let DEFAULT_CHANNEL_SOURCE = WGUARD_CHANNEL_SOURCE;
    const ACCEPTED_CHANNEL_SOURCES = new Set([LEGACY_CHANNEL_SOURCE, WGUARD_CHANNEL_SOURCE]);
    const ORIGINAL_WINDOW_NAME = (() => {
      try { return String(window.name || ''); } catch { return ''; }
    })();

    function setActiveChannel(source: string) {
      if (typeof source === 'string' && source) {
        WGUARD_CHANNEL_SOURCE = source;
        ACCEPTED_CHANNEL_SOURCES.add(source);
      }
    }

    function restoreDefaultChannel() {
      if (typeof DEFAULT_CHANNEL_SOURCE === 'string' && DEFAULT_CHANNEL_SOURCE) {
        WGUARD_CHANNEL_SOURCE = DEFAULT_CHANNEL_SOURCE;
        ACCEPTED_CHANNEL_SOURCES.add(DEFAULT_CHANNEL_SOURCE);
      }
    }

    function normalizeChannelData(data: any): any {
      if (!data || typeof data !== 'object') return null;
      const source = data.source;
      if (!ACCEPTED_CHANNEL_SOURCES.has(source)) return null;
      return { ...data, source: WGUARD_CHANNEL_SOURCE };
    }
    function buildTemplateBody(fp: any, colors: any[], coords: any[], token?: any): any {
      const body: any = {
        colors: Array.isArray(colors) ? colors.slice() : [],
        coords: Array.isArray(coords) ? coords.slice() : [],
        fp
      };
      if (token) body.t = token;
      return body;
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
    let __bm_maskActive = false;

    let __secure_fp = '';
    function __randStr(len = 32, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
      let s = '';
      const u = (crypto && 'getRandomValues' in crypto) ? crypto.getRandomValues(new Uint32Array(len)) : null;
      for (let i = 0; i < len; i++) {
        const r = u ? u[i] % chars.length : Math.floor(Math.random() * chars.length);
        s += chars[r];
      }
      return s;
    }
    if (!__secure_fp) __secure_fp = __randStr(32);
    let __secure_token = '';
    let __secure_token_expire = 0;
    let __secure_token_lock = false;
    const __secure_token_ttl = 240000;
    let __visible_widget_id: any = null;
    function __captureTokenFromBody(body: any) {
      try {
        const o = JSON.parse(String(body || '{}'));
        const t = o && o.t;
        if (t && typeof t === 'string' && t.length > 20) {
          __secure_token = t;
          __secure_token_expire = Date.now() + __secure_token_ttl;
        }
      } catch {}
    }
    function __ensureContainer(id: string) {
      let el = document.getElementById(id);
      if (el && document.body.contains(el)) return el;
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
      return el;
    }
    async function __loadTurnstile() {
      if ((window as any).turnstile) return true;
      const exists = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
      if (!exists) {
        const script = document.createElement('script');
        (script as any).dataset.wguard = 'WGuard';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      const start = Date.now();
      while (!(window as any).turnstile && Date.now() - start < 15000) {
        await new Promise(r => setTimeout(r, 100));
      }
      return !!(window as any).turnstile;
    }
    async function __detectSitekey() {
      try {
        const n1 = document.querySelector('[data-sitekey]') as HTMLElement | null;
        if (n1) {
          const v = n1.getAttribute('data-sitekey');
          if (v && v.length > 10) return v;
        }
      } catch {}
      try {
        const el = document.querySelector('.cf-turnstile') as HTMLElement | null;
        const v = (el && (el as any).dataset && (el as any).dataset.sitekey) || '';
        if (v && v.length > 10) return v;
      } catch {}
      try {
        const metas = Array.from(document.querySelectorAll('meta[name*="turnstile"], meta[property*="turnstile"]')) as HTMLMetaElement[];
        for (const m of metas) {
          const v = m.getAttribute('content') || '';
          if (v && v.length > 10) return v;
        }
      } catch {}
      try {
        const v = (window as any).__TURNSTILE_SITEKEY;
        if (typeof v === 'string' && v.length > 10) return v;
      } catch {}
      try {
        const scripts = Array.from(document.querySelectorAll('script')) as HTMLScriptElement[];
        for (const s of scripts) {
          const content = s.textContent || s.innerHTML || '';
          const m = content.match(/(?:sitekey|data-sitekey)['"\s\[\]:=\(]*['"]?([0-9a-zA-Z_-]{20,})['"]?/i);
          if (m && m[1]) return m[1].replace(/['"]/g, '');
        }
      } catch {}
      const list = ['0x4AAAAAABpqJe8FO0N84q0F','0x4AAAAAAAJ7xjKAp6Mt_7zw','0x4AAAAAADm5QWx6Ov2LNF2g'];
      for (const v of list) if (v && v.length > 10) return v;
      return '0x4AAAAAABpqJe8FO0N84q0F';
    }
    async function __executeTurnstile(sitekey: string, action = 'paint') {
      const ok = await __loadTurnstile();
      if (!ok) return null;
      const ts: any = (window as any).turnstile;
      let token: any = null;
      try { } catch {}
      try {
        const overlay = __ensureContainer('turnstile-overlay-container');
        try {
          if (__visible_widget_id && ts && ts.remove) { ts.remove(__visible_widget_id); }
        } catch {}
        overlay.innerHTML = '';
        try { overlay.style.position = 'fixed'; } catch {}
        try { overlay.style.left = '50%'; } catch {}
        try { overlay.style.transform = 'translateX(-50%)'; } catch {}
        try { overlay.style.bottom = '124px'; } catch {}
        try { overlay.style.zIndex = '2147483646'; } catch {}
        try { overlay.style.padding = '0'; } catch {}
        try { overlay.style.background = 'transparent'; } catch {}
        try { overlay.style.border = 'none'; } catch {}
        try { overlay.style.borderRadius = '0'; } catch {}
        try { overlay.style.boxShadow = 'none'; } catch {}
        try { overlay.style.width = 'auto'; } catch {}
        try { overlay.style.height = 'auto'; } catch {}
        try { overlay.style.overflow = 'visible'; } catch {}
        try { overlay.style.pointerEvents = 'auto'; } catch {}
        let hideStyle = document.getElementById('turnstile-hide-others') as HTMLStyleElement | null;
        if (!hideStyle) {
          hideStyle = document.createElement('style');
          (hideStyle as any).dataset.wguard = 'WGuard';
          hideStyle.id = 'turnstile-hide-others';
          hideStyle.textContent = '.cf-turnstile{display:none!important;}#turnstile-overlay-container .cf-turnstile{display:block!important;}';
          try { document.head.appendChild(hideStyle); } catch {}
        }
        const panel = document.createElement('div');
        (panel as any).dataset.wguard = 'WGuard';
        try { panel.style.display = 'inline-flex'; } catch {}
        try { panel.style.alignItems = 'center'; } catch {}
        try { panel.style.justifyContent = 'center'; } catch {}
        try { panel.style.padding = '0'; } catch {}
        try { panel.style.background = 'transparent'; } catch {}
        try { panel.style.border = 'none'; } catch {}
        try { panel.style.borderRadius = '0'; } catch {}
        try { panel.style.boxShadow = 'none'; } catch {}
        try { panel.style.maxWidth = '92vw'; } catch {}
        try { panel.style.maxHeight = '60vh'; } catch {}
        try { panel.style.overflow = 'visible'; } catch {}
        overlay.appendChild(panel);

        const host2 = document.createElement('div');
        (host2 as any).dataset.wguard = 'WGuard';
        try { host2.style.width = 'auto'; } catch {}
        try { host2.style.height = 'auto'; } catch {}
        try { host2.style.minWidth = '800px'; } catch {}
        try { host2.style.minHeight = '110px'; } catch {}
        try { host2.style.maxWidth = '95vw'; } catch {}
        try { host2.style.maxHeight = '60vh'; } catch {}
        try { host2.style.boxSizing = 'border-box'; } catch {}
        try { host2.style.overflow = 'visible'; } catch {}
        try { host2.style.display = 'flex'; } catch {}
        try { host2.style.alignItems = 'center'; } catch {}
        try { host2.style.justifyContent = 'center'; } catch {}
        try { host2.style.padding = '0'; } catch {}
        try { host2.style.margin = '0'; } catch {}
        try { (host2.style as any).gap = '0'; } catch {}
        try { host2.style.lineHeight = 'normal'; } catch {}
        try { host2.style.borderRadius = '0'; } catch {}
        try { host2.style.boxShadow = 'none'; } catch {}
        try { host2.style.background = 'transparent'; } catch {}
        try { host2.style.width = '100%'; } catch {}
        panel.appendChild(host2);
        await new Promise<void>((resolve) => {
          const to = setTimeout(() => { resolve(); }, 60000);
          try {
            __visible_widget_id = (window as any).turnstile.render(host2, { sitekey, action, size: 'flexible', theme: 'auto', callback: (t: any) => { token = t; clearTimeout(to); resolve(); } });
            if (!__visible_widget_id) { clearTimeout(to); resolve(); }
          } catch { resolve(); }
        });
        try {
          if (typeof token === 'string' && token.length > 20) {
            try { if (__visible_widget_id && ts && ts.remove) { ts.remove(__visible_widget_id); } } catch {}
            try { overlay.innerHTML = ''; } catch {}
            try { overlay.style.display = 'none'; } catch {}
            try { const hs = document.getElementById('turnstile-hide-others'); if (hs && hs.parentNode) hs.parentNode.removeChild(hs); } catch {}
          } else {
            try { if (__visible_widget_id && ts && ts.remove) { ts.remove(__visible_widget_id); } } catch {}
            overlay.innerHTML = '';
            const panel2 = document.createElement('div');
            (panel2 as any).dataset.wguard = 'WGuard';
            try { panel2.style.display = 'inline-flex'; } catch {}
            try { panel2.style.alignItems = 'center'; } catch {}
            try { panel2.style.justifyContent = 'center'; } catch {}
            try { panel2.style.padding = '0'; } catch {}
            try { panel2.style.background = 'transparent'; } catch {}
            try { panel2.style.border = 'none'; } catch {}
            try { panel2.style.borderRadius = '0'; } catch {}
            try { panel2.style.boxShadow = 'none'; } catch {}
            try { panel2.style.maxWidth = '92vw'; } catch {}
            try { panel2.style.maxHeight = '60vh'; } catch {}
            try { panel2.style.overflow = 'visible'; } catch {}
            overlay.appendChild(panel2);

            const host3 = document.createElement('div');
            (host3 as any).dataset.wguard = 'WGuard';
            try { host3.style.width = 'auto'; } catch {}
            try { host3.style.height = 'auto'; } catch {}
            try { host3.style.minWidth = '800px'; } catch {}
            try { host3.style.minHeight = '110px'; } catch {}
            try { host3.style.maxWidth = '95vw'; } catch {}
            try { host3.style.maxHeight = '60vh'; } catch {}
            try { host3.style.boxSizing = 'border-box'; } catch {}
            try { host3.style.display = 'flex'; } catch {}
            try { host3.style.alignItems = 'center'; } catch {}
            try { host3.style.justifyContent = 'center'; } catch {}
            try { host3.style.padding = '0'; } catch {}
            try { host3.style.margin = '0'; } catch {}
            try { (host3.style as any).gap = '0'; } catch {}
            try { host3.style.lineHeight = 'normal'; } catch {}
            try { host3.style.borderRadius = '0'; } catch {}
            try { host3.style.boxShadow = 'none'; } catch {}
            try { host3.style.background = 'transparent'; } catch {}
            try { host3.style.width = '100%'; } catch {}
            panel2.appendChild(host3);
            await new Promise<void>((resolve) => {
              const to2 = setTimeout(() => { resolve(); }, 60000);
              try {
                __visible_widget_id = (window as any).turnstile.render(host3, { sitekey, action, size: 'flexible', theme: 'auto', callback: (t: any) => { token = t; clearTimeout(to2); resolve(); } });
                if (!__visible_widget_id) { clearTimeout(to2); resolve(); }
              } catch { resolve(); }
            });
            if (typeof token === 'string' && token.length > 20) {
              try { if (__visible_widget_id && ts && ts.remove) { ts.remove(__visible_widget_id); } } catch {}
              try { overlay.innerHTML = ''; } catch {}
              try { overlay.style.display = 'none'; } catch {}
              try { const hs2 = document.getElementById('turnstile-hide-others'); if (hs2 && hs2.parentNode) hs2.parentNode.removeChild(hs2); } catch {}
            }
          }
        } catch {}
      } catch {}
      if (typeof token === 'string' && token.length > 20) return token;
      return null;
    }
    async function __ensureToken(force = false) {
      if (!force && __secure_token && Date.now() < __secure_token_expire) return __secure_token;
      if (__secure_token_lock) {
        await new Promise(r => setTimeout(r, 1000));
        if (!force && __secure_token && Date.now() < __secure_token_expire) return __secure_token;
      }
      __secure_token_lock = true;
      try {
        const sitekey = await __detectSitekey();
        const token = await __executeTurnstile(sitekey, 'paint');
        if (token && token.length > 20) {
          __secure_token = token;
          __secure_token_expire = Date.now() + __secure_token_ttl;
          return token;
        }
        return null;
      } finally {
        __secure_token_lock = false;
      }
    }
    let __pawtect_chunk: string | null = null;
    async function __findTokenModule(str: string) {
      const links = Array.from(document.querySelectorAll('link[rel="modulepreload"][href$=".js"]')) as HTMLLinkElement[];
      for (const link of links) {
        try {
          const url = new URL(link.getAttribute('href') || '', location.origin).href;
          const code = await fetch(url).then(r => r.text());
          if (code.includes(str)) return url.split('/').pop() || null;
        } catch {}
      }
      return null;
    }
    async function __createWasmToken(tileX: number, tileY: number, payload: any) {
      if (!__pawtect_chunk) __pawtect_chunk = await __findTokenModule('pawtect_wasm_bg.wasm');
      if (!__pawtect_chunk) return null;
      let mod: any;
      try {
        mod = await import(new URL('/_app/immutable/chunks/' + __pawtect_chunk, location.origin).href);
      } catch {
        return null;
      }
      let wasm: any;
      try {
        wasm = await mod._();
      } catch {
        return null;
      }
      try {
        try {
          const me = await (window as any).__wplace_rawFetch('https://backend.wplace.live/me', { credentials: 'include' }).then((r: any) => r && r.ok ? r.json() : null);
          if (me && me.id && mod.i) mod.i(me.id);
        } catch {}
        try {
          const url = 'https://backend.wplace.live/s0/pixel/' + String(tileX || 0) + '/' + String(tileY || 0);
          if (mod.r) mod.r(url);
        } catch {}
      } catch {}
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const bodyStr = JSON.stringify(payload);
      const bytes = enc.encode(bodyStr);
      let inPtr: any;
      try {
        if (!wasm.__wbindgen_malloc) return null;
        inPtr = wasm.__wbindgen_malloc(bytes.length, 1);
        const buf = new Uint8Array(wasm.memory.buffer, inPtr, bytes.length);
        buf.set(bytes);
      } catch {
        return null;
      }
      let outPtr: any, outLen: any, token: any;
      try {
        const result = wasm.get_pawtected_endpoint_payload(inPtr, bytes.length);
        if (Array.isArray(result) && result.length === 2) {
          outPtr = result[0];
          outLen = result[1];
          const out = new Uint8Array(wasm.memory.buffer, outPtr, outLen);
          token = dec.decode(out);
        } else {
          return null;
        }
      } catch {
        return null;
      } finally {
        try { if (wasm.__wbindgen_free && outPtr && outLen) wasm.__wbindgen_free(outPtr, outLen, 1); } catch {}
        try { if (wasm.__wbindgen_free && inPtr) wasm.__wbindgen_free(inPtr, bytes.length, 1); } catch {}
      }
      return token;
    }

    function syncBypassFlag() {
      try {
        const raw = localStorage.getItem('wguard:auto-config');
        if (raw) {
          const parsed = JSON.parse(raw);
          __bm_ignoreProtection = !!parsed.wguardBypassProtection;
        }
      } catch {}
    }

    function applyMaskFlag(flag: boolean) {
      __bm_maskActive = !!flag;
      if (__bm_maskActive) {
        setActiveChannel('bm-A');
        try { window.name = 'bm-A'; } catch {}
      } else {
        restoreDefaultChannel();
        try { window.name = ORIGINAL_WINDOW_NAME; } catch {}
      }
    }

    function syncMaskFlag() {
      try {
        const base = readChannel();
        if (typeof base === 'string' && base) {
          DEFAULT_CHANNEL_SOURCE = base;
          ACCEPTED_CHANNEL_SOURCES.add(base);
          if (!__bm_maskActive) WGUARD_CHANNEL_SOURCE = base;
        }
      } catch {}
      let enabled = false;
      try {
        const raw = localStorage.getItem('wguard:auto-config');
        if (raw) {
          const parsed = JSON.parse(raw);
          enabled = !!parsed.maskAsBlueMarble;
        }
      } catch {}
      applyMaskFlag(enabled);
    }

    syncBypassFlag();
    syncMaskFlag();

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
      if (data.action === 'secure:place' && typeof (data as any)?.chunkX === 'number' && typeof (data as any)?.chunkY === 'number' && Array.isArray((data as any)?.coords) && Array.isArray((data as any)?.colors)) {
        (async () => {
          try {
            const t = await __ensureToken(false);
            if (!t) { sendChannel({ action: 'secure:placed', ok: false, status: 0 }); return; }
            const fp = __secure_fp || __randStr(32);
            const coords = (data as any).coords.slice();
            const colors = (data as any).colors.slice();
            const cx = Number((data as any).chunkX) || 0;
            const cy = Number((data as any).chunkY) || 0;
            const payload = { coords, colors, t: t, fp } as any;
            const xpt = await __createWasmToken(cx, cy, payload);
            if (!xpt) { sendChannel({ action: 'secure:placed', ok: false, status: 0 }); return; }
            const url = `https://backend.wplace.live/s0/pixel/${cx}/${cy}`;
            let resp = await (window as any).__wplace_rawFetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'x-pawtect-token': xpt }, credentials: 'include', body: JSON.stringify(payload) });
            if (Number(resp?.status || 0) === 403) {
              __secure_token = '';
              __secure_token_expire = 0;
              const t2 = await __ensureToken(true);
              if (t2) {
                const payload2 = { coords, colors, t: t2, fp } as any;
                const xpt2 = await __createWasmToken(cx, cy, payload2);
                if (xpt2) {
                  resp = await (window as any).__wplace_rawFetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'x-pawtect-token': xpt2 }, credentials: 'include', body: JSON.stringify(payload2) });
                }
              }
            }
            const st = Number(resp?.status || 0);
            sendChannel({ action: 'secure:placed', ok: st >= 200 && st < 300, status: st });
          } catch {
            sendChannel({ action: 'secure:placed', ok: false, status: 0 });
          }
        })();
        return;
      }
      if (data.action === 'bm:setBypass') {
        const flag = (data as any).enabled;
        if (flag === 'sync') {
          syncBypassFlag();
        } else {
          const en = flag === true || flag === 'true' || flag === 1 || flag === '1';
          __bm_ignoreProtection = en;
        }
        return;
      }
      if (data.action === 'bm:setMask') {
        const flag = (data as any).enabled;
        if (flag === 'sync') {
          syncMaskFlag();
        } else {
          const en = flag === true || flag === 'true' || flag === 1 || flag === '1';
          applyMaskFlag(en);
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
            try { log('int', 'triggerPaint:start'); } catch {}
            await new Promise(r => setTimeout(r, 100));
            const openBtn = findOpenPaintButton();
            if (openBtn && !openBtn.disabled) {
              openBtn.focus();
              await new Promise(r => setTimeout(r, 80));
              openBtn.click();
              await new Promise(r => setTimeout(r, 120));
              await waitForEditUI(2000);
              try { log('int', 'triggerPaint:done'); } catch {}
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
            const body = buildTemplateBody(__bm_cachedContext.fp, (data as any).colors, (data as any).coords, __bm_cachedContext.token);
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
          try { log('int', 'pageClick:start', x, y); } catch {}
          const container = document.querySelector('div.maplibregl-canvas-container') as any;
          const canvas = document.querySelector('canvas.maplibregl-canvas') as any;
          const map = (window as any).map || (container && (container._map || container.__map)) || (canvas && (canvas._map || canvas.__map));
          if (map && typeof map.unproject === 'function' && typeof map.fire === 'function') {
            try {
              const lngLat = map.unproject([x, y]);
              const originalEvent = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
              try { Object.defineProperty(originalEvent, 'which', { get: () => 1 }); } catch {}
              map.fire('click', { type: 'click', point: { x, y }, lngLat, originalEvent });
              try { log('int', 'pageClick:map', x, y); } catch {}
            } catch {}
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
            try { log('int', 'pageClick:click', x, y); } catch {}
          }, 30);
        } catch {}
      }
   
      if (data.action === 'queryColors' && data.reqId) {
        try {
          try { log('int', 'queryColors'); } catch {}
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
            sendChannel({ action: 'colorButtons', reqId: data.reqId, buttons: out, freeRgbKeys: (window as any).__wph_lastFreeRgbKeys || [] });
          } catch {
            sendChannel({ action: 'colorButtons', reqId: data.reqId, buttons: [] });
          }
        } catch {}
      }
     
      if (data.action === 'selectColor' && typeof data.id === 'number') {
        try {
          try { log('int', 'selectColor', data.id); } catch {}
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
            }, 20);
          } else {
            try { log('int', 'selectColor:noBtn'); } catch {}
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
        try {
          if (method === 'POST' && typeof url === 'string' && /\/s0\/pixel\/[0-9]+\/[0-9]+(\b|\/|\?)/.test(url)) {
            __captureTokenFromBody(options.body);
          }
        } catch {}
        
        if (__bm_interceptActive && method === 'POST' && typeof url === 'string' && /\/s0\/pixel\/[0-9]+\/[0-9]+(\b|\/|\?)/.test(url)) {
          try {
            const originalBody = JSON.parse(String(options.body || '{}'));
            const token = originalBody['t'];
            const fp = originalBody['fp'];
            const colors = originalBody['colors'];
            const coords = originalBody['coords'];
            
            if (!fp || !Array.isArray(colors) || !Array.isArray(coords) || (token !== undefined && token !== null && token !== '')) {
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
                const reasonCode = (!fp || !Array.isArray(colors) || !Array.isArray(coords)) ? 'format_error' : 'token_present';
                sendChannel({ action: 'bm:formatError', reasonCode, reason: 'format_error', detail: 'Invalid request format detected', endpoint: url });
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
              const body = buildTemplateBody(fp, __bm_pendingIntercept.colors, __bm_pendingIntercept.coords);
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


