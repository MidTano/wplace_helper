<script>
  import { onMount, onDestroy } from 'svelte';
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  import { t, lang } from '../i18n';
  import { addOrUpdate } from './historyStore';
  import { getPalette } from '../editor/palette';
  import { detectService, normalizeUrl } from './qrmusic/normalize';
  import { shorten } from './qrmusic/shortener';
  import { encodeV2 } from './qrmusic/codec';
  import { setSelectedFile, setMoveMode, setCurrentHistoryId } from '../overlay/state';
  import { markElement } from '../wguard';
  let popOpen = false;
  let open = false;
  let enabled = false;
  let url = '';
  let canvasEl;
  let btnEl; let popEl; let posX = 0; let posY = 0;
  let hideTm = 0;
  const FREE32 = getPalette('free').slice(0, 32);
  const ANCH_COLS = [0,5,10,15,20,25,30,31];
  const AC = 16;
  const ANCH_MAP = new Map();
  ANCH_MAP.set('0,0', ANCH_COLS[0]);
  ANCH_MAP.set('4,0', ANCH_COLS[1]);
  ANCH_MAP.set('0,4', ANCH_COLS[2]);
  ANCH_MAP.set('4,4', ANCH_COLS[3]);
  ANCH_MAP.set('2,0', ANCH_COLS[4]);
  ANCH_MAP.set('0,2', ANCH_COLS[5]);
  ANCH_MAP.set('4,2', ANCH_COLS[6]);
  ANCH_MAP.set('2,4', ANCH_COLS[7]);
  ANCH_MAP.set('2,2', AC);
  let lastSymbols = Array(16).fill(0);
  function buildMatrixFromSymbols(sym){ const n=5; const m=[]; for(let y=0;y<n;y++){ m[y]=Array(n).fill(0) } for (const [k,v] of ANCH_MAP){ const parts=k.split(','); const x=Number(parts[0])||0; const y=Number(parts[1])||0; m[y][x]=v%FREE32.length } const coords=[]; for(let y=0;y<5;y++){ const xs = y%2===0 ? [0,1,2,3,4] : [4,3,2,1,0]; for(const x of xs){ const key=`${x},${y}`; if(ANCH_MAP.has(key)) continue; coords.push([x,y]) } } let k=0; for(const p of coords){ const x=p[0], y=p[1]; if(k<sym.length){ m[y][x] = sym[k++]%FREE32.length } } return m }
  function drawSymbols(sym){ try{ const ctx = canvasEl.getContext('2d', { willReadFrequently:true }); const n=5; const scale = 24; const pad = 8; const W = n*scale+pad*2; const H = n*scale+pad*2; canvasEl.width=W; canvasEl.height=H; ctx.clearRect(0,0,W,H); ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(0,0,W,H); const m = buildMatrixFromSymbols(sym||lastSymbols); ctx.imageSmoothingEnabled = false; for(let y=0;y<n;y++){ for(let x=0;x<n;x++){ const c = FREE32[m[y][x]%FREE32.length]; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(pad+x*scale, pad+y*scale, scale, scale); } } lastSymbols = sym }catch{} }
  $: _render = (open, drawSymbols(lastSymbols));
  $: _qrmusic_on = (()=>{ try{ (window)['__wph_qrmusic_on'] = !!enabled }catch{} return enabled })();
  async function onPreview(){ try{ const svc = detectService(url); const urlN = normalizeUrl(url, svc); const sh = await shorten(urlN); if(!sh) return; const { symbols } = encodeV2({ provider: sh.provider, service: svc, slug: sh.slug }); drawSymbols(symbols); }catch{} }
  async function onPlace(){ try{ const svc = detectService(url); const urlN = normalizeUrl(url, svc); const sh = await shorten(urlN); if(!sh) return; const { symbols } = encodeV2({ provider: sh.provider, service: svc, slug: sh.slug }); drawSymbols(symbols); await new Promise(res=>setTimeout(res,0)); const n=5; const small=document.createElement('canvas'); try{ markElement(small) }catch{} small.width=n; small.height=n; const ctx=small.getContext('2d',{ willReadFrequently:true }); if(!ctx) return; ctx.imageSmoothingEnabled=false; const m=buildMatrixFromSymbols(symbols); for(let y=0;y<n;y++){ for(let x=0;x<n;x++){ const c=FREE32[m[y][x]%FREE32.length]; ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x,y,1,1); } } const saveBlob = await new Promise((resolve)=>{ small.toBlob((b)=>resolve(b),'image/png') }); if(!saveBlob) return; const name = `qr_music_${Date.now()}.png`; let file; try{ file = new File([saveBlob], name, { type: 'image/png' }); }catch{ file = saveBlob } const meta = await addOrUpdate(file, name, null); try{ setCurrentHistoryId(meta?.id || null); }catch{} try{ setSelectedFile(file); }catch{} try{ setMoveMode(true); }catch{} open = false }catch{} }
  function closeModal(){ open = false }
  async function updatePosition(){ try{ await Promise.resolve(); const r = btnEl?.getBoundingClientRect?.(); const W = Math.max(0, window.innerWidth||0); const H = Math.max(0, window.innerHeight||0); const pad = 10; const topMenuHeight = 110; const mwRaw = popEl?.offsetWidth||0; const mhRaw = popEl?.offsetHeight||0; const mw = Math.max(200, mwRaw||220); const mh = mhRaw||64; const nx = Math.max(pad, Math.min(Math.round((r?.left||0)+(r?.width||0)/2 - mw/2), W - mw - pad)); let ny = Math.round((r?.bottom||0)+8); if(ny+mh>H-pad){ ny = Math.max(topMenuHeight+pad, H - mh - pad) } ny = Math.max(topMenuHeight+pad, ny); posX = nx; posY = ny }catch{} }
  function openPopover(){ try{ if(hideTm){ clearTimeout(hideTm); hideTm=0 } }catch{} popOpen = true; updatePosition() }
  function scheduleHide(){ try{ if(hideTm){ clearTimeout(hideTm); } hideTm = setTimeout(()=>{ popOpen = false; hideTm = 0 }, 150) }catch{} }
  $: _i18n_lang = $lang;
  $: L_btn = ($lang, t('btn.qrMusic'));
  $: L_add = ($lang, t('qrmusic.add'));

  let _blocker = null;
  onMount(()=>{
    try{
      _blocker = (ev)=>{ try{ if(!enabled){ if(ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation(); if(ev && ev.preventDefault) ev.preventDefault(); } }catch{} };
      window.addEventListener('tutorial:map-pixel-clicked', _blocker, true);
    }catch{}
  });
  onDestroy(()=>{ try{ if(_blocker){ window.removeEventListener('tutorial:map-pixel-clicked', _blocker, true); _blocker = null } }catch{} });
</script>

<div class="tm-qrmusic-wrap" role="group">
  <button bind:this={btnEl} class="tm-fab tm-tip" aria-label={L_btn} data-label={L_btn} aria-pressed={enabled} on:mouseenter={openPopover} on:mouseleave={scheduleHide} on:focus={openPopover} on:blur={scheduleHide} on:click={()=>{ enabled = !enabled }} class:tm-primary={enabled}>
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M25,4H10A2.002,2.002,0,0,0,8,6V20.5563A3.9551,3.9551,0,0,0,6,20a4,4,0,1,0,4,4V12H25v8.5562A3.9545,3.9545,0,0,0,23,20a4,4,0,1,0,4,4V6A2.0023,2.0023,0,0,0,25,4ZM6,26a2,2,0,1,1,2-2A2.0023,2.0023,0,0,1,6,26Zm17,0a2,2,0,1,1,2-2A2.0027,2.0027,0,0,1,23,26ZM10,6H25v4H10Z"/>
    </svg>
  </button>
  {#if popOpen}
    <div use:appendToBody bind:this={popEl} class="tm-qrmusic-popover" role="menu" tabindex="0" style={`left:${posX}px; top:${posY}px`} on:mouseenter={openPopover} on:mouseleave={scheduleHide}>
      <button class="editor-btn editor-primary add-btn" on:click={()=>{ popOpen=false; open=true; }}>{L_add}</button>
    </div>
  {/if}

  {#if open}
    <div use:appendToBody class="qrmusic-backdrop">
      <button class="backdrop-close" aria-label={t('common.close')} on:click={closeModal} on:keydown={(e)=>{ if(e.key==='Escape'||e.key==='Enter'||e.key===' '){ e.preventDefault(); closeModal(); } }}></button>
      <div class="qrmusic-modal" role="dialog" aria-label={L_btn}>
        <div class="modal-head">
          <div class="title">{L_btn}</div>
          <button class="modal-close" aria-label={t('common.close')} on:click={closeModal}>
            <svg viewBox="0 0 16 16"><path d="M4.646 4.646L8 8l3.354-3.354.708.708L8.707 8.707l3.355 3.355-.708.708L8 9.414l-3.354 3.356-.708-.708L7.293 8.707 3.94 5.354z"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="preview"><canvas bind:this={canvasEl} width="160" height="160"></canvas></div>
          <div class="supported-title">{t('qrmusic.supported')}</div>
          <div class="links-list">
            <div class="link-row">
              <svg class="brand" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12z" />
              </svg>
              <span class="link-url">https://youtu.be/VIDEO_ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12z" />
              </svg>
              <span class="link-url">https://www.youtube.com/watch?v=VIDEO_ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12z" />
              </svg>
              <span class="link-url">https://music.youtube.com/watch?v=VIDEO_ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12z" />
              </svg>
              <span class="link-url">https://www.youtube.com/shorts/ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M16.656 1.029c1.637-0.025 3.262-0.012 4.886-0.025 0.054 2.031 0.878 3.859 2.189 5.213l-0.002-0.002c1.411 1.271 3.247 2.095 5.271 2.235l0.028 0.002v5.036c-1.912-0.048-3.71-0.489-5.331-1.247l0.082 0.034c-0.784-0.377-1.447-0.764-2.077-1.196l0.052 0.034c-0.012 3.649 0.012 7.298-0.025 10.934-0.103 1.853-0.719 3.543-1.707 4.954l0.020-0.031c-1.652 2.366-4.328 3.919-7.371 4.011l-0.014 0c-0.123 0.006-0.268 0.009-0.414 0.009-1.73 0-3.347-0.482-4.725-1.319l0.040 0.023c-2.508-1.509-4.238-4.091-4.558-7.094l-0.004-0.041c-0.025-0.625-0.037-1.25-0.012-1.862 0.49-4.779 4.494-8.476 9.361-8.476 0.547 0 1.083 0.047 1.604 0.136l-0.056-0.008c0.025 1.849-0.050 3.699-0.050 5.548-0.423-0.153-0.911-0.242-1.42-0.242-1.868 0-3.457 1.194-4.045 2.861l-0.009 0.030c-0.133 0.427-0.21 0.918-0.21 1.426 0 0.206 0.013 0.41 0.037 0.61l-0.002-0.024c0.332 2.046 2.086 3.59 4.201 3.59 0.061 0 0.121-0.001 0.181-0.004l-0.009 0c1.463-0.044 2.733-0.831 3.451-1.994l0.010-0.018c0.267-0.372 0.45-0.822 0.511-1.311l0.001-0.014c0.125-2.237 0.075-4.461 0.087-6.698 0.012-5.036-0.012-10.060 0.025-15.083z"></path>
              </svg>
              <span class="link-url">https://www.tiktok.com/@user/video/ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M16.656 1.029c1.637-0.025 3.262-0.012 4.886-0.025 0.054 2.031 0.878 3.859 2.189 5.213l-0.002-0.002c1.411 1.271 3.247 2.095 5.271 2.235l0.028 0.002v5.036c-1.912-0.048-3.71-0.489-5.331-1.247l0.082 0.034c-0.784-0.377-1.447-0.764-2.077-1.196l0.052 0.034c-0.012 3.649 0.012 7.298-0.025 10.934-0.103 1.853-0.719 3.543-1.707 4.954l0.020-0.031c-1.652 2.366-4.328 3.919-7.371 4.011l-0.014 0c-0.123 0.006-0.268 0.009-0.414 0.009-1.73 0-3.347-0.482-4.725-1.319l0.040 0.023c-2.508-1.509-4.238-4.091-4.558-7.094l-0.004-0.041c-0.025-0.625-0.037-1.25-0.012-1.862 0.49-4.779 4.494-8.476 9.361-8.476 0.547 0 1.083 0.047 1.604 0.136l-0.056-0.008c0.025 1.849-0.050 3.699-0.050 5.548-0.423-0.153-0.911-0.242-1.42-0.242-1.868 0-3.457 1.194-4.045 2.861l-0.009 0.030c-0.133 0.427-0.21 0.918-0.21 1.426 0 0.206 0.013 0.41 0.037 0.61l-0.002-0.024c0.332 2.046 2.086 3.59 4.201 3.59 0.061 0 0.121-0.001 0.181-0.004l-0.009 0c1.463-0.044 2.733-0.831 3.451-1.994l0.010-0.018c0.267-0.372 0.45-0.822 0.511-1.311l0.001-0.014c0.125-2.237 0.075-4.461 0.087-6.698 0.012-5.036-0.012-10.060 0.025-15.083z"></path>
              </svg>
              <span class="link-url">https://vt.tiktok.com/CODE/</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M16.656 1.029c1.637-0.025 3.262-0.012 4.886-0.025 0.054 2.031 0.878 3.859 2.189 5.213l-0.002-0.002c1.411 1.271 3.247 2.095 5.271 2.235l0.028 0.002v5.036c-1.912-0.048-3.71-0.489-5.331-1.247l0.082 0.034c-0.784-0.377-1.447-0.764-2.077-1.196l0.052 0.034c-0.012 3.649 0.012 7.298-0.025 10.934-0.103 1.853-0.719 3.543-1.707 4.954l0.020-0.031c-1.652 2.366-4.328 3.919-7.371 4.011l-0.014 0c-0.123 0.006-0.268 0.009-0.414 0.009-1.73 0-3.347-0.482-4.725-1.319l0.040 0.023c-2.508-1.509-4.238-4.091-4.558-7.094l-0.004-0.041c-0.025-0.625-0.037-1.25-0.012-1.862 0.49-4.779 4.494-8.476 9.361-8.476 0.547 0 1.083 0.047 1.604 0.136l-0.056-0.008c0.025 1.849-0.050 3.699-0.050 5.548-0.423-0.153-0.911-0.242-1.42-0.242-1.868 0-3.457 1.194-4.045 2.861l-0.009 0.030c-0.133 0.427-0.21 0.918-0.21 1.426 0 0.206 0.013 0.41 0.037 0.61l-0.002-0.024c0.332 2.046 2.086 3.59 4.201 3.59 0.061 0 0.121-0.001 0.181-0.004l-0.009 0c1.463-0.044 2.733-0.831 3.451-1.994l0.010-0.018c0.267-0.372 0.45-0.822 0.511-1.311l0.001-0.014c0.125-2.237 0.075-4.461 0.087-6.698 0.012-5.036-0.012-10.060 0.025-15.083z"></path>
              </svg>
              <span class="link-url">https://vm.tiktok.com/CODE/</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M26,25H16c-0.6,0-1-0.4-1-1V8.1c0-0.5,0.4-0.9,0.9-1C16.3,7,16.7,7,17,7c3.2,0,6.4,2.7,7.5,6.2c0.5-0.1,1-0.2,1.5-0.2 c3.3,0,6,2.7,6,6S29.3,25,26,25z"/>
                <path d="M13,25c-0.6,0-1-0.4-1-1V10c0-0.6,0.4-1,1-1s1,0.4,1,1v14C14,24.6,13.6,25,13,25z"/>
                <path d="M10,24c-0.6,0-1-0.4-1-1v-7c0-0.6,0.4-1,1-1s1,0.4,1,1v7C11,23.6,10.6,24,10,24z"/>
                <path d="M7,25c-0.6,0-1-0.4-1-1V13c0-0.6,0.4-1,1-1s1,0.4,1,1v11C8,24.6,7.6,25,7,25z"/>
                <path d="M4,24c-0.6,0-1-0.4-1-1v-6c0-0.6,0.4-1,1-1s1,0.4,1,1v6C5,23.6,4.6,24,4,24z"/>
                <path d="M1,23c-0.6,0-1-0.4-1-1v-4c0-0.6,0.4-1,1-1s1,0.4,1,1v4C2,22.6,1.6,23,1,23z"/>
              </svg>
              <span class="link-url">https://soundcloud.com/artist/track</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M26,25H16c-0.6,0-1-0.4-1-1V8.1c0-0.5,0.4-0.9,0.9-1C16.3,7,16.7,7,17,7c3.2,0,6.4,2.7,7.5,6.2c0.5-0.1,1-0.2,1.5-0.2 c3.3,0,6,2.7,6,6S29.3,25,26,25z"/>
                <path d="M13,25c-0.6,0-1-0.4-1-1V10c0-0.6,0.4-1,1-1s1,0.4,1,1v14C14,24.6,13.6,25,13,25z"/>
                <path d="M10,24c-0.6,0-1-0.4-1-1v-7c0-0.6,0.4-1,1-1s1,0.4,1,1v7C11,23.6,10.6,24,10,24z"/>
                <path d="M7,25c-0.6,0-1-0.4-1-1V13c0-0.6,0.4-1,1-1s1,0.4,1,1v11C8,24.6,7.6,25,7,25z"/>
                <path d="M4,24c-0.6,0-1-0.4-1-1v-6c0-0.6,0.4-1,1-1s1,0.4,1,1v6C5,23.6,4.6,24,4,24z"/>
                <path d="M1,23c-0.6,0-1-0.4-1-1v-4c0-0.6,0.4-1,1-1s1,0.4,1,1v4C2,22.6,1.6,23,1,23z"/>
              </svg>
              <span class="link-url">https://on.soundcloud.com/CODE</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/>
              </svg>
              <span class="link-url">https://open.spotify.com/track/ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/>
              </svg>
              <span class="link-url">https://open.spotify.com/album/ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/>
              </svg>
              <span class="link-url">https://open.spotify.com/playlist/ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/>
              </svg>
              <span class="link-url">https://open.spotify.com/artist/ID</span>
            </div>
            <div class="link-row">
              <svg class="brand" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.915,8.865 C6.692,6.951 1.375,6.775 -1.703,7.709 C-2.197,7.858 -2.719,7.58 -2.869,7.085 C-3.019,6.591 -2.74,6.069 -2.246,5.919 C1.287,4.846 7.159,5.053 10.87,7.256 C11.314,7.52 11.46,8.094 11.196,8.538 C10.934,8.982 10.358,9.129 9.915,8.865 Z M9.81,11.7 C9.584,12.067 9.104,12.182 8.737,11.957 C6.05,10.305 1.952,9.827 -1.227,10.792 C-1.64,10.916 -2.075,10.684 -2.2,10.272 C-2.324,9.86 -2.092,9.425 -1.68,9.3 C1.951,8.198 6.466,8.732 9.553,10.629 C9.92,10.854 10.035,11.334 9.81,11.7 Z M8.586,14.423 C8.406,14.717 8.023,14.81 7.729,14.63 C5.381,13.195 2.425,12.871 -1.056,13.666 C-1.391,13.743 -1.726,13.533 -1.802,13.197 C-1.879,12.862 -1.67,12.528 -1.333,12.451 C2.476,11.58 5.743,11.955 8.379,13.566 C8.673,13.746 8.766,14.129 8.586,14.423 Z M4,0 C-1.523,0 -6,4.477 -6,10 C-6,15.523 -1.523,20 4,20 C9.523,20 14,15.523 14,10 C14,4.478 9.523,0.001 4,0.001 Z"/>
              </svg>
              <span class="link-url">https://spotify.link/CODE</span>
            </div>
          </div>
          <input class="url" type="text" bind:value={url} placeholder={t('qrmusic.placeholder')} on:input={()=>{ /* noop for preview */ }} />
          <div class="actions">
            <button class="secondary-btn" disabled={!url || !url.trim()} on:click={onPreview}>{t('common.preview') || 'Предпросмотр'}</button>
            <button class="primary-btn" disabled={!url || !url.trim()} on:click={onPlace}>{t('qrmusic.place')}</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tm-qrmusic-wrap{position:relative;display:inline-flex}
  .tm-qrmusic-popover{position:fixed;background:var(--wph-surface, rgba(17,17,17,0.96));color:var(--wph-text,#fff);border:1px solid var(--wph-border, rgba(255,255,255,0.15));border-radius:10px;padding:8px;min-width:160px;box-shadow:0 12px 28px rgba(0,0,0,0.45);backdrop-filter:blur(6px);z-index:1000011;display:flex;justify-content:center}
  .tm-qrmusic-popover .add-btn{padding:6px 12px;border-radius:8px}
  .qrmusic-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000011}
  .qrmusic-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 60px));max-height:min(86vh, 760px);background:var(--wph-surface, rgba(10,12,16,0.96));border:1px solid rgba(255,255,255,0.14);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.55);color:#fff;display:flex;flex-direction:column;overflow:hidden}
  .modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.12)}
  .title{font-weight:600}
  .modal-close{width:28px;height:28px;border:none;background:transparent;color:#fff;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer}
  .modal-close svg{width:16px;height:16px;fill:currentColor}
  .modal-body{display:grid;gap:12px;padding:16px;grid-template-columns:200px 1fr;grid-auto-rows:min-content;align-items:start}
  .preview{display:flex;justify-content:center;align-items:center;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.03);padding:10px;grid-column:1;grid-row:1 / span 6}
  .supported-title{grid-column:2;font-size:14px;font-weight:700;color:rgba(255,255,255,0.98);margin-top:2px}
  .links-list{grid-column:2;display:grid;gap:8px}
  .link-row{display:flex;align-items:center;gap:10px}
  .brand{width:26px;height:16px;fill:currentColor;color:rgba(255,255,255,0.9);flex:0 0 auto}
  .link-url{color:rgba(255,255,255,0.75);font-size:12px;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;word-break:break-all}
  .url{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--wph-border, rgba(255,255,255,0.18));background:var(--wph-surface, rgba(255,255,255,0.06));color:#fff;outline:none;font-size:13px}
  .url:focus{border-color:var(--wph-primary, #f05123);box-shadow:0 0 0 2px var(--wph-primaryGlow, rgba(240,81,35,0.2))}
  .actions{display:flex;justify-content:flex-end;grid-column:2;margin-top:4px}
  .secondary-btn{padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer}
  .secondary-btn:hover{filter:brightness(1.06)}
  .secondary-btn:disabled{opacity:.5;cursor:not-allowed}
  .primary-btn{padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:var(--wph-primary, #f05123);color:var(--wph-onPrimary, #fff);cursor:pointer;box-shadow:0 8px 24px var(--wph-primaryGlow, rgba(240,81,35,0.45));font-weight:600}
  .primary-btn:hover{filter:brightness(1.05)}
  .primary-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
</style>
