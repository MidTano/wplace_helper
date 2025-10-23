<script>
  import { onMount, createEventDispatcher } from 'svelte';
  export let videoId = '7560761338419514646';
  let width = 360;
  let height = 640;
  let posX = 0;
  let posY = 0;
  let frameEl;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let open = true;
  let zoom = 1.12;
  $: src = `https://www.tiktok.com/embed/v2/${encodeURIComponent(videoId)}?autoplay=1&loop=1`;
  const dispatch = createEventDispatcher();
  function onPointerDown(e){ dragging = true; startX = e.clientX; startY = e.clientY; originX = posX; originY = posY; try{ e.currentTarget.setPointerCapture(e.pointerId); }catch{} }
  function onPointerMove(e){ if(!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; posX = originX + dx; posY = originY + dy; }
  function onPointerUp(e){ dragging = false; try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch{} }
  onMount(()=>{ try{ const vw = window.innerWidth|0; const vh = window.innerHeight|0; const fw = (frameEl?.offsetWidth|0) || width; const fh = (frameEl?.offsetHeight|0) || (height + 26); posX = Math.max(8, ((vw - fw)/2)|0); posY = Math.max(8, ((vh - fh)/2)|0); }catch{} });
  function close(){ open = false; try{ dispatch('closed') }catch{} }
</script>

{#if open}
<div class="media-overlay" style={`transform:translate3d(${posX}px,${posY}px,0)`}>
  <div class="media-frame" style={`width:${width}px`} bind:this={frameEl}>
    <div class="media-drag" on:pointerdown={onPointerDown} on:pointermove={onPointerMove} on:pointerup={onPointerUp}>
      <svg class="media-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16.656 1.029c1.637-0.025 3.262-0.012 4.886-0.025 0.054 2.031 0.878 3.859 2.189 5.213l-0.002-0.002c1.411 1.271 3.247 2.095 5.271 2.235l0.028 0.002v5.036c-1.912-0.048-3.71-0.489-5.331-1.247l0.082 0.034c-0.784-0.377-1.447-0.764-2.077-1.196l0.052 0.034c-0.012 3.649 0.012 7.298-0.025 10.934-0.103 1.853-0.719 3.543-1.707 4.954l0.020-0.031c-1.652 2.366-4.328 3.919-7.371 4.011l-0.014 0c-0.123 0.006-0.268 0.009-0.414 0.009-1.73 0-3.347-0.482-4.725-1.319l0.040 0.023c-2.508-1.509-4.238-4.091-4.558-7.094l-0.004-0.041c-0.025-0.625-0.037-1.25-0.012-1.862 0.49-4.779 4.494-8.476 9.361-8.476 0.547 0 1.083 0.047 1.604 0.136l-0.056-0.008c0.025 1.849-0.050 3.699-0.050 5.548-0.423-0.153-0.911-0.242-1.42-0.242-1.868 0-3.457 1.194-4.045 2.861l-0.009 0.030c-0.133 0.427-0.21 0.918-0.21 1.426 0 0.206 0.013 0.41 0.037 0.61l-0.002-0.024c0.332 2.046 2.086 3.59 4.201 3.59 0.061 0 0.121-0.001 0.181-0.004l-0.009 0c1.463-0.044 2.733-0.831 3.451-1.994l0.010-0.018c0.267-0.372 0.45-0.822 0.511-1.311l0.001-0.014c0.125-2.237 0.075-4.461 0.087-6.698 0.012-5.036-0.012-10.060 0.025-15.083z"></path>
      </svg>
      <div class="drag-space"></div>
      <button class="media-close" aria-label="Close" on:pointerdown={(e)=>{e.stopPropagation()}} on:click={close}>
        <svg viewBox="0 0 16 16"><path d="M4.646 4.646L8 8l3.354-3.354.708.708L8.707 8.707l3.355 3.355-.708.708L8 9.414l-3.354 3.356-.708-.708L7.293 8.707 3.94 5.354z"/></svg>
      </button>
    </div>
    <div class="iframe-wrap" style={`width:${width}px;height:${height}px`}>
      <iframe
        class="media-iframe"
        src={src}
        width={width}
        height={height}
        title="TikTok video"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        style={`transform:scale(${zoom}) translate(8px,15px);transform-origin:center top;`}
      ></iframe>
    </div>
  </div>
</div>
{/if}

<style>
  .media-overlay{position:fixed;top:0;left:0;z-index:var(--z-popover);pointer-events:auto}
  .media-frame{display:flex;flex-direction:column;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.4),0 0 0 1px var(--wph-primary, rgba(240,81,35,0.85)),0 0 26px var(--wph-primaryGlow, rgba(240,81,35,0.45)),0 0 60px var(--wph-primaryGlow, rgba(240,81,35,0.3))}
  .media-drag{height:26px;background:rgba(255,255,255,0.06);cursor:move;display:flex;align-items:center;gap:8px;justify-content:flex-start;color:var(--wph-primary, #f05123);padding:0 10px}
  .media-icon{width:16px;height:16px;fill:currentColor;opacity:.95}
  .iframe-wrap{overflow:hidden}
  .media-iframe{display:block;border:0}
  .drag-space{flex:1}
  .media-close{width:22px;height:22px;border:none;background:transparent;color:rgba(255,255,255,0.9);display:inline-flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer}
  .media-close svg{width:14px;height:14px;fill:currentColor}
</style>
