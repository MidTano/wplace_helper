
import type { DisplayMetrics } from './brush';

export type MagicSelectionOp = 'replace' | 'add' | 'sub';

export function computeMagicRegion(
  img: ImageData,
  outW: number,
  outH: number,
  seedX: number,
  seedY: number,
  tolerance: number,
  neighbors8: boolean = true,
): Uint8Array {
  const data = img.data;
  const N = outW * outH;
  const region = new Uint8Array(N);
  const visited = new Uint8Array(N);
  
  
  const qx = new Int32Array(N);
  const qy = new Int32Array(N);
  
  
  const idx0 = (seedY * outW + seedX) * 4;
  const sr = data[idx0], sg = data[idx0 + 1], sb = data[idx0 + 2];
  const tol = tolerance | 0;
  
  let qs = 0, qe = 0; 
  qx[qe] = seedX; 
  qy[qe] = seedY; 
  qe++;
  
  while (qs < qe) {
    const x = qx[qs];
    const y = qy[qs];
    qs++;
    
    const idx = y * outW + x;
    if (visited[idx]) continue; 
    visited[idx] = 1;
    
    
    const off = idx * 4;
    const r = data[off], g = data[off + 1], b = data[off + 2];
    const dr = Math.abs(r - sr), dg = Math.abs(g - sg), db = Math.abs(b - sb);
    const md = Math.max(dr, dg, db);
    
    if (md <= tol) {
      region[idx] = 1;
      
      
      if (x > 0) { qx[qe] = x - 1; qy[qe] = y; qe++; }
      if (x + 1 < outW) { qx[qe] = x + 1; qy[qe] = y; qe++; }
      if (y > 0) { qx[qe] = x; qy[qe] = y - 1; qe++; }
      if (y + 1 < outH) { qx[qe] = x; qy[qe] = y + 1; qe++; }
      
      
      if (neighbors8) {
        if (x > 0 && y > 0) { qx[qe] = x - 1; qy[qe] = y - 1; qe++; }
        if (x + 1 < outW && y > 0) { qx[qe] = x + 1; qy[qe] = y - 1; qe++; }
        if (x > 0 && y + 1 < outH) { qx[qe] = x - 1; qy[qe] = y + 1; qe++; }
        if (x + 1 < outW && y + 1 < outH) { qx[qe] = x + 1; qy[qe] = y + 1; qe++; }
      }
    }
  }
  
  return region;
}

export function computeMagicRegionGlobal(
  img: ImageData,
  outW: number,
  outH: number,
  seedX: number,
  seedY: number,
  tolerance: number,
): Uint8Array {
  const data = img.data;
  const N = outW * outH;
  const region = new Uint8Array(N);
  const idx0 = (seedY * outW + seedX) * 4;
  const sr = data[idx0], sg = data[idx0 + 1], sb = data[idx0 + 2];
  const tol = tolerance | 0;

  for (let i = 0; i < N; i++) {
    const off = i * 4;
    const r = data[off], g = data[off + 1], b = data[off + 2];
    const dr = Math.abs(r - sr), dg = Math.abs(g - sg), db = Math.abs(b - sb);
    const md = Math.max(dr, dg, db);
    if (md <= tol) region[i] = 1;
  }

  return region;
}

export function applyMagicSelectionOnMask(
  region: Uint8Array,
  selectionMask: Uint8Array,
  outW: number,
  outH: number,
  op: MagicSelectionOp,
  tileSize: number = 16,
): { tiles: Array<{ x: number; y: number; w: number; h: number; before: Uint8Array; after: Uint8Array }>; delta: number } {
  const N = outW * outH;
  const changedTiles = new Map<string, { x: number; y: number; w: number; h: number }>();
  
  
  const addTile = (x: number, y: number) => {
    const tx = Math.floor(x / tileSize);
    const ty = Math.floor(y / tileSize);
    const key = tx + ',' + ty;
    
    if (!changedTiles.has(key)) {
      const tileX = tx * tileSize;
      const tileY = ty * tileSize;
      const tw = Math.min(tileSize, outW - tileX);
      const th = Math.min(tileSize, outH - tileY);
      
      if (tw > 0 && th > 0) {
        changedTiles.set(key, { x: tileX, y: tileY, w: tw, h: th });
      }
    }
  };
  
  
  if (op === 'replace') {
    for (let i = 0; i < N; i++) {
      if (selectionMask[i]) { 
        const y = (i / outW) | 0; 
        const x = i - y * outW; 
        addTile(x, y); 
      }
      if (region[i]) { 
        const y = (i / outW) | 0; 
        const x = i - y * outW; 
        addTile(x, y); 
      }
    }
  } else {
    for (let i = 0; i < N; i++) {
      if (!region[i]) continue;
      
      const y = (i / outW) | 0; 
      const x = i - y * outW;
      
      if (op === 'sub') { 
        if (!selectionMask[i]) continue; 
      } else { 
        if (selectionMask[i]) continue; 
      }
      
      addTile(x, y);
    }
  }
  
  
  const tiles: Array<{ x: number; y: number; w: number; h: number; before: Uint8Array; after: Uint8Array }> = [];
  
  for (const t of changedTiles.values()) {
    const before = new Uint8Array(t.w * t.h);
    
    
    for (let yy = 0; yy < t.h; yy++) {
      const srcRow = (t.y + yy) * outW;
      const dstRow = yy * t.w;
      
      for (let xx = 0; xx < t.w; xx++) {
        before[dstRow + xx] = selectionMask[srcRow + (t.x + xx)] ? 1 : 0;
      }
    }
    
    tiles.push({ ...t, before, after: new Uint8Array(t.w * t.h) });
  }
  
  
  let delta = 0;
  
  if (op === 'replace') {
    
    let newCount = 0; 
    let oldCount = 0;
    
    for (let i = 0; i < N; i++) { 
      if (selectionMask[i]) oldCount++; 
      selectionMask[i] = 0; 
    }
    
    for (let i = 0; i < N; i++) { 
      if (region[i]) { 
        selectionMask[i] = 1; 
        newCount++; 
      } 
    }
    
    delta = newCount - oldCount;
  } else if (op === 'sub') {
    
    for (let i = 0; i < N; i++) { 
      if (region[i] && selectionMask[i]) { 
        selectionMask[i] = 0; 
        delta--; 
      } 
    }
  } else { 
    
    for (let i = 0; i < N; i++) { 
      if (region[i] && !selectionMask[i]) { 
        selectionMask[i] = 1; 
        delta++; 
      } 
    }
  }
  
  
  for (const t of tiles) {
    for (let yy = 0; yy < t.h; yy++) {
      const srcRow = (t.y + yy) * outW;
      const dstRow = yy * t.w;
      
      for (let xx = 0; xx < t.w; xx++) {
        t.after[dstRow + xx] = selectionMask[srcRow + (t.x + xx)] ? 1 : 0;
      }
    }
  }
  
  return { tiles, delta };
}

export function drawMagicOverlay(
  ctx: CanvasRenderingContext2D,
  m: DisplayMetrics,
  px: number,
  py: number,
  tolerance: number,
  showHint: boolean = false,
) {
  if (px < 0 || py < 0) return;

  const s = m.scale;
  
  ctx.save();
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = Math.max(1, Math.floor(s * 0.25));
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = Math.max(3, Math.floor(s * 0.6));
  
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = (px + dx) * s;
      const y = (py + dy) * s;
      
      ctx.strokeRect(
        Math.round(x) + 0.5, 
        Math.round(y) + 0.5, 
        Math.ceil(s) - 1, 
        Math.ceil(s) - 1
      );
    }
  }
  
  
  if (showHint) {
    const dx = Math.round(px * s + 8);
    const dy = Math.round(py * s + 8);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(dx, dy, 40, 20);
    
    ctx.fillStyle = '#ffeb3b';
    ctx.font = '12px monospace';
    ctx.fillText(`±${tolerance}`, dx + 4, dy + 14);
  }
  
  ctx.restore();
}
