<script>
  import { createEventDispatcher } from 'svelte';
  export let shortUrl = '';
  const dispatch = createEventDispatcher();
  let posX = 0;
  let posY = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let frameEl;
  let open = true;
  const width = 500;
  const height = 400;
  function onPointerDown(e){ dragging = true; startX = e.clientX; startY = e.clientY; originX = posX; originY = posY; try{ e.currentTarget.setPointerCapture(e.pointerId); }catch{} }
  function onPointerMove(e){ if(!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; posX = originX + dx; posY = originY + dy; }
  function onPointerUp(e){ dragging = false; try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch{} }
  function close(){ open = false; try{ dispatch('closed') }catch{} }
  function retry(){ try{ dispatch('retry') }catch{} }
  $: {
    if(frameEl && typeof window !== 'undefined'){
      try{
        const vw = window.innerWidth|0;
        const vh = window.innerHeight|0;
        const fw = (frameEl?.offsetWidth|0) || width;
        const fh = (frameEl?.offsetHeight|0) || height;
        posX = Math.max(8, ((vw - fw)/2)|0);
        posY = Math.max(8, ((vh - fh)/2)|0);
      }catch{}
    }
  }
</script>

{#if open}
<div class="captcha-overlay" style={`transform:translate3d(${posX}px,${posY}px,0)`}>
  <div class="captcha-frame" style={`width:${width}px`} bind:this={frameEl}>
    <div class="captcha-drag" on:pointerdown={onPointerDown} on:pointermove={onPointerMove} on:pointerup={onPointerUp}>
      <svg class="captcha-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span class="captcha-title">Verification required</span>
      <div class="drag-space"></div>
      <button class="captcha-close" aria-label="Close" on:pointerdown={(e)=>{e.stopPropagation()}} on:click={close}>
        <svg viewBox="0 0 16 16"><path d="M4.646 4.646L8 8l3.354-3.354.708.708L8.707 8.707l3.355 3.355-.708.708L8 9.414l-3.354 3.356-.708-.708L7.293 8.707 3.94 5.354z"/></svg>
      </button>
    </div>
    <div class="captcha-body">
      <div class="captcha-message">
        Failed to expand short link automatically. Please complete the verification below:
      </div>
      <iframe class="captcha-iframe" src={shortUrl} title="Captcha verification" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
      <div class="captcha-actions">
        <button class="captcha-btn captcha-btn-retry" on:click={retry}>Retry</button>
        <button class="captcha-btn captcha-btn-cancel" on:click={close}>Cancel</button>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
  .captcha-overlay{position:fixed;top:0;left:0;z-index:var(--z-popover);pointer-events:auto}
  .captcha-frame{display:flex;flex-direction:column;background:rgba(0,0,0,0.92);border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.4),0 0 0 1px var(--wph-primary, rgba(240,81,35,0.85)),0 0 26px var(--wph-primaryGlow, rgba(240,81,35,0.45)),0 0 60px var(--wph-primaryGlow, rgba(240,81,35,0.3))}
  .captcha-drag{height:32px;background:rgba(255,255,255,0.08);cursor:move;display:flex;align-items:center;gap:8px;justify-content:flex-start;color:var(--wph-primary, #f05123);padding:0 12px}
  .captcha-icon{width:18px;height:18px;fill:currentColor;opacity:.95}
  .captcha-title{font-size:13px;font-weight:500;color:rgba(255,255,255,0.95)}
  .drag-space{flex:1}
  .captcha-close{width:24px;height:24px;border:none;background:transparent;color:rgba(255,255,255,0.9);display:inline-flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer}
  .captcha-close svg{width:14px;height:14px;fill:currentColor}
  .captcha-body{display:flex;flex-direction:column;gap:12px;padding:16px}
  .captcha-message{font-size:13px;color:rgba(255,255,255,0.9);line-height:1.5}
  .captcha-iframe{width:100%;height:300px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(255,255,255,0.02)}
  .captcha-actions{display:flex;gap:8px;justify-content:flex-end}
  .captcha-btn{padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s}
  .captcha-btn-retry{background:var(--wph-primary, #f05123);color:#fff}
  .captcha-btn-retry:hover{opacity:0.9}
  .captcha-btn-cancel{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.9)}
  .captcha-btn-cancel:hover{background:rgba(255,255,255,0.15)}
</style>
