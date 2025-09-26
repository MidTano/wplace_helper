import { resampleBitmapToBlob, resampleBitmapToCanvas, type ResampleMethod } from './resamplers';
import { applyDither, methodSupportsStrength, type DitherMethod } from './dithering';
import { getPalette, quantizeCanvasToPalette, type PaletteMode, getPaletteFromIndices, getFreeIndices } from './palette';
import { drawBlackOutline, erodeInward } from './morphology';

export async function resampleImage(file: Blob, pixelSize: number, method: ResampleMethod): Promise<Blob> {
  const factor = Math.max(1, Math.floor(pixelSize || 1));
  const src = await createImageBitmap(file);
  const out = await resampleBitmapToBlob(src, factor, method);
  try { src.close && src.close(); } catch {}
  return out;
}


export async function resamplePixelate(file: Blob, pixelSize: number): Promise<Blob> {
  return resampleImage(file, pixelSize, 'nearest');
}

export type LivePreview = {
  url: string;
  revoke: () => void;
};

export async function blobToObjectUrl(blob: Blob): Promise<LivePreview> {
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => { try { URL.revokeObjectURL(url); } catch {} },
  };
}


export async function resampleAndDither(
  file: Blob,
  pixelSize: number,
  method: ResampleMethod,
  ditherMethod: DitherMethod,
  ditherLevels: number,
  paletteMode: PaletteMode,
  outlineThickness: number,
  erodeAmount: number,
  customIndices?: number[],
  colorCorrectionEnabled?: boolean,
  brightness?: number,
  contrast?: number,
  saturation?: number,
  hue?: number,
): Promise<Blob> {
  const factor = Math.max(1, Math.floor(pixelSize || 1));
  const src = await createImageBitmap(file);
  try {
    let canvas = resampleBitmapToCanvas(src, factor, method);
    
    canvas = applyColorCorrection(canvas, !!colorCorrectionEnabled, brightness||0, contrast||0, saturation||0, hue||0);
    
    
    const levelsFloat = Math.max(2, Math.min(10, (ditherLevels as number) || 2));
    const pal = paletteMode === 'custom'
      ? getPaletteFromIndices((customIndices && customIndices.length) ? customIndices : getFreeIndices())
      : getPalette(paletteMode);

    const normalizedStrength = Math.max(0, Math.min(1, (levelsFloat - 2) / 8));
    const ditherOptions = { palette: pal } as { palette: number[][]; strength?: number };
    if (methodSupportsStrength(ditherMethod)) {
      ditherOptions.strength = normalizedStrength;
    }

    canvas = applyDither(canvas, ditherMethod, ditherOptions);

    canvas = quantizeCanvasToPalette(canvas, pal);
    
    canvas = erodeInward(canvas, Math.max(0, Math.floor(erodeAmount || 0)));
    canvas = drawBlackOutline(canvas, Math.max(0, Math.floor(outlineThickness || 0)));
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    try { src.close && src.close(); } catch {}
  }
}

function applyColorCorrection(canvas: OffscreenCanvas, enabled: boolean, brightness: number, contrast: number, saturation: number, hue: number): OffscreenCanvas {
  try {
    if (!enabled) return canvas;
    const cx = canvas.getContext('2d', { willReadFrequently: true });
    if (!cx) return canvas;
    const img = cx.getImageData(0,0,canvas.width,canvas.height);
    const d = img.data as Uint8ClampedArray;
    const bAdd = (brightness|0); 
    const cVal = (contrast|0);
    const sVal = (saturation|0);
    const hVal = (hue|0);
    const cFactor = (259*(cVal+255))/(255*(259-cVal));
    const sFactor = 1 + (sVal/100);
    const rad = (hVal||0) * Math.PI/180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    
    const r2y=0.299, g2y=0.587, b2y=0.114;
    const r2i=0.595716, g2i=-0.274453, b2i=-0.321263;
    const r2q=0.211456, g2q=-0.522591, b2q=0.311135;
    const i2r=0.9563,  q2r=0.6210;
    const i2g=-0.2721, q2g=-0.6474;
    const i2b=-1.1070, q2b=1.7046;
    const bAdd255 = (bAdd/100)*255;
    for (let i=0; i<d.length; i+=4){
      let r=d[i], g=d[i+1], b=d[i+2];
      if (hVal){
        const Y = r2y*r + g2y*g + b2y*b;
        const I = r2i*r + g2i*g + b2i*b;
        const Q = r2q*r + g2q*g + b2q*b;
        const I2 = I*cosA - Q*sinA;
        const Q2 = I*sinA + Q*cosA;
        r = clampByte(Y + I2*i2r + Q2*q2r);
        g = clampByte(Y + I2*i2g + Q2*q2g);
        b = clampByte(Y + I2*i2b + Q2*q2b);
      }
      if (sVal){
        const gray = (0.299*r + 0.587*g + 0.114*b);
        r = clampByte(gray + (r - gray)*sFactor);
        g = clampByte(gray + (g - gray)*sFactor);
        b = clampByte(gray + (b - gray)*sFactor);
      }
      if (cVal){
        r = clampByte(cFactor*(r-128)+128);
        g = clampByte(cFactor*(g-128)+128);
        b = clampByte(cFactor*(b-128)+128);
      }
      if (bAdd){
        r = clampByte(r + bAdd255);
        g = clampByte(g + bAdd255);
        b = clampByte(b + bAdd255);
      }
      d[i]=r; d[i+1]=g; d[i+2]=b;
    }
    cx.putImageData(img,0,0);
    return canvas;
  } catch { return canvas; }
}

function clampByte(v: number): number { return v<0?0: v>255?255: v|0; }
