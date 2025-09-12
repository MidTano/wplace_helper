export type StencilCoords = [number, number, number, number]; 
import { MASTER_COLORS, type RGB } from '../editor/palette';

export default class stencil {
  displayName: string;
  sortID: number;
  file: File | Blob;
  coords: StencilCoords;
  tileSize: number;
  scaleMult: number = 3;
  
  chunked: Record<string, ImageBitmap> = {};
  tilePrefixes: Set<string> = new Set();
  totalDots: number = 0; 

  constructor({
    displayName = 'My template',
    sortID = 0,
    file,
    coords,
    tileSize = 1000,
    scaleMult = 3,
  }: {
    displayName?: string;
    sortID?: number;
    file: File | Blob;
    coords: StencilCoords;
    tileSize?: number;
    scaleMult?: number;
  }) {
    this.displayName = displayName;
    this.sortID = sortID;
    this.file = file;
    this.coords = coords;
    this.tileSize = tileSize;
    this.scaleMult = scaleMult;
  }


  async buildTileSegments(opts?: { enhanced?: boolean }): Promise<Record<string, ImageBitmap>> {
    const block = Math.max(1, Math.floor(this.scaleMult)); 
    const center = Math.floor(block / 2); 
    const bmp = await createImageBitmap(this.file);
    const w = bmp.width;
    const h = bmp.height;
    this.totalDots = 0; 

    const canvas = new OffscreenCanvas(this.tileSize, this.tileSize);
    const cx = canvas.getContext('2d', { willReadFrequently: true })!;
    cx.imageSmoothingEnabled = false;

    const out: Record<string, ImageBitmap> = {};

    
    for (let sy = this.coords[3]; sy < h + this.coords[3]; ) {
      const pickH = Math.min(this.tileSize - (sy % this.tileSize), h - (sy - this.coords[3]));
      
      for (let sx = this.coords[2]; sx < w + this.coords[2]; ) {
        const pickW = Math.min(this.tileSize - (sx % this.tileSize), w - (sx - this.coords[2]));

        const cw = pickW * block;
        const ch = pickH * block;
        canvas.width = cw;
        canvas.height = ch;

        cx.clearRect(0, 0, cw, ch);
        
        cx.drawImage(
          bmp,
          sx - this.coords[2],
          sy - this.coords[3],
          pickW,
          pickH,
          0,
          0,
          cw,
          ch
        );

        
        const img = cx.getImageData(0, 0, cw, ch);
        const data = img.data;
        const enhanced = !!opts?.enhanced;
        const palMaster: RGB[] = MASTER_COLORS.map(c => c.rgb as RGB);
        const M = palMaster.length;
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const i = (y * cw + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r === 222 && g === 250 && b === 206) {
              
              if (((x + y) & 1) === 0) {
                data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
              } else {
                data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
              }
              data[i + 3] = 32;
            } else {
              
              if ((x % block) !== center || (y % block) !== center) {
                data[i + 3] = 0;
                continue;
              }
              
            }
          }
        }
        
        
        let segDots = 0;
        for (let k = 3; k < data.length; k += 4) {
          if (data[k] >= 5) segDots++;
        }
        this.totalDots += segDots;
        cx.putImageData(img, 0, 0);

        const key = `${(this.coords[0] + Math.floor(sx / 1000)).toString().padStart(4, '0')},${(this.coords[1] + Math.floor(sy / 1000)).toString().padStart(4, '0')},${(sx % 1000).toString().padStart(3, '0')},${(sy % 1000).toString().padStart(3, '0')}`;
        const seg = await createImageBitmap(canvas);
        out[key] = seg;
        this.tilePrefixes.add(key.split(',').slice(0, 2).join(','));

        sx += pickW;
      }
      sy += pickH;
    }

    this.chunked = out;
    return out;
  }
}
