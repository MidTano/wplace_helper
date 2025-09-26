
import { paintAtTool, type ToolName } from '../tools';

export interface DrawPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface SmoothDrawingState {
  
  bufferCanvas: HTMLCanvasElement | null;
  bufferCtx: CanvasRenderingContext2D | null;
  
  
  currentStroke: DrawPoint[];
  previousPoint: DrawPoint | null;
  
  
  tool: ToolName | null;
  brushSize: number;
  brushColor: string;
  
  
  ghostPoints: DrawPoint[];
  
  eraserGhostCanvas: HTMLCanvasElement | null;
  eraserGhostCtx: CanvasRenderingContext2D | null;
  
  eraserMaskCanvas: HTMLCanvasElement | null;
  eraserMaskCtx: CanvasRenderingContext2D | null;
  
  eraserQueue: DrawPoint[];
  eraserRafPending: boolean;
  
  
  isDrawing: boolean;
  hasBufferedChanges: boolean;
  
  
  lastUpdateTime: number;
  updateThrottleMs: number;
  
  
  interpolationSteps: number;
  
  
  undoSnapshot: ImageData | null;
  affectedArea: { x: number; y: number; w: number; h: number } | null;
}

export function createSmoothDrawingState(): SmoothDrawingState {
  return {
    bufferCanvas: null,
    bufferCtx: null,
    currentStroke: [],
    previousPoint: null,
    tool: null,
    brushSize: 0,
    brushColor: '#000000',
    ghostPoints: [],
    eraserGhostCanvas: null,
    eraserGhostCtx: null,
    eraserMaskCanvas: null,
    eraserMaskCtx: null,
    eraserQueue: [],
    eraserRafPending: false,
    isDrawing: false,
    hasBufferedChanges: false,
    lastUpdateTime: 0,
    updateThrottleMs: 0, 
    interpolationSteps: 4,
    undoSnapshot: null,
    affectedArea: null
  };
}

export function initializeBufferCanvas(
  state: SmoothDrawingState,
  width: number,
  height: number
): void {
  if (!state.bufferCanvas) {
    state.bufferCanvas = document.createElement('canvas');
  }
  
  if (state.bufferCanvas.width !== width || state.bufferCanvas.height !== height) {
    state.bufferCanvas.width = width;
    state.bufferCanvas.height = height;
    state.bufferCtx = state.bufferCanvas.getContext('2d', { willReadFrequently: true });
    
    if (state.bufferCtx) {
      state.bufferCtx.imageSmoothingEnabled = false;
    }
  }
}

function initializeEraserGhostCanvas(
  state: SmoothDrawingState,
  width: number,
  height: number
): void {
  if (!state.eraserGhostCanvas) {
    state.eraserGhostCanvas = document.createElement('canvas');
  }
  if (state.eraserGhostCanvas.width !== width || state.eraserGhostCanvas.height !== height) {
    state.eraserGhostCanvas.width = width;
    state.eraserGhostCanvas.height = height;
  }
  state.eraserGhostCtx = state.eraserGhostCanvas.getContext('2d', { willReadFrequently: true });
  if (state.eraserGhostCtx) {
    state.eraserGhostCtx.imageSmoothingEnabled = false;
    
    state.eraserGhostCtx.clearRect(0, 0, width, height);
  }
  
  if (!state.eraserMaskCanvas) {
    state.eraserMaskCanvas = document.createElement('canvas');
  }
  if (state.eraserMaskCanvas.width !== width || state.eraserMaskCanvas.height !== height) {
    state.eraserMaskCanvas.width = width;
    state.eraserMaskCanvas.height = height;
  }
  state.eraserMaskCtx = state.eraserMaskCanvas.getContext('2d', { willReadFrequently: true });
  if (state.eraserMaskCtx) {
    state.eraserMaskCtx.imageSmoothingEnabled = false;
    state.eraserMaskCtx.clearRect(0, 0, width, height);
  }
}

export function clearBuffer(state: SmoothDrawingState): void {
  if (state.bufferCtx && state.bufferCanvas) {
    state.bufferCtx.clearRect(0, 0, state.bufferCanvas.width, state.bufferCanvas.height);
  }
  state.hasBufferedChanges = false;
}

export function copyMainToBuffer(
  state: SmoothDrawingState,
  mainCanvas: HTMLCanvasElement
): void {
  if (!state.bufferCtx || !state.bufferCanvas) return;
  
  state.bufferCtx.clearRect(0, 0, state.bufferCanvas.width, state.bufferCanvas.height);
  state.bufferCtx.drawImage(mainCanvas, 0, 0);
}

export function copyBufferToMain(
  state: SmoothDrawingState,
  mainCanvas: HTMLCanvasElement
): void {
  if (!state.bufferCanvas || !state.hasBufferedChanges) return;
  
  const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
  if (!mainCtx) return;
  
  
  mainCtx.save();
  mainCtx.globalCompositeOperation = 'source-over';
  mainCtx.imageSmoothingEnabled = false;
  mainCtx.drawImage(state.bufferCanvas, 0, 0);
  mainCtx.restore();
  
  state.hasBufferedChanges = false;
}

export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): DrawPoint[] {
  const points: DrawPoint[] = [];
  
  
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  let x = x0;
  let y = y0;
  
  while (true) {
    points.push({ x, y });
    
    if (x === x1 && y === y1) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  
  return points;
}

export function interpolatePoints(
  p1: DrawPoint,
  p2: DrawPoint,
  steps: number
): DrawPoint[] {
  const points: DrawPoint[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1.x + (p2.x - p1.x) * t;
    const y = p1.y + (p2.y - p1.y) * t;
    const pressure = p1.pressure && p2.pressure 
      ? p1.pressure + (p2.pressure - p1.pressure) * t
      : undefined;
    
    points.push({ x, y, pressure });
  }
  
  return points;
}

export function startStroke(
  state: SmoothDrawingState,
  point: DrawPoint,
  mainCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  tool?: ToolName,
  size?: number,
  color?: string
): void {
  
  initializeBufferCanvas(state, width, height);
  
  if ((tool || 'brush') === 'eraser') {
    initializeEraserGhostCanvas(state, width, height);
  }
  
  
  const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
  if (mainCtx) {
    try {
      state.undoSnapshot = mainCtx.getImageData(0, 0, width, height);
      state.affectedArea = { x: 0, y: 0, w: width, h: height };
    } catch (e) {
      console.warn('Не удалось создать undo snapshot:', e);
      state.undoSnapshot = null;
      state.affectedArea = null;
    }
  }
  
  
  
  if (state.bufferCtx && state.bufferCanvas) {
    state.bufferCtx.clearRect(0, 0, state.bufferCanvas.width, state.bufferCanvas.height);
  }
  
  
  state.isDrawing = true;
  state.currentStroke = [point];
  state.previousPoint = point;
  state.hasBufferedChanges = false;
  state.tool = tool || 'brush';
  state.brushSize = Math.max(1, Math.round(size || 3));
  state.brushColor = color || '#000000';
  state.ghostPoints = [];
  
  
  if ((state.tool || 'brush') === 'brush') {
    drawPointInBuffer(state, point, state.tool || 'brush', state.brushSize, state.brushColor);
    
    state.hasBufferedChanges = true;
  } else if (state.tool === 'eraser') {
    
    const ctx = state.eraserGhostCtx;
    const mctx = state.eraserMaskCtx;
    if (ctx && state.eraserGhostCanvas) {
      const r = state.brushSize;
      const half = Math.floor(r / 2);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(Math.round(point.x - half), Math.round(point.y - half), r, r);
    }
    if (mctx && state.eraserMaskCanvas) {
      const r = state.brushSize;
      const half = Math.floor(r / 2);
      mctx.fillStyle = 'rgba(0,0,0,1)'; 
      mctx.fillRect(Math.round(point.x - half), Math.round(point.y - half), r, r);
    }
  }
}

export function addPointToStroke(
  state: SmoothDrawingState,
  point: DrawPoint,
  tool: ToolName,
  size: number,
  color: string
): void {
  if (!state.isDrawing || !state.previousPoint || !state.bufferCtx) return;
  
  
  if (state.updateThrottleMs > 0) {
    const now = performance.now ? performance.now() : Date.now();
    if (now - state.lastUpdateTime < state.updateThrottleMs) {
      return;
    }
    state.lastUpdateTime = now;
  }
  
  
  state.currentStroke.push(point);
  
  
  const linePoints = bresenhamLine(
    state.previousPoint.x,
    state.previousPoint.y,
    point.x,
    point.y
  );
  
  if ((state.tool || tool) === 'eraser') {
    
    const ctx = state.eraserGhostCtx;
    const mctx = state.eraserMaskCtx;
    if (ctx && state.eraserGhostCanvas) {
      const r = state.brushSize;
      const half = Math.floor(r / 2);
      for (let i = 1; i < linePoints.length; i += 1) {
        const lp = linePoints[i];
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(Math.round(lp.x - half), Math.round(lp.y - half), r, r);
        if (mctx && state.eraserMaskCanvas) {
          mctx.fillStyle = 'rgba(0,0,0,1)';
          mctx.fillRect(Math.round(lp.x - half), Math.round(lp.y - half), r, r);
        }
      }
    }
  } else {
    
    for (let i = 1; i < linePoints.length; i++) {
      drawPointInBuffer(state, linePoints[i], tool, size, color);
    }
  }
  
  state.previousPoint = point;
  state.hasBufferedChanges = true;
}

export function finishStroke(
  state: SmoothDrawingState,
  mainCanvas: HTMLCanvasElement
): void {
  if (!state.isDrawing) return;
  
  const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
  if (!mainCtx) return;
  
  if (state.tool === 'eraser') {
    
    if (state.eraserMaskCanvas) {
      mainCtx.save();
      const prev = mainCtx.globalCompositeOperation;
      mainCtx.globalCompositeOperation = 'destination-out';
      mainCtx.drawImage(state.eraserMaskCanvas, 0, 0);
      mainCtx.globalCompositeOperation = prev;
      mainCtx.restore();
    }
  } else {
    
    copyBufferToMain(state, mainCanvas);
  }
  
  
  state.isDrawing = false;
  state.currentStroke = [];
  state.previousPoint = null;
  state.hasBufferedChanges = false;
  state.ghostPoints = [];
  if (state.eraserGhostCtx && state.eraserGhostCanvas) {
    state.eraserGhostCtx.clearRect(0, 0, state.eraserGhostCanvas.width, state.eraserGhostCanvas.height);
  }
  if (state.eraserMaskCtx && state.eraserMaskCanvas) {
    state.eraserMaskCtx.clearRect(0, 0, state.eraserMaskCanvas.width, state.eraserMaskCanvas.height);
  }
}

export function cancelStroke(
  state: SmoothDrawingState
): void {
  state.isDrawing = false;
  state.currentStroke = [];
  state.previousPoint = null;
  clearBuffer(state);
  state.ghostPoints = [];
  if (state.eraserGhostCtx && state.eraserGhostCanvas) {
    state.eraserGhostCtx.clearRect(0, 0, state.eraserGhostCanvas.width, state.eraserGhostCanvas.height);
  }
  if (state.eraserMaskCtx && state.eraserMaskCanvas) {
    state.eraserMaskCtx.clearRect(0, 0, state.eraserMaskCanvas.width, state.eraserMaskCanvas.height);
  }
}

function drawPointInBuffer(
  state: SmoothDrawingState,
  point: DrawPoint,
  tool: ToolName,
  size: number,
  color: string
): void {
  if (!state.bufferCtx || !state.bufferCanvas) return;
  
  const px = Math.round(point.x);
  const py = Math.round(point.y);
  
  
  paintAtTool(
    state.bufferCtx,
    tool,
    px,
    py,
    state.bufferCanvas.width,
    state.bufferCanvas.height,
    size,
    undefined,
    color
  );
}

export function getBufferCanvas(state: SmoothDrawingState): HTMLCanvasElement | null {
  return state.bufferCanvas;
}

export function hasActiveStroke(state: SmoothDrawingState): boolean {
  return state.isDrawing;
}

export function hasBufferedChanges(state: SmoothDrawingState): boolean {
  return state.hasBufferedChanges;
}

export function getGhostData(state: SmoothDrawingState): {
  points: DrawPoint[];
  size: number;
} {
  return {
    points: state.ghostPoints,
    size: state.brushSize
  };
}

export function getEraserGhostCanvas(state: SmoothDrawingState): HTMLCanvasElement | null {
  return state.eraserGhostCanvas;
}

export function clearGhostData(state: SmoothDrawingState): void {
  state.ghostPoints = [];
}

export function setThrottleParams(
  state: SmoothDrawingState,
  throttleMs: number,
  interpolationSteps: number
): void {
  state.updateThrottleMs = Math.max(0, Math.min(50, throttleMs)); 
  state.interpolationSteps = Math.max(1, Math.min(10, interpolationSteps));
}

export function getUndoData(state: SmoothDrawingState): {
  before: ImageData | null;
  area: { x: number; y: number; w: number; h: number } | null;
} {
  return {
    before: state.undoSnapshot,
    area: state.affectedArea
  };
}

export function clearUndoData(state: SmoothDrawingState): void {
  state.undoSnapshot = null;
  state.affectedArea = null;
}
