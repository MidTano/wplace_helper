
import type { 
  DisplayMetrics 
} from '../utils/metrics';
import { pickPixelRGB, nearestPaletteColor } from '../tools/eyedropper';


export interface ScreenToPixelResult {
  px: number;
  py: number;
}


export interface StickerState {
  [key: string]: any;
}

export interface MouseEventHandlersParams {
  
  editMode: boolean;
  stickerMode: boolean;
  activeTool: string;
  prevTool: string;
  
  
  isDrawing: boolean;
  isPanning: boolean;
  isSelecting: boolean;
  isSizing: boolean;
  stickerDragging: boolean;
  gradientDragging: boolean;
  isPatternDragging: boolean;
  
  
  hoverPx: number;
  hoverPy: number;
  panX: number;
  panY: number;
  panStartPointerX: number;
  panStartPointerY: number;
  panStartX: number;
  panStartY: number;
  
  
  brushSize: number;
  eraserSize: number;
  selectSize: number;
  magicTolerance: number;
  
  
  gradStartPx: number;
  gradStartPy: number;
  gradEndPx: number;
  gradEndPy: number;
  
  
  outW: number;
  outH: number;
  
  allowedColors: number[][];
  
  
  sizeFrozenPx: number;
  sizeFrozenPy: number;
  sizeStartY: number;
  sizeStartValue: number;
  
  
  customDitherPattern: number[][];
  patternDragValue: number;
  
  
  stickerState: StickerState;
  stickerCanvas: HTMLCanvasElement | null;
  
  
  outputBox: HTMLElement;
  overlayCanvas: HTMLCanvasElement | null;
  editCanvas: HTMLCanvasElement | null;
  
  
  screenToPixelLocal: (clientX: number, clientY: number) => ScreenToPixelResult;
  getDisplayMetricsLocal: () => DisplayMetrics | null;
  drawOverlay: (px: number, py: number) => void;
  layoutStage: () => void;
  paintAt: (px: number, py: number) => void;
  updateStickerPosition: (state: StickerState, px: number, py: number, w: number, h: number) => StickerState;
  startStickerDrag: (state: StickerState, px: number, py: number) => StickerState;
  stopStickerDrag: (state: StickerState) => StickerState;
  applySelectionAt: (px: number, py: number, op: string) => void;
  applyMagicSelection: (px: number, py: number, op: string) => void;
  applyGradient: (x1: number, y1: number, x2: number, y2: number) => void;
  finalizeStroke: () => void;
  clampSize: (size: number) => number;
  clampTolerance: (tolerance: number) => number;
  setState: (updates: Record<string, any>) => void;
  
  
  startSmoothStroke: (px: number, py: number) => void;
  addSmoothPoint: (px: number, py: number) => void;
  completeSmoothStroke: () => void;
  cancelSmoothStroke: () => void;
  hasActiveStroke: () => boolean;
  hasBufferedChanges: () => boolean;
  getUndoData: () => any;
  clearUndoData: () => void;
  
  
  selectionStrokeTiles: Map<string, any>;
  selectionAntsCanvas: HTMLCanvasElement | null;
  selectionReplaceCleared: boolean;
  selectionCount: number;
  
  
  undoStack: Array<{ tiles?: any[]; selTiles?: any[] }>;
  redoStack: Array<{ tiles?: any[]; selTiles?: any[] }>;
  
  
  copySelectionRect: (x: number, y: number, w: number, h: number) => any;
  rebuildSelectionAnts: () => void;
  
  
  sizingContext?: {
    active: boolean;
    frozenPx: number;
    frozenPy: number;
    startY: number;
    startValue: number;
  };
}

export interface WheelHandlerParams {
  
  editMode: boolean;
  stickerMode: boolean;
  activeTool: string;
  isDrawing: boolean;
  
  
  brushSize: number;
  eraserSize: number;
  selectSize: number;
  magicTolerance: number;
  magicHintUntil: number;
  
  
  zoom: number;
  panX: number;
  panY: number;
  hoverPx: number;
  hoverPy: number;
  
  
  outputBox: HTMLElement;
  
  
  clampSize: (size: number) => number;
  clampTolerance: (tolerance: number) => number;
  getDisplayMetricsLocal: () => any;
  layoutStage: () => void;
  drawOverlay: (px: number, py: number) => void;
  setState: (updates: Record<string, any>) => void;
}

export function createStageMouseMoveHandler(params: MouseEventHandlersParams) {
  return function onStageMouseMove(e: MouseEvent) {
    if (!params.editMode) return;
    
    
    if (params.stickerMode && params.stickerDragging) {
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      if (px >= 0 && py >= 0) {
        const newStickerState = params.updateStickerPosition(params.stickerState, px, py, params.outW, params.outH);
        params.setState({ stickerState: newStickerState });
        params.drawOverlay(params.hoverPx, params.hoverPy);
      }
      return;
    }
    
    
    
    if (params.activeTool === 'eyedropper') {
      if (!params.isPanning) {
        const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
        params.setState({ hoverPx: px, hoverPy: py });
        return;
      }
    }
    
    
    if (params.isSizing || (params.sizingContext?.active)) {
      const STEP = 6;
      const startY = params.sizingContext?.startY || params.sizeStartY;
      const startValue = params.sizingContext?.startValue || params.sizeStartValue;
      const frozenPx = params.sizingContext?.frozenPx || params.sizeFrozenPx;
      const frozenPy = params.sizingContext?.frozenPy || params.sizeFrozenPy;
      
      const delta = Math.round((startY - e.clientY) / STEP); 
      const base = startValue;
      
      
      let newValue;
      if (params.activeTool === 'magic') {
        newValue = params.clampTolerance(base + delta);
        params.setState({ magicTolerance: newValue });
      } else {
        newValue = params.clampSize(base + delta);
        const updates: Record<string, any> = {};
        if (params.activeTool === 'brush') updates.brushSize = newValue;
        else if (params.activeTool === 'eraser') updates.eraserSize = newValue;
        else if (params.activeTool === 'select') updates.selectSize = newValue;
        params.setState(updates);
      }
      
      
      params.drawOverlay(frozenPx, frozenPy);
      return;
    }
    
    
    if (params.isPanning) {
      const dx = e.clientX - params.panStartPointerX;
      const dy = e.clientY - params.panStartPointerY;
      const m = params.getDisplayMetricsLocal();
      if (!m) return;
      const newPanX = Math.round(params.panStartX + dx);
      const newPanY = Math.round(params.panStartY + dy);
      params.setState({ 
        panX: newPanX,
        panY: newPanY 
      });
      
      
      
      const ec = params.editCanvas;
      if (ec) {
        ec.style.transform = `translate3d(${newPanX}px, ${newPanY}px, 0)`;
      }
      
      params.layoutStage();
      
      params.drawOverlay(params.hoverPx, params.hoverPy);
      
      return;
    }
    
    
    if (params.activeTool === 'select') {
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      params.setState({ hoverPx: px, hoverPy: py });
      if (params.isSelecting && px >= 0 && py >= 0) {
        const op = e.altKey ? 'sub' : (e.shiftKey ? 'add' : 'replace');
        params.applySelectionAt(px, py, op);
      }
      params.drawOverlay(px, py);
      return;
    }
    
    
    if (params.activeTool === 'magic') {
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      params.setState({ hoverPx: px, hoverPy: py });
      params.drawOverlay(px, py);
      return;
    }
    
    
    if (params.activeTool === 'gradient') {
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      params.setState({ hoverPx: px, hoverPy: py });
      
      if (params.gradientDragging) {
        params.setState({
          gradEndPx: px,
          gradEndPy: py
        });
      }
      params.drawOverlay(px, py);
      return;
    }
    
    
    if (params.activeTool !== 'brush' && params.activeTool !== 'eraser') return;
    const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
    params.setState({ hoverPx: px, hoverPy: py });
    
    
    if (params.isDrawing && px >= 0 && py >= 0 && params.hasActiveStroke()) {
      params.addSmoothPoint(px, py);
    }
    
    params.drawOverlay(px, py);
  };
}

export function createStageMouseLeaveHandler(params: MouseEventHandlersParams) {
  return function onStageMouseLeave() {
    
    if (params.hasActiveStroke()) {
      params.cancelSmoothStroke();
    }
    
    params.setState({
      hoverPx: -1,
      hoverPy: -1,
      isDrawing: false,
      isPanning: false,
      isSelecting: false
    });
    params.drawOverlay(-1, -1);
  };
}

export function createStageMouseDownHandler(params: MouseEventHandlersParams) {
  return function onStageMouseDown(e: MouseEvent) {
    if (!params.editMode) return;
    
    
    if (!params.stickerMode && params.activeTool === 'eyedropper') {
      
      
      if (e.button !== 0 && e.button !== 2) {
        
      } else {
        e.preventDefault();
        try { e.stopPropagation(); } catch {}
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      if (px < 0 || py < 0 || px >= params.outW || py >= params.outH) {
        params.setState({ activeTool: params.prevTool });
        return;
      }
      try {
        const picked = pickPixelRGB(params.editCanvas, px, py);
        if (!picked) { params.setState({ activeTool: params.prevTool }); return; }
        const rgb = nearestPaletteColor(params.allowedColors, picked);
        if (params.prevTool === 'gradient') {
          if (e.button === 2) {
            params.setState({ gradientColorB: rgb, activeTool: params.prevTool });
          } else {
            params.setState({ gradientColorA: rgb, activeTool: params.prevTool });
          }
        } else {
          params.setState({ brushColorRGB: rgb, activeTool: params.prevTool });
        }
      } catch {
        params.setState({ activeTool: params.prevTool });
      }
      return;
      }
    }
    
    
    if (params.stickerMode && params.stickerCanvas) {
      if (e.button === 0) { 
        e.preventDefault();
        const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
        if (px >= 0 && py >= 0) {
          const newStickerState = params.startStickerDrag(params.stickerState, px, py);
          params.setState({ stickerState: newStickerState });
        }
        return;
      }
    }
    
    
    if (!params.stickerMode && e.button === 2 && e.altKey && 
        (params.activeTool === 'brush' || params.activeTool === 'eraser' || 
         params.activeTool === 'select' || params.activeTool === 'magic')) {
      e.preventDefault();
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      
      
      const frozenPx = (px >= 0 && py >= 0) ? px : params.hoverPx;
      const frozenPy = (px >= 0 && py >= 0) ? py : params.hoverPy;
      const startValue = (params.activeTool === 'brush') ? params.brushSize : 
                         (params.activeTool === 'eraser') ? params.eraserSize : 
                         (params.activeTool === 'select') ? params.selectSize : params.magicTolerance;
      
      
      if (params.sizingContext) {
        params.sizingContext.active = true;
        params.sizingContext.frozenPx = frozenPx;
        params.sizingContext.frozenPy = frozenPy;
        params.sizingContext.startY = e.clientY;
        params.sizingContext.startValue = startValue;
      }
      
      params.setState({
        sizeFrozenPx: frozenPx,
        sizeFrozenPy: frozenPy,
        sizeStartY: e.clientY,
        sizeStartValue: startValue,
        isSizing: true
      });
      
      
      params.drawOverlay(frozenPx, frozenPy);
      return;
    }
    
    
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      params.setState({
        isPanning: true,
        panStartPointerX: e.clientX,
        panStartPointerY: e.clientY,
        panStartX: params.panX,
        panStartY: params.panY
      });
      return;
    }
    
    
    if (params.activeTool === 'gradient') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      
      params.setState({
        gradientDragging: true,
        gradStartPx: px,
        gradStartPy: py,
        gradEndPx: px,
        gradEndPy: py
      });
      params.drawOverlay(px, py);
      return;
    }
    
    
    if (params.activeTool === 'select') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      if (px < 0 || py < 0) return;
      params.setState({
        isSelecting: true,
        selectionAntsCanvas: null,
        selectionReplaceCleared: false
      });
      params.selectionStrokeTiles.clear();
      const op = e.altKey ? 'sub' : (e.shiftKey ? 'add' : 'replace');
      params.applySelectionAt(px, py, op);
      return;
    }
    
    
    if (params.activeTool === 'magic') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
      if (px < 0 || py < 0) return;
      const op = e.altKey ? 'sub' : (e.shiftKey ? 'add' : 'replace');
      params.applyMagicSelection(px, py, op);
      params.drawOverlay(px, py);
      return;
    }
    
    
    if (params.activeTool !== 'brush' && params.activeTool !== 'eraser') return;
    if (e.button !== 0) return;
    e.preventDefault();
    
    const { px, py } = params.screenToPixelLocal(e.clientX, e.clientY);
    if (px < 0 || py < 0) return;
    
    
    params.setState({ isDrawing: true });
    params.startSmoothStroke(px, py);
    
    params.drawOverlay(px, py);
  };
}

export function createStageMouseUpHandler(params: MouseEventHandlersParams) {
  return function onStageMouseUp() {
    
    if (params.hasActiveStroke()) {
      params.completeSmoothStroke();
    }
    
    params.setState({
      isDrawing: false,
      isPanning: false
    });
    
    
    if (params.stickerMode && params.stickerDragging) { 
      const newStickerState = params.stopStickerDrag(params.stickerState); 
      params.setState({ stickerState: newStickerState });
      return; 
    }
    
    
    if (params.isSizing || params.sizingContext?.active) {
      
      if (params.sizingContext) {
        params.sizingContext.active = false;
      }
      params.setState({ isSizing: false });
      params.drawOverlay(params.hoverPx, params.hoverPy);
    }
    
    
    if (params.gradientDragging) {
      params.setState({ gradientDragging: false });
      
      const endPx = params.hoverPx;
      const endPy = params.hoverPy;
      params.setState({
        gradEndPx: endPx,
        gradEndPy: endPy
      });
      params.applyGradient(params.gradStartPx, params.gradStartPy, endPx, endPy);
      
      params.setState({
        gradStartPx: -1,
        gradStartPy: -1,
        gradEndPx: -1,
        gradEndPy: -1
      });
      params.drawOverlay(params.hoverPx, params.hoverPy);
    }
    
    
    if (params.isSelecting) {
      params.setState({ isSelecting: false });
      
      if (params.selectionStrokeTiles.size) {
        const tiles: any[] = [];
        for (const [, t] of params.selectionStrokeTiles) {
          const after = params.copySelectionRect(t.x, t.y, t.w, t.h);
          tiles.push({ x: t.x, y: t.y, w: t.w, h: t.h, before: t.before, after });
        }
        params.undoStack.push({ selTiles: tiles });
        if (params.undoStack.length > 100) params.undoStack.shift();
        params.redoStack.length = 0;
      }
      if (params.selectionCount > 0) params.rebuildSelectionAnts(); 
      else params.setState({ selectionAntsCanvas: null });
      params.drawOverlay(params.hoverPx, params.hoverPy);
    }
    
    params.finalizeStroke();
  };
}


export function createWindowMouseUpHandler(params: MouseEventHandlersParams) {
  return function onWindowMouseUp() {
    
    if (params.hasActiveStroke()) {
      params.completeSmoothStroke();
    }
    
    params.setState({
      isDrawing: false,
      isPanning: false
    });
    
    if (params.isSizing || params.sizingContext?.active) {
      
      if (params.sizingContext) {
        params.sizingContext.active = false;
      }
      params.setState({ isSizing: false });
      params.drawOverlay(params.hoverPx, params.hoverPy);
    }
    
    if (params.gradientDragging) {
      params.setState({ gradientDragging: false });
      if (params.gradStartPx >= 0 && params.gradStartPy >= 0 && params.hoverPx >= 0 && params.hoverPy >= 0) {
        const endPx = params.hoverPx;
        const endPy = params.hoverPy;
        params.setState({
          gradEndPx: endPx,
          gradEndPy: endPy
        });
        params.applyGradient(params.gradStartPx, params.gradStartPy, endPx, endPy);
        params.drawOverlay(params.hoverPx, params.hoverPy);
      }
    }
    
    params.finalizeStroke();
  };
}


export function createStartPatternDragHandler(params: MouseEventHandlersParams) {
  return function startPatternDrag(y: number, x: number, e: MouseEvent) {
    try { e.preventDefault(); } catch {}
    params.setState({
      isPatternDragging: true,
      patternDragValue: params.customDitherPattern[y][x] ? 0 : 1
    });
    setPatternCell(params, y, x, params.patternDragValue);
  };
}


export function createMovePatternDragHandler(params: MouseEventHandlersParams) {
  return function movePatternDrag(y: number, x: number, e: MouseEvent) {
    if (!params.isPatternDragging) return;
    try { e.preventDefault(); } catch {}
    setPatternCell(params, y, x, params.patternDragValue);
  };
}

function setPatternCell(params: MouseEventHandlersParams, y: number, x: number, value: number) {
  if (params.customDitherPattern[y][x] === value) return;
  const newPattern = params.customDitherPattern.slice();
  newPattern[y][x] = value;
  params.setState({ customDitherPattern: newPattern });
}

export function createGlobalWheelHandler(params: WheelHandlerParams) {
  return function onGlobalWheel(e: WheelEvent) {
    if (params.stickerMode) return; 
    if (!e.altKey) return; 
    if (!params.editMode) return;
    if (params.activeTool !== 'brush' && params.activeTool !== 'eraser' && 
        params.activeTool !== 'select' && params.activeTool !== 'magic') return;
    
    e.preventDefault();
    
    
    if (params.isDrawing) {
      params.setState({ isDrawing: false });
    }
    
    const dir = e.deltaY < 0 ? 1 : -1; 
    const updates: Record<string, any> = {};
    
    if (params.activeTool === 'brush') {
      updates.brushSize = params.clampSize(params.brushSize + dir);
    }
    if (params.activeTool === 'eraser') {
      updates.eraserSize = params.clampSize(params.eraserSize + dir);
    }
    if (params.activeTool === 'select') {
      updates.selectSize = params.clampSize(params.selectSize + dir);
    }
    if (params.activeTool === 'magic') { 
      updates.magicTolerance = params.clampTolerance(params.magicTolerance + dir);
      updates.magicHintUntil = (performance.now ? performance.now() : Date.now()) + 1200;
    }
    
    params.setState(updates);
    
    if (params.hoverPx >= 0 && params.hoverPy >= 0) {
      params.drawOverlay(params.hoverPx, params.hoverPy);
    }
  };
}

export function createStageWheelHandler(params: WheelHandlerParams) {
  return function onStageWheel(e: WheelEvent) {
    if (!params.editMode) return;
    
    if (e.altKey) return;
    
    
    if (params.isDrawing) {
      params.setState({ isDrawing: false });
    }
    
    const rect = params.outputBox.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const m0 = params.getDisplayMetricsLocal();
    if (!m0) return;
    
    e.preventDefault();
    
    const worldX = (x - (m0.ox + params.panX)) / m0.scale;
    const worldY = (y - (m0.oy + params.panY)) / m0.scale;
    const factor = Math.pow(1.0015, -e.deltaY);
    
    
    const baseScale = m0.scale / Math.max(1e-6, params.zoom);
    const minZoom = 0.05; 
    const maxScale = 128; 
    const maxZoom = Math.max(8, maxScale / Math.max(1e-6, baseScale));
    const newZoom = Math.max(minZoom, Math.min(maxZoom, params.zoom * factor));
    
    if (newZoom === params.zoom) return;
    
    const updates: Record<string, any> = { zoom: newZoom };
    params.setState(updates);
    
    const m1 = params.getDisplayMetricsLocal();
    const newPanX = Math.round(x - m1.ox - worldX * m1.scale);
    const newPanY = Math.round(y - m1.oy - worldY * m1.scale);
    
    params.setState({
      panX: newPanX,
      panY: newPanY
    });
    
    params.layoutStage();
    params.drawOverlay(params.hoverPx, params.hoverPy);
  };
}


