
export type GradientMode = 'bayer2'|'bayer4'|'lines'|'noise'|'checker'|'dots'|'hatch'|'radial'|'rings'|'spiral'|'diamond'|'ornament';

export function applyGradientOnCanvas(
  ctx: CanvasRenderingContext2D,
  outW: number,
  outH: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colorA: [number, number, number],
  colorB: [number, number, number],
  gradientMode: GradientMode,
  selectionMask?: Uint8Array | null,
  tileSize: number = 64,
): Array<{ x: number; y: number; w: number; h: number; before: ImageData; after: ImageData; }> {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx*dx + dy*dy;
  if (len2 <= 0.0001) return [];
  
  const useSel = !!(selectionMask && selectionMask.length === outW * outH);
  const tiles: Array<{ x: number; y: number; w: number; h: number; before: ImageData; after: ImageData; }> = [];
  
  
  const inv16 = 1/16, inv4 = 1/4;
  
  
  const b2 = [ [0,2], [3,1] ] as const;
  const b4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
  ] as const;
  
  
  for (let ty = 0; ty < outH; ty += tileSize) {
    const th = Math.min(tileSize, outH - ty);
    
    for (let tx = 0; tx < outW; tx += tileSize) {
      const tw = Math.min(tileSize, outW - tx);
      
      let img: ImageData | undefined;
      try { 
        img = ctx.getImageData(tx, ty, tw, th); 
      } catch {}
      if (!img) continue;
      
      const data = img.data;
      let changed = false;
      
      
      for (let yy = 0; yy < th; yy++) {
        const y = ty + yy;
        const rowSel = y * outW;
        
        for (let xx = 0; xx < tw; xx++) {
          const x = tx + xx;
          
          
          if (useSel && !selectionMask![rowSel + x]) continue;
          
          
          let t = ((x - x0) * dx + (y - y0) * dy) / len2;
          if (t < 0) t = 0; else if (t > 1) t = 1;
          
          
          let thr: number;
          
          switch (gradientMode) {
            case 'bayer2':
              
              thr = (b2[y & 1][x & 1] + 0.5) * inv4; 
              break;
              
            case 'bayer4':
              
              thr = (b4[y & 3][x & 3] + 0.5) * inv16; 
              break;
              
            case 'lines': {
              
              const orthoX = -dy, orthoY = dx;
              const s = (x * orthoX + y * orthoY) / Math.sqrt(orthoX*orthoX + orthoY*orthoY);
              const period = 4;
              thr = ((s / period) % 1 + 1) % 1; 
              break;
            }
            
            case 'checker':
              
              thr = ((x ^ y) & 1) ? 0.25 : 0.75; 
              break;
              
            case 'dots': {
              
              const k = 0.35; 
              thr = (Math.sin(x * k) * Math.sin(y * k) + 1) * 0.5; 
              break;
            }
            
            case 'hatch': {
              
              const p = 6; 
              const a = ((x + y) / p) % 1; 
              const b = ((x - y) / p) % 1;
              thr = ((a < 0 ? a + 1 : a) * 0.5 + (b < 0 ? b + 1 : b) * 0.5); 
              break;
            }
            
            case 'radial': {
              
              const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5; 
              const d = Math.hypot(x - cx, y - cy);
              const p = 6; 
              thr = (d / p) % 1; 
              break;
            }
            
            case 'rings': {
              
              const d = Math.hypot(x - x0, y - y0); 
              const p = 6; 
              thr = (d / p) % 1; 
              break;
            }
            
            case 'spiral': {
              
              const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5; 
              const dx0 = x - cx, dy0 = y - cy;
              const ang = Math.atan2(dy0, dx0) / (Math.PI * 2); 
              const d = Math.hypot(dx0, dy0); 
              const p = 7;
              const v = (ang + (d / p)); 
              thr = (v - Math.floor(v)); 
              break;
            }
            
            case 'diamond': {
              
              const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5; 
              const man = Math.abs(x - cx) + Math.abs(y - cy);
              const p = 6; 
              thr = (man / p) % 1; 
              break;
            }
            
            case 'ornament': {
              
              const tile = [0b01100110,0b10011001,0b00111100,0b11111111,0b11111111,0b00111100,0b10011001,0b01100110];
              const bit = (tile[y & 7] >> (x & 7)) & 1; 
              thr = bit ? 0.35 : 0.65; 
              break;
            }
            
            case 'noise': 
            default: {
              
              const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; 
              thr = ((h & 255) / 255); 
              break;
            }
          }
          
          
          const pickB = (t > thr);
          const r = pickB ? colorB[0] : colorA[0];
          const g = pickB ? colorB[1] : colorA[1];
          const b = pickB ? colorB[2] : colorA[2];
          
          
          const i = (yy * tw + xx) * 4;
          if (data[i] !== r || data[i+1] !== g || data[i+2] !== b || data[i+3] !== 255) {
            data[i] = r; 
            data[i+1] = g; 
            data[i+2] = b; 
            data[i+3] = 255;
            changed = true;
          }
        }
      }
      
      
      if (changed) {
        let before: ImageData | undefined; 
        try { before = ctx.getImageData(tx, ty, tw, th); } catch {}
        
        try { ctx.putImageData(img, tx, ty); } catch {}
        
        let after: ImageData | undefined; 
        try { after = ctx.getImageData(tx, ty, tw, th); } catch {}
        
        if (before && after) {
          tiles.push({ x: tx, y: ty, w: tw, h: th, before, after });
        }
      }
    }
  }
  
  return tiles;
}

export function drawGradientPreviewOverlay(
  ctx: CanvasRenderingContext2D,
  scale: number,
  startPx: number,
  startPy: number,
  endPx: number,
  endPy: number,
  colorA: [number, number, number],
  colorB: [number, number, number],
) {
  const x0 = Math.round(startPx * scale);
  const y0 = Math.round(startPy * scale);
  const x1 = Math.round(endPx * scale);
  const y1 = Math.round(endPy * scale);
  
  ctx.save();
  
  
  ctx.strokeStyle = '#55aaff';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); 
  ctx.moveTo(x0+0.5, y0+0.5); 
  ctx.lineTo(x1+0.5, y1+0.5); 
  ctx.stroke();
  ctx.setLineDash([]);
  
  
  ctx.fillStyle = `rgb(${colorA[0]},${colorA[1]},${colorA[2]})`;
  ctx.fillRect(x0-3, y0-3, 6, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; 
  ctx.strokeRect(x0-3.5, y0-3.5, 7, 7);
  
  
  ctx.fillStyle = `rgb(${colorB[0]},${colorB[1]},${colorB[2]})`;
  ctx.fillRect(x1-3, y1-3, 6, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; 
  ctx.strokeRect(x1-3.5, y1-3.5, 7, 7);
  
  ctx.restore();
}
