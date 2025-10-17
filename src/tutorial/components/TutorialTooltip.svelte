<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { t } from '../../i18n';
  import type { TooltipPosition } from '../config/tutorialSteps';
  import { slideIn } from '../utils/animations';

  export let title: string = '';
  export let description: string = '';
  export let position: TooltipPosition = 'bottom';
  export let stepNumber: number = 1;
  export let totalSteps: number = 1;
  export let isFirstStep: boolean = false;
  export let isLastStep: boolean = false;
  export let blockPrev: boolean = false;
  export let top: number = 0;
  export let left: number = 0;
  export let blockNext: boolean = false;

  const dispatch = createEventDispatcher();

  let tooltipRootEl: HTMLDivElement;
  let tooltipContentEl: HTMLDivElement;
  let prevTop = top;
  let prevLeft = left;
  let baseTransform = '';

  onMount(() => {
    if (tooltipContentEl) {
      const direction = position === 'top' ? 'bottom' : position === 'bottom' ? 'top' : position;
      slideIn(tooltipContentEl, direction as any, { duration: 400 });
    }
    measure();
    try {
      const ro = new ResizeObserver(() => { measure(); });
      ro.observe(tooltipRootEl);
    } catch {}
    if (tooltipRootEl) {
      tooltipRootEl.style.transform = baseTransform || 'translate3d(0,0,0)';
    }
  });

  function handleNext() {
    dispatch('next');
  }

  function handlePrev() {
    dispatch('prev');
  }

  function handleSkipAll() {
    dispatch('skipAll');
  }

  function measure() {
    if (!tooltipRootEl) return;
    const rect = tooltipRootEl.getBoundingClientRect();
    dispatch('measure', { width: rect.width, height: rect.height });
  }

  $: baseTransform = position === 'center' ? 'translate(-50%, -50%)' : '';
  $: if (tooltipRootEl && (top !== prevTop || left !== prevLeft)) {
    const dx = prevLeft - left;
    const dy = prevTop - top;
    tooltipRootEl.style.transition = 'none';
    tooltipRootEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) ${baseTransform}`.trim();
    void tooltipRootEl.offsetWidth;
    tooltipRootEl.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
    tooltipRootEl.style.transform = `${baseTransform}` || 'translate3d(0,0,0)';
    prevTop = top;
    prevLeft = left;
  } else if (tooltipRootEl) {
    tooltipRootEl.style.transform = `${baseTransform}` || 'translate3d(0,0,0)';
  }
</script>

<div
  bind:this={tooltipRootEl}
  class="tutorial-tooltip"
  class:position-top={position === 'top'}
  class:position-bottom={position === 'bottom'}
  class:position-left={position === 'left'}
  class:position-right={position === 'right'}
  class:position-center={position === 'center'}
  style="top: {top}px; left: {left}px;"
>
  <div class="tooltip-content" bind:this={tooltipContentEl}>
    <div class="tooltip-arrow" data-position={position}></div>
    
    <div class="tooltip-header">
      <div class="tooltip-progress">
        <span class="progress-text">{t('tutorial.progress.step').replace('{current}', String(stepNumber)).replace('{total}', String(totalSteps))}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {(stepNumber / totalSteps) * 100}%"></div>
        </div>
      </div>
    </div>

    <div class="tooltip-body">
      <h3 class="tooltip-title">{t(title)}</h3>
      <p class="tooltip-description">{t(description)}</p>
    </div>

    <div class="tooltip-footer">
      <button type="button" class="editor-btn tooltip-skip" on:click={handleSkipAll} title={t('tutorial.navigation.skipAll')}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      <div class="tooltip-actions">
        {#if !isFirstStep}
          <button type="button" class="editor-btn tooltip-prev" on:click={handlePrev} disabled={blockPrev}>
            {t('tutorial.navigation.prev')}
          </button>
        {/if}

        <button type="button" class="editor-btn editor-primary tooltip-next" on:click={handleNext} disabled={blockNext}>
          {isLastStep ? t('tutorial.navigation.complete') : t('tutorial.navigation.next')}
        </button>
      </div>
    </div>
  </div>
</div>
<style>
  .tutorial-tooltip {
    position: fixed;
    z-index: 2147483900;
    min-width: 280px;
    max-width: 360px;
    background: var(--wph-surface, rgba(10, 10, 10, 0.95));
    border: 1px solid var(--wph-border, rgba(255, 255, 255, 0.15));
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1),
                opacity 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
    will-change: transform;
    contain: layout paint;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }


  .tooltip-content {
    will-change: transform, opacity;
    transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .position-bottom .tooltip-content { transform: translateY(8px); }

  .position-top .tooltip-content { transform: translateY(-8px); }

  .position-left .tooltip-content { transform: translateX(-8px); }

  .position-right .tooltip-content { transform: translateX(8px); }


  .tooltip-arrow {
    width: 16px;
    height: 16px;
    background: var(--wph-surface, rgba(10, 10, 10, 0.95));
    border: 1px solid var(--wph-border, rgba(255, 255, 255, 0.15));
    transform: rotate(45deg);
    display: none;
  }

  .position-bottom .tooltip-arrow[data-position="top"] {
    display: block;
    top: -8px;
    left: 50%;
    margin-left: -8px;
    border-right: none;
    border-bottom: none;
  }

  .position-top .tooltip-arrow[data-position="bottom"] {
    display: block;
    bottom: -8px;
    left: 50%;
    margin-left: -8px;
    border-left: none;
    border-top: none;
  }

  .position-right .tooltip-arrow[data-position="left"] {
    display: block;
    left: -8px;
    top: 50%;
    margin-top: -8px;
    border-right: none;
    border-top: none;
  }

  .position-left .tooltip-arrow[data-position="right"] {
    display: block;
    right: -8px;
    top: 50%;
    margin-top: -8px;
    border-left: none;
    border-bottom: none;
  }

  .tooltip-header {
    padding: 14px 14px 12px;
  }

  .tooltip-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progress-text {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--wph-primary, #f05123);
  }

  .progress-bar {
    height: 4px;
    background: var(--wph-border, rgba(255, 255, 255, 0.1));
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--wph-primary, #f05123) 0%, var(--wph-primary-2, #ff6b3d) 100%);
  }

  .tooltip-body {
    padding: 0 14px;
  }

  .tooltip-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--wph-text, #ffffff);
    margin: 0 0 8px 0;
    line-height: 1.3;
  }

  .tooltip-description {
    font-size: 13px;
    line-height: 1.6;
    color: var(--wph-muted, rgba(255, 255, 255, 0.8));
    margin: 0;
  }

  .tooltip-footer {
    padding: 10px 14px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .editor-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 18px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.96);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background .18s ease, border-color .18s ease;
    line-height: 1;
    height: 36px;
  }

  .editor-btn svg {
    width: 16px;
    height: 16px;
  }

  .tooltip-skip {
    width: 36px;
    padding: 0;
    margin-right: auto;
  }

  .editor-btn.editor-primary {
    background: var(--wph-primary, #f05123);
    border-color: var(--wph-primary, #f05123);
    color: #fff;
    box-shadow: none;
  }

  .editor-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.16);
  }

  @media (max-width: 640px) {
    .tutorial-tooltip {
      max-width: calc(100vw - 32px);
      min-width: 280px;
    }

    .tooltip-actions { flex-wrap: wrap; }
  }
</style>
