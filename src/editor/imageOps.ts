import { resampleBitmapToBlob, resampleBitmapToCanvas, type ResampleMethod } from './resamplers';
import { applyDither, methodSupportsStrength, type DitherMethod } from './dithering';
import { getPalette, quantizeCanvasToPalette, type PaletteMode, getPaletteFromIndices, getFreeIndices, type QuantMethod } from './palette';
import { drawBlackOutline, erodeInward } from './morphology';

export async function resampleImage(file: Blob, pixelSize: number, method: ResampleMethod): Promise<Blob> {
  const factor = Math.max(1, Number(pixelSize) || 1);
  const src = await createImageBitmap(file);
  const out = await resampleBitmapToBlob(src, factor, method);
  try { src.close && src.close(); } catch {}
  return out;
}

function kuwahara(canvas: OffscreenCanvas, r: number): OffscreenCanvas {
  const w=canvas.width|0, h=canvas.height|0; if (r<=0||w===0||h===0) return canvas;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0,0,w,h);
  const s = img.data;
  const out = new Uint8ClampedArray(s.length);
  const sw = w+1; const sh = h+1; const N = sw*sh;
  const iR = new Float64Array(N), iG = new Float64Array(N), iB = new Float64Array(N), iC = new Float64Array(N), iL = new Float64Array(N), iL2 = new Float64Array(N);
  function idx(x:number,y:number){ return y*sw + x; }
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const p=(y*w+x)*4; const a=s[p+3]|0; const c = (a>=128)?1:0;
      const r0=s[p]|0, g0=s[p+1]|0, b0=s[p+2]|0;
      const lum = 0.299*r0 + 0.587*g0 + 0.114*b0;
      const ii = idx(x+1,y+1);
      const left = idx(x,y+1), up = idx(x+1,y), upleft = idx(x,y);
      iR[ii]  = iR[left]  + iR[up]  - iR[upleft]  + (c?r0:0);
      iG[ii]  = iG[left]  + iG[up]  - iG[upleft]  + (c?g0:0);
      iB[ii]  = iB[left]  + iB[up]  - iB[upleft]  + (c?b0:0);
      iC[ii]  = iC[left]  + iC[up]  - iC[upleft]  + c;
      iL[ii]  = iL[left]  + iL[up]  - iL[upleft]  + (c?lum:0);
      iL2[ii] = iL2[left] + iL2[up] - iL2[upleft] + (c?lum*lum:0);
    }
  }
  function rectSum(ii:Float64Array, x0:number,y0:number,x1:number,y1:number){ const a=idx(x0,y0), b=idx(x1,y0), c=idx(x0,y1), d=idx(x1,y1); return ii[d]-ii[b]-ii[c]+ii[a]; }
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const p=(y*w+x)*4; const a=s[p+3]|0; if (a<128){ out[p]=s[p]; out[p+1]=s[p+1]; out[p+2]=s[p+2]; out[p+3]=a; continue; }
      const x0 = Math.max(0, x-r), x1 = x, x2 = Math.min(w-1, x+r);
      const y0 = Math.max(0, y-r), y1 = y, y2 = Math.min(h-1, y+r);
      const R = [
        {x0:x0,y0:y0,x1:x1,y1:y1},
        {x0:x1,y0:y0,x1:x2,y1:y1},
        {x0:x0,y0:y1,x1:x1,y1:y2},
        {x0:x1,y0:y1,x1:x2,y1:y2}
      ];
      let bestVar=1e20, mR= s[p], mG=s[p+1], mB=s[p+2];
      for (let k=0;k<4;k++){
        const rx0=R[k].x0, ry0=R[k].y0, rx1=R[k].x1, ry1=R[k].y1;
        const ex0=rx0, ey0=ry0, ex1=rx1+1, ey1=ry1+1;
        const cnt = rectSum(iC, ex0,ey0,ex1,ey1);
        if (cnt<=0) continue;
        const sumL = rectSum(iL, ex0,ey0,ex1,ey1);
        const sumL2= rectSum(iL2,ex0,ey0,ex1,ey1);
        const meanL = sumL/cnt; const v = (sumL2/cnt) - meanL*meanL;
        if (v < bestVar){
          bestVar = v;
          const sr = rectSum(iR, ex0,ey0,ex1,ey1);
          const sg = rectSum(iG, ex0,ey0,ex1,ey1);
          const sb = rectSum(iB, ex0,ey0,ex1,ey1);
          mR = clampByte((sr/cnt)|0); mG = clampByte((sg/cnt)|0); mB = clampByte((sb/cnt)|0);
        }
      }
      out[p]=mR; out[p+1]=mG; out[p+2]=mB; out[p+3]=255;
    }
  }
  img.data.set(out); cx.putImageData(img,0,0); return canvas;
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
  gamma?: number,
  blurMode?: string,
  blurRadius?: number,
  sharpenAmount?: number,
  sharpenRadius?: number,
  sharpenThreshold?: number,
  modeRadius?: number,
  posterizeLevels?: number,
  posterizeAfterPalette?: boolean,
  kwEnabled?: boolean,
  kwRadius?: number,
  kwSectors?: number,
  kwStrengthPct?: number,
  kwAnisotropyPct?: number,
  kwAfterPalette?: boolean,
  simplifyArea?: number,
  kwBlend?: boolean,
  edgeEnabled?: boolean,
  edgeThreshold?: number,
  edgeThickness?: number,
  edgeThin?: boolean,
  quantMethod?: string,
  edgeMethod?: string,
  adaptDitherEnabled?: boolean,
  adaptDitherMethod?: string,
  adaptDitherThreshold?: number,
  adaptDitherThickness?: number,
  adaptDitherThin?: boolean,
  adaptDitherInvert?: boolean,
  adaptDitherFeather?: number,
): Promise<Blob> {
  const factor = Math.max(1, Number(pixelSize) || 1);
  const src = await createImageBitmap(file);
  try {
    void(posterizeAfterPalette);
    void(kwAfterPalette);
    let sourceBitmap: ImageBitmap = src;
    if (blurMode && blurMode !== 'none' && ((blurRadius||0)|0) > 0) {
      const pre = new OffscreenCanvas(src.width, src.height);
      const prex = pre.getContext('2d', { willReadFrequently: true })!;
      prex.imageSmoothingEnabled = false;
      prex.clearRect(0,0,src.width,src.height);
      prex.drawImage(src, 0, 0);
      const blurred = preBlur(pre, String(blurMode), (blurRadius||0)|0);
      const sharpenA = (sharpenAmount||0)|0;
      const sharpenR = (sharpenRadius||0)|0;
      const sharpenT = (sharpenThreshold||0)|0;
      const preProcessed = (sharpenA>0 && sharpenR>0) ? unsharp(blurred, sharpenA, sharpenR, sharpenT) : blurred;
      if ((preProcessed as any).transferToImageBitmap) {
        sourceBitmap = (preProcessed as any).transferToImageBitmap();
      } else {
        const blb = await preProcessed.convertToBlob({ type: 'image/png' });
        sourceBitmap = await createImageBitmap(blb);
      }
    } else {
      const sharpenA = (sharpenAmount||0)|0;
      const sharpenR = (sharpenRadius||0)|0;
      const sharpenT = (sharpenThreshold||0)|0;
      if (sharpenA>0 && sharpenR>0) {
        const pre2 = new OffscreenCanvas(src.width, src.height);
        const pre2x = pre2.getContext('2d', { willReadFrequently: true })!;
        pre2x.imageSmoothingEnabled = false;
        pre2x.clearRect(0,0,src.width,src.height);
        pre2x.drawImage(src, 0, 0);
        const sh = unsharp(pre2, sharpenA, sharpenR, sharpenT);
        if ((sh as any).transferToImageBitmap) {
          sourceBitmap = (sh as any).transferToImageBitmap();
        } else {
          const blb2 = await sh.convertToBlob({ type: 'image/png' });
          sourceBitmap = await createImageBitmap(blb2);
        }
      }
    }
    let canvas = resampleBitmapToCanvas(sourceBitmap, factor, method);
    let edgeMask: Uint8Array | null = null;
    if (edgeEnabled) {
      try {
        const base = new OffscreenCanvas(canvas.width, canvas.height);
        const bx = base.getContext('2d', { willReadFrequently: true })!;
        bx.imageSmoothingEnabled = false;
        bx.clearRect(0,0,base.width,base.height);
        bx.drawImage(src, 0, 0, base.width, base.height);
        const em = String(edgeMethod || 'sobel');
        edgeMask = edgeMaskByMethod(base, em, Math.max(0, (edgeThreshold as number) | 0), !!edgeThin);
        const th = Math.max(1, ((edgeThickness as number) | 0));
        if (th > 1 && edgeMask) edgeMask = dilateMask(edgeMask, base.width|0, base.height|0, th - 1);
      } catch {}
    }
    
    canvas = applyColorCorrection(canvas, !!colorCorrectionEnabled, brightness||0, contrast||0, saturation||0, hue||0, gamma||1);
    const pz = Math.max(0, Math.floor((posterizeLevels as number) || 0));
    const pzClamped = pz >= 2 ? Math.max(2, Math.min(16, pz)) : 0;
    if (pzClamped) {
      canvas = posterize(canvas, pzClamped);
    }
    if (kwEnabled) {
      const rr = Math.max(1, (kwRadius as number)|0);
      const ss = ((kwSectors as number)|0)===8?8:4;
      const str = Math.max(0, Math.min(100, (kwStrengthPct as number)|0));
      const an = Math.max(0, Math.min(100, (kwAnisotropyPct as number)|0));
      canvas = kuwaharaStage(canvas, rr, ss, str, an, !!kwBlend);
    }
    {
      const mr = Math.max(0, Math.floor((modeRadius as number) || 0));
      if (mr > 0) {
        canvas = modeFilter(canvas, mr);
      }
    }
    
    
    const levelsFloat = Math.max(2, Math.min(10, (ditherLevels as number) || 2));
    const pal = paletteMode === 'custom'
      ? getPaletteFromIndices((customIndices && customIndices.length) ? customIndices : getFreeIndices())
      : getPalette(paletteMode);

    const normalizedStrength = Math.max(0, Math.min(1, (levelsFloat - 2) / 8));
    const ditherOptions = { palette: pal } as { palette: number[][]; strength?: number };
    if (methodSupportsStrength(ditherMethod)) {
      ditherOptions.strength = normalizedStrength;
    }

    let adaptMask: Uint8Array | null = null;
    let adaptWeights: Float32Array | null = null;
    let canvasNoDither: OffscreenCanvas | null = null;
    if (adaptDitherEnabled) {
      try {
        const base = new OffscreenCanvas(canvas.width, canvas.height);
        const bx = base.getContext('2d', { willReadFrequently: true })!;
        bx.imageSmoothingEnabled = false;
        bx.clearRect(0,0,base.width,base.height);
        bx.drawImage(src, 0, 0, base.width, base.height);
        const am = String(adaptDitherMethod || 'sobel');
        adaptMask = edgeMaskByMethod(base, am, Math.max(0, (adaptDitherThreshold as number) | 0), !!adaptDitherThin);
        const ath = Math.max(1, ((adaptDitherThickness as number) | 0));
        if (ath > 1 && adaptMask) adaptMask = dilateMask(adaptMask, base.width|0, base.height|0, ath - 1);
        const cnd = new OffscreenCanvas(canvas.width, canvas.height);
        const cndx = cnd.getContext('2d', { willReadFrequently: true })!;
        cndx.imageSmoothingEnabled = false;
        cndx.clearRect(0,0,cnd.width,cnd.height);
        cndx.drawImage(canvas, 0, 0);
        const qms = String(quantMethod || 'rgb');
        const qmp = (qms === 'oklab' || qms === 'linear' || qms === 'ycbcr' || qms === 'rgb' ? qms as QuantMethod : 'rgb');
        canvasNoDither = quantizeCanvasToPalette(cnd, pal, qmp);
        const afr = Math.max(0, ((adaptDitherFeather as number) | 0));
        if (afr > 0 && adaptMask) {
          adaptWeights = blurMaskToWeights(adaptMask, base.width|0, base.height|0, afr);
        }
      } catch {}
    }

    canvas = applyDither(canvas, ditherMethod, ditherOptions);
    if (canvasNoDither && adaptMask) {
      const pickSecondaryOnMask = !(adaptDitherInvert === true);
      if (adaptWeights) {
        canvas = mixByWeights(canvas, canvasNoDither, adaptWeights, pickSecondaryOnMask);
      } else {
        canvas = mixByMask(canvas, canvasNoDither, adaptMask, pickSecondaryOnMask);
      }
    }

    const qm = String(quantMethod || 'rgb');
    canvas = quantizeCanvasToPalette(canvas, pal, (qm === 'oklab' || qm === 'linear' || qm === 'ycbcr' || qm === 'rgb' ? qm as QuantMethod : 'rgb'));
    {
      const sa = Math.max(0, Math.floor((simplifyArea as number) || 0));
      if (sa > 0) {
        canvas = simplifyRegions(canvas, sa);
      }
    }
    
    canvas = erodeInward(canvas, Math.max(0, Math.floor(erodeAmount || 0)));
    canvas = drawBlackOutline(canvas, Math.max(0, Math.floor(outlineThickness || 0)));
    if (edgeMask) {
      const oc = nearestInPalette(pal, 0, 0, 0);
      canvas = overlayEdges(canvas, edgeMask, oc[0], oc[1], oc[2]);
    }
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    try { src.close && src.close(); } catch {}
  }
}

function preBlur(canvas: OffscreenCanvas, mode: string, radius: number): OffscreenCanvas {
  try {
    const r = (radius|0);
    if (!mode || mode === 'none' || r <= 0) return canvas;
    if (mode === 'box') return boxBlur(canvas, r);
    if (mode === 'gaussian') return gaussianApprox(canvas, r);
    if (mode === 'bilateral') return bilateral(canvas, r);
    if (mode === 'kuwahara') return kuwahara(canvas, r);
    return canvas;
  } catch { return canvas; }
}

function boxBlur(canvas: OffscreenCanvas, r: number): OffscreenCanvas {
  const w = canvas.width|0, h = canvas.height|0; if (r<=0||w===0||h===0) return canvas;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0,0,w,h);
  const s = img.data;
  const tmp = new Uint8ClampedArray(s.length);
  const win = 2*r+1;
  let i = 0;
  for (let y=0;y<h;y++){
    let rs=0,gs=0,bs=0,as=0; const yoff=y*w*4; let x0=0; let x1=0;
    for (let k=-r;k<=r;k++){ const xx=k<0?0:k; const p=(yoff+xx*4); rs+=s[p]; gs+=s[p+1]; bs+=s[p+2]; as+=s[p+3]; }
    for (let x=0;x<w;x++){
      i=yoff+x*4; tmp[i]=(rs/win)|0; tmp[i+1]=(gs/win)|0; tmp[i+2]=(bs/win)|0; tmp[i+3]=(as/win)|0;
      x0=x-r; x1=x+r+1; if (x0<0) x0=0; if (x1>=w) x1=w-1; const p0=yoff+x0*4; const p1=yoff+x1*4;
      rs+=s[p1]-s[p0]; gs+=s[p1+1]-s[p0+1]; bs+=s[p1+2]-s[p0+2]; as+=s[p1+3]-s[p0+3];
    }
  }
  const out = new Uint8ClampedArray(s.length);
  for (let x=0;x<w;x++){
    let rs=0,gs=0,bs=0,as=0; const xoff=x*4; let y0=0; let y1=0;
    for (let k=-r;k<=r;k++){ const yy=k<0?0:k; const p=(yy*w*4+xoff); rs+=tmp[p]; gs+=tmp[p+1]; bs+=tmp[p+2]; as+=tmp[p+3]; }
    for (let y=0;y<h;y++){
      i=y*w*4+xoff; out[i]=(rs/win)|0; out[i+1]=(gs/win)|0; out[i+2]=(bs/win)|0; out[i+3]=(as/win)|0;
      y0=y-r; y1=y+r+1; if (y0<0) y0=0; if (y1>=h) y1=h-1; const p0=y0*w*4+xoff; const p1=y1*w*4+xoff;
      rs+=tmp[p1]-tmp[p0]; gs+=tmp[p1+1]-tmp[p0+1]; bs+=tmp[p1+2]-tmp[p0+2]; as+=tmp[p1+3]-tmp[p0+3];
    }
  }
  img.data.set(out); cx.putImageData(img,0,0); return canvas;
}

function unsharp(canvas: OffscreenCanvas, amount: number, radius: number, threshold: number): OffscreenCanvas {
  try {
    const w = canvas.width|0, h = canvas.height|0; if (w===0||h===0) return canvas;
    const a = Math.max(0, Number(amount)||0); const r = (radius|0); const th = (threshold|0);
    if (a<=0 || r<=0) return canvas;
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const orig = img.data;
    let bc = new OffscreenCanvas(w, h);
    const bcx = bc.getContext('2d', { willReadFrequently: true })!;
    bcx.clearRect(0,0,w,h); bcx.drawImage(canvas, 0, 0);
    bc = gaussianApprox(bc, r);
    const bimg = bcx.getImageData(0,0,w,h);
    const bdat = bimg.data;
    const k = a/100;
    for (let i=0;i<orig.length;i+=4){
      const dr = orig[i]-bdat[i];
      const dg = orig[i+1]-bdat[i+1];
      const db = orig[i+2]-bdat[i+2];
      if (Math.abs(dr)>=th) orig[i] = clampByte(orig[i] + k*dr);
      if (Math.abs(dg)>=th) orig[i+1] = clampByte(orig[i+1] + k*dg);
      if (Math.abs(db)>=th) orig[i+2] = clampByte(orig[i+2] + k*db);
    }
    cx.putImageData(img,0,0); return canvas;
  } catch { return canvas; }
}

function gaussianApprox(canvas: OffscreenCanvas, r: number): OffscreenCanvas {
  const passes = 3;
  for (let i=0;i<passes;i++) canvas = boxBlur(canvas, Math.max(1, r|0));
  return canvas;
}

function bilateral(canvas: OffscreenCanvas, r: number): OffscreenCanvas {
  const w=canvas.width|0, h=canvas.height|0; if (r<=0||w===0||h===0) return canvas;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0,0,w,h);
  const s = img.data;
  const out = new Uint8ClampedArray(s.length);
  const sr = 25;
  const twoSr2 = 2*sr*sr;
  const twoSs2 = 2*r*r;
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const i=(y*w+x)*4;
      const r0=s[i], g0=s[i+1], b0=s[i+2];
      let wr=0, wg=0, wb=0, wa=0, wSum=0;
      for (let dy=-r;dy<=r;dy++){
        const yy=y+dy; if (yy<0||yy>=h) continue;
        for (let dx=-r;dx<=r;dx++){
          const xx=x+dx; if (xx<0||xx>=w) continue;
          const j=(yy*w+xx)*4;
          const dr=r0-s[j], dg=g0-s[j+1], db=b0-s[j+2];
          const ds=dx*dx+dy*dy;
          const rc=dr*dr+dg*dg+db*db;
          const wgt=Math.exp(-ds/twoSs2)*Math.exp(-rc/twoSr2);
          wr+=s[j]*wgt; wg+=s[j+1]*wgt; wb+=s[j+2]*wgt; wa+=s[j+3]*wgt; wSum+=wgt;
        }
      }
      out[i]=(wr/wSum)|0; out[i+1]=(wg/wSum)|0; out[i+2]=(wb/wSum)|0; out[i+3]=(wa/wSum)|0;
    }
  }
  img.data.set(out); cx.putImageData(img,0,0); return canvas;
}

function applyColorCorrection(canvas: OffscreenCanvas, enabled: boolean, brightness: number, contrast: number, saturation: number, hue: number, gamma: number): OffscreenCanvas {
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
    const gVal = Math.max(0.2, Math.min(5, Number(gamma)||1));
    const invG = 1 / gVal;
    
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
      if (gVal !== 1) {
        r = clampByte(Math.pow(r/255, invG) * 255);
        g = clampByte(Math.pow(g/255, invG) * 255);
        b = clampByte(Math.pow(b/255, invG) * 255);
      }
      d[i]=r; d[i+1]=g; d[i+2]=b;
    }
    cx.putImageData(img,0,0);
    return canvas;
  } catch { return canvas; }
}

function modeFilter(canvas: OffscreenCanvas, size: number): OffscreenCanvas {
  try {
    const n = (size|0); if (n<=1) return canvas; const w=canvas.width|0, h=canvas.height|0; if (w===0||h===0) return canvas;
    const left = Math.floor((n-1)/2); const right = n - left - 1;
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const s = img.data;
    const out = new Uint8ClampedArray(s.length);
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const i=(y*w+x)*4; const a=s[i+3]|0; if (a<128){ out[i]=s[i]; out[i+1]=s[i+1]; out[i+2]=s[i+2]; out[i+3]=a; continue; }
        const counts: Record<number, number> = {};
        let best=0, bR=s[i], bG=s[i+1], bB=s[i+2];
        for (let dy=-left; dy<=right; dy++){
          const yy=y+dy; if (yy<0||yy>=h) continue;
          for (let dx=-left; dx<=right; dx++){
            const xx=x+dx; if (xx<0||xx>=w) continue; const j=(yy*w+xx)*4; if ((s[j+3]|0)<128) continue;
            const key=((s[j]|0)<<16)|((s[j+1]|0)<<8)|(s[j+2]|0);
            const c=(counts[key]||0)+1; counts[key]=c; if (c>best){ best=c; bR=s[j]; bG=s[j+1]; bB=s[j+2]; }
          }
        }
        out[i]=bR; out[i+1]=bG; out[i+2]=bB; out[i+3]=255;
      }
    }
    img.data.set(out); cx.putImageData(img,0,0); return canvas;
  } catch { return canvas; }
}

function posterize(canvas: OffscreenCanvas, levels: number): OffscreenCanvas {
  try {
    const n = (levels|0); if (n<=1) return canvas; const w=canvas.width|0, h=canvas.height|0; if (w===0||h===0) return canvas;
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const d = img.data as Uint8ClampedArray;
    const div = 255/Math.max(1,(n-1));
    for (let i=0;i<d.length;i+=4){
      const a = d[i+3]|0; if (a<128) continue;
      const r=d[i], g=d[i+1], b=d[i+2];
      const L = 0.299*r + 0.587*g + 0.114*b;
      const qL = Math.round(L/div)*div;
      const scale = L>0 ? (qL/L) : 0;
      const nr = clampByte((r*scale)|0);
      const ng = clampByte((g*scale)|0);
      const nb = clampByte((b*scale)|0);
      d[i]=nr; d[i+1]=ng; d[i+2]=nb;
    }
    cx.putImageData(img,0,0); return canvas;
  } catch { return canvas; }
}

function clampByte(v: number): number { return v<0?0: v>255?255: v|0; }

function sobelEdgeMask(canvas: OffscreenCanvas, threshold: number, thin: boolean): Uint8Array {
  try {
    const w = canvas.width|0, h = canvas.height|0; if (w===0||h===0) return new Uint8Array(0);
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const d = img.data as Uint8ClampedArray;
    const gxk = [-1,0,1,-2,0,2,-1,0,1];
    const gyk = [-1,-2,-1,0,0,0,1,2,1];
    const mag = new Float32Array(w*h);
    const dir = thin ? new Int8Array(w*h) : null;
    for (let y=1;y<h-1;y++){
      for (let x=1;x<w-1;x++){
        let sx=0, sy=0; let k=0;
        for (let dy=-1;dy<=1;dy++){
          const yy=y+dy; const off = yy*w;
          for (let dx=-1;dx<=1;dx++){
            const xx=x+dx; const p=((off+xx)<<2);
            const L = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2];
            const gxx = gxk[k]; const gyy = gyk[k]; k++;
            sx += gxx*L; sy += gyy*L;
          }
        }
        const m = Math.abs(sx) + Math.abs(sy);
        mag[y*w+x] = m;
        if (dir) {
          const ax = Math.abs(sx), ay = Math.abs(sy);
          let idx = 0;
          if (ax >= ay) idx = sx>=0 ? 0 : 0; else idx = sy>=0 ? 1 : 1;
          dir[y*w+x] = idx as any;
        }
      }
    }
    const thr = Math.max(0, threshold|0);
    const mask = new Uint8Array(w*h);
    if (thin && dir){
      for (let y=1;y<h-1;y++){
        for (let x=1;x<w-1;x++){
          const i=y*w+x; const m=mag[i]; if (m<thr) continue;
          const d0 = dir[i];
          let m1=0,m2=0;
          if (d0===0){ m1 = mag[i-1]; m2 = mag[i+1]; } else { m1 = mag[i-w]; m2 = mag[i+w]; }
          if (m>=m1 && m>=m2) mask[i]=1;
        }
      }
    } else {
      for (let i=0;i<mask.length;i++) if (mag[i] >= thr) mask[i]=1;
    }
    return mask;
  } catch { return new Uint8Array(0); }
}

function prewittEdgeMask(canvas: OffscreenCanvas, threshold: number, thin: boolean): Uint8Array {
  try {
    const w = canvas.width|0, h = canvas.height|0; if (w===0||h===0) return new Uint8Array(0);
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const d = img.data as Uint8ClampedArray;
    const gxk = [-1,0,1,-1,0,1,-1,0,1];
    const gyk = [1,1,1,0,0,0,-1,-1,-1];
    const mag = new Float32Array(w*h);
    const dir = thin ? new Int8Array(w*h) : null;
    for (let y=1;y<h-1;y++){
      for (let x=1;x<w-1;x++){
        let sx=0, sy=0; let k=0;
        for (let dy=-1;dy<=1;dy++){
          const yy=y+dy; const off = yy*w;
          for (let dx=-1;dx<=1;dx++){
            const xx=x+dx; const p=((off+xx)<<2);
            const L = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2];
            const gxx = gxk[k]; const gyy = gyk[k]; k++;
            sx += gxx*L; sy += gyy*L;
          }
        }
        const m = Math.abs(sx) + Math.abs(sy);
        mag[y*w+x] = m;
        if (dir) {
          const ax = Math.abs(sx), ay = Math.abs(sy);
          let idx = 0; if (ax >= ay) idx = 0; else idx = 1; dir[y*w+x] = idx as any;
        }
      }
    }
    const thr = Math.max(0, threshold|0);
    const mask = new Uint8Array(w*h);
    if (thin && dir){
      for (let y=1;y<h-1;y++){
        for (let x=1;x<w-1;x++){
          const i=y*w+x; const m=mag[i]; if (m<thr) continue;
          const d0 = dir[i];
          let m1=0,m2=0;
          if (d0===0){ m1 = mag[i-1]; m2 = mag[i+1]; } else { m1 = mag[i-w]; m2 = mag[i+w]; }
          if (m>=m1 && m>=m2) mask[i]=1;
        }
      }
    } else {
      for (let i=0;i<mask.length;i++) if (mag[i] >= thr) mask[i]=1;
    }
    return mask;
  } catch { return new Uint8Array(0); }
}

function scharrEdgeMask(canvas: OffscreenCanvas, threshold: number, thin: boolean): Uint8Array {
  try {
    const w = canvas.width|0, h = canvas.height|0; if (w===0||h===0) return new Uint8Array(0);
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const d = img.data as Uint8ClampedArray;
    const gxk = [3,0,-3,10,0,-10,3,0,-3];
    const gyk = [3,10,3,0,0,0,-3,-10,-3];
    const mag = new Float32Array(w*h);
    const dir = thin ? new Int8Array(w*h) : null;
    for (let y=1;y<h-1;y++){
      for (let x=1;x<w-1;x++){
        let sx=0, sy=0; let k=0;
        for (let dy=-1;dy<=1;dy++){
          const yy=y+dy; const off = yy*w;
          for (let dx=-1;dx<=1;dx++){
            const xx=x+dx; const p=((off+xx)<<2);
            const L = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2];
            const gxx = gxk[k]; const gyy = gyk[k]; k++;
            sx += gxx*L; sy += gyy*L;
          }
        }
        const m = Math.abs(sx) + Math.abs(sy);
        mag[y*w+x] = m;
        if (dir) {
          const ax = Math.abs(sx), ay = Math.abs(sy);
          let idx = 0; if (ax >= ay) idx = 0; else idx = 1; dir[y*w+x] = idx as any;
        }
      }
    }
    const thr = Math.max(0, threshold|0);
    const mask = new Uint8Array(w*h);
    if (thin && dir){
      for (let y=1;y<h-1;y++){
        for (let x=1;x<w-1;x++){
          const i=y*w+x; const m=mag[i]; if (m<thr) continue;
          const d0 = dir[i];
          let m1=0,m2=0;
          if (d0===0){ m1 = mag[i-1]; m2 = mag[i+1]; } else { m1 = mag[i-w]; m2 = mag[i+w]; }
          if (m>=m1 && m>=m2) mask[i]=1;
        }
      }
    } else {
      for (let i=0;i<mask.length;i++) if (mag[i] >= thr) mask[i]=1;
    }
    return mask;
  } catch { return new Uint8Array(0); }
}

function laplacianEdgeMask(canvas: OffscreenCanvas, threshold: number): Uint8Array {
  try {
    const w = canvas.width|0, h = canvas.height|0; if (w===0||h===0) return new Uint8Array(0);
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const d = img.data as Uint8ClampedArray;
    const k = [0,1,0,1,-4,1,0,1,0];
    const mag = new Float32Array(w*h);
    for (let y=1;y<h-1;y++){
      for (let x=1;x<w-1;x++){
        let s=0; let idx=0;
        for (let dy=-1;dy<=1;dy++){
          const yy=y+dy; const off=yy*w;
          for (let dx=-1;dx<=1;dx++){
            const xx=x+dx; const p=((off+xx)<<2);
            const L = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2];
            s += k[idx++]*L;
          }
        }
        mag[y*w+x] = Math.abs(s);
      }
    }
    const thr = Math.max(0, threshold|0);
    const mask = new Uint8Array(w*h);
    for (let i=0;i<mask.length;i++) if (mag[i] >= thr) mask[i]=1;
    return mask;
  } catch { return new Uint8Array(0); }
}

function edgeMaskByMethod(canvas: OffscreenCanvas, method: string, threshold: number, thin: boolean): Uint8Array {
  const m = String(method||'sobel');
  if (m === 'prewitt') return prewittEdgeMask(canvas, threshold, thin);
  if (m === 'scharr') return scharrEdgeMask(canvas, threshold, thin);
  if (m === 'laplacian') return laplacianEdgeMask(canvas, threshold);
  return sobelEdgeMask(canvas, threshold, thin);
}

function dilateMask(mask: Uint8Array, w: number, h: number, times: number): Uint8Array {
  const out = new Uint8Array(mask);
  const tmp = new Uint8Array(mask.length);
  const t = Math.max(1, times|0);
  for (let s=0;s<t;s++){
    tmp.fill(0);
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const i=y*w+x; if (out[i]) { tmp[i]=1; continue; }
        if ((x>0 && out[i-1])||(x+1<w && out[i+1])||(y>0 && out[i-w])||(y+1<h && out[i+w])) tmp[i]=1;
      }
    }
    out.set(tmp);
  }
  return out;
}

function nearestInPalette(palette: number[][], r: number, g: number, b: number): [number,number,number] {
  try {
    if (!palette || !palette.length) return [r|0,g|0,b|0];
    let bi=0, bd=1e20;
    for (let i=0;i<palette.length;i++){
      const pr=palette[i][0]|0, pg=palette[i][1]|0, pb=palette[i][2]|0;
      const dr=r-pr, dg=g-pg, db=b-pb; const d=dr*dr+dg*dg+db*db; if (d<bd){ bd=d; bi=i; }
    }
    const p=palette[bi]; return [p[0]|0,p[1]|0,p[2]|0];
  } catch { return [r|0,g|0,b|0]; }
}

function overlayEdges(canvas: OffscreenCanvas, mask: Uint8Array, r: number, g: number, b: number): OffscreenCanvas {
  try {
    const w=canvas.width|0, h=canvas.height|0; if ((w*h)!==mask.length) return canvas;
    const cx=canvas.getContext('2d', { willReadFrequently: true })!;
    const img=cx.getImageData(0,0,w,h);
    const d=img.data as Uint8ClampedArray;
    for (let i=0,p=0;i<mask.length;i++,p+=4){ if (mask[i]){ d[p]=r; d[p+1]=g; d[p+2]=b; d[p+3]=255; } }
    cx.putImageData(img,0,0); return canvas;
  } catch { return canvas; }
}

function mixByMask(primary: OffscreenCanvas, secondary: OffscreenCanvas, mask: Uint8Array, pickSecondaryOnMask: boolean): OffscreenCanvas {
  try {
    const w = primary.width|0, h = primary.height|0; if (w===0||h===0) return primary;
    if ((secondary.width|0)!==w || (secondary.height|0)!==h) return primary;
    if ((w*h)!==mask.length) return primary;
    const cxA = primary.getContext('2d', { willReadFrequently: true })!;
    const imgA = cxA.getImageData(0,0,w,h);
    const dA = imgA.data as Uint8ClampedArray;
    const cxB = secondary.getContext('2d', { willReadFrequently: true })!;
    const imgB = cxB.getImageData(0,0,w,h);
    const dB = imgB.data as Uint8ClampedArray;
    for (let i=0,p=0;i<mask.length;i++,p+=4){
      const m = mask[i] ? 1 : 0;
      const pickB = pickSecondaryOnMask ? m : (1 - m);
      if (pickB){ dA[p]=dB[p]; dA[p+1]=dB[p+1]; dA[p+2]=dB[p+2]; dA[p+3]=dB[p+3]; }
    }
    cxA.putImageData(imgA,0,0); return primary;
  } catch { return primary; }
}

function mixByWeights(primary: OffscreenCanvas, secondary: OffscreenCanvas, weights: Float32Array, pickSecondaryOnMask: boolean): OffscreenCanvas {
  try {
    const w = primary.width|0, h = primary.height|0; if (w===0||h===0) return primary;
    if ((secondary.width|0)!==w || (secondary.height|0)!==h) return primary;
    if ((w*h)!==weights.length) return primary;
    const cxA = primary.getContext('2d', { willReadFrequently: true })!;
    const imgA = cxA.getImageData(0,0,w,h);
    const dA = imgA.data as Uint8ClampedArray;
    const cxB = secondary.getContext('2d', { willReadFrequently: true })!;
    const imgB = cxB.getImageData(0,0,w,h);
    const dB = imgB.data as Uint8ClampedArray;
    for (let i=0,p=0;i<weights.length;i++,p+=4){
      let wv = weights[i]; if (!isFinite(wv)) wv = 0;
      if (!pickSecondaryOnMask) wv = 1 - wv;
      if (wv<=0) continue;
      if (wv>=1){ dA[p]=dB[p]; dA[p+1]=dB[p+1]; dA[p+2]=dB[p+2]; dA[p+3]=dB[p+3]; continue; }
      const ia = 1 - wv;
      dA[p] = (dA[p]*ia + dB[p]*wv)|0;
      dA[p+1] = (dA[p+1]*ia + dB[p+1]*wv)|0;
      dA[p+2] = (dA[p+2]*ia + dB[p+2]*wv)|0;
      dA[p+3] = (dA[p+3]*ia + dB[p+3]*wv)|0;
    }
    cxA.putImageData(imgA,0,0); return primary;
  } catch { return primary; }
}

function blurMaskToWeights(mask: Uint8Array, w: number, h: number, radius: number): Float32Array {
  const r = Math.max(1, radius|0);
  const out = new Float32Array(w*h);
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      let sum = 0; let cnt = 0;
      const y0 = Math.max(0, y-r), y1 = Math.min(h-1, y+r);
      const x0 = Math.max(0, x-r), x1 = Math.min(w-1, x+r);
      for (let yy=y0; yy<=y1; yy++){
        const off = yy*w;
        for (let xx=x0; xx<=x1; xx++){
          sum += mask[off+xx] ? 1 : 0;
          cnt++;
        }
      }
      out[y*w+x] = cnt>0 ? (sum/cnt) : 0;
    }
  }
  return out;
}

function simplifyRegions(canvas: OffscreenCanvas, minArea: number): OffscreenCanvas {
  try {
    const thr = Math.max(1, Math.floor(minArea||0));
    const w = canvas.width|0, h = canvas.height|0; if (w===0||h===0) return canvas;
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    const img = cx.getImageData(0,0,w,h);
    const d = img.data as Uint8ClampedArray;
    const visited = new Uint8Array(w*h);
    const qx = new Int32Array(w*h);
    const qy = new Int32Array(w*h);
    let qs = 0, qe = 0;
    function idx(x:number,y:number){ return (y*w+x)<<2; }
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const li = y*w+x; if (visited[li]) continue;
        const p = li<<2; const a = d[p+3]|0; if (a<128) { visited[li]=1; continue; }
        const r0=d[p]|0,g0=d[p+1]|0,b0=d[p+2]|0; const key=((r0<<16)|(g0<<8)|b0)>>>0;
        qs=0; qe=0; qx[qe]=x; qy[qe]=y; qe++;
        const comp: number[] = [];
        let borderColors: Record<number, number> = {};
        visited[li]=1;
        while(qs<qe){
          const cx0=qx[qs], cy0=qy[qs]; qs++;
          const pi = idx(cx0,cy0);
          comp.push(pi);
          const nb = [[1,0],[-1,0],[0,1],[0,-1]] as const;
          for (let k=0;k<4;k++){
            const nx=cx0+nb[k][0], ny=cy0+nb[k][1];
            if (nx<0||ny<0||nx>=w||ny>=h) continue;
            const l2=ny*w+nx; if (visited[l2]) continue;
            const p2=idx(nx,ny); const a2=d[p2+3]|0; if (a2<128){ visited[l2]=1; continue; }
            const r=d[p2]|0,g=d[p2+1]|0,b=d[p2+2]|0; const k2=((r<<16)|(g<<8)|b)>>>0;
            if (k2===key){ visited[l2]=1; qx[qe]=nx; qy[qe]=ny; qe++; }
            else { borderColors[k2]=(borderColors[k2]||0)+1; }
          }
        }
        if (comp.length>0 && comp.length < thr){
          let bestKey = -1, bestCnt = -1;
          for (const ks in borderColors){ const c = borderColors[ks as any]|0; if (c>bestCnt){ bestCnt=c; bestKey=(Number(ks)|0); } }
          if (bestKey>=0){
            const nr = (bestKey>>>16)&255; const ng=(bestKey>>>8)&255; const nb=bestKey&255;
            for (let i=0;i<comp.length;i++){
              const p3=comp[i]; d[p3]=nr; d[p3+1]=ng; d[p3+2]=nb; d[p3+3]=255;
            }
          }
        }
      }
    }
    cx.putImageData(img,0,0); return canvas;
  } catch { return canvas; }
}

function kuwaharaStage(canvas: OffscreenCanvas, r: number, sectors: number, strengthPct: number, anisotropyPct: number, blend?: boolean): OffscreenCanvas {
  const w=canvas.width|0, h=canvas.height|0; if (r<=0||w===0||h===0) return canvas;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0,0,w,h);
  const s = img.data;
  const out = new Uint8ClampedArray(s.length);
  const sw=w+1; const N=sw*(h+1);
  const iR=new Float64Array(N), iG=new Float64Array(N), iB=new Float64Array(N), iC=new Float64Array(N), iL=new Float64Array(N), iL2=new Float64Array(N);
  function id(x:number,y:number){ return y*sw+x; }
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const p=(y*w+x)*4; const a=s[p+3]|0; const c=(a>=128)?1:0;
      const r0=s[p]|0, g0=s[p+1]|0, b0=s[p+2]|0; const lum=0.299*r0+0.587*g0+0.114*b0;
      const ii=id(x+1,y+1), left=id(x,y+1), up=id(x+1,y), upleft=id(x,y);
      iR[ii]=iR[left]+iR[up]-iR[upleft]+(c?r0:0);
      iG[ii]=iG[left]+iG[up]-iG[upleft]+(c?g0:0);
      iB[ii]=iB[left]+iB[up]-iB[upleft]+(c?b0:0);
      iC[ii]=iC[left]+iC[up]-iC[upleft]+c;
      iL[ii]=iL[left]+iL[up]-iL[upleft]+(c?lum:0);
      iL2[ii]=iL2[left]+iL2[up]-iL2[upleft]+(c?lum*lum:0);
    }
  }
  function rect(ii:Float64Array,x0:number,y0:number,x1:number,y1:number){ const a=id(x0,y0), b=id(x1,y0), c=id(x0,y1), d=id(x1,y1); return ii[d]-ii[b]-ii[c]+ii[a]; }
  function sobelTheta(x:number,y:number){ let gx=0, gy=0; for (let dy=-1;dy<=1;dy++){ const yy=Math.min(h-1, Math.max(0,y+dy)); for (let dx=-1;dx<=1;dx++){ const xx=Math.min(w-1, Math.max(0,x+dx)); const pp=(yy*w+xx)*4; const L=0.299*s[pp]+0.587*s[pp+1]+0.114*s[pp+2]; const kx=(dx===-1&&dy===-1?-1:dx===0&&dy===-1?0:dx===1&&dy===-1?1:dx===-1&&dy===0?-2:dx===0&&dy===0?0:dx===1&&dy===0?2:dx===-1&&dy===1?-1:dx===0&&dy===1?0:1); const ky=(dx===-1&&dy===-1?-1:dx===0&&dy===-1?-2:dx===1&&dy===-1?-1:dx===-1&&dy===0?0:dx===0&&dy===0?0:dx===1&&dy===0?0:dx===-1&&dy===1?1:dx===0&&dy===1?2:1); gx+=kx*L; gy+=ky*L; } } return Math.atan2(gy,gx); }
  const an = Math.max(0, Math.min(1, anisotropyPct/100));
  const str = Math.max(0, Math.min(1, strengthPct/100));
  const useBlend = !!blend;
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const p=(y*w+x)*4; const a=s[p+3]|0; if (a<128){ out[p]=s[p]; out[p+1]=s[p+1]; out[p+2]=s[p+2]; out[p+3]=a; continue; }
      const x0=Math.max(0,x-r), x1=x, x2=Math.min(w-1,x+r);
      const y0=Math.max(0,y-r), y1=y, y2=Math.min(h-1,y+r);
      const regs4=[{x0:x0,y0:y0,x1:x1,y1:y1,ang:135},{x0:x1,y0:y0,x1:x2,y1:y1,ang:45},{x0:x0,y0:y1,x1:x1,y1:y2,ang:-135},{x0:x1,y0:y1,x1:x2,y1:y2,ang:-45}];
      const regs8=regs4.concat([{x0:x0,y0:y0,x1:x2,y1:y1,ang:90},{x0:x1,y0:y0,x1:x2,y1:y2,ang:0},{x0:x0,y0:y1,x1:x2,y1:y2,ang:-90},{x0:x0,y0:y0,x1:x1,y1:y2,ang:180}]);
      const regs = sectors===8?regs8:regs4;
      let mR=s[p], mG=s[p+1], mB=s[p+2];
      let theta=0; if (an>0) theta=sobelTheta(x,y);
      if (!useBlend){
        let best=1e20;
        for (let k=0;k<regs.length;k++){
          const rx0=regs[k].x0, ry0=regs[k].y0, rx1=regs[k].x1, ry1=regs[k].y1;
          const ex0=rx0, ey0=ry0, ex1=rx1+1, ey1=ry1+1;
          const cnt=rect(iC,ex0,ey0,ex1,ey1); if (cnt<=0) continue;
          const sumL=rect(iL,ex0,ey0,ex1,ey1); const sumL2=rect(iL2,ex0,ey0,ex1,ey1);
          const meanL=sumL/cnt; const v=(sumL2/cnt)-meanL*meanL;
          let cost=v;
          if (an>0){ const ang=regs[k].ang*Math.PI/180; let d=theta-ang; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; const wgt=(1-an)+an*Math.max(0, Math.cos(d)); cost=v/(0.0001+wgt); }
          if (cost<best){ best=cost; const sr=rect(iR,ex0,ey0,ex1,ey1); const sg=rect(iG,ex0,ey0,ex1,ey1); const sb=rect(iB,ex0,ey0,ex1,ey1); mR=clampByte((sr/cnt)|0); mG=clampByte((sg/cnt)|0); mB=clampByte((sb/cnt)|0); }
        }
      } else {
        let wr=0, wg=0, wb=0, wSum=0;
        for (let k=0;k<regs.length;k++){
          const rx0=regs[k].x0, ry0=regs[k].y0, rx1=regs[k].x1, ry1=regs[k].y1;
          const ex0=rx0, ey0=ry0, ex1=rx1+1, ey1=ry1+1;
          const cnt=rect(iC,ex0,ey0,ex1,ey1); if (cnt<=0) continue;
          const sumL=rect(iL,ex0,ey0,ex1,ey1); const sumL2=rect(iL2,ex0,ey0,ex1,ey1);
          const meanL=sumL/cnt; const v=(sumL2/cnt)-meanL*meanL;
          let dirW=1; if (an>0){ const ang=regs[k].ang*Math.PI/180; let d=theta-ang; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; dirW=(1-an)+an*Math.max(0, Math.cos(d)); }
          const wgt=dirW/(0.0001+v);
          const sr=rect(iR,ex0,ey0,ex1,ey1), sg=rect(iG,ex0,ey0,ex1,ey1), sb=rect(iB,ex0,ey0,ex1,ey1);
          wr+=wgt*(sr/cnt); wg+=wgt*(sg/cnt); wb+=wgt*(sb/cnt); wSum+=wgt;
        }
        if (wSum>0){ mR=clampByte((wr/wSum)|0); mG=clampByte((wg/wSum)|0); mB=clampByte((wb/wSum)|0); }
      }
      const rS=s[p], gS=s[p+1], bS=s[p+2];
      out[p]=clampByte(rS + str*(mR - rS));
      out[p+1]=clampByte(gS + str*(mG - gS));
      out[p+2]=clampByte(bS + str*(mB - bS));
      out[p+3]=255;
    }
  }
  img.data.set(out); cx.putImageData(img,0,0); return canvas;
}
