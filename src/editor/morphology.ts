export function drawBlackOutline(canvas: OffscreenCanvas, thickness: number): OffscreenCanvas {
  const t = Math.max(0, Math.floor(thickness || 0));
  if (t <= 0) return canvas;
  const w = canvas.width, h = canvas.height;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0, 0, w, h);
  const data = img.data;
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) mask[i] = data[p + 3] >= 128 ? 1 : 0;

  const dil = new Uint8Array(mask);
  const tmp = new Uint8Array(mask.length);
  function dilateOnce() {
    tmp.fill(0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (dil[i]) { tmp[i] = 1; continue; }
        if ((x > 0     && dil[i - 1]) ||
            (x + 1 < w && dil[i + 1]) ||
            (y > 0     && dil[i - w]) ||
            (y + 1 < h && dil[i + w])) tmp[i] = 1;
      }
    }
    dil.set(tmp);
  }
  for (let k = 0; k < t; k++) dilateOnce();

  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dil[i] && !mask[i]) {
        const p = i * 4;
        data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 255;
      }
    }
  }
  cx.putImageData(img, 0, 0);
  return canvas;
}

export function erodeInward(canvas: OffscreenCanvas, amount: number): OffscreenCanvas {
  const a = Math.max(0, Math.floor(amount || 0));
  if (a <= 0) return canvas;
  const w = canvas.width, h = canvas.height;
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0, 0, w, h);
  const data = img.data;
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) mask[i] = data[p + 3] >= 128 ? 1 : 0;

  const er = new Uint8Array(mask);
  const tmp = new Uint8Array(mask.length);
  function erodeOnce() {
    tmp.fill(0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!er[i]) { tmp[i] = 0; continue; }
        
        const okLeft  = (x > 0)     ? er[i - 1] : 0;
        const okRight = (x + 1 < w) ? er[i + 1] : 0;
        const okUp    = (y > 0)     ? er[i - w] : 0;
        const okDown  = (y + 1 < h) ? er[i + w] : 0;
        tmp[i] = (okLeft && okRight && okUp && okDown) ? 1 : 0;
      }
    }
    er.set(tmp);
  }
  for (let k = 0; k < a; k++) erodeOnce();

  
  for (let i = 0, p = 0; i < er.length; i++, p += 4) {
    if (!er[i]) { data[p + 3] = 0; }
  }
  cx.putImageData(img, 0, 0);
  return canvas;
}
