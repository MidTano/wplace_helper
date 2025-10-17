export const EASING = {
  IOS_STANDARD: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  IOS_DECELERATE: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  IOS_ACCELERATE: 'cubic-bezier(0.4, 0.0, 1, 1)',
  IOS_SHARP: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  BOUNCE: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  ELASTIC: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
} as const;

export const DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 400,
  PULSE: 1200,
  GLOW: 2000
} as const;

export interface AnimationOptions {
  duration?: number;
  easing?: string;
  delay?: number;
  iterations?: number;
  scale?: number;
}

export function pulseElement(element: HTMLElement, options?: AnimationOptions): Animation | null {
  const isGridItem = element.classList.contains('grid-item');
  if (isGridItem) {
    return null;
  }
  
  const scale = options?.scale || 1.02;
  const keyframes: Keyframe[] = [
    { transform: 'scale(1)', opacity: '1' },
    { transform: `scale(${scale})`, opacity: '0.95' },
    { transform: 'scale(1)', opacity: '1' }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || DURATION.PULSE,
    easing: options?.easing || EASING.IOS_STANDARD,
    iterations: options?.iterations || Infinity,
    delay: options?.delay || 0
  });
}

function getThemeHost(): HTMLElement {
  try {
    const host: any = (window as any).__wphPortalHost
    if (host && host.host instanceof HTMLElement) return host.host as HTMLElement
    if (host && host instanceof HTMLElement) return host as HTMLElement
    return document.documentElement
  } catch {
    return document.documentElement
  }
}

function getPrimaryHex(): string {
  try {
    const el = getThemeHost()
    const v = getComputedStyle(el).getPropertyValue('--wph-primary')
    const s = String(v || '').trim()
    return s || '#f05123'
  } catch { return '#f05123' }
}

function hexToRgba(hex: string, a: number): string {
  let v = String(hex || '').trim().toLowerCase()
  if (!v.startsWith('#')) v = '#' + v
  if (v.length === 4) { v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` }
  const m = /^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(v)
  if (!m) return `rgba(240,81,35,${Math.max(0, Math.min(1, a))})`
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const al = Math.max(0, Math.min(1, a))
  return `rgba(${r}, ${g}, ${b}, ${al})`
}

export function glowElement(element: HTMLElement, color?: string, options?: AnimationOptions): Animation | null {
  const isGridItem = element.classList.contains('grid-item');
  if (isGridItem) {
    return null;
  }
  
  const baseColor = color || getPrimaryHex();
  const keyframes: Keyframe[] = [
    { boxShadow: `0 0 8px 2px ${baseColor}40, 0 0 16px 4px ${baseColor}20`, offset: 0 },
    { boxShadow: `0 0 16px 4px ${baseColor}70, 0 0 32px 8px ${baseColor}35`, offset: 0.5 },
    { boxShadow: `0 0 8px 2px ${baseColor}40, 0 0 16px 4px ${baseColor}20`, offset: 1 }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || 2400,
    easing: 'ease-in-out',
    iterations: options?.iterations || Infinity,
    delay: options?.delay || 0
  });
}

export function shakeElement(element: HTMLElement, options?: AnimationOptions): Animation {
  const keyframes: Keyframe[] = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || DURATION.SLOW,
    easing: options?.easing || EASING.IOS_SHARP,
    iterations: options?.iterations || 1,
    delay: options?.delay || 0
  });
}

export function fadeIn(element: HTMLElement, options?: AnimationOptions): Animation {
  const keyframes: Keyframe[] = [
    { opacity: '0' },
    { opacity: '1' }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || DURATION.NORMAL,
    easing: options?.easing || EASING.IOS_DECELERATE,
    fill: 'forwards',
    delay: options?.delay || 0
  });
}

export function fadeOut(element: HTMLElement, options?: AnimationOptions): Animation {
  const keyframes: Keyframe[] = [
    { opacity: '1' },
    { opacity: '0' }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || DURATION.NORMAL,
    easing: options?.easing || EASING.IOS_ACCELERATE,
    fill: 'forwards',
    delay: options?.delay || 0
  });
}

export function slideIn(element: HTMLElement, direction: 'top' | 'bottom' | 'left' | 'right' = 'top', options?: AnimationOptions): Animation {
  const transforms: Record<string, string> = {
    top: 'translateY(-20px)',
    bottom: 'translateY(20px)',
    left: 'translateX(-20px)',
    right: 'translateX(20px)'
  };

  const keyframes: Keyframe[] = [
    { transform: transforms[direction], opacity: '0' },
    { transform: 'translate(0, 0)', opacity: '1' }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || DURATION.NORMAL,
    easing: options?.easing || EASING.BOUNCE,
    fill: 'forwards',
    delay: options?.delay || 0
  });
}

export function scaleIn(element: HTMLElement, options?: AnimationOptions): Animation {
  const keyframes: Keyframe[] = [
    { transform: 'scale(0.8)', opacity: '0' },
    { transform: 'scale(1)', opacity: '1' }
  ];

  return element.animate(keyframes, {
    duration: options?.duration || DURATION.NORMAL,
    easing: options?.easing || EASING.BOUNCE,
    fill: 'forwards',
    delay: options?.delay || 0
  });
}

import { markElement } from '../../wguard';

export function ripple(element: HTMLElement, x: number, y: number): void {
  const rippleEl = document.createElement('span');
  markElement(rippleEl);
  rippleEl.style.position = 'absolute';
  rippleEl.style.width = '10px';
  rippleEl.style.height = '10px';
  rippleEl.style.borderRadius = '50%';
  rippleEl.style.backgroundColor = hexToRgba(getPrimaryHex(), 0.5);
  rippleEl.style.left = `${x}px`;
  rippleEl.style.top = `${y}px`;
  rippleEl.style.transform = 'translate(-50%, -50%) scale(0)';
  rippleEl.style.pointerEvents = 'none';
  
  element.appendChild(rippleEl);

  const animation = rippleEl.animate([
    { transform: 'translate(-50%, -50%) scale(0)', opacity: '1' },
    { transform: 'translate(-50%, -50%) scale(10)', opacity: '0' }
  ], {
    duration: 600,
    easing: EASING.IOS_DECELERATE
  });

  animation.onfinish = () => rippleEl.remove();
}
