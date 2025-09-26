
export interface StickerState {
  mode: boolean;
  canvas: HTMLCanvasElement | null;
  w: number;
  h: number;
  x: number;
  y: number;
  dragging: boolean;
  offX: number;
  offY: number;
}

export function createStickerState(): StickerState {
  return {
    mode: false,
    canvas: null,
    w: 0,
    h: 0,
    x: 0,
    y: 0,
    dragging: false,
    offX: 0,
    offY: 0
  };
}

export function placeStickerAtCenter(
  state: StickerState,
  canvas: HTMLCanvasElement,
  outW: number,
  outH: number
): StickerState {
  const newState = { ...state };
  newState.canvas = canvas;
  newState.w = canvas.width;
  newState.h = canvas.height;
  newState.x = Math.max(0, Math.floor((outW - newState.w) / 2));
  newState.y = Math.max(0, Math.floor((outH - newState.h) / 2));
  newState.mode = true;
  return newState;
}

export function startStickerDrag(
  state: StickerState,
  px: number,
  py: number
): StickerState {
  if (!isPointInSticker(state, px, py)) {
    return state;
  }

  return {
    ...state,
    dragging: true,
    offX: px - state.x,
    offY: py - state.y
  };
}

export function updateStickerPosition(
  state: StickerState,
  px: number,
  py: number,
  outW: number,
  outH: number
): StickerState {
  if (!state.dragging) {
    return state;
  }

  return {
    ...state,
    x: Math.max(0, Math.min(outW - state.w, px - state.offX)),
    y: Math.max(0, Math.min(outH - state.h, py - state.offY))
  };
}

export function stopStickerDrag(state: StickerState): StickerState {
  return {
    ...state,
    dragging: false
  };
}

export function isPointInSticker(state: StickerState, px: number, py: number): boolean {
  return px >= state.x && 
         py >= state.y && 
         px < state.x + state.w && 
         py < state.y + state.h;
}

export function cancelSticker(state: StickerState): StickerState {
  return createStickerState();
}

export function confirmSticker(
  state: StickerState,
  editCanvas: HTMLCanvasElement | null,
  outW: number,
  outH: number
): { x: number, y: number, w: number, h: number, before: ImageData | null, after: ImageData | null } | null {
  if (!state.mode || !state.canvas || !editCanvas) {
    return null;
  }

  try {
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const x = Math.max(0, Math.min(outW - state.w, Math.round(state.x)));
    const y = Math.max(0, Math.min(outH - state.h, Math.round(state.y)));
    
    let before: ImageData | null = null;
    let after: ImageData | null = null;
    
    try { 
      before = ctx.getImageData(x, y, state.w, state.h); 
    } catch {}
    
    try { 
      ctx.imageSmoothingEnabled = false; 
      ctx.drawImage(state.canvas, x, y); 
    } catch {}
    
    try { 
      after = ctx.getImageData(x, y, state.w, state.h); 
    } catch {}

    return { x, y, w: state.w, h: state.h, before, after };
  } catch {
    return null;
  }
}
