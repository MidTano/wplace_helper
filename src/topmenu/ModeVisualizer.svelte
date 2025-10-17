<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { log } from '../overlay/log';

  export let mode: string = '';
  export let visible: boolean = false;
  export let x: number = 0;
  export let y: number = 0;

  const gridSize = 10;
  let activeIndices: Set<number> = new Set();
  let currentIndex = 0;
  let currentSequence: number[] = [];
  let animationTimer: number | null = null;
  let rootEl: HTMLDivElement | null = null;
  let portalEl: HTMLDivElement | null = null;

  onMount(() => {
    log('ModeVisualizer', 'mount-init');
    try {
      portalEl = document.createElement('div');
      portalEl.style.position = 'fixed';
      portalEl.style.left = '0';
      portalEl.style.top = '0';
      portalEl.style.width = '0';
      portalEl.style.height = '0';
      portalEl.style.zIndex = '1000007';
      document.body.appendChild(portalEl);
      portalEl.appendChild(rootEl!);
      (window as any).__modeVisualizerEl = rootEl;
    } catch (err) {
      log('ModeVisualizer', 'mount-error', err);
    }
  });

  onDestroy(() => {
    try {
      if ((window as any).__modeVisualizerEl === rootEl) {
        (window as any).__modeVisualizerEl = null;
      }
      if (portalEl && portalEl.parentNode) {
        portalEl.parentNode.removeChild(portalEl);
        portalEl = null;
      }
    } catch {}
  });

  function getSequence(mode: string): number[] {
    const seq: number[] = [];
    
    if (mode === 'topDown') {
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          seq.push(y * gridSize + x);
        }
      }
    } else if (mode === 'bottomUp') {
      for (let y = gridSize - 1; y >= 0; y--) {
        for (let x = 0; x < gridSize; x++) {
          seq.push(y * gridSize + x);
        }
      }
    } else if (mode === 'leftRight') {
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          seq.push(y * gridSize + x);
        }
      }
    } else if (mode === 'rightLeft') {
      for (let x = gridSize - 1; x >= 0; x--) {
        for (let y = 0; y < gridSize; y++) {
          seq.push(y * gridSize + x);
        }
      }
    } else if (mode === 'diagDown') {
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          seq.push(y * gridSize + x);
        }
      }
      seq.sort((a, b) => {
        const ax = a % gridSize, ay = Math.floor(a / gridSize);
        const bx = b % gridSize, by = Math.floor(b / gridSize);
        const sa = ax + ay;
        const sb = bx + by;
        return sa === sb ? ax - bx : sa - sb;
      });
    } else if (mode === 'diagUp') {
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          seq.push(y * gridSize + x);
        }
      }
      seq.sort((a, b) => {
        const ax = a % gridSize, ay = Math.floor(a / gridSize);
        const bx = b % gridSize, by = Math.floor(b / gridSize);
        const da = ax - ay;
        const db = bx - by;
        return da === db ? ax - bx : da - db;
      });
    } else if (mode === 'snakeRow') {
      for (let y = 0; y < gridSize; y++) {
        if (y % 2 === 0) {
          for (let x = 0; x < gridSize; x++) {
            seq.push(y * gridSize + x);
          }
        } else {
          for (let x = gridSize - 1; x >= 0; x--) {
            seq.push(y * gridSize + x);
          }
        }
      }
    } else if (mode === 'snakeCol') {
      for (let x = 0; x < gridSize; x++) {
        if (x % 2 === 0) {
          for (let y = 0; y < gridSize; y++) {
            seq.push(y * gridSize + x);
          }
        } else {
          for (let y = gridSize - 1; y >= 0; y--) {
            seq.push(y * gridSize + x);
          }
        }
      }
    } else if (mode === 'diagDownRight') {
      for (let x = gridSize - 1; x >= 0; x--) {
        for (let y = 0; y < gridSize; y++) {
          seq.push(y * gridSize + x);
        }
      }
      seq.sort((a, b) => {
        const ax = a % gridSize, ay = Math.floor(a / gridSize);
        const bx = b % gridSize, by = Math.floor(b / gridSize);
        const sa = (gridSize - 1 - ax) + ay;
        const sb = (gridSize - 1 - bx) + by;
        return sa === sb ? bx - ax : sa - sb;
      });
    } else if (mode === 'diagUpRight') {
      for (let x = gridSize - 1; x >= 0; x--) {
        for (let y = 0; y < gridSize; y++) {
          seq.push(y * gridSize + x);
        }
      }
      seq.sort((a, b) => {
        const ax = a % gridSize, ay = Math.floor(a / gridSize);
        const bx = b % gridSize, by = Math.floor(b / gridSize);
        const da = (gridSize - 1 - ax) - ay;
        const db = (gridSize - 1 - bx) - by;
        return da === db ? bx - ax : da - db;
      });
    } else if (mode === 'centerOut' || mode === 'edgesIn') {
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          seq.push(y * gridSize + x);
        }
      }
      const center = (gridSize - 1) / 2;
      seq.sort((a, b) => {
        const ax = a % gridSize, ay = Math.floor(a / gridSize);
        const bx = b % gridSize, by = Math.floor(b / gridSize);
        const da = (ax - center) * (ax - center) + (ay - center) * (ay - center);
        const db = (bx - center) * (bx - center) + (by - center) * (by - center);
        if (da !== db) return mode === 'centerOut' ? da - db : db - da;
        if (ay !== by) return ay - by;
        return ax - bx;
      });
    } else {
      for (let i = 0; i < gridSize * gridSize; i++) {
        seq.push(i);
      }
      let rngSeed = 7;
      function rnd() {
        rngSeed ^= rngSeed << 13;
        rngSeed ^= rngSeed >> 17;
        rngSeed ^= rngSeed << 5;
        return (rngSeed >>> 0) / 4294967296;
      }
      seq.sort(() => rnd() - 0.5);
    }
    
    return seq;
  }

  const stepDelay = 36;
  const resetDelay = 700;

  function stopAnimation() {
    if (animationTimer !== null) {
      clearTimeout(animationTimer);
      animationTimer = null;
    }
    currentSequence = [];
    currentIndex = -1;
    activeIndices = new Set();
  }

  function scheduleNext() {
    if (!visible || currentSequence.length === 0) return;
    currentIndex += 1;
    if (currentIndex >= currentSequence.length) {
      animationTimer = window.setTimeout(() => {
        currentIndex = -1;
        activeIndices = new Set();
        scheduleNext();
      }, resetDelay);
      return;
    }
    const indices = currentSequence.slice(0, currentIndex + 1);
    activeIndices = new Set(indices);
    animationTimer = window.setTimeout(scheduleNext, stepDelay);
  }

  function startAnimation() {
    stopAnimation();
    currentSequence = getSequence(mode);
    if (currentSequence.length === 0) return;
    currentIndex = -1;
    animationTimer = window.setTimeout(scheduleNext, stepDelay);
  }

  let wasVisible = false;
  let lastMode = '';

  $: {
    if (visible) {
      if (!wasVisible || lastMode !== mode) {
        log('ModeVisualizer', 'visible', { mode, x, y });
        startAnimation();
      }
    } else if (wasVisible) {
      log('ModeVisualizer', 'hidden');
      stopAnimation();
    }
    wasVisible = visible;
    lastMode = mode;
  }

  $: if (portalEl && rootEl && rootEl.parentNode !== portalEl) {
    portalEl.appendChild(rootEl);
  }
</script>

{#if visible}
  <div 
    class="visualizer" 
    data-mode={mode} 
    role="presentation"
    style="left: {x + 40}px; top: {y}px;"
    bind:this={rootEl}
  >
    <div class="grid">
      {#each Array(gridSize * gridSize) as _, i}
        <div 
          class="cell" 
          class:active={activeIndices.has(i)}
        />
      {/each}
    </div>
  </div>
{/if}

<style>
  .visualizer {
    position: fixed;
    transform: translateY(-50%);
    background: var(--wph-surface, rgba(26, 26, 26, 0.95));
    border: 1px solid var(--wph-border, rgba(255, 255, 255, 0.15));
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 
                0 0 0 1px rgba(255, 255, 255, 0.05);
    z-index: 1000015;
    backdrop-filter: blur(20px) saturate(180%);
    animation: visualizerFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  @keyframes visualizerFadeIn {
    from {
      opacity: 0;
      transform: translateY(-50%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    width: 140px;
    height: 140px;
  }

  .cell {
    background: var(--wph-surface2, rgba(255, 255, 255, 0.06));
    border-radius: 3px;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
  }

  .cell.active {
    background: var(--wph-primary, #f05123);
    box-shadow: 0 0 12px var(--wph-primaryGlow, rgba(240, 81, 35, 0.6)),
                0 2px 4px rgba(0, 0, 0, 0.3);
    transform: scale(1.15);
    border-color: var(--wph-primary, #f05123);
  }

  @media (prefers-color-scheme: light) {
    .visualizer {
      background: var(--wph-surface, rgba(255, 255, 255, 0.95));
      border-color: var(--wph-border, rgba(0, 0, 0, 0.12));
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 
                  0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    .cell {
      background: var(--wph-surface2, rgba(0, 0, 0, 0.04));
    }
  }
</style>
