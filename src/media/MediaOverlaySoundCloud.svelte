<script>
  import { onMount, createEventDispatcher } from 'svelte';
  export let sourceUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
  export let title = 'SoundCloud';
  let width = 360;
  let posX = 0;
  let posY = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let playing = false;
  let duration = 0;
  let current = 0;
  let volume = 1;
  let audioEl;
  let open = true;
  const dispatch = createEventDispatcher();
  $: progress = (duration && isFinite(duration)) ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0;
  $: volPct = Math.max(0, Math.min(100, volume * 100));
  $: isSC = (()=>{ try{ return /https?:\/\/([^/]*\.)?soundcloud\.com\//i.test(sourceUrl) }catch{ return false } })();
  $: embedUrl = (()=> isSC ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(sourceUrl)}&auto_play=true` : '' )();
  function onPointerDown(e){ dragging = true; startX = e.clientX; startY = e.clientY; originX = posX; originY = posY; try{ e.currentTarget.setPointerCapture(e.pointerId); }catch{} }
  function onPointerMove(e){ if(!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; posX = originX + dx; posY = originY + dy; }
  function onPointerUp(e){ dragging = false; try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch{} }
  function fmt(t){ if(!isFinite(t)) return '0:00'; t=Math.max(0,t|0); const m=(t/60)|0; const s=(t%60)|0; return m+":"+(s<10?"0":"")+s }
  function toggle(){ if(!audioEl) return; if(audioEl.paused){ audioEl.play().catch(()=>{}); } else { audioEl.pause(); } }
  function onLoaded(){ try{ duration = audioEl.duration||0; }catch{} }
  function onTime(){ try{ current = audioEl.currentTime||0; playing = !audioEl.paused; }catch{} }
  function onSeek(e){ if(!audioEl) return; const v=+e.target.value; audioEl.currentTime = isFinite(v)?v:0 }
  function onVol(e){ if(!audioEl) return; const v=+e.target.value; volume = Math.min(1,Math.max(0,v)); audioEl.volume = volume }
  function close(){ try{ if(audioEl){ audioEl.pause(); } }catch{} open = false; try{ dispatch('closed') }catch{} }
  onMount(()=>{ try{ const vw = window.innerWidth|0; const vh = window.innerHeight|0; posX = Math.max(8, vw - width - 20); posY = 8 + 120; }catch{} if(sourceUrl && !isSC){ try{ audioEl.volume = volume; audioEl.play().catch(()=>{}); }catch{} } });
</script>

{#if open}
<div class="media-overlay" style={`transform:translate3d(${posX}px,${posY}px,0)`}>
  <div class="media-frame" style={`width:${width}px`}>
    <div class="media-drag" on:pointerdown={onPointerDown} on:pointermove={onPointerMove} on:pointerup={onPointerUp}>
      <svg class="media-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M26,25H16c-0.6,0-1-0.4-1-1V8.1c0-0.5,0.4-0.9,0.9-1C16.3,7,16.7,7,17,7c3.2,0,6.4,2.7,7.5,6.2c0.5-0.1,1-0.2,1.5-0.2 c3.3,0,6,2.7,6,6S29.3,25,26,25z"/>
        <path d="M13,25c-0.6,0-1-0.4-1-1V10c0-0.6,0.4-1,1-1s1,0.4,1,1v14C14,24.6,13.6,25,13,25z"/>
        <path d="M10,24c-0.6,0-1-0.4-1-1v-7c0-0.6,0.4-1,1-1s1,0.4,1,1v7C11,23.6,10.6,24,10,24z"/>
        <path d="M7,25c-0.6,0-1-0.4-1-1V13c0-0.6,0.4-1,1-1s1,0.4,1,1v11C8,24.6,7.6,25,7,25z"/>
        <path d="M4,24c-0.6,0-1-0.4-1-1v-6c0-0.6,0.4-1,1-1s1,0.4,1,1v6C5,23.6,4.6,24,4,24z"/>
        <path d="M1,23c-0.6,0-1-0.4-1-1v-4c0-0.6,0.4-1,1-1s1,0.4,1,1v4C2,22.6,1.6,23,1,23z"/>
      </svg>
      <span class="media-title">{title}</span>
      <div class="drag-space"></div>
      <button class="media-close" aria-label="Close" on:pointerdown={(e)=>{e.stopPropagation()}} on:click={close}>
        <svg viewBox="0 0 16 16"><path d="M4.646 4.646L8 8l3.354-3.354.708.708L8.707 8.707l3.355 3.355-.708.708L8 9.414l-3.354 3.356-.708-.708L7.293 8.707 3.94 5.354z"/></svg>
      </button>
    </div>
    <div class="media-body">
      {#if isSC && embedUrl}
        <iframe class="embed" src={embedUrl} width={width} height={166} scrolling="no" frameborder="no" allow="autoplay" title="SoundCloud player"></iframe>
      {:else if sourceUrl}
        <audio bind:this={audioEl} src={sourceUrl} on:loadedmetadata={onLoaded} on:timeupdate={onTime} on:play={()=>{playing=true}} on:pause={()=>{playing=false}} preload="auto"></audio>
        <div class="seek-wrap">
          <input class="seek" type="range" min="0" max={duration||0} step="0.01" value={current} on:input={onSeek} style={`--p:${progress}%`}>
        </div>
        <div class="controls">
          <div class="ctrl-left">
            <div class="vol-inline">
              <button class="ctrl ctrl-vol" aria-label="Volume" on:click={() => { const last = volume; volume = last > 0 ? 0 : 1; if(audioEl) audioEl.volume = volume; }}>
                {#if volume <= 0.001}
                  <svg viewBox="0 0 16 16"><path d="M8 1H6L2 5H0V11H2L6 15H8V1Z"/><path d="M9.29289 6.20711L11.0858 8L9.29289 9.79289L10.7071 11.2071L12.5 9.41421L14.2929 11.2071L15.7071 9.79289L13.9142 8L15.7071 6.20711L14.2929 4.79289L12.5 6.58579L10.7071 4.79289L9.29289 6.20711Z"/></svg>
                {:else}
                  <svg viewBox="0 0 16 16"><path d="M6 1H8V15H6L2 11H0V5H2L6 1Z"/><path d="M14 8C14 5.79086 12.2091 4 10 4V2C13.3137 2 16 4.68629 16 8C16 11.3137 13.3137 14 10 14V12C12.2091 12 14 10.2091 14 8Z"/><path d="M12 8C12 9.10457 11.1046 10 10 10V6C11.1046 6 12 6.89543 12 8Z"/></svg>
                {/if}
              </button>
              <input class="vol-range vol-inline-range" type="range" min="0" max="1" step="0.01" value={volume} on:input={onVol} style={`--p:${volPct}%`}>
            </div>
          </div>
          <button class="ctrl ctrl-play" aria-label={playing? 'Pause':'Play'} on:click={toggle}>
            {#if playing}
              <svg viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM5 5H7V11H5V5ZM9 5H11V11H9V5Z"/></svg>
            {:else}
              <svg viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM7.5 5H6.5V11H7.5L11 8L7.5 5Z"/></svg>
            {/if}
          </button>
          <div class="ctrl-right">
            <div class="time">{fmt(current)} / {fmt(duration)}</div>
          </div>
        </div>
      {:else}
        <div class="empty">No track</div>
      {/if}
    </div>
  </div>
</div>
{/if}

<style>
  .media-overlay{position:fixed;top:0;left:0;z-index:var(--z-popover);pointer-events:auto}
  .media-frame{display:flex;flex-direction:column;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.4),0 0 0 1px var(--wph-primary, rgba(240,81,35,0.85)),0 0 26px var(--wph-primaryGlow, rgba(240,81,35,0.45)),0 0 60px var(--wph-primaryGlow, rgba(240,81,35,0.3))}
  .media-drag{height:28px;background:rgba(255,255,255,0.06);cursor:move;display:flex;align-items:center;gap:8px;justify-content:flex-start;color:var(--wph-primary, #ff5500);padding:0 12px}
  .media-icon{width:18px;height:18px;fill:currentColor;opacity:.95;flex:0 0 auto}
  .media-title{font-size:12px;color:rgba(255,255,255,0.9)}
  .drag-space{flex:1}
  .media-body{display:flex;flex-direction:column;gap:8px;padding:10px}
  .seek-wrap{padding:4px 8px 0 8px}
  .controls{display:flex;align-items:center;justify-content:space-between;padding:6px 8px 0 8px}
  .ctrl-left{display:flex;align-items:center;gap:8px}
  .ctrl-right{display:flex;align-items:center}
  .ctrl{display:inline-flex;align-items:center;justify-content:center}
  .ctrl-play{width:44px;height:44px;border-radius:999px;background:transparent;color:inherit;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.32);padding:0}
  .ctrl-play svg{width:44px;height:44px;fill:var(--wph-primary, #ff5500)}
  .time{font-size:12px;color:rgba(255,255,255,0.88)}
  .seek{width:100%;height:8px;border-radius:999px;background:linear-gradient(var(--wph-primary, #ff5500) 0 0) 0/var(--p,0%) 100% no-repeat, rgba(255,255,255,0.18);-webkit-appearance:none;appearance:none}
  .seek::-webkit-slider-runnable-track{background:transparent;height:8px;border-radius:999px}
  .seek::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--wph-primary, #ff5500);box-shadow:0 0 0 3px rgba(0,0,0,0.35)}
  .seek::-moz-range-track{background:transparent;height:8px;border-radius:999px}
  .seek::-moz-range-progress{background:var(--wph-primary, #ff5500);height:8px;border-radius:999px}
  .seek::-moz-range-thumb{width:16px;height:16px;border:none;border-radius:50%;background:var(--wph-primary, #ff5500)}
  .ctrl-vol{width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,0.08);border:none;color:var(--wph-primary, #ff5500);cursor:pointer}
  .ctrl-vol svg{width:18px;height:18px;fill:currentColor}
  .vol-inline{display:flex;align-items:center;gap:8px}
  .vol-range{width:96px;height:6px;border-radius:999px;background:linear-gradient(var(--wph-primary, #ff5500) 0 0) 0/var(--p,0%) 100% no-repeat, rgba(255,255,255,0.18);-webkit-appearance:none;appearance:none}
  .vol-range::-webkit-slider-runnable-track{background:transparent;height:6px;border-radius:999px}
  .vol-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--wph-primary, #ff5500);box-shadow:0 0 0 3px rgba(0,0,0,0.35)}
  .vol-range::-moz-range-track{background:transparent;height:6px;border-radius:999px}
  .vol-range::-moz-range-progress{background:var(--wph-primary, #ff5500);height:6px;border-radius:999px}
  .vol-range::-moz-range-thumb{width:14px;height:14px;border:none;border-radius:50%;background:var(--wph-primary, #ff5500)}
  .media-close{width:22px;height:22px;border:none;background:transparent;color:rgba(255,255,255,0.9);display:inline-flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer}
  .media-close svg{width:14px;height:14px;fill:currentColor}
  .empty{color:rgba(255,255,255,0.7);font-size:12px;padding:8px}
</style>
