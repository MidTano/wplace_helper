import { getSelectedFile, setSelectedFile, getOriginCoords, setOriginCoords, rebuildStencilFromState, setMoveMode } from '../overlay/state';
import { uploadToCatbox, fileNameFromUrl } from '../utils/catbox';
import { addOrUpdate } from '../topmenu/historyStore';
import { setCurrentHistoryId } from '../overlay/state';
import { t } from '../i18n';

type Cam = { lng: number; lat: number; zoom: number };

let copyJobId = 0;
let pasteJobId = 0;

function readLocation(): Cam | null {
  try {
    const raw = localStorage.getItem('location');
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.lng === 'number' && typeof v.lat === 'number') {
      return { lng: v.lng, lat: v.lat, zoom: typeof v.zoom === 'number' ? v.zoom : 14 };
    }
  } catch {}
  return null;
}

function writeLocation(cam: Cam) {
  try { localStorage.setItem('location', JSON.stringify({ lng: cam.lng, lat: cam.lat, zoom: cam.zoom })); } catch {}
}

async function writeClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); return; } catch {}
  try { localStorage.setItem('wplace:share_clipboard', text); } catch {}
}

async function readClipboard(): Promise<string> {
  try { const t = await navigator.clipboard.readText(); if (t) return t; } catch {}
  try { return localStorage.getItem('wplace:share_clipboard') || ''; } catch {}
  return '';
}

async function downloadBlob(url: string): Promise<Blob | null> {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.blob(); } catch { return null; }
}

async function ensureImageDecoded(blob: Blob): Promise<void> {
  try {
    const anyWin: any = window as any;
    if (anyWin && typeof anyWin.createImageBitmap === 'function') {
      const bmp = await createImageBitmap(blob);
      try { (bmp as any).close && (bmp as any).close(); } catch {}
      return;
    }
  } catch {}
  await new Promise<void>((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { try { URL.revokeObjectURL(url); } catch {}; resolve(); };
      img.onerror = () => { try { URL.revokeObjectURL(url); } catch {}; resolve(); };
      img.src = url;
    } catch { resolve(); }
  });
}

async function doCopy() {
  const job = ++copyJobId;
  const origin = getOriginCoords();
  const cam = readLocation();
  let url = '';
  let name = '';
  const file = getSelectedFile();
  let closer: (() => void) | null = null;
  if (file) {
    closer = showCenterNotice(t('share.toast.uploading'), 0);
  }
  if (file) {
    try {
      url = await uploadToCatbox(file as Blob, (file as any).name || 'image.png');
      name = fileNameFromUrl(url);
    } catch {}
    if (closer) { try { closer(); } catch {} closer = null; }
    if (job !== copyJobId) return;
  }
  if (url) {
    closer = showCenterNotice(t('share.toast.verifying'), 0);
    try {
      const b = await downloadBlob(url);
      if (b) { await ensureImageDecoded(b); }
      if (!b) { if (closer) { try { closer(); } catch {} } showCenterNotice(t('share.toast.error')); return; }
      if (job !== copyJobId) { if (closer) { try { closer(); } catch {} } return; }
      const size = (b.size | 0);
      const sha = await sha256Hex(b);
      if (job !== copyJobId) { if (closer) { try { closer(); } catch {} } return; }
      const payload: any = { type: 'wplace_share_v1', ts: Date.now() };
      if (url) payload.img = { url, name, size, sha256: sha };
      if (origin && origin.length >= 4) payload.origin = [origin[0]|0, origin[1]|0, origin[2]|0, origin[3]|0];
      if (cam) payload.camera = cam;
      const share = buildShareText(payload);
      await writeClipboard(share);
      if (closer) { try { closer(); } catch {} closer = null; }
      showCenterNotice(`${t('share.header.title')}
${t('share.toast.copied')}`, 4400, url || undefined);
      return;
    } catch {}
    if (closer) { try { closer(); } catch {} closer = null; }
  }
  const payload: any = { type: 'wplace_share_v1', ts: Date.now() };
  if (url) payload.img = { url, name };
  if (origin && origin.length >= 4) payload.origin = [origin[0]|0, origin[1]|0, origin[2]|0, origin[3]|0];
  if (cam) payload.camera = cam;
  const share = buildShareText(payload);
  await writeClipboard(share);
  showCenterNotice(`${t('share.header.title')}
${t('share.toast.copied')}`, 4400, url || undefined);
}

async function doPaste() {
  const job = ++pasteJobId;
  const raw = await readClipboard();
  let p: any = null;
  try { p = JSON.parse(raw); } catch {}
  if (!p) { try { p = extractSharedJson(raw); } catch {} }
  if (!p || p.type !== 'wplace_share_v1') return;
  if (p.img && p.img.url) {
    const expectedSha = (p.img && typeof p.img.sha256 === 'string') ? String(p.img.sha256) : '';
    const expectedSize = (p.img && typeof p.img.size === 'number') ? (p.img.size|0) : 0;
    let b: Blob | null = null;
    for (let i = 0; i < 3; i++) {
      const base = String(p.img.url);
      const u = i === 0 ? base : `${base}${base.includes('?') ? '&' : '?'}r=${Date.now()}`;
      b = await downloadBlob(u);
      if (!b) continue;
      if (expectedSize && (b.size|0) !== expectedSize) { b = null; continue; }
      if (expectedSha) {
        const gotSha = await sha256Hex(b);
        if (gotSha !== expectedSha) { b = null; continue; }
      }
      break;
    }
    if (b) {
      try {
        await ensureImageDecoded(b);
        if (job !== pasteJobId) return;
        const f = new File([b], String(p.img.name || 'image.png'), { type: b.type || 'image/png' });
        setSelectedFile(f);
        try {
          const meta = await addOrUpdate(f, String(p.img.name || 'image.png'), Array.isArray(p.origin) && p.origin.length >= 4 ? [p.origin[0]|0, p.origin[1]|0, p.origin[2]|0, p.origin[3]|0] : null);
          try { setCurrentHistoryId(meta?.id || null); } catch {}
        } catch {}
      } catch {
        setSelectedFile(b);
        try {
          const meta = await addOrUpdate(b, String(p.img?.name || 'image.png'), Array.isArray(p.origin) && p.origin.length >= 4 ? [p.origin[0]|0, p.origin[1]|0, p.origin[2]|0, p.origin[3]|0] : null);
          try { setCurrentHistoryId(meta?.id || null); } catch {}
        } catch {}
      }
    } else {
      showCenterNotice(t('share.toast.error'));
      return;
    }
  }
  if (Array.isArray(p.origin) && p.origin.length >= 4) {
    setOriginCoords([p.origin[0]|0, p.origin[1]|0, p.origin[2]|0, p.origin[3]|0]);
  }
  try { await rebuildStencilFromState(); } catch {}
  try { setMoveMode(true); } catch {}
  showCenterNotice(t('share.toast.ready'));
  if (p.camera && typeof p.camera.lng === 'number' && typeof p.camera.lat === 'number') {
    writeLocation({ lng: Number(p.camera.lng), lat: Number(p.camera.lat), zoom: Number(p.camera.zoom||14) });
    setTimeout(() => { try { location.reload(); } catch {} }, 650);
  }
}

function buildShareText(p: any): string {
  const lines: string[] = [];
  lines.push(t('share.header.title'));
  lines.push('https://github.com/MidTano/wplace_helper');
  lines.push('');
  lines.push(t('share.instructions.title'));
  lines.push(`- ${t('share.instructions.step.download')}`);
  lines.push(`- ${t('share.instructions.step.open')}`);
  lines.push(`- ${t('share.instructions.step.hotkeys')}`);
  lines.push('');
  lines.push(t('share.data.title'));
  const json = JSON.stringify(p);
  lines.push('```json');
  lines.push(json);
  lines.push('```');
  return lines.join('\n');
}

function extractSharedJson(text: string): any | null {
  if (!text) return null;
  let body = '';
  const codeStart = text.indexOf('```');
  if (codeStart >= 0) {
    const after = text.slice(codeStart + 3);
    const next = after.indexOf('```');
    if (next >= 0) body = after.slice(after.indexOf('\n') >= 0 ? after.indexOf('\n') + 1 : 0, next).trim();
  }
  if (!body) {
    const i = text.indexOf('{');
    const j = text.lastIndexOf('}');
    if (i >= 0 && j >= i) body = text.slice(i, j + 1);
  }
  if (!body) return null;
  try { return JSON.parse(body); } catch { return null; }
}

async function sha256Hex(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer();
    const d = await crypto.subtle.digest('SHA-256', buf);
    const u8 = new Uint8Array(d);
    let s = '';
    for (let i = 0; i < u8.length; i++) { s += u8[i].toString(16).padStart(2, '0'); }
    return s;
  } catch { return ''; }
}

function showCenterNotice(msg: string, ms = 2200, imageUrl?: string): () => void {
  try {
    const isPersistent = ms <= 0;
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.top = '0';
    wrap.style.width = '100%';
    wrap.style.height = '100%';
    wrap.style.zIndex = '2147483647';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.pointerEvents = 'none';
    const style = document.createElement('style');
    style.textContent = '@keyframes _w_spin{to{transform:rotate(360deg)}}';
    wrap.appendChild(style);
    const box = document.createElement('div');
    box.style.background = 'rgba(20,20,24,0.96)';
    box.style.color = '#fff';
    box.style.padding = '16px 18px';
    box.style.borderRadius = '12px';
    box.style.border = '1px solid rgba(255,255,255,0.14)';
    box.style.boxShadow = '0 10px 28px rgba(0,0,0,0.45)';
    box.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif';
    box.style.fontSize = '14px';
    box.style.maxWidth = '80%';
    box.style.textAlign = 'center';
    box.style.pointerEvents = 'auto';
    box.style.transform = 'translateY(6px) scale(0.96)';
    box.style.opacity = '0';
    box.style.transition = 'transform .16s ease, opacity .16s ease';
    if (imageUrl) {
      const cont = document.createElement('div');
      cont.style.display = 'grid';
      cont.style.gridTemplateColumns = 'auto 1fr';
      cont.style.gap = '12px';
      cont.style.alignItems = 'center';
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'preview';
      img.style.width = '160px';
      img.style.height = 'auto';
      img.style.maxHeight = '40vh';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid rgba(255,255,255,0.12)';
      img.style.objectFit = 'contain';
      img.style.background = '#0f0f12';
      img.style.opacity = '0';
      img.style.transition = 'opacity .18s ease';
      img.onload = () => { try { img.style.opacity = '1'; } catch {} };
      const text = document.createElement('div');
      text.style.whiteSpace = 'pre-line';
      text.textContent = msg;
      cont.appendChild(img);
      cont.appendChild(text);
      box.appendChild(cont);
    } else if (isPersistent) {
      const cont = document.createElement('div');
      cont.style.display = 'grid';
      cont.style.gridTemplateColumns = 'auto 1fr';
      cont.style.gap = '10px';
      cont.style.alignItems = 'center';
      const spinner = document.createElement('div');
      spinner.style.width = '16px';
      spinner.style.height = '16px';
      spinner.style.border = '2px solid rgba(255,255,255,0.24)';
      spinner.style.borderTopColor = '#f05123';
      spinner.style.borderRightColor = '#f05123';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = '_w_spin .9s linear infinite';
      const text = document.createElement('div');
      text.style.whiteSpace = 'pre-line';
      text.textContent = msg;
      cont.appendChild(spinner);
      cont.appendChild(text);
      box.appendChild(cont);
    } else {
      box.textContent = msg;
    }
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => { try { box.style.transform = 'translateY(0) scale(1)'; box.style.opacity = '1'; } catch {} });
    let removed = false;
    let timer: any = null;
    const doRemove = () => {
      if (removed) return;
      removed = true;
      try { if (timer) clearTimeout(timer); } catch {}
      try { box.style.transform = 'translateY(6px) scale(0.98)'; box.style.opacity = '0'; } catch {}
      setTimeout(() => { try { wrap.remove(); } catch {} }, 180);
    };
    if (ms > 0) {
      timer = setTimeout(doRemove, Math.max(800, ms));
    }
    return doRemove;
  } catch { return () => {}; }
}

export function registerAltCV() {
  const handler = (e: KeyboardEvent) => {
    if (!e.altKey) return;
    if ((e.code === 'KeyC')) { e.preventDefault(); doCopy(); }
    if ((e.code === 'KeyV')) { e.preventDefault(); doPaste(); }
  };
  window.addEventListener('keydown', handler, true);
  return () => { try { window.removeEventListener('keydown', handler, true); } catch {} };
}
