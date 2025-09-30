<script>
  export let value = '';
  export let options = [];
  export let onChange = () => {};
  
  let isOpen = false;
  let selectRef;
  
  function toggleOpen() {
    isOpen = !isOpen;
  }
  
  function selectOption(optionValue) {
    value = optionValue;
    isOpen = false;
    onChange();
  }
  
  function handleClickOutside(event) {
    if (selectRef && !selectRef.contains(event.target)) {
      isOpen = false;
    }
  }
  
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }
  
  $: selectedLabel = options.find(o => o.value === value)?.label || value;
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeyDown} />

<div class="custom-select" bind:this={selectRef}>
  <button 
    type="button"
    class="select-trigger" 
    class:open={isOpen}
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
          style="--delay: {i * 0.03}s;"
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .custom-select {
    position: relative;
    flex: 1;
  }
  
  .select-trigger {
    width: 100%;
    height: 36px;
    padding: 6px 12px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: all .15s ease;
  }
  
  .select-trigger:hover {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.28);
  }
  
  .select-trigger.open {
    background: rgba(255,255,255,0.12);
    border-color: #f05123;
    box-shadow: 0 0 0 3px rgba(240,81,35,0.28);
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
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: rgba(26,26,26,0.96);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    backdrop-filter: blur(12px);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    padding: 4px;
    transform-origin: top center;
    animation: slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.3) transparent;
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
    color: #fff;
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
    background: rgba(255,255,255,0.08);
  }
  
  .select-option.selected {
    background: rgba(240,81,35,0.15);
    font-weight: 600;
    color: #f05123;
  }
  
  .select-option.selected:hover {
    background: rgba(240,81,35,0.25);
  }
</style>
