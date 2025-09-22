export type ToolName = 'brush' | 'eraser' | 'select' | 'magic' | 'gradient';

export interface ClipRect { x: number; y: number; w: number; h: number; }

/**
 * Закрасить (или стереть) блок img (локальные координаты 0..iw,0..ih),
 * учитывая глобальную selectionMask размером outW*outH.
 * globalX0/globalY0 — левый верх img в глобальных координатах.
 * Возвращает true, если были изменения.
 */
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
        if (data[i + 3] !== 0) { data[i + 3] = 0; changed = true; }
      } else {
        const r = brushColorRGB ? (brushColorRGB[0] | 0) : 0;
        const g = brushColorRGB ? (brushColorRGB[1] | 0) : 0;
        const b = brushColorRGB ? (brushColorRGB[2] | 0) : 0;
        if (data[i] !== r || data[i+1] !== g || data[i+2] !== b || data[i+3] !== 255) {
          data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255; changed = true;
        }
      }
    }
  }
  return changed;
}


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
    for (let xx = 0; xx < w; xx++) out[dstRow + xx] = selectionMask[srcRow + (x + xx)] ? 1 : 0;
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
      if (old !== v) { selectionMask[idx] = v; cnt += v ? 1 : -1; }
    }
  }
  return cnt;
}

export type MagicSelectionOp = 'replace' | 'add' | 'sub';

/**
 * Применить маску region к selectionMask с учётом op и получить список тайлов before/after для undo.
 * Меняет selectionMask на месте. Возвращает { tiles, delta } — изменение количества выбранных пикселей.
 */
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
      if (tw > 0 && th > 0) changedTiles.set(key, { x: tileX, y: tileY, w: tw, h: th });
    }
  };
  if (op === 'replace') {
    for (let i = 0; i < N; i++) {
      if (selectionMask[i]) { const y = (i / outW) | 0; const x = i - y * outW; addTile(x, y); }
      if (region[i])        { const y = (i / outW) | 0; const x = i - y * outW; addTile(x, y); }
    }
  } else {
    for (let i = 0; i < N; i++) {
      if (!region[i]) continue;
      const y = (i / outW) | 0; const x = i - y * outW;
      if (op === 'sub') { if (!selectionMask[i]) continue; }
      else { if (selectionMask[i]) continue; }
      addTile(x, y);
    }
  }
  const tiles: Array<{ x: number; y: number; w: number; h: number; before: Uint8Array; after: Uint8Array }> = [];
  
  for (const t of changedTiles.values()) {
    const before = copySelectionRect(selectionMask, outW, outH, t.x, t.y, t.w, t.h);
    tiles.push({ ...t, before, after: new Uint8Array(t.w * t.h) });
  }
  
  let delta = 0;
  if (op === 'replace') {
    
    let newCount = 0; let oldCount = 0;
    for (let i = 0; i < N; i++) { if (selectionMask[i]) oldCount++; selectionMask[i] = 0; }
    for (let i = 0; i < N; i++) { if (region[i]) { selectionMask[i] = 1; newCount++; } }
    delta = newCount - oldCount;
  } else if (op === 'sub') {
    for (let i = 0; i < N; i++) { if (region[i] && selectionMask[i]) { selectionMask[i] = 0; delta--; } }
  } else { 
    for (let i = 0; i < N; i++) { if (region[i] && !selectionMask[i]) { selectionMask[i] = 1; delta++; } }
  }
  
  for (const t of tiles) {
    t.after = copySelectionRect(selectionMask, outW, outH, t.x, t.y, t.w, t.h);
  }
  return { tiles, delta };
}

export type SelectionOp = 'add' | 'sub' | 'replace';

/**
 * Применить прямоугольный участок к selectionMask с операцией op.
 * Для 'replace' предположим, что внешним кодом маска уже очищена, поэтому здесь действуем как 'add'.
 * Возвращает delta — изменение количества выбранных пикселей.
 */
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
        if (selectionMask[i]) { selectionMask[i] = 0; delta--; }
      }
    }
  } else {
    for (let y = Y0; y < Y1; y++) {
      const row = y * outW;
      for (let x = X0; x < X1; x++) {
        const i = row + x;
        if (!selectionMask[i]) { selectionMask[i] = 1; delta++; }
      }
    }
  }
  return delta;
}

export interface DisplayMetrics {
  scale: number;
  dw: number; dh: number;
  ox: number; oy: number;
}

/**
 * Отрисовать оверлей курсора в зависимости от активного инструмента.
 * Для кисти/ластика — один большой квадрат размером 3×3 пикселя.
 * Для остальных — сетка 3×3 как раньше.
 */
export function drawOverlayForTool(
  ctx: CanvasRenderingContext2D,
  m: DisplayMetrics,
  px: number,
  py: number,
  activeTool: ToolName,
  size?: number,
  ringColor?: string,
) {
  if (px < 0 || py < 0) return;

  const s = m.scale;
  ctx.save();
  ctx.strokeStyle = ringColor || '#fff';
  ctx.lineWidth = Math.max(1, Math.floor(s * 0.25));
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.max(2, Math.floor(s * 0.5));

  if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'select') {
    const r = Math.max(1, Math.round(size || 3));
    const half = Math.floor(r / 2);
    
    const x = (px - half) * s;
    const y = (py - half) * s;
    const w = Math.ceil(r * s) - 1;
    const h = Math.ceil(r * s) - 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
  } else {
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = (px + dx) * s;
        const y = (py + dy) * s;
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.ceil(s) - 1, Math.ceil(s) - 1);
      }
    }
  }

  ctx.restore();
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
      if (selectionMask[row + x]) selectionVisCtx.fillRect(x, y, 1, 1);
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
        
        data[p] = 0; data[p+1] = 0; data[p+2] = 0; data[p+3] = 0;
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
  canvas.width = outW; canvas.height = outH;
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
        if (parity === pass) ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
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
  ctx.beginPath(); ctx.moveTo(x0+0.5, y0+0.5); ctx.lineTo(x1+0.5, y1+0.5); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgb(${colorA[0]},${colorA[1]},${colorA[2]})`;
  ctx.fillRect(x0-3, y0-3, 6, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeRect(x0-3.5, y0-3.5, 7, 7);
  ctx.fillStyle = `rgb(${colorB[0]},${colorB[1]},${colorB[2]})`;
  ctx.fillRect(x1-3, y1-3, 6, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeRect(x1-3.5, y1-3.5, 7, 7);
  ctx.restore();
}

/**
 * Нанесение «чернил» инструментом поверх канваса изображения
 */
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
  } else {
    
  }
}

/**
 * Flood-fill регион для Magic Wand с допуском tol (0..255) по max(|dr|,|dg|,|db|).
 * Возвращает маску region длиной outW*outH (0/1), не модифицирует selectionMask.
 */
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
  qx[qe] = seedX; qy[qe] = seedY; qe++;
  while (qs < qe) {
    const x = qx[qs];
    const y = qy[qs];
    qs++;
    const idx = y * outW + x;
    if (visited[idx]) continue; visited[idx] = 1;
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

export type GradientMode = 'bayer2'|'bayer4'|'lines'|'noise'|'checker'|'dots'|'hatch'|'radial'|'rings'|'spiral'|'diamond'|'ornament';

/**
 * Применить 2‑цветный градиент к канвасу с учётом selectionMask (если передан).
 * Возвращает список тайлов с BEFORE/AFTER для истории.
 */
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
      try { img = ctx.getImageData(tx, ty, tw, th); } catch {}
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
              thr = (b2[y & 1][x & 1] + 0.5) * inv4; break;
            case 'bayer4':
              thr = (b4[y & 3][x & 3] + 0.5) * inv16; break;
            case 'lines': {
              const orthoX = -dy, orthoY = dx;
              const s = (x * orthoX + y * orthoY) / Math.sqrt(orthoX*orthoX + orthoY*orthoY);
              const period = 4;
              thr = ((s / period) % 1 + 1) % 1; break;
            }
            case 'checker':
              thr = ((x ^ y) & 1) ? 0.25 : 0.75; break;
            case 'dots': {
              const k = 0.35; thr = (Math.sin(x * k) * Math.sin(y * k) + 1) * 0.5; break;
            }
            case 'hatch': {
              const p = 6; const a = ((x + y) / p) % 1; const b = ((x - y) / p) % 1;
              thr = ((a < 0 ? a + 1 : a) * 0.5 + (b < 0 ? b + 1 : b) * 0.5); break;
            }
            case 'radial': {
              const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5; const d = Math.hypot(x - cx, y - cy);
              const p = 6; thr = (d / p) % 1; break;
            }
            case 'rings': {
              const d = Math.hypot(x - x0, y - y0); const p = 6; thr = (d / p) % 1; break;
            }
            case 'spiral': {
              const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5; const dx0 = x - cx, dy0 = y - cy;
              const ang = Math.atan2(dy0, dx0) / (Math.PI * 2); const d = Math.hypot(dx0, dy0); const p = 7;
              const v = (ang + (d / p)); thr = (v - Math.floor(v)); break;
            }
            case 'diamond': {
              const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5; const man = Math.abs(x - cx) + Math.abs(y - cy);
              const p = 6; thr = (man / p) % 1; break;
            }
            case 'ornament': {
              const tile = [0b01100110,0b10011001,0b00111100,0b11111111,0b11111111,0b00111100,0b10011001,0b01100110];
              const bit = (tile[y & 7] >> (x & 7)) & 1; thr = bit ? 0.35 : 0.65; break;
            }
            case 'noise': default: {
              const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; thr = ((h & 255) / 255); break;
            }
          }
          const pickB = (t > thr);
          const r = pickB ? colorB[0] : colorA[0];
          const g = pickB ? colorB[1] : colorA[1];
          const b = pickB ? colorB[2] : colorA[2];
          const i = (yy * tw + xx) * 4;
          if (data[i] !== r || data[i+1] !== g || data[i+2] !== b || data[i+3] !== 255) {
            data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
            changed = true;
          }
        }
      }
      if (changed) {
        let before: ImageData | undefined; try { before = ctx.getImageData(tx, ty, tw, th); } catch {}
        try { ctx.putImageData(img, tx, ty); } catch {}
        let after: ImageData | undefined; try { after = ctx.getImageData(tx, ty, tw, th); } catch {}
        if (before && after) tiles.push({ x: tx, y: ty, w: tw, h: th, before, after });
      }
    }
  }
  return tiles;
}
