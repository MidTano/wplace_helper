
export function pickPixelRGB(
  editCanvas: HTMLCanvasElement | null | undefined,
  px: number,
  py: number
): [number, number, number] | null {
  try {
    if (!editCanvas) return null;
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const d = ctx.getImageData(px, py, 1, 1).data;
    return [d[0] | 0, d[1] | 0, d[2] | 0];
  } catch {
    return null;
  }
}

export function nearestPaletteColor(
  palette: number[][],
  rgb: number[]
): [number, number, number] {
  try {
    if (!palette || palette.length === 0) return [rgb[0] | 0, rgb[1] | 0, rgb[2] | 0];
    let best = palette[0];
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of palette) {
      const dr = ((p[0] | 0) - (rgb[0] | 0));
      const dg = ((p[1] | 0) - (rgb[1] | 0));
      const db = ((p[2] | 0) - (rgb[2] | 0));
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = p; }
    }
    return [best[0] | 0, best[1] | 0, best[2] | 0];
  } catch {
    return [rgb[0] | 0, rgb[1] | 0, rgb[2] | 0];
  }
}
