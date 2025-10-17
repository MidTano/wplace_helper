<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ElementBounds } from '../utils/positioning';

  export let targetBounds: ElementBounds | null = null;
  export let visible: boolean = true;
  export let isAnimating: boolean = false;

  let mounted = false;

  onMount(() => {
    mounted = true;
  });

  onDestroy(() => {
    mounted = false;
  });
</script>

{#if visible && targetBounds && mounted}
  <div
    class="tutorial-spotlight"
    class:no-transition={isAnimating}
    style="
      top: {targetBounds.top - 8}px;
      left: {targetBounds.left - 8}px;
      width: {targetBounds.width + 16}px;
      height: {targetBounds.height + 16}px;
      pointer-events: none;
    "
    role="presentation"
    aria-hidden="true"
  >
    <div class="spotlight-ring spotlight-ring-1"></div>
    <div class="spotlight-ring spotlight-ring-2"></div>
    <div class="spotlight-ring spotlight-ring-3"></div>
  </div>
{/if}

<style>
  .tutorial-spotlight {
    position: fixed;
    z-index: 2147483850;
    pointer-events: none;
    border-radius: 12px;
    transition: top 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                left 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                width 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    filter: saturate(1.25) brightness(1.08);
    will-change: top, left, width, height;
  }

  .tutorial-spotlight.no-transition {
    transition: none !important;
    will-change: auto;
  }

  .spotlight-ring {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 14px;
    pointer-events: none !important;
  }

  .spotlight-ring-1 {
    border: 2px solid var(--wph-primary, #f05123);
    box-shadow: 
      0 0 32px var(--wph-primaryGlow, rgba(240, 81, 35, 0.7)),
      inset 0 0 28px var(--wph-primaryGlow, rgba(240, 81, 35, 0.45));
    animation: pulse-ring-1 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .spotlight-ring-2 {
    border: 2px solid var(--wph-primaryGlow, rgba(240, 81, 35, 0.5));
    animation: pulse-ring-2 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    animation-delay: 0.3s;
  }

  .spotlight-ring-3 {
    border: 1px solid var(--wph-primaryGlow, rgba(240, 81, 35, 0.35));
    animation: pulse-ring-3 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    animation-delay: 0.6s;
  }

  @keyframes pulse-ring-1 {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }

  @keyframes pulse-ring-2 {
    0%, 100% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.3;
    }
  }

  @keyframes pulse-ring-3 {
    0%, 100% {
      transform: scale(1);
      opacity: 0.4;
    }
    50% {
      transform: scale(1.15);
      opacity: 0;
    }
  }
</style>
