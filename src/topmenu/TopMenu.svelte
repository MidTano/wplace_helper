<script>
  export let onPick;
  export let onClear;
  import { createEventDispatcher } from 'svelte';
  import AccountStats from './AccountStats.svelte';
  import Language from './Language.svelte';
  import History from './History.svelte';
  import CopyArt from './CopyArt.svelte';
  import MoveToggle from './MoveToggle.svelte';
  import EnhancedColors from './EnhancedColors.svelte';
  import ScreenAccess from './ScreenAccess.svelte';
  import AutoMode from './AutoMode.svelte';
  import Settings from './Settings.svelte';
  import Discord from './Discord.svelte';
  import Close from './Close.svelte';
  import LoadBar from './LoadBar.svelte';
  import { t, lang } from '../i18n';
  const dispatch = createEventDispatcher();
  
  $: L_pick = ($lang, t('btn.pickImage'));
  $: L_clear = ($lang, t('btn.clear'));
</script>

<div class="topmenu-root" role="toolbar" aria-label={t('topmenu.toolbar')}>
  <div class="topmenu-bar">
    <div class="tm-row">
      <div class="tm-group" aria-label={t('topmenu.group.stats')}>
      <AccountStats />
      </div>

    
      <div class="tm-group" aria-label={t('topmenu.group.art')}>
      <button class="tm-fab tm-primary tm-tip" type="button" on:click={onPick} aria-label={L_pick} data-label={L_pick}>
        <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
          <path d="M19,14a3,3,0,1,0-3-3A3,3,0,0,0,19,14Zm0-4a1,1,0,1,1-1,1A1,1,0,0,1,19,10Z"/>
          
          <path d="M26,4H6A2,2,0,0,0,4,6V26a2,2,0,0,0,2,2H26a2,2,0,0,0,2,-2V6A2,2,0,0,0,26,4Zm0,22H6V20l5-5,5.59,5.59a2,2,0,0,0,2.82,0L21,19l5,5Zm0-4.83-3.59-3.59a2,2,0,0,0-2.82,0L18,19.17l-5.59-5.59a2,2,0,0,0-2.82,0L6,17.17V6H26Z"/>
        </svg>
      </button>
      <MoveToggle />
      <button class="tm-fab tm-tip" type="button" on:click={onClear} aria-label={L_clear} data-label={L_clear}>
        <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
          <rect x="12" y="12" width="2" height="12"/>
          <rect x="18" y="12" width="2" height="12"/>
          <path d="M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z"/>
          <rect x="12" y="2" width="8" height="2"/>
        </svg>
      </button>
        <CopyArt on:copy={(e)=>dispatch('copyArt')}/>
        <History on:load={(e)=>dispatch('historyLoad', e.detail)} />
      </div>

    
      <div class="tm-group" aria-label={t('topmenu.group.tools')}>
      <ScreenAccess />
      <EnhancedColors />
      <AutoMode />
      </div>

    
      <div class="tm-group" aria-label={t('topmenu.group.settings')}>
      <Settings />
      <Language />
      </div>

      
      <div class="tm-group" aria-label="Discord">
      <Discord />
      </div>

    
      <div class="tm-group tm-end" aria-label={t('topmenu.group.close')}>
      <Close />
      </div>
    </div>
    <LoadBar inline={true} />
  </div>
</div>

<style>
  .topmenu-root {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000002;
    pointer-events: auto;
    font-size: 12px;
    line-height: 1.4;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: #fff;
  }
  .topmenu-bar {
    display: flex;
    flex-direction: column;
    row-gap: 0;
    background: rgba(24,26,32,0.88);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 6px 10px 8px 10px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.35);
  }
  .tm-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tm-group { display: flex; align-items: center; gap: 8px; }
  .tm-group + .tm-group { margin-left: 14px; }
  .tm-end { margin-left: auto; }
  :global(.tm-fab) {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    color: #222;
    border: 1px solid rgba(0,0,0,0.1);
    display: grid;
    place-items: center;
    box-shadow: 0 6px 18px rgba(0,0,0,0.28);
    cursor: pointer;
    transition: filter .15s ease, transform .15s ease, background .15s ease, color .15s ease, box-shadow .15s ease;
  }
  :global(.tm-fab:hover) { filter: brightness(1.03); transform: translateY(-1px); }
  :global(.tm-fab:focus-visible) { outline: 2px solid #f05123; outline-offset: 1px; }
  :global(.tm-fab svg) { display: block; }
  :global(.tm-fab.tm-primary) { background: #f05123; color: #fff; border-color: rgba(255,255,255,0.25); box-shadow: 0 8px 24px rgba(240,81,35,0.45); }
  :global(.tm-fab.tm-primary:hover) { filter: brightness(1.05); }
  
  :global(.tm-fab.tm-danger) { background: #e53935; color: #fff; border-color: rgba(255,255,255,0.25); box-shadow: 0 8px 24px rgba(229,57,53,0.45); }
  :global(.tm-fab.tm-danger:hover) { filter: brightness(1.05); }

  
  :global(.tm-fab[data-label]) { position: relative; }
  :global(.tm-fab[data-label]::after) {
    content: attr(data-label);
    position: absolute; left: 50%; top: calc(100% + 10px);
    transform: translateX(-50%) translateY(2px);
    background: rgba(17,17,17,0.95); color: #fff;
    padding: 4px 8px; border-radius: 6px;
    font-size: 12px; border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 6px 16px rgba(0,0,0,0.35);
    white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none;
    transition: opacity .12s ease, transform .12s ease, visibility .12s;
    z-index: 1000004;
  }
  :global(.tm-fab[data-label]:hover::after),
  :global(.tm-fab[data-label]:focus-visible::after) {
    opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0);
  }
  
  :global(.tm-tip) { position: relative; }
  :global(.tm-tip::after) {
    content: attr(data-label);
    position: absolute; left: 50%; top: calc(100% + 10px);
    transform: translateX(-50%) translateY(2px);
    background: rgba(17,17,17,0.95); color: #fff;
    padding: 4px 8px; border-radius: 6px;
    font-size: 12px; border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 6px 16px rgba(0,0,0,0.35);
    white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none;
    transition: opacity .12s ease, transform .12s ease, visibility .12s;
    z-index: 1000004;
  }
  :global(.tm-tip:hover::after), :global(.tm-tip:focus-visible::after) { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
</style>
