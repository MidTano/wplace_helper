<script>
  import { onMount, onDestroy } from 'svelte';
  import { hasStream, ensureVideo } from '../screen/captureManager';
  import ScreenAccessModal from '../screen/ScreenAccessModal.svelte';
  import { t, lang } from '../i18n';

  let openModal = false;
  let on = false;

  function updateState() {
    try {
      const v = !!hasStream();
      if (on !== v) on = v;
    } catch { if (on !== false) on = false; }
  }

  function toggle() {
    updateState();
    if (!on) {
      openModal = true;
    }
  }

  function onModalClose() {
    openModal = false;
    updateState();
  }

  onMount(() => {
    updateState();
    function onMessage(ev) {
      const d = ev?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'screenStreamChanged') {
        const v = !!d.has;
        if (on !== v) on = v;
      }
    }
    try { window.addEventListener('message', onMessage); } catch {}
    try { document.addEventListener('visibilitychange', updateState); } catch {}
    return () => { try { window.removeEventListener('message', onMessage); } catch {} };
  });
  onDestroy(() => {
    try { document.removeEventListener('visibilitychange', updateState); } catch {}
  });
  
  $: _i18n_screenaccess_lang = $lang;
  $: L_screen = ($lang, on ? t('screen.status.on') : t('screen.status.off'));
</script>

<div class="tm-screen-wrap" role="group">
  <button class="tm-fab tm-tip {on ? 'tm-screen-on' : 'tm-screen-off'}" data-label={L_screen} aria-label={L_screen} aria-pressed={on} on:click={toggle}>
    
    <svg class:on={on} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <g class="ring">
        <circle class="ringc" cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
      </g>
      <circle class="dot" cx="12" cy="12" r="4" fill="currentColor" />
      <g class="dots">
        <circle cx="12" cy="9" r="0.8" />
        <circle cx="14.121" cy="10.121" r="0.8" />
        <circle cx="15" cy="12" r="0.8" />
        <circle cx="14.121" cy="13.879" r="0.8" />
        <circle cx="12" cy="15" r="0.8" />
        <circle cx="9.879" cy="13.879" r="0.8" />
        <circle cx="9" cy="12" r="0.8" />
        <circle cx="9.879" cy="10.121" r="0.8" />
      </g>
    </svg>
  </button>
  {#if openModal}
    <ScreenAccessModal open on:close={onModalClose} />
  {/if}
</div>

<style>
  .tm-screen-wrap { position: relative; }
  :global(.tm-fab.tm-screen-on) {
    
    background: #f05123;
    color: #fff;
    border-color: rgba(255,255,255,0.25);
    box-shadow: 0 8px 24px rgba(240,81,35,0.45);
  }
  :global(.tm-fab.tm-screen-off) {
    background: rgba(255,255,255,0.95);
    color: #222;
    border-color: rgba(0,0,0,0.1);
    box-shadow: 0 6px 18px rgba(0,0,0,0.28);
  }

  
  svg.on { filter: drop-shadow(0 0 4px rgba(240,81,35,0.4)); }
  
  .ringc { stroke-dasharray: 3 3; }
  svg.on .ring { transform-box: view-box; transform-origin: 12px 12px; will-change: transform; animation: spin 4s linear infinite; }
  svg.on .dot {
    transform-box: view-box;
    transform-origin: 12px 12px;
    will-change: transform, opacity;
    animation: pulse 2s ease-in-out infinite alternate;
  }
  svg.on .dots {
    transform-box: view-box;
    transform-origin: 12px 12px;
    fill: #ffe1d6; 
    will-change: transform;
    animation: spin 4s linear infinite;
  }
  svg:not(.on) .dots { display: none; }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.08); opacity: 0.95; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
</style>
