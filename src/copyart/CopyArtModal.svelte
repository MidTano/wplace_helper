<script>
  function fitAnts(node) {
    let ro = null;
    function update() {
      try {
        const host = node.parentElement; 
        if (!host) return;
        const r = host.getBoundingClientRect();
        const w = Math.max(0, Math.round(r.width));
        const h = Math.max(0, Math.round(r.height));
        node.setAttribute('viewBox', `0 0 ${w} ${h}`);
        const path = node.querySelector('path');
        const makeD = (x0, y0, x1, y1, rtlx, rtly, rtrx, rtry, rbrx, rbry, rblx, rbly) => {
          return [
            `M ${x0 + rtlx},${y0}`,
            `L ${x1 - rtrx},${y0}`,
            `A ${rtrx} ${rtry} 0 0 1 ${x1} ${y0 + rtry}`,
            `L ${x1} ${y1 - rbry}`,
            `A ${rbrx} ${rbry} 0 0 1 ${x1 - rbrx} ${y1}`,
            `L ${x0 + rblx} ${y1}`,
            `A ${rblx} ${rbly} 0 0 1 ${x0} ${y1 - rbly}`,
            `L ${x0} ${y0 + rtly}`,
            `A ${rtlx} ${rtly} 0 0 1 ${x0 + rtlx} ${y0}`,
            'Z'
          ].join(' ');
        };
        if (path) {
          const cs = getComputedStyle(host);
          const parseR = (v) => {
            const s = String(v).trim().split('/')
              .map(part => part.trim().split(/\s+/).map(n => parseFloat(n)||0));
            const a = s[0]; const b = s[1] || a; 
            return { x: a[0] || 0, y: b[0] || a[0] || 0 };
          };
          const TL = parseR(cs.borderTopLeftRadius);
          const TR = parseR(cs.borderTopRightRadius);
          const BR = parseR(cs.borderBottomRightRadius);
          const BL = parseR(cs.borderBottomLeftRadius);
          const bwT = parseFloat(cs.borderTopWidth) || 0;
          const bwR = parseFloat(cs.borderRightWidth) || 0;
          const bwB = parseFloat(cs.borderBottomWidth) || 0;
          const bwL = parseFloat(cs.borderLeftWidth) || 0;
          const bw = (bwT + bwR + bwB + bwL) / 4;
          const dpr = (window.devicePixelRatio || 1);
          const snap = (v) => Math.round(v * dpr) / dpr;
          const inset = bw / 2;
          const x0 = snap(Math.max(0, inset));
          const y0 = snap(Math.max(0, inset));
          const x1 = snap(Math.max(x0, w - inset));
          const y1 = snap(Math.max(y0, h - inset));
          let rtlx = Math.max(0, TL.x - inset), rtly = Math.max(0, TL.y - inset);
          let rtrx = Math.max(0, TR.x - inset), rtry = Math.max(0, TR.y - inset);
          let rbrx = Math.max(0, BR.x - inset), rbry = Math.max(0, BR.y - inset);
          let rblx = Math.max(0, BL.x - inset), rbly = Math.max(0, BL.y - inset);
          const iw = Math.max(0, x1 - x0);
          const ih = Math.max(0, y1 - y0);
          const scaleX = Math.min(1, rtlx + rtrx > 0 ? iw / (rtlx + rtrx) : 1, rblx + rbrx > 0 ? iw / (rblx + rbrx) : 1);
          const scaleY = Math.min(1, rtly + rbly > 0 ? ih / (rtly + rbly) : 1, rtry + rbry > 0 ? ih / (rtry + rbry) : 1);
          rtlx *= scaleX; rtrx *= scaleX; rblx *= scaleX; rbrx *= scaleX;
          rtly *= scaleY; rtry *= scaleY; rbly *= scaleY; rbry *= scaleY;
          rtlx = snap(rtlx); rtly = snap(rtly);
          rtrx = snap(rtrx); rtry = snap(rtry);
          rbrx = snap(rbrx); rbry = snap(rbry);
          rblx = snap(rblx); rbly = snap(rbly);
          path.setAttribute('d', makeD(x0, y0, x1, y1, rtlx, rtly, rtrx, rtry, rbrx, rbry, rblx, rbly));
          let L = 0; try { L = path.getTotalLength(); } catch {}
          const ideal = 24;
          const pairs = Math.max(10, Math.round(L / ideal));
          const dash = L / (pairs * 2);
          path.style.setProperty('--dash', `${dash.toFixed(2)}px`);
          const speed = Math.max(0.8, Math.min(1.8, L / 220));
          path.style.setProperty('--ants-speed', `${speed.toFixed(2)}s`);
        }
      } catch {}
    }
    try { ro = new ResizeObserver(update); ro.observe(node.parentElement); } catch {}
    update();
    return { destroy() { try { ro && ro.disconnect(); } catch {} } };
  }
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { lastTileStore, initCopyArtListeners, getLastTile } from './lastTile';
  import { tileUrlFrom, fetchImageBitmap, drawSource } from './tiles';
  import { downloadBlob } from '../editor/save';
  import { t, lang } from '../i18n';
  import { decodeCodeTile } from '../utils/codeTileDecoder';
  import { setSelectedFile, setOriginCoords, rebuildStencilFromState, setCurrentHistoryId } from '../overlay/state';
  import { addOrUpdate } from '../topmenu/historyStore';

  export let open = false;
  const dispatch = createEventDispatcher();

  let center = null;
  let unsubscribe = null;
  let assembling = false;
  let assembleErr = '';

  let gridSize = 3; 
  const sizes = [1, 3, 5, 7, 9];
  
  let reqDelayMs = 100;   
  let retryDelayMs = 3000;


  let composedCanvas;
  let composedW = 0, composedH = 0, tileW = 256, tileH = 256;
  let hatchPattern = null; 
  let checkerPattern = null;
  let currentQueue = [];
  let halfCache = 0;
  let loadedMap = new Set();
  let animId = 0;
  let netAbort = null;


  let previewEl;
  let prevCanvas;
  let prevCtx;
  let zoom = 1;
  let minZoom = 0.1, maxZoom = 20;
  let offsetX = 0, offsetY = 0;
  let dragging = false, dragStartX = 0, dragStartY = 0, dragOX = 0, dragOY = 0;

  let selecting = false;
  let selStartX = 0, selStartY = 0, selCurX = 0, selCurY = 0;
  let selectionRect = null; 
 
  let drawRaf = 0; let pendingDraw = false;
  let downRect = null;

  let autoTrim = true;

  let qrDetect = true;

  let qrDialogOpen = false;
  let qrCandidate = null; 
  let qrPreviewUrl = '';
  let assembleToken = 0; 

  
  $: _i18n_copyartmodal_lang = $lang;

  function portal(node) {
    try { document.body.appendChild(node); } catch {}
    return { destroy() { try { node.remove(); } catch {} } };
  }

  function previewSizer(node) {
    let ro = null;
    try {
      ro = new ResizeObserver(() => {
        try { fitPreview(); } catch {}
      });
      ro.observe(node);
    } catch {}
    return { destroy() { try { ro && ro.disconnect(); } catch {} } };
  }

  function close() {
 
    try { cancelAssemble(); } catch {}
    try { if (animId) cancelAnimationFrame(animId); } catch {}
    animId = 0;
    currentQueue = [];
    loadedMap = new Set();

    composedCanvas = null; composedW = 0; composedH = 0;

    prevCtx = null; checkerPattern = null;
    selectionRect = null; selecting = false;
    dispatch('close');
  }

  function updateCenterNow() {
    try { center = getLastTile(); } catch { center = null; }

    if (center) { try { assemble(); } catch {} }
  }

  function fitPreview() {
    if (!prevCanvas) return;

    try {
      const ctx = prevCanvas.getContext('2d', { willReadFrequently: true });
      if (prevCtx !== ctx) { prevCtx = ctx; checkerPattern = null; }
    } catch {}
    if (!composedCanvas) return;
    const r = previewEl?.getBoundingClientRect?.() || { width: 600, height: 400 };

    const W = Math.max(320, r.width - 8);
    const ratio = (composedW && composedH) ? (composedH / composedW) : 1;
    const H = Math.max(260, Math.round(W * ratio));
    const dpr = (window.devicePixelRatio || 1);
    prevCanvas.width = Math.round(W * dpr);
    prevCanvas.height = Math.round(H * dpr);
    prevCanvas.style.width = W + 'px';
    prevCanvas.style.height = H + 'px';

    if (composedW && composedH) {
      zoom = W / composedW;
      minZoom = Math.min(zoom * 0.25, 1);
      offsetX = Math.round((W - composedW * zoom) / 2);
      offsetY = Math.round((H - composedH * zoom) / 2);
      drawPreview();
    }
  }

  function clampPan(W, H) {
    const vw = composedW * zoom;
    const vh = composedH * zoom;

    if (vw <= W) {
      offsetX = Math.round((W - vw) / 2);
    } else {
      offsetX = Math.min(0, Math.max(W - vw, offsetX));
    }
    if (vh <= H) {
      offsetY = Math.round((H - vh) / 2);
    } else {
      offsetY = Math.min(0, Math.max(H - vh, offsetY));
    }
  }

  function drawPreview() {
    if (!prevCanvas) return;

    try {
      const ctx = prevCanvas.getContext('2d', { willReadFrequently: true });
      if (prevCtx !== ctx) { prevCtx = ctx; checkerPattern = null; }
    } catch {}
    if (!prevCtx || !composedCanvas) return;
    const dpr = (window.devicePixelRatio || 1);
    const cssW = prevCanvas.clientWidth || prevCanvas.width / dpr;
    const cssH = prevCanvas.clientHeight || prevCanvas.height / dpr;
    prevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    prevCtx.imageSmoothingEnabled = false;
    prevCtx.clearRect(0, 0, cssW, cssH);

    try {
      if (!checkerPattern) {
        const pc = document.createElement('canvas');
        pc.width = 16; pc.height = 16;
        const pctx = pc.getContext('2d');
        pctx.fillStyle = '#2a2c32'; pctx.fillRect(0,0,16,16);
        pctx.fillStyle = '#23252b'; pctx.fillRect(0,0,8,8); pctx.fillRect(8,8,8,8);
        checkerPattern = prevCtx.createPattern(pc, 'repeat');
      }
      if (checkerPattern) { prevCtx.fillStyle = checkerPattern; prevCtx.fillRect(0, 0, cssW, cssH); }
    } catch {}
    prevCtx.save();
    prevCtx.translate(offsetX, offsetY);
    prevCtx.scale(zoom, zoom);
    prevCtx.drawImage(composedCanvas, 0, 0);

    if (assembling) {
      try {
        const now = performance.now();
        const ang = (now / 1000) * Math.PI * 2 * 0.6;
        const arc = Math.PI * 0.5; 
        prevCtx.save();
      
        const lw = Math.max(1.5, 2.0 / Math.max(0.5, zoom));
        for (let i = 0; i < currentQueue.length; i++) {
          const it = currentQueue[i];
          const key = `${it.dx},${it.dy}`;
          if (loadedMap.has(key)) continue;

          const cx = (it.dx + halfCache) * tileW + tileW / 2;
          const cy = (it.dy + halfCache) * tileH + tileH / 2;
          const r = Math.max(8, Math.min(tileW, tileH) * 0.18);
          prevCtx.lineWidth = lw;

          prevCtx.strokeStyle = 'rgba(255,255,255,0.5)';
          prevCtx.beginPath(); prevCtx.arc(cx, cy, r, ang, ang + arc); prevCtx.stroke();

          prevCtx.strokeStyle = 'rgba(240,81,35,0.9)';
          prevCtx.beginPath(); prevCtx.arc(cx, cy, r, ang + arc * 1.2, ang + arc * 2.2); prevCtx.stroke();
        }
        prevCtx.restore();
      } catch {}
    }

    try {
      const hasActive = selecting;
      const hasFinal = !!selectionRect;
      if (hasActive || hasFinal) {
        const sx = hasActive ? Math.floor(Math.min(selStartX, selCurX)) : (selectionRect.x|0);
        const sy = hasActive ? Math.floor(Math.min(selStartY, selCurY)) : (selectionRect.y|0);
        const ex = hasActive ? Math.ceil(Math.max(selStartX, selCurX)) : (selectionRect.x + selectionRect.w);
        const ey = hasActive ? Math.ceil(Math.max(selStartY, selCurY)) : (selectionRect.y + selectionRect.h);
        const w = Math.max(0, ex - sx);
        const h = Math.max(0, ey - sy);

        const lw = Math.max(1.5, 2.0 / Math.max(0.5, zoom));
        prevCtx.save();
        prevCtx.lineWidth = lw;
        prevCtx.strokeStyle = 'rgba(240,81,35,0.95)';
        prevCtx.fillStyle = 'rgba(240,81,35,0.18)';
        prevCtx.beginPath();
        prevCtx.rect(sx + 0.5, sy + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
        prevCtx.stroke();
        prevCtx.fill();
        prevCtx.restore();
      }
    } catch {}
    prevCtx.restore();
  }

  function scheduleDraw() {
    if (drawRaf) return;
    drawRaf = requestAnimationFrame(() => { drawRaf = 0; drawPreview(); });
  }

  function clientToImage(clientX, clientY, rect) {
    const r = rect || prevCanvas.getBoundingClientRect();
    const cx = clientX - r.left;
    const cy = clientY - r.top;
    const ix = (cx - offsetX) / zoom;
    const iy = (cy - offsetY) / zoom;
    const x = Math.max(0, Math.min(composedW, ix));
    const y = Math.max(0, Math.min(composedH, iy));
    return { x, y };
  }

  function drawGridBackground(ctx) {
    try {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2.5;
      for (let gy = 1; gy < gridSize; gy++) {
        const y = gy * tileH + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(composedW, y);
        ctx.stroke();
      }
      for (let gx = 1; gx < gridSize; gx++) {
        const x = gx * tileW + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, composedH);
        ctx.stroke();
      }
      
      const half = Math.floor((gridSize - 1) / 2);
      ctx.strokeStyle = 'rgba(240,81,35,0.6)';
      ctx.lineWidth = 3;
      if (half >= 0) {
        const cx = half * tileW + 0.5 + tileW; 
        const cy = half * tileH + 0.5 + tileH; 
        
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, composedH); ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(composedW, cy); ctx.stroke();
      }
      ctx.restore();
    } catch {}
  }

  async function sendToEditor() {
    if (!composedCanvas || !selectionRect) return;
    try {
      
      const rect = autoTrim ? trimSelection(selectionRect) : selectionRect;
      if (!rect) return;
      const { x, y, w, h } = rect;
      if (w <= 0 || h <= 0) return;
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(composedCanvas, x, y, w, h, 0, 0, w, h);
      const blob = await new Promise((resolve) => off.toBlob((b)=>resolve(b), 'image/png'));
      if (!blob) return;
      const name = center ? `crop_${center.x}_${center.y}_${w}x${h}.png` : `crop_${w}x${h}.png`;
      let file;
      try { file = new File([blob], name, { type: 'image/png' }); } catch { file = blob; }
      dispatch('sendToEditor', { file, name });
    } catch {}
  }

  function drawTileSkeleton(ctx, px, py, w, h) {
    try {
      
      
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
      
      const cx = px + w / 2;
      const cy = py + h / 2;
      const r1 = Math.max(8, Math.min(w, h) * 0.12);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(240,81,35,0.7)';
      ctx.beginPath();
      ctx.arc(cx, cy, r1, -Math.PI * 0.25, Math.PI * 0.25);
      ctx.stroke();
    } catch {}
  }

  function onWheel(e) {
    e.preventDefault();
    if (!composedCanvas) return;
    const rect = prevCanvas.getBoundingClientRect();
    
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const prevZ = zoom;
    const delta = Math.sign(e.deltaY) * -0.1;
    const newZ = Math.max(minZoom, Math.min(maxZoom, zoom * (1 + delta)));
    const ratio = newZ / prevZ;
    zoom = newZ;

    
    offsetX = cx - (cx - offsetX) * ratio;
    offsetY = cy - (cy - offsetY) * ratio;

    clampPan(rect.width, rect.height);
    scheduleDraw();
  }

  function onPointerDown(e) {
    e.preventDefault();
    downRect = prevCanvas.getBoundingClientRect();
    if (e.button === 0) {
      
      selecting = true; dragging = false;
      const p = clientToImage(e.clientX, e.clientY, downRect);
      selStartX = selCurX = p.x; selStartY = selCurY = p.y;
    } else if (e.button === 1 || e.button === 2) {
      
      dragging = true; selecting = false;
      dragStartX = e.clientX; dragStartY = e.clientY; dragOX = offsetX; dragOY = offsetY;
    }
    (e.currentTarget || window).setPointerCapture && (e.currentTarget || window).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (dragging) {
      const rect = downRect || prevCanvas.getBoundingClientRect();
      offsetX = dragOX + (e.clientX - dragStartX);
      offsetY = dragOY + (e.clientY - dragStartY);
      clampPan(rect.width, rect.height);
      scheduleDraw();
    } else if (selecting) {
      const p = clientToImage(e.clientX, e.clientY, downRect);
      selCurX = p.x; selCurY = p.y;
      scheduleDraw();
    }
  }
  function onPointerUp(e) {
    if (selecting && e.button === 0) {
      
      const sx = Math.floor(Math.min(selStartX, selCurX));
      const sy = Math.floor(Math.min(selStartY, selCurY));
      const ex = Math.ceil(Math.max(selStartX, selCurX));
      const ey = Math.ceil(Math.max(selStartY, selCurY));
      const w = Math.max(0, ex - sx);
      const h = Math.max(0, ey - sy);
      selectionRect = (w >= 1 && h >= 1) ? { x: sx, y: sy, w, h } : null;
      if (autoTrim && selectionRect) { selectionRect = trimSelection(selectionRect); }
      selecting = false;
      scheduleDraw();
      
      try { if (qrDetect && selectionRect) maybeRecognizeQr(selectionRect); } catch {}
    }
    dragging = false;
    try { (e.currentTarget || window).releasePointerCapture && (e.currentTarget || window).releasePointerCapture(e.pointerId); } catch {}
  }

  function trimSelection(rect) {
    try {
      if (!composedCanvas || !rect) return rect;
      const { x, y, w, h } = rect;
      if (w <= 0 || h <= 0) return rect;
      const ctx = composedCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return rect;
      const img = ctx.getImageData(x, y, w, h);
      const data = img.data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      
      for (let yy = 0; yy < h; yy++) {
        const row = yy * w * 4;
        for (let xx = 0; xx < w; xx++) {
          const a = data[row + xx * 4 + 3];
          if (a >= 8) { 
            if (xx < minX) minX = xx;
            if (yy < minY) minY = yy;
            if (xx > maxX) maxX = xx;
            if (yy > maxY) maxY = yy;
          }
        }
      }
      if (maxX < 0 || maxY < 0) return null; 
      
      const tw = (maxX - minX + 1);
      const th = (maxY - minY + 1);
      return { x: x + minX, y: y + minY, w: tw, h: th };
    } catch { return rect; }
  }

  function clearSelection() {
    selectionRect = null;
    selecting = false;
    scheduleDraw();
  }

  async function maybeRecognizeQr(rect) {
    try {
      if (!composedCanvas || !rect) return;
      const { x, y, w, h } = rect;
      if (!((w === 5 && h === 5) || (w === 10 && h === 10) || (w === 15 && h === 15))) return;
      const ctx = composedCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const img = ctx.getImageData(x, y, w, h);
      const decoded = decodeCodeTile(img);
      if (!decoded) return;
      qrCandidate = decoded;
      qrPreviewUrl = `https://files.catbox.moe/${decoded.fileName}`;
      qrDialogOpen = true;
      await tick();
    } catch {}
  }

  async function fetchCatboxBlob(fileName) {
    const url = `https://files.catbox.moe/${fileName}`;
    const gm = (typeof window !== 'undefined' && (window).GM_xmlhttpRequest)
      ? (window).GM_xmlhttpRequest
      : ((typeof window !== 'undefined' && (window).GM && (window).GM.xmlHttpRequest) ? (window).GM.xmlHttpRequest : null);
    if (gm) {
      return await new Promise((resolve, reject) => {
        try {
          gm({ method: 'GET', url, responseType: 'blob', onload: (r) => { try { resolve(r.response); } catch (e) { reject(e); } }, onerror: () => reject(new Error('Catbox GET failed')) });
        } catch (e) { reject(e); }
      });
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.blob();
  }

  async function placeFromQr() {
    try {
      if (!qrCandidate) { qrDialogOpen = false; return; }
      const blob = await fetchCatboxBlob(qrCandidate.fileName);
      let file;
      try { file = new File([blob], qrCandidate.fileName, { type: 'image/png' }); } catch { file = blob; }
      
      let meta = null;
      try { meta = await addOrUpdate(file, qrCandidate.fileName, qrCandidate.coords); } catch {}
      try { if (meta && meta.id) setCurrentHistoryId(meta.id); } catch {}
      setSelectedFile(file);
      setOriginCoords(qrCandidate.coords);
      await rebuildStencilFromState();
      qrDialogOpen = false; qrCandidate = null; qrPreviewUrl = '';
      
      close();
    } catch {
      
      qrDialogOpen = false; qrCandidate = null; qrPreviewUrl = '';
    }
  }

  async function saveSelection() {
    if (!composedCanvas) return;
    try {
      if (!selectionRect) {
        
        await downloadPNG();
        return;
      }
      
      const rect = autoTrim ? trimSelection(selectionRect) : selectionRect;
      if (!rect) return;
      const { x, y, w, h } = rect;
      if (w <= 0 || h <= 0) { await downloadPNG(); return; }
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(composedCanvas, x, y, w, h, 0, 0, w, h);
      const blob = await new Promise((resolve) => off.toBlob((b)=>resolve(b), 'image/png'));
      if (blob) {
        const name = center ? `crop_${center.x}_${center.y}_${w}x${h}.png` : `crop_${w}x${h}.png`;
        downloadBlob(blob, name);
      }
    } catch {}
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
  function nextFrame() { return new Promise(res => requestAnimationFrame(() => res(null))); }
  async function ensurePreviewLayout(maxFrames = 8) {
    for (let i = 0; i < maxFrames; i++) {
      const r = previewEl?.getBoundingClientRect?.();
      if (r && r.width > 10 && r.height > 10) return;
      await nextFrame();
    }
  }

  async function assemble() {
    assembling = true; assembleErr = '';
    const myToken = ++assembleToken;
    try {
      
      try { netAbort && netAbort.abort(); } catch {}
      try { netAbort = new AbortController(); } catch { netAbort = null; }
      if (!center) { assembleErr = 'Центральный тайл не найден. Сделайте так, чтобы игра загрузила любой тайл (подвигайте карту), затем нажмите Обновить.'; return; }
      const half = Math.floor((gridSize - 1) / 2);
      const queue = [];
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const tx = center.x + dx;
          const ty = center.y + dy;
          queue.push({ dx, dy, url: tileUrlFrom(center, tx, ty) });
        }
      }
      
      queue.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
      currentQueue = queue.slice();
      halfCache = half;
      loadedMap = new Set();
      
      tileW = 256; tileH = 256; 
      composedW = tileW * gridSize;
      composedH = tileH * gridSize;
      if (!composedCanvas) composedCanvas = document.createElement('canvas');
      composedCanvas.width = composedW; composedCanvas.height = composedH;
      const cctx = composedCanvas.getContext('2d', { willReadFrequently: true });
      cctx.imageSmoothingEnabled = false;
      
      cctx.clearRect(0, 0, composedW, composedH);
      
      
      drawGridBackground(cctx);
      await tick();
      await nextFrame();
      await ensurePreviewLayout();
      fitPreview();
      drawPreview();
      
      try { if (animId) cancelAnimationFrame(animId); } catch {}
      const loop = () => {
        if (assembleToken !== myToken) { animId = 0; return; }
        
        if (loadedMap.size >= currentQueue.length) { drawPreview(); animId = 0; return; }
        drawPreview();
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);

      
      for (let i = 0; i < queue.length; i++) {
        if (assembleToken !== myToken) return; 
        const { dx, dy, url } = queue[i];
        let ok = false;
        while (!ok) {
          if (assembleToken !== myToken) return;
          const img = await fetchImageBitmap(url, netAbort?.signal);
          if (img) {
            
            if (composedW === tileW * gridSize && composedH === tileH * gridSize) {
              const iw = (img && (img.width || img.naturalWidth)) || 256;
              const ih = (img && (img.height || img.naturalHeight)) || 256;
              if ((iw !== tileW || ih !== tileH) && i === 0) {
                tileW = iw; tileH = ih;
                composedW = tileW * gridSize; composedH = tileH * gridSize;
                composedCanvas.width = composedW; composedCanvas.height = composedH;
                
                cctx.clearRect(0, 0, composedW, composedH);
                
                drawGridBackground(cctx);
                fitPreview();
              }
            }
            const px = (dx + half) * tileW;
            const py = (dy + half) * tileH;
            drawSource(cctx, img, px, py);
            loadedMap.add(`${dx},${dy}`);
            ok = true;
            drawPreview();
          } else {
            
            if (assembleToken !== myToken) return;
            await sleep(retryDelayMs);
          }
        }
        await sleep(reqDelayMs);
      }
    } catch (e) {
      assembleErr = String(e?.message || e) || 'Ошибка сборки';
    } finally {
      assembling = false;
      
      try { netAbort && netAbort.abort(); } catch {}
      netAbort = null;
      if (animId) { try { cancelAnimationFrame(animId); } catch {}; animId = 0; }
      
      try { drawPreview(); } catch {}
    }
  }

  function cancelAssemble() { assembleToken++; assembling = false; try { netAbort && netAbort.abort(); } catch {}; netAbort = null; try { drawPreview(); } catch {} }

  async function downloadPNG() {
    if (!composedCanvas) return;
    try {
      composedCanvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const name = center ? `tiles_${center.x}_${center.y}_${gridSize}x${gridSize}.png` : `tiles_${gridSize}x${gridSize}.png`;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch {} }, 500);
      }, 'image/png');
    } catch {}
  }

  onMount(() => {
    try { initCopyArtListeners(); } catch {}
    unsubscribe = lastTileStore.subscribe((v) => { center = v?.tile || null; });
    updateCenterNow();
    try { window.addEventListener('resize', fitPreview); } catch {}
  });
  onDestroy(() => {
    try { unsubscribe && unsubscribe(); } catch {}
    try { window.removeEventListener('resize', fitPreview); } catch {}
  });

  
  $: if (open && center && !composedCanvas && !assembling) {
    try { assemble(); } catch {}
  }

  
  $: if (open) {
    tick().then(async ()=>{ try { await ensurePreviewLayout(); fitPreview(); drawPreview(); } catch {} });
  }

  
  $: if (!open) {
    try { cancelAssemble(); } catch {}
    try { if (animId) cancelAnimationFrame(animId); } catch {}
    animId = 0; currentQueue = []; loadedMap = new Set();
  }
</script>

{#if open}
  <div class="ca-backdrop" use:portal role="dialog" aria-modal="true" aria-label={t('copyart.modalAria')}>
    <div class="ca-modal">
      <div class="ca-header">
        <div class="title">{t('copyart.title')}</div>
        <button class="close-x" on:click={close} aria-label={t('btn.close')}>
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M3.2 3.2l9.6 9.6M12.8 3.2L3.2 12.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="ca-body">
        <div class="left">
          <div class="group card">
            <div class="label">{t('copyart.center')}</div>
            {#if center}
              <div class="mono">x:{center.x} y:{center.y}</div>
            {:else}
              <div class="hint">{t('copyart.centerHint')}</div>
            {/if}
            <div class="row">
              <button class="btn" on:click={updateCenterNow}>{t('copyart.updateCenter')}</button>
            </div>
          </div>

          <div class="group card">
            <div class="label">{t('copyart.areaSize')}</div>
            <div class="tiles sizes-tiles">
              {#each sizes as s}
                <button type="button" class="tile {gridSize===s ? 'selected' : ''}" aria-pressed={gridSize===s} on:click={() => { gridSize = s; }}>
                  <div class="tile-inner">
                    <span class="name">{s}×{s}</span>
                  </div>
                  <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
                </button>
              {/each}
            </div>
          </div>

          <div class="group card">
            <div class="row">
              <button class="btn btn-primary" on:click={assemble} disabled={assembling}>{t('copyart.assemble')}</button>
              <button class="btn" on:click={cancelAssemble} disabled={!assembling}>{t('copyart.stop')}</button>
            </div>
            {#if assembleErr}
              <div class="error">{assembleErr}</div>
            {/if}
          </div>

          <div class="group card">
            <div class="label">{t('copyart.selection')}</div>
            <div class="tiles">
              <button type="button" class="tile {autoTrim ? 'selected' : ''}" aria-pressed={autoTrim} on:click={() => { autoTrim = !autoTrim; if (autoTrim && selectionRect) { selectionRect = trimSelection(selectionRect); scheduleDraw(); } }}>
                <div class="tile-inner">
                  <span class="name">{t('copyart.selection.auto')}</span>
                </div>
                <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
              </button>
              <button type="button" class="tile {qrDetect ? 'selected' : ''}" aria-pressed={qrDetect} on:click={() => { qrDetect = !qrDetect; }}>
                <div class="tile-inner">
                  <span class="name">{t('copyart.selection.qrDetect')}</span>
                </div>
                <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
              </button>
            </div>
          </div>

          <div class="group card">
            <div class="label">{t('copyart.downloadSpeed')}</div>
            <div class="row">
              <label class="mono" for="reqDelay">{t('copyart.reqDelay')}</label>
              <input id="reqDelay" class="num" type="number" min="50" step="50" bind:value={reqDelayMs} style="width:100px" />
            </div>
            <div class="row">
              <label class="mono" for="retryDelay">{t('copyart.retryDelay')}</label>
              <input id="retryDelay" class="num" type="number" min="500" step="100" bind:value={retryDelayMs} style="width:100px" />
            </div>
          </div>
        </div>
        <div class="right" bind:this={previewEl} use:previewSizer>
          {#if !composedCanvas}
            <div class="empty-preview">{t('copyart.noPreview')}</div>
          {/if}
          <canvas bind:this={prevCanvas}
                  on:wheel={onWheel}
                  on:pointerdown={onPointerDown}
                  on:pointermove={onPointerMove}
                  on:pointerup={onPointerUp}
                  on:pointercancel={onPointerUp}
                  on:contextmenu={(e)=>e.preventDefault()}></canvas>
        </div>
      </div>
      <div class="ca-footer">
        <div class="row">
          <div class="hint">{t('copyart.controlsHint')}</div>
          <div style="flex:1"></div>
          <button class="btn" on:click={clearSelection} disabled={!selectionRect}>{t('copyart.clearSelection')}</button>
          <button class="btn btn-primary" on:click={saveSelection} disabled={!composedCanvas}>{t('copyart.save')}</button>
          <button class="btn btn-primary" on:click={async()=>{ await sendToEditor(); }} disabled={!selectionRect}>{t('copyart.edit')}</button>
        </div>
      </div>
    </div>
  </div>
  {#if qrDialogOpen}
    <div class="qr-dialog-backdrop" use:portal role="dialog" aria-modal="true">
      <div class="qr-dialog">
        <div class="qr-title">{t('copyart.qr.detectedTitle')}</div>
        <div class="qr-body">
          {#if qrPreviewUrl}
            <img class="qr-preview" alt="qr preview" src={qrPreviewUrl} />
          {/if}
          {#if qrCandidate}
            <div class="qr-meta">
              <div class="row"><span class="mono">{t('copyart.qr.file')}:</span>&nbsp;<span>{qrCandidate.fileName}</span></div>
              <div class="row"><span class="mono">{t('copyart.qr.coords')}:</span>&nbsp;<span>tx:{qrCandidate.coords[0]} ty:{qrCandidate.coords[1]} px:{qrCandidate.coords[2]} py:{qrCandidate.coords[3]}</span></div>
              <div class="row"><span class="mono">{t('copyart.qr.dim')}:</span>&nbsp;<span>{qrCandidate.dim}×{qrCandidate.dim}</span></div>
            </div>
          {/if}
        </div>
        <div class="qr-actions">
          <button class="btn btn-primary" on:click={placeFromQr}>{t('copyart.qr.place')}</button>
          <button class="btn" on:click={() => { qrDialogOpen = false; qrCandidate = null; qrPreviewUrl = ''; }}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .ca-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 1000004; }
  
  .ca-modal { width: min(860px, 92vw); max-height: min(80vh, 720px); display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; background: rgba(17,17,17,0.96); color: #fff; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 16px 36px rgba(0,0,0,0.5); backdrop-filter: blur(8px); }
  .ca-header { position: relative; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .ca-header .title { font-weight: 700; }
  .close-x { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: #e53935; color: #fff; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.35); cursor: pointer; }
  .ca-body { flex: 1 1 auto; display: grid; grid-template-columns: 260px 1fr; }
  .left { padding: 12px; display: grid; gap: 12px; border-right: 1px solid rgba(255,255,255,0.12); overflow: auto; }
  .right { position: relative; display: grid; place-items: center; background: #0f0f12; }
  .right canvas { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
  .empty-preview { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,0.8); font-size: 13px; }
  .ca-footer { padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); }

  .group { display: grid; gap: 8px; }
  .group.card { padding: 10px; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; background: rgba(255,255,255,0.04); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
  .label { font-size: 12px; opacity: .9; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  .hint { opacity: .85; font-size: 12px; }

  
  .qr-dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: grid; place-items: center; z-index: 1000005; }
  .qr-dialog { width: min(560px, 92vw); background: rgba(17,17,17,0.97); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; box-shadow: 0 16px 36px rgba(0,0,0,0.5); padding: 12px; display: grid; gap: 10px; }
  .qr-title { font-weight: 700; }
  .qr-body { display: grid; grid-template-columns: 180px 1fr; gap: 10px; align-items: center; }
  .qr-preview { width: 180px; height: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: #0f0f12; }
  .qr-preview { image-rendering: pixelated; image-rendering: crisp-edges; }
  .qr-meta .row { margin: 4px 0; }
  .qr-actions { display: flex; gap: 8px; justify-content: end; }
  .tiles { display: grid; gap: 8px; }
  .sizes-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 420px) { .sizes-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .tile { position: relative; display: block; padding: 8px 10px; border-radius: 12px; border: none; background: rgba(255,255,255,0.04); color: inherit; cursor: pointer; text-align: left; overflow: hidden; }
  .tile .tile-inner { display: grid; grid-template-columns: 1fr; align-items: center; gap: 10px; }
  .tile:hover { background: rgba(255,255,255,0.08); }
  .tile.selected { border-color: transparent; box-shadow: none; }
  .tile .name { font-size: 12px; line-height: 1.2; opacity: 0.95; }
  
  .ants { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; }
  .ants path { stroke: #f3734d; stroke-width: 2; stroke-linecap: butt; stroke-linejoin: round; stroke-dasharray: var(--dash) var(--dash); stroke-dashoffset: 0; filter: drop-shadow(0 0 2px rgba(240,81,35,0.6)); vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
  .tile.selected .ants { opacity: 1; }
  @keyframes antsRun { to { stroke-dashoffset: calc(-2 * var(--dash)); } }
  .tile.selected .ants path { animation: antsRun var(--ants-speed, 1.2s) linear infinite; }

  

  .row { display: flex; gap: 8px; }
  .num { height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; padding: 0 8px; }
  .btn { height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; font-weight: 700; letter-spacing: .2px; box-shadow: 0 1px 2px rgba(0,0,0,0.25); transition: transform .12s ease, filter .12s ease; }
  .btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
  .btn:disabled { opacity: .6; cursor: default; }
  .btn-primary { background: #f05123; border-color: rgba(255,255,255,0.25); }
  .btn-primary:hover { filter: brightness(1.05); }

  .error { color: #ff8a80; font-size: 12px; }
</style>
