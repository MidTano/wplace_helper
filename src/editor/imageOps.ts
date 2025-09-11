import { resampleBitmapToBlob, resampleBitmapToCanvas, type ResampleMethod } from './resamplers';
import { applyDitherToCanvas, type DitherMethod } from './dithering';
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
): Promise<Blob> {
  const factor = Math.max(1, Math.floor(pixelSize || 1));
  const src = await createImageBitmap(file);
  try {
    let canvas = resampleBitmapToCanvas(src, factor, method);
    const levels = Math.max(2, Math.min(20, Math.floor(ditherLevels || 2)));
    canvas = applyDitherToCanvas(canvas, levels, ditherMethod);
    
    const pal = paletteMode === 'custom'
      ? getPaletteFromIndices((customIndices && customIndices.length) ? customIndices : getFreeIndices())
      : getPalette(paletteMode);
    canvas = quantizeCanvasToPalette(canvas, pal);
    
    canvas = erodeInward(canvas, Math.max(0, Math.floor(erodeAmount || 0)));
    canvas = drawBlackOutline(canvas, Math.max(0, Math.floor(outlineThickness || 0)));
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    try { src.close && src.close(); } catch {}
  }
}
