<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let targetBounds: { centerX: number; centerY: number; top: number; left: number; right: number; bottom: number; width: number; height: number } | null = null;
  export let isActive: boolean = false;

  let cursorX = 0;
  let cursorY = 0;
  let targetX = 0;
  let targetY = 0;
  let arrows: Array<{ x: number; y: number; angle: number; opacity: number; scale: number; id: number }> = [];
  let animationFrame: number;
  let updateInterval: number;
  let arrowIdCounter = 0;
  let showGuide = false;
  let lastUpdateTime = 0;
  let idleTime = 0;

  const IDLE_THRESHOLD = 2000;
  const ARROW_SPACING = 60;
  const MAX_ARROWS = 15;

  function handleMouseMove(e: MouseEvent) {
    cursorX = e.clientX;
    cursorY = e.clientY;
    idleTime = 0;
  }

  function getClosestPointOnBounds(bounds: typeof targetBounds, fromX: number, fromY: number): { x: number; y: number } {
    if (!bounds) return { x: fromX, y: fromY };

    const centerX = bounds.centerX;
    const centerY = bounds.centerY;
    
    const dx = centerX - fromX;
    const dy = centerY - fromY;
    const angle = Math.atan2(dy, dx);
    
    let closestX = centerX;
    let closestY = centerY;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    if (Math.abs(cos) > Math.abs(sin)) {
      if (cos > 0) {
        closestX = bounds.left;
        closestY = centerY + (bounds.left - centerX) * Math.tan(angle);
      } else {
        closestX = bounds.right;
        closestY = centerY + (bounds.right - centerX) * Math.tan(angle);
      }
    } else {
      if (sin > 0) {
        closestY = bounds.top;
        closestX = centerX + (bounds.top - centerY) / Math.tan(angle);
      } else {
        closestY = bounds.bottom;
        closestX = centerX + (bounds.bottom - centerY) / Math.tan(angle);
      }
    }
    
    closestX = Math.max(bounds.left, Math.min(bounds.right, closestX));
    closestY = Math.max(bounds.top, Math.min(bounds.bottom, closestY));
    
    return { x: closestX, y: closestY };
  }

  function calculateArrowPath() {
    if (!targetBounds || !isActive) {
      showGuide = false;
      return;
    }

    const closestPoint = getClosestPointOnBounds(targetBounds, cursorX, cursorY);
    targetX = closestPoint.x;
    targetY = closestPoint.y;

    const dx = targetX - cursorX;
    const dy = targetY - cursorY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 100) {
      showGuide = false;
      return;
    }

    if (idleTime < IDLE_THRESHOLD) {
      showGuide = false;
      return;
    }

    showGuide = true;

    const angle = Math.atan2(dy, dx);
    const numArrows = Math.min(Math.floor(distance / ARROW_SPACING), MAX_ARROWS);

    const newArrows: typeof arrows = [];

    for (let i = 1; i <= numArrows; i++) {
      const t = i / (numArrows + 1);
      
      const curveAmount = Math.sin(t * Math.PI) * 30;
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      
      const x = cursorX + dx * t + perpX * curveAmount;
      const y = cursorY + dy * t + perpY * curveAmount;

      const nextT = Math.min(t + 0.05, 1);
      const nextX = cursorX + dx * nextT + perpX * Math.sin(nextT * Math.PI) * 30;
      const nextY = cursorY + dy * nextT + perpY * Math.sin(nextT * Math.PI) * 30;
      const arrowAngle = Math.atan2(nextY - y, nextX - x);

      const opacity = 0.55 + Math.sin(Date.now() / 500 + i * 0.3) * 0.3;
      const scale = 0.8 + Math.sin(Date.now() / 400 + i * 0.5) * 0.2;

      newArrows.push({
        x,
        y,
        angle: arrowAngle,
        opacity,
        scale,
        id: arrowIdCounter++
      });
    }

    arrows = newArrows;
  }


  function animate() {
    const now = Date.now();
    const deltaTime = now - lastUpdateTime;
    lastUpdateTime = now;

    idleTime += deltaTime;

    animationFrame = requestAnimationFrame(animate);
  }

  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    lastUpdateTime = Date.now();
    animate();

    updateInterval = window.setInterval(() => {
      calculateArrowPath();
    }, 50);
  });

  onDestroy(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (updateInterval) clearInterval(updateInterval);
  });
</script>

{#if showGuide && isActive}
  <svg
    class="cursor-guide"
    style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483880;"
  >
    <defs>
      <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color: var(--wph-primary, #f05123); stop-opacity: 0.3" />
        <stop offset="50%" style="stop-color: var(--wph-primary-2, #ff6b3d); stop-opacity: 0.8" />
        <stop offset="100%" style="stop-color: var(--wph-primary, #f05123); stop-opacity: 0.3" />
      </linearGradient>

      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

    </defs>

    {#each arrows as arrow (arrow.id)}
      <g
        transform="translate({arrow.x}, {arrow.y}) rotate({arrow.angle * 180 / Math.PI}) scale({arrow.scale})"
        opacity={arrow.opacity}
      >
        <path
          d="M -12 -8 L 0 0 L -12 8 L -8 0 Z"
          fill="url(#arrowGradient)"
          stroke="var(--wph-primary, #f05123)"
          stroke-width="1"
          filter="url(#glow)"
        />
      </g>
    {/each}
  </svg>
{/if}

<style>
  .cursor-guide {
    animation: fadeIn 0.5s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
