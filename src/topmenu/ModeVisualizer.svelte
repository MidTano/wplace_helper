<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  export let mode: string = '';
  export let visible: boolean = false;
  export let x: number = 0;
  export let y: number = 0;

  const gridSize = 5;
  const tailLen = 8;
  let posByIndex: number[] = [];
  let currentSequence: number[] = [];
  let rafId: number | null = null;
  let startTs = 0;
  let rootEl: HTMLDivElement | null = null;
  let portalEl: HTMLDivElement | null = null;
  let startedForMode = '';
  let cellEls: HTMLDivElement[] = [];

  onMount(() => {
    try {
      portalEl = document.createElement('div');
      portalEl.style.position = 'fixed';
      portalEl.style.left = '0';
      portalEl.style.top = '0';
      portalEl.style.width = '0';
      portalEl.style.height = '0';
      portalEl.style.zIndex = '1000025';
      document.body.appendChild(portalEl);
      portalEl.appendChild(rootEl!);
      (window as any).__modeVisualizerEl = rootEl;
      try { startAnimation(); } catch {}
    } catch {}
  });

  onDestroy(() => {
    try {
      try { stopAnimation(); } catch {}
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

    const n = gridSize;
    const rowMajor = () => {
      for (let yy = 0; yy < n; yy++) {
        for (let xx = 0; xx < n; xx++) seq.push(yy * n + xx);
      }
    };
    const colMajor = () => {
      for (let xx = 0; xx < n; xx++) {
        for (let yy = 0; yy < n; yy++) seq.push(yy * n + xx);
      }
    };
    const cellsAll = (): Array<[number, number, number]> => {
      const out: Array<[number, number, number]> = [];
      for (let yy = 0; yy < n; yy++) {
        for (let xx = 0; xx < n; xx++) out.push([xx, yy, yy * n + xx]);
      }
      return out;
    };
    const shuffle = () => {
      for (let i = seq.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = seq[i];
        seq[i] = seq[j];
        seq[j] = t;
      }
    };

    if (mode === 'topDown') {
      rowMajor();
    } else if (mode === 'bottomUp') {
      for (let yy = n - 1; yy >= 0; yy--) {
        for (let xx = 0; xx < n; xx++) seq.push(yy * n + xx);
      }
    } else if (mode === 'leftRight') {
      colMajor();
    } else if (mode === 'rightLeft') {
      for (let xx = n - 1; xx >= 0; xx--) {
        for (let yy = 0; yy < n; yy++) seq.push(yy * n + xx);
      }
    } else if (mode === 'snakeRow') {
      for (let yy = 0; yy < n; yy++) {
        if ((yy & 1) === 0) {
          for (let xx = 0; xx < n; xx++) seq.push(yy * n + xx);
        } else {
          for (let xx = n - 1; xx >= 0; xx--) seq.push(yy * n + xx);
        }
      }
    } else if (mode === 'snakeCol') {
      for (let xx = 0; xx < n; xx++) {
        if ((xx & 1) === 0) {
          for (let yy = 0; yy < n; yy++) seq.push(yy * n + xx);
        } else {
          for (let yy = n - 1; yy >= 0; yy--) seq.push(yy * n + xx);
        }
      }
    } else if (mode === 'diagDown') {
      const c = cellsAll();
      c.sort((a, b) => {
        const sa = a[0] + a[1];
        const sb = b[0] + b[1];
        if (sa !== sb) return sa - sb;
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
      });
      for (let i = 0; i < c.length; i++) seq.push(c[i][2]);
    } else if (mode === 'diagUp') {
      const c = cellsAll();
      c.sort((a, b) => {
        const da = a[0] - a[1];
        const db = b[0] - b[1];
        if (da !== db) return da - db;
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
      });
      for (let i = 0; i < c.length; i++) seq.push(c[i][2]);
    } else if (mode === 'diagDownRight') {
      const c = cellsAll();
      c.sort((a, b) => {
        const sa = (n - 1 - a[0]) + a[1];
        const sb = (n - 1 - b[0]) + b[1];
        if (sa !== sb) return sa - sb;
        if (a[0] !== b[0]) return b[0] - a[0];
        return a[1] - b[1];
      });
      for (let i = 0; i < c.length; i++) seq.push(c[i][2]);
    } else if (mode === 'diagUpRight') {
      const c = cellsAll();
      c.sort((a, b) => {
        const sa = (n - 1 - a[0]) + (n - 1 - a[1]);
        const sb = (n - 1 - b[0]) + (n - 1 - b[1]);
        if (sa !== sb) return sa - sb;
        if (a[0] !== b[0]) return b[0] - a[0];
        return a[1] - b[1];
      });
      for (let i = 0; i < c.length; i++) seq.push(c[i][2]);
    } else if (mode === 'centerOut' || mode === 'edgesIn') {
      const cx = (n - 1) / 2;
      const cy = (n - 1) / 2;
      const cells: Array<[number, number, number]> = [];
      for (let yy = 0; yy < n; yy++) {
        for (let xx = 0; xx < n; xx++) {
          const dx = xx - cx;
          const dy = yy - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          cells.push([d, yy * n + xx, Math.atan2(dy, dx)]);
        }
      }
      cells.sort((a, b) => {
        if (a[0] !== b[0]) return a[0] - b[0];
        if (a[2] !== b[2]) return a[2] - b[2];
        return a[1] - b[1];
      });
      for (let i = 0; i < cells.length; i++) seq.push(cells[i][1]);
      if (mode === 'edgesIn') seq.reverse();
    } else if (mode === 'random') {
      rowMajor();
      shuffle();
    } else if (mode === 'scan') {
      for (let yy = 0; yy < n; yy++) {
        if ((yy & 1) === 0) {
          for (let xx = 0; xx < n; xx++) seq.push(yy * n + xx);
        } else {
          for (let xx = n - 1; xx >= 0; xx--) seq.push(yy * n + xx);
        }
      }
    } else {
      return [];
    }
    
    return seq;
  }

  const stepDelay = 120;
  const resetDelay = 520;
  const settleFill = 0.68;
  const tailBoostFill = 0.18;
  const flashBoostFill = 0.38;
  const flashBoostTail = 0.75;
  const tailOutSteps = tailLen + 1;

  function stopAnimation() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    startTs = 0;
    currentSequence = [];
  }

  function tick(ts: number) {
    try {
      if (!visible || currentSequence.length === 0) {
        rafId = null;
        return;
      }
      if (!startTs) startTs = ts;
      const seqDur = currentSequence.length * stepDelay;
      const tailOutDur = tailOutSteps * stepDelay;
      const cycleDur = seqDur + tailOutDur + resetDelay;
      const p = (ts - startTs) % cycleDur;
      const lastIndex = Math.max(0, currentSequence.length - 1);
      const painting = p < seqDur;
      const tailing = !painting && p < (seqDur + tailOutDur);
      const stepIndex = painting
        ? Math.max(0, Math.min(lastIndex, Math.floor(p / stepDelay)))
        : lastIndex;
      const virtualIndex = tailing
        ? (lastIndex + (Math.max(0, Math.floor((p - seqDur) / stepDelay)) + 1))
        : (lastIndex + tailOutSteps);
      const head = painting ? currentSequence[stepIndex] : -1;
      const stepT = painting ? (p - stepIndex * stepDelay) : 0;
      const flash = painting ? Math.max(0, Math.min(1, 1 - stepT / Math.max(1, stepDelay))) : 0;
      const t = painting ? Math.max(0, Math.min(1, stepT / Math.max(1, stepDelay))) : 0;
      const s = painting ? Math.sin(Math.PI * t) : 0;
      const pop = painting ? (Math.pow(s, 0.55) * (1 + 0.45 * s)) : 0;

      try {
        if (rootEl && (!cellEls || !cellEls.length)) {
          cellEls = Array.from(rootEl.querySelectorAll('.cell')) as any;
        }
        if (cellEls && cellEls.length === gridSize * gridSize) {
          for (let i = 0; i < cellEls.length; i++) {
            const el = cellEls[i];
            const pos = posByIndex[i];
            const done = (pos != null && pos >= 0 && pos <= stepIndex) ? 1 : 0;
            let tail = 0;
            if ((painting || tailing) && pos != null && pos >= 0) {
              const d = (painting ? stepIndex : virtualIndex) - pos;
              if (d >= 0 && d <= tailLen) {
                tail = 1 - d / Math.max(1, tailLen);
                if (tail < 0) tail = 0;
              }
            }

            const headFlash = (head === i) ? flash : 0;
            const headPop = (head === i) ? pop : 0;
            let fill = 0;
            if (done) fill = settleFill;
            fill += tail * tailBoostFill;
            fill += headFlash * flashBoostFill;
            if (fill > 1) fill = 1;

            const pTail = Math.max(tail, headFlash * flashBoostTail);

            try { el.style.setProperty('--done', String(done)); } catch {}
            try { el.style.setProperty('--p', String(pTail)); } catch {}
            try { el.style.setProperty('--flash', String(headFlash)); } catch {}
            try { el.style.setProperty('--pop', String(headPop)); } catch {}
            try { el.style.setProperty('--fill', String(fill)); } catch {}
          }
        }
      } catch {}
    } catch {}
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  function startAnimation() {
    stopAnimation();
    currentSequence = getSequence(mode);
    if (currentSequence.length === 0) return;
    posByIndex = new Array(gridSize * gridSize).fill(-1);
    for (let i = 0; i < currentSequence.length; i++) posByIndex[currentSequence[i]] = i;
    cellEls = [];
    startLoop();
  }

  $: if (visible && mode && startedForMode !== mode) {
    startedForMode = mode;
    try { startAnimation(); } catch {}
  }

  $: if (visible && currentSequence.length && rafId === null) {
    try { startLoop(); } catch {}
  }

  $: if (!visible) {
    try { stopAnimation(); } catch {}
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
    style="left: {x}px; top: {y}px;"
    bind:this={rootEl}
  >
    <div class="grid">
      {#each Array(gridSize * gridSize) as _, i}
        <div 
          class="cell" 
          data-i={i}
        >
          <div class="fx" />
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .visualizer {
    position: fixed;
    transform: translateY(-50%) scale(1);
    transform-origin: left center;
    padding: 12px;
    border-radius: 14px;
    background: var(--wph-surface, rgba(8,8,12,0.96));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.14));
    box-shadow: 0 18px 44px rgba(0,0,0,0.55);
    backdrop-filter: blur(6px);
    pointer-events: none;
    animation: mv_in 180ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
  }

  @keyframes mv_in {
    0% { opacity: 0; transform: translateY(-50%) translateX(-6px) scale(0.96); }
    100% { opacity: 1; transform: translateY(-50%) translateX(0px) scale(1); }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(5, 14px);
    grid-template-rows: repeat(5, 14px);
    gap: 3px;
  }

  .cell {
    width: 14px;
    height: 14px;
    border-radius: 5px;
    position: relative;
    overflow: hidden;
    background: var(--wph-surface2, rgba(255,255,255,0.08));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.12));
    --p: 0;
    --done: 0;
    --flash: 0;
    --pop: 0;
    --fill: 0;
    transform: scale(calc(0.92 + var(--p) * 0.08 + var(--flash) * 0.06 + var(--pop) * 0.18));
    opacity: calc(0.55 + var(--done) * 0.25 + var(--p) * 0.2);
    box-shadow:
      0 0 calc(var(--p) * 22px + var(--flash) * 28px) var(--wph-primaryGlow, rgba(240,81,35,0.45)),
      0 0 calc(var(--flash) * 10px) rgba(255,255,255,0.12);
    transition: transform 70ms ease, opacity 70ms ease, box-shadow 90ms ease;
  }

  .cell::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 4px;
    opacity: calc(var(--done) * 0.55);
    background:
      linear-gradient(45deg,
        rgba(255,255,255,0) 44%,
        rgba(255,255,255,0.16) 46%,
        rgba(255,255,255,0.16) 54%,
        rgba(255,255,255,0) 56%),
      linear-gradient(-45deg,
        rgba(255,255,255,0) 44%,
        rgba(255,255,255,0.12) 46%,
        rgba(255,255,255,0.12) 54%,
        rgba(255,255,255,0) 56%);
    mix-blend-mode: screen;
    transition: opacity 120ms ease;
  }

  .cell::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 4px;
    background: var(--wph-primary, #f05123);
    opacity: var(--fill);
    transition: opacity 90ms ease;
  }

  .fx {
    position: absolute;
    inset: -10px;
    border-radius: 14px;
    opacity: calc(var(--flash) * 0.95);
    transform: scale(calc(0.6 + var(--flash) * 1.25)) rotate(calc(var(--flash) * 18deg));
    transform-origin: center;
    pointer-events: none;
    background:
      radial-gradient(circle at 20% 25%, rgba(255,255,255,0.35) 0 2px, rgba(255,255,255,0) 3px),
      radial-gradient(circle at 75% 30%, rgba(255,255,255,0.28) 0 2px, rgba(255,255,255,0) 3px),
      radial-gradient(circle at 30% 75%, rgba(255,255,255,0.25) 0 2px, rgba(255,255,255,0) 3px),
      radial-gradient(circle at 80% 78%, rgba(255,255,255,0.22) 0 2px, rgba(255,255,255,0) 3px),
      radial-gradient(circle at 50% 50%, rgba(240,81,35,0.55) 0 6px, rgba(240,81,35,0) 14px);
    filter: blur(0.2px);
    mix-blend-mode: screen;
  }

  .fx::before {
    content: '';
    position: absolute;
    inset: 5px;
    border-radius: 12px;
    border: 2px solid rgba(240,81,35,0.7);
    opacity: calc(var(--flash) * 0.8);
    transform: scale(calc(0.75 + var(--flash) * 0.45));
  }
</style>
