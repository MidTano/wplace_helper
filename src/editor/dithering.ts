export type DitherMethod =
  | 'none'
  | 'bayer2'
  | 'bayer4'
  | 'bayer8'
  | 'floyd'
  | 'falsefloydsteinberg'
  | 'burkes'
  | 'jarvis'
  | 'stucki'
  | 'sierra'
  | 'twosierra'
  | 'sierralite'
  | 'atkinson'
  | 'random'
  | 'custom';

export const DITHER_METHODS: DitherMethod[] = [
  'none',
  'bayer2',
  'bayer4', 
  'bayer8',
  'floyd',
  'falsefloydsteinberg',
  'burkes',
  'jarvis',
  'stucki',
  'sierra',
  'twosierra',
  'sierralite',
  'atkinson',
  'random',
  'custom',
];

export type DitherOptions = {
  strength?: number;
  palette?: number[][];
  serpentine?: boolean; 
};

const DEFAULT_STRENGTH = 0.5;
const ORDERED_METHODS = new Set<DitherMethod>(['bayer2', 'bayer4', 'bayer8', 'custom', 'random']);
const ERROR_DIFFUSION_METHODS = new Set<DitherMethod>([
  'floyd',
  'falsefloydsteinberg',
  'burkes',
  'jarvis',
  'stucki',
  'sierra',
  'twosierra',
  'sierralite',
  'atkinson',
]);


const GAMMA = 2.2;
const INV_GAMMA = 1.0 / GAMMA;


function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}


function srgbToLinear(srgb: number): number {
  const normalized = srgb / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, GAMMA);
}

function linearToSrgb(linear: number): number {
  const clamped = clamp01(linear);
  const srgb = clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * Math.pow(clamped, INV_GAMMA) - 0.055;
  return clampByte(srgb * 255);
}


function quantizeToLevels(linearValue: number, levels: number): number {
  if (levels <= 1) return 0;
  const step = 1.0 / (levels - 1);
  const quantized = Math.round(linearValue / step) * step;
  return clamp01(quantized);
}


function quantizeToPalette(r: number, g: number, b: number, palette: number[][]): [number, number, number] {
  const linearR = srgbToLinear(r);
  const linearG = srgbToLinear(g);
  const linearB = srgbToLinear(b);
  
  let bestDist = Infinity;
  let bestColor = palette[0] || [0, 0, 0];
  
  for (const color of palette) {
    const paletteR = srgbToLinear(color[0]);
    const paletteG = srgbToLinear(color[1]);
    const paletteB = srgbToLinear(color[2]);
    
    const dr = linearR - paletteR;
    const dg = linearG - paletteG;
    const db = linearB - paletteB;
    
    
    const dist = 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db;
    
    if (dist < bestDist) {
      bestDist = dist;
      bestColor = color;
    }
  }
  
  return [bestColor[0], bestColor[1], bestColor[2]];
}



function ditherErrorDiffusion(
  img: ImageData,
  palette: number[][],
  kernel: {dx: number, dy: number, weight: number}[],
  divisor: number,
  serpentine: boolean = true
): ImageData {
  const { width, height, data } = img;
  
  for (let y = 0; y < height; y++) {
    const leftToRight = serpentine ? (y % 2 === 0) : true;
    const xStart = leftToRight ? 0 : width - 1;
    const xEnd = leftToRight ? width : -1;
    const xStep = leftToRight ? 1 : -1;
    
    for (let x = xStart; x !== xEnd; x += xStep) {
      const i = (y * width + x) * 4;
      
      const oldR = data[i];
      const oldG = data[i + 1];
      const oldB = data[i + 2];
      
      
      const [newR, newG, newB] = quantizeToPalette(oldR, oldG, oldB, palette);
      
      
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;
      
      
      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
      
      
      for (const { dx, dy, weight } of kernel) {
        const newX = x + (leftToRight ? dx : -dx);
        const newY = y + dy;
        
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          const j = (newY * width + newX) * 4;
          const factor = weight / divisor;
          
          data[j] = clampByte(data[j] + errR * factor);
          data[j + 1] = clampByte(data[j + 1] + errG * factor);
          data[j + 2] = clampByte(data[j + 2] + errB * factor);
        }
      }
    }
  }
  
  return img;
}


const BAYER_2X2 = [
  [0, 2],
  [3, 1]
];

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];


let normalizedBayer2: number[][] | null = null;
let normalizedBayer4: number[][] | null = null;
let normalizedBayer8: number[][] | null = null;

function getNormalizedBayerMatrix(size: 2 | 4 | 8): number[][] {
  if (size === 2) {
    if (!normalizedBayer2) {
      normalizedBayer2 = BAYER_2X2.map(row => 
        row.map(val => val / 4) 
      );
    }
    return normalizedBayer2;
  }
  
  if (size === 4) {
    if (!normalizedBayer4) {
      normalizedBayer4 = BAYER_4X4.map(row => 
        row.map(val => val / 16) 
      );
    }
    return normalizedBayer4;
  }
  
  if (size === 8) {
    if (!normalizedBayer8) {
      normalizedBayer8 = BAYER_8X8.map(row => 
        row.map(val => val / 64) 
      );
    }
    return normalizedBayer8;
  }
  
  throw new Error(`Неподдерживаемый размер Bayer матрицы: ${size}`);
}

let CUSTOM_MATRIX: number[][] = BAYER_8X8.map(row => row.slice());
let customMatrixNormalized: number[][] | null = null;

function getNormalizedCustomMatrix(): number[][] {
  if (!customMatrixNormalized) {
    const size = CUSTOM_MATRIX.length;
    const divisor = size * size;
    customMatrixNormalized = CUSTOM_MATRIX.map(row => 
      row.map(val => val / divisor)
    );
  }
  return customMatrixNormalized;
}

export function setCustomDitherMatrix(matrix: number[][]): void {
  if (!Array.isArray(matrix) || matrix.length === 0) return;
  if (!matrix.every(row => Array.isArray(row) && row.length === matrix[0].length)) return;
  
  CUSTOM_MATRIX = matrix.map(row => row.slice());
  customMatrixNormalized = null; 
}

export function setCustomDitherPatternBinary(pattern: number[][], strength: number = 1): void {
  if (!Array.isArray(pattern) || pattern.length !== 8) return;
  if (!pattern.every(row => Array.isArray(row) && row.length === 8)) return;
  
  const clampedStrength = clamp01(strength);
  const size = 8;
  const maxValue = size * size - 1;
  
  
  const matrix: number[][] = [];
  let counter = 0;
  
  for (let y = 0; y < size; y++) {
    matrix[y] = [];
    for (let x = 0; x < size; x++) {
      
      const threshold = clampedStrength * maxValue;
      matrix[y][x] = pattern[y][x] ? Math.floor(threshold) : Math.ceil(maxValue - threshold);
      counter++;
    }
  }
  
  setCustomDitherMatrix(matrix);
}


function ditherOrdered(
  img: ImageData,
  levels: number,
  normalizedMatrix: number[][],
  palette?: number[][]
): ImageData {
  const { width, height, data } = img;
  const matrixHeight = normalizedMatrix.length;
  const matrixWidth = normalizedMatrix[0].length;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      
      const threshold = normalizedMatrix[y % matrixHeight][x % matrixWidth];
      
      if (palette) {
        
        const [newR, newG, newB] = quantizeToPalette(r, g, b, palette);
        
        
        const shouldDither = (r !== newR || g !== newG || b !== newB);
        
        if (shouldDither) {
          
          const rNorm = srgbToLinear(r);
          const gNorm = srgbToLinear(g);
          const bNorm = srgbToLinear(b);
          
          const brightness = 0.299 * rNorm + 0.587 * gNorm + 0.114 * bNorm;
          
          if (brightness > threshold) {
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
          } else {
            
            const darkerColor = findDarkerColor([r, g, b], palette);
            data[i] = darkerColor[0];
            data[i + 1] = darkerColor[1];
            data[i + 2] = darkerColor[2];
          }
        } else {
          data[i] = newR;
          data[i + 1] = newG;
          data[i + 2] = newB;
        }
      } else {
        
        for (let c = 0; c < 3; c++) {
          const originalValue = data[i + c];
          const linearValue = srgbToLinear(originalValue);
          
          
          const step = 1.0 / (levels - 1);
          const lowerLevel = Math.floor(linearValue / step) * step;
          const upperLevel = Math.min(1.0, lowerLevel + step);
          
          
          const finalValue = linearValue > threshold ? upperLevel : lowerLevel;
          
          data[i + c] = linearToSrgb(clamp01(finalValue));
        }
      }
    }
  }
  
  return img;
}


function findDarkerColor(originalColor: number[], palette: number[][]): number[] {
  const [r, g, b] = originalColor;
  const originalBrightness = 0.299 * srgbToLinear(r) + 0.587 * srgbToLinear(g) + 0.114 * srgbToLinear(b);
  
  let bestColor = palette[0];
  let bestBrightness = Infinity;
  
  for (const color of palette) {
    const brightness = 0.299 * srgbToLinear(color[0]) + 0.587 * srgbToLinear(color[1]) + 0.114 * srgbToLinear(color[2]);
    if (brightness <= originalBrightness && brightness < bestBrightness) {
      bestColor = color;
      bestBrightness = brightness;
    }
  }
  
  return bestColor;
}


function ditherRandom(img: ImageData, strength: number, palette?: number[][]): ImageData {
  const { width, height, data } = img;
  const normalizedStrength = clamp01(strength);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (palette) {
        
        const noise = (Math.random() - 0.5) * normalizedStrength * 128;
        
        const noisyR = clampByte(r + noise);
        const noisyG = clampByte(g + noise);
        const noisyB = clampByte(b + noise);
        
        const [newR, newG, newB] = quantizeToPalette(noisyR, noisyG, noisyB, palette);
        
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
      } else {
        
        const levels = Math.max(2, Math.floor(2 + normalizedStrength * 6));
        
        for (let c = 0; c < 3; c++) {
          const originalValue = data[i + c];
          const noise = (Math.random() - 0.5) * normalizedStrength * 64;
          const noisyValue = clampByte(originalValue + noise);
          const linearValue = srgbToLinear(noisyValue);
          const quantized = quantizeToLevels(linearValue, levels);
          
          data[i + c] = linearToSrgb(quantized);
        }
      }
    }
  }
  
  return img;
}

function normalizeStrength(strength?: number): number {
  if (typeof strength !== 'number' || !Number.isFinite(strength)) return DEFAULT_STRENGTH;
  return clamp01(strength);
}

function strengthToLevels(strength: number): number {
  return Math.max(2, Math.min(10, 2 + Math.round(strength * 8)));
}


function applyOrderedDither(img: ImageData, method: DitherMethod, strength: number, palette?: number[][]): ImageData {
  const normalized = normalizeStrength(strength);
  const levels = strengthToLevels(normalized);
  
  switch (method) {
    case 'bayer2':
      return ditherOrdered(img, levels, getNormalizedBayerMatrix(2), palette);
    case 'bayer4':
      return ditherOrdered(img, levels, getNormalizedBayerMatrix(4), palette);
    case 'bayer8':
      return ditherOrdered(img, levels, getNormalizedBayerMatrix(8), palette);
    case 'custom':
      return ditherOrdered(img, levels, getNormalizedCustomMatrix(), palette);
    case 'random':
      return ditherRandom(img, normalized, palette);
    default:
      return img;
  }
}


function ensurePalette(method: DitherMethod, palette?: number[][]): number[][] {
  if (!palette || palette.length === 0) {
    throw new Error(`Palette is required for dithering method "${method}"`);
  }
  return palette;
}


function applyErrorDiffusion(img: ImageData, method: DitherMethod, palette: number[][], serpentine: boolean = true): ImageData {
  const kernels = {
    floyd: {
      kernel: [
        { dx: 1, dy: 0, weight: 7 },
        { dx: -1, dy: 1, weight: 3 },
        { dx: 0, dy: 1, weight: 5 },
        { dx: 1, dy: 1, weight: 1 }
      ],
      divisor: 16
    },
    falsefloydsteinberg: {
      kernel: [
        { dx: 1, dy: 0, weight: 3 },
        { dx: 0, dy: 1, weight: 3 },
        { dx: 1, dy: 1, weight: 2 }
      ],
      divisor: 8
    },
    jarvis: {
      kernel: [
        { dx: 1, dy: 0, weight: 7 }, { dx: 2, dy: 0, weight: 5 },
        { dx: -2, dy: 1, weight: 3 }, { dx: -1, dy: 1, weight: 5 }, { dx: 0, dy: 1, weight: 7 }, { dx: 1, dy: 1, weight: 5 }, { dx: 2, dy: 1, weight: 3 },
        { dx: -2, dy: 2, weight: 1 }, { dx: -1, dy: 2, weight: 3 }, { dx: 0, dy: 2, weight: 5 }, { dx: 1, dy: 2, weight: 3 }, { dx: 2, dy: 2, weight: 1 }
      ],
      divisor: 48
    },
    stucki: {
      kernel: [
        { dx: 1, dy: 0, weight: 8 }, { dx: 2, dy: 0, weight: 4 },
        { dx: -2, dy: 1, weight: 2 }, { dx: -1, dy: 1, weight: 4 }, { dx: 0, dy: 1, weight: 8 }, { dx: 1, dy: 1, weight: 4 }, { dx: 2, dy: 1, weight: 2 },
        { dx: -2, dy: 2, weight: 1 }, { dx: -1, dy: 2, weight: 2 }, { dx: 0, dy: 2, weight: 4 }, { dx: 1, dy: 2, weight: 2 }, { dx: 2, dy: 2, weight: 1 }
      ],
      divisor: 42
    },
    sierra: {
      kernel: [
        { dx: 1, dy: 0, weight: 5 }, { dx: 2, dy: 0, weight: 3 },
        { dx: -2, dy: 1, weight: 2 }, { dx: -1, dy: 1, weight: 4 }, { dx: 0, dy: 1, weight: 5 }, { dx: 1, dy: 1, weight: 4 }, { dx: 2, dy: 1, weight: 2 },
        { dx: -1, dy: 2, weight: 2 }, { dx: 0, dy: 2, weight: 3 }, { dx: 1, dy: 2, weight: 2 }
      ],
      divisor: 32
    },
    twosierra: {
      kernel: [
        { dx: 1, dy: 0, weight: 4 }, { dx: 2, dy: 0, weight: 3 },
        { dx: -2, dy: 1, weight: 1 }, { dx: -1, dy: 1, weight: 2 }, { dx: 0, dy: 1, weight: 3 }, { dx: 1, dy: 1, weight: 2 }, { dx: 2, dy: 1, weight: 1 }
      ],
      divisor: 16
    },
    sierralite: {
      kernel: [
        { dx: 1, dy: 0, weight: 2 },
        { dx: 0, dy: 1, weight: 1 }, { dx: 1, dy: 1, weight: 1 }
      ],
      divisor: 4
    },
    burkes: {
      kernel: [
        { dx: 1, dy: 0, weight: 8 }, { dx: 2, dy: 0, weight: 4 },
        { dx: -2, dy: 1, weight: 2 }, { dx: -1, dy: 1, weight: 4 }, { dx: 0, dy: 1, weight: 8 }, { dx: 1, dy: 1, weight: 4 }, { dx: 2, dy: 1, weight: 2 }
      ],
      divisor: 32
    },
    atkinson: {
      kernel: [
        { dx: 1, dy: 0, weight: 1 }, { dx: 2, dy: 0, weight: 1 },
        { dx: -1, dy: 1, weight: 1 }, { dx: 0, dy: 1, weight: 1 }, { dx: 1, dy: 1, weight: 1 },
        { dx: 0, dy: 2, weight: 1 }
      ],
      divisor: 8 
    }
  };
  
  const config = kernels[method as keyof typeof kernels];
  if (!config) {
    return img;
  }
  
  return ditherErrorDiffusion(img, palette, config.kernel, config.divisor, serpentine);
}


function imageDataToCanvas(img: ImageData): OffscreenCanvas {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Не удалось получить 2D контекст');
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}


export function methodSupportsStrength(method: DitherMethod): boolean {
  return ORDERED_METHODS.has(method) || ERROR_DIFFUSION_METHODS.has(method);
}


export function applyDither(canvas: OffscreenCanvas, method: DitherMethod, options: DitherOptions = {}): OffscreenCanvas {
  if (method === 'none') return canvas;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let processedImg: ImageData;

  try {
    if (ORDERED_METHODS.has(method)) {
      
      const strength = normalizeStrength(options.strength);
      processedImg = applyOrderedDither(img, method, strength, options.palette);
      
    } else if (ERROR_DIFFUSION_METHODS.has(method)) {
      
      const palette = ensurePalette(method, options.palette);
      const serpentine = options.serpentine !== false; 
      processedImg = applyErrorDiffusion(img, method, palette, serpentine);
      
    } else {
      console.warn(`[Неизвестный метод дитеринга: ${method}`);
      return canvas;
    }
    
    return imageDataToCanvas(processedImg);
    
  } catch (error) {
    console.error('Ошибка при применении дитеринга:', error);
    return canvas;
  }
}
