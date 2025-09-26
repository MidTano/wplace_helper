
import type { ClipRect, DisplayMetrics } from './brush';

export function eraseAtTool(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  outW: number,
  outH: number,
  size?: number,
  clip?: ClipRect,
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
  
  
  ctx.clearRect(x0, y0, w, h);
}

export function eraseMaskedBlock(
  img: ImageData,
  globalX0: number,
  globalY0: number,
  outW: number,
  selectionMask: Uint8Array,
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
      
      
      if (data[i + 3] !== 0) { 
        data[i + 3] = 0; 
        changed = true; 
      }
    }
  }
  
  return changed;
}

export function drawEraserOverlay(
  ctx: CanvasRenderingContext2D,
  m: DisplayMetrics,
  px: number,
  py: number,
  size: number,
) {
  if (px < 0 || py < 0) return;

  const s = m.scale;
  const r = Math.max(1, Math.round(size || 3));
  const half = Math.floor(r / 2);
  
  ctx.save();
  
  
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = Math.max(1, Math.floor(s * 0.25));
  ctx.setLineDash([4, 2]);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.max(2, Math.floor(s * 0.5));
  
  
  const x = (px - half) * s;
  const y = (py - half) * s;
  const w = Math.ceil(r * s) - 1;
  const h = Math.ceil(r * s) - 1;
  
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
  
  
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  const centerX = Math.round(x + w/2);
  const centerY = Math.round(y + h/2);
  
  ctx.beginPath();
  ctx.moveTo(centerX - w/4, centerY - h/4);
  ctx.lineTo(centerX + w/4, centerY + h/4);
  ctx.moveTo(centerX + w/4, centerY - h/4);
  ctx.lineTo(centerX - w/4, centerY + h/4);
  ctx.stroke();
  
  ctx.restore();
}
