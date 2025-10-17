<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tutorialStore } from './store/tutorialStore';
  import { checkFirstLaunch } from './store/tutorialProgress';
  import { findElement, waitForElement } from './utils/elementFinder';
  import { getElementBounds, calculateTooltipPosition } from './utils/positioning';
  import { pulseElement, glowElement } from './utils/animations';
  import type { ElementBounds } from './utils/positioning';
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  
  import WelcomeModal from './components/WelcomeModal.svelte';
  import TutorialOverlay from './components/TutorialOverlay.svelte';
  import TutorialSpotlight from './components/TutorialSpotlight.svelte';
  import TutorialTooltip from './components/TutorialTooltip.svelte';
  import TutorialCursorGuide from './components/TutorialCursorGuide.svelte';

  let currentTargetElement: HTMLElement | null = null;
  let additionalElements: HTMLElement[] = [];
  let targetBounds: ElementBounds | null = null;
  let tooltipPosition = { top: 0, left: 0 };
  let activeAnimations: Animation[] = [];
  let focusedElementAnimations: Animation[] = [];
  let resizeObserver: ResizeObserver | null = null;
  let blockPrev: boolean = false;
  let blockNextOverride: boolean | null = null;
  let domObserver: MutationObserver | null = null;
  let rafId: number | null = null;
  let scrollUnsubs: Array<() => void> = [];
  let isResizing: boolean = false;
  let resizeTimeout: number | null = null;
  let lastBoundsUpdate: number = 0;
  let isScrolling: boolean = false;
  let scrollTimeout: number | null = null;
  let rootEl: HTMLDivElement | null = null;

  function clearScrollListeners() {
    const arr = scrollUnsubs.slice();
    scrollUnsubs = [];
    for (const off of arr) { try { off(); } catch {} }
  }

  function attachScrollListeners(el: HTMLElement | null) {
    clearScrollListeners();
    const add = (node: EventTarget) => {
      const h = () => { handleScroll(); };
      try { node.addEventListener('scroll', h, { capture: true, passive: true } as AddEventListenerOptions); } catch {}
      scrollUnsubs.push(() => { try { node.removeEventListener('scroll', h, { capture: true } as EventListenerOptions); } catch {} });
    };
    add(window);
    try { const doc = document.scrollingElement || document.documentElement; if (doc) add(doc); } catch {}
    let p: HTMLElement | null = el;
    const seen = new Set<HTMLElement>();
    while (p && !seen.has(p)) {
      seen.add(p);
      add(p);
      p = p.parentElement;
    }
  }

  function startTracking() {
    if (rafId) return;
    if (isScrolling || isResizing) return;
    const tick = () => {
      if (isActive && currentTargetElement && !isScrolling && !isResizing) {
        const now = Date.now();
        if (now - lastBoundsUpdate > 60) {
          updateTargetBounds();
          lastBoundsUpdate = now;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopTracking() {
    if (rafId) { try { cancelAnimationFrame(rafId); } catch {} rafId = null; }
  }

  const { currentStep, isFirstStep, isLastStep } = tutorialStore;
  
  $: isActive = $tutorialStore.isActive;
  $: isWelcomeShown = $tutorialStore.isWelcomeShown;

  function handleSwitchTarget(event: any) {
    const newSelector = event.detail?.selector;
    console.log('[Tutorial] handleSwitchTarget:', { newSelector });
    stopAllAnimations();
    
    const newElement = document.querySelector(newSelector) as HTMLElement;
    if (newElement) {
      currentTargetElement = newElement;
      updateTargetBounds();
      
      const step = $currentStep;
      if (step?.highlight && !step?.disableAnimation) {
        startElementAnimations(newElement);
      }
      
      if (currentTargetElement) {
        currentTargetElement.style.pointerEvents = 'auto';
      }
      attachScrollListeners(currentTargetElement);
      startTracking();
    }
  }

  function handleNextStepEvent() {
    console.log('[Tutorial] handleNextStepEvent called');
    tutorialStore.next();
  }

  function handleFocusNextElement(e: CustomEvent) {
    console.log('[Tutorial] handleFocusNextElement called', e.detail);
    const { selector } = e.detail;
    if (selector) {
      const nextElement = document.querySelector(selector) as HTMLElement;
      if (nextElement) {
        console.log('[Tutorial] Adding animation to next element while keeping current highlight');
        stopFocusedElementAnimations();
        startFocusedElementAnimation(nextElement);
      }
    }
  }

  function handleBlockPrevEvent() {
    console.log('[Tutorial] handleBlockPrevEvent: Blocking prev button');
    blockPrev = true;
  }

  function handleUnblockPrevEvent() {
    console.log('[Tutorial] handleUnblockPrevEvent: Unblocking prev button');
    blockPrev = false;
  }

  function handleBlockNextEvent() {
    console.log('[Tutorial] handleBlockNextEvent: Blocking next button');
    blockNextOverride = true;
  }

  function handleUnblockNextEvent() {
    console.log('[Tutorial] handleUnblockNextEvent: Unblocking next button');
    blockNextOverride = false;
  }

  function bringToFront() {
    setTimeout(() => {
      try {
        if (rootEl) { document.body.appendChild(rootEl); }
      } catch {}
    }, 0);
  }

  onMount(async () => {
    console.log('[Tutorial] TutorialManager mounted');
    if (checkFirstLaunch()) {
      console.log('[Tutorial] First launch detected, showing welcome modal');
      tutorialStore.showWelcome();
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
    }

    if (typeof MutationObserver !== 'undefined') {
      domObserver = new MutationObserver((mutations) => {
        if (isScrolling || isResizing) return;
        let shouldUpdate = false;
        for (const mutation of mutations) {
          if (mutation.type === 'childList') { shouldUpdate = true; break; }
          if (mutation.type === 'attributes') {
            const target = mutation.target as HTMLElement;
            if (target.classList?.contains('custom-select') || 
                target.classList?.contains('select-dropdown') ||
                target.closest('[data-tutorial]')) { shouldUpdate = true; break; }
          }
        }
        if (shouldUpdate) { updateTargetBounds(); }
      });
      domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    try {
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('tutorial:switch-target', handleSwitchTarget as any);
      window.addEventListener('tutorial:next-step', handleNextStepEvent);
      window.addEventListener('tutorial:focus-next-element', handleFocusNextElement as any);
      window.addEventListener('tutorial:block-prev', handleBlockPrevEvent);
      window.addEventListener('tutorial:unblock-prev', handleUnblockPrevEvent);
      window.addEventListener('tutorial:block-next', handleBlockNextEvent);
      window.addEventListener('tutorial:unblock-next', handleUnblockNextEvent);
      window.addEventListener('tutorial:comparison-opened', bringToFront as any);
      
      const editorModal = document.querySelector('.editor-modal');
      if (editorModal) {
        editorModal.addEventListener('scroll', updateTargetBounds, { passive: true } as AddEventListenerOptions);
      }
    } catch {}
  });

  onDestroy(() => {
    stopAllAnimations();
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (domObserver) {
      domObserver.disconnect();
    }
    clearScrollListeners();
    stopTracking();
    if (resizeTimeout) clearTimeout(resizeTimeout);
    if (scrollTimeout) clearTimeout(scrollTimeout);
    window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('tutorial:switch-target', handleSwitchTarget as any);
    window.removeEventListener('tutorial:next-step', handleNextStepEvent);
    window.removeEventListener('tutorial:focus-next-element', handleFocusNextElement as any);
    window.removeEventListener('tutorial:block-prev', handleBlockPrevEvent);
    window.removeEventListener('tutorial:unblock-prev', handleUnblockPrevEvent);
    window.removeEventListener('tutorial:block-next', handleBlockNextEvent);
    window.removeEventListener('tutorial:unblock-next', handleUnblockNextEvent);
    window.removeEventListener('tutorial:comparison-opened', bringToFront as any);
  });

  $: if (isActive && $currentStep) {
    handleStepChange();
  }

  let onAfterTimeout: number | null = null;
  let tooltipMeasured = { width: 360, height: 240 };
  let tooltipOrientation: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'center';

  function handleTooltipMeasure(e: CustomEvent<{ width: number; height: number }>) {
    const w = Math.max(1, Math.floor(e.detail?.width || 0));
    const h = Math.max(1, Math.floor(e.detail?.height || 0));
    if (w && h && (w !== tooltipMeasured.width || h !== tooltipMeasured.height)) {
      tooltipMeasured = { width: w, height: h };
      updateTooltipPosition();
    }
  }

  async function handleStepChange() {
    const step = $currentStep;
    if (!step) return;

    const currentIndex = $tutorialStore.currentStepIndex;
    console.log('[Tutorial] handleStepChange:', {
      stepIndex: currentIndex,
      stepId: step.id,
      targetSelector: step.targetSelector,
      position: step.position,
      highlight: step.highlight,
      blockOthers: step.blockOthers
    });
    
    if (onAfterTimeout) {
      clearTimeout(onAfterTimeout);
      onAfterTimeout = null;
    }
    
    blockNextOverride = null;
    
    if (currentIndex === 3 && step.id === 'pixelsize') {
      console.log('[Tutorial] Step 4 (pixelsize): Blocking prev button');
      blockPrev = true;
    } else if (currentIndex === 4 && step.id === 'palette') {
      console.log('[Tutorial] Step 5 (palette): Unblocking prev button');
      blockPrev = false;
    }
    
    if (step?.onBefore) {
      console.log('[Tutorial] Executing onBefore for current step:', step.id);
      await step.onBefore();
    }

    window.dispatchEvent(new CustomEvent('tutorial:step-change', {
      detail: { stepIndex: currentIndex, stepId: step.id }
    }));

    stopAllAnimations();
    currentTargetElement = null;
    targetBounds = null;

    if (step.targetSelector) {
      await focusElement(step.targetSelector);
    } else {
      updateTooltipPosition();
    }

    if (step.onAfter) {
      console.log('[Tutorial] Scheduling onAfter for step:', step.id);
      onAfterTimeout = window.setTimeout(async () => {
        if ($tutorialStore.currentStepIndex === currentIndex) {
          console.log('[Tutorial] Executing onAfter for step:', step.id);
          await step.onAfter!();
        }
        onAfterTimeout = null;
      }, 100);
    }
  }

  async function focusElement(selector: string) {
    console.log('[Tutorial] focusElement:', { selector });
    const step = $currentStep;
    let element: HTMLElement | null = null;

    if (step?.waitForElement) {
      console.log('[Tutorial] Waiting for element:', selector);
      element = await waitForElement(selector, 5000);
    } else {
      element = findElement(selector);
    }
    
    console.log('[Tutorial] Element found:', !!element, element);

    if (!element) {
      console.warn('[Tutorial] Element not found:', selector);
      updateTooltipPosition();
      return;
    }

    currentTargetElement = element;

    updateTargetBounds();
    updateTooltipPosition();
    attachScrollListeners(currentTargetElement);
    startTracking();

    if (resizeObserver && currentTargetElement) {
      resizeObserver.observe(currentTargetElement);
    }

    if (step?.highlight && !step?.disableAnimation) {
      startElementAnimations(element);
    }

    if (currentTargetElement) {
      const isSpotlight = currentTargetElement.classList.contains('tutorial-spotlight');
      if (!isSpotlight) {
        currentTargetElement.style.pointerEvents = 'auto';
        currentTargetElement.style.cursor = 'pointer';
      }
    }
    
    if (step?.additionalHighlightSelectors) {
      additionalElements = [];
      for (const selector of step.additionalHighlightSelectors) {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'auto';
          additionalElements.push(el);
        }
      }
    }
  }

  function getVisibleBounds(rect: DOMRect): ElementBounds {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const editorModal = document.querySelector('.editor-modal');
    let containerRect = null;
    if (editorModal) {
      containerRect = editorModal.getBoundingClientRect();
    }
    
    let visibleTop = Math.max(rect.top, 0);
    let visibleBottom = Math.min(rect.bottom, viewportHeight);
    let visibleLeft = Math.max(rect.left, 0);
    let visibleRight = Math.min(rect.right, viewportWidth);
    
    if (containerRect) {
      visibleTop = Math.max(visibleTop, containerRect.top);
      visibleBottom = Math.min(visibleBottom, containerRect.bottom);
      visibleLeft = Math.max(visibleLeft, containerRect.left);
      visibleRight = Math.min(visibleRight, containerRect.right);
    }
    
    const width = Math.max(0, visibleRight - visibleLeft);
    const height = Math.max(0, visibleBottom - visibleTop);
    
    return {
      top: visibleTop,
      left: visibleLeft,
      width: width,
      height: height,
      right: visibleRight,
      bottom: visibleBottom,
      centerX: visibleLeft + width / 2,
      centerY: visibleTop + height / 2
    };
  }

  function handleScroll() {
    isScrolling = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    stopTracking();
    updateTargetBounds();
    
    scrollTimeout = window.setTimeout(() => {
      isScrolling = false;
      updateTargetBounds();
      if (isActive && currentTargetElement) {
        startTracking();
      }
      scrollTimeout = null;
    }, 30);
  }

  function handleResize() {
    isResizing = true;
    if (resizeTimeout) clearTimeout(resizeTimeout);
    
    stopTracking();
    updateTargetBounds();
    
    resizeTimeout = window.setTimeout(() => {
      isResizing = false;
      updateTargetBounds();
      if (isActive && currentTargetElement) {
        startTracking();
      }
      resizeTimeout = null;
    }, 60);
  }

  function updateTargetBounds() {
    if (!currentTargetElement) {
      targetBounds = null;
      return;
    }

    let elementToMeasure = currentTargetElement;
    
    const customSelect = currentTargetElement.querySelector('.custom-select.is-open');
    if (customSelect) {
      
      const dropdown = customSelect.querySelector('.select-dropdown');
      if (dropdown) {
        const parentRect = currentTargetElement.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        
        const combinedTop = Math.min(parentRect.top, dropdownRect.top);
        const combinedBottom = Math.max(parentRect.bottom, dropdownRect.bottom);
        const combinedLeft = Math.min(parentRect.left, dropdownRect.left);
        const combinedRight = Math.max(parentRect.right, dropdownRect.right);
        
        const fullHeight = combinedBottom - combinedTop;
        const fullWidth = combinedRight - combinedLeft;
        
        const isLargeElement = fullHeight > 800 || fullWidth > 600;
        
        const boundsToUse = isLargeElement 
          ? getVisibleBounds(new DOMRect(combinedLeft, combinedTop, fullWidth, fullHeight))
          : {
              top: combinedTop,
              left: combinedLeft,
              width: fullWidth,
              height: fullHeight,
              right: combinedRight,
              bottom: combinedBottom,
              centerX: combinedLeft + fullWidth / 2,
              centerY: combinedTop + fullHeight / 2
            };
        
        targetBounds = boundsToUse;
        updateTooltipPosition();
        return;
      }
    }

    const elementRect = elementToMeasure.getBoundingClientRect();
    const elementStyle = window.getComputedStyle(elementToMeasure);
    const isFixed = elementStyle.position === 'fixed';
    const isComparisonOutput = currentTargetElement?.classList.contains('comparison-output');
    const isLargeElement = elementRect.height > 800 || elementRect.width > 600;
    
    if (isLargeElement && !isFixed && !isComparisonOutput) {
      const visibleBounds = getVisibleBounds(elementRect);
      
      if (targetBounds) {
        const threshold = isScrolling || isResizing ? 0 : 2;
        const changed = 
          Math.abs(visibleBounds.width - targetBounds.width) > threshold ||
          Math.abs(visibleBounds.height - targetBounds.height) > threshold ||
          Math.abs(visibleBounds.top - targetBounds.top) > threshold ||
          Math.abs(visibleBounds.left - targetBounds.left) > threshold;
        
        if (changed) { targetBounds = visibleBounds; updateTooltipPosition(); }
      } else {
        targetBounds = visibleBounds;
        updateTooltipPosition();
      }
      return;
    }
    
    const newBounds = getElementBounds(elementToMeasure);
    
    if (targetBounds) {
      const threshold = isScrolling || isResizing ? 0 : 2;
      const changed = 
        Math.abs(newBounds.width - targetBounds.width) > threshold ||
        Math.abs(newBounds.height - targetBounds.height) > threshold ||
        Math.abs(newBounds.top - targetBounds.top) > threshold ||
        Math.abs(newBounds.left - targetBounds.left) > threshold;
      
      if (changed) { targetBounds = newBounds; updateTooltipPosition(); }
    } else {
      targetBounds = newBounds;
      updateTooltipPosition();
    }
  }

  function updateTooltipPosition() {
    const step = $currentStep;
    if (!step) return;

    const tooltipSize = { width: tooltipMeasured.width, height: tooltipMeasured.height };

    let newPosition;
    if (step.position === 'center' || !targetBounds) {
      newPosition = {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2
      };
      tooltipOrientation = 'center';
    } else {
      const calculated = calculateTooltipPosition(
        targetBounds,
        tooltipSize,
        step.position,
        20
      );
      newPosition = {
        top: calculated.top - window.scrollY,
        left: calculated.left - window.scrollX
      };
      tooltipOrientation = calculated.actualPosition;
    }

    const threshold = (isScrolling || isResizing) ? 0 : 0.5;
    const hasChanged = 
      Math.abs(newPosition.top - tooltipPosition.top) > threshold ||
      Math.abs(newPosition.left - tooltipPosition.left) > threshold;

    if (hasChanged) {
      tooltipPosition = newPosition;
    }
  }

  function startElementAnimations(element: HTMLElement) {
    console.log('[Tutorial] startElementAnimations for element:', element);
    stopAllAnimations();

    const currentStepId = $currentStep?.id;
    const stepsWithoutGlow = ['pixelsize', 'palette', 'dither', 'tools'];
    const skipGlow = stepsWithoutGlow.includes(currentStepId || '');

    const elementStyle = window.getComputedStyle(element);
    const hasFixedPosition = elementStyle.position === 'fixed';
    const hasTransform = elementStyle.transform && elementStyle.transform !== 'none';

    if (hasFixedPosition && hasTransform) {
      if (!skipGlow) {
        try {
          const glow = glowElement(element, undefined, { iterations: Infinity });
          if (glow) {
            activeAnimations.push(glow);
          }
        } catch (e) {
          console.error('Failed to start glow animation:', e);
        }
      }
    } else {
      if (!skipGlow) {
        try {
          const glow = glowElement(element, undefined, { iterations: Infinity });
          if (glow) {
            activeAnimations.push(glow);
          }
        } catch (e) {
          console.error('Failed to start glow animation:', e);
        }
      }
    }
  }

  function startFocusedElementAnimation(element: HTMLElement) {
    console.log('[Tutorial] startFocusedElementAnimation for element:', element);
    stopFocusedElementAnimations();

    try {
      const pulse = pulseElement(element, { iterations: Infinity, scale: 1.05 });
      if (pulse) {
        focusedElementAnimations.push(pulse);
      }
      const glow = glowElement(element, undefined, { iterations: Infinity });
      if (glow) {
        focusedElementAnimations.push(glow);
      }
      console.log('[Tutorial] Focused element animations started:', focusedElementAnimations.length);
    } catch (e) {
      console.error('Failed to start focused element animation:', e);
    }
  }

  function stopFocusedElementAnimations() {
    if (focusedElementAnimations.length > 0) {
      console.log('[Tutorial] Stopping', focusedElementAnimations.length, 'focused animations');
    }
    focusedElementAnimations.forEach(anim => {
      try {
        anim.cancel();
      } catch {}
    });
    focusedElementAnimations = [];
  }

  function stopAllAnimations() {
    if (activeAnimations.length > 0) {
      console.log('[Tutorial] Stopping', activeAnimations.length, 'animations');
    }
    activeAnimations.forEach(anim => {
      try {
        anim.cancel();
      } catch {}
    });
    activeAnimations = [];
    stopFocusedElementAnimations();

    if (currentTargetElement) {
      currentTargetElement.style.pointerEvents = '';
    }
  }

  function handleWelcomeStart() {
    console.log('[Tutorial] Welcome modal: Start tutorial');
    tutorialStore.hideWelcome();
    tutorialStore.start();
  }

  function handleWelcomeSkip() {
    tutorialStore.skip();
  }

  function handleNext() {
    const isLast = $isLastStep;
    console.log('[Tutorial] handleNext:', { isLast, currentStep: $currentStep?.id });
    if (isLast) {
      tutorialStore.complete();
    } else {
      tutorialStore.next();
    }
  }

  function handlePrev() {
    console.log('[Tutorial] handlePrev, blockPrev:', blockPrev);
    tutorialStore.prev();
  }

  function handleSkipAll() {
    console.log('[Tutorial] handleSkipAll');
    tutorialStore.skip();
    stopAllAnimations();
  }
</script>

{#if isWelcomeShown}
  <WelcomeModal 
    on:start={handleWelcomeStart}
    on:skip={handleWelcomeSkip}
  />
{/if}

{#if isActive && $currentStep}
  <div use:appendToBody bind:this={rootEl}>
    <TutorialOverlay 
      {targetBounds}
      additionalSelectors={$currentStep.additionalHighlightSelectors || []}
      visible={true}
      isAnimating={isResizing || isScrolling}
    />

    {#if $currentStep && !isWelcomeShown}
      {#if $currentStep.highlight && targetBounds}
        <TutorialSpotlight {targetBounds} visible={isActive} isAnimating={isResizing || isScrolling} />
      {/if}

      <div style={$currentStep?.id === 'comparison-interaction' ? 'pointer-events: none;' : ''}>
        <TutorialTooltip
          position={tooltipOrientation}
          description={$currentStep.description}
          stepNumber={$tutorialStore.currentStepIndex + 1}
          totalSteps={$tutorialStore.totalSteps}
          isFirstStep={$isFirstStep}
          blockPrev={blockPrev}
          blockNext={blockNextOverride !== null ? blockNextOverride : ($currentStep.blockNext || false)}
          top={tooltipPosition.top}
          left={tooltipPosition.left}
          on:measure={handleTooltipMeasure}
          on:next={handleNext}
          on:prev={handlePrev}
          on:skipAll={handleSkipAll}
        />
      </div>

      <TutorialCursorGuide 
        targetBounds={targetBounds}
        isActive={isActive && ($currentStep.showCursorGuide || false)}
      />
    {/if}
  </div>
{/if}
