
export type ToolName = 'brush' | 'eraser' | 'select' | 'magic' | 'gradient' | 'eyedropper';

export interface ClipRect { 
  x: number; 
  y: number; 
  w: number; 
  h: number; 
}

export interface DisplayMetrics {
  scale: number;
  dw: number; 
  dh: number;
  ox: number; 
  oy: number;
}

export function paintMaskedBlock(
  img: ImageData,
  globalX0: number,
  globalY0: number,
  outW: number,
  selectionMask: Uint8Array,
  activeTool: 'brush' | 'eraser',
  brushColorRGB?: [number, number, number],
): boolean {
  const iw = img.width, ih = img.height;
  const data = img.data;
  let changed = false;
  
  for (let yy = 0; yy < ih; yy++) {
    const y = globalY0 + yy;
    const row = y * outW;
    
    for (let xx = 0; xx < iw; xx++) {
      const x = globalX0 + xx;
      if (!selectionMask[row + x]) continue;
      
      const i = (yy * iw + xx) * 4;
      
      if (activeTool === 'eraser') {
        if (data[i + 3] !== 0) { 
          data[i + 3] = 0; 
          changed = true; 
        }
      } else {
        
        const r = brushColorRGB ? (brushColorRGB[0] | 0) : 0;
        const g = brushColorRGB ? (brushColorRGB[1] | 0) : 0;
        const b = brushColorRGB ? (brushColorRGB[2] | 0) : 0;
        
        if (data[i] !== r || data[i+1] !== g || data[i+2] !== b || data[i+3] !== 255) {
          data[i] = r; 
          data[i+1] = g; 
          data[i+2] = b; 
          data[i+3] = 255; 
          changed = true;
        }
      }
    }
  }
  
  return changed;
}

export function paintAtTool(
  ctx: CanvasRenderingContext2D,
  activeTool: ToolName,
  px: number,
  py: number,
  outW: number,
  outH: number,
  size?: number,
  clip?: ClipRect,
  color?: string,
) {
  const r = Math.max(1, Math.round(size || 3));
  const half = Math.floor(r / 2);
  
  
  const startX = Math.max(0, px - half);
  const startY = Math.max(0, py - half);
  const endX = Math.min(outW, px - half + r);
  const endY = Math.min(outH, py - half + r);
  
  let x0 = startX;
  let y0 = startY;
  let x1 = endX;
  let y1 = endY;
  
  
  if (clip) {
    const cx0 = Math.max(0, Math.floor(clip.x));
    const cy0 = Math.max(0, Math.floor(clip.y));
    const cx1 = Math.min(outW, Math.ceil(clip.x + clip.w));
    const cy1 = Math.min(outH, Math.ceil(clip.y + clip.h));
    
    x0 = Math.max(x0, cx0);
    y0 = Math.max(y0, cy0);
    x1 = Math.min(x1, cx1);
    y1 = Math.min(y1, cy1);
  }
  
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  if (w === 0 || h === 0) return;
  
  
  if (activeTool === 'eraser') {
    ctx.clearRect(x0, y0, w, h);
  } else if (activeTool === 'brush') {
    ctx.fillStyle = color || '#000';
    ctx.fillRect(x0, y0, w, h);
  }
}

export function drawBrushOverlay(
  ctx: CanvasRenderingContext2D,
  m: DisplayMetrics,
  px: number,
  py: number,
  size: number,
  _ringColor?: string,
) {
  if (px < 0 || py < 0) return;

  const s = m.scale;
  const r = Math.max(1, Math.round(size || 3));
  const half = Math.floor(r / 2);
  
  ctx.save();
  
  
  const x = (px - half) * s;
  const y = (py - half) * s;
  const w = Math.ceil(r * s) - 1;
  const h = Math.ceil(r * s) - 1;

  const outerWidth = Math.max(2, Math.floor(s * 0.6));
  const innerWidth = Math.max(1, Math.floor(s * 0.3));

  
  ctx.strokeStyle = '#000';
  ctx.lineWidth = outerWidth;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);

  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = innerWidth;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
  ctx.restore();
}
