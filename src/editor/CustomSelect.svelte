<script>
  import ModeVisualizer from '../topmenu/ModeVisualizer.svelte';
  
  export let value = '';
  export let options = [];
  export let onChange = (_value) => {};
  export let showModePreview = false;
  export let previewModes = null;
  export let previewAnchorSelector = '';
  export let previewOffsetX = 16;
  export let disabled = false;
  
  let isOpen = false;
  let selectRef;
  let previewMode = '';
  let showPreview = false;
  let visualizerPosition = { x: 0, y: 0 };
  
  function toggleOpen() {
    if (disabled) return;
    isOpen = !isOpen;
  }
  
  function selectOption(optionValue) {
    value = optionValue;
    isOpen = false;
    onChange(optionValue);
  }
  
  function handleClickOutside(event) {
    if (selectRef && !selectRef.contains(event.target)) {
      isOpen = false;
      showPreview = false;
    }
  }
  
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
      showPreview = false;
    }
  }
  
  function handleOptionHover(optionValue, event) {
    if (!showModePreview) {
      return;
    }

    if (Array.isArray(previewModes) && previewModes.length && !previewModes.includes(optionValue)) {
      showPreview = false;
      return;
    }
    
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();

    let ax = rect.right;
    try {
      if (previewAnchorSelector && typeof previewAnchorSelector === 'string') {
        const el = document.querySelector(previewAnchorSelector);
        if (el && el.getBoundingClientRect) {
          const r2 = el.getBoundingClientRect();
          ax = r2.right;
        }
      }
    } catch {}
    
    visualizerPosition = {
      x: ax + previewOffsetX,
      y: rect.top + rect.height / 2
    };
    
    previewMode = optionValue;
    showPreview = true;
  }

  function handleOptionLeave() {
    showPreview = false;
  }
  
  $: selectedLabel = options.find(o => o.value === value)?.label || value;
  
  $: if (!isOpen) {
    showPreview = false;
  }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeyDown} />

<div class="custom-select" class:is-open={isOpen} bind:this={selectRef}>
  <button 
    type="button"
    class="select-trigger" 
    class:open={isOpen}
    class:disabled={disabled}
    disabled={disabled}
    on:click|stopPropagation={toggleOpen}
  >
    <span class="select-value">{selectedLabel}</span>
    <svg class="select-chevron" class:rotate={isOpen} width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  
  {#if isOpen}
    <div class="select-dropdown">
      {#each options as option, i}
        <button
          type="button"
          class="select-option"
          class:selected={option.value === value}
          on:click|stopPropagation={() => selectOption(option.value)}
          on:mouseenter={(e) => handleOptionHover(option.value, e)}
          on:mouseleave={handleOptionLeave}
          style="--delay: {i * 0.03}s;"
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
{#if showModePreview && showPreview}
  <ModeVisualizer mode={previewMode} visible={true} x={visualizerPosition.x} y={visualizerPosition.y} />
{/if}

<style>
  .custom-select {
    position: relative;
    flex: 1;
  }
  
  .select-trigger {
    width: 100%;
    height: 42px;
    border-radius: 10px;
    border: 1px solid var(--wph-border, rgba(255,255,255,0.14));
    background: var(--wph-surface, rgba(255,255,255,0.06));
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, opacity .15s ease;
  }
  
  .select-trigger:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.12));
    border-color: var(--wph-border, rgba(255,255,255,0.28));
  }
  
  .custom-select.is-open .select-trigger.open {
    border-color: var(--wph-primary, #f05123);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #f05123) 35%, transparent);
  }

  .select-trigger.disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }
  
  .select-value {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .select-chevron {
    flex-shrink: 0;
    opacity: 0.7;
    transition: transform .2s ease;
  }
  
  .select-chevron.rotate {
    transform: rotate(180deg);
  }
  
  @keyframes slideIn {
    0% {
      opacity: 0;
      transform: translateY(-8px) scale(0.96);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(6px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .select-dropdown {
    position: relative;
    margin-top: 4px;
    background: var(--wph-surface, rgba(26,26,26,0.98));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000006;
    padding: 4px;
    transform-origin: top center;
    animation: slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.3) transparent;
  }
  .custom-select.is-open .select-dropdown {
    border-color: var(--wph-primary, #f05123);
    box-shadow: 0 8px 24px var(--wph-primaryGlow, rgba(240,81,35,0.35));
  }
  
  .select-dropdown::-webkit-scrollbar {
    width: 6px;
  }
  
  .select-dropdown::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .select-dropdown::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.3);
    border-radius: 3px;
  }
  
  .select-dropdown::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.4);
  }
  
  .select-option {
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--wph-text, #fff);
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all .12s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    
    opacity: 0;
    animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) var(--delay, 0s) both;
  }
  
  .select-option:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.08));
  }
  
  .select-option.selected {
    font-weight: 600;
    color: var(--wph-primary, #f05123);
  }
  
  .select-option.selected:hover {
    background: var(--wph-primaryGlow, rgba(240,81,35,0.25));
  }
</style>
