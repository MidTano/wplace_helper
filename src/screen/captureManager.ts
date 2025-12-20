import { markElement } from '../wguard/core/dom-utils';
import { getAutoConfig } from './autoConfig';

const scratchCache: { canvas: OffscreenCanvas | HTMLCanvasElement | null; ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null } = { canvas: null, ctx: null };
let lastSnapshot: Snapshot = null;
let lastSnapshotTs = 0;
let captureStream: MediaStream | null = null;
let captureVideo: HTMLVideoElement | null = null;
let displayStream: MediaStream | null = null;
let displayVideo: HTMLVideoElement | null = null;

function attachEndHandlers(stream: MediaStream | null): void {
  try {
    if (!stream || !stream.getTracks) return;
    const tracks = stream.getTracks();
    if (!Array.isArray(tracks)) return;
    for (const t of tracks) {
      try {
        t.removeEventListener('ended', resetCaptureState);
        t.addEventListener('ended', resetCaptureState, { once: true });
      } catch {}
    }
  } catch {}
}

function getMapCanvas(): HTMLCanvasElement | null {
  const c = document.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement | null;
  return c || null;
}

export function hasStream(): boolean {
  try {
    const cfg = getAutoConfig();
    const method = cfg?.captureMethod || 'canvas';
    if (method === 'canvas') {
      const canvas = getMapCanvas();
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        return true;
      }
      return !!captureStream;
    }
    if (method === 'display') {
      return !!displayStream;
    }
  } catch {}
  return !!(displayStream || captureStream);
}
export function getStream(): MediaStream | null { return displayStream || captureStream; }
export function setStream(s: MediaStream | null): void {
  try { lastSnapshot = null; lastSnapshotTs = 0; } catch {}
  if (!s) {
    resetCaptureState();
    broadcastStreamState();
    return;
  }
  displayStream = s;
  try {
    attachEndHandlers(displayStream);
    if (!displayVideo) {
      const v = document.createElement('video');
      try { markElement(v); } catch {}
      v.muted = true;
      (v as any).playsInline = true;
      v.style.position = 'fixed';
      v.style.left = '-10000px';
      v.style.top = '-10000px';
      v.srcObject = displayStream;
      document.body.appendChild(v);
      displayVideo = v;
    } else {
      try { (displayVideo as any).srcObject = displayStream; } catch {}
    }
    try { (displayVideo as HTMLVideoElement).play().catch(()=>{}); } catch {}
  } catch {}
  broadcastStreamState();
}

function broadcastStreamState(): void {
  try { (window as any).postMessage({ source: 'wplace-svelte', action: 'screenStreamChanged', has: hasStream() }, '*'); } catch {}
}

export async function ensureVideo(): Promise<boolean> {
  const cfg = getAutoConfig();
  const captureMethod = cfg?.captureMethod || 'canvas';
  
  if (captureMethod === 'display') {
    return await ensureDisplayVideo();
  }
  
  const c = getMapCanvas();
  const ok = !!c && c.width > 0 && c.height > 0;
  if (ok) broadcastStreamState();
  if (!ok) return false;
  try {
    if (!captureStream && typeof (c as any).captureStream === 'function') {
      captureStream = (c as any).captureStream(30);
    }
    if (captureStream) {
      if (!captureVideo) {
        const v = document.createElement('video');
        try { markElement(v); } catch {}
        v.muted = true;
        (v as any).playsInline = true;
        v.style.position = 'fixed';
        v.style.left = '-10000px';
        v.style.top = '-10000px';
        v.srcObject = captureStream;
        document.body.appendChild(v);
        captureVideo = v;
      }
      try {
        if (captureVideo && captureVideo.srcObject !== captureStream) (captureVideo as any).srcObject = captureStream;
      } catch {}
      try { await (captureVideo as HTMLVideoElement).play(); } catch {}
    }
  } catch {}
  return true;
}

async function ensureDisplayVideo(): Promise<boolean> {
  try {
    if (!displayStream) {
      const req1: any = {
        video: { frameRate: 5 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'include',
        systemAudio: 'exclude',
        monitorTypeSurfaces: 'include',
      };
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia(req1 as any);
      } catch {
        const req2: any = {
          video: { frameRate: 5 },
          audio: false
        };
        displayStream = await navigator.mediaDevices.getDisplayMedia(req2 as any);
      }
    }
    
    if (!displayVideo) {
      const v = document.createElement('video');
      try { markElement(v); } catch {}
      v.muted = true;
      (v as any).playsInline = true;
      v.style.position = 'fixed';
      v.style.left = '-10000px';
      v.style.top = '-10000px';
      v.srcObject = displayStream;
      document.body.appendChild(v);
      displayVideo = v;
    }
    
    try {
      await (displayVideo as HTMLVideoElement).play();
    } catch {}
    
    return true;
  } catch {
    return false;
  }
}

export function resetCaptureState(): void {
  try { lastSnapshot = null; } catch {}
  try { lastSnapshotTs = 0; } catch {}
  try {
    if (captureVideo) {
      try { captureVideo.pause(); } catch {}
      try { (captureVideo as any).srcObject = null; } catch {}
      try { captureVideo.remove(); } catch {}
    }
  } catch {}
  try {
    if (displayVideo) {
      try { displayVideo.pause(); } catch {}
      try { (displayVideo as any).srcObject = null; } catch {}
      try { displayVideo.remove(); } catch {}
    }
  } catch {}
  try {
    if (captureStream) {
      try {
        const tracks = (captureStream as any).getTracks ? (captureStream as any).getTracks() : [];
        if (Array.isArray(tracks)) {
          for (const t of tracks) {
            try { t.stop && t.stop(); } catch {}
          }
        }
      } catch {}
    }
  } catch {}
  try {
    if (displayStream) {
      try {
        const tracks = (displayStream as any).getTracks ? (displayStream as any).getTracks() : [];
        if (Array.isArray(tracks)) {
          for (const t of tracks) {
            try { t.stop && t.stop(); } catch {}
          }
        }
      } catch {}
    }
  } catch {}
  try { captureStream = null; } catch {}
  try { captureVideo = null; } catch {}
  try { displayStream = null; } catch {}
  try { displayVideo = null; } catch {}
  try { broadcastStreamState(); } catch {}
}

export function clearSnapshotCache(): void {
  try { lastSnapshot = null; } catch {}
  try { lastSnapshotTs = 0; } catch {}
}

export function stopStream(): void {
  resetCaptureState();
}

export type Snapshot = { data: ImageData; width: number; height: number; rect: DOMRectReadOnly } | null;

export function captureScreenSnapshot(): Snapshot {
  const now = Date.now();
  if (lastSnapshot && (now - lastSnapshotTs) < 120) return lastSnapshot;
  const snap = captureScreenSnapshotInternal();
  if (snap) {
    lastSnapshot = snap;
    lastSnapshotTs = now;
  }
  return snap;
}

function captureScreenSnapshotInternal(): Snapshot {
  const cfg = getAutoConfig();
  const captureMethod = cfg?.captureMethod || 'canvas';
  
  if (captureMethod === 'display') {
    return captureDisplaySnapshot();
  }
  
  const src = getMapCanvas();
  if (!src) return null;
  let w = src.width | 0;
  let h = src.height | 0;
  if (w <= 0 || h <= 0) return null;
  if (!scratchCache.canvas || (scratchCache.canvas as any).width !== w || (scratchCache.canvas as any).height !== h) {
    try {
      scratchCache.canvas = new OffscreenCanvas(w, h);
      scratchCache.ctx = (scratchCache.canvas as OffscreenCanvas).getContext('2d', { willReadFrequently: true } as any) as OffscreenCanvasRenderingContext2D;
    } catch {
      const c2 = document.createElement('canvas');
      try { markElement(c2); } catch {}
      c2.width = w; c2.height = h;
      c2.style.position = 'fixed';
      c2.style.left = '-10000px';
      c2.style.top = '-10000px';
      document.body.appendChild(c2);
      scratchCache.canvas = c2;
      scratchCache.ctx = (c2 as HTMLCanvasElement).getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
    }
  }
  try {
    const ctx2d = scratchCache.ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx2d.clearRect(0, 0, w, h);
    try {
      try {
        const gl = src.getContext('webgl2') || src.getContext('webgl');
        if (gl) {
          try { gl.bindFramebuffer(gl.FRAMEBUFFER, null); } catch {}
          try { gl.finish?.(); } catch {}
        }
      } catch {}

      try {
        ctx2d.drawImage(src, 0, 0, w, h);
      } catch {
      if (!captureStream && typeof (src as any).captureStream === 'function') {
        captureStream = (src as any).captureStream(30);
      }
      if (captureStream) {
        if (!captureVideo) {
          const v = document.createElement('video');
          try { markElement(v); } catch {}
          v.muted = true;
          (v as any).playsInline = true;
          v.style.position = 'fixed';
          v.style.left = '-10000px';
          v.style.top = '-10000px';
          v.srcObject = captureStream;
          document.body.appendChild(v);
          captureVideo = v;
        }
        try {
          if (captureVideo && captureVideo.srcObject !== captureStream) (captureVideo as any).srcObject = captureStream;
          (captureVideo as HTMLVideoElement).play().catch(()=>{});
        } catch {}
        const vw = (captureVideo as HTMLVideoElement).videoWidth || 0;
        const vh = (captureVideo as HTMLVideoElement).videoHeight || 0;
        if (vw > 0 && vh > 0) {
          if (vw !== w || vh !== h) {
            w = vw; h = vh;
            try {
              if (scratchCache.canvas) { (scratchCache.canvas as any).width = w; (scratchCache.canvas as any).height = h; }
            } catch {}
          }
          ctx2d.clearRect(0, 0, w, h);
          ctx2d.drawImage(captureVideo as HTMLVideoElement, 0, 0, w, h);
        } else {
          ctx2d.drawImage(src, 0, 0, w, h);
        }
      } else {
        ctx2d.drawImage(src, 0, 0, w, h);
      }
      }
    } catch {
      ctx2d.drawImage(src, 0, 0, w, h);
    }
    let data: ImageData | null = null;
    try { data = ctx2d.getImageData(0, 0, w, h); } catch {}

    const alphaExists = (d: ImageData | null): boolean => {
      if (!d || !d.data || d.data.length < 4) return false;
      const arr = d.data;
      const totalPx = Math.max(1, Math.floor(arr.length / 4));
      const step = Math.max(1, Math.floor(totalPx / 4000));
      for (let i = 0; i < totalPx; i += step) {
        if (arr[i * 4 + 3] !== 0) return true;
      }
      return false;
    };

    if (!alphaExists(data)) {
      try {
        const gl = src.getContext('webgl2') || src.getContext('webgl');
        if (gl) {
          try { gl.bindFramebuffer(gl.FRAMEBUFFER, null); } catch {}
          try { gl.finish?.(); } catch {}
          const buf = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          const flipped = new Uint8ClampedArray(w * h * 4);
          for (let y = 0; y < h; y++) {
            const srcOff = y * w * 4;
            const dstOff = (h - 1 - y) * w * 4;
            flipped.set(buf.subarray(srcOff, srcOff + w * 4), dstOff);
          }
          data = new ImageData(flipped, w, h);
        }
      } catch {}
    }

    if (!alphaExists(data)) {
      try {
        const url = src.toDataURL('image/png');
        const img = new Image();
        try { markElement(img); } catch {}
        img.src = url;
        ctx2d.clearRect(0, 0, w, h);
        ctx2d.drawImage(img, 0, 0, w, h);
        data = ctx2d.getImageData(0, 0, w, h);
      } catch {}
    }

    if (!alphaExists(data)) {
      try {
        if (!captureStream && typeof (src as any).captureStream === 'function') {
          captureStream = (src as any).captureStream(30);
        }
        if (captureStream) {
          if (!captureVideo) {
            const v = document.createElement('video');
            try { markElement(v); } catch {}
            v.muted = true;
            (v as any).playsInline = true;
            v.style.position = 'fixed';
            v.style.left = '-10000px';
            v.style.top = '-10000px';
            v.srcObject = captureStream;
            document.body.appendChild(v);
            captureVideo = v;
          }
          try {
            if (captureVideo && captureVideo.srcObject !== captureStream) (captureVideo as any).srcObject = captureStream;
            (captureVideo as HTMLVideoElement).play().catch(()=>{});
          } catch {}
          const vw = (captureVideo as HTMLVideoElement).videoWidth || w;
          const vh = (captureVideo as HTMLVideoElement).videoHeight || h;
          if (vw > 0 && vh > 0) {
            ctx2d.clearRect(0, 0, w, h);
            ctx2d.drawImage(captureVideo as HTMLVideoElement, 0, 0, w, h);
            data = ctx2d.getImageData(0, 0, w, h);
          }
        }
      } catch {}
    }

    if (!alphaExists(data)) {
      try {
        const arr = data?.data;
        if (arr) { for (let i = 3; i < arr.length; i += 4) arr[i] = 255; }
      } catch {}
    }
    if (!data) return null;
    const rect = src.getBoundingClientRect();
    return { data, width: w, height: h, rect };
  } catch { return null; }
}

function captureDisplaySnapshot(): Snapshot {
  if (!displayVideo) return null;
  
  const vw = displayVideo.videoWidth || 0;
  const vh = displayVideo.videoHeight || 0;
  if (vw <= 0 || vh <= 0) return null;
  
  const w = vw;
  const h = vh;
  
  if (!scratchCache.canvas || (scratchCache.canvas as any).width !== w || (scratchCache.canvas as any).height !== h) {
    try {
      scratchCache.canvas = new OffscreenCanvas(w, h);
      scratchCache.ctx = (scratchCache.canvas as OffscreenCanvas).getContext('2d', { willReadFrequently: true } as any) as OffscreenCanvasRenderingContext2D;
    } catch {
      const c2 = document.createElement('canvas');
      try { markElement(c2); } catch {}
      c2.width = w; c2.height = h;
      c2.style.position = 'fixed';
      c2.style.left = '-10000px';
      c2.style.top = '-10000px';
      document.body.appendChild(c2);
      scratchCache.canvas = c2;
      scratchCache.ctx = (c2 as HTMLCanvasElement).getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
    }
  }
  
  try {
    const ctx2d = scratchCache.ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.drawImage(displayVideo, 0, 0, w, h);
    const data = ctx2d.getImageData(0, 0, w, h);
    
    const rect = getMapCanvas()?.getBoundingClientRect() || { left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => {} };
    return { data, width: w, height: h, rect };
  } catch { return null; }
}

export function snapshotToClient(snapshot: NonNullable<Snapshot>, sx: number, sy: number): [number, number] | null {
  const vw = snapshot.width, vh = snapshot.height;
  if (vw <= 0 || vh <= 0) return null;
  const rect = snapshot.rect;
  const scaleX = rect.width / Math.max(1, vw);
  const scaleY = rect.height / Math.max(1, vh);
  const cx = rect.left + sx * scaleX;
  const cy = rect.top + sy * scaleY;
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
