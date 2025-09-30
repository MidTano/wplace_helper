<script>
  import { t, lang } from '../i18n';
  import { playTvShutdown } from '../effects/Shutdown';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  $: _i18n_close_lang = $lang;
  function handleClick(e) {
    if (e && e.shiftKey) {
      try { playTvShutdown(1100); } catch {}
      return;
    }
    dispatch('collapse');
  }
  function handleContextMenu(e) {
    if (e && e.shiftKey) {
      try { e.preventDefault(); playTvShutdown(1100); } catch {}
    }
  }
</script>

<button class="tm-fab tm-danger" aria-label={t('btn.close')} data-label={t('btn.close')} on:click={handleClick} on:contextmenu={handleContextMenu}>
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="currentColor" d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
</button>
