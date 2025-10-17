import { getSelectedFile, setSelectedFile, getOriginCoords, setOriginCoords, rebuildStencilFromState, setMoveMode, setCurrentHistoryId } from '../overlay/state';
import { log } from '../overlay/log';
import { getPersistentItem, setPersistentItem, removePersistentItem } from '../wguard/stealth/store';
import { sendChannel } from '../wguard/core/channel';
import { markElement } from '../wguard';
import { uploadToCatbox, fileNameFromUrl } from '../utils/catbox';
import { uploadToUguu } from '../utils/uguu';
import { uploadToQuax } from '../utils/quax';
import { addOrUpdate } from '../topmenu/historyStore';
import { t } from '../i18n';

type Cam = { lng: number; lat: number; zoom: number };

let copyJobId = 0;
let pasteJobId = 0;

const LS_LOCATION = 'location';
const LS_CLIPBOARD = 'wguard:clipboard';

function scheduleReload(delay = 650) {
  try { setTimeout(() => { try { location.reload(); } catch {} }, Math.max(0, delay)); } catch {}
  try { setTimeout(() => { try { (window as any).location && (window as any).location.assign && (window as any).location.assign((window as any).location.href); } catch {} try { history.go(0); } catch {} }, Math.max(200, delay + 1200)); } catch {}
}

function readLocation(): Cam | null {
  try {
    const raw = getPersistentItem(LS_LOCATION);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.lng === 'number' && typeof v.lat === 'number') {
      return { lng: v.lng, lat: v.lat, zoom: typeof v.zoom === 'number' ? v.zoom : 14 };
    }
  } catch {}
  return null;
}

function writeLocation(cam: Cam) {
  try { setPersistentItem(LS_LOCATION, JSON.stringify({ lng: cam.lng, lat: cam.lat, zoom: cam.zoom })); } catch {}
}

async function writeClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); return; } catch {}
  try { setPersistentItem(LS_CLIPBOARD, text); } catch {}
}

async function readClipboard(): Promise<string> {
  try { const t = await navigator.clipboard.readText(); if (t) return t; } catch {}
  try { return getPersistentItem(LS_CLIPBOARD) || ''; } catch {}
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
      markElement(img);
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
  const file = getSelectedFile();
  let closer: (() => void) | null = null;
  if (file) {
    closer = showCenterNotice(t('share.toast.uploading'), 0);
  }
  const urls: string[] = [];
  let name = '';
  const services = ['Catbox', 'uguu.se', 'qu.ax'];
  const serviceResults: boolean[] = [];
  if (file) {
    const filename = (file as any).name || 'image.png';
    const uploadPromises = [
      uploadToCatbox(file as Blob, filename).catch((e) => { console.warn('[Upload] Catbox failed:', e); return ''; }),
      uploadToUguu(file as Blob, filename).catch((e) => { console.warn('[Upload] uguu.se failed:', e); return ''; }),
      uploadToQuax(file as Blob, filename).catch((e) => { console.warn('[Upload] qu.ax failed:', e); return ''; })
    ];
    const results = await Promise.all(uploadPromises);
    results.forEach(r => serviceResults.push(!!r && /^https?:\/\//i.test(r)));
    urls.push(...results.filter(u => u && /^https?:\/\//i.test(u)));
    if (urls.length > 0) {
      name = fileNameFromUrl(urls[0]);
    }
    if (closer) { try { closer(); } catch {} closer = null; }
    if (job !== copyJobId) return;
  }
  if (urls.length > 0) {
    closer = showCenterNotice(t('share.toast.verifying'), 0);
    try {
      const b = await downloadBlob(urls[0]);
      if (b) { await ensureImageDecoded(b); }
      if (!b) { if (closer) { try { closer(); } catch {} } showCenterNotice(t('share.toast.error')); return; }
      if (job !== copyJobId) { if (closer) { try { closer(); } catch {} } return; }
      const size = (b.size | 0);
      const sha = await sha256Hex(b);
      if (job !== copyJobId) { if (closer) { try { closer(); } catch {} } return; }
      const payload: any = { type: 'wplace_share_v1', ts: Date.now() };
      payload.img = { urls, name, size, sha256: sha };
      if (origin && origin.length >= 4) payload.origin = [origin[0]|0, origin[1]|0, origin[2]|0, origin[3]|0];
      if (cam) payload.camera = cam;
      const share = buildShareText(payload);
      await writeClipboard(share);
      if (closer) { try { closer(); } catch {} closer = null; }
      showCenterNoticeWithServices(`${t('share.header.title')}\n${t('share.toast.copied')}`, services, serviceResults, 4400, urls[0] || undefined);
      return;
    } catch {}
    if (closer) { try { closer(); } catch {} closer = null; }
  }
  const payload: any = { type: 'wplace_share_v1', ts: Date.now() };
  if (urls.length > 0) payload.img = { urls, name };
  if (origin && origin.length >= 4) payload.origin = [origin[0]|0, origin[1]|0, origin[2]|0, origin[3]|0];
  if (cam) payload.camera = cam;
  const share = buildShareText(payload);
  await writeClipboard(share);
  showCenterNotice(`${t('share.header.title')}
${t('share.toast.copied')}`, 4400, urls[0] || undefined);
}

async function doPaste() {
  const job = ++pasteJobId;
  const raw = await readClipboard();
  let p: any = null;
  try { p = JSON.parse(raw); } catch {}
  if (!p) { try { p = extractSharedJson(raw); } catch {} }
  if (!p || p.type !== 'wplace_share_v1') return;
  const imgData = p.img;
  if (imgData) {
    const urlsToTry: string[] = [];
    if (Array.isArray(imgData.urls)) {
      urlsToTry.push(...imgData.urls.filter((u: any) => typeof u === 'string'));
    } else if (typeof imgData.url === 'string') {
      urlsToTry.push(imgData.url);
    }
    const expectedSha = (imgData && typeof imgData.sha256 === 'string') ? String(imgData.sha256) : '';
    const expectedSize = (imgData && typeof imgData.size === 'number') ? (imgData.size|0) : 0;
    let b: Blob | null = null;
    for (const baseUrl of urlsToTry) {
      for (let i = 0; i < 3; i++) {
        const u = i === 0 ? baseUrl : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}r=${Date.now()}`;
        b = await downloadBlob(u);
        if (!b) continue;
        if (expectedSize && (b.size|0) !== expectedSize) { b = null; continue; }
        if (expectedSha) {
          const gotSha = await sha256Hex(b);
          if (gotSha !== expectedSha) { b = null; continue; }
        }
        break;
      }
      if (b) break;
    }
    if (b) {
      try {
        await ensureImageDecoded(b);
        if (job !== pasteJobId) return;
        const f = new File([b], String(imgData.name || 'image.png'), { type: b.type || 'image/png' });
        setSelectedFile(f);
        try {
          const meta = await addOrUpdate(f, String(imgData.name || 'image.png'), Array.isArray(p.origin) && p.origin.length >= 4 ? [p.origin[0]|0, p.origin[1]|0, p.origin[2]|0, p.origin[3]|0] : null);
          try { setCurrentHistoryId(meta?.id || null); } catch {}
        } catch {}
      } catch {
        setSelectedFile(b);
        try {
          const meta = await addOrUpdate(b, String(imgData?.name || 'image.png'), Array.isArray(p.origin) && p.origin.length >= 4 ? [p.origin[0]|0, p.origin[1]|0, p.origin[2]|0, p.origin[3]|0] : null);
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
    scheduleReload(650);
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

function showCenterNoticeWithServices(msg: string, services: string[], results: boolean[], ms = 2200, imageUrl?: string): () => void {
  const successIcon = `<svg width="16" height="16" viewBox="0 0 32 32" fill="#4ade80"><path d="M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2ZM14,21.5908l-5-5L10.5906,15,14,18.4092,21.41,11l1.5957,1.5859Z"/></svg>`;
  const errorIcon = `<svg width="16" height="16" viewBox="0 0 32 32" fill="#f87171"><path d="M16,2C8.2,2,2,8.2,2,16s6.2,14,14,14s14-6.2,14-14S23.8,2,16,2z M21.4,23L16,17.6L10.6,23L9,21.4l5.4-5.4L9,10.6L10.6,9l5.4,5.4L21.4,9l1.6,1.6L17.6,16l5.4,5.4L21.4,23z"/></svg>`;
  
  const servicesHtml = services.map((name, i) => {
    const icon = results[i] ? successIcon : errorIcon;
    return `<div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;">${icon}</span><span style="color:${results[i] ? '#4ade80' : '#f87171'};">${name}</span></div>`;
  }).join('');
  
  const fullMsg = `${msg}\n<div style="display:flex;gap:12px;margin-top:8px;justify-content:center;">${servicesHtml}</div>`;
  return showCenterNotice(fullMsg, ms, imageUrl);
}

function showCenterNotice(msg: string, ms = 2200, imageUrl?: string): () => void {
  try {
    const isPersistent = ms <= 0;
    const wrap = document.createElement('div');
    markElement(wrap);
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
    markElement(style);
    style.textContent = '@keyframes _w_spin{to{transform:rotate(360deg)}}';
    wrap.appendChild(style);
    const box = document.createElement('div');
    markElement(box);
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
      markElement(cont);
      cont.style.display = 'grid';
      cont.style.gridTemplateColumns = 'auto 1fr';
      cont.style.gap = '12px';
      cont.style.alignItems = 'center';
      const img = document.createElement('img');
      markElement(img);
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
      markElement(text);
      text.style.whiteSpace = 'pre-line';
      text.innerHTML = msg;
      cont.appendChild(img);
      cont.appendChild(text);
      box.appendChild(cont);
    } else if (isPersistent) {
      const cont = document.createElement('div');
      markElement(cont);
      cont.style.display = 'grid';
      cont.style.gridTemplateColumns = 'auto 1fr';
      cont.style.gap = '10px';
      cont.style.alignItems = 'center';
      const spinner = document.createElement('div');
      markElement(spinner);
      spinner.style.width = '16px';
      spinner.style.height = '16px';
      spinner.style.border = '2px solid rgba(255,255,255,0.24)';
      spinner.style.borderTopColor = '#f05123';
      spinner.style.borderRightColor = '#f05123';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = '_w_spin .9s linear infinite';
      const text = document.createElement('div');
      markElement(text);
      text.style.whiteSpace = 'pre-line';
      text.textContent = msg;
      cont.appendChild(spinner);
      cont.appendChild(text);
      box.appendChild(cont);
    } else {
      box.innerHTML = msg;
      box.style.whiteSpace = 'pre-line';
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
