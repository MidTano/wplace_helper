import { markElement } from '../wguard/core/dom-utils';

let stream: MediaStream | null = null;
let videoEl: HTMLVideoElement | null = null;
let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;

export function hasStream(): boolean { return !!stream; }
export function getStream(): MediaStream | null { return stream; }

function broadcastStreamState(): void {
  try { (window as any).postMessage({ source: 'wplace-svelte', action: 'screenStreamChanged', has: !!stream }, '*'); } catch {}
}

export function setStream(s: MediaStream | null): void {
  stream = s || null;
  try {
    if (stream) {
      stream.getTracks().forEach((t) => {
        try {
          t.addEventListener('ended', () => {
            try { stopStream(); } catch {}
            try { broadcastStreamState(); } catch {}
          }, { once: true } as any);
        } catch {}
      });
    }
  } catch {}
  broadcastStreamState();
}

export async function ensureVideo(): Promise<boolean> {
  if (!stream) return false;
  try {
    if (!videoEl) {
      videoEl = document.createElement('video');
      try { markElement(videoEl); } catch {}
      videoEl.style.position = 'fixed';
      videoEl.style.left = '-10000px';
      videoEl.style.top = '-10000px';
      videoEl.muted = true;
      (videoEl as any).playsInline = true;
      document.body.appendChild(videoEl);
    }
    if (videoEl.srcObject !== stream) (videoEl as any).srcObject = stream;
    await (videoEl as HTMLVideoElement).play().catch(()=>{});
    if (!videoEl.videoWidth || !videoEl.videoHeight) {
      await new Promise<void>((resolve) => {
        const to = setTimeout(() => resolve(), 800);
        const onMeta = () => { clearTimeout(to); resolve(); };
        (videoEl as HTMLVideoElement).addEventListener('loadedmetadata', onMeta, { once: true } as any);
        (videoEl as HTMLVideoElement).addEventListener('resize', onMeta, { once: true } as any);
      });
    }
    return ((videoEl.videoWidth || 0) > 0) && ((videoEl.videoHeight || 0) > 0);
  } catch { return false; }
}

export function stopStream(): void {
  try { videoEl && (videoEl as HTMLVideoElement).pause(); } catch {}
  if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch {} }
  stream = null;
  if (videoEl) { try { (videoEl as any).srcObject = null; } catch {} try { (videoEl as HTMLElement).remove(); } catch {} videoEl = null; }
  broadcastStreamState();
}

export type Snapshot = { data: ImageData; width: number; height: number } | null;

export function captureScreenSnapshot(): Snapshot {
  if (!videoEl) return null;
  const vw = (videoEl as HTMLVideoElement).videoWidth || 0;
  const vh = (videoEl as HTMLVideoElement).videoHeight || 0;
  if (!vw || !vh) return null;
  if (!canvas || (canvas as any).width !== vw || (canvas as any).height !== vh) {
    try {
      canvas = new OffscreenCanvas(vw, vh);
      ctx = (canvas as OffscreenCanvas).getContext('2d', { willReadFrequently: true } as any) as OffscreenCanvasRenderingContext2D;
    } catch {
      const c = document.createElement('canvas');
      try { markElement(c); } catch {}
      c.width = vw; c.height = vh;
      c.style.position = 'fixed';
      c.style.left = '-10000px';
      c.style.top = '-10000px';
      document.body.appendChild(c);
      canvas = c;
      ctx = (c as HTMLCanvasElement).getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
    }
  }
  try {
    (ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).drawImage(videoEl as HTMLVideoElement, 0, 0, vw, vh);
    const data = (ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).getImageData(0, 0, vw, vh);
    return { data, width: vw, height: vh };
  } catch { return null; }
}

export function snapshotToClient(snapshot: NonNullable<Snapshot>, sx: number, sy: number): [number, number] | null {
  const vw = snapshot.width, vh = snapshot.height;
  if (vw <= 0 || vh <= 0) return null;
  const scaleX = vw / Math.max(1, window.innerWidth);
  const scaleY = vh / Math.max(1, window.innerHeight);
  const cx = sx / Math.max(1e-6, scaleX);
  const cy = sy / Math.max(1e-6, scaleY);
  if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return null;
  return [cx, cy];
}

export function showClickMarker(cx: number, cy: number, color = '#ff8c00'): void {
  const mark = document.createElement('div');
  try { markElement(mark); } catch {}
  mark.style.position = 'fixed';
  mark.style.left = cx + 'px';
  mark.style.top = cy + 'px';
  mark.style.width = '6px';
  mark.style.height = '6px';
  mark.style.margin = '-3px 0 0 -3px';
  mark.style.background = color;
  mark.style.borderRadius = '50%';
  mark.style.boxShadow = '0 0 0 1px #000, 0 0 8px rgba(255,140,0,0.85)';
  mark.style.zIndex = '2147483647';
  mark.style.pointerEvents = 'none';
  mark.style.opacity = '0.95';
  mark.style.transition = 'opacity .5s ease, transform .5s ease';
  document.body.appendChild(mark);
  requestAnimationFrame(()=>{ mark.style.opacity = '0.8'; mark.style.transform = 'scale(1.2)'; });
  setTimeout(()=>{ mark.style.opacity = '0.0'; mark.style.transform = 'scale(0.8)'; }, 800);
  setTimeout(()=>{ try { mark.remove(); } catch {} }, 1400);
}
