<script>
  import { onMount } from 'svelte';
  import { hasStream, setStream, stopStream } from '../screen/captureManager';
  import ScreenAccessModal from '../screen/ScreenAccessModal.svelte';
  import { t, lang } from '../i18n';
  let active = false;
  let openModal = false;
  function updateState() { try { active = !!hasStream(); } catch {} }
  async function requestAccess() {
    try {
      const gdm = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
      if (!gdm) return;
      const stream = await gdm({
        video: { frameRate: 5 },
        audio: false,
        selfBrowserSurface: 'include',
        preferCurrentTab: true,
      });
      setStream(stream);
      updateState();
    } catch {}
  }
  function onClick() {
    if (hasStream()) { try { stopStream(); } catch {} updateState(); return; }
    openModal = true;
  }
  function onMsg(ev) {
    const d = ev && ev.data;
    if (!d || d.source !== 'wplace-svelte') return;
    if (d.action === 'screenStreamChanged') { active = !!d.has; }
  }
  onMount(() => {
    updateState();
    try { window.addEventListener('message', onMsg); } catch {}
    return () => { try { window.removeEventListener('message', onMsg); } catch {} };
  });
  $: _i18n_screen_lang = $lang;
  $: label = ($lang, active ? t('screen.status.on') : t('screen.status.off'));
  $: cls = active ? 'tm-screen-on' : 'tm-screen-off';
  function onModalClose() { openModal = false; updateState(); }
</script>

<div class="tm-screen-wrap" role="group">
  <button class="tm-fab tm-tip {cls}" data-label={label} aria-label={label} aria-pressed={active} on:click={onClick}>
    <svg class:on={active} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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
</div>

{#if openModal}
  <ScreenAccessModal open on:close={onModalClose} />
{/if}

<style>
  .tm-screen-wrap { position: relative; }
  :global(.tm-fab.tm-screen-on) {
    background: var(--wph-primary, #f05123);
    color: var(--wph-onPrimary, #fff);
    border-color: var(--wph-border, rgba(255,255,255,0.25));
    box-shadow: 0 8px 24px var(--wph-primaryGlow, rgba(240,81,35,0.45));
  }
  :global(.tm-fab.tm-screen-off) {
    background: var(--wph-surface, rgba(255,255,255,0.95));
    color: var(--wph-text, #222);
    border-color: var(--wph-border, rgba(0,0,0,0.1));
    box-shadow: 0 6px 18px rgba(0,0,0,0.28);
  }
  svg.on { filter: drop-shadow(0 0 4px var(--wph-primaryGlow, rgba(240,81,35,0.4))); }
  .ringc { stroke-dasharray: 3 3; }
  svg.on .ring { transform-box: view-box; transform-origin: 12px 12px; animation: spin 4s linear infinite; }
  svg.on .dot { transform-box: view-box; transform-origin: 12px 12px; animation: pulse 2s ease-in-out infinite alternate; }
  svg.on .dots { transform-box: view-box; transform-origin: 12px 12px; fill: #ffe1d6; animation: spin 4s linear infinite; }
  svg:not(.on) .dots { display: none; }
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.95; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
