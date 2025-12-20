<script>
  import { appendToBody } from '../editor/modal/utils/appendToBody';

  export let title = '';
  export let content = '';
  export let position = 'top';

  let showTooltip = false;
  let tooltipEl;
  let iconEl;

  function updatePosition() {
    if (!tooltipEl || !iconEl) return;

    const iconRect = iconEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
    let top;

    switch (position) {
      case 'bottom':
        top = iconRect.bottom + 10;
        break;
      case 'left':
        left = iconRect.left - tooltipRect.width - 10;
        top = iconRect.top + iconRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        left = iconRect.right + 10;
        top = iconRect.top + iconRect.height / 2 - tooltipRect.height / 2;
        break;
      default:
        top = iconRect.top - tooltipRect.height - 10;
    }

    left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - tooltipRect.height - 8));

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  }

  function show() {
    showTooltip = true;
    setTimeout(() => {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }, 0);
  }

  function hide() {
    showTooltip = false;
    window.removeEventListener('scroll', updatePosition);
    window.removeEventListener('resize', updatePosition);
  }
</script>

<button
  bind:this={iconEl}
  class="info-icon"
  aria-label={title}
  on:mouseenter={show}
  on:mouseleave={hide}
  on:focus={show}
  on:blur={hide}
>
  <span class="info-symbol">i</span>
</button>

{#if showTooltip}
  <div bind:this={tooltipEl} use:appendToBody class="info-tooltip" role="tooltip">
    {#if title}<div class="tooltip-title">{title}</div>{/if}
    <div class="tooltip-content">{content}</div>
  </div>
{/if}

<style>
  .info-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: transparent;
    color: currentColor;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .info-icon:hover,
  .info-icon:focus {
    color: var(--wph-primary, #f05123);
    outline: none;
  }
  .info-symbol {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }

  .info-tooltip {
    position: fixed;
    z-index: 1000020;
    max-width: 320px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(8, 8, 12, 0.95);
    color: #fff;
    font-size: 12px;
    line-height: 1.45;
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
    animation: tooltipFadeIn 0.15s ease;
    pointer-events: none;
  }

  .tooltip-title {
    font-weight: 700;
    margin-bottom: 6px;
    color: rgba(255, 255, 255, 0.95);
  }

  .tooltip-content {
    color: rgba(255, 255, 255, 0.82);
    white-space: pre-line;
  }

  @keyframes tooltipFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
