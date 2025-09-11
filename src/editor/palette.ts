export type PaletteMode = 'full' | 'free' | 'custom';

export type RGB = [number, number, number];
export type PaletteColor = { rgb: RGB; name: string; paid: boolean };

export const MASTER_COLORS: PaletteColor[] = [
  { rgb: [0, 0, 0], name: 'Black', paid: false },
  { rgb: [60, 60, 60], name: 'Dark Gray', paid: false },
  { rgb: [120, 120, 120], name: 'Gray', paid: false },
  { rgb: [170, 170, 170], name: 'Medium Gray', paid: true },
  { rgb: [210, 210, 210], name: 'Light Gray', paid: false },
  { rgb: [255, 255, 255], name: 'White', paid: false },
  { rgb: [96, 0, 24], name: 'Deep Red', paid: false },
  { rgb: [165, 14, 30], name: 'Dark Red', paid: false },
  { rgb: [237, 28, 36], name: 'Red', paid: false },
  { rgb: [250, 128, 114], name: 'Light Red', paid: true },
  { rgb: [228, 92, 26], name: 'Dark Orange', paid: true },
  { rgb: [255, 127, 39], name: 'Orange', paid: false },
  { rgb: [246, 170, 9], name: 'Gold', paid: false },
  { rgb: [249, 221, 59], name: 'Yellow', paid: false },
  { rgb: [255, 250, 188], name: 'Light Yellow', paid: false },
  { rgb: [156, 132, 49], name: 'Dark Goldenrod', paid: true },
  { rgb: [197, 173, 49], name: 'Goldenrod', paid: true },
  { rgb: [232, 212, 95], name: 'Light Goldenrod', paid: true },
  { rgb: [74, 107, 58], name: 'Dark Olive', paid: true },
  { rgb: [90, 148, 74], name: 'Olive', paid: true },
  { rgb: [132, 197, 115], name: 'Light Olive', paid: true },
  { rgb: [14, 185, 104], name: 'Dark Green', paid: false },
  { rgb: [19, 230, 123], name: 'Green', paid: false },
  { rgb: [135, 255, 94], name: 'Light Green', paid: false },
  { rgb: [12, 129, 110], name: 'Dark Teal', paid: false },
  { rgb: [16, 174, 166], name: 'Teal', paid: false },
  { rgb: [19, 225, 190], name: 'Light Teal', paid: false },
  { rgb: [15, 121, 159], name: 'Dark Cyan', paid: true },
  { rgb: [96, 247, 242], name: 'Cyan', paid: false },
  { rgb: [187, 250, 242], name: 'Light Cyan', paid: true },
  { rgb: [40, 80, 158], name: 'Dark Blue', paid: false },
  { rgb: [64, 147, 228], name: 'Blue', paid: false },
  { rgb: [125, 199, 255], name: 'Light Blue', paid: true },
  { rgb: [77, 49, 184], name: 'Dark Indigo', paid: true },
  { rgb: [107, 80, 246], name: 'Indigo', paid: false },
  { rgb: [153, 177, 251], name: 'Light Indigo', paid: false },
  { rgb: [74, 66, 132], name: 'Dark Slate Blue', paid: true },
  { rgb: [122, 113, 196], name: 'Slate Blue', paid: true },
  { rgb: [181, 174, 241], name: 'Light Slate Blue', paid: true },
  { rgb: [120, 12, 153], name: 'Dark Purple', paid: false },
  { rgb: [170, 56, 185], name: 'Purple', paid: false },
  { rgb: [224, 159, 249], name: 'Light Purple', paid: false },
  { rgb: [203, 0, 122], name: 'Dark Pink', paid: false },
  { rgb: [236, 31, 128], name: 'Pink', paid: false },
  { rgb: [243, 141, 169], name: 'Light Pink', paid: false },
  { rgb: [155, 82, 73], name: 'Dark Peach', paid: true },
  { rgb: [209, 128, 120], name: 'Peach', paid: true },
  { rgb: [250, 182, 164], name: 'Light Peach', paid: true },
  { rgb: [104, 70, 52], name: 'Dark Brown', paid: false },
  { rgb: [149, 104, 42], name: 'Brown', paid: false },
  { rgb: [219, 164, 99], name: 'Light Brown', paid: true },
  { rgb: [123, 99, 82], name: 'Dark Tan', paid: true },
  { rgb: [156, 132, 107], name: 'Tan', paid: true },
  { rgb: [214, 181, 148], name: 'Light Tan', paid: true },
  { rgb: [209, 128, 81], name: 'Dark Beige', paid: true },
  { rgb: [248, 178, 119], name: 'Beige', paid: false },
  { rgb: [255, 197, 165], name: 'Light Beige', paid: true },
  { rgb: [109, 100, 63], name: 'Dark Stone', paid: true },
  { rgb: [148, 140, 107], name: 'Stone', paid: true },
  { rgb: [205, 197, 158], name: 'Light Stone', paid: true },
  { rgb: [51, 57, 65], name: 'Dark Slate', paid: true },
  { rgb: [109, 117, 141], name: 'Slate', paid: true },
  { rgb: [179, 185, 209], name: 'Light Slate', paid: true },
];

export function getPalette(mode: PaletteMode): RGB[] {
  if (mode === 'free') return MASTER_COLORS.filter(c => !c.paid).map(c => c.rgb as RGB);
  
  return MASTER_COLORS.map(c => c.rgb as RGB);
}

export function quantizeCanvasToPalette(canvas: OffscreenCanvas, palette: RGB[]): OffscreenCanvas {
  const cx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  const pal = palette;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0; 
      continue;
    }
    
    let best = 0; let bestD = 1e12;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (let p = 0; p < pal.length; p++) {
      const pr = pal[p][0], pg = pal[p][1], pb = pal[p][2];
      const dr = r - pr, dg = g - pg, db = b - pb;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = p; }
    }
    const c = pal[best];
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; 
  }
  cx.putImageData(img, 0, 0);
  return canvas;
}


export function getFreeIndices(): number[] {
  const arr: number[] = [];
  for (let i = 0; i < MASTER_COLORS.length; i++) if (!MASTER_COLORS[i].paid) arr.push(i);
  return arr;
}

export function getPaletteFromIndices(indices: number[]): RGB[] {
  const out: RGB[] = [];
  const seen = new Set<number>();
  for (const idx of indices || []) {
    if (idx == null) continue;
    const i = Math.max(0, Math.min(MASTER_COLORS.length - 1, idx | 0));
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(MASTER_COLORS[i].rgb as RGB);
  }
  return out.length ? out : getPalette('free');
}
