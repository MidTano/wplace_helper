<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { setStream, hasStream } from './captureManager';
  import { t, lang } from '../i18n';
  export let open = false;
  const dispatch = createEventDispatcher();

  let requesting = false;

  async function requestScreenAccess() {
    requesting = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error(t('screen.modal.errNoGetDisplayMedia'));
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        
        video: { frameRate: 5 },
        
        audio: false,
        
        
        
        
        selfBrowserSurface: 'include',
        preferCurrentTab: true,
        
        
        
        
      });
      
      try { setStream(stream); } catch {}
      dispatch('close');
    } catch (e) {
      
      dispatch('close');
    } finally {
      requesting = false;
    }
  }

  function closeModal() { dispatch('close'); }

  onMount(() => {
    try {
      if (hasStream()) {
        
        dispatch('close');
      }
    } catch {}
  });
  
  $: _i18n_screen_modal_lang = $lang;
</script>

{#if open}
  <div class="screen-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('screen.modal.dialogAria')}>
    <div class="screen-modal">
      <div class="header">
        <div class="icon" aria-hidden="true">
          
          <svg class="on" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
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
        </div>
        <div class="title">{t('screen.modal.title')}</div>
      </div>
      <div class="body">
        <p>{t('screen.modal.body')}</p>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" on:click={closeModal} disabled={requesting}>{t('common.cancel')}</button>
        <button class="btn btn-primary" on:click={requestScreenAccess} disabled={requesting} aria-busy={requesting}>
          {requesting ? t('screen.modal.requesting') : t('common.ok')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .screen-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 1000003; }
  .screen-modal { width: min(520px, calc(100vw - 24px)); border-radius: 16px; background: #121318; color: #fff; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 16px 36px rgba(0,0,0,0.5); padding: 14px 16px 12px; font-size: 14px; line-height: 1.45; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  .header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: #f05123; color: #fff; }
  .title { font-size: 16px; font-weight: 700; }
  .body { color: #e9e9e9; }
  .body p { margin: 6px 0 10px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  .btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid transparent; cursor: pointer; font-weight: 600; font-family: inherit; }
  .btn[disabled] { opacity: 0.7; cursor: default; }
  .btn-primary { background: #f05123; color: #fff; border-color: rgba(255,255,255,0.18); box-shadow: 0 6px 18px rgba(240,81,35,0.35); }
  .btn-primary:hover { filter: brightness(1.05); }
  .btn-secondary { background: rgba(255,255,255,0.95); color: #222; border-color: rgba(0,0,0,0.1); box-shadow: 0 6px 18px rgba(0,0,0,0.25); }
  .btn-secondary:hover { filter: brightness(1.03); }

  
  .icon svg.on { filter: drop-shadow(0 0 4px rgba(240,81,35,0.4)); }
  .icon .ringc { stroke-dasharray: 3 3; }
  .icon svg.on .ring { transform-box: view-box; transform-origin: 12px 12px; animation: sa_spin 4s linear infinite; }
  .icon svg.on .dot { transform-box: view-box; transform-origin: 12px 12px; animation: sa_pulse 2s ease-in-out infinite alternate; }
  .icon svg.on .dots { transform-box: view-box; transform-origin: 12px 12px; fill: #ffe1d6; animation: sa_spin 4s linear infinite; }
  @keyframes sa_pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: .95; } }
  @keyframes sa_spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
</style>
