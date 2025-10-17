<script>
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import { MASTER_COLORS } from '../editor/palette';
  import { getStencilManager } from '../template/stencilManager';
  import { getAutoAllowedMasters, setAutoAllowedMasters, isAutoRunning, getAutoSavedCounts } from '../screen/autoPainter';
  import { t } from '../i18n';
  import { appendToBody } from '../editor/modal/utils/appendToBody';

  export let open = false;
  export let x = 0;
  export let y = 0;

  let items = [];
  let menuEl;
  let posX = 0;
  let posY = 0;
  const dispatch = createEventDispatcher();
  let enhanced = false;
  let rgbToButtonId = new Map();

  function openPaletteRobust() {
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
        const btn = document.querySelector(sel);
        if (btn && typeof (btn).click === 'function') { (btn).click(); return true; }
      } catch {}
    }
    return false;
  }

  
  function fitAnts(node) {
    let ro = null;
    function update() {
      try {
        const host = node.parentElement; 
        if (!host) return;
        const r = host.getBoundingClientRect();
        const w = Math.max(0, Math.round(r.width));
        const h = Math.max(0, Math.round(r.height));
        node.setAttribute('viewBox', `0 0 ${w} ${h}`);
        const path = node.querySelector('path');
        const makeD = (x0, y0, x1, y1, rtlx, rtly, rtrx, rtry, rbrx, rbry, rblx, rbly) => {
          return [
            `M ${x0 + rtlx},${y0}`,
            `L ${x1 - rtrx},${y0}`,
            `A ${rtrx} ${rtry} 0 0 1 ${x1} ${y0 + rtry}`,
            `L ${x1} ${y1 - rbry}`,
            `A ${rbrx} ${rbry} 0 0 1 ${x1 - rbrx} ${y1}`,
            `L ${x0 + rblx} ${y1}`,
            `A ${rblx} ${rbly} 0 0 1 ${x0} ${y1 - rbly}`,
            `L ${x0} ${y0 + rtly}`,
            `A ${rtlx} ${rtly} 0 0 1 ${x0 + rtlx} ${y0}`,
            'Z'
          ].join(' ');
        };
        if (path) {
          const cs = getComputedStyle(host);
          const parseR = (v) => {
            const s = String(v).trim().split('/')
              .map(part => part.trim().split(/\s+/).map(n => parseFloat(n)||0));
            const a = s[0]; const b = s[1] || a; 
            return { x: a[0] || 0, y: b[0] || a[0] || 0 };
          };
          const TL = parseR(cs.borderTopLeftRadius);
          const TR = parseR(cs.borderTopRightRadius);
          const BR = parseR(cs.borderBottomRightRadius);
          const BL = parseR(cs.borderBottomLeftRadius);
          const strokeW = 2; 
          
          const bwT = parseFloat(cs.borderTopWidth) || 0;
          const bwR = parseFloat(cs.borderRightWidth) || 0;
          const bwB = parseFloat(cs.borderBottomWidth) || 0;
          const bwL = parseFloat(cs.borderLeftWidth) || 0;
          const bw = (bwT + bwR + bwB + bwL) / 4;
          
          const dpr = (window.devicePixelRatio || 1);
          const snap = (v) => Math.round(v * dpr) / dpr;
          const inset = bw / 2;
          const x0 = snap(Math.max(0, inset));
          const y0 = snap(Math.max(0, inset));
          const x1 = snap(Math.max(x0, w - inset));
          const y1 = snap(Math.max(y0, h - inset));
          
          let rtlx = Math.max(0, TL.x - inset), rtly = Math.max(0, TL.y - inset);
          let rtrx = Math.max(0, TR.x - inset), rtry = Math.max(0, TR.y - inset);
          let rbrx = Math.max(0, BR.x - inset), rbry = Math.max(0, BR.y - inset);
          let rblx = Math.max(0, BL.x - inset), rbly = Math.max(0, BL.y - inset);
          
          const iw = Math.max(0, x1 - x0);
          const ih = Math.max(0, y1 - y0);
          const scaleX = Math.min(
            1,
            rtlx + rtrx > 0 ? iw / (rtlx + rtrx) : 1,
            rblx + rbrx > 0 ? iw / (rblx + rbrx) : 1
          );
          const scaleY = Math.min(
            1,
            rtly + rbly > 0 ? ih / (rtly + rbly) : 1,
            rtry + rbry > 0 ? ih / (rtry + rbry) : 1
          );
          rtlx *= scaleX; rtrx *= scaleX; rblx *= scaleX; rbrx *= scaleX;
          rtly *= scaleY; rtry *= scaleY; rbly *= scaleY; rbry *= scaleY;
          
          rtlx = snap(rtlx); rtly = snap(rtly);
          rtrx = snap(rtrx); rtry = snap(rtry);
          rbrx = snap(rbrx); rbry = snap(rbry);
          rblx = snap(rblx); rbly = snap(rbly);
          path.setAttribute('d', makeD(x0, y0, x1, y1, rtlx, rtly, rtrx, rtry, rbrx, rbry, rblx, rbly));
          
          let L = 0; try { L = path.getTotalLength(); } catch {}
          const ideal = 24; 
          const pairs = Math.max(10, Math.round(L / ideal));
          const dash = L / (pairs * 2);
          path.style.setProperty('--dash', `${dash.toFixed(2)}px`);
          const speed = Math.max(0.8, Math.min(1.8, L / 220));
          path.style.setProperty('--ants-speed', `${speed.toFixed(2)}s`);
        }
      } catch {}
    }
    try { ro = new ResizeObserver(update); ro.observe(node.parentElement); } catch {}
    update();
    return { destroy() { try { ro && ro.disconnect(); } catch {} } };
  }

  
  function queryColors(timeoutMs = 800) {
    return new Promise((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const onMsg = (ev) => {
        const d = ev?.data;
        if (!d || (d.source !== 'wplace-svelte' && d.source !== 'wguard-svelte')) return;
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

  function scanColorsLocal() {
    try {
      const buttons = Array.from(document.querySelectorAll('button[id^="color-"]'));
      const out = [];
      for (const btn of buttons) {
        try {
          const idStr = String(btn.id || '').replace(/[^0-9]/g, '');
          const idNum = Number(idStr) || 0;
          if (!idNum) continue;
          let rgb = [0, 0, 0];
          const inline = (btn.getAttribute('style') || '').toLowerCase();
          const re = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;
          let m = inline.match(re);
          if (!m) {
            const cs = getComputedStyle(btn);
            const bc = (cs.getPropertyValue('background') || cs.getPropertyValue('background-color') || '').toLowerCase();
            m = bc.match(re);
          }
          if (m) rgb = [Number(m[1])||0, Number(m[2])||0, Number(m[3])||0];
          let paid = false;
          try {
            const svgs = Array.from(btn.getElementsByTagName('svg'));
            for (const el of svgs) {
              const cs2 = getComputedStyle(el);
              const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
              if (cs2 && cs2.display !== 'none' && cs2.visibility !== 'hidden' && rect.width > 0 && rect.height > 0) { paid = true; break; }
            }
          } catch {}
          out.push({ id: idNum, rgb, paid });
        } catch {}
      }
      return out;
    } catch { return []; }
  }

  async function loadCounts() {
    try {
      const sm = getStencilManager();
      enhanced = !!sm.enhanced;
      const counts = sm.getRemainingCountsTotal();
      
      let countsUse = counts;
      try {
        if (isAutoRunning && isAutoRunning()) {
          const saved = (getAutoSavedCounts && getAutoSavedCounts());
          if (saved && Array.isArray(saved)) countsUse = saved;
        }
      } catch {}
      const allowed = new Set(getAutoAllowedMasters());

      
      let buttons = await queryColors(700);
      if (!buttons || !buttons.length) {
        try { openPaletteRobust(); } catch {}
        await new Promise(r => setTimeout(r, 240));
        buttons = await queryColors(900);
      }
      if (!buttons || !buttons.length) {
        try {
          const fb = (window && (window).__wph_lastColorButtons) || [];
          if (Array.isArray(fb) && fb.length) {
            buttons = fb;
          }
        } catch {}
      }
      if (!buttons || !buttons.length) {
        const local = scanColorsLocal();
        if (local && local.length) {
          buttons = local;
        }
      }
      
      try {
        rgbToButtonId = new Map();
        for (const b of (buttons||[])) {
          if (b && Array.isArray(b.rgb) && Number.isFinite(b.id)) {
            const k = `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`;
            if (!rgbToButtonId.has(k)) rgbToButtonId.set(k, b.id);
          }
        }
      } catch {}
      let freeRgbSet = new Set();
      try {
        const freeButtons = (buttons||[]).filter(b => b && !b.paid && Array.isArray(b.rgb));
        const freeRgbKeys = freeButtons.map(b => `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`);
        freeRgbSet = new Set(freeRgbKeys);
        const tmpMatched = [];
        const unknownRgb = [];
        for (const b of freeButtons) {
          const idx = MASTER_COLORS.findIndex(c => c.rgb[0] === b.rgb[0] && c.rgb[1] === b.rgb[1] && c.rgb[2] === b.rgb[2]);
          if (idx >= 0) tmpMatched.push(idx); else unknownRgb.push(`${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`);
        }
        const matchedUnique = Array.from(new Set(tmpMatched)).sort((a,b)=>a-b);
        const countsNonZero = [];
        for (let i = 0; i < (countsUse?.length||0); i++) if ((countsUse[i]||0) > 0) countsNonZero.push(i);
        const inter = matchedUnique.filter(i => countsNonZero.includes(i));
      } catch {}
      const isFreeByRgb = (rgb) => freeRgbSet.has(`${rgb[0]},${rgb[1]},${rgb[2]}`);

      const base = MASTER_COLORS.map((c, idx) => ({
        idx,
        name: c.name,
        rgb: c.rgb,
        count: (countsUse && countsUse[idx]) || 0,
        available: isFreeByRgb(c.rgb),
        checked: false,
      }));
      const filtered = base.filter(it => it.count > 0);
      if (allowed.size > 0) filtered.forEach(it => { it.checked = it.available && allowed.has(it.idx); });
      else filtered.forEach(it => { it.checked = it.available; });
      items = filtered;
    } catch {
      items = [];
    }
  }

  onMount(() => {
    if (open) { loadCounts(); updatePosition(); }
    
    try { window.addEventListener('resize', updatePosition); } catch {}
    return () => { try { window.removeEventListener('resize', updatePosition); } catch {} };
  });
  $: if (open) { loadCounts(); updatePosition(); }

  async function updatePosition() {
    try {
      await tick();
      const pad = 10;
      const topMenuHeight = 110;
      const W = Math.max(0, (window.innerWidth || 0));
      const H = Math.max(0, (window.innerHeight || 0));
      
      const mwRaw = (menuEl?.offsetWidth || 0);
      const mhRaw = (menuEl?.offsetHeight || 0);
      const mw = Math.max(280, mwRaw || 320);
      const mh = Math.max(160, mhRaw || 240);
      
      let nx = Math.round(x - mw / 2);
      let ny = Math.round(y);
      
      nx = Math.max(pad, Math.min(nx, W - mw - pad));
      ny = Math.max(topMenuHeight + pad, Math.min(ny, H - mh - pad));
      posX = nx;
      posY = ny;
    } catch {}
  }

  function close() { open = false; dispatch('close'); }
  function persist() {
    const selected = items.filter(i => i.checked).map(i => i.idx);
    setAutoAllowedMasters(selected);
  }
  function selectAll() { items = items.map(i => ({ ...i, checked: i.available })); persist(); }
  function clearAll() { items = items.map(i => ({ ...i, checked: false })); persist(); }
  function toggleItem(it) { if (!it.available) return; it.checked = !it.checked; items = [...items]; persist(); }

  async function ensurePaletteOpen() {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        let buttons = await queryColors(600);
        if (buttons && buttons.length) {
          
          rgbToButtonId = new Map();
          for (const b of buttons) {
            if (b && Array.isArray(b.rgb) && Number.isFinite(b.id)) {
              const k = `${b.rgb[0]},${b.rgb[1]},${b.rgb[2]}`;
              if (!rgbToButtonId.has(k)) rgbToButtonId.set(k, b.id);
            }
          }
          return true;
        }
        openPaletteRobust();
        await new Promise(r => setTimeout(r, 220 + attempt * 120));
      }
    } catch {}
    return false;
  }

  async function onTileClick(it) {
    if (it.available) { toggleItem(it); return; }
    
    const key = `${it.rgb[0]},${it.rgb[1]},${it.rgb[2]}`;
    let id = rgbToButtonId.get(key);
    if (id == null || id < 0) {
      const ok = await ensurePaletteOpen();
      if (!ok) return;
      id = rgbToButtonId.get(key);
    }
    if (id != null && id >= 0) {
      try { window.postMessage({ source: 'wplace-svelte', action: 'selectColor', id }, '*'); } catch {}
    }
  }
  function fmt(n) { try { return Number(n||0).toLocaleString('ru-RU'); } catch { return String(n||0); } }
</script>

{#if open}
  <div class="amenu-backdrop" role="button" tabindex="0" aria-label={t('automenu.closeAria')} on:click|stopPropagation={close} on:keydown={(e)=>{ if(e.key==='Escape'||e.key==='Enter'||e.key===' '){ e.preventDefault(); close(); } }} />
  <div use:appendToBody bind:this={menuEl} class="amenu" role="dialog" aria-modal="true" aria-label={t('automenu.title')} style={`left:${posX}px; top:${posY}px`}>
    <button class="close-x" type="button" aria-label={t('btn.close')} on:click={close} on:keydown={(e)=>{ if(e.key==='Enter'||e.key===' '||e.key==='Escape'){ e.preventDefault(); close(); } }}>×</button>
    {#if items.length > 0}
      <div class="amenu-header">
        <div class="actions">
          <button class="chip" type="button" on:click={selectAll}>{t('automenu.selectAll')}</button>
          <button class="chip" type="button" on:click={clearAll}>{t('automenu.clearAll')}</button>
        </div>
      </div>
    {/if}
    <div class="amenu-list">
      {#if items.length === 0}
        <div class="empty">{t('automenu.noColors')}</div>
      {:else}
        <div class="tiles">
          {#each items as it}
            <button class="tile {it.checked ? 'selected' : ''} {it.available ? '' : 'disabled'}" type="button" aria-pressed={it.checked} on:click={() => onTileClick(it)}>
              <div class="tile-inner">
                <span class="sw" style={`background: rgb(${it.rgb[0]},${it.rgb[1]},${it.rgb[2]})`} />
                <span class="name">{it.name}</span>
                <span class="count">{fmt(it.count)} {t('automenu.count.pixels')}</span>
              </div>
              
              <svg class="ants" use:fitAnts aria-hidden="true">
                <path fill="none" />
              </svg>
              <div class="lock" aria-hidden="true" title={t('automenu.lock.title')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0v3z"/>
                </svg>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    
  </div>
{/if}

<style>
  .amenu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000010;
    background: transparent;
  }
  .amenu {
    position: fixed;
    z-index: 1000011;
    min-width: 280px;
    max-width: 360px;
    max-height: 60vh;
    background: var(--wph-surface, rgba(17,17,17,0.96));
    color: var(--wph-text, #fff);
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 10px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    overflow: hidden;
    backdrop-filter: blur(6px);
  }
  .amenu-header { display: flex; align-items: center; justify-content: flex-start; gap: 6px; padding: 8px 8px 6px; border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.08)); }
  .actions { display: flex; gap: 6px; }
  .chip { font-size: 12px; line-height: 1.2; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: var(--wph-surface, rgba(255,255,255,0.06)); color: var(--wph-text, #fff); cursor: pointer; }
  .chip:hover { background: var(--wph-surface2, rgba(255,255,255,0.1)); }
  .amenu-list { padding: 8px 8px; max-height: 42vh; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--wph-border, rgba(255,255,255,0.35)) var(--wph-surface, rgba(255,255,255,0.08)); }
  :global(.amenu-list::-webkit-scrollbar) { width: 8px; height: 8px; }
  :global(.amenu-list::-webkit-scrollbar-track) { background: var(--wph-surface, rgba(255,255,255,0.08)); border-radius: 8px; }
  :global(.amenu-list::-webkit-scrollbar-thumb) { background: var(--wph-border, rgba(255,255,255,0.35)); border-radius: 8px; }
  :global(.amenu-list::-webkit-scrollbar-thumb:hover) { background: var(--wph-border, rgba(255,255,255,0.38)); }
  :global(.amenu-list::-webkit-scrollbar-button) { display: none !important; width: 0 !important; height: 0 !important; background: transparent !important; border: 0 !important; }
  :global(.amenu-list::-webkit-scrollbar-corner) { background: transparent !important; }
  .tiles { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .tile { position: relative; display: block; padding: 8px 10px; border-radius: 12px; border: none; background: var(--wph-surface, rgba(255,255,255,0.04)); color: inherit; cursor: pointer; text-align: left; overflow: hidden; }
  .tile .tile-inner { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 10px; }
  .tile:hover { background: var(--wph-surface2, rgba(255,255,255,0.08)); }
  .tile.disabled { opacity: 0.9; cursor: pointer; }
  .tile.selected { border-color: transparent; box-shadow: none; }
  
  .ants { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; }
  .ants path { stroke: var(--wph-primary, #f3734d); stroke-width: 2; stroke-linecap: butt; stroke-linejoin: round; stroke-dasharray: var(--dash) var(--dash); stroke-dashoffset: 0; filter: drop-shadow(0 0 2px var(--wph-primaryGlow, rgba(240,81,35,0.6))); vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
  .tile.selected .ants { opacity: 1; }
  @keyframes antsRun { to { stroke-dashoffset: calc(-2 * var(--dash)); } }
  .tile.selected .ants path { animation: antsRun var(--ants-speed, 1.2s) linear infinite; }
  .sw { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.5); box-shadow: inset 0 0 0 1px var(--wph-border, rgba(255,255,255,0.15)); }
  .name { font-size: 12px; line-height: 1.2; opacity: 0.95; }
  .count { font-size: 12px; line-height: 1.2; opacity: 0.8; }
  .empty { padding: 14px; text-align: center; opacity: 0.8; }
  .close-x { 
    position: absolute; 
    top: 8px; 
    right: 8px; 
    width: 28px; 
    height: 28px; 
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px; 
    background: var(--wph-surface, rgba(255,255,255,0.06)); 
    color: var(--wph-text, #fff); 
    border: none;
    cursor: pointer;
    transition: all .15s ease;
    z-index: 2; 
    pointer-events: auto;
    font-size: 20px;
    line-height: 1;
    padding: 0;
  }
  .close-x:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.12));
    transform: scale(1.05);
  }

  
  .tile .lock { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: var(--wph-text, rgba(255,255,255,0.95)); opacity: 0; transition: opacity .2s ease, transform .2s ease; pointer-events: none; }
  .tile.disabled .tile-inner { filter: blur(2px) brightness(0.88); }
  .tile.disabled:hover .lock { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  .tile.disabled:hover .tile-inner { filter: blur(4px) brightness(0.82); }
</style>
