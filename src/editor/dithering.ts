export type DitherMethod = 'none' | 'ordered4' | 'ordered8' | 'floyd' | 'atkinson' | 'random' | 'custom';
export const DITHER_METHODS: DitherMethod[] = ['none', 'ordered4', 'ordered8', 'floyd', 'atkinson', 'random', 'custom'];

function canvasToImageData(c: OffscreenCanvas): ImageData {
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  return cx.getImageData(0, 0, c.width, c.height);
}

function putImageDataToCanvas(img: ImageData): OffscreenCanvas {
  const c = new OffscreenCanvas(img.width, img.height);
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.putImageData(img, 0, 0);
  return c;
}

function clampByte(v: number) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

function quantizeChannel(v: number, levels: number): number {
  
  if (levels <= 1) return 0;
  const step = 255 / (levels - 1);
  return Math.round(v / step) * step;
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER8 = (() => {
  
  const base = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  return base;
})();


let CUSTOM8: number[][] = BAYER8.map(row => row.slice());


export function setCustomDitherMatrix(m: number[][]): void {
  try {
    if (!Array.isArray(m) || m.length !== 8 || m.some(r => !Array.isArray(r) || r.length !== 8)) return;
    
    const mm = m.map(r => r.slice());
    CUSTOM8 = mm;
  } catch {}
}


export function setCustomDitherPatternBinary(p: number[][], strength: number = 1): void {
  try {
    if (!Array.isArray(p) || p.length !== 8 || p.some(r => !Array.isArray(r) || r.length !== 8)) return;
    
    let minX = 8, minY = 8, maxX = -1, maxY = -1;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (p[y][x]) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
      }
    }
    let tw = 1, th = 1;
    if (maxX >= minX && maxY >= minY) { tw = (maxX - minX + 1) | 0; th = (maxY - minY + 1) | 0; }
    
    const tile: number[][] = Array.from({ length: th }, (_, yy) => Array.from({ length: tw }, (_, xx) => {
      if (maxX < minX || maxY < minY) return 0; 
      return p[minY + yy][minX + xx] ? 1 : 0;
    }));
    
    const a = Math.max(0, Math.min(1, strength));
    const denom = tw * th;
    const low = Math.floor((denom - 1) * (0.5 - 0.5 * a));
    const high = Math.floor((denom - 1) * (0.5 + 0.5 * a));
    const out: number[][] = Array.from({ length: th }, () => Array(tw).fill(0));
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) out[y][x] = tile[y][x] ? high : low;
    }
    CUSTOM8 = out; 
  } catch {}
}

function ditherOrdered(img: ImageData, levels: number, matrix: number[][]): ImageData {
  const w = img.width, h = img.height;
  const data = img.data;
  const mw = matrix[0].length, mh = matrix.length;
  const denom = mw * mh; 
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const t = (matrix[y % mh][x % mw] + 0.5) / denom; 
      for (let c = 0; c < 3; c++) {
        const v = data[i + c] / 255;
        const lv = Math.floor(v * (levels - 1));
        const frac = v * (levels - 1) - lv;
        const up = (frac >= t) ? lv + 1 : lv;
        const out = clampByte((up / (levels - 1)) * 255);
        data[i + c] = out;
      }
      
    }
  }
  return img;
}

function ditherErrorDiffusion(img: ImageData, levels: number, kernel: {dx:number,dy:number,w:number}[], div: number): ImageData {
  const w = img.width, h = img.height;
  const data = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const oldR = data[i], oldG = data[i+1], oldB = data[i+2];
      const newR = quantizeChannel(oldR, levels);
      const newG = quantizeChannel(oldG, levels);
      const newB = quantizeChannel(oldB, levels);
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;
      data[i] = newR; data[i+1] = newG; data[i+2] = newB;
      for (const k of kernel) {
        const xx = x + k.dx, yy = y + k.dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = (yy * w + xx) * 4;
        data[j]   = clampByte(data[j]   + (errR * k.w) / div);
        data[j+1] = clampByte(data[j+1] + (errG * k.w) / div);
        data[j+2] = clampByte(data[j+2] + (errB * k.w) / div);
      }
    }
  }
  return img;
}

export function applyDitherToCanvas(canvas: OffscreenCanvas, levels: number, method: DitherMethod): OffscreenCanvas {
  if (method === 'none') return canvas;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  let img = cx.getImageData(0, 0, canvas.width, canvas.height);
  switch (method) {
    case 'ordered4':
      img = ditherOrdered(img, levels, BAYER4); break;
    case 'ordered8':
      img = ditherOrdered(img, levels, BAYER8); break;
    case 'custom':
      img = ditherOrdered(img, levels, CUSTOM8); break;
    case 'floyd':
      img = ditherErrorDiffusion(img, levels, [
        {dx: 1, dy: 0, w: 7},
        {dx:-1, dy: 1, w: 3}, {dx: 0, dy: 1, w: 5}, {dx: 1, dy: 1, w: 1}
      ], 16); break;
    case 'atkinson':
      img = ditherErrorDiffusion(img, levels, [
        {dx: 1, dy: 0, w: 1}, {dx: 2, dy: 0, w: 1},
        {dx:-1, dy: 1, w: 1}, {dx: 0, dy: 1, w: 1}, {dx: 1, dy: 1, w: 1},
        {dx: 0, dy: 2, w: 1}
      ], 8); break;
    case 'random':
      
      const w = canvas.width, h = canvas.height;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const t = Math.random();
          for (let c = 0; c < 3; c++) {
            const v = img.data[i + c] / 255;
            const lv = Math.floor(v * (levels - 1));
            const frac = v * (levels - 1) - lv;
            const up = (frac >= t) ? lv + 1 : lv;
            img.data[i + c] = clampByte((up / (levels - 1)) * 255);
          }
        }
      }
      break;
  }
  return putImageDataToCanvas(img);
}
