

<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { comparisonUtils } from './ComparisonStore';

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
  
  
  $: imageTransform = getImageTransform(zoom, pan, imageLoaded, containerRef);

  function handleImageLoad() {
    if (imageRef) {
      naturalWidth = imageRef.naturalWidth;
      naturalHeight = imageRef.naturalHeight;
      imageLoaded = true;
      imageError = false;
      
    }
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
        containerWidth = cr.width;
        containerHeight = cr.height;
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

    if (cw === 0 || ch === 0) {
      return 'translate(-50%, -50%) scale(1)';
    }

    
    const scaleX = cw / naturalWidth;
    const scaleY = ch / naturalHeight;
    const baseCoverScale = Math.max(scaleX, scaleY);

    
    const s = baseCoverScale * currentZoom;

    
    
    
    return `translate(${currentPan.x}px, ${currentPan.y}px) translate(-50%, -50%) scale(${s})`;
  }

  function calculateZoomPan(focusX, focusY, oldZoom, newZoom, oldPan) {
    if (!containerRef || !naturalWidth || !naturalHeight) return oldPan;
    
    const cw = wrapperRef?.offsetWidth || containerRef.offsetWidth || containerRef.clientWidth || 300;
    const ch = wrapperRef?.offsetHeight || containerRef.offsetHeight || containerRef.clientHeight || 200;

    
    const scaleX = cw / naturalWidth;
    const scaleY = ch / naturalHeight;
    const baseCoverScale = Math.max(scaleX, scaleY);

    const oldS = baseCoverScale * oldZoom;
    const newS = baseCoverScale * newZoom;
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

  function handleWheel(event) {
    event.preventDefault();
    
    if (!containerRef || !imageLoaded) return;

    const delta = -event.deltaY;
    const zoomFactor = delta > 0 ? 1.25 : 0.8;
    const newZoom = Math.max(0.05, Math.min(32, zoom * zoomFactor));
    
    
    const rect = (wrapperRef || containerRef).getBoundingClientRect();
    const focusX = event.clientX - rect.left;
    const focusY = event.clientY - rect.top;
    
    
    const newPan = calculateZoomPan(focusX, focusY, zoom, newZoom, pan);
    
    
    dispatch('viewportChange', { zoom: newZoom, pan: newPan });
  }

  function handleMouseDown(event) {
    if (event.button !== 0) return; 

    
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

    dispatch('panChange', newPan);
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
      
      if (contextMenuOpenTimer) clearTimeout(contextMenuOpenTimer);
      contextMenuOpenTimer = setTimeout(() => {
        if (!contextMenuHover) {
          showContextMenu = false;
        }
      }, 800);
    }
  }

  function closeContextMenu() {
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
      const link = document.createElement('a');
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
  aria-label={`Изображение ${index} для сравнения`}
>
  
  <div class="image-index">{index}</div>

  
  <div class="image-wrapper" bind:this={wrapperRef}>
    {#if imageError}
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-text">Ошибка загрузки</div>
      </div>
    {:else if isVisible}
      <img 
        bind:this={imageRef}
        src={image.url}
        alt={`Изображение ${index}`}
        class="comparison-image"
        class:loaded={imageLoaded}
        style="transform: {imageTransform}"
        on:load={handleImageLoad}
        on:error={handleImageError}
        draggable="false"
      />
      
      {#if !imageLoaded}
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Загрузка...</div>
        </div>
      {/if}
    {:else}
      
      <div class="invisible-placeholder">
        <div class="placeholder-icon">🖼️</div>
        <div class="placeholder-text">Изображение {index}</div>
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
  </div>

  
  {#if showContextMenu}
    <div 
      class="context-menu"
      style="left: {contextMenuX}px; top: {contextMenuY}px;"
      role="menu"
      aria-label="Действия с изображением"
      tabindex="-1"
      on:mousedown|stopPropagation
      on:click|stopPropagation
      on:mouseenter={() => { contextMenuHover = true; if (contextMenuOpenTimer) { clearTimeout(contextMenuOpenTimer); contextMenuOpenTimer = null; } }}
      on:mouseleave={() => { contextMenuHover = false;  setTimeout(() => { if (!contextMenuHover) closeContextMenu(); }, 250); }}
      on:keydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeContextMenu(); } }}
    >
      <button class="menu-item" role="menuitem" on:click={openInEditor}>
        Открыть в редакторе
      </button>
      <div class="menu-separator"></div>
      <button class="menu-item" role="menuitem" on:click={saveImage}>
        Сохранить изображение
      </button>
      <div class="menu-separator"></div>
      <button class="menu-item danger" role="menuitem" on:click={removeImage}>
        Удалить из сравнения
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
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    z-index: 10;
    border: 1px solid rgba(255, 255, 255, 0.3);
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

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    gap: 12px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #f05123;
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
    color: rgba(255, 68, 68, 0.8);
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
    color: rgba(255, 255, 255, 0.4);
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
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 8px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;          
    justify-content: center;      
  }

  .settings-info {
    margin-bottom: 0;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;           
  }

  .dimensions-inline {
    margin-left: 8px;
    opacity: 1;
  }

  .context-menu {
    position: absolute;
    background: rgba(17, 17, 17, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
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
    color: #fff;
    text-align: left;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .menu-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .menu-item.danger {
    color: #ff4444;
  }

  .menu-item.danger:hover {
    background: rgba(255, 68, 68, 0.1);
  }

  .menu-separator {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
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
