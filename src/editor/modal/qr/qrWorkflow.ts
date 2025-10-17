import { listenWGuardEvent, WGuardEvents } from '../../../wguard/core/events';
import { markElement } from '../../../wguard';

export function showQrBanner(t: (key: string) => string): HTMLElement | null {
  try {
    const el = document.createElement('div');
    markElement(el);
    el.className = 'qr-banner';
    el.textContent = t('qr.prompt');
    Object.assign(el.style, {
      position: 'fixed', 
      top: '54px', 
      left: '50%', 
      transform: 'translateX(-50%)',
      background: 'rgba(17,17,17,0.95)', 
      color: '#fff', 
      padding: '8px 14px', 
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.2)', 
      zIndex: '2147483645', 
      boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
    });
    document.body.appendChild(el);
    return el;
  } catch {
    return null;
  }
}

export function hideQrBanner(el: HTMLElement | null): void {
  try {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  } catch {}
}

export async function waitForCoordinates(): Promise<[number, number, number, number]> {
  const TIMEOUT_MS = 60000;
  
  return new Promise((resolve, reject) => {
    let done = false;
    let unsubscribe: (() => void) | null = null;
    
    const tm = setTimeout(() => {
      if (!done) {
        if (unsubscribe) unsubscribe();
        reject(new Error('qr_timeout'));
        done = true;
      }
    }, TIMEOUT_MS);
    
    const onCoords = (detail: any) => {
      try { 
        const coords = detail?.coords; 
        if (coords && Array.isArray(coords) && coords.length === 4) { 
          clearTimeout(tm);
          if (unsubscribe) unsubscribe();
          done = true;
          resolve(coords as [number, number, number, number]); 
        } 
      } catch {} 
    };
    
    try {
      unsubscribe = listenWGuardEvent(WGuardEvents.ORIGIN, onCoords);
    } catch {}
  });
}

export function generateFileName(
  file: File | null,
  pixelSize: number,
  ditherMethod: string,
  ditherLevels: number,
  paletteMode: string,
  outlineThickness: number,
  erodeAmount: number
): string {
  const getBaseName = () => {
    try { 
      const name = (file && file.name) ? file.name : 'image.png'; 
      const dotIndex = name.lastIndexOf('.'); 
      return dotIndex > 0 ? name.slice(0, dotIndex) : name; 
    } catch { 
      return 'image'; 
    }
  };

  const ditherCode = (dm: string) => { 
    switch (dm) { 
      case 'none': return 'n'; 
      case 'ordered4': return 'o4'; 
      case 'floyd': return 'fs'; 
      case 'atkinson': return 'at'; 
      case 'bayer2': return 'b2'; 
      case 'bayer4': return 'b4'; 
      case 'lines': return 'ln'; 
      case 'random': return 'rnd'; 
      case 'custom': return 'ct'; 
      default: return String(dm || 'n'); 
    } 
  };

  const paletteCode = (pm: string) => pm === 'full' ? 'F' : (pm === 'free' ? 'f' : 'C');

  const base = getBaseName();
  const suffix = `${pixelSize}${ditherCode(ditherMethod)}${ditherLevels}${paletteCode(paletteMode)}${outlineThickness}${erodeAmount}`;
  
  return `${base}_${suffix}.png`;
}
