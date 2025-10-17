<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ElementBounds } from '../utils/positioning';
  import { getElementBounds } from '../utils/positioning';

  export let targetBounds: ElementBounds | null = null;
  export let additionalSelectors: string[] = [];
  export let visible: boolean = true;
  export let isAnimating: boolean = false;
  
  $: if (targetBounds) {
  }

  let maskId = `tutorial-mask-${Math.random().toString(36).substr(2, 9)}`;
  let additionalBounds: ElementBounds[] = [];
  let mutationObserver: MutationObserver | null = null;
  let lastElementCount = 0;
  let debounceId: number | null = null;
  let handleRef: (() => void) | null = null;

  function isElementReady(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function updateAdditionalBounds() {
    const newBounds: ElementBounds[] = [];
    let totalElements = 0;
    
    if (additionalSelectors && additionalSelectors.length > 0) {
      for (const selector of additionalSelectors) {
        const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        totalElements += elements.length;
        elements.forEach((el) => {
          if (el && isElementReady(el)) {
            const bounds = getElementBounds(el);
            newBounds.push(bounds);
          }
        });
      }
    }
    
    if (totalElements !== lastElementCount) {
      lastElementCount = totalElements;
    }
    
    additionalBounds = newBounds;
  }

  function waitForElementsReady(callback: () => void, maxAttempts = 50) {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      
      if (!additionalSelectors || additionalSelectors.length === 0) {
        callback();
        return;
      }
      
      let allReady = true;
      
      for (const selector of additionalSelectors) {
        const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        if (elements.length === 0) { allReady = false; break; }
        
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (!isElementReady(el)) {
            allReady = false; break;
          }
        }
        
        if (!allReady) break;
      }
      
      if (allReady) {
        callback();
      } else if (attempts < maxAttempts) {
        requestAnimationFrame(check);
      } else { callback(); }
    };
    
    requestAnimationFrame(check);
  }

  $: if (additionalSelectors) {
    lastElementCount = 0;
    waitForElementsReady(() => {
      updateAdditionalBounds();
    });
  }

  $: if (targetBounds) {
    updateAdditionalBounds();
  }

  onMount(() => {
    document.body.style.overflow = 'hidden';
    const handle = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        updateAdditionalBounds();
        debounceId = null;
      }, 60);
    };
    handleRef = handle;
    try {
      window.addEventListener('resize', handleRef, true);
      window.addEventListener('scroll', handleRef, true);
    } catch {}

    mutationObserver = new MutationObserver((mutations) => {
      if (isAnimating) return;
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          shouldUpdate = true;
          break;
        }
        if (mutation.type === 'attributes') {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        updateAdditionalBounds();
      }
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  });

  onDestroy(() => {
    document.body.style.overflow = '';
    if (handleRef) {
      try {
        window.removeEventListener('resize', handleRef, true);
        window.removeEventListener('scroll', handleRef, true);
      } catch {}
      handleRef = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
  });
</script>

{#if visible}
  <div class="tutorial-overlay" class:has-spotlight={!!targetBounds}>
    <svg
      class="tutorial-overlay-svg"
      width={window.innerWidth}
      height={window.innerHeight}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {#if targetBounds}
            <rect
              x={targetBounds.left - 8}
              y={targetBounds.top - 8}
              width={targetBounds.width + 16}
              height={targetBounds.height + 16}
              rx="12"
              fill="black"
              style={isAnimating ? "will-change: auto;" : "transition: x 0.4s cubic-bezier(0.4, 0, 0.2, 1), y 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1); will-change: x, y, width, height;"}
            />
          {/if}
          {#each additionalBounds as bounds}
            <rect
              x={bounds.left - 8}
              y={bounds.top - 8}
              width={bounds.width + 16}
              height={bounds.height + 16}
              rx="12"
              fill="black"
              style={isAnimating ? "will-change: auto;" : "transition: x 0.4s cubic-bezier(0.4, 0, 0.2, 1), y 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1); will-change: x, y, width, height;"}
            />
          {/each}
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="var(--wph-backdrop, rgba(0, 0, 0, 0.7))"
        mask={`url(#${maskId})`}
        style="pointer-events: none;"
      />
    </svg>
  </div>
{/if}

<style>
  .tutorial-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483800;
    pointer-events: none !important;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tutorial-overlay-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none !important;
  }
</style>
