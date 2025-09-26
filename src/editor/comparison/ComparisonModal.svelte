
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { 
    comparisonStore, 
    comparisonImages, 
    isModalOpen,
    currentZoom,
    currentPan,
    comparisonActions 
  } from './ComparisonStore';
  import { comparisonUtils } from './ComparisonStore';
  import ComparisonGrid from './ComparisonGrid.svelte';
  import { appendToBody } from '../modal/utils/appendToBody';

  const dispatch = createEventDispatcher();

  
  let modalRef;
  let backdropRef;

  
  $: images = $comparisonImages;
  $: imageCount = images.length;
  $: gridLayout = imageCount <= 1 ? '1x1' : 
                  imageCount === 2 ? '2x1' :
                  imageCount === 3 ? '2x2' :
                  imageCount === 4 ? '2x2' :
                  imageCount <= 6 ? '3x2' :
                  imageCount <= 9 ? '3x3' : '4x3';

  function closeModal() {
    comparisonActions.closeModal();
    dispatch('close');
  }

  function removeImage(imageId) {
    comparisonActions.removeImage(imageId);
    
    
    if ($comparisonImages.length < 2) {
      closeModal();
    }
  }

  function clearAllImages() {
    comparisonActions.clearAll();
    closeModal();
  }

  function resetViewport() {
    comparisonActions.resetViewport();
  }

  function handleKeyDown(event) {
    if (!$isModalOpen) return;

    switch (event.code) {
      case 'Escape':
        event.preventDefault();
        closeModal();
        break;
        
      case 'Space':
        event.preventDefault();
        resetViewport();
        break;
    }
  }

  

  
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if $isModalOpen}
  <div 
    use:appendToBody 
    class="editor-backdrop" 
    bind:this={backdropRef}
    role="button" 
    tabindex="0"
    on:click={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    on:keydown={handleKeyDown}
  >
    <div 
      class="editor-modal comparison-modal" 
      bind:this={modalRef}
      role="dialog" 
      aria-modal="true" 
      tabindex="-1"
      aria-labelledby="comparison-title"
    >
      <div class="editor-grid">
        
        <div class="editor-panel">
          <div class="editor-panel-title" id="comparison-title">Сравнение изображений ({imageCount})</div>


          <div class="editor-group">
            <div class="editor-group-title">Изображения</div>
            <div class="editor-hint">Всего изображений: {imageCount}</div>
            
            <div class="editor-buttons">
              <button class="editor-btn" on:click={resetViewport}>
                Сбросить вид
              </button>
              <button class="editor-btn editor-primary" on:click={clearAllImages}>
                Очистить все
              </button>
              <button class="editor-btn" style="margin-left:auto" on:click={closeModal}>Закрыть</button>
            </div>
          </div>

          
          <div class="editor-group">
            <div class="editor-group-title">Управление</div>
            <ul class="hint-list">
              <li><span>Колесо мыши</span> — зум</li>
              <li><span>Перетаскивание</span> — панорама</li>
              <li><span>Space</span> — сброс вида</li>
              <li><span>Escape</span> — закрыть</li>
            </ul>
          </div>
        </div>

        
        <div class="editor-output comparison-output">
          {#if imageCount >= 2}
            <ComparisonGrid 
              {images} 
              {gridLayout}
              zoom={$currentZoom}
              pan={$currentPan}
              on:removeImage={(e) => removeImage(e.detail)}
              on:zoomChange={(e) => comparisonActions.updateZoom(e.detail)}
              on:panChange={(e) => comparisonActions.updatePan(e.detail)}
              on:viewportChange={(e) => comparisonActions.updateViewport(e.detail.zoom, e.detail.pan)}
              on:applySettings={(e) => { dispatch('applySettings', e.detail); closeModal(); }}
            />
          {:else}
            <div class="empty-state">
              <div class="empty-icon">📊</div>
              <div class="empty-title">Недостаточно изображений</div>
              <div class="empty-text">
                Для сравнения необходимо минимум 2 изображения.<br>
                Добавьте изображения через главное окно редактора.
              </div>
              <button class="editor-btn editor-primary" on:click={closeModal}>
                Вернуться к редактору
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  
  .editor-backdrop {
    position: fixed;
    inset: 0;
    background: radial-gradient(60% 60% at 50% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647; 
    pointer-events: auto;
    isolation: isolate;
  }

  .editor-modal.comparison-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    width: min(95vw, 1400px);
    height: 90vh; 
    max-height: 90vh;
    min-height: 420px;
    background: rgba(24, 26, 32, 0.98) !important;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset;
    padding: 12px;
    overflow: hidden;
    z-index: 2147483647;
    opacity: 1 !important;
    visibility: visible !important;
    color: #fff;
    outline: 2px solid rgba(240,81,35,0.7); 
    display: grid;
    grid-template-rows: 1fr;
  }

  .editor-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 12px;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .editor-panel {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 12px;
    color: #fff;
    overflow-y: auto;
    scrollbar-width: thin;
    max-height: 100%;
    min-height: 0;
    position: relative;
  }

  .editor-panel-title {
    font-weight: 600;
    opacity: 0.9;
    margin-bottom: 4px;
    font-size: 16px;
  }

  .editor-group {
    margin-bottom: 16px;
  }

  .editor-group:last-child {
    margin-bottom: 0;
  }

  .editor-group-title {
    font-weight: 600;
    opacity: .9;
    margin-bottom: 2px;
  }

  

  .editor-hint {
    font-size: 12px;
    opacity: .7;
    margin-bottom: 4px;
  }

  .editor-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  
  .comparison-modal :global(.editor-buttons .editor-btn) {
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 6px 14px;
  }

  .editor-btn {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.07);
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s ease;
  }

  .editor-btn:hover {
    background: rgba(255,255,255,0.12);
    transform: translateY(-1px);
  }

  .editor-btn.editor-primary {
    background: #f05123;
    border-color: rgba(255,255,255,0.25);
  }

  .editor-btn.editor-primary:hover {
    background: #e04619;
  }

  .comparison-output {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    
    
    background: transparent;
    border: none;
    border-radius: 10px; 
  }


  
  .hint-list {
    list-style: none;
    padding: 0;
    margin: 6px 0 0 0;
    display: grid;
    gap: 6px;
  }
  .hint-list li {
    font-size: 12px;
    color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 6px 10px;
    min-height: 34px;
    display: flex;
    align-items: center;      
    
  }
  .hint-list li span {
    color: #fff;
    font-weight: 600;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #fff;
    text-align: center;
    padding: 40px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.9);
  }

  .empty-text {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 24px;
    color: rgba(255, 255, 255, 0.7);
    max-width: 400px;
  }

  
  @media (max-width: 768px) {
    .comparison-modal {
      width: 100vw !important;
      height: 100vh !important;
      border-radius: 0 !important;
    }

    .editor-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .editor-panel {
      max-height: 200px;
    }
  }
</style>
