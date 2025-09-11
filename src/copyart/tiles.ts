export type CanonicalTile = {
  origin: string;           
  scalePath: string | null; 
  x: number;
  y: number;
  href: string;             
};

export function parseCanonicalTileHref(href: string): CanonicalTile | null {
  try {
    const u = new URL(href, location.href);
    const parts = u.pathname.split('/').filter(Boolean);
    const tilesIdx = parts.findIndex(p => p === 'tiles');
    if (tilesIdx === -1 || tilesIdx + 2 >= parts.length) return null;
    const x = Number(parts[tilesIdx + 1].replace(/\D+/g, ''));
    const y = Number(parts[tilesIdx + 2].replace(/\D+/g, ''));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    let scalePath: string | null = null;
    if (parts[0] === 'files' && /^s\d+$/i.test(parts[1] || '')) {
      scalePath = `/files/${parts[1]}`;
    }
    return { origin: u.origin, scalePath, x, y, href: u.origin + buildPath(scalePath, x, y) };
  } catch { return null; }
}

export function buildPath(scalePath: string | null, x: number, y: number) {
  const segs: string[] = [];
  if (scalePath) segs.push(...scalePath.split('/').filter(Boolean));
  segs.push('tiles', String(x), `${y}.png`);
  return '/' + segs.join('/');
}

export function tileUrlFrom(center: CanonicalTile, x: number, y: number) {
  return center.origin + buildPath(center.scalePath, x, y);
}

export async function fetchImageBitmap(url: string, signal?: AbortSignal): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    const resp = await fetch(url, { cache: 'no-cache', signal });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    try {
      
      const ib = await createImageBitmap(blob);
      return ib;
    } catch {
      const img = new Image();
      img.decoding = 'async';
      img.src = URL.createObjectURL(blob);
      await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
      return img;
    }
  } catch { return null; }
}

export function drawSource(ctx: CanvasRenderingContext2D, src: ImageBitmap|HTMLImageElement, dx: number, dy: number) {
  const w = (src as any).width || (src as any).naturalWidth || 256;
  const h = (src as any).height || (src as any).naturalHeight || 256;
  ctx.drawImage(src as any, dx, dy, w, h);
}
