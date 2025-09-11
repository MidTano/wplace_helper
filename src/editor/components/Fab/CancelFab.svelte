<script>
  import { createEventDispatcher } from 'svelte';
  import { t, lang } from '../../../i18n';
  export let visible = false;
  const dispatch = createEventDispatcher();
  function handleClick() { dispatch('click'); }
  function onEnter() { dispatch('hoverenter'); }
  function onLeave() { dispatch('hoverleave'); }
  
  $: _i18n_cancelfab_lang = $lang;
</script>

<button class="fab-cancel" class:visible={visible} on:click={handleClick}
        on:mouseenter={onEnter} on:mouseleave={onLeave}
        on:focus={onEnter} on:blur={onLeave}
        title={t('common.cancel')} aria-label={t('common.cancel')}>
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="currentColor" d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
</button>

<style>
  .fab-cancel { position: absolute; right: 2px; top: 0; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.95); color: #222; border: 1px solid rgba(0,0,0,0.1); display: grid; place-items: center; box-shadow: 0 6px 18px rgba(0,0,0,0.28); cursor: pointer; opacity: 0; transform: translateY(8px); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
  .fab-cancel.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .fab-cancel:hover { filter: brightness(1.03); }
</style>
