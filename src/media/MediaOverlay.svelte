<script>
  import { onMount, createEventDispatcher } from 'svelte';
  export let videoId = 'M7lc1UVf-VE';
  let width = 560;
  let height = 315;
  let posX = 0;
  let posY = 0;
  let frameEl;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let open = true;
  $: src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&playsinline=1&autoplay=1`;
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
      <svg class="media-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12z" />
      </svg>
      <div class="drag-space"></div>
      <button class="media-close" aria-label="Close" on:pointerdown={(e)=>{e.stopPropagation()}} on:click={close}>
        <svg viewBox="0 0 16 16"><path d="M4.646 4.646L8 8l3.354-3.354.708.708L8.707 8.707l3.355 3.355-.708.708L8 9.414l-3.354 3.356-.708-.708L7.293 8.707 3.94 5.354z"/></svg>
      </button>
    </div>
    <iframe
      class="media-iframe"
      src={src}
      width={width}
      height={height}
      title="YouTube player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>
</div>
{/if}

<style>
  .media-overlay{position:fixed;top:0;left:0;z-index:var(--z-popover);pointer-events:auto}
  .media-frame{display:flex;flex-direction:column;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.4),0 0 0 1px var(--wph-primary, rgba(240,81,35,0.85)),0 0 26px var(--wph-primaryGlow, rgba(240,81,35,0.45)),0 0 60px var(--wph-primaryGlow, rgba(240,81,35,0.3))}
  .media-drag{height:26px;background:rgba(255,255,255,0.06);cursor:move;display:flex;align-items:center;gap:8px;justify-content:flex-start;color:var(--wph-primary, #f05123);padding:0 10px}
  .media-icon{width:16px;height:16px;fill:currentColor;opacity:.95}
  .media-iframe{display:block;border:0}
  .drag-space{flex:1}
  .media-close{width:22px;height:22px;border:none;background:transparent;color:rgba(255,255,255,0.9);display:inline-flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer}
  .media-close svg{width:14px;height:14px;fill:currentColor}
</style>
