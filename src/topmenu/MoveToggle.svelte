<script>
  import { onMount, onDestroy } from 'svelte';
  import { t, lang } from '../i18n';
  import { setMoveMode, isMoveMode } from '../overlay/state';
  import { listenWGuardEvent, WGuardEvents } from '../wguard/core/events';

  let on = false;
  let unsubscribe = null;
  
  function toggle() {
    on = !on;
    try { setMoveMode(on); } catch {}
  }
  
  function onMoveEvt(detail) {
    try { on = !!(detail?.on); } catch {}
  }
  
  onMount(() => {
    try { on = isMoveMode && isMoveMode(); } catch {}
    try { unsubscribe = listenWGuardEvent(WGuardEvents.MOVE_MODE, onMoveEvt); } catch {}
  });
  
  onDestroy(() => { try { if (unsubscribe) unsubscribe(); } catch {} });

  
  $: _i18n_move_lang = $lang;
  $: L_move = ($lang, on ? t('btn.move.on') : t('btn.move.off'));
</script>

<button class="tm-fab tm-tip {on ? 'tm-primary' : ''}" type="button" on:click={toggle} aria-pressed={on} aria-label={L_move} data-label={L_move} data-tutorial="move-toggle">
  
  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="25 11 23.59 12.41 26.17 15 17 15 17 5.83 19.59 8.41 21 7 16 2 11 7 12.41 8.41 15 5.83 15 15 5.83 15 8.41 12.41 7 11 2 16 7 21 8.41 19.59 5.83 17 15 17 15 26.17 12.41 23.59 11 25 16 30 21 25 19.59 23.59 17 26.17 17 17 26.17 17 23.59 19.59 25 21 30 16 25 11"/>
    <rect width="32" height="32" fill="none"/>
  </svg>
</button>

<style>
  
</style>
