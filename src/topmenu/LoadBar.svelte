<script>
  import { onMount, onDestroy } from 'svelte';
  import { getStencilManager } from '../template/stencilManager';
  export let inline = false; 

  let percent = 0;
  let visible = false;
  let timer;
  let topPx = 60;
  let barWidth = 380;
  let barLeft = 0;
  let plateBg = '';
  let bdL = '';
  let bdR = '';
  let bdB = '';
  let plateShadow = '';
  let glowColor = '';
  let enhancedOn = false;
  $: plateStyle = [
    plateBg ? `background:${plateBg}` : '',
    bdL ? `border-left:${bdL}` : '',
    bdR ? `border-right:${bdR}` : '',
    bdB ? `border-bottom:${bdB}` : '',
    plateShadow ? `box-shadow:${plateShadow}` : '',
    glowColor ? `--top-glow:${glowColor}` : '',
  ].filter(Boolean).join('; ');

  const ariaPercent = (p) => (Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0).toFixed(1);

  function pickGlowFromBoxShadow(bs) {
    if (!bs || bs === 'none') return '';
    try {
      const m = bs.match(/rgba?\([^\)]+\)/i);
      if (m) return m[0];
      const hx = bs.match(/#([0-9a-f]{3,8})/i);
      if (hx) {
        const hex = hx[0];
        const v = hex.replace('#','');
        const parse = n => parseInt(n, 16);
        let r,g,b;
        if (v.length === 3) { r=parse(v[0]+v[0]); g=parse(v[1]+v[1]); b=parse(v[2]+v[2]); }
        else { r=parse(v.slice(0,2)); g=parse(v.slice(2,4)); b=parse(v.slice(4,6)); }
        return `rgba(${r}, ${g}, ${b}, 0.45)`;
      }
    } catch {}
    return '';
  }

  function calcPercent() {
    try {
      const sm = getStencilManager();
      enhancedOn = !!sm?.enhanced;
      const cur = sm.current;
      if (!cur) {
        visible = enhancedOn;
        if (!enhancedOn) percent = 0;
        return;
      }
      const total = Number(cur.totalDots) || 0;
      const remainingArr = sm.getRemainingCountsTotal?.() || [];
      const remaining = Array.isArray(remainingArr) ? remainingArr.reduce((a,b)=>a + (b|0), 0) : 0;
      const done = Math.max(0, total - remaining);
      const p = total > 0 ? (done / total) * 100 : 0;
      percent = Math.max(0, Math.min(100, p));
      visible = enhancedOn;
    } catch {
      visible = false; percent = 0; enhancedOn = false;
    }
  }

  function handleMsg(ev) {
    try {
      const d = ev?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'tileUpdated') {
        calcPercent();
      }
    } catch {}
  }

  function updateTop() {
    try {
      const root = document.querySelector('.topmenu-root');
      const bar = document.querySelector('.topmenu-bar');
      if (root && typeof root.getBoundingClientRect === 'function') {
        const r = root.getBoundingClientRect();
        const bottom = (r && typeof r.bottom === 'number') ? r.bottom : 52;
        topPx = Math.round(bottom - 1); 
      } else { topPx = 60; }
      if (bar && typeof bar.getBoundingClientRect === 'function') {
        const rb = bar.getBoundingClientRect();
   
        barWidth = Math.max(200, Math.round(rb.width) - 1);
        barLeft = Math.round(rb.left);
        try {
          const cs = getComputedStyle(bar);
          plateBg = cs.background || cs.backgroundColor || plateBg;
          bdL = cs.borderLeft || bdL;
          bdR = cs.borderRight || bdR;
          bdB = cs.borderBottom || bdB;
          plateShadow = cs.boxShadow || plateShadow;
          
          let btn = bar.querySelector('.tm-fab.tm-primary') || bar.querySelector('.tm-fab');
          if (btn) {
            const csb = getComputedStyle(btn);
            const col = pickGlowFromBoxShadow(csb.boxShadow);
            if (col) glowColor = col;
          }
        } catch {}
      }
    } catch (e) { topPx = 60; }
  }

  onMount(() => {
    calcPercent();
    updateTop();
    timer = setInterval(calcPercent, 800);
    window.addEventListener('message', handleMsg);
    window.addEventListener('wplace:enhanced', calcPercent);
    window.addEventListener('resize', updateTop);
  });
  onDestroy(() => {
    try { clearInterval(timer); } catch {}
    window.removeEventListener('message', handleMsg);
    window.removeEventListener('wplace:enhanced', calcPercent);
    window.removeEventListener('resize', updateTop);
  });
</script>

{#if inline}
  <div class="loadbar-inline" aria-label={`Loader: ${ariaPercent(percent)}%`}>
    <div class="bar-wrap" class:visible={enhancedOn}>
      <div class="plate" style={plateStyle}>
        <div class="track">
          <div class="fill" style={`--pct:${percent}`}></div>
        </div>
      </div>
    </div>
  </div>
{:else}
  {#if visible}
    <div class="loadbar" aria-label={`Loader: ${ariaPercent(percent)}%`} style={`top:${topPx}px; left:${barLeft}px; width:${barWidth}px`}>
      <div class="plate" style={plateStyle}>
        <div class="track">
          <div class="fill" style={`--pct:${percent}`}></div>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .loadbar {
    position: fixed;
    z-index: 1000002;
    pointer-events: none;
  }
  .loadbar-inline {
    
    pointer-events: none;
  }
  
  .bar-wrap {
    max-height: 0;
    opacity: 0;
    transform: translateY(-3px);
    margin-top: 0;
    transition: max-height 180ms ease, opacity 160ms ease, transform 180ms ease, margin-top 180ms ease;
  }
  .bar-wrap.visible {
    max-height: 16px; 
    opacity: 1;
    transform: translateY(0);
    margin-top: 10px; 
  }

  .loadbar-inline .plate {
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    margin: 0 !important;
  }
  .loadbar-inline .plate::before { display: none !important; }
  .plate {
    position: relative;
    width: 100%;
    background: rgba(24,26,32,0.88); 
    border-left: 1px solid rgba(255,255,255,0.15);
    border-right: 1px solid rgba(255,255,255,0.15);
    border-bottom: 1px solid rgba(255,255,255,0.15);
    border-top: 0; 
    border-radius: 0 0 10px 10px; 
    padding: 4px 10px 6px 10px; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.25); 
    margin-top: 0; 
  }
  .plate::before {
    content: '';
    position: absolute; left: 0; right: 0; top: 0;
    height: 14px;
    background: linear-gradient(to bottom, var(--top-glow, rgba(240,81,35,0.35)) 0%, rgba(0,0,0,0) 75%);
    pointer-events: none;
  }
  .track {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(0,0,0,0.2);
    border-radius: 999px; 
    box-shadow: none;
    overflow: hidden;
  }
  .fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: calc(var(--pct, 0) * 1%);
    height: 100%;
    background: #f05123; 
    border-radius: inherit; 
    box-shadow: 0 2px 29px 0 #f05123; 
  }
  
</style>
