import { sendChannel, normalizeChannelData } from './channel';

let EVENT_ACTION = 'wguard:event';
export function setEventAction(name: string) { try { if (name) EVENT_ACTION = name; } catch {} }
export function getEventAction(): string { return EVENT_ACTION; }

export function dispatchWGuardEvent(type: string, detail?: any): void {
  try {
    sendChannel({ 
      action: EVENT_ACTION,
      eventType: type,
      detail: detail || {}
    });
  } catch {}
}

export function listenWGuardEvent(type: string, handler: (detail: any) => void): () => void {
  const listener = (event: MessageEvent) => {
    try {
      const norm = normalizeChannelData(event?.data as any);
      if (!norm) return;
      if ((norm as any).action !== EVENT_ACTION) return;
      if ((norm as any).eventType !== type) return;
      
      handler((norm as any).detail || {});
    } catch {}
  };
  
  window.addEventListener('message', listener);
  
  return () => {
    window.removeEventListener('message', listener);
  };
}

export const WGuardEvents = {
  REDRAW_TILES: 'redraw-tiles',
  MOVE_MODE: 'move-mode',
  ENHANCED: 'enhanced',
  ORIGIN: 'origin',
};
