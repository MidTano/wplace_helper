import stencil, { type StencilCoords } from './stencil';
import { MASTER_COLORS } from '../editor/palette';

export default class stencilManager {
  tileSize = 1000;
  drawMult = 5;
  enabled = true;
  enhanced = false; 
  current: stencil | null = null;
  private pendingByTile: Map<string, Set<string>> = new Map();
  pendingColorIdx: number | null = null;
  private pendingByTileColor: Map<string, Map<number, Array<[number, number]>>> = new Map();
  
  
  autoSelectedMasterIdx: number | null = null;
  
  private tileCounts: Map<string, Uint32Array> = new Map();

  setEnabled(v: boolean) { this.enabled = !!v; }

  async create(file: Blob, coords: StencilCoords) {
    const s = new stencil({ file, coords, sortID: 0, displayName: 'Stencil', tileSize: this.tileSize, scaleMult: this.drawMult });
    await s.buildTileSegments({ enhanced: this.enhanced });
    this.current = s;
  }

  clear() { this.current = null; }

  setAutoSelectedMasterIdx(idx: number | null) {
    if (idx == null || !Number.isFinite(idx as any)) this.autoSelectedMasterIdx = null; else this.autoSelectedMasterIdx = Number(idx);
  }

  setPendingColorIdx(idx: number | null) {
    if (idx == null || !Number.isFinite(idx as any)) this.pendingColorIdx = null; else this.pendingColorIdx = Number(idx);
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
  }

 
  async drawOnTile(tileBlob: Blob, tileCoords: [number, number]): Promise<Blob> {
    if (!this.enabled || !this.current) return tileBlob;

    const tileKey = `${String(tileCoords[0]).padStart(4, '0')},${String(tileCoords[1]).padStart(4, '0')}`;
    const s = this.current;

    const hasTouch = s.tilePrefixes && s.tilePrefixes.has(tileKey);
    if (!hasTouch && !this.enhanced) return tileBlob; 

    const drawSize = this.tileSize * this.drawMult;
    const baseKey = `${tileCoords[0]},${tileCoords[1]}`;
    const pend = new Set<string>();
    const colMap = new Map<number, Array<[number, number]>>();
    const canvas = new OffscreenCanvas(drawSize, drawSize);
    const ctx = canvas.getContext('2d');
    if (!ctx) return tileBlob;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, drawSize, drawSize);
    
    const tileBitmap = await createImageBitmap(tileBlob);
    if (!this.enhanced) {
      ctx.drawImage(tileBitmap, 0, 0, drawSize, drawSize);
    } else {
      
      
      
      ctx.fillStyle = 'rgb(8,8,8)';
      ctx.fillRect(0, 0, drawSize, drawSize);
      if (!hasTouch) {
        
        return await canvas.convertToBlob({ type: 'image/png' });
      }
    }

    
    const tileBuf = new OffscreenCanvas(drawSize, drawSize);
    const tctx = tileBuf.getContext('2d');
    if (!tctx) return tileBlob;
    tctx.imageSmoothingEnabled = false;
    tctx.clearRect(0, 0, drawSize, drawSize);
    tctx.drawImage(tileBitmap, 0, 0, drawSize, drawSize);
    const tileImg = tctx.getImageData(0, 0, drawSize, drawSize);
    const tileData = tileImg.data;

    const matching = Object.keys(s.chunked).filter(k => k.startsWith(tileKey));
    
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
          const scx = segCanvas.getContext('2d');
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
              
              let idx = 0; let bestD = Infinity;
              for (let p = 0; p < MASTER_COLORS.length; p++) {
                const mr0 = MASTER_COLORS[p].rgb[0];
                const mg0 = MASTER_COLORS[p].rgb[1];
                const mb0 = MASTER_COLORS[p].rgb[2];
                const dr = r - mr0, dg = g - mg0, db = b - mb0;
                const d = dr*dr + dg*dg + db*db;
                if (d < bestD) { bestD = d; idx = p; }
              }
              
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
              const ti = (ay * drawSize + ax) * 4;
              const tr = tileData[ti], tg = tileData[ti + 1], tb = tileData[ti + 2], ta = tileData[ti + 3];
              
              const baseOpaque = (ta >= 5);
              let isBaseMatch = baseOpaque && (tr === mr && tg === mg && tb === mb);
              
              const isBlack = (mr === 0 && mg === 0 && mb === 0);
              if (isBlack) {
                isBaseMatch = baseOpaque && (tr === 0 && tg === 0 && tb === 0);
              }
              if (isBaseMatch) { sd[si + 3] = 0; continue; }
              
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
        ctx.drawImage(seg, pxX * this.drawMult, pxY * this.drawMult);
        try {
          const sw = (seg as any).width || 0;
          const sh = (seg as any).height || 0;
          const segCanvas = new OffscreenCanvas(sw, sh);
          const scx = segCanvas.getContext('2d');
          if (scx) {
            scx.imageSmoothingEnabled = false;
            scx.clearRect(0, 0, sw, sh);
            scx.drawImage(seg as any, 0, 0);
            const segImg = scx.getImageData(0, 0, sw, sh);
            const sd = segImg.data;
            for (let y = 0; y < sh; y++) {
              for (let x = 0; x < sw; x++) {
                const si = (y * sw + x) * 4;
                const a = sd[si + 3];
                if (a < 5) continue;
                const r = sd[si], g = sd[si + 1], b = sd[si + 2];
                let idx = 0; let bestD = Infinity;
                for (let p = 0; p < MASTER_COLORS.length; p++) {
                  const mr0 = MASTER_COLORS[p].rgb[0];
                  const mg0 = MASTER_COLORS[p].rgb[1];
                  const mb0 = MASTER_COLORS[p].rgb[2];
                  const dr = r - mr0, dg = g - mg0, db = b - mb0;
                  const d = dr*dr + dg*dg + db*db;
                  if (d < bestD) { bestD = d; idx = p; }
                }
                const mr = MASTER_COLORS[idx].rgb[0];
                const mg = MASTER_COLORS[idx].rgb[1];
                const mb = MASTER_COLORS[idx].rgb[2];
                const ax = pxX * this.drawMult + x;
                const ay = pxY * this.drawMult + y;
                if (ax < 0 || ay < 0 || ax >= drawSize || ay >= drawSize) continue;
                const ti = (ay * drawSize + ax) * 4;
                const tr = tileData[ti], tg = tileData[ti + 1], tb = tileData[ti + 2], ta = tileData[ti + 3];
                const baseOpaque = (ta >= 5);
                let isBaseMatch = baseOpaque && (tr === mr && tg === mg && tb === mb);
                const isBlack = (mr === 0 && mg === 0 && mb === 0);
                if (isBlack) {
                  isBaseMatch = baseOpaque && (tr === 0 && tg === 0 && tb === 0);
                }
                if (isBaseMatch) continue;
                if (idx >= 0 && idx < counts.length) counts[idx]++;
                {
                  let arr = colMap.get(idx);
                  if (!arr) { arr = []; colMap.set(idx, arr); }
                  arr.push([ax, ay]);
                }
                if (pendColorIdx == null || idx === pendColorIdx) {
                  pend.add(`${ax},${ay}`);
                }
              }
            }
          }
        } catch {}
      }
    }

    
    this.pendingByTileColor.set(baseKey, colMap);
    this.tileCounts.set(tileKey, counts);
    this.pendingByTile.set(baseKey, pend);

    return await canvas.convertToBlob({ type: 'image/png' });
  }

  
  getRemainingCountsTotal(): number[] {
    const out = new Array(MASTER_COLORS.length).fill(0) as number[];
    for (const arr of this.tileCounts.values()) {
      for (let i = 0; i < arr.length; i++) out[i] += arr[i] | 0;
    }
    return out;
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
