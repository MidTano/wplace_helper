

<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { comparisonUtils } from './ComparisonStore';
  import { t } from '../../i18n';
  import { markElement } from '../../wguard';

  const dispatch = createEventDispatcher();

  
  export let image;
  export let zoom = 1;
  export let pan = { x: 0, y: 0 };
  export let index = 1;

  
  let containerRef;
  let imageRef;
  let canvasRef;
  let wrapperRef;
  let resizeObserver;
  let containerWidth = 0;
  let containerHeight = 0;

  let baseCoverScale = 1;

  let pendingPan = null;
  let panRafId = 0;
  let lastPanTs = 0;

  let pendingWheel = null;
  let wheelRafId = 0;
  let lastWheelTs = 0;
  const MAX_RATE_MS = 1000 / 144;

  let wheelZooming = false;
  let wheelZoomTimer = null;

  
  let imageLoaded = false;
  let imageError = false;
  let naturalWidth = 0;
  let naturalHeight = 0;

  
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartPointerX = 0;
  let panStartPointerY = 0;

  
  let isVisible = true;
  let intersectionObserver;

  
  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuHover = false;
  let contextMenuOpenTimer = null;

  
  let imageTransform = 'scale(1)';

  
  $: formattedMetadata = comparisonUtils.formatMetadata(image.metadata);
  $: fullSettings = JSON.stringify(image?.metadata?.settings || {}, null, 2);
  $: dimensionsLine = image?.metadata?.dimensions ? `${image.metadata.dimensions.width} × ${image.metadata.dimensions.height}` : '';
  $: statsLine = image?.metadata?.stats ? `colors: ${image.metadata.stats.colors} • opaque: ${image.metadata.stats.opaque}` : '';
  
  
  $: imageTransform = getImageTransform(zoom, pan, imageLoaded, containerRef);

  function handleImageLoad() {
    if (imageRef) {
      naturalWidth = imageRef.naturalWidth;
      naturalHeight = imageRef.naturalHeight;
      imageLoaded = true;
      imageError = false;
      recomputeBaseCoverScale();
    }
  }

  function recomputeBaseCoverScale() {
    const container = wrapperRef || containerRef;
    if (!container || !naturalWidth || !naturalHeight) return;
    const cw = containerWidth || container.offsetWidth || container.clientWidth || 300;
    const ch = containerHeight || container.offsetHeight || container.clientHeight || 200;
    if (cw === 0 || ch === 0) return;
    const scaleX = cw / naturalWidth;
    const scaleY = ch / naturalHeight;
    baseCoverScale = Math.max(scaleX, scaleY);
  }

  function handleImageError() {
    imageError = true;
    imageLoaded = false;
  }

  function initResizeObserver() {
    if (!wrapperRef || !('ResizeObserver' in window)) return;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        const w = cr.width;
        const h = cr.height;
        if (w !== containerWidth || h !== containerHeight) {
          containerWidth = w;
          containerHeight = h;
          recomputeBaseCoverScale();
        }
      }
    });
    resizeObserver.observe(wrapperRef);
  }

  function cleanupResizeObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  function getImageTransform(currentZoom = zoom, currentPan = pan, isLoaded = imageLoaded) {
    const container = wrapperRef || containerRef;
    if (!isLoaded || !container || !naturalWidth || !naturalHeight) return 'translate(-50%, -50%) scale(1)';
    const cw = containerWidth || container.offsetWidth || container.clientWidth || 300;
    const ch = containerHeight || container.offsetHeight || container.clientHeight || 200;
    if (cw === 0 || ch === 0) return 'translate(-50%, -50%) scale(1)';
    const s = baseCoverScale * currentZoom;
    return `translate(${currentPan.x}px, ${currentPan.y}px) translate(-50%, -50%) scale(${s})`;
  }

  function calculateZoomPan(focusX, focusY, oldZoom, newZoom, oldPan) {
    if (!containerRef || !naturalWidth || !naturalHeight) return oldPan;
    const cw = containerWidth || wrapperRef?.offsetWidth || containerRef.offsetWidth || containerRef.clientWidth || 300;
    const ch = containerHeight || wrapperRef?.offsetHeight || containerRef.offsetHeight || containerRef.clientHeight || 200;
    const bcs = baseCoverScale || Math.max(cw / naturalWidth, ch / naturalHeight);
    const oldS = bcs * oldZoom;
    const newS = bcs * newZoom;
    const r = newS / oldS;
    const Cx = cw / 2;
    const Cy = ch / 2;
    const dx = focusX - Cx;
    const dy = focusY - Cy;
    return {
      x: r * oldPan.x + (1 - r) * dx,
      y: r * oldPan.y + (1 - r) * dy,
    };
  }

  function schedulePanDispatch() {
    if (panRafId) return;
    panRafId = requestAnimationFrame((now) => {
      panRafId = 0;
      const p = pendingPan;
      if (!p) return;
      if (now - lastPanTs < MAX_RATE_MS) {
        schedulePanDispatch();
        return;
      }
      dispatch('panChange', p);
      lastPanTs = now;
      pendingPan = null;
    });
  }

  function scheduleWheelDispatch() {
    if (wheelRafId) return;
    wheelRafId = requestAnimationFrame((now) => {
      wheelRafId = 0;
      const w = pendingWheel;
      if (!w) return;
      if (now - lastWheelTs < MAX_RATE_MS) {
        scheduleWheelDispatch();
        return;
      }
      const zoomFactor = w.delta > 0 ? 1.25 : 0.8;
      const newZoom = Math.max(0.05, Math.min(32, zoom * zoomFactor));
      const newPan = calculateZoomPan(w.focusX, w.focusY, zoom, newZoom, pan);
      dispatch('viewportChange', { zoom: newZoom, pan: newPan });
      lastWheelTs = now;
      pendingWheel = null;
    });
  }

  function handleWheel(event) {
    event.preventDefault();
    if (!containerRef || !imageLoaded || !isVisible) return;
    const rect = (wrapperRef || containerRef).getBoundingClientRect();
    const focusX = event.clientX - rect.left;
    const focusY = event.clientY - rect.top;
    pendingWheel = { delta: -event.deltaY, focusX, focusY };
    wheelZooming = true;
    if (wheelZoomTimer) clearTimeout(wheelZoomTimer);
    wheelZoomTimer = setTimeout(() => { wheelZooming = false; }, 150);
    scheduleWheelDispatch();
  }

  

  function handleMouseDown(event) {
    if (event.button !== 0) return; 

    if (!isVisible) return;
    if (showContextMenu) {
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('.context-menu')) {
        return;
      }
    }

    isPanning = true;
    
    if (showContextMenu) closeContextMenu();
    panStartX = pan.x;
    panStartY = pan.y;
    panStartPointerX = event.clientX;
    panStartPointerY = event.clientY;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    event.preventDefault();
  }

  function handleMouseMove(event) {
    if (!isPanning) return;

    const deltaX = event.clientX - panStartPointerX;
    const deltaY = event.clientY - panStartPointerY;

    const newPan = {
      x: panStartX + deltaX,
      y: panStartY + deltaY
    };

    pendingPan = newPan;
    schedulePanDispatch();
  }

  function handleMouseUp() {
    isPanning = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function handleContextMenu(event) {
    event.preventDefault();
    
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      contextMenuX = event.clientX - rect.left;
      contextMenuY = event.clientY - rect.top;
      showContextMenu = true;
      contextMenuHover = false;
      try { window.dispatchEvent(new CustomEvent('tutorial:contextmenu-opened')); } catch {}
      
      const isTutorialActive = document.querySelector('.tutorial-overlay');
      
      if (contextMenuOpenTimer) clearTimeout(contextMenuOpenTimer);
      
      if (!isTutorialActive) {
        contextMenuOpenTimer = setTimeout(() => {
          if (!contextMenuHover) {
            showContextMenu = false;
          }
        }, 800);
      }
    }
  }

  function closeContextMenu() {
    const isTutorialActive = document.querySelector('.tutorial-overlay');
    if (isTutorialActive) {
      return;
    }
    
    showContextMenu = false;
    contextMenuHover = false;
    if (contextMenuOpenTimer) {
      clearTimeout(contextMenuOpenTimer);
      contextMenuOpenTimer = null;
    }
  }

  function removeImage() {
    dispatch('remove');
    closeContextMenu();
  }

  function openInEditor() {
    
    dispatch('applySettings', image);
    closeContextMenu();
  }

  async function saveImage() {
    function downloadBlob(blob, filename) {
      const link = document.createElement('a'); markElement(link);
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    try {
      const filename = `comparison_${index}_${Date.now()}.png`;
      if (image.blob instanceof Blob) {
        downloadBlob(image.blob, filename);
      } else if (image.url) {
        
        const resp = await fetch(image.url, { mode: 'cors' });
        const blob = await resp.blob();
        downloadBlob(blob, filename);
      }
    } catch (e) {
      
      if (image?.url) {
        window.open(image.url, '_blank');
      }
    } finally {
      closeContextMenu();
    }
  }

  function selectImage() {
    dispatch('select');
    closeContextMenu();
  }

  function handleClickOutside(event) {
    if (showContextMenu && containerRef && !containerRef.contains(event.target)) {
      closeContextMenu();
    }
  }

  function initViewportCulling() {
    if (!containerRef || !('IntersectionObserver' in window)) return;

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting || entry.intersectionRatio > 0;
        });
      },
      {
        
        rootMargin: '50px',
        threshold: 0
      }
    );

    intersectionObserver.observe(containerRef);
  }

  function cleanupViewportCulling() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  }

  
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    
    setTimeout(initViewportCulling, 100);
    
    setTimeout(initResizeObserver, 0);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    if (panRafId) cancelAnimationFrame(panRafId);
    if (wheelRafId) cancelAnimationFrame(wheelRafId);
    if (wheelZoomTimer) { clearTimeout(wheelZoomTimer); wheelZoomTimer = null; }
    cleanupViewportCulling();
    cleanupResizeObserver();
  });
</script>

  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div 
  class="comparison-image-container"
  bind:this={containerRef}
  on:wheel={handleWheel}
  on:mousedown={handleMouseDown}
  on:contextmenu={handleContextMenu}
  class:panning={isPanning}
  role="application"
  tabindex="-1"
  aria-label={t('comparison.image.aria').replace('{0}', index)}
>
  
  <div class="image-index">{index}</div>

  
  <div class="image-wrapper" bind:this={wrapperRef}>
    {#if imageError}
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-text">{t('comparison.error.loading')}</div>
      </div>
    {:else if isVisible}
      <img 
        bind:this={imageRef}
        src={image.url}
        alt={t('comparison.image.alt').replace('{0}', index)}
        class="comparison-image"
        class:loaded={imageLoaded}
        class:interacting={isPanning || wheelZooming}
        style="transform: {imageTransform}"
        on:load={handleImageLoad}
        on:error={handleImageError}
        draggable="false"
      />
      
      {#if !imageLoaded}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">{t('comparison.loading')}</div>
        </div>
      {/if}
    {:else}
      
      <div class="invisible-placeholder">
        <div class="placeholder-icon">🖼️</div>
        <div class="placeholder-text">{t('comparison.image.alt').replace('{0}', index)}</div>
      </div>
    {/if}
  </div>

  
  <div class="image-info">
    <div 
      class="settings-info" 
      title={`${formattedMetadata}${image?.metadata?.dimensions ? ` • ${image.metadata.dimensions.width} × ${image.metadata.dimensions.height}` : ''}`}
    >
      {formattedMetadata}
      {#if image?.metadata?.dimensions}
        <span class="dimensions-inline"><strong>{image.metadata.dimensions.width} × {image.metadata.dimensions.height}</strong></span>
      {/if}
    </div>
    <div class="settings-expanded">
      <div class="details-scroll" on:wheel|stopPropagation>
        {#if dimensionsLine}
          <div class="details-line"><strong>Size:</strong> {dimensionsLine}</div>
        {/if}
        {#if statsLine}
          <div class="details-line"><strong>Stats:</strong> {statsLine}</div>
        {/if}
        <pre class="settings-dump">{fullSettings}</pre>
      </div>
    </div>
  </div>

  
  {#if showContextMenu}
    <div 
      class="context-menu"
      style="left: {contextMenuX}px; top: {contextMenuY}px;"
      role="menu"
      aria-label={t('comparison.menu.aria')}
      tabindex="-1"
      on:mousedown|stopPropagation
      on:click|stopPropagation
      on:mouseenter={() => { contextMenuHover = true; if (contextMenuOpenTimer) { clearTimeout(contextMenuOpenTimer); contextMenuOpenTimer = null; } }}
      on:mouseleave={() => { contextMenuHover = false;  setTimeout(() => { if (!contextMenuHover) closeContextMenu(); }, 250); }}
      on:keydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeContextMenu(); } }}
    >
      <button class="menu-item" role="menuitem" on:click={openInEditor} data-tutorial="comparison-open-editor">
        {t('comparison.menu.openInEditor')}
      </button>
      <div class="menu-separator"></div>
      <button class="menu-item" role="menuitem" on:click={saveImage}>
        {t('comparison.menu.saveImage')}
      </button>
      <div class="menu-separator"></div>
      <button class="menu-item danger" role="menuitem" on:click={removeImage}>
        {t('comparison.menu.remove')}
      </button>
    </div>
  {/if}
</div>

<style>
  .comparison-image-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    user-select: none;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    outline: none;
    display: block;
  }

  .comparison-image-container.panning {
    cursor: grabbing;
  }

  .image-index {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 24px;
    height: 24px;
    background: var(--wph-surface, rgba(0, 0, 0, 0.7));
    color: var(--wph-text, #fff);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    z-index: 10;
    border: 1px solid var(--wph-border, rgba(255, 255, 255, 0.3));
  }

  .image-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .comparison-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-origin: center center;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .comparison-image.loaded {
    opacity: 1;
  }

  .comparison-image.interacting {
    will-change: transform;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--wph-muted, rgba(255, 255, 255, 0.6));
    gap: 12px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--wph-border, rgba(255, 255, 255, 0.2));
    border-top-color: var(--wph-primary, #f05123);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    font-size: 14px;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--wph-error, rgba(255, 68, 68, 0.8));
    gap: 8px;
  }

  .error-icon {
    font-size: 32px;
  }

  .error-text {
    font-size: 14px;
  }

  .invisible-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--wph-muted, rgba(255, 255, 255, 0.4));
    gap: 8px;
    height: 100%;
    min-height: 120px;
  }

  .placeholder-icon {
    font-size: 24px;
    opacity: 0.6;
  }

  .placeholder-text {
    font-size: 12px;
    opacity: 0.7;
  }

  .image-info {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    background: var(--wph-surface, rgba(0, 0, 0, 0.9));
    color: var(--wph-text, #fff);
    padding: 8px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid var(--wph-border, rgba(255, 255, 255, 0.1));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    min-height: 0;
    max-height: 40px;
    overflow: hidden;
    transition: max-height .2s ease;
    will-change: max-height;
  }

  .image-info:hover {
    top: 8px;
    bottom: 8px;
    height: auto;
    max-height: none;
  }

  .settings-info {
    margin-bottom: 0;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;           
    flex: 0 0 auto;
  }

  .settings-expanded {
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity .15s ease, max-height .15s ease;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .image-info:hover .settings-expanded {
    opacity: 1;
    max-height: none;
  }

  .details-scroll {
    margin-top: 8px;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    height: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .details-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .details-scroll::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.08);
    border-radius: 8px;
  }
  .details-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.35);
    border-radius: 8px;
  }

  .details-line {
    font-size: 12px;
    opacity: 0.95;
    margin: 2px 0;
  }

  .settings-dump {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 11px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 6px 0 0 0;
  }

  .dimensions-inline {
    margin-left: 8px;
    opacity: 1;
  }

  .context-menu {
    position: absolute;
    background: var(--wph-surface, rgba(17, 17, 17, 0.95));
    border: 1px solid var(--wph-border, rgba(255, 255, 255, 0.15));
    border-radius: 8px;
    padding: 4px 0;
    min-width: 180px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 20;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: var(--wph-text, #fff);
    text-align: left;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .menu-item:hover {
    background: var(--wph-surface2, rgba(255, 255, 255, 0.1));
  }

  .menu-item.danger {
    color: var(--wph-error, #ff4444);
  }

  .menu-item.danger:hover {
    background: var(--wph-error, rgba(255, 68, 68, 0.1));
  }

  .menu-separator {
    height: 1px;
    background: var(--wph-border, rgba(255, 255, 255, 0.1));
    margin: 4px 8px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  
  @media (max-width: 768px) {
    .image-info {
      font-size: 11px;
    }

    .settings-info {
      
      font-size: 10px;
      max-width: 150px;
    }
  }
</style>
