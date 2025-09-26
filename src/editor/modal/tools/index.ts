
export type { 
  ToolName, 
  ClipRect, 
  DisplayMetrics 
} from './brush';

export type { 
  SelectionOp 
} from './selection';

export type { 
  MagicSelectionOp 
} from './magic';

export type { 
  GradientMode 
} from './gradient';


export {
  paintMaskedBlock,
  paintAtTool,
  drawBrushOverlay
} from './brush';


export {
  eraseAtTool,
  eraseMaskedBlock,
  drawEraserOverlay
} from './eraser';


export {
  copySelectionRect,
  writeSelectionRect,
  applySelectionRectOnMask,
  refreshSelectionVisFromMask,
  refreshSelectionVisSubrect,
  buildSelectionAntsCanvas,
  drawSelectionOverlay
} from './selection';


export {
  computeMagicRegion,
  computeMagicRegionGlobal,
  applyMagicSelectionOnMask,
  drawMagicOverlay
} from './magic';


export {
  applyGradientOnCanvas,
  drawGradientPreviewOverlay
} from './gradient';


import { drawBrushOverlay } from './brush';
import { drawEraserOverlay } from './eraser';
import { drawSelectionOverlay } from './selection';
import { drawMagicOverlay } from './magic';
import type { DisplayMetrics, ToolName } from './brush';



export function drawOverlayForTool(
  ctx: CanvasRenderingContext2D,
  m: DisplayMetrics,
  px: number,
  py: number,
  activeTool: ToolName,
  size?: number,
  ringColor?: string,
) {
  
  if ((px < 0 || py < 0) && activeTool !== 'gradient') return;

  const s = m.scale;
  
  if (activeTool === 'brush') {
    drawBrushOverlay(ctx, m, px, py, size || 3, ringColor);
  } else if (activeTool === 'eraser') {
    drawEraserOverlay(ctx, m, px, py, size || 3);
  } else if (activeTool === 'select') {
    drawSelectionOverlay(ctx, m, px, py, size || 3);
  } else if (activeTool === 'magic') {
    drawMagicOverlay(ctx, m, px, py, 10); 
  } else {
    
    ctx.save();
    ctx.strokeStyle = ringColor || '#fff';
    ctx.lineWidth = Math.max(1, Math.floor(s * 0.25));
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.max(2, Math.floor(s * 0.5));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = (px + dx) * s;
        const y = (py + dy) * s;
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.ceil(s) - 1, Math.ceil(s) - 1);
      }
    }

    ctx.restore();
  }
}
