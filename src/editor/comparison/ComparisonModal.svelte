
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
  import { t } from '../../i18n';

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
      <div class="comparison-header">
        <div class="comparison-title" id="comparison-title">{t('comparisonModal.title').replace('{0}', imageCount)}</div>
        <button class="comparison-close" on:click={closeModal} aria-label={t('comparisonModal.close')}>×</button>
      </div>

      <div class="editor-grid">
        
        <div class="editor-panel">
          <div class="editor-group">
            <div class="editor-group-title">{t('comparisonModal.images')}</div>
            <div class="editor-hint">{t('comparisonModal.imagesCount').replace('{0}', imageCount)}</div>
            
            <div class="editor-buttons">
              <button class="editor-btn" on:click={resetViewport}>
                {t('comparisonModal.resetView')}
              </button>
              <button class="editor-btn editor-primary" on:click={clearAllImages}>
                {t('comparisonModal.clearAll')}
              </button>
            </div>
          </div>

          
          <div class="editor-group">
            <div class="editor-group-title">{t('comparisonModal.controls')}</div>
            <ul class="hint-list">
              <li><span>{t('comparisonModal.controls.wheel')}</span> — {t('comparisonModal.controls.wheelDesc')}</li>
              <li><span>{t('comparisonModal.controls.drag')}</span> — {t('comparisonModal.controls.dragDesc')}</li>
              <li><span>{t('comparisonModal.controls.space')}</span> — {t('comparisonModal.controls.spaceDesc')}</li>
              <li><span>{t('comparisonModal.controls.escape')}</span> — {t('comparisonModal.controls.escapeDesc')}</li>
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
              <div class="empty-title">{t('comparisonModal.empty.title')}</div>
              <div class="empty-text">
                {@html t('comparisonModal.empty.text')}
              </div>
              <button class="editor-btn editor-primary" on:click={closeModal}>
                {t('comparisonModal.empty.button')}
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
    background: var(--wph-backdrop, rgba(0,0,0,0.5));
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
    background: var(--wph-surface, rgba(17,17,17,0.96)) !important;
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 16px;
    box-shadow: 0 16px 36px rgba(0,0,0,0.5);
    overflow: hidden;
    z-index: 2147483647;
    opacity: 1 !important;
    visibility: visible !important;
    color: var(--wph-text, #fff);
    display: flex;
    flex-direction: column;
  }

  .comparison-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1));
    background: var(--wph-surface2, rgba(255,255,255,0.03));
    flex-shrink: 0;
  }

  .comparison-title {
    font-weight: 600;
    font-size: 15px;
    opacity: 0.95;
  }

  .comparison-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--wph-surface, rgba(255,255,255,0.06));
    color: var(--wph-text, #fff);
    border: none;
    cursor: pointer;
    transition: all .15s ease;
    flex-shrink: 0;
    font-size: 20px;
    line-height: 1;
    padding: 0;
  }

  .comparison-close:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.12));
    transform: scale(1.05);
  }

  .editor-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 12px;
    width: 100%;
    height: 100%;
  }

  .editor-panel {
    background: var(--wph-surface, rgba(255,255,255,0.04));
    border-radius: 10px;
    padding: 16px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
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
    border: 1px solid var(--wph-border, rgba(255,255,255,0.18));
    background: var(--wph-surface, rgba(255,255,255,0.07));
    color: var(--wph-text, #fff);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s ease;
  }

  .editor-btn:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.12));
    transform: translateY(-1px);
  }

  .editor-btn.editor-primary {
    background: var(--wph-primary, #f05123);
    border-color: var(--wph-border, rgba(255,255,255,0.25));
    color: var(--wph-onPrimary, #fff);
  }

  .editor-btn.editor-primary:hover {
    filter: brightness(0.95);
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
    color: var(--wph-text, rgba(255,255,255,0.85));
    background: var(--wph-surface, rgba(255,255,255,0.06));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.12));
    border-radius: 8px;
    padding: 6px 10px;
    min-height: 34px;
    display: flex;
    align-items: center;      
    
  }
  .hint-list li span {
    color: var(--wph-text, #fff);
    font-weight: 600;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--wph-text, #fff);
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
    color: var(--wph-text, rgba(255, 255, 255, 0.9));
  }

  .empty-text {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 24px;
    color: var(--wph-muted, rgba(255, 255, 255, 0.7));
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
