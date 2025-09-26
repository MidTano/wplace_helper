
<script>
  import { createEventDispatcher } from 'svelte';
  import ComparisonImage from './ComparisonImage.svelte';

  const dispatch = createEventDispatcher();

  
  export let images = [];
  export let gridLayout = 'auto';
  export let zoom = 1;
  export let pan = { x: 0, y: 0 };

  
  $: imageCount = images.length;
  $: actualLayout = gridLayout === 'auto' ? getAutoLayout(imageCount) : gridLayout;

  function getAutoLayout(count) {
    switch (count) {
      case 1: return '1x1';
      case 2: return '2x1';
      case 3: return '2x2'; 
      case 4: return '2x2';
      case 5:
      case 6: return '3x2';
      case 7:
      case 8:
      case 9: return '3x3';
      default: return '4x3';
    }
  }


  function getGridClass(layout) {
    switch (layout) {
      case '2x1': return 'grid-2x1';
      case '3x1': return 'grid-3x1';
      case '2x2': return 'grid-2x2';
      case '3x2': return 'grid-3x2';
      case '3x3': return 'grid-3x3';
      case '4x3': return 'grid-4x3';
      default: return 'grid-1x1';
    }
  }

  function handleRemoveImage(imageId) {
    dispatch('removeImage', imageId);
  }

  function handleZoomChange(newZoom) {
    dispatch('zoomChange', newZoom);
  }

  function handlePanChange(newPan) {
    dispatch('panChange', newPan);
  }

  function handleViewportChange(viewport) {
    dispatch('viewportChange', viewport);
  }

  function handleImageSelect(imageId) {
    dispatch('imageSelect', imageId);
  }

  function handleApplySettings(img) {
    dispatch('applySettings', img);
  }
</script>

<div class="comparison-grid {getGridClass(actualLayout)}" data-layout={actualLayout} data-count={imageCount}>
  {#each images as image, index (image.id)}
    <div class="grid-item" data-index={index}>
      <ComparisonImage 
        {image}
        {zoom}
        {pan}
        index={index + 1}
        on:remove={() => handleRemoveImage(image.id)}
        on:zoomChange={(e) => handleZoomChange(e.detail)}
        on:panChange={(e) => handlePanChange(e.detail)}
        on:viewportChange={(e) => handleViewportChange(e.detail)}
        on:select={() => handleImageSelect(image.id)}
        on:applySettings={(e) => handleApplySettings(e.detail)}
      />
    </div>
  {/each}
</div>

<style>
  .comparison-grid {
    display: grid;
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 8px;
    box-sizing: border-box;
  }

  
  .grid-1x1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .grid-2x1 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }

  .grid-3x1 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 1fr;
  }

  .grid-2x2 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .grid-3x2 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 1fr 1fr;
  }

  .grid-3x3 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  .grid-4x3 {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  .grid-item {
    position: relative;
    min-width: 0; 
    min-height: 0;
    border-radius: 4px;
    overflow: hidden;
    
    
    background-color: #0a0a0a;
    background-image:
      linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),
      linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 0, 6px 6px, 6px 6px;
  }


  

  
  @media (max-width: 768px) {
    .comparison-grid {
      padding: 8px;
      gap: 4px;
    }

    
    .grid-3x1,
    .grid-3x2,
    .grid-3x3,
    .grid-4x3 {
      grid-template-columns: 1fr 1fr;
    }

    .grid-3x1 {
      grid-template-rows: 1fr 1fr; 
    }
  }

  @media (max-width: 480px) {
    
    .comparison-grid {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto !important;
      gap: 8px;
    }

    .grid-item {
      min-height: 200px; 
    }
  }
</style>
