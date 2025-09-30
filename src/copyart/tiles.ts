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
    } else if (/^s\d+$/i.test(parts[0] || '')) {
      scalePath = `/files/${parts[0]}`;
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
  const origin = (center && center.origin) ? center.origin : location.origin;
  const path = buildPath(center?.scalePath || null, x, y);
  return origin + path;
}

async function fetchWithBackoff(url: string, init: RequestInit & { signal?: AbortSignal } = {}, attempts = 6): Promise<Response | null> {
  let delay = 400;
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = (globalThis as any).__wplace_rawFetch || fetch;
      const resp = await raw(url, {
        ...init,
        cache: init.cache ?? 'force-cache',
        mode: init.mode ?? 'cors',
        credentials: init.credentials ?? 'omit',
        referrerPolicy: (init as any).referrerPolicy ?? 'no-referrer',
        headers: {
          Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
          ...(init.headers || {}) as any,
        },
      } as RequestInit);
      if (resp.ok) return resp;
      const s = resp.status | 0;
      if (s >= 400 && s < 500 && s !== 429) return null;
      const ra = Number(resp.headers.get('Retry-After') || '0');
      const wait = Math.max(delay, ra > 0 ? ra * 1000 : 0);
      await new Promise(r => setTimeout(r, wait));
      delay = Math.min(8000, Math.round(delay * 1.8));
      continue;
    } catch (e) {
      if (init.signal && (init.signal as AbortSignal).aborted) return null;
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(8000, Math.round(delay * 1.8));
      continue;
    }
  }
  return null;
}

export async function fetchImageBitmap(url: string, signal?: AbortSignal): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    async function candidates(u: string): Promise<string[]> {
      const out: string[] = [];
      const push = (v: string) => { if (v && !out.includes(v)) out.push(v); };
      push(u);
      try {
        const m1 = u.match(/\/files\/(s\d+)\/tiles\//i);
        if (m1) push(u.replace(/\/files\/(s\d+)\/tiles\//i, '/$1/tiles/'));
      } catch {}
      try {
        const m2 = u.match(/\/\b(s\d+)\/tiles\//i);
        if (m2) push(u.replace(/\/(s\d+)\/tiles\//i, '/files/$1/tiles/'));
      } catch {}
      try { if (/\/files\/s\d+\/tiles\//i.test(u)) push(u.replace(/\/files\/s\d+\//i, '/')); } catch {}
      try {
        const uu = new URL(u, location.href);
        const isBackend = /(^|\.)backend\.wplace\.live$/i.test(uu.hostname);
        const isMain = /^wplace\.live$/i.test(uu.hostname);
        if (isMain) {
          const alt = new URL(u, location.href);
          alt.hostname = 'backend.wplace.live';
          push(alt.toString());
        } else if (isBackend) {
          const alt = new URL(u, location.href);
          alt.hostname = 'wplace.live';
          push(alt.toString());
        }
      } catch {}
      return out;
    }
    const urls = await candidates(url);
    let blob: Blob | null = null;
    for (let i = 0; i < urls.length; i++) {
      const attempts = i === 0 ? 7 : 1;
      const resp = await fetchWithBackoff(urls[i], { signal }, attempts);
      if (!resp) continue;
      if (!resp.ok) continue;
      blob = await resp.blob();
      if (blob) break;
    }
    if (!blob) return null;
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
