let stream: MediaStream | null = null;
let videoEl: HTMLVideoElement | null = null;
let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;

export function hasStream() { return !!stream; }
export function getStream() { return stream; }
function broadcastStreamState() {
  try { (window as any).postMessage({ source: 'wplace-svelte', action: 'screenStreamChanged', has: !!stream }, '*'); } catch {}
}
export function setStream(s: MediaStream) {
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
      videoEl.style.position = 'fixed';
      videoEl.style.left = '-10000px';
      videoEl.style.top = '-10000px';
      videoEl.muted = true;
      // @ts-ignore
      videoEl.playsInline = true;
      document.body.appendChild(videoEl);
    }
    if (videoEl.srcObject !== stream) videoEl.srcObject = stream;
    await videoEl.play().catch(()=>{});
    
    if (!videoEl.videoWidth || !videoEl.videoHeight) {
      await new Promise<void>((resolve) => {
        const to = setTimeout(() => resolve(), 800);
        const onMeta = () => { clearTimeout(to); resolve(); };
        videoEl!.addEventListener('loadedmetadata', onMeta, { once: true });
        videoEl!.addEventListener('resize', onMeta, { once: true } as any);
      });
    }
    return (videoEl.videoWidth || 0) > 0 && (videoEl.videoHeight || 0) > 0;
  } catch { return false; }
}

export function stopStream() {
  try { videoEl && videoEl.pause(); } catch {}
  if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch {} }
  stream = null;
  if (videoEl) { try { videoEl.srcObject = null; } catch {} try { videoEl.remove(); } catch {} videoEl = null; }
  broadcastStreamState();
}

export type Snapshot = { data: ImageData; width: number; height: number } | null;

export function captureScreenSnapshot(): Snapshot {
  if (!videoEl) return null;
  const vw = videoEl.videoWidth || 0;
  const vh = videoEl.videoHeight || 0;
  if (!vw || !vh) return null;
  if (!canvas || (canvas as any).width !== vw || (canvas as any).height !== vh) {
    try {
      // @ts-ignore
      canvas = new OffscreenCanvas(vw, vh);
      // @ts-ignore
      ctx = (canvas as OffscreenCanvas).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    } catch {
      
      const c = document.createElement('canvas');
      c.width = vw; c.height = vh;
      c.style.position = 'fixed';
      c.style.left = '-10000px';
      c.style.top = '-10000px';
      document.body.appendChild(c);
      canvas = c;
      ctx = c.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
    }
  }
  try {
    (ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).drawImage(videoEl, 0, 0, vw, vh);
    const data = (ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).getImageData(0, 0, vw, vh);
    return { data, width: vw, height: vh };
  } catch { return null; }
}

export function snapshotToClient(snapshot: NonNullable<Snapshot>, sx: number, sy: number): [number, number] | null {
  const vw = snapshot.width, vh = snapshot.height;
  if (vw <= 0 || vh <= 0) return null;
  const scaleX = vw / Math.max(1, window.innerWidth);
  const scaleY = vh / Math.max(1, window.innerHeight);
  const cx = Math.round(sx / Math.max(1e-6, scaleX));
  const cy = Math.round(sy / Math.max(1e-6, scaleY));
  if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return null;
  return [cx, cy];
}

export function showClickMarker(cx: number, cy: number, color = '#ff8c00') {
  const mark = document.createElement('div');
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
