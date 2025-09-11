export type DitherMethod = 'none' | 'ordered4' | 'ordered8' | 'floyd' | 'atkinson' | 'random';
export const DITHER_METHODS: DitherMethod[] = ['none', 'ordered4', 'ordered8', 'floyd', 'atkinson', 'random'];

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
