<script>
  import { createEventDispatcher } from 'svelte';
  import { t, lang } from '../../../i18n';
  export let active = false;
  
  export let titleActive = null;
  export let titleInactive = null;
  const dispatch = createEventDispatcher();
  function handleClick() { dispatch('click'); }
  function onEnter() { dispatch('hoverenter'); }
  function onLeave() { dispatch('hoverleave'); }
  $: _titleActive = titleActive || t('editor.apply');
  $: _titleInactive = titleInactive || t('editor.mode.editPixels');
  
  $: _i18n_mainfab_lang = $lang;
</script>

<button class="fab-edit" class:active={active}
        on:click={handleClick}
        on:mouseenter={onEnter} on:mouseleave={onLeave}
        on:focus={onEnter} on:blur={onLeave}
        title={active ? _titleActive : _titleInactive}
        aria-label={active ? _titleActive : _titleInactive}
        aria-pressed={active}>
  {#if active}
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      
      <path fill="currentColor" d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"></path>
    </svg>
  {:else}
    <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
      
      <rect x="2" y="26" width="28" height="2" />
      <path d="M25.4,9c0.8-0.8,0.8-2,0-2.8c0,0,0,0,0,0l-3.6-3.6c-0.8-0.8-2-0.8-2.8,0c0,0,0,0,0,0l-15,15V24h6.4L25.4,9z M20.4,4L24,7.6
		l-3,3L17.4,7L20.4,4z M6,22v-3.6l10-10l3.6,3.6l-10,10H6z" />
      <rect width="32" height="32" fill="none" />
    </svg>
  {/if}
</button>

<style>
  .fab-edit { width: 44px; height: 44px; border-radius: 50%; background: #f05123; color: #fff; border: none; display: grid; place-items: center; box-shadow: 0 8px 22px rgba(0,0,0,0.35); cursor: pointer; transition: transform .15s ease, filter .15s ease, background .15s ease, color .15s ease, box-shadow .15s ease; }
  .fab-edit:hover { filter: brightness(1.05); transform: translateY(-1px); }
  .fab-edit.active { background: #fff; color: #f05123; box-shadow: 0 8px 24px rgba(240,81,35,0.45); }
</style>
