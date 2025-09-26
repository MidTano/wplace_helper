
import type { DisplayMetrics } from './brush';

export type SelectionOp = 'add' | 'sub' | 'replace';

export function copySelectionRect(
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): Uint8Array {
  const out = new Uint8Array(w * h);
  
  for (let yy = 0; yy < h; yy++) {
    const srcRow = (y + yy) * outW;
    const dstRow = yy * w;
    
    for (let xx = 0; xx < w; xx++) {
      out[dstRow + xx] = selectionMask[srcRow + (x + xx)] ? 1 : 0;
    }
  }
  
  return out;
}

export function writeSelectionRect(
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  data: Uint8Array,
): number {
  let cnt = 0;
  
  for (let yy = 0; yy < h; yy++) {
    const dstRow = (y + yy) * outW;
    const srcRow = yy * w;
    
    for (let xx = 0; xx < w; xx++) {
      const v = data[srcRow + xx] ? 1 : 0;
      const idx = dstRow + (x + xx);
      const old = selectionMask[idx];
      
      if (old !== v) { 
        selectionMask[idx] = v; 
        cnt += v ? 1 : -1; 
      }
    }
  }
  
  return cnt;
}

export function applySelectionRectOnMask(
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  op: SelectionOp,
): number {
  
  const X0 = Math.max(0, Math.min(outW, x0|0));
  const Y0 = Math.max(0, Math.min(outH, y0|0));
  const X1 = Math.max(0, Math.min(outW, x1|0));
  const Y1 = Math.max(0, Math.min(outH, y1|0));
  
  if (X1 <= X0 || Y1 <= Y0) return 0;
  
  let delta = 0;
  const mode = (op === 'replace') ? 'add' : op;
  
  if (mode === 'sub') {
    
    for (let y = Y0; y < Y1; y++) {
      const row = y * outW;
      for (let x = X0; x < X1; x++) {
        const i = row + x;
        if (selectionMask[i]) { 
          selectionMask[i] = 0; 
          delta--; 
        }
      }
    }
  } else {
    
    for (let y = Y0; y < Y1; y++) {
      const row = y * outW;
      for (let x = X0; x < X1; x++) {
        const i = row + x;
        if (!selectionMask[i]) { 
          selectionMask[i] = 1; 
          delta++; 
        }
      }
    }
  }
  
  return delta;
}


export function refreshSelectionVisFromMask(
  selectionVisCtx: CanvasRenderingContext2D | null,
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
) {
  if (!selectionVisCtx) return;
  
  selectionVisCtx.clearRect(0, 0, outW, outH);
  selectionVisCtx.fillStyle = '#55aaff';
  
  for (let y = 0; y < outH; y++) {
    const row = y * outW;
    for (let x = 0; x < outW; x++) {
      if (selectionMask[row + x]) {
        selectionVisCtx.fillRect(x, y, 1, 1);
      }
    }
  }
}

export function refreshSelectionVisSubrect(
  selectionVisCtx: CanvasRenderingContext2D | null,
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  if (!selectionVisCtx) return;
  
  const X0 = Math.max(0, Math.min(outW, x0|0));
  const Y0 = Math.max(0, Math.min(outH, y0|0));
  const X1 = Math.max(0, Math.min(outW, x1|0));
  const Y1 = Math.max(0, Math.min(outH, y1|0));
  
  const w = Math.max(0, X1 - X0);
  const h = Math.max(0, Y1 - Y0);
  if (w === 0 || h === 0) return;
  
  
  const img = selectionVisCtx.createImageData(w, h);
  const data = img.data; 
  let p = 0;
  
  for (let yy = Y0; yy < Y1; yy++) {
    const row = yy * outW;
    for (let xx = X0; xx < X1; xx++) {
      const set = selectionMask[row + xx] ? 1 : 0;
      
      if (set) {
        data[p] = 0x55;      
        data[p + 1] = 0xaa;  
        data[p + 2] = 0xff;  
        data[p + 3] = 0xff;  
      } else {
        
        data[p] = 0; 
        data[p+1] = 0; 
        data[p+2] = 0; 
        data[p+3] = 0;
      }
      p += 4;
    }
  }
  
  selectionVisCtx.putImageData(img, X0, Y0);
}

export function buildSelectionAntsCanvas(
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = outW; 
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  
  ctx.clearRect(0, 0, outW, outH);
  
  
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? '#fff' : '#000';
    
    for (let y = 0; y < outH; y++) {
      const row = y * outW;
      const upRow = (y > 0) ? row - outW : -1;
      const dnRow = (y < outH - 1) ? row + outW : -1;
      
      for (let x = 0; x < outW; x++) {
        const idx = row + x;
        if (!selectionMask[idx]) continue;
        
        
        const left0 = (x === 0) || !selectionMask[row + (x - 1)];
        const right0 = (x === outW - 1) || !selectionMask[row + (x + 1)];
        const up0 = (y === 0) || !selectionMask[upRow + x];
        const down0 = (y === outH - 1) || !selectionMask[dnRow + x];
        
        if (!(left0 || right0 || up0 || down0)) continue;
        
        
        const parity = (x + y) & 1;
        if (parity === pass) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  
  return canvas;
}

export function drawSelectionOverlay(
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
  ctx.strokeStyle = '#55aaff';
  ctx.lineWidth = Math.max(1, Math.floor(s * 0.25));
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.max(2, Math.floor(s * 0.5));
  
  
  const x = (px - half) * s;
  const y = (py - half) * s;
  const w = Math.ceil(r * s) - 1;
  const h = Math.ceil(r * s) - 1;
  
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
  ctx.restore();
}
