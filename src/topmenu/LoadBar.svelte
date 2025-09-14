<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { getStencilManager } from '../template/stencilManager';
  export let inline = false; 

  let percent = 0;
  let totalDots = 0;
  let remaining = 0;
  let done = 0;
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
  
  let centerOffset = 0;
  
  let deltaBase = 15; 
  
  let deltaShift = 0;
  
  let persistDeltas = false;
  
  
  let prevPercent = null;
  let prevRemaining = null;
  let popups = [];
  let popupCtr = 0;
  
  let firstEnhancedEntry = true;
  
  let hasRealData = false;
  
  let prevEnhancedOn = false;
  
  let shouldShowFirstRealData = false;
  
  
  let autoPaintingActive = false;
  let frozenPercent = null;
  let frozenRemaining = null;
  
  let waitingForTileUpdate = false;
  
  let unfreezeTimer = null;
  let pendingSilentUnfreeze = false;
  
  
  let tileUpdateDelayMs = 450;
  let tileDelayTimer = null;
  let tileDelayActive = false;

  let lastTileUpdatedTs = 0;
  let pendingEarlyTileUpdate = false;
  const earlyWindowMs = 350; 

  
  let coalesceHoldUntilTs = 0;
  const coalesceHoldBaseMs = 1600; 

  
  let impactLevel = 0; 
  let impactOn = false;
  
  let fx = [];
  let fxCtr = 0;

  
  let impactBoost = 0;   
  let impactCombo = 0;   
  let impactComboTimer = null;

  async function triggerImpact(lvl, xPos = percent) {
    try {
      impactLevel = Math.max(0, Math.min(6, Number(lvl)|0));
      
      impactOn = false;
      await tick();
      impactOn = true;
      
      const dur = impactLevel <= 2 ? 1000 : (impactLevel <= 4 ? 1400 : 1800);

      
      if (impactLevel > 2) {
        impactCombo = Math.min(impactCombo + 1, 3);
        impactBoost = impactCombo;
        try { clearTimeout(impactComboTimer); } catch {}
        impactComboTimer = setTimeout(() => { impactCombo = 0; impactBoost = 0; }, dur + 400);
      } else {
        impactCombo = 0; impactBoost = 0;
      }

      setTimeout(()=>{ impactOn = false; }, dur);
      
      emitSparks(impactLevel, xPos);
    } catch {}
  }

  function emitSparks(level, xPos) {
    try {
      const lvl = Math.max(1, Math.min(6, level|0));
      const counts = [0, 8, 12, 18, 26, 36, 48];
      const maxR = [0, 18, 24, 30, 38, 46, 56];
      const baseCount = counts[lvl] || 8;
      const baseRadius = maxR[lvl] || 24;
      const boost = Math.max(0, Math.min(3, impactBoost|0));
      const n = Math.round(baseCount * (1 + 0.4 * boost));
      const radius = Math.round(baseRadius * (1 + 0.28 * boost));
      const col = glowColor || '#f05123';
      
      const x = Math.max(0, Math.min(100, Number(xPos) || 0));
      for (let i = 0; i < n; i++) {
        const id = ++fxCtr;
        const aBase = -Math.PI/2; 
        const spread = (Math.PI/2) + (lvl >= 5 ? Math.PI/6 : 0); 
        const a = aBase + (Math.random() - 0.5) * spread;
        const r = radius * (0.5 + Math.random() * 0.8);
        const tx = Math.cos(a) * r;
        const ty = Math.sin(a) * r;
        const rot = (Math.random() * 120 - 60);
        const dur = Math.round(700 + Math.random() * 700);
        const delay = Math.round(Math.random() * 120);
        const sz = Math.round(3 + Math.random() * (lvl >= 5 ? 6 : 4));
        const y = 3 + Math.round(Math.random() * 6); 
        const c = col;
        fx = [...fx, { id, x, y, tx, ty, rot, dur, delay, sz, c }];
        setTimeout(()=>{ fx = fx.filter(s => s.id !== id); }, dur + delay + 80);
      }
    } catch {}
  }

  function fmtDeltaPercent(dp) {
    try {
      const n = Number(dp) || 0;
      let s = n.toFixed(2);
      s = s.replace(/^-0\.?0*$/,'0').replace(/\.0+$/,'').replace(/(\.[0-9]*?)0+$/,'$1');
      const sign = n > 0 ? '+' : (n < 0 ? '-' : '');
      return sign ? sign + s.replace(/^-/, '') : s;
    } catch { return String(dp); }
  }

  function pushPopup(side, kind, dir, amount) {
    const id = ++popupCtr;
    const abs = Math.abs(Number(amount) || 0);
    
    const arrows = kind === 'pixels' ? (abs >= 300 ? 3 : (abs <= 100 ? 1 : 2)) : 1;
    const text = kind === 'percent'
      ? `${fmtDeltaPercent(amount)}%`
      : `${amount > 0 ? '+' : amount < 0 ? '-' : ''}${formatInt(abs)} px`;
    const p = { id, side, kind, dir, arrows, text };
    popups = [...popups, p];
    
    if (!persistDeltas) {
      
      setTimeout(() => { popups = popups.filter(x => x.id !== id); }, 5050);
    }
  }

  
  function getDeltaCoalesceWindowMs() {
    try { return Math.max(tileUpdateDelayMs, 350); } catch { return 350; }
  }
  let deltaBuf = new Map(); 
  function resetDeltaBuf() {
    try { for (const [, b] of deltaBuf) { if (b?.timer) clearTimeout(b.timer); } } catch {}
    deltaBuf = new Map();
  }
  function impactLevelFromDelta(mag) {
    let lvl = 1;
    if (mag <= 3) lvl = 1;
    else if (mag <= 10) lvl = 2;
    else if (mag <= 20) lvl = 3;
    else if (mag <= 50) lvl = 4;
    else if (mag <= 90) lvl = 5;
    else lvl = 6;
    return lvl;
  }
  function queueDelta(side, kind, amount) {
    try {
      const key = `${side}:${kind}`;
      let buf = deltaBuf.get(key);
      if (!buf) { buf = { side, kind, sum: 0, timer: null }; deltaBuf.set(key, buf); }
      buf.sum += Number(amount) || 0;
      if (buf.timer) { try { clearTimeout(buf.timer); } catch {} }
      const extraHold = Math.max(0, coalesceHoldUntilTs ? (coalesceHoldUntilTs - Date.now()) : 0);
      const delayMs = Math.max(getDeltaCoalesceWindowMs(), extraHold);
      buf.timer = setTimeout(() => {
        deltaBuf.delete(key);
        const sum = buf.sum;
        const threshold = kind === 'percent' ? 0.01 : 1;
        if (Math.abs(sum) >= threshold) {
          const dir = sum >= 0 ? 'up' : 'down';
          pushPopup(side, kind, dir, sum);
          if (kind === 'percent' && sum > 0.01) {
            const lvl = impactLevelFromDelta(Math.abs(sum));
            try { triggerImpact(lvl, percent); } catch {}
          }
        }
      }, delayMs);
    } catch {}
  }

  $: popLeft = popups.filter(p => p.side === 'left');
  $: popRight = popups.filter(p => p.side === 'right');
  $: plateStyle = [
    plateBg ? `background:${plateBg}` : '',
    bdL ? `border-left:${bdL}` : '',
    bdR ? `border-right:${bdR}` : '',
    bdB ? `border-bottom:${bdB}` : '',
    plateShadow ? `box-shadow:${plateShadow}` : '',
    glowColor ? `--top-glow:${glowColor}` : '',
    `--center-offset:${centerOffset}px`,
    `--delta-base:${deltaBase}px`,
    `--deltas-shift:${deltaShift}px`,
    `--delta-half:12px`,
  ].filter(Boolean).join('; ');
  
  $: plateStyleInline = plateStyle;

  const ariaPercent = (p) => (Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0).toFixed(1);

  function formatPercent(p) {
    try {
      let s = (Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0).toFixed(4);
      s = s.replace(/\.0+$/,'').replace(/(\.[0-9]*?)0+$/,'$1');
      return s;
    } catch { return String(Math.round(p||0)); }
  }
  function formatInt(n) {
    try { return Number(n||0).toLocaleString(); } catch { return String(n|0); }
  }
  $: percentText = formatPercent(percent);
  $: remainingText = formatInt(remaining);

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
      const newEnhancedOn = !!sm?.enhanced;
      
      
      if (newEnhancedOn !== prevEnhancedOn) {
        
        
        firstEnhancedEntry = true;
        hasRealData = false;
        shouldShowFirstRealData = false;
        prevPercent = null;
        prevRemaining = null;
        prevEnhancedOn = newEnhancedOn;
        resetDeltaBuf();
        
        if (newEnhancedOn) {
          
          shouldShowFirstRealData = true;
        }
      }
      
      enhancedOn = newEnhancedOn;
      const cur = sm.current;
      if (!cur) {
        visible = enhancedOn;
        if (!enhancedOn) percent = 0;
        return;
      }
      const newTotalDots = Number(cur.totalDots) || 0;
      const remainingArr = sm.getRemainingCountsTotal?.() || [];
      const newRemaining = Array.isArray(remainingArr) ? remainingArr.reduce((a,b)=>a + (b|0), 0) : 0;
      const newDone = Math.max(0, newTotalDots - newRemaining);
      const p = newTotalDots > 0 ? (newDone / newTotalDots) * 100 : 0;
      const newPercent = Math.max(0, Math.min(100, p));

      
      const isRealData = !(newPercent === 100 && newRemaining === 0) && newTotalDots > 0;

      
      if (waitingForTileUpdate && tileDelayActive) {
        visible = enhancedOn;
        return;
      }

      
      if (autoPaintingActive) {
        visible = enhancedOn;
        return;
      }

      
      if (isRealData && shouldShowFirstRealData && enhancedOn) {
        
        
        shouldShowFirstRealData = false;
        hasRealData = true;
        
        
        
        prevPercent = newPercent;
        prevRemaining = newRemaining;
      }
      
      
      if (pendingSilentUnfreeze) {
        pendingSilentUnfreeze = false;
        prevPercent = newPercent;
        prevRemaining = newRemaining;
        percent = newPercent;
        remaining = newRemaining;
        visible = enhancedOn;
        return;
      }

      
      
      let didShowFrozenDeltas = false;
      if (waitingForTileUpdate && frozenPercent !== null && frozenRemaining !== null) {
        if (hasRealData && !shouldShowFirstRealData) {
          const dPctF = newPercent - frozenPercent;
          if (Math.abs(dPctF) >= 0.01) { queueDelta('left', 'percent', dPctF); }
          const dPxF = frozenRemaining - newRemaining; 
          if (dPxF !== 0) { queueDelta('right', 'pixels', dPxF); }
          didShowFrozenDeltas = true;
        }
        
        waitingForTileUpdate = false;
        frozenPercent = null;
        frozenRemaining = null;
        prevPercent = newPercent;
        prevRemaining = newRemaining;
      }

      
      const shouldShowDeltas = !didShowFrozenDeltas && prevPercent !== null && prevRemaining !== null && 
                              !firstEnhancedEntry && hasRealData && !shouldShowFirstRealData;
      
      if (shouldShowDeltas) {
        const dPct = newPercent - prevPercent;
        if (Math.abs(dPct) >= 0.01) { queueDelta('left', 'percent', dPct); }
        const dPx = prevRemaining - newRemaining; 
        if (dPx !== 0) { queueDelta('right', 'pixels', dPx); }
      }
      
      
      if (firstEnhancedEntry && enhancedOn) {
        firstEnhancedEntry = false;
      }
      
      
      if (isRealData && !hasRealData) {
        hasRealData = true;
      }

      
      totalDots = newTotalDots;
      remaining = newRemaining;
      done = newDone;
      percent = newPercent;
      visible = enhancedOn;

      
      if (!shouldShowFirstRealData) {
        prevPercent = newPercent;
        prevRemaining = newRemaining;
      }
    } catch {
      visible = false; percent = 0; enhancedOn = false;
    }
  }
  
  
  

  function handleMsg(ev) {
    try {
      const d = ev?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'tileUpdated') {

        try { lastTileUpdatedTs = Date.now(); } catch {}
        if (!waitingForTileUpdate) {
        
          pendingEarlyTileUpdate = true;
        }
        
        if (waitingForTileUpdate) {
          if (tileDelayTimer) { try { clearTimeout(tileDelayTimer); } catch {} }
          tileDelayActive = true;
          
          try { coalesceHoldUntilTs = Math.max(coalesceHoldUntilTs || 0, Date.now() + getDeltaCoalesceWindowMs()); } catch {}
          tileDelayTimer = setTimeout(() => {
            tileDelayActive = false;
            
            try { requestAnimationFrame(() => { try { calcPercent(); } catch {} }); } catch { calcPercent(); }
          }, tileUpdateDelayMs);
        } else {
          calcPercent();
        }
      } else if (d.action === 'autoPaintCycleStart') {
        
        try {
          const sm = getStencilManager();
          const cur = sm?.current;
          if (cur) {
            const total = Number(cur.totalDots) || 0;
            const arr = sm.getRemainingCountsTotal?.() || [];
            const rem = Array.isArray(arr) ? arr.reduce((a,b)=>a + (b|0), 0) : 0;
            const done = Math.max(0, total - rem);
            const p = total > 0 ? (done / total) * 100 : 0;
            frozenPercent = Math.max(0, Math.min(100, p));
            frozenRemaining = rem;
          } else {
            frozenPercent = percent;
            frozenRemaining = remaining;
          }
        } catch {
          frozenPercent = percent;
          frozenRemaining = remaining;
        }
        autoPaintingActive = true;
        waitingForTileUpdate = false;
        tileDelayActive = false;
        if (tileDelayTimer) { try { clearTimeout(tileDelayTimer); } catch {} tileDelayTimer = null; }
        if (unfreezeTimer) { try { clearTimeout(unfreezeTimer); } catch {} unfreezeTimer = null; }
        
        resetDeltaBuf();
        pendingEarlyTileUpdate = false;
        lastTileUpdatedTs = 0;
        coalesceHoldUntilTs = 0;
      } else if (d.action === 'autoPaintCycleEnd') {
        
        autoPaintingActive = false;
        waitingForTileUpdate = true;
        
        if (unfreezeTimer) { try { clearTimeout(unfreezeTimer); } catch {} }
        unfreezeTimer = setTimeout(() => {
          if (waitingForTileUpdate) {
            waitingForTileUpdate = false;
            pendingSilentUnfreeze = true;
            tileDelayActive = false;
            if (tileDelayTimer) { try { clearTimeout(tileDelayTimer); } catch {} tileDelayTimer = null; }
            calcPercent();
          }
          unfreezeTimer = null;
        }, 1500);

        
        try {
          const hold = Math.max(getDeltaCoalesceWindowMs(), coalesceHoldBaseMs);
          coalesceHoldUntilTs = Date.now() + hold;
        } catch {}

    
        const dt = Date.now() - (lastTileUpdatedTs || 0);
        if (pendingEarlyTileUpdate && dt >= 0 && dt <= Math.max(tileUpdateDelayMs, earlyWindowMs)) {
          pendingEarlyTileUpdate = false;
          
          if (unfreezeTimer) { try { clearTimeout(unfreezeTimer); } catch {} unfreezeTimer = null; }
          if (tileDelayTimer) { try { clearTimeout(tileDelayTimer); } catch {} }
          tileDelayActive = true;
          tileDelayTimer = setTimeout(() => {
            tileDelayActive = false;
            try { requestAnimationFrame(() => { try { calcPercent(); } catch {} }); } catch { calcPercent(); }
          }, tileUpdateDelayMs);
        }
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
            
            try {
              const track = document.querySelector('.loadbar-inline .track')
                           || document.querySelector('.loadbar .track')
                           || bar.querySelector('.track');
              if (track && typeof track.getBoundingClientRect === 'function') {
                const rt = track.getBoundingClientRect();
                
                const rootEl = document.querySelector('.topmenu-root');
                const rr = rootEl && typeof rootEl.getBoundingClientRect === 'function' ? rootEl.getBoundingClientRect() : rb;
                const centerRootY = rr.top + rr.height / 2;
                
                const dy = centerRootY - (rt.top + rt.height / 2);
                centerOffset = Math.round(dy);
                
                const originY = rt.top - 12; 
                const wantedY = centerRootY;
                deltaShift = Math.round(wantedY - originY);
                
                deltaBase = Math.round(12 + rt.height / 2);
              } else {
                centerOffset = 0;
                deltaBase = 15;
                deltaShift = 0;
              }
            } catch {}
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
  <div class="loadbar-inline" data-persist={persistDeltas} aria-label={`Loader: ${ariaPercent(percent)}%`}>
    <div class="bar-wrap" class:visible={enhancedOn}>
      <div class="plate" style={plateStyleInline} class:impact-on={impactOn} data-ilevel={impactLevel} data-boost={impactBoost}>
        <div class="track">
          <div class="fill" style={`--pct:${percent}`}></div>
          <div class="fx-layer" aria-hidden="true">
            {#each fx as s (s.id)}
              <span class="spark" style={`left: calc(${s.x}%); top: 50%; --tx:${s.tx}px; --ty:${-s.ty}px; --rot:${s.rot}deg; --dur:${s.dur}ms; --delay:${s.delay}ms; --sz:${s.sz}px; background:${s.c}`}></span>
            {/each}
            <span class="glitch"></span>
          </div>
          <div class="info" aria-hidden="true" style="pointer-events:none">
            <div class="info-inner">
              <span class="pct">{percentText}%</span>
              <span class="sep">•</span>
              <span class="rem">{remainingText} px</span>
            </div>
          </div>
          <div class="delta-layer" aria-hidden="true" style="pointer-events:none">
            <div class="stack left">
              {#each popLeft as p (p.id)}
                <div class="delta" data-dir={p.dir} data-kind={p.kind} style={`--accent:${p.dir === 'up' ? '#69f0ae' : '#ff8a80'}`}>
                  <span class="arrows" aria-hidden="true" style={`--center-idx:${(p.arrows - 1) / 2}` }>
                    {#each Array(p.arrows) as _, i}
                      <svg class="arr-svg" style={`--i:${i}; --scale:1`} width="36" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 15L10 9.84985C10.2563 9.57616 10.566 9.35814 10.9101 9.20898C11.2541 9.05983 11.625 8.98291 12 8.98291C12.375 8.98291 12.7459 9.05983 13.0899 9.20898C13.434 9.35814 13.7437 9.57616 14 9.84985L19 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    {/each}
                  </span>
                  <span class="val">{p.text}</span>
                </div>
              {/each}
            </div>
            <div class="stack right">
              {#each popRight as p (p.id)}
                <div class="delta" data-dir={p.dir} data-kind={p.kind} style={`--accent:${p.dir === 'up' ? '#69f0ae' : '#ff8a80'}`}>
                  <span class="val">{p.text}</span>
                  <span class="arrows" aria-hidden="true" style={`--center-idx:${(p.arrows - 1) / 2}` }>
                    {#each Array(p.arrows) as _, i}
                      <svg class="arr-svg" style={`--i:${i}; --scale:1`} width="36" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 15L10 9.84985C10.2563 9.57616 10.566 9.35814 10.9101 9.20898C11.2541 9.05983 11.625 8.98291 12 8.98291C12.375 8.98291 12.7459 9.05983 13.0899 9.20898C13.434 9.35814 13.7437 9.57616 14 9.84985L19 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    {/each}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  {#if visible}
    <div class="loadbar" data-persist={persistDeltas} aria-label={`Loader: ${ariaPercent(percent)}%`} style={`top:${topPx}px; left:${barLeft}px; width:${barWidth}px`}>
      <div class="plate" style={plateStyle} class:impact-on={impactOn} data-ilevel={impactLevel} data-boost={impactBoost}>
        <div class="track">
          <div class="fill" style={`--pct:${percent}`}></div>
          <div class="fx-layer" aria-hidden="true">
            {#each fx as s (s.id)}
              <span class="spark" style={`left: calc(${s.x}%); top: 50%; --tx:${s.tx}px; --ty:${-s.ty}px; --rot:${s.rot}deg; --dur:${s.dur}ms; --delay:${s.delay}ms; --sz:${s.sz}px; background:${s.c}`}></span>
            {/each}
            <span class="glitch"></span>
          </div>
          <div class="info" aria-hidden="true">
            <div class="info-inner">
              <span class="pct">{percentText}%</span>
              <span class="sep">•</span>
              <span class="rem">{remainingText} px</span>
            </div>
          </div>
          <div class="delta-layer" aria-hidden="true">
            <div class="stack left">
              {#each popLeft as p (p.id)}
                <div class="delta" data-dir={p.dir} data-kind={p.kind} style={`--accent:${p.dir === 'up' ? '#69f0ae' : '#ff8a80'}`}>
                  <span class="arrows" aria-hidden="true" style={`--center-idx:${(p.arrows - 1) / 2}` }>
                    {#each Array(p.arrows) as _, i}
                      <svg class="arr-svg" style={`--i:${i}; --scale:1`} width="36" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 15L10 9.84985C10.2563 9.57616 10.566 9.35814 10.9101 9.20898C11.2541 9.05983 11.625 8.98291 12 8.98291C12.375 8.98291 12.7459 9.05983 13.0899 9.20898C13.434 9.35814 13.7437 9.57616 14 9.84985L19 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    {/each}
                  </span>
                  <span class="val">{p.text}</span>
                </div>
              {/each}
            </div>
            <div class="stack right">
              {#each popRight as p (p.id)}
                <div class="delta" data-dir={p.dir} data-kind={p.kind} style={`--accent:${p.dir === 'up' ? '#69f0ae' : '#ff8a80'}`}>
                  <span class="val">{p.text}</span>
                  <span class="arrows" aria-hidden="true" style={`--center-idx:${(p.arrows - 1) / 2}` }>
                    {#each Array(p.arrows) as _, i}
                      <svg class="arr-svg" style={`--i:${i}; --scale:1`} width="36" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 15L10 9.84985C10.2563 9.57616 10.566 9.35814 10.9101 9.20898C11.2541 9.05983 11.625 8.98291 12 8.98291C12.375 8.98291 12.7459 9.05983 13.0899 9.20898C13.434 9.35814 13.7437 9.57616 14 9.84985L19 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    {/each}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .loadbar {
    position: fixed;
    z-index: 1000002;
    pointer-events: auto;
  }
  .loadbar-inline { pointer-events: auto; }
  
  .bar-wrap {
    max-height: 0;
    opacity: 0;
    transform: translateY(-3px);
    margin-top: 0;
    pointer-events: none; 
    transition: max-height 180ms ease, opacity 160ms ease, transform 180ms ease, margin-top 180ms ease;
  }
  .bar-wrap.visible {
    max-height: 16px; 
    opacity: 1;
    transform: translateY(0);
    margin-top: 10px; 
    pointer-events: auto; 
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
    
    pointer-events: none !important;
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
    overflow: visible; 
    transition: height 160ms ease;
    
    pointer-events: none !important;
  }
  
  .loadbar .track,
  .bar-wrap.visible .track { pointer-events: auto !important; }
  
  .track::before {
    content: "";
    position: absolute; inset: 0;
    background: transparent;
    pointer-events: none;
    z-index: 2;
    transition: background 140ms ease, backdrop-filter 140ms ease;
    backdrop-filter: none;
  }
  
  .loadbar .plate:hover .track::before,
  .loadbar .track:hover::before,
  .bar-wrap.visible .plate:hover .track::before,
  .bar-wrap.visible .track:hover::before {
    background: rgba(0,0,0,0.18);
    backdrop-filter: blur(1.5px);
  }
  
  .track::after {
    content: "";
    position: absolute; left: -12px; right: -12px; top: -16px; bottom: -16px;
    
    background: transparent;
    
    pointer-events: none;
  }
  
  .loadbar-inline .track::after { top: -2px; bottom: -10px; }
  
  .loadbar .track::after,
  .bar-wrap.visible .track::after { pointer-events: auto; }
  .fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: calc(var(--pct, 0) * 1%);
    height: 100%;
    background: #f05123; 
    border-radius: inherit; 
    box-shadow: 0 2px 29px 0 #f05123; 
    transition: box-shadow 160ms ease;
    transform-origin: left center;
    
    pointer-events: none;
    z-index: 1;
  }
  .plate:hover .fill { box-shadow: 0 3px 36px 0 #f05123; }

  
  .fx-layer { position: absolute; inset: -10px 0; z-index: 2; pointer-events: none; overflow: visible; }
  .spark {
    position: absolute; display: block;
    width: var(--sz, 4px); height: 2px; border-radius: 2px;
    transform-origin: center; opacity: 0;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
    animation: sparkFly var(--dur, 900ms) cubic-bezier(0.2, 0.8, 0.2, 1) var(--delay, 0ms) both;
  }
  @keyframes sparkFly {
    0%   { opacity: .95; transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) translate(0, 0); }
    75%  { opacity: .35; }
    100% { opacity: 0;   transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) translate(var(--tx, 0px), var(--ty, 0px)); }
  }
  
  .glitch { position: absolute; inset: 0; opacity: 0; mix-blend-mode: screen; background: repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.0) 3px, rgba(255,255,255,0.0) 6px); pointer-events: none; }
  
  .plate.impact-on[data-ilevel="5"] .glitch { animation: glitchOn 600ms steps(3) both; opacity: .65; }
  .plate.impact-on[data-ilevel="6"] .glitch { animation: glitchOn 900ms steps(4) both; opacity: .9; }
  
  .plate.impact-on[data-boost="1"] .glitch { animation: glitchOn 480ms steps(2) both; opacity: .35; }
  .plate.impact-on[data-boost="2"] .glitch { animation: glitchOn 780ms steps(3) both; opacity: .6; }
  .plate.impact-on[data-boost="3"] .glitch { animation: glitchOn 1000ms steps(4) both; opacity: .85; }
  .plate.impact-on[data-boost="2"] .fx-layer { filter: brightness(1.06) saturate(1.06); }
  .plate.impact-on[data-boost="3"] .fx-layer { filter: brightness(1.09) saturate(1.09); }
  @keyframes glitchOn {
    0% { opacity: 0; clip-path: inset(0 0 100% 0); }
    20% { opacity: .5; clip-path: inset(10% 0 30% 0); transform: translate3d(0,0,0); }
    40% { clip-path: inset(0 0 60% 0); transform: translate3d(1px, -1px, 0); }
    60% { clip-path: inset(30% 0 0 0); transform: translate3d(-1px, 1px, 0); }
    100% { opacity: 0; clip-path: inset(0 0 0 0); }
  }

  
  .plate.impact-on .fill { will-change: transform, box-shadow, filter; }
  
  .plate.impact-on[data-ilevel="1"] .fill { animation: fillImpact1 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  
  .plate.impact-on[data-ilevel="2"] .fill { animation: fillImpact2 1050ms cubic-bezier(0.2, 0.85, 0.2, 1.02) both; }
  
  .plate.impact-on[data-ilevel="3"] .fill { animation: fillImpact3 1200ms cubic-bezier(0.18, 0.9, 0.22, 1.06) both; }
  
  .plate.impact-on[data-ilevel="4"] .fill { animation: fillImpact4 1350ms cubic-bezier(0.18, 0.92, 0.2, 1.1) both; }
  .plate.impact-on[data-ilevel="4"] .track::before { animation: trackPulse4 900ms ease-out both; }
  
  .plate.impact-on[data-ilevel="5"] .fill { animation: fillImpact5 1500ms cubic-bezier(0.16, 0.95, 0.24, 1.12) both; }
  .plate.impact-on[data-ilevel="5"] { animation: plateShake5 680ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  .plate.impact-on[data-ilevel="5"] .track::before { animation: trackPulse5 1050ms ease-out both; }
  
  .plate.impact-on[data-ilevel="6"] .fill { animation: fillImpact6 1700ms cubic-bezier(0.15, 0.98, 0.22, 1.18) both; }
  .plate.impact-on[data-ilevel="6"] { animation: plateShake6 820ms cubic-bezier(0.18, 0.9, 0.2, 1.1) both; }
  .plate.impact-on[data-ilevel="6"] .track::before { animation: trackPulse6 1200ms ease-out both; }
  
  .info {
    position: absolute; inset: -18px 0; 
    display: grid; place-items: center;
    pointer-events: none !important; 
    opacity: 0; transform: translateY(4px) scale(0.98);
    transition: opacity 160ms ease, transform 160ms ease;
    z-index: 3; 
    user-select: none;
  }
  
  .loadbar .plate:hover .info,
  .loadbar .track:hover .info,
  .bar-wrap.visible .plate:hover .info,
  .bar-wrap.visible .track:hover .info { opacity: 1; transform: translateY(0) scale(1); }
  .info-inner {
    padding: 2px 8px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 12px;
    color: #fff;
    text-shadow: 0 1px 0 rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.5);
    letter-spacing: .2px;
    display: inline-flex; gap: 8px; align-items: baseline;
  }
  .info .pct { font-variant-numeric: tabular-nums; }
  .info .rem { opacity: .95; font-weight: 600; }
  
  
  .delta-layer {
    position: absolute;
    left: 0; right: 0;
    top: -12px;
    transform: none;
    height: 0;
    pointer-events: none !important; 
    z-index: 4;
  }
  .delta-layer * { pointer-events: none !important; }
  .delta-layer .stack {
    position: absolute;
    top: 0;
    display: grid;
    gap: 4px;
  }
  /* Выводим всплывашки за пределы бара: слева и справа
     Центруем строго по окну topmenu: используем вычисленный --deltas-shift */
  .delta-layer .stack.left { left: 0; transform: translateX(calc(-100% - 17px)) translateY(calc(var(--deltas-shift, 0px) - var(--delta-half, 12px))); }
  .delta-layer .stack.right { right: 0; transform: translateX(calc(100% + 17px)) translateY(calc(var(--deltas-shift, 0px) - var(--delta-half, 12px))); justify-items: start; }

  .delta {
    position: relative;
    overflow: visible;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 12px;
    background: #111111eb;
    color: #fff;
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 6px 16px rgba(0,0,0,0.35);
    font-weight: 800;
    font-size: 12px;
    line-height: 1;
    text-shadow: 0 1px 0 rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.5);
    
    animation: deltaLifeImpact 4850ms cubic-bezier(0.2, 0.85, 0.2, 1) forwards;
    will-change: transform, opacity, filter;
  }
  
  .loadbar[data-persist="true"] .delta,
  .loadbar-inline[data-persist="true"] .delta {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .delta[data-dir="down"] { animation-name: deltaLifeImpact; }
  .delta .val { letter-spacing: .2px; animation: valImpact 460ms ease-out 80ms both; }

  
  .delta::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 14px;
    background: radial-gradient(closest-side, var(--accent, #69f0ae) 0%, rgba(0,0,0,0) 60%);
    opacity: 0;
    transform: scale(0.6);
    filter: blur(1px);
    pointer-events: none;
    z-index: -1;
    animation: impactWave 520ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
  }
  
  .delta .arrows { position: relative; width: 36px; height: 24px; display: inline-block; overflow: visible; }
  .delta .arr-svg {
    position: absolute; left: 50%; top: 50%;
    display: block;
    width: 36px; height: 24px;
    color: var(--accent, #69f0ae);
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45));
    --rot: 0deg; 
    --scale: 1;
    
    --gap: 5px;
    
    --idx: calc(var(--i, 0) - var(--center-idx, 0));
    --offY: calc(-1 * var(--gap) * var(--idx, 0));
    
    --enterY: 22px;
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(var(--scale, 1)) translateY(calc(var(--offY, 0px) + var(--enterY, 14px)));
    will-change: transform, opacity;
    
    animation: arrowEnter 460ms cubic-bezier(0.18, 0.9, 0.22, 1.15) forwards, arrowPulse 1250ms ease forwards;
    animation-delay: calc(50ms * var(--i, 0)), calc(50ms * var(--i, 0) + 460ms);
  }
  .delta[data-dir="down"] .arr-svg {
    color: var(--accent, #ff8a80);
    --rot: 180deg; 
    
    --offY: calc(1 * var(--gap) * var(--idx, 0));
    
    --enterY: -22px;
    
    animation: arrowEnter 460ms cubic-bezier(0.18, 0.9, 0.22, 1.15) forwards, arrowPulseDown 1250ms ease forwards;
    animation-delay: calc(50ms * var(--i, 0)), calc(50ms * var(--i, 0) + 460ms);
  }
  
  
  @keyframes deltaLifeImpact {
    
    0%   { transform: translateY(14px) scale(0.94); opacity: 0; filter: brightness(1) saturate(1); }
    12%  { transform: translateY(-6px) scale(1.12); opacity: 1; filter: brightness(1.08) saturate(1.05); }
    18%  { transform: translateY(2px)  scale(0.985); opacity: 1; }
    22%  { transform: translateY(0px)  scale(1.06); opacity: 1; }
    26%  { transform: translateY(0px)  scale(1.00); opacity: 1; filter: brightness(1) saturate(1); }
    
    88%  { transform: translateY(-2px) scale(1.00); opacity: 1; }
    
    100% { transform: translateY(-12px) scale(0.99); opacity: 0; }
  }
  @keyframes arrowPulse {
    0% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.06) translateY(calc(var(--offY, 0px) + 8px)); opacity: .88; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.55)); }
    50% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.00) translateY(calc(var(--offY, 0px) - 4px)); opacity: 1; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.5)); }
    100% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.00) translateY(var(--offY, 0px)); opacity: .96; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45)); }
  }
  @keyframes arrowPulseDown {
    0% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.06) translateY(calc(var(--offY, 0px) - 8px)); opacity: .88; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.55)); }
    50% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.00) translateY(calc(var(--offY, 0px) + 4px)); opacity: 1; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.5)); }
    100% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.00) translateY(var(--offY, 0px)); opacity: .96; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45)); }
  }
  
  @keyframes arrowEnter {
    0%   { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(0.88) translateY(calc(var(--offY, 0px) + var(--enterY, 14px))); opacity: 0; filter: drop-shadow(0 0 0 rgba(0,0,0,0.0)); }
    60%  { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.20) translateY(calc(var(--offY, 0px) - 6px)); opacity: 1;   filter: drop-shadow(0 6px 16px rgba(0,0,0,0.6)); }
    82%  { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(0.98) translateY(calc(var(--offY, 0px) + 2px)); }
    100% { transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(1.00) translateY(var(--offY, 0px)); opacity: .98; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45)); }
  }

  @keyframes impactWave {
    0%   { opacity: 0; transform: scale(0.60); filter: blur(2px); }
    18%  { opacity: .75; transform: scale(1.02); filter: blur(1.2px); }
    46%  { opacity: .32; transform: scale(1.25); filter: blur(1.8px); }
    100% { opacity: 0; transform: scale(1.55); filter: blur(2.2px); }
  }

  @keyframes valImpact {
    0%   { letter-spacing: .2px; filter: brightness(1.0) saturate(1.0); text-shadow: 0 1px 0 rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.5); }
    25%  { letter-spacing: .8px; filter: brightness(1.35) saturate(1.1); text-shadow: 0 1px 0 rgba(0,0,0,0.6), 0 3px 10px rgba(0,0,0,0.6); }
    60%  { letter-spacing: .4px; filter: brightness(1.08) saturate(1.05); }
    100% { letter-spacing: .2px; filter: brightness(1.0) saturate(1.0); }
  }

  
  @keyframes fillImpact1 { 
    0% { transform: scaleX(0.985); filter: brightness(1) saturate(1); box-shadow: 0 2px 22px #f05123; }
    38% { transform: scaleX(1.035); filter: brightness(1.06) saturate(1.04); }
    70% { transform: scaleX(0.997); }
    100% { transform: scaleX(1.000); filter: brightness(1) saturate(1); }
  }
  @keyframes fillImpact2 {
    0% { transform: scaleX(0.98); box-shadow: 0 2px 26px #f05123; }
    36% { transform: scaleX(1.06); filter: brightness(1.07) saturate(1.05); }
    66% { transform: scaleX(0.996); }
    100% { transform: scaleX(1.000); }
  }
  @keyframes fillImpact3 {
    0% { transform: scaleX(0.975); box-shadow: 0 2px 30px #f05123; }
    34% { transform: scaleX(1.10); filter: brightness(1.09) saturate(1.06); }
    64% { transform: scaleX(0.992); }
    100% { transform: scaleX(1.000); }
  }
  @keyframes fillImpact4 {
    0% { transform: scaleX(0.97); box-shadow: 0 2px 34px #f05123; }
    32% { transform: scaleX(1.16); filter: brightness(1.12) saturate(1.08); }
    62% { transform: scaleX(0.990); }
    100% { transform: scaleX(1.000); }
  }
  @keyframes fillImpact5 {
    0% { transform: scaleX(0.96); box-shadow: 0 2px 40px #f05123; }
    30% { transform: scaleX(1.25); filter: brightness(1.18) saturate(1.10); }
    60% { transform: scaleX(0.988); }
    100% { transform: scaleX(1.000); }
  }
  @keyframes fillImpact6 {
    0% { transform: scaleX(0.94); box-shadow: 0 2px 46px #f05123; }
    28% { transform: scaleX(1.35); filter: brightness(1.24) saturate(1.14); }
    58% { transform: scaleX(0.985); }
    100% { transform: scaleX(1.000); }
  }

  

  @keyframes trackPulse4 { 0%{background:rgba(0,0,0,0.18)} 40%{background:rgba(255,255,255,0.08)} 100%{background:rgba(0,0,0,0.18)} }
  @keyframes trackPulse5 { 0%{background:rgba(0,0,0,0.2)} 34%{background:rgba(255,255,255,0.12)} 100%{background:rgba(0,0,0,0.2)} }
  @keyframes trackPulse6 { 0%{background:rgba(0,0,0,0.22)} 30%{background:rgba(255,255,255,0.16)} 100%{background:rgba(0,0,0,0.22)} }

  @keyframes plateShake5 {
    0%{transform:translate(0,0)} 12%{transform:translate(1px, -1px)} 24%{transform:translate(-2px, 1px)} 36%{transform:translate(2px, 0)} 48%{transform:translate(-1px, -1px)} 60%{transform:translate(1px, 1px)} 72%{transform:translate(0, -1px)} 84%{transform:translate(-1px, 1px)} 100%{transform:translate(0,0)}
  }
  @keyframes plateShake6 {
    0%{transform:translate(0,0)} 10%{transform:translate(2px, -2px)} 20%{transform:translate(-3px, 1px)} 30%{transform:translate(3px, 0)} 40%{transform:translate(-2px, -2px)} 50%{transform:translate(2px, 2px)} 60%{transform:translate(0, -2px)} 70%{transform:translate(-2px, 2px)} 80%{transform:translate(1px, -1px)} 100%{transform:translate(0,0)}
  }
  
</style>
