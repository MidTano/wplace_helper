export type ResampleMethod = 'nearest' | 'bilinear' | 'box' | 'median' | 'dominant';
export const RESAMPLE_METHODS: ResampleMethod[] = ['nearest', 'bilinear', 'box', 'median', 'dominant'];

function drawWithSmoothing(src: ImageBitmap, dstW: number, dstH: number, smooth: boolean): OffscreenCanvas {
  const c = new OffscreenCanvas(dstW, dstH);
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingEnabled = smooth;
  cx.clearRect(0, 0, dstW, dstH);
  cx.drawImage(src, 0, 0, dstW, dstH);
  return c;
}

function getSrcImageData(src: ImageBitmap): { data: Uint8ClampedArray; w: number; h: number } {
  const c = new OffscreenCanvas(src.width, src.height);
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingEnabled = false;
  cx.clearRect(0, 0, src.width, src.height);
  cx.drawImage(src, 0, 0);
  const img = cx.getImageData(0, 0, src.width, src.height);
  return { data: img.data, w: src.width, h: src.height };
}

function putDstImageData(dstW: number, dstH: number, data: Uint8ClampedArray): OffscreenCanvas {
  const c = new OffscreenCanvas(dstW, dstH);
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  const out = new ImageData(data, dstW, dstH);
  cx.putImageData(out, 0, 0);
  return c;
}

function clamp255(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

function resampleNearest(src: ImageBitmap, dstW: number, dstH: number): OffscreenCanvas {
  return drawWithSmoothing(src, dstW, dstH, false);
}

function resampleBilinear(src: ImageBitmap, dstW: number, dstH: number): OffscreenCanvas {
  
  return drawWithSmoothing(src, dstW, dstH, true);
}


function resampleBox(src: ImageBitmap, dstW: number, dstH: number, factor: number): OffscreenCanvas {
  const { data: sdata, w: sw, h: sh } = getSrcImageData(src);
  const ddata = new Uint8ClampedArray(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    const sy0 = y * factor;
    const sy1 = Math.min(sh, sy0 + factor);
    for (let x = 0; x < dstW; x++) {
      const sx0 = x * factor;
      const sx1 = Math.min(sw, sx0 + factor);
      let r = 0, g = 0, b = 0, a = 0, cnt = 0;
      for (let yy = sy0; yy < sy1; yy++) {
        let p = (yy * sw + sx0) * 4;
        for (let xx = sx0; xx < sx1; xx++) {
          r += sdata[p];
          g += sdata[p + 1];
          b += sdata[p + 2];
          a += sdata[p + 3];
          cnt++;
          p += 4;
        }
      }
      const q = (y * dstW + x) * 4;
      ddata[q] = clamp255(r / cnt);
      ddata[q + 1] = clamp255(g / cnt);
      ddata[q + 2] = clamp255(b / cnt);
      ddata[q + 3] = clamp255(a / cnt);
    }
  }
  return putDstImageData(dstW, dstH, ddata);
}

function resampleMedian(src: ImageBitmap, dstW: number, dstH: number, factor: number): OffscreenCanvas {
  
  const { data: sdata, w: sw, h: sh } = getSrcImageData(src);
  const ddata = new Uint8ClampedArray(dstW * dstH * 4);
  const rHist = new Uint32Array(16);
  const gHist = new Uint32Array(16);
  const bHist = new Uint32Array(16);
  const aHist = new Uint32Array(16);
  const binToByte = (bin: number) => (bin * 17) | 0; 
  for (let y = 0; y < dstH; y++) {
    const sy0 = y * factor;
    const sy1 = Math.min(sh, sy0 + factor);
    for (let x = 0; x < dstW; x++) {
      rHist.fill(0); gHist.fill(0); bHist.fill(0); aHist.fill(0);
      const sx0 = x * factor;
      const sx1 = Math.min(sw, sx0 + factor);
      for (let yy = sy0; yy < sy1; yy++) {
        let p = (yy * sw + sx0) * 4;
        for (let xx = sx0; xx < sx1; xx++) {
          rHist[sdata[p] >> 4]++;
          gHist[sdata[p + 1] >> 4]++;
          bHist[sdata[p + 2] >> 4]++;
          aHist[sdata[p + 3] >> 4]++;
          p += 4;
        }
      }
      const half = ((sx1 - sx0) * (sy1 - sy0)) >> 1;
      function medianFrom(hist: Uint32Array): number {
        let acc = 0;
        for (let i = 0; i < 16; i++) { acc += hist[i]; if (acc > half) return binToByte(i); }
        return binToByte(15);
      }
      const q = (y * dstW + x) * 4;
      ddata[q] = medianFrom(rHist);
      ddata[q + 1] = medianFrom(gHist);
      ddata[q + 2] = medianFrom(bHist);
      ddata[q + 3] = medianFrom(aHist);
    }
  }
  return putDstImageData(dstW, dstH, ddata);
}

function resampleDominant(src: ImageBitmap, dstW: number, dstH: number, factor: number): OffscreenCanvas {
  
  const { data: sdata, w: sw, h: sh } = getSrcImageData(src);
  const ddata = new Uint8ClampedArray(dstW * dstH * 4);
  const counts = new Uint32Array(4096); 
  for (let y = 0; y < dstH; y++) {
    const sy0 = y * factor;
    const sy1 = Math.min(sh, sy0 + factor);
    for (let x = 0; x < dstW; x++) {
      counts.fill(0);
      const sx0 = x * factor;
      const sx1 = Math.min(sw, sx0 + factor);
      let bestIdx = 0, bestCount = -1;
      for (let yy = sy0; yy < sy1; yy++) {
        let p = (yy * sw + sx0) * 4;
        for (let xx = sx0; xx < sx1; xx++) {
          const r = sdata[p] >> 4;
          const g = sdata[p + 1] >> 4;
          const b = sdata[p + 2] >> 4;
          const idx = (r << 8) | (g << 4) | b;
          const c = (counts[idx] = (counts[idx] + 1) >>> 0);
          if (c > bestCount) { bestCount = c; bestIdx = idx; }
          p += 4;
        }
      }
      const r = ((bestIdx >> 8) & 0xF) * 17;
      const g = ((bestIdx >> 4) & 0xF) * 17;
      const b = (bestIdx & 0xF) * 17;
      const q = (y * dstW + x) * 4;
      ddata[q] = r; ddata[q + 1] = g; ddata[q + 2] = b; ddata[q + 3] = 255;
    }
  }
  return putDstImageData(dstW, dstH, ddata);
}

export function resampleBitmapToCanvas(src: ImageBitmap, factor: number, method: ResampleMethod): OffscreenCanvas {
  const f = Math.max(1, Number(factor) || 1);
  const dstW = Math.max(1, Math.floor(src.width / f));
  const dstH = Math.max(1, Math.floor(src.height / f));
  const isInteger = Math.abs(f - Math.round(f)) < 1e-6;
  let canvas: OffscreenCanvas;
  if (!isInteger) {
    switch (method) {
      case 'bilinear':
        canvas = resampleBilinear(src, dstW, dstH); break;
      default:
        canvas = resampleNearest(src, dstW, dstH); break;
    }
    return canvas;
  }
  const intF = Math.max(1, Math.round(f));
  switch (method) {
    case 'nearest':
      canvas = resampleNearest(src, dstW, dstH); break;
    case 'bilinear':
      canvas = resampleBilinear(src, dstW, dstH); break;
    case 'box':
      canvas = resampleBox(src, dstW, dstH, intF); break;
    case 'median':
      canvas = resampleMedian(src, dstW, dstH, intF); break;
    case 'dominant':
      canvas = resampleDominant(src, dstW, dstH, intF); break;
    default:
      canvas = resampleNearest(src, dstW, dstH); break;
  }
  return canvas;
}

export async function resampleBitmapToBlob(src: ImageBitmap, factor: number, method: ResampleMethod): Promise<Blob> {
  const canvas = resampleBitmapToCanvas(src, factor, method);
  return await canvas.convertToBlob({ type: 'image/png' });
}
