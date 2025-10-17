import { markElement } from './dom-utils';

async function generateCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    markElement(canvas);
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial, Verdana, sans-serif';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('WGuard<=>1234567890', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('abcdefghijklmnopqrstuvwxyz', 4, 25);
    
    return canvas.toDataURL().slice(-100);
  } catch {
    return 'canvas-error';
  }
}

async function generateWebGLFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    markElement(canvas);
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    return `${vendor}|${renderer}`.slice(0, 100);
  } catch {
    return 'webgl-error';
  }
}

function getScreenFingerprint(): string {
  return [
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    window.devicePixelRatio,
    screen.availWidth,
    screen.availHeight
  ].join('|');
}

function getNavigatorFingerprint(): string {
  return [
    navigator.language,
    navigator.languages?.join(','),
    navigator.platform,
    navigator.hardwareConcurrency,
    navigator.maxTouchPoints,
    navigator.vendor
  ].join('|');
}

function getTimezoneFingerprint(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    return `${tz}|${offset}`;
  } catch {
    return 'tz-error';
  }
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateEnvironmentFingerprint(): Promise<string> {
  const parts = [
    await generateCanvasFingerprint(),
    await generateWebGLFingerprint(),
    getScreenFingerprint(),
    getNavigatorFingerprint(),
    getTimezoneFingerprint()
  ];
  
  const combined = parts.join('::');
  return await sha256(combined);
}
