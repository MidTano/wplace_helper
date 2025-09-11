import { MASTER_COLORS } from '../editor/palette';

export type QrCoords = [number, number, number, number]; 

export function getFreePalette(): [number, number, number][] {
  const free = MASTER_COLORS.filter(c => !c.paid).map(c => c.rgb);
  if (free.length < 32) {
    
    while (free.length < 32) free.push(free[free.length - 1] || [0,0,0]);
  }
  return free.slice(0, 32) as any;
}

function toBytesLE(num: number, bytes: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < bytes; i++) out.push((num >> (8 * i)) & 0xff);
  return out;
}

function asciiBytes(s: string): number[] {
  const arr: number[] = [];
  for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i) & 0xff);
  return arr;
}

function packPayload(fileName: string, coords: QrCoords): Uint8Array {
  const [tx, ty, px, py] = coords.map(n => Math.max(0, Math.floor(Number(n) || 0))) as QrCoords;
  
  let f = String(fileName || '');
  if (/\.png$/i.test(f)) f = f.replace(/\.png$/i, '');
  f = f.slice(0, 80);
  const bytes: number[] = [];
  
  bytes.push(f.length & 0xff);
  
  bytes.push(...toBytesLE(tx, 2), ...toBytesLE(ty, 2), ...toBytesLE(px, 2), ...toBytesLE(py, 2));
  
  bytes.push(...asciiBytes(f));
  return new Uint8Array(bytes);
}

function bytesToBase32(data: Uint8Array): number[] {
  
  const out: number[] = [];
  let acc = 0, accBits = 0;
  for (let i = 0; i < data.length; i++) {
    acc = (acc << 8) | data[i];
    accBits += 8;
    while (accBits >= 5) {
      const v = (acc >> (accBits - 5)) & 31;
      out.push(v);
      accBits -= 5;
    }
  }
  if (accBits > 0) {
    const v = (acc << (5 - accBits)) & 31;
    out.push(v);
  }
  return out;
}

function chooseDim(cellsNeeded: number): number {
  if (cellsNeeded <= 25) return 5;
  if (cellsNeeded <= 100) return 10;
  if (cellsNeeded <= 225) return 15;
  
  const n = Math.ceil(Math.sqrt(cellsNeeded));
  return n;
}

export async function buildCodeCanvas(fileName: string, coords: QrCoords): Promise<HTMLCanvasElement> {
  const payload = packPayload(fileName, coords);
  const base32 = bytesToBase32(payload);
  const dim = chooseDim(base32.length);
  const palette = getFreePalette();
  const cvs = document.createElement('canvas');
  cvs.width = dim; cvs.height = dim;
  const ctx = cvs.getContext('2d', { willReadFrequently: true })!;
  
  const bg = palette[0];
  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  ctx.fillRect(0, 0, dim, dim);
  
  for (let i = 0; i < base32.length; i++) {
    const x = i % dim; const y = Math.floor(i / dim);
    if (y >= dim) break;
    const rgb = palette[base32[i] & 31];
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return cvs;
}
