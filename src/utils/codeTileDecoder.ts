import { getFreePalette, QrCoords } from './codeTileEncoder';

export interface DecodedCodeTile {
  fileName: string; 
  coords: QrCoords; 
  dim: number;      
}

function fromBase32(values: number[]): Uint8Array {
  let acc = 0;
  let accBits = 0;
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i] & 31;
    acc = (acc << 5) | v;
    accBits += 5;
    while (accBits >= 8) {
      const b = (acc >> (accBits - 8)) & 255;
      out.push(b);
      accBits -= 8;
    }
  }
  return new Uint8Array(out);
}

function nearestPaletteIndex(rgb: [number, number, number], palette: [number, number, number][], maxSqDist = 30 * 30): number {
  let best = -1;
  let bestD = maxSqDist + 1;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = p[0] - rgb[0];
    const dg = p[1] - rgb[1];
    const db = p[2] - rgb[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = i; if (d === 0) break; }
  }
  return (bestD <= maxSqDist) ? best : -1;
}

export function decodeCodeTile(img: ImageData): DecodedCodeTile | null {
  try {
    const w = img.width|0, h = img.height|0;
    if (w !== h) return null;
    if (w !== 5 && w !== 10 && w !== 15) return null;
    const dim = w;
    const palette = getFreePalette();
    const data = img.data;
    const values: number[] = [];
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const o = (y * dim + x) * 4;
        const r = data[o]|0, g = data[o+1]|0, b = data[o+2]|0, a = data[o+3]|0;
        if (a < 16) { values.push(0); continue; }
        const idx = nearestPaletteIndex([r,g,b], palette);
        if (idx < 0) return null; 
        values.push(idx & 31);
      }
    }
    
    const bytes = fromBase32(values);
    if (!bytes || bytes.length < 9) return null;
    const nameLen = bytes[0] & 0xff;
    if (bytes.length < 1 + 8 + nameLen) return null;
    
    function readLE2(off: number): number { return (bytes[off] | (bytes[off+1] << 8)) & 0xffff; }
    const tx = readLE2(1);
    const ty = readLE2(3);
    const px = readLE2(5);
    const py = readLE2(7);
    const coords: QrCoords = [tx, ty, px, py];
    
    let fname = '';
    for (let i = 0; i < nameLen; i++) fname += String.fromCharCode(bytes[9 + i] & 0xff);
    if (!/\.png$/i.test(fname)) fname += '.png';
    return { fileName: fname, coords, dim };
  } catch {
    return null;
  }
}
