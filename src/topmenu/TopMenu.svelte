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
  import AutoMode from './AutoMode.svelte';
  import Settings from './Settings.svelte';
  import Discord from './Discord.svelte';
  import Close from './Close.svelte';
  import LoadBar from './LoadBar.svelte';
  import { t, lang } from '../i18n';
  const dispatch = createEventDispatcher();
  let collapsed = false;
  let peekVisible = false;
  let peekAnimate = false;
  
  function handleCollapse(){ 
    collapsed = true;
    peekVisible = false;
    peekAnimate = false;
    setTimeout(() => {
      peekVisible = true;
      setTimeout(() => {
        peekAnimate = true;
      }, 50);
    }, 280);
  }
  
  function handleExpand(){ 
    collapsed = false;
    peekVisible = false;
    peekAnimate = false;
  }
  
  $: L_pick = ($lang, t('btn.pickImage'));
  $: L_clear = ($lang, t('btn.clear'));
</script>

<div class="topmenu-root" role="toolbar" aria-label={t('topmenu.toolbar')}>
  <div class="topmenu-bar" class:collapsed={collapsed}>
    <div class="tm-row">
      <div class="tm-group drip" style="--drip-delay: 0ms" aria-label={t('topmenu.group.stats')}>
      <AccountStats />
      </div>

    
      <div class="tm-group drip" style="--drip-delay: 40ms" aria-label={t('topmenu.group.art')}>
      <button class="tm-fab tm-primary tm-tip" type="button" on:click={onPick} aria-label={L_pick} data-label={L_pick} data-tutorial="pick-button">
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

    
      <div class="tm-group drip" style="--drip-delay: 80ms" aria-label={t('topmenu.group.tools')}>
      <EnhancedColors />
      <AutoMode />
      </div>

    
      <div class="tm-group drip" style="--drip-delay: 120ms" aria-label={t('topmenu.group.settings')}>
      <Settings />
      <Language />
      </div>

      
      <div class="tm-group drip" style="--drip-delay: 160ms" aria-label="Discord">
      <Discord />
      </div>

    
      <div class="tm-group tm-end drip" style="--drip-delay: 200ms" aria-label={t('topmenu.group.close')}>
      <Close on:collapse={handleCollapse} />
      </div>
    </div>
    <LoadBar inline={true} />
  </div>
  {#if collapsed && peekVisible}
    <button type="button" class="topmenu-peek" class:animate={peekAnimate} aria-label={t('topmenu.toolbar')} on:click={handleExpand}></button>
  {/if}
</div>

<style>
  .topmenu-root {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-menu);
    pointer-events: auto;
    font-size: 12px;
    line-height: 1.4;
    color: #fff;
    overflow: visible;
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
    will-change: transform;
    transition: transform .28s cubic-bezier(.4,0,.2,1);
    overflow: visible;
  }
  .topmenu-bar.collapsed { transform: translateY(calc(-100% - 60px)); }
  .tm-row {
    display: flex;
    gap: 8px;
    align-items: center;
    position: relative;
    z-index: 10;
  }
  .tm-group { 
    display: flex; 
    align-items: center; 
    gap: 8px;
  }
  .tm-group + .tm-group { margin-left: 14px; }
  
  .topmenu-bar:not(.collapsed) .tm-group.drip {
    animation: dripDown 900ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--drip-delay, 0ms) both;
  }
  
  @keyframes dripDown {
    0% {
      opacity: 0;
      transform: translateY(-20px) scaleY(0.3);
      filter: blur(4px);
    }
    
    30% {
      opacity: 0.6;
      transform: translateY(-8px) scaleY(0.7);
      filter: blur(2px);
    }
    
    50% {
      opacity: 0.9;
      transform: translateY(2px) scaleY(1.08);
      filter: blur(0.5px);
    }
    
    70% {
      opacity: 1;
      transform: translateY(-1px) scaleY(0.98);
      filter: blur(0px);
    }
    
    85% {
      transform: translateY(0.5px) scaleY(1.01);
    }
    
    100% {
      opacity: 1;
      transform: translateY(0) scaleY(1);
      filter: blur(0px);
    }
  }
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
  :global(.tm-fab:focus-visible) { outline: 2px solid var(--wph-focusRing, #f05123); outline-offset: 1px; }
  :global(.tm-fab svg) { display: block; }
  :global(.tm-fab.tm-primary) { background: var(--wph-primary, #f05123); color: var(--wph-onPrimary, #fff); border-color: var(--wph-border, rgba(255,255,255,0.25)); box-shadow: 0 8px 24px var(--wph-primaryGlow, rgba(240,81,35,0.45)); }
  :global(.tm-fab.tm-primary:hover) { filter: brightness(1.05); }
  
  :global(.tm-fab.tm-danger) { background: var(--wph-error, #e53935); color: var(--wph-onError, #fff); border-color: rgba(255,255,255,0.25); box-shadow: 0 8px 24px rgba(229,57,53,0.45); }
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
    z-index: var(--z-popover);
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
    z-index: 1000010;
  }
  :global(.tm-tip:hover::after), :global(.tm-tip:focus-visible::after) { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }

  .topmenu-peek {
    position: fixed;
    left: 50%;
    top: -10px;
    transform: translateX(-50%) scale(1);
    width: 220px;
    height: var(--peek, 12px);
    background: rgba(24,26,32,0.9);
    border: 1px solid rgba(255,255,255,0.15);
    border-top: none;
    border-radius: 0 0 10px 10px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.35);
    z-index: var(--z-menu);
    cursor: pointer;
    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .topmenu-peek:hover {
    transform: translateX(-50%) scale(1.02);
  }
  
  .topmenu-peek.animate {
    animation: peekPulse 1400ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @keyframes peekPulse {
    0% { 
      background: rgba(24,26,32,0.9);
      border-color: rgba(255,255,255,0.15);
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
      transform: translateX(-50%) scale(1);
    }
    
    8% { 
      background: var(--wph-primary, #f05123);
      border-color: var(--wph-primary, #f05123);
      box-shadow: 0 8px 32px var(--wph-primaryGlow, rgba(240,81,35,0.6)), 0 0 24px var(--wph-primaryGlow, rgba(240,81,35,0.4));
      transform: translateX(-50%) scale(1.03);
    }
    
    16% { 
      background: rgba(24,26,32,0.92);
      border-color: rgba(255,255,255,0.2);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 12px rgba(240,81,35,0.15);
      transform: translateX(-50%) scale(0.99);
    }
    
    24% { 
      background: rgba(24,26,32,0.9);
      border-color: rgba(255,255,255,0.15);
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
      transform: translateX(-50%) scale(1);
    }
    
    38% { 
      background: var(--wph-primary, #f05123);
      border-color: var(--wph-primary, #f05123);
      box-shadow: 0 8px 28px var(--wph-primaryGlow, rgba(240,81,35,0.5)), 0 0 20px var(--wph-primaryGlow, rgba(240,81,35,0.35));
      transform: translateX(-50%) scale(1.025);
    }
    
    46% { 
      background: rgba(24,26,32,0.92);
      border-color: rgba(255,255,255,0.18);
      box-shadow: 0 8px 22px rgba(0,0,0,0.38), 0 0 8px rgba(240,81,35,0.1);
      transform: translateX(-50%) scale(0.995);
    }
    
    54% { 
      background: rgba(24,26,32,0.9);
      border-color: rgba(255,255,255,0.15);
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
      transform: translateX(-50%) scale(1);
    }
    
    100% { 
      background: rgba(24,26,32,0.9);
      border-color: rgba(255,255,255,0.15);
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
      transform: translateX(-50%) scale(1);
    }
  }
</style>
