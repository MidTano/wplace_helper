<script>
  import { onMount, createEventDispatcher } from 'svelte';
  export let sourceUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  export let title = 'Spotify';
  let width = 360;
  let posX = 0;
  let posY = 0;
  let frameEl;
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
  $: isSpotify = (()=>{ try{ return /https?:\/\/([^/]*\.)?open\.spotify\.com\//i.test(sourceUrl) || /https?:\/\/spotify\.link\//i.test(sourceUrl) }catch{ return false } })();
  $: embedUrl = (()=>{ if(!isSpotify) return ''; try{ const u = new URL(sourceUrl); const parts = u.pathname.split('/').filter(Boolean); const kinds=['track','album','playlist','artist']; let kind=''; let id=''; for(let i=0;i<parts.length;i++){ if(kinds.includes(parts[i])){ kind=parts[i]; id=parts[i+1]||''; break } } if(kind && id){ return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&autoplay=1` } }catch{} return '' })();
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
  onMount(()=>{ try{ const vw = window.innerWidth|0; const vh = window.innerHeight|0; const fw = (frameEl?.offsetWidth|0) || width; const fh = (frameEl?.offsetHeight|0) || (232 + 28); posX = Math.max(8, ((vw - fw)/2)|0); posY = Math.max(8, ((vh - fh)/2)|0); }catch{} if(sourceUrl && !isSpotify){ try{ audioEl.volume = volume; audioEl.play().catch(()=>{}); }catch{} } });
</script>

{#if open}
<div class="media-overlay" style={`transform:translate3d(${posX}px,${posY}px,0)`}>
  <div class="media-frame" style={`width:${width}px`} bind:this={frameEl}>
    <div class="media-drag" on:pointerdown={onPointerDown} on:pointermove={onPointerMove} on:pointerup={onPointerUp}>
      <svg class="media-icon" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/>
      </svg>
      <span class="media-title">{title}</span>
      <div class="drag-space"></div>
      <button class="media-close" aria-label="Close" on:pointerdown={(e)=>{e.stopPropagation()}} on:click={close}>
        <svg viewBox="0 0 16 16"><path d="M4.646 4.646L8 8l3.354-3.354.708.708L8.707 8.707l3.355 3.355-.708.708L8 9.414l-3.354 3.356-.708-.708L7.293 8.707 3.94 5.354z"/></svg>
      </button>
    </div>
    <div class="media-body">
      {#if isSpotify && embedUrl}
        <iframe
          class="embed"
          style={`border-radius:12px`}
          src={embedUrl}
          width={width}
          height={232}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          title="Spotify player"
          loading="lazy"
        ></iframe>
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
  .media-drag{height:28px;background:rgba(255,255,255,0.06);cursor:move;display:flex;align-items:center;gap:8px;justify-content:flex-start;color:var(--wph-primary, #1DB954);padding:0 12px}
  .media-icon{width:30px;height:18px;fill:currentColor;opacity:.95;flex:0 0 auto}
  .media-title{font-size:12px;color:rgba(255,255,255,0.9)}
  .drag-space{flex:1}
  .media-body{display:flex;flex-direction:column;gap:8px;padding:10px}
  .seek-wrap{padding:4px 8px 0 8px}
  .controls{display:flex;align-items:center;justify-content:space-between;padding:6px 8px 0 8px}
  .ctrl-left{display:flex;align-items:center;gap:8px}
  .ctrl-right{display:flex;align-items:center}
  .ctrl{display:inline-flex;align-items:center;justify-content:center}
  .ctrl-play{width:44px;height:44px;border-radius:999px;background:transparent;color:inherit;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.32);padding:0}
  .ctrl-play svg{width:44px;height:44px;fill:var(--wph-primary, #1DB954)}
  .time{font-size:12px;color:rgba(255,255,255,0.88)}
  .seek{width:100%;height:8px;border-radius:999px;background:linear-gradient(var(--wph-primary, #1DB954) 0 0) 0/var(--p,0%) 100% no-repeat, rgba(255,255,255,0.18);-webkit-appearance:none;appearance:none}
  .seek::-webkit-slider-runnable-track{background:transparent;height:8px;border-radius:999px}
  .seek::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--wph-primary, #1DB954);box-shadow:0 0 0 3px rgba(0,0,0,0.35)}
  .seek::-moz-range-track{background:transparent;height:8px;border-radius:999px}
  .seek::-moz-range-progress{background:var(--wph-primary, #1DB954);height:8px;border-radius:999px}
  .seek::-moz-range-thumb{width:16px;height:16px;border:none;border-radius:50%;background:var(--wph-primary, #1DB954)}
  .ctrl-vol{width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,0.08);border:none;color:var(--wph-primary, #1DB954);cursor:pointer}
  .ctrl-vol svg{width:18px;height:18px;fill:currentColor}
  .vol-inline{display:flex;align-items:center;gap:8px}
  .vol-range{width:96px;height:6px;border-radius:999px;background:linear-gradient(var(--wph-primary, #1DB954) 0 0) 0/var(--p,0%) 100% no-repeat, rgba(255,255,255,0.18);-webkit-appearance:none;appearance:none}
  .vol-range::-webkit-slider-runnable-track{background:transparent;height:6px;border-radius:999px}
  .vol-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--wph-primary, #1DB954);box-shadow:0 0 0 3px rgba(0,0,0,0.35)}
  .vol-range::-moz-range-track{background:transparent;height:6px;border-radius:999px}
  .vol-range::-moz-range-progress{background:var(--wph-primary, #1DB954);height:6px;border-radius:999px}
  .vol-range::-moz-range-thumb{width:14px;height:14px;border:none;border-radius:50%;background:var(--wph-primary, #1DB954)}
  .media-close{width:22px;height:22px;border:none;background:transparent;color:rgba(255,255,255,0.9);display:inline-flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer}
  .media-close svg{width:14px;height:14px;fill:currentColor}
  .empty{color:rgba(255,255,255,0.7);font-size:12px;padding:8px}
</style>
