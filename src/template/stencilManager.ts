import stencil, { type StencilCoords } from './stencil';
import { getAutoConfig } from '../screen/autoConfig';
import { MASTER_COLORS } from '../editor/palette';

const PAL_LEN = MASTER_COLORS.length;
const PALETTE_R = new Uint8Array(PAL_LEN);
const PALETTE_G = new Uint8Array(PAL_LEN);
const PALETTE_B = new Uint8Array(PAL_LEN);
for (let i = 0; i < PAL_LEN; i++) {
  const rgb = MASTER_COLORS[i].rgb;
  PALETTE_R[i] = rgb[0] | 0;
  PALETTE_G[i] = rgb[1] | 0;
  PALETTE_B[i] = rgb[2] | 0;
}

let nearestIdxLUT: Uint16Array | null = null;
const LUT_BITS = 5;
const LUT_SIZE = 1 << (LUT_BITS * 3);
function ensureLUT(): void {
  if (nearestIdxLUT) return;
  const lut = new Uint16Array(LUT_SIZE);
  let k = 0;
  for (let rq = 0; rq < 32; rq++) {
    const r = (rq << 3) + 4;
    for (let gq = 0; gq < 32; gq++) {
      const g = (gq << 3) + 4;
      for (let bq = 0; bq < 32; bq++) {
        const b = (bq << 3) + 4;
        let best = 0;
        let bestD = 1e12;
        for (let p = 0; p < PAL_LEN; p++) {
          const dr = r - PALETTE_R[p];
          const dg = g - PALETTE_G[p];
          const db = b - PALETTE_B[p];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = p; if (d === 0) break; }
        }
        lut[k++] = best;
      }
    }
  }
  nearestIdxLUT = lut;
}

function nearestColorIndexFast(r: number, g: number, b: number): number {
  if (!nearestIdxLUT) ensureLUT();
  const key = ((r >>> 3) << 10) | ((g >>> 3) << 5) | (b >>> 3);
  return (nearestIdxLUT as Uint16Array)[key] | 0;
}

export default class stencilManager {
  tileSize = 1000;
  drawMult = 3;
  enabled = true;
  enhanced = false; 
  current: stencil | null = null;
  private pendingByTile: Map<string, Set<string>> = new Map();
  pendingColorIdx: number | null = null;
  private pendingByTileColor: Map<string, Map<number, Array<[number, number]>>> = new Map();
  private totalCounts: Uint32Array = new Uint32Array(PAL_LEN);
  
  
  autoSelectedMasterIdx: number | null = null;
  
  private tileCounts: Map<string, Uint32Array> = new Map();

  setEnabled(v: boolean) { this.enabled = !!v; }

  async create(file: Blob, coords: StencilCoords) {
    const s = new stencil({ file, coords, sortID: 0, displayName: 'Stencil', tileSize: this.tileSize, scaleMult: this.drawMult });
    await s.buildTileSegments({ enhanced: this.enhanced });
    this.current = s;
    this.pendingByTile.clear();
    this.pendingByTileColor.clear();
    this.tileCounts.clear();
    this.totalCounts.fill(0);
  }

  clear() { this.current = null; this.pendingByTile.clear(); this.pendingByTileColor.clear(); this.tileCounts.clear(); this.totalCounts.fill(0); }

  setAutoSelectedMasterIdx(idx: number | null) {
    if (idx == null || !Number.isFinite(idx as any)) this.autoSelectedMasterIdx = null; else this.autoSelectedMasterIdx = Number(idx);
  }

  setPendingColorIdx(idx: number | null) {
    if (idx == null || !Number.isFinite(idx as any)) this.pendingColorIdx = null; else this.pendingColorIdx = Number(idx);
  }

  getEnhancedBackgroundColor(): string {
    try {
      const cfg = getAutoConfig();
      return cfg.enhancedBackgroundColor || '#080808';
    } catch {
      return '#080808';
    }
  }

  async setEnhancedColors(on: boolean) {
    this.enhanced = !!on;
    this.drawMult = this.enhanced ? 1 : 3;
    
    if (this.current) {
      try {
        this.current.scaleMult = this.drawMult;
        await this.current.buildTileSegments({ enhanced: this.enhanced });
      } catch {}
    }
    this.pendingByTile.clear();
    this.pendingByTileColor.clear();
    this.tileCounts.clear();
    this.totalCounts.fill(0);
  }

 
  async drawOnTile(tileBlob: Blob, tileCoords: [number, number]): Promise<Blob> {
    if (!this.enabled || !this.current) return tileBlob;

    const tileKey = `${String(tileCoords[0]).padStart(4, '0')},${String(tileCoords[1]).padStart(4, '0')}`;
    const s = this.current;
    let ignoreWrong = false;
    try {
      const cfg = getAutoConfig();
      ignoreWrong = !!cfg.ignoreWrongColor;
    } catch {}

    const hasTouch = s.tilePrefixes && s.tilePrefixes.has(tileKey);
    if (!hasTouch && !this.enhanced) return tileBlob;
    
    let hasChanges = false; 

    const drawSize = this.tileSize * this.drawMult;
    const baseKey = `${tileCoords[0]},${tileCoords[1]}`;
    const pend = new Set<string>();
    const colMap = new Map<number, Array<[number, number]>>();
    const canvas = new OffscreenCanvas(drawSize, drawSize);
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any);
    if (!ctx) return tileBlob;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, drawSize, drawSize);
    
    const tileBitmap = await createImageBitmap(tileBlob, { colorSpaceConversion: 'none' } as any);
    if (!this.enhanced) {
      ctx.drawImage(tileBitmap, 0, 0, drawSize, drawSize);
    } else {
      
      
      
      const bgColor = this.getEnhancedBackgroundColor();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, drawSize, drawSize);
      if (!hasTouch) {
        
        return await canvas.convertToBlob({ type: 'image/png' });
      }
    }

    
    const tileBuf = new OffscreenCanvas(drawSize, drawSize);
    const tctx = tileBuf.getContext('2d', { willReadFrequently: true } as any);
    if (!tctx) return tileBlob;
    tctx.imageSmoothingEnabled = false;
    tctx.clearRect(0, 0, drawSize, drawSize);
    tctx.drawImage(tileBitmap, 0, 0, drawSize, drawSize);
    

    const matching = Object.keys(s.chunked).filter(k => k.startsWith(tileKey));
    if (matching.length === 0) {
      if (this.enhanced) {
        ctx.fillStyle = 'rgb(8,8,8)';
        ctx.fillRect(0, 0, drawSize, drawSize);
        const emptyBlob = await canvas.convertToBlob({ type: 'image/png' });
        tileBitmap.close();
        return emptyBlob;
      }
      tileBitmap.close();
      return tileBlob;
    }
    let minX = drawSize, minY = drawSize, maxX = 0, maxY = 0;
    for (const key of matching) {
      const seg = s.chunked[key];
      const parts = key.split(',');
      const pxX = Number(parts[2]) || 0;
      const pxY = Number(parts[3]) || 0;
      const sw = (seg as any).width || 0;
      const sh = (seg as any).height || 0;
      const sx = Math.max(0, pxX * this.drawMult);
      const sy = Math.max(0, pxY * this.drawMult);
      const ex = Math.min(drawSize, sx + sw);
      const ey = Math.min(drawSize, sy + sh);
      if (ex > sx && ey > sy) {
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (ex > maxX) maxX = ex;
        if (ey > maxY) maxY = ey;
      }
    }
    let tileRectX = 0, tileRectY = 0, tileRectW = 0, tileRectH = 0;
    let tileRectData: Uint8ClampedArray | null = null;
    const needBaseComparison = !this.enhanced || (this.autoSelectedMasterIdx == null);
    if (needBaseComparison && maxX > minX && maxY > minY) {
      tileRectX = minX | 0; tileRectY = minY | 0; tileRectW = (maxX - minX) | 0; tileRectH = (maxY - minY) | 0;
      const tileRectImg = tctx.getImageData(tileRectX, tileRectY, tileRectW, tileRectH);
      tileRectData = tileRectImg.data;
    }

    const counts = new Uint32Array(MASTER_COLORS.length);
    const pendColorIdx = (this.pendingColorIdx != null) ? this.pendingColorIdx : this.autoSelectedMasterIdx;
    for (const key of matching) {
      const seg = s.chunked[key];
      const parts = key.split(',');
      const pxX = Number(parts[2]) || 0;
      const pxY = Number(parts[3]) || 0;
      if (this.enhanced) {
        
        try {
          const sw = (seg as any).width || 0;
          const sh = (seg as any).height || 0;
          const segCanvas = new OffscreenCanvas(sw, sh);
          const scx = segCanvas.getContext('2d', { willReadFrequently: true } as any);
          if (!scx) { ctx.drawImage(seg, pxX * this.drawMult, pxY * this.drawMult); continue; }
          scx.imageSmoothingEnabled = false;
          scx.clearRect(0, 0, sw, sh);
          scx.drawImage(seg, 0, 0);
          const segImg = scx.getImageData(0, 0, sw, sh);
          const sd = segImg.data;
          
          for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
              const si = (y * sw + x) * 4;
              const a = sd[si + 3];
              if (a < 5) continue;
              const r = sd[si], g = sd[si + 1], b = sd[si + 2];
              const idx = nearestColorIndexFast(r, g, b);
              
              if (this.autoSelectedMasterIdx != null && idx !== this.autoSelectedMasterIdx) {
                sd[si + 3] = 0; 
                continue;
              }
              const mr = MASTER_COLORS[idx].rgb[0];
              const mg = MASTER_COLORS[idx].rgb[1];
              const mb = MASTER_COLORS[idx].rgb[2];
              const ax = pxX * this.drawMult + x;
              const ay = pxY * this.drawMult + y;
              if (ax < 0 || ay < 0 || ax >= drawSize || ay >= drawSize) continue;
              let tr = 0, tg = 0, tb = 0, ta = 0;
              if (tileRectData) {
                const tx = ax - tileRectX;
                const ty = ay - tileRectY;
                if (tx >= 0 && ty >= 0 && tx < tileRectW && ty < tileRectH) {
                  const tsi = (ty * tileRectW + tx) * 4;
                  tr = tileRectData[tsi]; tg = tileRectData[tsi + 1]; tb = tileRectData[tsi + 2]; ta = tileRectData[tsi + 3];
                }
              }
              
              const baseOpaque = (ta >= 5);
              if (ignoreWrong && baseOpaque) {
                sd[si + 3] = 0;
                continue;
              }
              let isBaseMatch = false;
              if (baseOpaque) {
                const tileIdx = nearestColorIndexFast(tr, tg, tb);
                isBaseMatch = (tileIdx === idx);
              }
              if (isBaseMatch) { sd[si + 3] = 0; continue; }
              hasChanges = true;
              if (idx >= 0 && idx < counts.length) counts[idx]++;
              {
                let arr = colMap.get(idx);
                if (!arr) { arr = []; colMap.set(idx, arr); }
                arr.push([ax, ay]);
              }
              if (pendColorIdx == null || idx === pendColorIdx) {
                pend.add(`${ax},${ay}`);
              }
              if (this.autoSelectedMasterIdx != null) {
                
                sd[si] = 0; sd[si + 1] = 0; sd[si + 2] = 240; sd[si + 3] = 255;
              } else {
                
                sd[si] = mr; sd[si + 1] = mg; sd[si + 2] = mb; sd[si + 3] = 255;
              }
            }
          }
          scx.putImageData(segImg, 0, 0);
          ctx.drawImage(segCanvas, pxX * this.drawMult, pxY * this.drawMult);
        } catch {
         
          ctx.drawImage(seg, pxX * this.drawMult, pxY * this.drawMult);
        }
      } else {
        let drawn = false;
        try {
          const sw = (seg as any).width || 0;
          const sh = (seg as any).height || 0;
          const segCanvas = new OffscreenCanvas(sw, sh);
          const scx = segCanvas.getContext('2d', { willReadFrequently: true } as any);
          if (scx) {
            scx.imageSmoothingEnabled = false;
            scx.drawImage(seg as any, 0, 0);
            const segImg = scx.getImageData(0, 0, sw, sh);
            const sd = segImg.data;
            let modified = false;
            for (let y = 0; y < sh; y++) {
              for (let x = 0; x < sw; x++) {
                const si = (y * sw + x) * 4;
                const a = sd[si + 3];
                if (a < 5) continue;
                const r = sd[si], g = sd[si + 1], b = sd[si + 2];
                const idx = nearestColorIndexFast(r, g, b);
                const ax = pxX * this.drawMult + x;
                const ay = pxY * this.drawMult + y;
                if (ax < 0 || ay < 0 || ax >= drawSize || ay >= drawSize) continue;
                let tr = 0, tg = 0, tb = 0, ta = 0;
                if (tileRectData) {
                  const tx = ax - tileRectX;
                  const ty = ay - tileRectY;
                  if (tx >= 0 && ty >= 0 && tx < tileRectW && ty < tileRectH) {
                    const tsi = (ty * tileRectW + tx) * 4;
                    tr = tileRectData[tsi]; tg = tileRectData[tsi + 1]; tb = tileRectData[tsi + 2]; ta = tileRectData[tsi + 3];
                  }
                }
                const baseOpaque = (ta >= 5);
                if (ignoreWrong && baseOpaque) {
                  sd[si + 3] = 0;
                  modified = true;
                  continue;
                }
                let isBaseMatch = false;
                if (baseOpaque) {
                  const tileIdx = nearestColorIndexFast(tr, tg, tb);
                  isBaseMatch = (tileIdx === idx);
                }
                if (isBaseMatch) continue;
                hasChanges = true;
                if (idx >= 0 && idx < counts.length) counts[idx]++;
                {
                  let arr = colMap.get(idx);
                  if (!arr) { arr = []; colMap.set(idx, arr); }
                  arr.push([ax, ay]);
                }
                if (pendColorIdx == null || idx === pendColorIdx) pend.add(`${ax},${ay}`);
              }
            }
            if (modified) scx.putImageData(segImg, 0, 0);
            ctx.drawImage(modified ? segCanvas : seg, pxX * this.drawMult, pxY * this.drawMult);
            drawn = true;
          }
        } catch {}
        if (!drawn) {
          ctx.drawImage(seg, pxX * this.drawMult, pxY * this.drawMult);
        }
      }
    }

    
    this.pendingByTileColor.set(baseKey, colMap);
    const prev = this.tileCounts.get(tileKey);
    if (prev) {
      const len = prev.length;
      for (let i = 0; i < len; i++) {
        const v = prev[i] | 0;
        if (v) {
          const cur = this.totalCounts[i] | 0;
          this.totalCounts[i] = cur > v ? (cur - v) : 0;
        }
      }
    }
    const len2 = counts.length;
    for (let i = 0; i < len2; i++) {
      const v = counts[i] | 0;
      if (v) this.totalCounts[i] = (this.totalCounts[i] | 0) + v;
    }
    this.tileCounts.set(tileKey, counts);
    this.pendingByTile.set(baseKey, pend);

    tileBitmap.close();
    if (!hasChanges && !this.enhanced) return tileBlob;
    return await canvas.convertToBlob({ type: 'image/png' });
  }

  
  getRemainingCountsTotal(): number[] {
    return Array.from(this.totalCounts, (v) => v | 0);
  }

  getPendingForSelectedColor(): Map<string, Array<[number, number]>> {
    const out = new Map<string, Array<[number, number]>>();
    for (const [k, set] of this.pendingByTile) {
      const arr: Array<[number, number]> = [];
      for (const s of set) {
        const parts = s.split(',');
        const x = Number(parts[0]) || 0;
        const y = Number(parts[1]) || 0;
        arr.push([x, y]);
      }
      out.set(k, arr);
    }
    return out;
  }

  getPendingGroupedByColor(): Map<string, Map<number, Array<[number, number]>>> {
    return this.pendingByTileColor;
  }
}


let singleton: stencilManager | null = null;
export function getStencilManager(): stencilManager {
  if (!singleton) singleton = new stencilManager();
  return singleton;
}
