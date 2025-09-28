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
  let customSize = '';
  let isCustomMode = false;
  const sizes = [1, 3, 5, 7, 9];
  
  let reqDelayMs = 1000;   
  let retryDelayMs = 10000;
  let maxConcurrent = 8;


  let composedCanvas;
  let composedW = 0, composedH = 0, tileW = 256, tileH = 256;
  let hatchPattern = null; 
  let checkerPattern = null;
  let currentQueue = [];
  let halfCache = 0;
  let loadedMap = new Set();
  let tileStore = new Map();
  let saving = false;
  let accelSave = false;
  let accelGrid = 3;
  let loadedCount = 0;
  let saveProgress = 0;
  let saveStage = '';
  let saveStartMs = 0;
  let saveEtaText = '—';
  let assemblingProgress = 0;
  let assemblingStartMs = 0;
  let assembleEtaText = '—';
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

  function setCustomSize() {
    const parsed = parseInt(customSize);
    if (parsed && parsed >= 1 && parsed <= 99 && parsed % 2 === 1) {
      gridSize = parsed;
      isCustomMode = true;
      selectionRect = null; selecting = false; scheduleDraw();
    }
  }

  function clampCustomSize(n) {
    let x = Number(n);
    if (!isFinite(x)) x = 1;
    x = Math.max(1, Math.min(99, Math.round((x - 1) / 2) * 2 + 1));
    return x;
  }

  function clampRectToCanvas(r) {
    try {
      const W = composedW || ((tileW || 256) * gridSize);
      const H = composedH || ((tileH || 256) * gridSize);
      let x = Math.max(0, Math.min(W, r.x|0));
      let y = Math.max(0, Math.min(H, r.y|0));
      let w = Math.max(0, Math.min(W - x, r.w|0));
      let h = Math.max(0, Math.min(H - y, r.h|0));
      return { x, y, w, h };
    } catch { return r; }
  }

  function getLoadedBoundsPx() {
    if (!loadedMap || loadedMap.size === 0) return null;
    let minDx = Infinity, minDy = Infinity, maxDx = -Infinity, maxDy = -Infinity;
    for (const key of loadedMap) {
      const parts = String(key).split(',');
      const dx = parseInt(parts[0]);
      const dy = parseInt(parts[1]);
      if (!isFinite(dx) || !isFinite(dy)) continue;
      if (dx < minDx) minDx = dx;
      if (dx > maxDx) maxDx = dx;
      if (dy < minDy) minDy = dy;
      if (dy > maxDy) maxDy = dy;
    }
    if (!isFinite(minDx) || !isFinite(minDy) || !isFinite(maxDx) || !isFinite(maxDy)) return null;
    const tw = tileW || 256;
    const th = tileH || 256;
    const x = (minDx + halfCache) * tw;
    const y = (minDy + halfCache) * th;
    const w = (maxDx - minDx + 1) * tw;
    const h = (maxDy - minDy + 1) * th;
    return { x, y, w, h };
  }

  function intersectRect(a, b) {
    if (!a || !b) return null;
    const x0 = Math.max(a.x|0, b.x|0);
    const y0 = Math.max(a.y|0, b.y|0);
    const x1 = Math.min((a.x + a.w)|0, (b.x + b.w)|0);
    const y1 = Math.min((a.y + a.h)|0, (b.y + b.h)|0);
    const w = Math.max(0, x1 - x0);
    const h = Math.max(0, y1 - y0);
    if (w <= 0 || h <= 0) return null;
    return { x: x0, y: y0, w, h };
  }

  function selectPresetSize(size) {
    gridSize = size;
    isCustomMode = false;
    customSize = '';
  }

  function drawGridOverlay(ctx) {
    try {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const lw1 = Math.max(1, 2.5 / Math.max(0.5, zoom));
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = lw1;
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
      ctx.lineWidth = Math.max(1, 3 / Math.max(0.5, zoom));
      if (half >= 0) {
        const cx = half * tileW + 0.5 + tileW;
        const cy = half * tileH + 0.5 + tileH;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, composedH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(composedW, cy); ctx.stroke();
      }
      ctx.restore();
    } catch {}
  }

  function createCanvasFromTiles() {
    try {
      const w = (tileW || 256) * gridSize;
      const h = (tileH || 256) * gridSize;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      if (currentQueue && currentQueue.length > 0) {
        const half = Math.floor((gridSize - 1) / 2);
        for (let i = 0; i < currentQueue.length; i++) {
          const it = currentQueue[i];
          const key = `${it.dx},${it.dy}`;
          const img = tileStore.get(key);
          if (img) {
            const px = (it.dx + half) * (tileW || 256);
            const py = (it.dy + half) * (tileH || 256);
            ctx.drawImage(img, px, py, tileW || 256, tileH || 256);
          }
        }
      }
      return canvas;
    } catch {
      return null;
    }
  }


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

  function getVisibleRange() {
    try {
      if (!prevCanvas || !composedW || !composedH || !tileW || !tileH) {
        return { sx: 0, ex: gridSize, sy: 0, ey: gridSize };
      }
      const dpr = (window.devicePixelRatio || 1);
      const cssW = prevCanvas.clientWidth || prevCanvas.width / dpr;
      const cssH = prevCanvas.clientHeight || prevCanvas.height / dpr;
      const vx = Math.max(0, -offsetX / Math.max(0.0001, zoom));
      const vy = Math.max(0, -offsetY / Math.max(0.0001, zoom));
      const vw = Math.min(composedW, (cssW / Math.max(0.0001, zoom)) + vx);
      const vh = Math.min(composedH, (cssH / Math.max(0.0001, zoom)) + vy);
      const sx = Math.max(0, Math.floor(vx / Math.max(1, tileW)) - 1);
      const sy = Math.max(0, Math.floor(vy / Math.max(1, tileH)) - 1);
      const ex = Math.min(gridSize, Math.ceil(vw / Math.max(1, tileW)) + 1);
      const ey = Math.min(gridSize, Math.ceil(vh / Math.max(1, tileH)) + 1);
      return { sx, ex, sy, ey };
    } catch { return { sx: 0, ex: gridSize, sy: 0, ey: gridSize }; }
  }

  function drawPreview() {
    if (!prevCanvas) return;

    try {
      const ctx = prevCanvas.getContext('2d', { willReadFrequently: true });
      if (prevCtx !== ctx) { prevCtx = ctx; checkerPattern = null; }
    } catch {}
    if (!prevCtx) return;
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

    const dpr2 = (window.devicePixelRatio || 1);
    const cssW2 = prevCanvas.clientWidth || prevCanvas.width / dpr2;
    const cssH2 = prevCanvas.clientHeight || prevCanvas.height / dpr2;
    const vx2 = Math.max(0, -offsetX / Math.max(0.0001, zoom));
    const vy2 = Math.max(0, -offsetY / Math.max(0.0001, zoom));
    const vw2 = Math.min(composedW, (cssW2 / Math.max(0.0001, zoom)) + vx2);
    const vh2 = Math.min(composedH, (cssH2 / Math.max(0.0001, zoom)) + vy2);

    if (composedCanvas && (vw2 > vx2 && vh2 > vy2)) {
      try {
        prevCtx.drawImage(
          composedCanvas,
          vx2, vy2, vw2 - vx2, vh2 - vy2,
          vx2, vy2, vw2 - vx2, vh2 - vy2
        );
      } catch {}
    }
    if (tileStore && tileStore.size > 0) {
      for (let i = 0; i < currentQueue.length; i++) {
        const it = currentQueue[i];
        const key = `${it.dx},${it.dy}`;
        const px = (it.dx + halfCache) * tileW;
        const py = (it.dy + halfCache) * tileH;
        if (px > vw2 || py > vh2 || (px + tileW) < vx2 || (py + tileH) < vy2) continue;
        const img = tileStore.get(key);
        if (img) {
          try { prevCtx.drawImage(img, px, py, tileW, tileH); } catch {}
        }
      }
    }

    drawGridOverlay(prevCtx);

    if (assembling) {
      try {
        const now = performance.now();
        const ang = (now / 1000) * Math.PI * 2 * 0.6;
        const arc = Math.PI * 0.5; 
        prevCtx.save();
      
        const lw = Math.max(1.5, 2.0 / Math.max(0.5, zoom));
        let nextTile = null;
        for (let i = 0; i < currentQueue.length; i++) {
          const it = currentQueue[i];
          const key = `${it.dx},${it.dy}`;
          if (!loadedMap.has(key)) {
            nextTile = it;
            break;
          }
        }

        if (nextTile) {
          const cx = (nextTile.dx + halfCache) * tileW + tileW / 2;
          const cy = (nextTile.dy + halfCache) * tileH + tileH / 2;
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
    if (!selectionRect) return;
    const sourceCanvas = composedCanvas || createCanvasFromTiles();
    if (!sourceCanvas) {
      alert('Нет данных для отправки в редактор. Сначала загрузите хотя бы один тайл.');
      return;
    }
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
      ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
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
    if (!selectionRect) {
      console.log('[CopyArt][saveSelection] no selection -> full area');
      await downloadPNG();
      return;
    }
    try {
      let rect = autoTrim ? trimSelection(selectionRect) : selectionRect;
      const loadedBounds = getLoadedBoundsPx();
      if (loadedBounds) {
        rect = intersectRect(rect, loadedBounds) || null;
      }
      if (!rect) rect = selectionRect;
      rect = clampRectToCanvas(rect);
      let { x, y, w, h } = rect;
      if (!w || !h || w <= 0 || h <= 0) {
        console.log('[CopyArt][saveSelection] empty rect -> fallback full area');
        await downloadPNG();
        return;
      }
      if (saving) return;
      saving = true; saveProgress = 0; saveStage = 'crop'; saveStartMs = Date.now(); saveEtaText = '—';

      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      if (composedCanvas) {
        try { ctx.drawImage(composedCanvas, x, y, w, h, 0, 0, w, h); } catch {}
      }
      {
        const keys = Array.from(loadedMap);
        for (const key of keys) {
          const parts = String(key).split(',');
          const dx = parseInt(parts[0]);
          const dy = parseInt(parts[1]);
          if (!isFinite(dx) || !isFinite(dy)) continue;
          const px = (dx + halfCache) * (tileW || 256);
          const py = (dy + halfCache) * (tileH || 256);
          const ix0 = Math.max(x, px);
          const iy0 = Math.max(y, py);
          const ix1 = Math.min(x + w, px + (tileW || 256));
          const iy1 = Math.min(y + h, py + (tileH || 256));
          const iw = Math.max(0, ix1 - ix0);
          const ih = Math.max(0, iy1 - iy0);
          if (iw <= 0 || ih <= 0) continue;
          const img = tileStore.get(key);
          if (!img) continue;
          const sx = ix0 - px;
          const sy = iy0 - py;
          const dx2 = ix0 - x;
          const dy2 = iy0 - y;
          try { ctx.drawImage(img, sx, sy, iw, ih, dx2, dy2, iw, ih); } catch {}
        }
      }
      const blob = await new Promise((resolve) => off.toBlob((b)=>resolve(b), 'image/png'));
      if (blob) {
        const name = center ? `crop_${center.x}_${center.y}_${w}x${h}.png` : `crop_${w}x${h}.png`;
        downloadBlob(blob, name);
      }
    } catch {}
    finally { saving = false; try { drawPreview(); } catch {} }
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
  function nextFrame() { return new Promise(res => requestAnimationFrame(() => res(null))); }
  function formatEta(ms) {
    try {
      const sec = Math.ceil(Math.max(0, ms) / 1000);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      return `${m}:${String(s).padStart(2,'0')}`;
    } catch { return '—'; }
  }
  function updateEta() {
    try {
      const p = Math.max(0.001, Math.min(0.999, (saveProgress || 0) / 100));
      const elapsed = Math.max(0, Date.now() - (saveStartMs || Date.now()));
      const total = elapsed / p;
      const left = Math.max(0, total - elapsed);
      saveEtaText = formatEta(left);
    } catch { saveEtaText = '—'; }
  }
  function updateAssembleEta() {
    try {
      const p = Math.max(0.001, Math.min(0.999, (assemblingProgress || 0) / 100));
      const elapsed = Math.max(0, Date.now() - (assemblingStartMs || Date.now()));
      const total = elapsed / p;
      const left = Math.max(0, total - elapsed);
      assembleEtaText = formatEta(left);
    } catch { assembleEtaText = '—'; }
  }
  async function ensurePreviewLayout(maxFrames = 8) {
    for (let i = 0; i < maxFrames; i++) {
      const r = previewEl?.getBoundingClientRect?.();
      if (r && r.width > 10 && r.height > 10) return;
      await nextFrame();
    }
  }

  async function assemble() {
    if (assembling) return;
    assembling = true; assembleErr = '';
    assemblingStartMs = Date.now(); assemblingProgress = 0; assembleEtaText = '—';
    const myToken = ++assembleToken;
    try {
      try { netAbort && netAbort.abort(); } catch {}
      try { netAbort = new AbortController(); } catch { netAbort = null; }
      if (!center) { assembleErr = 'Центральный тайл не найден. Сделайте так, чтобы сайт загрузила любой тайл (подвигайте карту), затем нажмите Обновить.'; return; }
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
      tileStore = new Map();
      loadedCount = 0;
      
      tileW = 256; tileH = 256; 
      composedW = tileW * gridSize;
      composedH = tileH * gridSize;
      if (!composedCanvas) composedCanvas = document.createElement('canvas');
      composedCanvas.width = composedW; composedCanvas.height = composedH;
      
      const cctx = composedCanvas.getContext('2d', { willReadFrequently: true });
      cctx.imageSmoothingEnabled = false;
      
      cctx.clearRect(0, 0, composedW, composedH);
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
      const todo = queue.map(q => ({...q, attempt: 0}));
      let remaining = todo.length;
      const workers = Math.max(1, Math.min(64, Math.floor(maxConcurrent)));
      async function worker() {
        while (assembleToken === myToken && remaining > 0) {
          const task = todo.shift();
          if (!task) { await sleep(30); continue; }
          const { dx, dy, url } = task;
          const img = await fetchImageBitmap(url, netAbort?.signal);
          if (assembleToken !== myToken) return;
          if (img) {
            const iw = (img && (img.width || img.naturalWidth)) || 256;
            const ih = (img && (img.height || img.naturalHeight)) || 256;
            if ((iw !== tileW || ih !== tileH) && loadedMap.size === 0) {
              tileW = iw; tileH = ih;
              composedW = tileW * gridSize; composedH = tileH * gridSize;
              composedCanvas.width = composedW; composedCanvas.height = composedH;
              cctx.clearRect(0, 0, composedW, composedH);
              fitPreview();
            }
            const px = (dx + half) * tileW;
            const py = (dy + half) * tileH;
            try { cctx.drawImage(img, px, py, tileW, tileH); } catch {}
            tileStore.set(`${dx},${dy}`, img);
            loadedMap.add(`${dx},${dy}`);
            loadedCount = loadedMap.size;
            if (currentQueue && currentQueue.length > 0) {
              assemblingProgress = Math.max(0, Math.min(100, Math.round(100 * loadedMap.size / Math.max(1, currentQueue.length))));
              updateAssembleEta();
            }
            remaining--;
            drawPreview();
            if (reqDelayMs > 0) await sleep(reqDelayMs);
          } else {
            task.attempt = (task.attempt || 0) + 1;
            await sleep(retryDelayMs);
            todo.push(task);
          }
        }
      }
      const pool = Array.from({ length: workers }, () => worker());
      await Promise.all(pool);
    } catch (e) {
      assembleErr = String(e?.message || e) || 'Ошибка сборки';
    } finally {
      assembling = false;
      assemblingProgress = 100; assembleEtaText = '0:00';
      
      try { netAbort && netAbort.abort(); } catch {}
      netAbort = null;
      if (animId) { try { cancelAnimationFrame(animId); } catch {}; animId = 0; }
      
      try { drawPreview(); } catch {}
    }
  }

  function cancelAssemble() { assembleToken++; assembling = false; try { netAbort && netAbort.abort(); } catch {}; netAbort = null; try { drawPreview(); } catch {} }

  function utf8encode(str) {
    try { return new TextEncoder().encode(str); } catch { return new Uint8Array([]); }
  }

  let _crcTable = null;
  function crc32(buf) {
    if (!_crcTable) {
      _crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) { c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); }
        _crcTable[n] = c >>> 0;
      }
    }
    let c = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) { c = (_crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0; }
    return (c ^ (-1)) >>> 0;
  }

  async function deflateRaw(data) {
    try {
      if (typeof CompressionStream === 'undefined') return null;
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const out = new Uint8Array(await new Response(stream).arrayBuffer());
      return out;
    } catch { return null; }
  }

  async function createZip(files) {
    try {
      const chunks = [];
      const centrals = [];
      let offset = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const nameBytes = utf8encode(f.name || ('file' + (i+1)));
        const ab = await f.blob.arrayBuffer();
        const data = new Uint8Array(ab);
        const size = data.length >>> 0;
        const crc = crc32(data) >>> 0;
        let method = 0; 
        let store = data;
        const deflated = await deflateRaw(data);
        if (deflated && deflated.length < data.length) { method = 8; store = deflated; }
        const csize = store.length >>> 0;

        const local = new Uint8Array(30 + nameBytes.length);
        const dv = new DataView(local.buffer);
        dv.setUint32(0, 0x04034b50, true);
        dv.setUint16(4, 20, true);
        dv.setUint16(6, 0x0800, true);
        dv.setUint16(8, method, true);
        dv.setUint16(10, 0, true);
        dv.setUint16(12, 0, true);
        dv.setUint32(14, crc, true);
        dv.setUint32(18, csize, true);
        dv.setUint32(22, size, true);
        dv.setUint16(26, nameBytes.length, true);
        dv.setUint16(28, 0, true);
        local.set(nameBytes, 30);
        const localOffset = offset;
        chunks.push(local); offset += local.length;
        chunks.push(store); offset += store.length;
        const cd = new Uint8Array(46 + nameBytes.length);
        const dv2 = new DataView(cd.buffer);
        dv2.setUint32(0, 0x02014b50, true);
        dv2.setUint16(4, 20, true);
        dv2.setUint16(6, 20, true);
        dv2.setUint16(8, 0x0800, true);
        dv2.setUint16(10, method, true);
        dv2.setUint16(12, 0, true);
        dv2.setUint16(14, 0, true);
        dv2.setUint32(16, crc, true);
        dv2.setUint32(20, csize, true);
        dv2.setUint32(24, size, true);
        dv2.setUint16(28, nameBytes.length, true);
        dv2.setUint16(30, 0, true);
        dv2.setUint16(32, 0, true);
        dv2.setUint16(34, 0, true);
        dv2.setUint16(36, 0, true);
        dv2.setUint32(38, 0, true);
        dv2.setUint32(42, localOffset >>> 0, true);
        cd.set(nameBytes, 46);
        centrals.push(cd);
      }
      const startCD = offset;
      for (const c of centrals) { chunks.push(c); offset += c.length; }
      const eocd = new Uint8Array(22);
      const dv3 = new DataView(eocd.buffer);
      dv3.setUint32(0, 0x06054b50, true);
      dv3.setUint16(4, 0, true);
      dv3.setUint16(6, 0, true);
      dv3.setUint16(8, files.length, true);
      dv3.setUint16(10, files.length, true);
      dv3.setUint32(12, (offset - startCD) >>> 0, true);
      dv3.setUint32(16, startCD >>> 0, true);
      dv3.setUint16(20, 0, true);
      chunks.push(eocd);
      return new Blob(chunks, { type: 'application/zip' });
    } catch { return null; }
  }

  function pngChunk(type, data) {
    try {
      const t0 = type.charCodeAt(0) & 255;
      const t1 = type.charCodeAt(1) & 255;
      const t2 = type.charCodeAt(2) & 255;
      const t3 = type.charCodeAt(3) & 255;
      const len = (data?.length|0) >>> 0;
      const out = new Uint8Array(12 + len);
      const dv = new DataView(out.buffer);
      dv.setUint32(0, len, false);
      out[4] = t0; out[5] = t1; out[6] = t2; out[7] = t3;
      if (len) out.set(data, 8);
      const tmp = new Uint8Array(4 + len);
      tmp[0] = t0; tmp[1] = t1; tmp[2] = t2; tmp[3] = t3;
      if (len) tmp.set(data, 4);
      const crc = crc32(tmp) >>> 0;
      dv.setUint32(8 + len, crc, false);
      return out;
    } catch { return new Uint8Array(0); }
  }

  async function createPngStreaming(minDx, minDy, maxDx, maxDy) {
    try {
      if (typeof CompressionStream === 'undefined') return null;
      const tw = tileW || 256;
      const th = tileH || 256;
      const tilesW = (maxDx - minDx + 1);
      const tilesH = (maxDy - minDy + 1);
      const W = tilesW * tw;
      const H = tilesH * th;

      const sig = new Uint8Array([137,80,78,71,13,10,26,10]);
      const ihdr = new Uint8Array(13);
      const dv = new DataView(ihdr.buffer);
      dv.setUint32(0, W >>> 0, false);
      dv.setUint32(4, H >>> 0, false);
      ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

      const comp = new CompressionStream('deflate');
      const w = comp.writable.getWriter();
      const reader = comp.readable.getReader();
      const idatParts = [];
      let collecting = true;
      const collect = (async ()=>{ try { while (true) { const r = await reader.read(); if (r.done) break; if (r.value && r.value.length) idatParts.push(new Uint8Array(r.value)); } } catch {} finally { collecting = false; } })();

      const sh = Math.max(1, Math.min(256, H));
      const off = document.createElement('canvas');
      off.width = W; off.height = sh;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      const keys = Array.from(loadedMap);
      for (let y = 0; y < H; y += sh) {
        const h2 = Math.min(sh, H - y);
        ctx.clearRect(0, 0, W, h2);
        if (composedCanvas) {
          const sx = (minDx + halfCache) * tw;
          const sy = (minDy + halfCache) * th + y;
          try { ctx.drawImage(composedCanvas, sx, sy, W, h2, 0, 0, W, h2); } catch {}
        }
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const parts = String(key).split(',');
          const dx = parseInt(parts[0]);
          const dy = parseInt(parts[1]);
          const img = tileStore.get(key);
          if (!img) continue;
          const tx0 = (dx - minDx) * tw;
          const ty0 = (dy - minDy) * th;
          const tx1 = tx0 + tw;
          const ty1 = ty0 + th;
          const sx0 = 0;
          const sy0 = y;
          const sx1 = W;
          const sy1 = y + h2;
          const ix0 = Math.max(sx0, tx0);
          const iy0 = Math.max(sy0, ty0);
          const ix1 = Math.min(sx1, tx1);
          const iy1 = Math.min(sy1, ty1);
          const iw = Math.max(0, ix1 - ix0);
          const ih = Math.max(0, iy1 - iy0);
          if (iw <= 0 || ih <= 0) continue;
          const sxi = ix0 - tx0;
          const syi = iy0 - ty0;
          const dxi = ix0 - sx0;
          const dyi = iy0 - sy0;
          try { ctx.drawImage(img, sxi, syi, iw, ih, dxi, dyi, iw, ih); } catch {}
        }
        const imgData = ctx.getImageData(0, 0, W, h2).data;
        for (let ry = 0; ry < h2; ry++) {
          const row = new Uint8Array(1 + W * 4);
          row[0] = 0;
          row.set(imgData.subarray(ry * W * 4, (ry + 1) * W * 4), 1);
          try { await w.write(row); } catch {}
        }
        saveStage = 'Cохранение'; saveProgress = Math.max(0, Math.min(100, Math.round(100 * Math.min(H, y + h2) / Math.max(1, H)))); updateEta()
        if ((y & 1023) === 0) await nextFrame();
      }
      try { await w.close(); } catch {}
      try { await collect; } catch {}
      const out = [];
      out.push(sig);
      out.push(pngChunk('IHDR', ihdr));
      for (let i = 0; i < idatParts.length; i++) { const part = idatParts[i]; if (part && part.length) out.push(pngChunk('IDAT', part)); }
      out.push(pngChunk('IEND', new Uint8Array(0)));
      return new Blob(out, { type: 'image/png' });
    } catch { return null; }
  }

  async function saveWithWorkerArea(minDx, minDy, maxDx, maxDy) {
    try {
      if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') return null;
      const tw = tileW || 256;
      const th = tileH || 256;
      const tilesW = (maxDx - minDx + 1);
      const tilesH = (maxDy - minDy + 1);
      const w = tilesW * tw;
      const h = tilesH * th;
      const list = [];
      const transfers = [];
      for (const key of loadedMap) {
        const parts = String(key).split(',');
        const dx = parseInt(parts[0]);
        const dy = parseInt(parts[1]);
        if (!(dx >= minDx && dx <= maxDx && dy >= minDy && dy <= maxDy)) continue;
        const img = tileStore.get(key);
        if (!img) continue;
        let bmp = img;
        const isBitmap = typeof ImageBitmap !== 'undefined' && bmp && (typeof bmp.close === 'function');
        if (!isBitmap) {
          try { bmp = await createImageBitmap(img); } catch { continue; }
        }
        list.push({ dx, dy, bitmap: bmp });
        try { transfers.push(bmp); } catch {}
      }
      if (list.length === 0) return null;
      const code = 'self.onmessage=async e=>{const d=e.data;const c=new OffscreenCanvas(d.width,d.height);const ctx=c.getContext("2d",{willReadFrequently:false});ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,d.width,d.height);const tw=d.tileW|0,th=d.tileH|0,minDx=d.minDx|0,minDy=d.minDy|0,list=d.tiles||[];const total=list.length|0;for(let i=0;i<total;i++){const t=list[i];const x=(t.dx-minDx)*tw;const y=(t.dy-minDy)*th;try{ctx.drawImage(t.bitmap,x,y,tw,th)}catch{}try{t.bitmap.close&&t.bitmap.close()}catch{}if((i&31)===0){let p=Math.max(0,Math.min(100,Math.round(100*(i+1)/Math.max(1,total))));try{self.postMessage({progress:p})}catch{}}}let b=null;try{b=await c.convertToBlob({type:d.type||"image/png"})}catch{}try{self.postMessage({done:true,ok:!!b,blob:b})}catch{self.postMessage({done:true,ok:false})}};';
      const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
      const worker = new Worker(url);
      return await new Promise((resolve) => {
        worker.onmessage = (ev) => {
          const d = ev.data || {};
          if (typeof d.progress === 'number') { try { saveProgress = Math.max(0, Math.min(100, Math.round(d.progress))); saveStage = 'Cохранение'; updateEta(); } catch {} return; }
          const blob = d && d.ok ? d.blob : null;
          try { worker.terminate(); URL.revokeObjectURL(url); } catch {}
          resolve(blob || null);
        };
        worker.onerror = () => { try { worker.terminate(); URL.revokeObjectURL(url); } catch {}; resolve(null); };
        worker.postMessage({ width: w, height: h, tiles: list, tileW: tw, tileH: th, minDx, minDy, type: 'image/png' }, transfers);
      });
    } catch { return null; }
  }

  async function downloadPNG() {
    try {
      if (saving) return;
      saving = true; saveProgress = 0; saveStage = 'старт'; saveStartMs = Date.now(); saveEtaText = '—'; console.log('[CopyArt][save] start');
      if (!loadedMap || loadedMap.size === 0) {
        alert('Нет данных для сохранения. Сначала загрузите хотя бы один тайл.');
        return;
      }
      const keys = Array.from(loadedMap);
      let minDx = Infinity, minDy = Infinity, maxDx = -Infinity, maxDy = -Infinity;
      for (const key of keys) {
        const parts = String(key).split(',');
        const dx = parseInt(parts[0]);
        const dy = parseInt(parts[1]);
        if (!isFinite(dx) || !isFinite(dy)) continue;
        if (dx < minDx) minDx = dx;
        if (dx > maxDx) maxDx = dx;
        if (dy < minDy) minDy = dy;
        if (dy > maxDy) maxDy = dy;
      }
      if (!isFinite(minDx) || !isFinite(minDy) || !isFinite(maxDx) || !isFinite(maxDy)) {
        alert('Нет данных для сохранения.');
        return;
      }
      const tw = tileW || 256;
      const th = tileH || 256;
      const tilesW = (maxDx - minDx + 1);
      const tilesH = (maxDy - minDy + 1);
      const wTotal = tilesW * tw;
      const hTotal = tilesH * th;
      const MAX_W = 12000, MAX_H = 12000, MAX_PX = 80000000;
      let useChunks = false, gx = 1, gy = 1;
      if (accelSave && accelGrid > 1) { useChunks = true; gx = Math.max(1, Math.floor(accelGrid)); gy = gx; }
      if (useChunks) {
        console.log('[CopyArt][save] accel on');
        const chunkTW = Math.ceil(tilesW / gx);
        const chunkTH = Math.ceil(tilesH / gy);
        const files = [];
        const total = gx * gy; let done = 0;
        for (let cy = 0; cy < gy; cy++) {
          for (let cx = 0; cx < gx; cx++) {
            const dx0 = minDx + cx * chunkTW;
            const dy0 = minDy + cy * chunkTH;
            const dx1 = Math.min(maxDx, dx0 + chunkTW - 1);
            const dy1 = Math.min(maxDy, dy0 + chunkTH - 1);
            if (dx0 > dx1 || dy0 > dy1) continue;
            const w = (dx1 - dx0 + 1) * tw;
            const h = (dy1 - dy0 + 1) * th;
            console.log('[CopyArt][save] chunk', { cx: cx+1, cy: cy+1, w, h, dx0, dy0, dx1, dy1 });
            const off = document.createElement('canvas');
            off.width = w; off.height = h;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, w, h);
            if (composedCanvas) {
              const sx = (dx0 + halfCache) * tw;
              const sy = (dy0 + halfCache) * th;
              try { ctx.drawImage(composedCanvas, sx, sy, w, h, 0, 0, w, h); } catch {}
            }
            for (const key of keys) {
              const parts = String(key).split(',');
              const dx = parseInt(parts[0]);
              const dy = parseInt(parts[1]);
              if (dx < dx0 || dx > dx1 || dy < dy0 || dy > dy1) continue;
              const img = tileStore.get(key);
              if (!img) continue;
              const dx2 = (dx - dx0) * tw;
              const dy2 = (dy - dy0) * th;
              try { ctx.drawImage(img, dx2, dy2, tw, th); } catch {}
            }
            await nextFrame();
            const blob = await new Promise((resolve) => off.toBlob((b)=>resolve(b), 'image/png'));
            if (blob) {
              const partName = center ? `tiles_${center.x}_${center.y}_${tilesW}x${tilesH}_r${cy+1}c${cx+1}.png` : `tiles_${tilesW}x${tilesH}_r${cy+1}c${cx+1}.png`;
              files.push({ name: partName, blob });
              console.log('[CopyArt][save] chunk added', partName);
            } else {
              console.warn('[CopyArt][save] empty chunk', { cx, cy });
            }
            done++; saveProgress = Math.max(0, Math.min(100, Math.round(100 * done / total))); saveStage = 'zip'; updateEta();
          }
        }
        console.log('[CopyArt][save] generating zip (store/deflate)');
        let zipBlob = await createZipWorker(files);
        if (!zipBlob) zipBlob = await createZip(files);
        if (zipBlob) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(zipBlob);
          const base = center ? `tiles_${center.x}_${center.y}_${tilesW}x${tilesH}` : `tiles_${tilesW}x${tilesH}`;
          a.download = `${base}_split${gx}x${gy}.zip`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch {} }, 600);
          return;
        } else {
          console.warn('[CopyArt][save] zip generation failed, fallback to single');
        }
      }
      const w = wTotal;
      const h = hTotal;

      {
        const workerBlob0 = await saveWithWorkerArea(minDx, minDy, maxDx, maxDy);
        if (workerBlob0) {
          saveProgress = 100; saveStage = 'готово';
          const a = document.createElement('a');
          a.href = URL.createObjectURL(workerBlob0);
          const name = center ? `tiles_${center.x}_${center.y}_${tilesW}x${tilesH}.png` : `tiles_${tilesW}x${tilesH}.png`;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch {} }, 500);
          return;
        }
      }

      if (w > MAX_W || h > MAX_H || (w * h) > MAX_PX) {
        console.log('[CopyArt][save] large image -> streaming PNG');
        const streamBlob = await createPngStreaming(minDx, minDy, maxDx, maxDy);
        if (streamBlob) {
          saveProgress = 100; saveStage = 'готово';
          const a = document.createElement('a');
          a.href = URL.createObjectURL(streamBlob);
          const name = center ? `tiles_${center.x}_${center.y}_${tilesW}x${tilesH}.png` : `tiles_${tilesW}x${tilesH}.png`;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch {} }, 500);
          return;
        } else {
          console.warn('[CopyArt][save] streaming PNG not available, trying canvas path');
        }
      }
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const ctx = off.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      console.log('[CopyArt][save] single path', { w, h, tilesW, tilesH, minDx, minDy, maxDx, maxDy });
      if (composedCanvas) {
        const sx = (minDx + halfCache) * tw;
        const sy = (minDy + halfCache) * th;
        try { ctx.drawImage(composedCanvas, sx, sy, w, h, 0, 0, w, h); } catch {}
      }
      const totalTiles = keys.length;
      let drawnTiles = 0;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const parts = String(key).split(',');
        const dx = parseInt(parts[0]);
        const dy = parseInt(parts[1]);
        const img = tileStore.get(key);
        if (!img) continue;
        const dx2 = (dx - minDx) * tw;
        const dy2 = (dy - minDy) * th;
        try { ctx.drawImage(img, dx2, dy2, tw, th); } catch {}
        drawnTiles++;
        if ((i & 31) === 0) { saveProgress = Math.max(0, Math.min(100, Math.round(100 * drawnTiles / Math.max(1, totalTiles)))); saveStage = 'Cохранение'; updateEta(); await nextFrame(); }
      }
      await nextFrame();
      let blob = await new Promise((resolve) => off.toBlob((b)=>resolve(b), 'image/png'));
      if (!blob) {
        console.warn('[CopyArt][save] single toBlob failed, trying streaming');
        const streamBlob = await createPngStreaming(minDx, minDy, maxDx, maxDy);
        if (streamBlob) {
          blob = streamBlob;
        } else {
          console.warn('[CopyArt][save] streaming PNG failed, trying worker');
          const workerBlob = await saveWithWorkerArea(minDx, minDy, maxDx, maxDy);
          if (workerBlob) {
            blob = workerBlob;
          } else {
            alert('Не удалось собрать PNG. Попробуйте включить «Ускорение сохранения» и сохранить как ZIP.');
            return;
          }
        }
      }
      saveProgress = 100; saveStage = 'готово';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const name = center ? `tiles_${center.x}_${center.y}_${tilesW}x${tilesH}.png` : `tiles_${tilesW}x${tilesH}.png`;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch {} }, 500);
    } catch {}
    finally { saving = false; try { drawPreview(); } catch {} }
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

  
  $: if (open) {
    tick().then(async ()=>{ try { await ensurePreviewLayout(); fitPreview(); drawPreview(); } catch {} });
  }

  
  $: if (!open) {
    try { cancelAssemble(); } catch {}
    try { if (animId) cancelAnimationFrame(animId); } catch {}
    animId = 0; currentQueue = []; loadedMap = new Set(); loadedCount = 0;
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
                <button type="button" class="tile {gridSize===s && !isCustomMode ? 'selected' : ''}" aria-pressed={gridSize===s && !isCustomMode} on:click={() => selectPresetSize(s)}>
                  <div class="tile-inner">
                    <span class="name">{s}×{s}</span>
                  </div>
                  <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
                </button>
              {/each}
              <button type="button" class="tile custom-tile {isCustomMode ? 'selected' : ''}" aria-pressed={isCustomMode} on:click={() => { isCustomMode = true; selectionRect = null; selecting = false; }}>
                <div class="tile-inner">
                  <span class="name">Кастом</span>
                </div>
                <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
              </button>
            </div>
            {#if isCustomMode}
              <div class="custom-input-row">
                <input 
                  type="number" 
                  class="custom-size-input" 
                  bind:value={customSize} 
                  placeholder="Размер"
                  min="1" 
                  max="99" 
                  step="2"
                  inputmode="numeric"
                  on:input={setCustomSize}
                  on:change={() => { customSize = clampCustomSize(customSize); setCustomSize(); }}
                  on:blur={() => { customSize = clampCustomSize(customSize); }}
                />
                <div class="custom-hint">Нечётные числа 1-99</div>
              </div>
            {/if}
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
              <label class="mono" for="concurrency">Параллельность</label>
              <input id="concurrency" class="num" type="number" min="1" max="64" step="1" bind:value={maxConcurrent} style="width:100px" />
            </div>
            <div class="row">
              <label class="mono" for="reqDelay">{t('copyart.reqDelay')}</label>
              <input id="reqDelay" class="num" type="number" min="50" step="50" bind:value={reqDelayMs} style="width:100px" />
            </div>
            <div class="row">
              <label class="mono" for="retryDelay">{t('copyart.retryDelay')}</label>
              <input id="retryDelay" class="num" type="number" min="500" step="100" bind:value={retryDelayMs} style="width:100px" />
            </div>
            <div class="row" style="align-items:center">
              <label class="mono" for="accelSave">Разделение на части</label>
              <input id="accelSave" type="checkbox" bind:checked={accelSave} />
            </div>
            {#if accelSave}
            <div class="row">
              <label class="mono" for="accelGrid">Размер сетки (N×N)</label>
              <input id="accelGrid" class="num" type="number" min="2" max="9" step="1" bind:value={accelGrid} style="width:100px" />
            </div>
            {/if}
          </div>
        </div>
        <div class="right" bind:this={previewEl} use:previewSizer>
          {#if !composedCanvas}
            <div class="empty-preview">
              <div class="empty-card">
                <svg class="empty-icon" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.8" fill="#2a2c32" stroke="#3a3d45"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.8" fill="#2a2c32" stroke="#3a3d45"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.8" fill="#2a2c32" stroke="#3a3d45"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.8" fill="#2a2c32" stroke="#3a3d45"/>
                </svg>
                <div class="empty-title">{t('copyart.title')}</div>
                <div class="empty-sub">{t('copyart.noPreview')}</div>
              </div>
            </div>
          {:else}
            <canvas bind:this={prevCanvas}
                    on:wheel={onWheel}
                    on:pointerdown={onPointerDown}
                    on:pointermove={onPointerMove}
                    on:pointerup={onPointerUp}
                    on:pointercancel={onPointerUp}
                    on:contextmenu={(e)=>e.preventDefault()}></canvas>
          {/if}
          {#if saving}
            <div class="save-toast">
              <div class="save-bar"><div class="save-bar-fill" style="width: {Math.max(0, Math.min(100, saveProgress))}%"></div></div>
              <div class="save-meta">
                <span class="save-stage">{saveStage}</span>
                <span class="save-perc">{saveProgress}%</span>
                <span class="save-eta">ETA: {saveEtaText}</span>
              </div>
            </div>
          {/if}
          {#if assembling}
            <div class="assem-toast">
              <div class="save-bar"><div class="save-bar-fill" style="width: {Math.max(0, Math.min(100, assemblingProgress))}%"></div></div>
              <div class="save-meta">
                <span class="save-stage">Сборка</span>
                <span class="save-perc">{assemblingProgress}%</span>
                <span class="save-eta">ETA: {assembleEtaText}</span>
              </div>
            </div>
          {/if}
        </div>
      </div>
      <div class="ca-footer">
        <div class="row">
          <div class="hint">{t('copyart.controlsHint')}</div>
          <div style="flex:1"></div>
          <button class="btn" on:click={clearSelection} disabled={!selectionRect || saving}>{t('copyart.clearSelection')}</button>
          <button class="btn btn-primary" on:click={saveSelection} disabled={saving || loadedCount === 0}>{t('copyart.save')}</button>
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
  
  .ca-modal { width: min(1000px, 95vw); max-height: min(88vh, 900px); display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; background: rgba(17,17,17,0.96); color: #fff; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 16px 36px rgba(0,0,0,0.5); backdrop-filter: blur(8px); }
  .ca-header { position: relative; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .ca-header .title { font-weight: 700; }
  .close-x { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; background: #e53935; color: #fff; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.35); cursor: pointer; }
  .ca-body { flex: 1 1 auto; display: grid; grid-template-columns: 300px 1fr; }
  .left { padding: 12px; display: grid; gap: 12px; border-right: 1px solid rgba(255,255,255,0.12); overflow: auto; }
  .right { position: relative; display: grid; place-items: center; background: #0f0f12; }
  .right canvas { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
  .empty-preview { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,0.8); font-size: 13px; pointer-events: none; user-select: none; }
  .empty-card { display: grid; place-items: center; gap: 8px; padding: 18px 20px; max-width: 360px; text-align: center; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 20px rgba(0,0,0,0.35); }
  .empty-icon { opacity: 0.9; }
  .empty-title { font-weight: 700; font-size: 14px; opacity: 0.95; }
  .empty-sub { font-size: 12px; opacity: 0.8; }
  .ca-footer { padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); }

  .group { display: grid; gap: 8px; }
  .group.card { padding: 10px; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; background: rgba(255,255,255,0.04); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
  .label { font-size: 12px; opacity: .9; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
  .hint { opacity: .85; font-size: 12px; }

  
  .qr-dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: grid; place-items: center; z-index: 1000005; }
  .qr-dialog { width: min(560px, 92vw); background: rgba(17,17,17,0.97); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; box-shadow: 0 16px 36px rgba(0,0,0,0.5); padding: 12px; display: grid; gap: 10px; }

  .save-toast, .assem-toast { position: absolute; left: 50%; transform: translateX(-50%); width: min(560px, 94%); background: rgba(20,20,24,0.96); color: #fff; border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,0.55); padding: 10px 12px; z-index: 10; backdrop-filter: blur(6px); pointer-events: none; }
  .save-toast { bottom: 16px; }
  .assem-toast { bottom: 76px; }
  .save-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.35); }
  .save-bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #ff8a3d, #ff6a00); box-shadow: 0 0 12px rgba(255,122,61,0.5); }
  .save-meta { margin-top: 8px; display: flex; gap: 8px; align-items: baseline; justify-content: space-between; font-size: 12px; opacity: 0.95; }
  .save-stage { font-weight: 600; opacity: 0.95; }
  .save-perc { opacity: 0.85; }
  .save-eta { opacity: 0.85; }
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
  .tile .name { font-size: 12px; line-height: 1.2; opacity: 0.95; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
  
  .ants { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; }
  .ants path { stroke: #f3734d; stroke-width: 2; stroke-linecap: butt; stroke-linejoin: round; stroke-dasharray: var(--dash) var(--dash); stroke-dashoffset: 0; filter: drop-shadow(0 0 2px rgba(240,81,35,0.6)); vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
  .tile.selected .ants { opacity: 1; }
  @keyframes antsRun { to { stroke-dashoffset: calc(-2 * var(--dash)); } }
  .tile.selected .ants path { animation: antsRun var(--ants-speed, 1.2s) linear infinite; }

  

  .row { display: flex; gap: 8px; }
  .row label { flex: 1; white-space: normal; }
  .row .num { flex: 0 0 120px; }
  .num { height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; padding: 0 8px; }
  .btn { height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; font-weight: 700; letter-spacing: .2px; box-shadow: 0 1px 2px rgba(0,0,0,0.25); transition: transform .12s ease, filter .12s ease; }
  .btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
  .btn:disabled { opacity: .6; cursor: default; }
  .btn-primary { background: #f05123; border-color: rgba(255,255,255,0.25); }
  .btn-primary:hover { filter: brightness(1.05); }

  .error { color: #ff8a80; font-size: 12px; }

  .custom-input-row { display: grid; gap: 6px; margin-top: 4px; }
  .custom-size-input { 
    height: 32px; 
    border-radius: 8px; 
    border: 1px solid rgba(255,255,255,0.18); 
    background: rgba(255,255,255,0.08); 
    color: #fff; 
    padding: 0 10px; 
    font-size: 13px;
    text-align: center;
  }
  .custom-size-input:focus { 
    outline: none; 
    border-color: #f05123; 
    box-shadow: 0 0 0 2px rgba(240,81,35,0.2); 
  }
  .custom-hint { 
    font-size: 11px; 
    opacity: 0.7; 
    text-align: center; 
    color: rgba(255,255,255,0.65);
  }
  .custom-tile .name { 
    color: rgba(255,255,255,0.9); 
    font-weight: 500; 
  }
</style>
