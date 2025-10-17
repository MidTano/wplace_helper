export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface ElementBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ViewportBounds {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export interface TooltipSize {
  width: number;
  height: number;
}

export interface CalculatedPosition {
  top: number;
  left: number;
  actualPosition: TooltipPosition;
}

function isFixedPosition(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.position === 'fixed') {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function getElementBounds(element: HTMLElement): ElementBounds {
  const rect = element.getBoundingClientRect();
  const isFixed = isFixedPosition(element);
  
  const scrollY = isFixed ? 0 : window.scrollY;
  const scrollX = isFixed ? 0 : window.scrollX;
  
  return {
    top: rect.top + scrollY,
    left: rect.left + scrollX,
    right: rect.right + scrollX,
    bottom: rect.bottom + scrollY,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2 + scrollX,
    centerY: rect.top + rect.height / 2 + scrollY
  };
}

export function getViewportBounds(): ViewportBounds {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
}

export function calculateTooltipPosition(
  targetBounds: ElementBounds,
  tooltipSize: TooltipSize,
  preferredPosition: TooltipPosition,
  offset: number = 16
): CalculatedPosition {
  const viewport = getViewportBounds();
  const positions = getPositionVariants(targetBounds, tooltipSize, offset);
  
  let position = positions[preferredPosition];
  let actualPosition = preferredPosition;

  if (!isPositionInViewport(position, tooltipSize, viewport)) {
    const validPositions = (['top', 'bottom', 'left', 'right'] as TooltipPosition[])
      .filter(pos => isPositionInViewport(positions[pos], tooltipSize, viewport));
    
    if (validPositions.length > 0) {
      actualPosition = validPositions[0];
      position = positions[actualPosition];
    } else {
      actualPosition = 'center';
      position = {
        top: viewport.scrollY + (viewport.height - tooltipSize.height) / 2,
        left: viewport.scrollX + (viewport.width - tooltipSize.width) / 2
      };
    }
  }

  const padding = 16;
  const clampedPosition = {
    top: Math.max(viewport.scrollY + padding, Math.min(position.top, viewport.scrollY + viewport.height - tooltipSize.height - padding)),
    left: Math.max(viewport.scrollX + padding, Math.min(position.left, viewport.scrollX + viewport.width - tooltipSize.width - padding)),
    actualPosition
  };

  return clampedPosition;
}

function getPositionVariants(
  targetBounds: ElementBounds,
  tooltipSize: TooltipSize,
  offset: number
): Record<TooltipPosition, { top: number; left: number }> {
  return {
    top: {
      top: targetBounds.top - tooltipSize.height - offset,
      left: targetBounds.centerX - tooltipSize.width / 2
    },
    bottom: {
      top: targetBounds.bottom + offset,
      left: targetBounds.centerX - tooltipSize.width / 2
    },
    left: {
      top: targetBounds.centerY - tooltipSize.height / 2,
      left: targetBounds.left - tooltipSize.width - offset
    },
    right: {
      top: targetBounds.centerY - tooltipSize.height / 2,
      left: targetBounds.right + offset
    },
    center: {
      top: targetBounds.centerY - tooltipSize.height / 2,
      left: targetBounds.centerX - tooltipSize.width / 2
    }
  };
}

function isPositionInViewport(
  position: { top: number; left: number },
  tooltipSize: TooltipSize,
  viewport: ViewportBounds
): boolean {
  const padding = 16;
  
  const adjustedTop = Math.max(viewport.scrollY + padding, position.top);
  const adjustedLeft = Math.max(viewport.scrollX + padding, position.left);
  
  return (
    adjustedTop + tooltipSize.height <= viewport.scrollY + viewport.height - padding &&
    adjustedLeft + tooltipSize.width <= viewport.scrollX + viewport.width - padding
  );
}

export function scrollToElement(
  element: HTMLElement,
  smooth: boolean = true,
  offset: number = 100
): void {
  const rect = element.getBoundingClientRect();
  const absoluteTop = rect.top + window.scrollY;
  const scrollTarget = absoluteTop - offset;

  window.scrollTo({
    top: scrollTarget,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

export function ensureElementVisible(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const isVisible = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );

  if (!isVisible) {
    scrollToElement(element);
  }
}
