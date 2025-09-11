<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { resampleImage, blobToObjectUrl, resampleAndDither } from './imageOps';
  import { drawOverlayForTool, paintAtTool, applyGradientOnCanvas, computeMagicRegion, copySelectionRect, writeSelectionRect, applyMagicSelectionOnMask, paintMaskedBlock, applySelectionRectOnMask, buildSelectionAntsCanvas, drawGradientPreviewOverlay, refreshSelectionVisFromMask as refreshSelectionVisFromMaskTool, refreshSelectionVisSubrect } from './tools';
  import { downloadBlob } from './save';
  import { RESAMPLE_METHODS } from './resamplers';
  import { DITHER_METHODS } from './dithering';
  import { MASTER_COLORS, getFreeIndices, getPalette, getPaletteFromIndices } from './palette';
  import HotkeysInfoModal from './components/Info/HotkeysInfoModal.svelte';
  import MainFab from './components/Fab/MainFab.svelte';
  import CancelFab from './components/Fab/CancelFab.svelte';
  import HeaderStats from './components/Output/HeaderStats.svelte';
  import { t, lang } from '../i18n';
  import { uploadToCatbox, fileNameFromUrl } from '../utils/catbox';
  import { buildCodeCanvas } from '../utils/codeTileEncoder';
  import { setMoveMode } from '../overlay/state';

  export let open = false;
  export let file = null; 

  const dispatch = createEventDispatcher();
  
  $: _i18n_editor_modal_lang = $lang;

  let pixelSize = 1;
  let method = 'nearest';
  let ditherMethod = 'none';
  let ditherLevels = 4;
  let paletteMode = 'full'; 
  let outlineThickness = 0; 
  let erodeAmount = 0; 
  let customIndices = [];
  let customInitialized = false;
  
  $: if (paletteMode === 'custom') {
    if (!customInitialized) {
      customIndices = getFreeIndices();
      customInitialized = true;
    }
  } else {
    customInitialized = false;
  }
  $: customKey = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';

  
  function applyGradient(x0, y0, x1, y1) {
    if (!editCanvas || !outW || !outH) return;
    const ctx = editCanvas.getContext('2d');
    const sel = (selectionMask && selectionCount > 0) ? selectionMask : null;
    const tiles = applyGradientOnCanvas(
      ctx,
      outW,
      outH,
      x0,
      y0,
      x1,
      y1,
      gradientColorA,
      gradientColorB,
      gradientMode,
      sel,
      TILE_SIZE,
    );
    if (tiles && tiles.length) {
      undoStack.push({ tiles });
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
      hasEdits = true;
    }
  }
  let working = false;
  let originalDims = { w: 0, h: 0 };
  let previewUrl = '';
  let modalRef;
  let backdropRef;
  let panelRef;
  
  let waitingForCoords = false;
  let qrFileName = '';
  let qrBannerEl = null;
  let suspendVisible = false; 
  
  let stickerMode = false;
  let stickerCanvas = null;
  let stickerW = 0, stickerH = 0;
  let stickerX = 0, stickerY = 0;
  let stickerDragging = false;
  let stickerOffX = 0, stickerOffY = 0;
  function showQrBanner() {
    try {
      const el = document.createElement('div');
      el.className = 'qr-banner';
      el.textContent = t('qr.prompt');
      Object.assign(el.style, {
        position: 'fixed', top: '54px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(17,17,17,0.95)', color: '#fff', padding: '8px 14px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.2)', zIndex: 2147483645, boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
      });
      document.body.appendChild(el); qrBannerEl = el;
    } catch {}
  }
  function hideQrBanner() { try { if (qrBannerEl) { qrBannerEl.remove(); qrBannerEl = null; } } catch {} }

  async function beginQrGeneration() {
    try {
      
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKey}`:''}`;
      const cached = previewCache.get(key);
      
      const getBaseName = () => {
        try { const n = (file && file.name) ? file.name : 'image.png'; const m = String(n); const dot = m.lastIndexOf('.'); return dot > 0 ? m.slice(0, dot) : m; } catch { return 'image'; }
      };
      const ditherCode = (dm) => { switch (dm) { case 'none': return 'n'; case 'ordered4': return 'o4'; case 'ordered8': return 'o8'; case 'floyd': return 'fs'; case 'atkinson': return 'at'; case 'bayer2': return 'b2'; case 'bayer4': return 'b4'; case 'lines': return 'ln'; case 'random': return 'rnd'; default: return String(dm || 'n'); } };
      const paletteCode = (pm) => pm === 'full' ? 'F' : (pm === 'free' ? 'f' : 'C');
      const base = getBaseName();
      const suffix = `${pixelSize}${ditherCode(ditherMethod)}${ditherLevels}${paletteCode(paletteMode)}${outlineThickness}${erodeAmount}`;
      const filename = `${base}_${suffix}.png`;
      let outBlob = cached?.blob;
      if (!outBlob) {
        outBlob = await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices);
      }
      
      const url = await uploadToCatbox(outBlob, filename);
      qrFileName = fileNameFromUrl(url);
      
      suspendVisible = true; waitingForCoords = true; showQrBanner();
      try { setMoveMode(true); } catch {}
      const coords = await new Promise((resolve) => {
        const on = (ev) => { try { const d = ev?.detail?.coords; if (d && Array.isArray(d)) { window.removeEventListener('wplace:origin', on); resolve(d); } } catch {} };
        window.addEventListener('wplace:origin', on);
      });
      hideQrBanner(); waitingForCoords = false; suspendVisible = false;
      
      const cvs = await buildCodeCanvas(qrFileName, coords);
      stickerCanvas = cvs; stickerW = cvs.width|0; stickerH = cvs.height|0;
      
      stickerX = Math.max(0, Math.floor((outW - stickerW)/2));
      stickerY = Math.max(0, Math.floor((outH - stickerH)/2));
      editMode = true;
      startPanelLockAnimation();
      await tick();
      ensureEditSurface();
      stickerMode = true;
      drawOverlay(hoverPx, hoverPy);
    } catch (e) {
      hideQrBanner(); waitingForCoords = false; suspendVisible = false;
    }
  }

  function confirmSticker() {
    try {
      if (!stickerMode || !stickerCanvas || !editCanvas) return;
      const ctx = editCanvas.getContext('2d');
      const x = Math.max(0, Math.min(outW - stickerW, Math.round(stickerX)));
      const y = Math.max(0, Math.min(outH - stickerH, Math.round(stickerY)));
      let before = null, after = null;
      try { before = ctx.getImageData(x, y, stickerW, stickerH); } catch {}
      try { ctx.imageSmoothingEnabled = false; ctx.drawImage(stickerCanvas, x, y); } catch {}
      try { after = ctx.getImageData(x, y, stickerW, stickerH); } catch {}
      if (before && after) { undoStack.push({ x, y, w: stickerW, h: stickerH, before, after }); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0; hasEdits = true; }
    } catch {}
    stickerMode = false; stickerCanvas = null; drawOverlay(hoverPx, hoverPy);
  }
  function cancelSticker() { stickerMode = false; stickerCanvas = null; drawOverlay(hoverPx, hoverPy); }

  
  let showCancelFab = false;
  let cancelHideTimer = null;
  function onApplyHoverEnter() { if (!editMode) return; if (cancelHideTimer) { clearTimeout(cancelHideTimer); cancelHideTimer = null; } showCancelFab = true; }
  function onApplyHoverLeave() { if (!editMode) return; if (cancelHideTimer) clearTimeout(cancelHideTimer); cancelHideTimer = setTimeout(() => { showCancelFab = false; cancelHideTimer = null; }, 350); }
  function onCancelHoverEnter() { if (!editMode) return; if (cancelHideTimer) { clearTimeout(cancelHideTimer); cancelHideTimer = null; } showCancelFab = true; }
  function onCancelHoverLeave() { if (!editMode) return; if (cancelHideTimer) clearTimeout(cancelHideTimer); cancelHideTimer = setTimeout(() => { showCancelFab = false; cancelHideTimer = null; }, 250); }

  
  let editMode = false;
  let activeTool = 'brush'; 
  
  let tapeStripes = [];
  let showTapes = false;     
  let showLock = false;      
  let lockState = 'locked';  
  let lockPhase = 'enter';   
  
  let brushSize = 3;
  let eraserSize = 3;
  let selectSize = 10; 
  const clampSize = (v) => Math.max(1, Math.min(99, Math.round(v)));
  
  let magicTolerance = 32;
  const clampTolerance = (v) => Math.max(0, Math.min(255, Math.round(v)));
  
  let gradientMode = 'bayer4'; 
  let gradientColorA = (getPalette('free')[0] || [0,0,0]);
  let gradientColorB = (getPalette('free')[1] || [255,255,255]);
  let gradientDragging = false;
  let gradStartPx = -1, gradStartPy = -1, gradEndPx = -1, gradEndPy = -1;
  
  const rgbToCss = (rgb) => `rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},1)`;
  let allowedColors = getPalette('free');
  
  $: allowedColors = (paletteMode === 'custom') ? getPaletteFromIndices(customIndices) : getPalette(paletteMode === 'free' ? 'free' : 'full');
  
  let brushColorRGB = allowedColors[0] || [0,0,0];
  $: if (!allowedColors.some(c => c[0]===brushColorRGB[0] && c[1]===brushColorRGB[1] && c[2]===brushColorRGB[2])) {
    brushColorRGB = allowedColors[0] || [0,0,0];
  }
  $: brushColorCss = rgbToCss(brushColorRGB);
  const COMPACT_ROW = 14;
  let hoverPalette = false;
  function getColorName(rgb) {
    const item = MASTER_COLORS.find(c => c.rgb[0]===rgb[0] && c.rgb[1]===rgb[1] && c.rgb[2]===rgb[2]);
    return item ? item.name : `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }
  function onGlobalWheel(e) {
    if (stickerMode) return; 
    if (!e.altKey) return; 
    if (!editMode) return;
    if (activeTool !== 'brush' && activeTool !== 'eraser' && activeTool !== 'select' && activeTool !== 'magic') return;
    e.preventDefault();
    
    
    if (isDrawing) isDrawing = false;
    const dir = e.deltaY < 0 ? 1 : -1; 
    if (activeTool === 'brush') brushSize = clampSize(brushSize + dir);
    if (activeTool === 'eraser') eraserSize = clampSize(eraserSize + dir);
    if (activeTool === 'select') selectSize = clampSize(selectSize + dir);
    if (activeTool === 'magic') { magicTolerance = clampTolerance(magicTolerance + dir); magicHintUntil = (performance.now ? performance.now() : Date.now()) + 1200; }
    
    if (hoverPx >= 0 && hoverPy >= 0) drawOverlay(hoverPx, hoverPy);
  }
  
  let hoverBrushBtn = false;
  let hoverEraserBtn = false;
  let hoverSelectBtn = false;
  let hoverMagicBtn = false;
  let hoverGradientBtn = false;
  let showGradientModes = false;
  let gradientModesHideTimer = null;
  function openGradientModes() {
    if (gradientModesHideTimer) { try { clearTimeout(gradientModesHideTimer); } catch {} gradientModesHideTimer = null; }
    showGradientModes = true;
  }
  function closeGradientModesSoon(delay = 350) {
    if (gradientModesHideTimer) { try { clearTimeout(gradientModesHideTimer); } catch {} }
    gradientModesHideTimer = setTimeout(() => { showGradientModes = false; gradientModesHideTimer = null; }, delay);
  }
  
  let magicHintUntil = 0;
  function buildTapeStripes() {
    const count = 8 + Math.floor(Math.random() * 5); 
    const step = 100 / count;
    tapeStripes = Array.from({ length: count }).map((_, i) => {
      const sign = Math.random() < 0.5 ? -1 : 1;
      const angle = sign * (10 + Math.random() * 25); 
      const base = (i + 0.5) * step; 
      const jitter = (Math.random() * step * 0.4) - (step * 0.2); 
      const top = Math.max(5, Math.min(95, Math.round(base + jitter)));
      return {
        angle: angle.toFixed(2),
        top,                                        
        speed: 6 + Math.random() * 4,               
        delay: -(Math.random() * 4),                
        dir: (i % 2 === 0) ? 'normal' : 'reverse',  
        growDelay: Math.round(Math.random() * 200),  
      };
    });
  }
  function startPanelLockAnimation() {
    buildTapeStripes();
    showLock = true;
    showTapes = false;
    lockState = 'unlocked';
    lockPhase = 'enter';
    
    setTimeout(() => { lockPhase = 'center'; }, 10);
    
    setTimeout(() => {
      lockState = 'locked';
      
      const hold = 200 + Math.floor(Math.random() * 300);
      setTimeout(() => {
        showTapes = true;
        
        lockPhase = 'leave';
        
        setTimeout(() => { showLock = false; }, 200);
      }, hold);
    }, 200);
  }
  function toggleEditMode() {
    editMode = !editMode;
    if (editMode) startPanelLockAnimation();
    if (!editMode) {
      activeTool = 'brush'; showTapes = false; showLock = false; lockState = 'locked';
      resetSelectionNoHistory();
      drawOverlay(-1, -1);
    }
  }
  function pickTool(t) {
    activeTool = t;
    if (!editMode) {
      editMode = true;
      startPanelLockAnimation();
    }
  }
  function cancelEdit() {
    editMode = false;
    activeTool = 'brush';
    zoom = 1; panX = 0; panY = 0; layoutStage();
    
    undoStack = []; redoStack = []; hasEdits = false;
    
    resetSelectionNoHistory();
    drawOverlay(-1, -1);
  }
  async function applyEdit() {
    
    try {
      if (!editCanvas) { editMode = false; activeTool = 'brush'; undoStack = []; redoStack = []; hasEdits = false; return; }
      
      if (!hasEdits) {
        
        editMode = false; activeTool = 'brush';
        zoom = 1; panX = 0; panY = 0; layoutStage();
        undoStack = []; redoStack = []; hasEdits = false;
        resetSelectionNoHistory();
        drawOverlay(-1, -1);
        return;
      }
      
      const blob = await new Promise((resolve, reject) => {
        try {
          editCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
        } catch (err) { reject(err); }
      });
      
      file = blob; 
      hadPixelEdits = true;
      
      try { for (const v of previewCache.values()) { try { v.revoke && v.revoke(); } catch {} } } catch {}
      previewCache.clear();
      fileStamp = Date.now();
      
      await loadOriginalDims();
      
      
      pixelSize = 1;
      method = 'nearest';
      ditherMethod = 'none';
      ditherLevels = 4;
      paletteMode = 'full';
      outlineThickness = 0;
      erodeAmount = 0;
      customIndices = [];
      customInitialized = false;
      previewUrl = '';
      await tick();
      
      dispatch('update', { blob, pixelSize, method, ditherMethod, ditherLevels });
      
      await tick();
      
      try {
        const ps = pixelSize;
        pixelSize = (ps === 1) ? 2 : 1;
        await tick();
        pixelSize = 1;
        await tick();
      } catch {}
      
      working = false;
      await updatePreview();
    } catch {}
    
    editMode = false;
    activeTool = 'brush';
    zoom = 1; panX = 0; panY = 0; layoutStage();
    showTapes = false; showLock = false; lockState = 'locked'; lockPhase = 'enter';
    isDrawing = false; hoverPx = hoverPy = -1;
    
    undoStack = []; redoStack = []; hasEdits = false;
    
    resetSelectionNoHistory();
    drawOverlay(-1, -1);
  }

  
  let outputBox;           
  let editCanvas;          
  let overlayCanvas;       
  let isDrawing = false;   
  let hoverPx = -1, hoverPy = -1; 
  
  let zoom = 1;            
  let panX = 0, panY = 0;  
  let isPanning = false;
  let panStartPointerX = 0, panStartPointerY = 0;
  let panStartX = 0, panStartY = 0;
  
  let isSizing = false;
  let sizeStartY = 0;
  let sizeStartValue = 0;
  let sizeFrozenPx = -1, sizeFrozenPy = -1; 
  
  let hasEdits = false;
  let undoStack = []; 
  let redoStack = [];
  
  let hadPixelEdits = false;
  
  
  let strokeTiles = new Map();
  const TILE_SIZE = 16; 
  
  let selectionMask = null;    
  let selectionVisCanvas = null; 
  let selectionVisCtx = null;
  let isSelecting = false;     
  let selectionOp = 'replace'; 
  let selectionReplaceCleared = false; 
  let selectionCount = 0;      
  
  let selectionAntsCanvas = null;
  let selectionAntsCtx = null;
  
  let selectionStrokeTiles = new Map(); 
  
  let showInfo = false;

  function getDisplayMetrics() {
    const box = outputBox?.getBoundingClientRect();
    if (!box || !outW || !outH) return null;
    const baseScale = Math.min(box.width / outW, box.height / outH);
    const scale = baseScale * (editMode ? zoom : 1);
    const dw = Math.floor(outW * scale);
    const dh = Math.floor(outH * scale);
    const ox = Math.round((box.width - dw) / 2);
    const oy = Math.round((box.height - dh) / 2);
    return { scale, dw, dh, ox, oy, bw: box.width, bh: box.height };
  }

  async function ensureEditSurface() {
    if (!editMode || !previewUrl || !outW || !outH || !editCanvas) return;
    
    try {
      if (editCanvas) {
        
        editCanvas.width = outW;
        editCanvas.height = outH;
      }
      const img = new Image();
      img.src = previewUrl;
      await img.decode();
      const ctx = editCanvas.getContext('2d');
      ctx.clearRect(0, 0, outW, outH);
      ctx.drawImage(img, 0, 0, outW, outH);
      
      ensureSelectionSurfaces();
      drawOverlay(-1, -1); 
      layoutStage();
    } catch (e) {
      
    }
  }

  function layoutStage() {
    const m = getDisplayMetrics();
    if (!m) return;
    
    const ov = overlayCanvas;
    const ec = editCanvas;
    if (!ov || !ec) return;
    ov.width = m.dw; ov.height = m.dh;
    ov.style.left = m.ox + 'px';
    ov.style.top = m.oy + 'px';
    ov.style.width = m.dw + 'px'; ov.style.height = m.dh + 'px';
    
    ec.style.left = m.ox + 'px';
    ec.style.top = m.oy + 'px';
    ec.style.width = m.dw + 'px'; ec.style.height = m.dh + 'px';
    
    const tx = editMode ? panX : 0;
    const ty = editMode ? panY : 0;
    ov.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(ty)}px, 0)`;
    ec.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(ty)}px, 0)`;
  }

  function screenToPixel(clientX, clientY) {
    const m = getDisplayMetrics();
    if (!m) return { px: -1, py: -1 };
    const x = clientX - outputBox.getBoundingClientRect().left;
    const y = clientY - outputBox.getBoundingClientRect().top;
    const addX = editMode ? panX : 0;
    const addY = editMode ? panY : 0;
    const lx = x - m.ox - addX;
    const ly = y - m.oy - addY;
    if (lx < 0 || ly < 0 || lx >= m.dw || ly >= m.dh) return { px: -1, py: -1 };
    const px = Math.floor(lx / m.scale);
    const py = Math.floor(ly / m.scale);
    return { px, py };
  }

  function drawOverlay(px, py) {
    const m = getDisplayMetrics();
    if (!m) return;
    const ctx = overlayCanvas.getContext('2d');
    const size = activeTool === 'brush' ? brushSize : (activeTool === 'eraser' ? eraserSize : (activeTool === 'select' ? selectSize : undefined));
    
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (stickerMode && stickerCanvas && outW && outH) {
      const s = m.scale;
      const dx = Math.round(stickerX * s);
      const dy = Math.round(stickerY * s);
      const dw = Math.round(stickerW * s);
      const dh = Math.round(stickerH * s);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      try { ctx.globalAlpha = 1; } catch {}
      
      ctx.drawImage(stickerCanvas, 0, 0, stickerW, stickerH, dx, dy, dw, dh);
      
      ctx.save();
      ctx.lineJoin = 'miter';
      
      ctx.strokeStyle = 'rgba(240,81,35,0.35)'; 
      ctx.lineWidth = Math.max(4, Math.round(0.015 * Math.max(dw, dh)));
      ctx.shadowColor = 'rgba(240,81,35,0.6)';
      ctx.shadowBlur = 8;
      ctx.strokeRect(dx - 2, dy - 2, dw + 4, dh + 4);
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff8c00';
      ctx.lineWidth = Math.max(2, Math.round(0.006 * Math.max(dw, dh)));
      const dash = Math.max(6, Math.round(0.04 * Math.max(dw, dh)));
      const gap = Math.max(4, Math.round(dash * 0.7));
      try { ctx.setLineDash([dash, gap]); } catch {}
      ctx.strokeRect(dx - 1, dy - 1, dw + 2, dh + 2);
      
      try { ctx.setLineDash([]); } catch {}
      ctx.restore();
      ctx.restore();
      return;
    }
    
    if (selectionCount > 0) {
      if (isSelecting && selectionVisCanvas) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(selectionVisCanvas, 0, 0, outW, outH, 0, 0, m.dw, m.dh);
        ctx.restore();
      } else {
        if (!selectionAntsCanvas) rebuildSelectionAnts();
        if (selectionAntsCanvas) {
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(selectionAntsCanvas, 0, 0, outW, outH, 0, 0, m.dw, m.dh);
          ctx.restore();
        }
      }
    }
    
    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'select') {
      drawOverlayForTool(ctx, m, px, py, activeTool, size, activeTool==='brush' ? brushColorCss : undefined);
    }
    
    if (activeTool === 'gradient' && gradientDragging && gradStartPx >= 0 && gradStartPy >= 0) {
      drawGradientPreviewOverlay(ctx, m.scale, gradStartPx, gradStartPy, px, py, gradientColorA, gradientColorB);
    }
    
    if (activeTool === 'magic' && px >= 0 && py >= 0 && (isSizing || ((performance.now ? performance.now() : Date.now()) <= magicHintUntil))) {
      const s = m.scale;
      const dx = Math.round(px * s + 8);
      const dy = Math.round(py * s + 8);
      const text = String(magicTolerance);
      ctx.save();
      ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.textBaseline = 'top';
      const pad = 4;
      const th = 18;
      const tw = Math.ceil(ctx.measureText(text).width);
      ctx.fillStyle = 'rgba(17,17,17,0.95)';
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.fillRect(dx, dy, tw + pad * 2, th);
      ctx.strokeRect(dx + 0.5, dy + 0.5, tw + pad * 2 - 1, th - 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, dx + pad, dy + 3);
      ctx.restore();
    }
    
    if (stickerMode && stickerCanvas && outW && outH) {
      const s = m.scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      try { ctx.globalAlpha = 1; } catch {}
      ctx.drawImage(stickerCanvas, 0, 0, stickerW, stickerH, Math.round(stickerX * s), Math.round(stickerY * s), Math.round(stickerW * s), Math.round(stickerH * s));
      ctx.restore();
    }
  }

  function rebuildSelectionAnts() {
    if (!selectionMask || selectionCount === 0) { selectionAntsCanvas = null; selectionAntsCtx = null; return; }
    const c = buildSelectionAntsCanvas(selectionMask, outW, outH);
    selectionAntsCanvas = c;
    selectionAntsCtx = c.getContext('2d');
  }

  function paintAt(px, py) {
    if (!editCanvas) return;
    const ctx = editCanvas.getContext('2d');
    const size = activeTool === 'brush' ? brushSize : (activeTool === 'eraser' ? eraserSize : undefined);
    
    
    const r = Math.max(1, Math.round(size || 3));
    const half = Math.floor(r / 2);
    const x0 = Math.max(0, px - half);
    const y0 = Math.max(0, py - half);
    const x1 = Math.min(outW, px - half + r);
    const y1 = Math.min(outH, py - half + r);
    if (x1 <= x0 || y1 <= y0) return;
    
    const tx0 = Math.floor(x0 / TILE_SIZE);
    const ty0 = Math.floor(y0 / TILE_SIZE);
    const tx1 = Math.floor((x1 - 1) / TILE_SIZE);
    const ty1 = Math.floor((y1 - 1) / TILE_SIZE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const tileX = tx * TILE_SIZE;
        const tileY = ty * TILE_SIZE;
        const tw = Math.min(TILE_SIZE, outW - tileX);
        const th = Math.min(TILE_SIZE, outH - tileY);
        if (tw <= 0 || th <= 0) continue;
        const key = `${tileX},${tileY}`;
        if (!strokeTiles.has(key)) {
          let before;
          try { before = ctx.getImageData(tileX, tileY, tw, th); } catch {}
          if (before) strokeTiles.set(key, { x: tileX, y: tileY, w: tw, h: th, before });
        }
      }
    }
    if (selectionMask && selectionCount > 0) {
      
      const x0 = Math.max(0, px - half);
      const y0 = Math.max(0, py - half);
      const x1 = Math.min(outW, px - half + r);
      const y1 = Math.min(outH, py - half + r);
      const iw = Math.max(0, x1 - x0);
      const ih = Math.max(0, y1 - y0);
      if (iw > 0 && ih > 0) {
        let img;
        try { img = ctx.getImageData(x0, y0, iw, ih); } catch {}
        if (img) {
          const changed = paintMaskedBlock(img, x0, y0, outW, selectionMask, activeTool, brushColorRGB);
          if (changed) { try { ctx.putImageData(img, x0, y0); } catch {} }
        }
      }
    } else {
      paintAtTool(ctx, activeTool, px, py, outW, outH, size, undefined, brushColorCss);
    }
    hasEdits = true;
  }

  function onStageMouseMove(e) {
    if (!editMode) return;
    
    if (stickerMode && stickerDragging) {
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      if (px >= 0 && py >= 0) {
        stickerX = Math.max(0, Math.min(outW - stickerW, px - stickerOffX));
        stickerY = Math.max(0, Math.min(outH - stickerH, py - stickerOffY));
        drawOverlay(hoverPx, hoverPy);
      }
      return;
    }
    
    if (isSizing) {
      const STEP = 6; 
      const delta = Math.round((sizeStartY - e.clientY) / STEP); 
      const base = sizeStartValue;
      if (activeTool === 'magic') {
        const nextTol = clampTolerance(base + delta);
        magicTolerance = nextTol;
      } else {
        const next = clampSize(base + delta);
        if (activeTool === 'brush') brushSize = next;
        if (activeTool === 'eraser') eraserSize = next;
        if (activeTool === 'select') selectSize = next;
      }
      drawOverlay(sizeFrozenPx, sizeFrozenPy);
      return;
    }
    
    if (isPanning) {
      const dx = e.clientX - panStartPointerX;
      const dy = e.clientY - panStartPointerY;
      const m = getDisplayMetrics();
      if (!m) return;
      panX = panStartX + dx;
      panY = panStartY + dy;
      
      
      const ov = overlayCanvas; const ec = editCanvas;
      if (ov && ec) {
        ov.style.transform = `translate3d(${Math.round(panX)}px, ${Math.round(panY)}px, 0)`;
        ec.style.transform = `translate3d(${Math.round(panX)}px, ${Math.round(panY)}px, 0)`;
      }
      
      
      return;
    }
    
    if (activeTool === 'select') {
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      hoverPx = px; hoverPy = py;
      if (isSelecting && px >= 0 && py >= 0) {
        
        const op = e.altKey ? 'sub' : (e.shiftKey ? 'add' : 'replace');
        applySelectionAt(px, py, op);
      }
      drawOverlay(px, py);
      return;
    }
    
    if (activeTool === 'magic') {
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      hoverPx = px; hoverPy = py;
      drawOverlay(px, py);
      return;
    }
    
    if (activeTool === 'gradient') {
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      hoverPx = px; hoverPy = py;
      if (gradientDragging && px >= 0 && py >= 0) {
        drawOverlay(px, py);
      } else {
        drawOverlay(px, py);
      }
      return;
    }
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    const { px, py } = screenToPixel(e.clientX, e.clientY);
    hoverPx = px; hoverPy = py;
    drawOverlay(px, py);
    if (isDrawing && px >= 0 && py >= 0) paintAt(px, py);
  }

  function onStageMouseLeave() {
    hoverPx = hoverPy = -1;
    isDrawing = false;
    isPanning = false;
    isSelecting = false;
    drawOverlay(-1, -1);
  }

  function onStageMouseDown(e) {
    if (!editMode) return;
    
    if (stickerMode && stickerCanvas) {
      if (e.button === 0) { 
        e.preventDefault();
        const { px, py } = screenToPixel(e.clientX, e.clientY);
        if (px >= 0 && py >= 0) {
          if (px >= stickerX && py >= stickerY && px < stickerX + stickerW && py < stickerY + stickerH) {
            stickerDragging = true;
            stickerOffX = px - stickerX; stickerOffY = py - stickerY;
          }
        }
        return;
      }
      
    }
    
    if (!stickerMode && e.button === 2 && e.altKey && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'select' || activeTool === 'magic')) {
      e.preventDefault();
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      sizeFrozenPx = (px >= 0 && py >= 0) ? px : hoverPx;
      sizeFrozenPy = (px >= 0 && py >= 0) ? py : hoverPy;
      sizeStartY = e.clientY;
      sizeStartValue = (activeTool === 'brush') ? brushSize : (activeTool === 'eraser') ? eraserSize : (activeTool === 'select' ? selectSize : magicTolerance);
      isSizing = true;
      drawOverlay(sizeFrozenPx, sizeFrozenPy);
      return;
    }
    
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanning = true;
      panStartPointerX = e.clientX; panStartPointerY = e.clientY;
      panStartX = panX; panStartY = panY;
      return;
    }
    
    if (activeTool === 'gradient') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      if (px < 0 || py < 0) return;
      gradientDragging = true;
      gradStartPx = px; gradStartPy = py;
      gradEndPx = px; gradEndPy = py;
      drawOverlay(px, py);
      return;
    }
    
    if (activeTool === 'select') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      if (px < 0 || py < 0) return;
      isSelecting = true;
      
      selectionAntsCanvas = null;
      selectionStrokeTiles.clear();
      selectionReplaceCleared = false;
      const op = e.altKey ? 'sub' : (e.shiftKey ? 'add' : 'replace');
      applySelectionAt(px, py, op);
      return;
    }
    
    if (activeTool === 'magic') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { px, py } = screenToPixel(e.clientX, e.clientY);
      if (px < 0 || py < 0) return;
      const op = e.altKey ? 'sub' : (e.shiftKey ? 'add' : 'replace');
      applyMagicSelection(px, py, op);
      drawOverlay(px, py);
      return;
    }
    
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    if (e.button !== 0) return;
    e.preventDefault();
    isDrawing = true;
    if (hoverPx >= 0 && hoverPy >= 0) paintAt(hoverPx, hoverPy);
  }

  function onStageMouseUp() {
    isDrawing = false;
    isPanning = false;
    if (stickerMode && stickerDragging) { stickerDragging = false; return; }
    if (isSizing) {
      isSizing = false;
      drawOverlay(hoverPx, hoverPy);
    }
    if (gradientDragging) {
      gradientDragging = false;
      if (gradStartPx >= 0 && gradStartPy >= 0 && hoverPx >= 0 && hoverPy >= 0) {
        gradEndPx = hoverPx; gradEndPy = hoverPy;
        applyGradient(gradStartPx, gradStartPy, gradEndPx, gradEndPy);
        
        gradStartPx = gradStartPy = gradEndPx = gradEndPy = -1;
        drawOverlay(hoverPx, hoverPy);
      }
    }
    if (isSelecting) {
      isSelecting = false;
      
      if (selectionStrokeTiles.size) {
        const tiles = [];
        for (const [, t] of selectionStrokeTiles) {
          const after = copySelectionRect(t.x, t.y, t.w, t.h);
          tiles.push({ x: t.x, y: t.y, w: t.w, h: t.h, before: t.before, after });
        }
        undoStack.push({ selTiles: tiles });
        if (undoStack.length > 100) undoStack.shift();
        redoStack.length = 0;
      }
      if (selectionCount > 0) rebuildSelectionAnts(); else selectionAntsCanvas = null;
      drawOverlay(hoverPx, hoverPy);
    }
    finalizeStroke();
  }

  function onWindowMouseUp() {
    
    isDrawing = false;
    isPanning = false;
    if (isSizing) {
      isSizing = false;
      drawOverlay(hoverPx, hoverPy);
    }
    if (gradientDragging) {
      gradientDragging = false;
      if (gradStartPx >= 0 && gradStartPy >= 0 && hoverPx >= 0 && hoverPy >= 0) {
        gradEndPx = hoverPx; gradEndPy = hoverPy;
        applyGradient(gradStartPx, gradStartPy, gradEndPx, gradEndPy);
        drawOverlay(hoverPx, hoverPy);
      }
    }
    finalizeStroke();
  }

  function finalizeStroke() {
    if (!editCanvas) return;
    if (!strokeTiles.size) return;
    const ctx = editCanvas.getContext('2d');
    const tiles = [];
    for (const [, t] of strokeTiles) {
      let after;
      try { after = ctx.getImageData(t.x, t.y, t.w, t.h); } catch {}
      if (t.before && after) tiles.push({ x: t.x, y: t.y, w: t.w, h: t.h, before: t.before, after });
    }
    if (tiles.length) {
      undoStack.push({ tiles });
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }
    strokeTiles.clear();
  }

  function onWindowKeyDown(e) {
    
    if (e.key === 'Escape' || e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (showInfo) { showInfo = false; }
      return;
    }
    if (!editMode) return;
    
    const target = e.target;
    const tag = target && target.tagName ? String(target.tagName).toLowerCase() : '';
    const isEditable = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);
    if (isEditable) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    
    const isZ = (e.code === 'KeyZ') || (e.key && e.key.toLowerCase() === 'z');
    if (isZ) {
      e.preventDefault();
      if (e.shiftKey) { redoOnce(); } else { undoOnce(); }
    }
    const isD = (e.code === 'KeyD') || (e.key && e.key.toLowerCase() === 'd');
    if (isD) {
      e.preventDefault();
      clearSelection();
      drawOverlay(hoverPx, hoverPy);
    }
    const isI = (e.code === 'KeyI') || (e.key && e.key.toLowerCase() === 'i');
    if (isI) {
      e.preventDefault();
      invertSelection();
      drawOverlay(hoverPx, hoverPy);
    }
  }

  function ensureSelectionSurfaces() {
    if (!outW || !outH) return;
    if (!selectionMask || selectionMask.length !== outW * outH) {
      selectionMask = new Uint8Array(outW * outH);
      selectionCount = 0;
    }
    if (!selectionVisCanvas) selectionVisCanvas = document.createElement('canvas');
    if (selectionVisCanvas.width !== outW || selectionVisCanvas.height !== outH) {
      selectionVisCanvas.width = outW;
      selectionVisCanvas.height = outH;
      selectionVisCtx = selectionVisCanvas.getContext('2d');
      selectionVisCtx.imageSmoothingEnabled = false;
      selectionVisCtx.clearRect(0, 0, outW, outH);
      selectionVisCtx.fillStyle = '#55aaff';
    }
  }

  function clearSelection() {
    ensureSelectionSurfaces();
    if (!selectionMask) return;
    
    const tiles = [];
    const twMax = TILE_SIZE, thMax = TILE_SIZE;
    for (let ty = 0; ty < outH; ty += thMax) {
      const th = Math.min(thMax, outH - ty);
      for (let tx = 0; tx < outW; tx += twMax) {
        const tw = Math.min(twMax, outW - tx);
        
        let has = false;
        for (let yy = 0; yy < th && !has; yy++) {
          const row = (ty + yy) * outW;
          for (let xx = 0; xx < tw; xx++) { if (selectionMask[row + tx + xx]) { has = true; break; } }
        }
        if (!has) continue;
        const before = copySelectionRect(tx, ty, tw, th);
        const after = new Uint8Array(tw * th); 
        tiles.push({ x: tx, y: ty, w: tw, h: th, before, after });
      }
    }
    if (tiles.length) {
      undoStack.push({ selTiles: tiles });
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }
    
    selectionMask.fill(0);
    if (selectionVisCtx) selectionVisCtx.clearRect(0, 0, outW, outH);
    selectionCount = 0;
    selectionAntsCanvas = null;
  }

  function invertSelection() {
    ensureSelectionSurfaces();
    if (!selectionMask) return;
    
    const tiles = [];
    const twMax = TILE_SIZE, thMax = TILE_SIZE;
    for (let ty = 0; ty < outH; ty += thMax) {
      const th = Math.min(thMax, outH - ty);
      for (let tx = 0; tx < outW; tx += twMax) {
        const tw = Math.min(twMax, outW - tx);
        const before = copySelectionRect(tx, ty, tw, th);
        tiles.push({ x: tx, y: ty, w: tw, h: th, before, after: null });
      }
    }
    const N = selectionMask.length;
    selectionCount = N - selectionCount;
    for (let i = 0; i < N; i++) selectionMask[i] = selectionMask[i] ? 0 : 1;
    
    if (selectionVisCtx) {
      selectionVisCtx.clearRect(0, 0, outW, outH);
      selectionVisCtx.fillStyle = '#55aaff';
      for (let y = 0; y < outH; y++) {
        const row = y * outW;
        for (let x = 0; x < outW; x++) {
          if (selectionMask[row + x]) selectionVisCtx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    for (const t of tiles) { t.after = copySelectionRect(t.x, t.y, t.w, t.h); }
    undoStack.push({ selTiles: tiles });
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
    if (selectionCount > 0) rebuildSelectionAnts(); else selectionAntsCanvas = null;
  }

  function applySelectionAt(px, py, op) {
    ensureSelectionSurfaces();
    if (!selectionVisCtx) return;
    const r = Math.max(1, Math.round(selectSize));
    const half = Math.floor(r / 2);
    const x0 = Math.max(0, px - half);
    const y0 = Math.max(0, py - half);
    const x1 = Math.min(outW, px - half + r);
    const y1 = Math.min(outH, py - half + r);
    if (x1 <= x0 || y1 <= y0) return;
    
    const tx0 = Math.floor(x0 / TILE_SIZE);
    const ty0 = Math.floor(y0 / TILE_SIZE);
    const tx1 = Math.floor((x1 - 1) / TILE_SIZE);
    const ty1 = Math.floor((y1 - 1) / TILE_SIZE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const tileX = tx * TILE_SIZE;
        const tileY = ty * TILE_SIZE;
        const tw = Math.min(TILE_SIZE, outW - tileX);
        const th = Math.min(TILE_SIZE, outH - tileY);
        if (tw <= 0 || th <= 0) continue;
        const key = `${tileX},${tileY}`;
        if (!selectionStrokeTiles.has(key)) {
          const before = copySelectionRect(tileX, tileY, tw, th);
          selectionStrokeTiles.set(key, { x: tileX, y: tileY, w: tw, h: th, before });
        }
      }
    }
    let mode = op;
    if (mode === 'replace' && !selectionReplaceCleared) {
      clearSelection();
      selectionReplaceCleared = true;
    }
    
    const delta = applySelectionRectOnMask(selectionMask, outW, outH, x0, y0, x1, y1, mode);
    selectionCount += delta;
    
    if (selectionVisCtx) {
      refreshSelectionVisSubrect(selectionVisCtx, selectionMask, outW, outH, x0, y0, x1, y1);
    }
    
    selectionAntsCanvas = null;
  }

  

  function refreshSelectionVisFromMask() {
    refreshSelectionVisFromMaskTool(selectionVisCtx, selectionMask, outW, outH);
  }

  
  function applyMagicSelection(px, py, op) {
    if (!editCanvas || !outW || !outH) return;
    ensureSelectionSurfaces();
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
    let img; try { img = ctx.getImageData(0, 0, outW, outH); } catch { return; }
    const region = computeMagicRegion(img, outW, outH, px, py, (magicTolerance | 0));
    const res = applyMagicSelectionOnMask(region, selectionMask, outW, outH, op, TILE_SIZE);
    selectionCount += res.delta;
    if (selectionVisCtx) refreshSelectionVisFromMask();
    undoStack.push({ selTiles: res.tiles });
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
    if (selectionCount > 0) rebuildSelectionAnts(); else selectionAntsCanvas = null;
  }


  function undoOnce() {
    if (!editCanvas || !undoStack.length) return;
    const ctx = editCanvas.getContext('2d');
    const item = undoStack.pop();
    if (item.tiles && Array.isArray(item.tiles)) {
      for (const t of item.tiles) {
        try { ctx.putImageData(t.before, t.x, t.y); } catch {}
      }
      hasEdits = true; 
    } else if (item.selTiles && Array.isArray(item.selTiles)) {
      
      ensureSelectionSurfaces();
      for (const t of item.selTiles) writeSelectionRect(t.x, t.y, t.w, t.h, t.before);
      rebuildSelectionAnts();
      refreshSelectionVisFromMask();
      drawOverlay(hoverPx, hoverPy);
    } else if (item.before) {
      try { ctx.putImageData(item.before, item.x, item.y); } catch {}
      hasEdits = true;
    }
    redoStack.push(item);
  }

  function redoOnce() {
    if (!editCanvas || !redoStack.length) return;
    const ctx = editCanvas.getContext('2d');
    const item = redoStack.pop();
    if (item.tiles && Array.isArray(item.tiles)) {
      for (const t of item.tiles) {
        try { ctx.putImageData(t.after, t.x, t.y); } catch {}
      }
      hasEdits = true;
    } else if (item.selTiles && Array.isArray(item.selTiles)) {
      ensureSelectionSurfaces();
      for (const t of item.selTiles) writeSelectionRect(t.x, t.y, t.w, t.h, t.after);
      rebuildSelectionAnts();
      refreshSelectionVisFromMask();
      drawOverlay(hoverPx, hoverPy);
    } else if (item.after) {
      try { ctx.putImageData(item.after, item.x, item.y); } catch {}
      hasEdits = true;
    }
    undoStack.push(item);
  }

  function downloadCurrent() {
    
    try {
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKey}`:''}`;
      const cached = previewCache.get(key);
      
      const getBaseName = () => {
        try {
          const n = (file && (file).name) ? (file).name : 'image.png';
          const m = String(n);
          const dot = m.lastIndexOf('.');
          return dot > 0 ? m.slice(0, dot) : m;
        } catch { return 'image'; }
      };
      const ditherCode = (dm) => {
        switch (dm) {
          case 'none': return 'n';
          case 'ordered4': return 'o4';
          case 'ordered8': return 'o8';
          case 'lines': return 'ln';
          case 'random': return 'rnd';
          default: return String(dm || 'n');
        }
      };
      const paletteCode = (pm) => pm === 'full' ? 'F' : (pm === 'free' ? 'f' : 'C');
      const base = getBaseName();
      const suffix = `${pixelSize}${ditherCode(ditherMethod)}${ditherLevels}${paletteCode(paletteMode)}${outlineThickness}${erodeAmount}`;
      const filename = `${base}_${suffix}.png`;
      if (cached?.blob) { downloadBlob(cached.blob, filename); return; }
      
      resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices)
        .then((blob) => downloadBlob(blob, filename))
        .catch(() => {});
    } catch {}
  }

  
  function clampPan(m) {
    
    
  }

  function onStageWheel(e) {
    if (!editMode) return;
    
    if (e.altKey) return;
    
    if (isDrawing) isDrawing = false;
    const rect = outputBox.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const m0 = getDisplayMetrics();
    if (!m0) return;
    e.preventDefault();
    const worldX = (x - (m0.ox + panX)) / m0.scale;
    const worldY = (y - (m0.oy + panY)) / m0.scale;
    const factor = Math.pow(1.0015, -e.deltaY);
    const newZoom = Math.max(0.5, Math.min(8, zoom * factor));
    if (newZoom === zoom) return;
    zoom = newZoom;
    const m1 = getDisplayMetrics();
    panX = x - m1.ox - worldX * m1.scale;
    panY = y - m1.oy - worldY * m1.scale;
    layoutStage();
    drawOverlay(hoverPx, hoverPy);
  }

  
  $: if (editMode && previewUrl && outW && outH && editCanvas && overlayCanvas) {
    ensureEditSurface();
  }

  
  
  
  const previewCache = new Map();
  let fileStamp = 0;

  
  let outW = 0, outH = 0;
  let opaqueCount = 0;
  let colorCount = 0;
  $: etaSeconds = opaqueCount * 30; 

  function formatEta(totalSec) {
    totalSec = Math.max(0, Math.floor(totalSec || 0));
    const d = Math.floor(totalSec / 86400);
    totalSec -= d * 86400;
    const h = Math.floor(totalSec / 3600);
    totalSec -= h * 3600;
    const m = Math.floor(totalSec / 60);
    const s = totalSec - m * 60;
    const parts = [];
    if (d) parts.push(`${d}${t('units.dayShort')}`);
    if (h) parts.push(`${h}${t('units.hourShort')}`);
    if (m) parts.push(`${m}${t('units.minShort')}`);
    if (!parts.length) parts.push(`${s}${t('units.secShort')}`);
    return parts.join(' ');
  }

  async function computeStatsForBlob(blob) {
    try {
      const bmp = await createImageBitmap(blob);
      const w = bmp.width, h = bmp.height;
      const off = new OffscreenCanvas(w, h);
      const cx = off.getContext('2d', { willReadFrequently: true });
      cx.drawImage(bmp, 0, 0);
      const img = cx.getImageData(0, 0, w, h);
      const data = img.data;
      let opaque = 0;
      const set = new Set();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a >= 128) {
          opaque++;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          set.add(((r & 255) << 16) | ((g & 255) << 8) | (b & 255));
        }
      }
      try { bmp.close && bmp.close(); } catch {}
      return { w, h, opaque, colors: set.size };
    } catch {
      return { w: 0, h: 0, opaque: 0, colors: 0 };
    }
  }

  async function loadOriginalDims() {
    originalDims = { w: 0, h: 0 };
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      originalDims = { w: bmp.width, h: bmp.height };
      try { bmp.close && bmp.close(); } catch {}
    } catch {}
  }

  async function updatePreview() {
    if (!open || !file) return;
    if (working) return; 
    working = true;
    try {
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKey}`:''}`;
      const cached = previewCache.get(key);
      if (cached) {
        
        previewUrl = cached.url;
        if (cached.stats) {
          outW = cached.stats.w; outH = cached.stats.h; opaqueCount = cached.stats.opaque; colorCount = cached.stats.colors;
        } else {
          const stats = await computeStatsForBlob(cached.blob);
          outW = stats.w; outH = stats.h; opaqueCount = stats.opaque; colorCount = stats.colors;
          cached.stats = stats;
        }
        dispatch('update', { blob: cached.blob, pixelSize, method, ditherMethod, ditherLevels });
      } else {
        const out = await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices);
        const obj = await blobToObjectUrl(out);
        previewUrl = obj.url;
        const stats = await computeStatsForBlob(out);
        outW = stats.w; outH = stats.h; opaqueCount = stats.opaque; colorCount = stats.colors;
        previewCache.set(key, { blob: out, url: obj.url, revoke: obj.revoke, stats });
        
        dispatch('update', { blob: out, pixelSize, method, ditherMethod, ditherLevels });
      }
      debugLayout('after-preview');
    } catch {}
    working = false;
    await tick();
  }

  function close() {
    
    try { for (const v of previewCache.values()) { try { v.revoke && v.revoke(); } catch {} } } catch {}
    previewCache.clear();
    previewUrl = '';
    outW = outH = opaqueCount = colorCount = 0;
    dispatch('close');
  }

  async function apply() {
    if (!file) { close(); return; }
    try {
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKey}`:''}`;
      const cached = previewCache.get(key);
      const out = cached?.blob || await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices);
      
      dispatch('apply', { blob: out, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customKey, hadPixelEdits });
      
      close();
    } catch {
      
    }
  }

  function reset() {
    pixelSize = 1;
    updatePreview();
  }

  
  function appendToBody(node) {
    const placeholder = document.createComment('portal-placeholder');
    const parent = node.parentNode;
    try { parent && parent.insertBefore(placeholder, node); } catch {}
    try { document.body.appendChild(node); } catch {}
    return {
      destroy() {
        try {
          
          if (node && node.parentNode) { node.parentNode.removeChild(node); }
          
          if (parent && placeholder && placeholder.parentNode === parent) {
            try { parent.removeChild(placeholder); } catch {}
          }
        } catch {}
      }
    }
  }

  $: if (open) {
    
    loadOriginalDims().then(updatePreview);
  }

  $: if (open && file && pixelSize && method && ditherMethod && ditherLevels && paletteMode !== undefined) {
    
    updatePreview();
  }

  
  $: if (file) {
    fileStamp = Date.now();
    
    for (const v of previewCache.values()) { try { v.revoke && v.revoke(); } catch {} }
    previewCache.clear();
  }

  function debugLayout(label = 'modal') {
    try {
      const m = modalRef;
      const b = backdropRef;
      const mr = m && m.getBoundingClientRect ? m.getBoundingClientRect() : null;
      const br = b && b.getBoundingClientRect ? b.getBoundingClientRect() : null;
      void(label); void(mr); void(br); 
    } catch {}
  }

  onMount(() => {
    debugLayout('mount');
  });

  $: if (open) {
    
    hadPixelEdits = false;
    tick().then(() => debugLayout('after-open'));
  }

  
  
  
  function onWindowResize() { layoutStage(); }
</script>

<svelte:window on:resize={onWindowResize} on:wheel={onGlobalWheel} on:mouseup={onWindowMouseUp} on:keydown={onWindowKeyDown} />

{#if open}
  <div use:appendToBody class="editor-backdrop" bind:this={backdropRef} role="button" tabindex="0" style={`z-index:1000000000000; display:${suspendVisible ? 'none' : 'flex'};`}
       on:click={(e) => { if (e.target === e.currentTarget) close(); }}
       on:keydown={(e) => { if (e.key === 'Escape' || e.key === 'Esc' || e.key === 'Enter') close(); }}>
    <div class="editor-modal" bind:this={modalRef} role="dialog" aria-modal="true" tabindex="-1" style="z-index:1000000000001;">
      <div class="editor-grid">
        
        <div class="editor-panel" class:locked={editMode} bind:this={panelRef}>
          <div class="editor-panel-title">{t('editor.panel.title')}</div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.downscale.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.method')}</div>
              <div class="editor-row">
                <select bind:value={method} on:change={updatePreview} class="editor-select">
                  {#each RESAMPLE_METHODS as m}
                    <option value={m}>{t('editor.resample.method.' + m)}</option>
                  {/each}
                </select>
              </div>
            </div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.downscale.pixelSize')}</div>
              <div class="editor-row">
                <input type="range" min="1" max="20" step="1" bind:value={pixelSize} on:input={updatePreview} style="--min:1; --max:20; --val:{pixelSize};" />
                <div class="editor-value">×{pixelSize}</div>
              </div>
              <div class="editor-hint">{t('editor.panel.resultSize')}: {Math.max(1, Math.floor(originalDims.w / pixelSize))} × {Math.max(1, Math.floor(originalDims.h / pixelSize))}</div>
            </div>
          </div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.dither.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.method')}</div>
              <div class="editor-row">
                <select bind:value={ditherMethod} on:change={updatePreview} class="editor-select">
                  {#each DITHER_METHODS as dm}
                    <option value={dm}>{t('editor.dither.method.' + dm)}</option>
                  {/each}
                </select>
              </div>
            </div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.dither.strength')}</div>
              <div class="editor-row">
                <input type="range" min="2" max="20" step="1" bind:value={ditherLevels} on:input={updatePreview} style="--min:2; --max:20; --val:{ditherLevels};" />
                <div class="editor-value">{ditherLevels}</div>
              </div>
            </div>
          </div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.palette.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.palette.set')}</div>
              <div class="editor-row">
                <select bind:value={paletteMode} on:change={updatePreview} class="editor-select">
                  <option value="full">{t('editor.panel.palette.opt.full')}</option>
                  <option value="free">{t('editor.panel.palette.opt.free')}</option>
                  <option value="custom">{t('editor.panel.palette.opt.custom')}</option>
                </select>
              </div>
              {#if paletteMode === 'custom'}
                <div class="palette-toolbar">
                  <div class="palette-count">{t('editor.panel.palette.selected')}: {customIndices.length}</div>
                  <div class="palette-actions">
                    <button class="palette-btn primary" on:click={() => { customIndices = Array.from({length: MASTER_COLORS.length}, (_,i)=>i); updatePreview(); }}>{t('editor.panel.palette.enableAll')}</button>
                    <button class="palette-btn ghost" on:click={() => { customIndices = []; updatePreview(); }}>{t('editor.panel.palette.disableAll')}</button>
                  </div>
                </div>
                <div class="palette-custom">
                  {#each MASTER_COLORS as c, i}
                    <label class="palette-item" class:paid={c.paid} title={c.name}>
                      <input type="checkbox" checked={customIndices.includes(i)} on:change={(e) => {
                        const set = new Set(customIndices);
                        if (e.currentTarget.checked) set.add(i); else set.delete(i);
                        customIndices = Array.from(set).sort((a,b)=>a-b);
                        updatePreview();
                      }}/>
                      <span class="sw" style={`--c: rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`}></span>
                      <span class="nm">{c.name}</span>
                      {#if c.paid}<span class="palette-badge">{t('editor.palette.paid')}</span>{/if}
                    </label>
                  {/each}
                </div>
              {/if}
              
            </div>
          </div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.post.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.post.outline')}</div>
              <div class="editor-row">
                <input type="range" min="0" max="8" step="1" bind:value={outlineThickness} on:input={updatePreview} style="--min:0; --max:8; --val:{outlineThickness};" />
                <div class="editor-value">{outlineThickness}</div>
              </div>
            </div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.post.erode')}</div>
              <div class="editor-row">
                <input type="range" min="0" max="8" step="1" bind:value={erodeAmount} on:input={updatePreview} style="--min:0; --max:8; --val:{erodeAmount};" />
                <div class="editor-value">{erodeAmount}</div>
              </div>
            </div>
          </div>

          <div class="editor-buttons">
            <button class="editor-btn" on:click={reset} disabled={working}>{t('editor.reset')}</button>
            <div style="flex:1"></div>
            <button class="editor-btn" on:click={close}>{t('common.cancel')}</button>
            <button class="editor-btn editor-primary" on:click={apply} disabled={working || !file}>{t('editor.apply')}</button>
          </div>
          {#if editMode}
            
            <div class="panel-lock" aria-hidden="true" on:wheel|preventDefault on:touchmove|preventDefault>
              {#if showLock}
                <div class="panel-lock-icon" aria-hidden="true">
                  <div class="btn-lock"
                       class:closing={lockState==='locked'}
                       class:phase-enter={lockPhase==='enter'}
                       class:phase-center={lockPhase==='center'}
                       class:phase-leave={lockPhase==='leave'}>
                    <svg width="36" height="40" viewBox="0 0 36 40" aria-hidden="true">
                      <path class="lockb" d="M27 27C27 34.1797 21.1797 40 14 40C6.8203 40 1 34.1797 1 27C1 19.8203 6.8203 14 14 14C21.1797 14 27 19.8203 27 27ZM15.6298 26.5191C16.4544 25.9845 17 25.056 17 24C17 22.3431 15.6569 21 14 21C12.3431 21 11 22.3431 11 24C11 25.056 11.5456 25.9845 12.3702 26.5191L11 32H17L15.6298 26.5191Z"></path>
                      <path class="lock" d="M6 21V10C6 5.58172 9.58172 2 14 2V2C18.4183 2 22 5.58172 22 10V21"></path>
                      <path class="bling" d="M29 20L31 22"></path>
                      <path class="bling" d="M31.5 15H34.5"></path>
                      <path class="bling" d="M29 10L31 8"></path>
                    </svg>
                  </div>
                </div>
              {/if}
              {#each tapeStripes as s}
                <div class="tape" style="--sx:{showTapes?1:0}; top:{s.top}%; transform: rotate({s.angle}deg) scaleX(var(--sx)); transition-delay:{s.growDelay}ms;">
                  <div class="tape-text" style="animation-duration:{s.speed}s; animation-delay:{s.delay}s; animation-direction:{s.dir};">
                    {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} • {t('editor.unavailable')} •
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        
        <div class="editor-output">
          <div class="editor-output-box" bind:this={outputBox}>
            <div class="editor-output-header" class:compact={editMode}>
              <HeaderStats {outW} {outH} {opaqueCount} {colorCount} {etaSeconds} {formatEta} compact={editMode} />
              {#if editMode}
                <div class="header-palette" role="group" aria-label={t('editor.palette.group')} class:open={hoverPalette} class:disabled={stickerMode}
                     on:mouseenter={() => hoverPalette = true}
                     on:mouseleave={() => { hoverPalette = false; }}>
                  <div class="palette-row" aria-label={t('editor.palette.allowed')}>
                    {#each allowedColors.slice(0, Math.min(COMPACT_ROW, allowedColors.length)) as c, i}
                      <button class="swatch" style="--c: rgb({c[0]},{c[1]},{c[2]});" data-label={getColorName(c)}
                              on:click={() => { if (activeTool==='gradient') { gradientColorA = c; } else { brushColorRGB = c; } }}
                              on:contextmenu|preventDefault={() => { if (activeTool==='gradient') { gradientColorB = c; } }}
                              class:selected={activeTool!=='gradient' && brushColorRGB===c}
                              class:is-grad-a={activeTool==='gradient' && c[0]===gradientColorA[0] && c[1]===gradientColorA[1] && c[2]===gradientColorA[2]}
                              class:is-grad-b={activeTool==='gradient' && c[0]===gradientColorB[0] && c[1]===gradientColorB[1] && c[2]===gradientColorB[2]}></button>
                    {/each}
                  </div>
                  <div class="palette-popover" role="presentation">
                    <div class="palette-grid">
                      {#each allowedColors.slice(Math.min(COMPACT_ROW, allowedColors.length)) as c, i}
                        <button class="swatch" style="--c: rgb({c[0]},{c[1]},{c[2]});" data-label={getColorName(c)}
                                on:click={() => { if (activeTool==='gradient') { gradientColorA = c; } else { brushColorRGB = c; } }}
                                on:contextmenu|preventDefault={() => { if (activeTool==='gradient') { gradientColorB = c; } }}
                                class:selected={activeTool!=='gradient' && brushColorRGB===c}
                                class:is-grad-a={activeTool==='gradient' && c[0]===gradientColorA[0] && c[1]===gradientColorA[1] && c[2]===gradientColorA[2]}
                                class:is-grad-b={activeTool==='gradient' && c[0]===gradientColorB[0] && c[1]===gradientColorB[1] && c[2]===gradientColorB[2]}></button>
                    {/each}
                    </div>
                  </div>
                </div>
              {/if}
            </div>
              {#if previewUrl}
              {#if editMode}
                
                <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                <div class="edit-stage" role="application" aria-label={t('editor.editStage.aria')}
                     class:panning={isPanning}
                     class:infoOpen={showInfo}
                     class:sizing={isSizing}
                     on:wheel={onStageWheel}
                     on:mousemove={onStageMouseMove}
                     on:mouseleave={onStageMouseLeave}
                     on:mousedown={onStageMouseDown}
                     on:mouseup={onStageMouseUp}
                     on:contextmenu|preventDefault
                     on:dragstart|preventDefault>
                  <canvas class="edit-canvas" bind:this={editCanvas}></canvas>
                  <canvas class="overlay-canvas" bind:this={overlayCanvas}></canvas>
                  {#if showInfo}
                    <HotkeysInfoModal on:close={() => showInfo = false} />
                  {/if}
                </div>
              {:else}
                <img src={previewUrl} alt="preview" />
              {/if}
            {:else}
              <div class="editor-placeholder">{t('editor.placeholder.noImage')}</div>
            {/if}
            {#if working}
              <div class="editor-busy">{t('editor.busy')}</div>
            {/if}
          
            <div class="fab-container" class:editing={editMode}>
      
              <div class="fab-tools" class:open={editMode} class:disabled={stickerMode} aria-hidden={!editMode}>
          
                  <button class="fab-tool" class:active={activeTool==='brush' && !stickerMode} title={t('editor.tool.brush')} aria-label={t('editor.tool.brush')} on:click={() => pickTool('brush')}
                          on:mouseenter={() => hoverBrushBtn = true} on:mouseleave={() => hoverBrushBtn = false}>
                    <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                      <rect x="2" y="26" width="28" height="2" />
                      <path d="M25.4,9c0.8-0.8,0.8-2,0-2.8c0,0,0,0,0,0l-3.6-3.6c-0.8-0.8-2-0.8-2.8,0c0,0,0,0,0,0l-15,15V24h6.4L25.4,9z M20.4,4L24,7.6
  		l-3,3L17.4,7L20.4,4z M6,22v-3.6l10-10l3.6,3.6l-10,10H6z" />
                      <rect width="32" height="32" fill="none" />
                    </svg>
                    {#if activeTool==='brush' && hoverBrushBtn}
                      <span class="tool-size-badge">{brushSize}</span>
                    {/if}
                  </button>
                  <!-- Eraser -->
                  <button class="fab-tool" class:active={activeTool==='eraser' && !stickerMode} title={t('editor.tool.eraser')} aria-label={t('editor.tool.eraser')} on:click={() => pickTool('eraser')}
                          on:mouseenter={() => hoverEraserBtn = true} on:mouseleave={() => hoverEraserBtn = false}>
                    <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                      <rect x="7" y="27" width="23" height="2"/>
                      <path d="M27.38,10.51,19.45,2.59a2,2,0,0,0-2.83,0l-14,14a2,2,0,0,0,0,2.83L7.13,24h9.59L27.38,13.34A2,2,0,0,0,27.38,10.51ZM15.89,22H8L4,18l6.31-6.31,7.93,7.92Zm3.76-3.76-7.92-7.93L18,4,26,11.93Z" transform="translate(0 0)"/>
                      <rect width="32" height="32" fill="none" />
                    </svg>
                    {#if activeTool==='eraser' && hoverEraserBtn}
                      <span class="tool-size-badge">{eraserSize}</span>
                    {/if}
                  </button>
            
                  <button class="fab-tool" class:active={activeTool==='select' && !stickerMode} title={t('editor.tool.select')} aria-label={t('editor.tool.select')} on:click={() => pickTool('select')}
                          on:mouseenter={() => hoverSelectBtn = true} on:mouseleave={() => hoverSelectBtn = false}>
                    <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                      <polygon points="12 6 8 6 8 2 6 2 6 6 2 6 2 8 6 8 6 12 8 12 8 8 12 8 12 6"/>
                      <rect x="16" y="6" width="4" height="2"/>
                      <path d="M24,6V8h4v4h2V8a2,2,0,0,0-2-2Z"/>
                      <rect x="6" y="16" width="2" height="4"/>
                      <path d="M8,28V24H6v4a2,2,0,0,0,2,2h4V28Z"/>
                      <rect x="28" y="16" width="2" height="4"/>
                      <rect x="16" y="28" width="4" height="2"/>
                      <path d="M28,24v4H24v2h4a2,2,0,0,0,2-2V24Z"/>
                      <rect width="32" height="32" fill="none" />
                    </svg>
                    {#if activeTool==='select' && hoverSelectBtn}
                      <span class="tool-size-badge">{selectSize}</span>
                    {/if}
                  </button>
                
                  <button class="fab-tool" class:active={activeTool==='magic' && !stickerMode} title={t('editor.tool.magic')} aria-label={t('editor.tool.magic')} on:click={() => pickTool('magic')}
                          on:mouseenter={() => hoverMagicBtn = true} on:mouseleave={() => hoverMagicBtn = false}>
                    <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                      <path d="M29.4141,24,12,6.5859a2.0476,2.0476,0,0,0-2.8281,0l-2.586,2.586a2.0021,2.0021,0,0,0,0,2.8281L23.999,29.4141a2.0024,2.0024,0,0,0,2.8281,0l2.587-2.5865a1.9993,1.9993,0,0,0,0-2.8281ZM8,10.5859,10.5859,8l5,5-2.5866,2.5869-5-5Z"/>
                      <rect x="2.5858" y="14.5858" width="2.8284" height="2.8284" transform="translate(-10.1421 7.5147) rotate(-45)"/>
                      <rect x="14.5858" y="2.5858" width="2.8284" height="2.8284" transform="translate(1.8579 12.4853) rotate(-45)"/>
                      <rect x="2.5858" y="2.5858" width="2.8284" height="2.8284" transform="translate(-1.6569 4) rotate(-45)"/>
                      <rect width="32" height="32" fill="none" />
                    </svg>
                    {#if activeTool==='magic' && hoverMagicBtn}
                      <span class="tool-size-badge">{magicTolerance}</span>
                    {/if}
                  </button>
             
                  <div class="fab-tool-wrap gradient-tool" role="group" aria-label={t('editor.gradient.modes.aria')}
                       on:mouseenter={() => { hoverGradientBtn = true; if (activeTool==='gradient') openGradientModes(); }}
                       on:mouseleave={() => { hoverGradientBtn = false; closeGradientModesSoon(350); }}>
                    <button class="fab-tool" class:active={activeTool==='gradient' && !stickerMode} title={t('editor.tool.gradient')} aria-label={t('editor.tool.gradient')} on:click={() => pickTool('gradient')}>
                      <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                        <path d="M26,4H6A2.0023,2.0023,0,0,0,4,6V26a2.0023,2.0023,0,0,0,2,2H26a2.0023,2.0023,0,0,0,2-2V6A2.0023,2.0023,0,0,0,26,4ZM22,26V22H18v4H14V22H10V18h4V14H10V10h4V6h4v4h4V6h4V26Z"/>
                        <rect x="14" y="10" width="4" height="4"/>
                        <rect x="14" y="18" width="4" height="4"/>
                        <rect x="18" y="14" width="4" height="4"/>
                        <rect width="32" height="32" fill="none" />
                      </svg>
                      {#if activeTool==='gradient' && hoverGradientBtn}
                        <span class="tool-size-badge">{gradientMode}</span>
                      {/if}
                    </button>
                    {#if activeTool==='gradient' && showGradientModes}
                      <div class="gradient-modes" role="menu" tabindex="0" aria-label={t('editor.gradient.modes.aria')} on:mouseenter={() => openGradientModes()} on:mouseleave={() => closeGradientModesSoon(280)}>
                        <button class="mode" role="menuitem" class:active={gradientMode==='bayer2'} on:click={() => { gradientMode='bayer2'; showGradientModes=false; }} title={t('editor.gradient.mode.bayer2.title')}>2×2</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='bayer4'} on:click={() => { gradientMode='bayer4'; showGradientModes=false; }} title={t('editor.gradient.mode.bayer4.title')}>4×4</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='lines'}  on:click={() => { gradientMode='lines';  showGradientModes=false; }} title={t('editor.gradient.mode.lines.title')}>≡</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='noise'}  on:click={() => { gradientMode='noise';  showGradientModes=false; }} title={t('editor.gradient.mode.noise.title')}>≈</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='checker'} on:click={() => { gradientMode='checker'; showGradientModes=false; }} title={t('editor.gradient.mode.checker.title')}>#</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='dots'} on:click={() => { gradientMode='dots'; showGradientModes=false; }} title={t('editor.gradient.mode.dots.title')}>•</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='hatch'} on:click={() => { gradientMode='hatch'; showGradientModes=false; }} title={t('editor.gradient.mode.hatch.title')}>//</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='radial'} on:click={() => { gradientMode='radial'; showGradientModes=false; }} title={t('editor.gradient.mode.radial.title')}>◎</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='rings'} on:click={() => { gradientMode='rings'; showGradientModes=false; }} title={t('editor.gradient.mode.rings.title')}>◌</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='spiral'} on:click={() => { gradientMode='spiral'; showGradientModes=false; }} title={t('editor.gradient.mode.spiral.title')}>↻</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='diamond'} on:click={() => { gradientMode='diamond'; showGradientModes=false; }} title={t('editor.gradient.mode.diamond.title')}>◇</button>
                        <button class="mode" role="menuitem" class:active={gradientMode==='ornament'} on:click={() => { gradientMode='ornament'; showGradientModes=false; }} title={t('editor.gradient.mode.ornament.title')}>✱</button>
                      </div>
                    {/if}
                  </div>
              </div>
              {#if !editMode}
              
                <button class="gen-fab" title={t('editor.generateCode')} aria-label={t('editor.generateCode')} on:click={beginQrGeneration}>
                  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <rect x="24" y="26" width="2" height="2" transform="translate(-2 52) rotate(-90)"/>
                    <rect x="18" y="22" width="2" height="2" transform="translate(-4 42) rotate(-90)"/>
                    <polygon points="18 30 22 30 22 28 20 28 20 26 18 26 18 30"/>
                    <rect x="24.9999" y="23" width="4" height="2" transform="translate(2.9999 50.9999) rotate(-90)"/>
                    <polygon points="28 26 30 26 30 30 26 30 26 28 28 28 28 26"/>
                    <polygon points="26 20 26 18 30 18 30 22 28 22 28 20 26 20"/>
                    <polygon points="24 20 22 20 22 24 20 24 20 26 24 26 24 20"/>
                    <rect x="19" y="17" width="2" height="4" transform="translate(1 39) rotate(-90)"/>
                    <rect x="6" y="22" width="4" height="4"/>
                    <path d="M14,30H2V18H14ZM4,28h8V20H4Z"/>
                    <rect x="22" y="6" width="4" height="4"/>
                    <path d="M30,14H18V2H30ZM20,12h8V4H20Z"/>
                    <rect x="6" y="6" width="4" height="4"/>
                    <path d="M14,14H2V2H14ZM4,12h8V4H4Z"/>
                    <rect width="32" height="32" fill="none"/>
                  </svg>
                </button>
              {/if}
           
              <MainFab active={editMode}
                       on:click={editMode ? applyEdit : toggleEditMode}
                       on:hoverenter={onApplyHoverEnter}
                       on:hoverleave={onApplyHoverLeave} />
            
              <CancelFab visible={editMode && showCancelFab}
                         on:click={cancelEdit}
                         on:hoverenter={onCancelHoverEnter}
                         on:hoverleave={onCancelHoverLeave} />
              {#if stickerMode}
                <div class="sticker-controls">
                  <button class="btn small" on:click={confirmSticker}>{t('qr.confirm')}</button>
                  <button class="btn small" on:click={cancelSticker}>{t('common.cancel')}</button>
                </div>
              {/if}
            </div>
       
            <div class="left-fab-slot">
              <button class="save-fab" class:visible={!editMode} title={t('editor.saveImage')} aria-label={t('editor.saveImage')} on:click={downloadCurrent}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zM7 5h8v4H7V5zm5 14H6v-6h6v6z"/>
                </svg>
              </button>
              <button class="info-fab" class:visible={editMode} title={t('hotkeys.help.title')} aria-label={t('hotkeys.help.title')} on:click={() => showInfo = true}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .editor-backdrop {
    position: fixed;
    inset: 0;
    background: radial-gradient(60% 60% at 50% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483646; 
    pointer-events: auto;
    isolation: isolate;
  }
  .editor-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    width: min(92vw, 980px);
    height: 86vh; 
    max-height: 86vh;
    min-height: 420px;
    background: rgba(24, 26, 32, 0.98) !important;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset;
    padding: 12px;
    overflow: hidden;
    z-index: 2147483647;
    opacity: 1 !important;
    visibility: visible !important;
    color: #fff;
    outline: 2px solid rgba(240,81,35,0.7); 
    display: grid;
    grid-template-rows: 1fr;
  }
  .editor-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 12px;
    height: 100%;
    min-height: 0; 
  }
  .editor-panel {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto; 
    scrollbar-gutter: stable; 
    scrollbar-color: rgba(255,255,255,0.35) rgba(255,255,255,0.08);
    scrollbar-width: thin;
    min-height: 0; 
    position: relative; 
  }
  
  .editor-panel.locked > *:not(.panel-lock) { pointer-events: none; filter: blur(3px); }
  .editor-panel.locked :is(input, select, button, textarea, a, [tabindex]) { pointer-events: none; }
  .editor-panel.locked :is(input, select, button, textarea, a, [tabindex]) { -webkit-user-select: none; user-select: none; }
  
  .editor-panel.locked .panel-lock, .editor-panel.locked .panel-lock * { pointer-events: auto; }
  
  .editor-panel.locked * { scrollbar-width: none; }
  :global(.editor-panel.locked *::-webkit-scrollbar) { width: 0 !important; height: 0 !important; }
  
  .editor-panel.locked { overflow: hidden; scrollbar-width: none; }
  :global(.editor-panel.locked::-webkit-scrollbar) { width: 0 !important; height: 0 !important; }
  :global(.editor-panel::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(.editor-panel::-webkit-scrollbar-track) { background: rgba(255,255,255,0.06); border-radius: 8px; }
  :global(.editor-panel::-webkit-scrollbar-thumb) { background: rgba(255,255,255,0.28); border-radius: 8px; }
  :global(.editor-panel::-webkit-scrollbar-thumb:hover) { background: rgba(255,255,255,0.38); }
  :global(.editor-panel::-webkit-scrollbar-button) { display: none; width: 0; height: 0; }
  :global(.editor-panel::-webkit-scrollbar-button:single-button) { display: none; width: 0; height: 0; }
  :global(.editor-panel::-webkit-scrollbar-button:vertical:decrement),
  :global(.editor-panel::-webkit-scrollbar-button:vertical:increment),
  :global(.editor-panel::-webkit-scrollbar-button:start:decrement),
  :global(.editor-panel::-webkit-scrollbar-button:end:increment) { display: none; width: 0; height: 0; }
  .editor-panel-title {
    font-weight: 600;
    opacity: 0.9;
    margin-bottom: 4px;
  }
  .editor-control { display: flex; flex-direction: column; gap: 6px; }
  .editor-control-title { font-size: 13px; opacity: .9; }
  .editor-row { display: flex; align-items: center; gap: 10px; }
  .editor-row input[type="range"] { flex: 1; }
  
  :global(input[type="range"]) {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 999px;
    
    background:
      linear-gradient(#f05123, #f05123)
        0 / calc((var(--val) - var(--min)) * 100% / (var(--max) - var(--min))) 100% no-repeat,
      rgba(255,255,255,0.25);
    outline: none;
  }
  :global(input[type="range"]:hover),
  :global(input[type="range"]:focus-visible) {
    background: rgba(255,255,255,0.35);
  }
  
  :global(input[type="range"]::-webkit-slider-runnable-track) {
    height: 6px;
    background: transparent;
    border-radius: 999px;
  }
  :global(input[type="range"]:hover::-webkit-slider-runnable-track),
  :global(input[type="range"]:focus-visible::-webkit-slider-runnable-track) {
    background: transparent;
  }
  :global(input[type="range"]::-webkit-slider-thumb) {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid #f05123;
    margin-top: -5px; 
    opacity: 0; transform: scale(0.6);
    transition: opacity .15s ease, transform .15s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }
  :global(input[type="range"]:hover::-webkit-slider-thumb),
  :global(input[type="range"]:focus-visible::-webkit-slider-thumb),
  :global(input[type="range"]:active::-webkit-slider-thumb) {
    opacity: 1; transform: scale(1);
  }
  
  :global(input[type="range"]::-moz-range-track) {
    height: 6px;
    border-radius: 999px;
    background:
      linear-gradient(#f05123, #f05123)
        0 / calc((var(--val) - var(--min)) * 100% / (var(--max) - var(--min))) 100% no-repeat,
      rgba(255,255,255,0.25);
  }
  :global(input[type="range"]:hover::-moz-range-track),
  :global(input[type="range"]:focus-visible::-moz-range-track) {
    background:
      linear-gradient(#f05123, #f05123)
        0 / calc((var(--val) - var(--min)) * 100% / (var(--max) - var(--min))) 100% no-repeat,
      rgba(255,255,255,0.35);
  }
  :global(input[type="range"]::-moz-range-thumb) {
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid #f05123;
    opacity: 0; transform: scale(0.6);
    transition: opacity .15s ease, transform .15s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }
  :global(input[type="range"]:hover::-moz-range-thumb),
  :global(input[type="range"]:focus-visible::-moz-range-thumb),
  :global(input[type="range"]:active::-moz-range-thumb) {
    opacity: 1; transform: scale(1);
  }
  .editor-value { width: 44px; text-align: right; opacity: .9; }
  .editor-hint { font-size: 12px; opacity: .7; }
  .editor-select {
    flex: 1;
    height: 36px;
    padding: 6px 12px;
    background: #2a2d33;
    border: 1px solid rgba(255,255,255,0.18);
    color: #fff;
    border-radius: 10px;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: none !important;
    
    transition: filter .12s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
  }
  .editor-select:focus { outline: none; box-shadow: 0 0 0 3px rgba(240,81,35,0.28); border-color: rgba(255,255,255,0.28); }
  .editor-select:hover { filter: brightness(1.05); }
  
  :global(select.editor-select::-ms-expand) { display: none; }
  :global(.editor-select option) { background: #2a2d33 !important; color: #fff !important; }
  :global(.editor-select optgroup) { background: #2a2d33 !important; color: #fff !important; }

  
  .palette-custom {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: 6px;
    max-height: 220px; overflow-y: auto; padding-right: 0;
    
    scrollbar-width: thin; 
    scrollbar-color: rgba(255,255,255,0.25) transparent;
  }
  
  :global(.palette-custom::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(.palette-custom::-webkit-scrollbar-thumb) { background: rgba(255,255,255,0.28); border-radius: 8px; }
  :global(.palette-custom::-webkit-scrollbar-track) { background: transparent; }
  :global(.palette-custom::-webkit-scrollbar-button) { display: none; width: 0; height: 0; }
  
  :global(.palette-custom::-webkit-scrollbar-button:single-button) { display: none; width: 0; height: 0; }
  :global(.palette-custom::-webkit-scrollbar-button:vertical:decrement),
  :global(.palette-custom::-webkit-scrollbar-button:vertical:increment),
  :global(.palette-custom::-webkit-scrollbar-button:start:decrement),
  :global(.palette-custom::-webkit-scrollbar-button:end:increment) { display: none; width: 0; height: 0; }
  :global(.palette-custom::-webkit-scrollbar-corner) { background: transparent; }
  .palette-toolbar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; padding: 6px 0; }
  .palette-count {
    font-size: 12px; font-weight: 600; opacity: .95;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.14);
    font-variant-numeric: tabular-nums;
  }
  .palette-actions { display: flex; gap: 8px; align-items: center; }
  .palette-btn {
    font-size: 12px; font-weight: 500; letter-spacing: .2px;
    padding: 6px 10px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.07);
    color: #fff; cursor: pointer;
    transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .15s ease, filter .15s ease;
  }
  .palette-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .palette-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(240,81,35,0.28); border-color: rgba(255,255,255,0.28); }
  .palette-btn.primary { background: #f05123; border-color: rgba(255,255,255,0.25); color: #fff; }
  .palette-btn.ghost { background: rgba(255,255,255,0.04); color: #fff; }

  
  .panel-lock {
    position: absolute;
    inset: 0;
    z-index: 100; 
    pointer-events: auto; 
    background: rgba(16,18,22,0.16); 
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    overscroll-behavior: contain; 
    user-select: none;
    border-radius: inherit;
    position: absolute;
  }
  
  .panel-lock::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: inherit;
    backdrop-filter: inherit;
    -webkit-backdrop-filter: inherit;
    z-index: 0;
  }
  .editor-panel.locked { 
    box-shadow: inset 0 0 0 9999px rgba(16,18,22,0.08);
  }
  .panel-lock .tape {
    position: absolute;
    left: -40%;
    width: 180%;
    height: 32px;
    background: #ffd400; 
    border-top: 1px solid rgba(0,0,0,0.35);
    border-bottom: 1px solid rgba(0,0,0,0.35);
    box-shadow: 0 4px 12px rgba(0,0,0,0.28);
    overflow: hidden;
    display: flex;
    align-items: center;
    transform-origin: left center;
    transition: transform .35s ease;
  }
  .panel-lock .tape-text {
    white-space: nowrap;
    font-weight: 800;
    color: #000; 
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 14px;
    line-height: 32px;
    animation-name: marquee;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    will-change: transform;
    padding-left: 8px;
    user-select: none; -webkit-user-select: none; -moz-user-select: none; 
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  
  .panel-lock-icon {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 4;
    animation: lock-pop .25s ease;
  }
  @keyframes lock-pop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  
  .panel-lock-icon .btn-lock {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: transparent; 
    display: grid;
    place-items: center;
    box-shadow: none; 
    transition: background .2s ease;
  }
  .panel-lock-icon .btn-lock svg { fill: none; transform: translate3d(0,0,0); width: 66px; height: 72px; }
  .panel-lock-icon .btn-lock svg .bling {
    stroke: #fff; stroke-width: 2.5; stroke-linecap: round;
    stroke-dasharray: 3; stroke-dashoffset: 15; transition: all .3s ease;
  }
  .panel-lock-icon .btn-lock svg .lock {
    stroke: #fff; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round;
    stroke-dasharray: 36; transition: all .4s ease;
  }
  .panel-lock-icon .btn-lock svg .lockb {
    fill: #fff; fill-rule: evenodd; clip-rule: evenodd;
    transform: rotate(8deg); transform-origin: 14px 20px; transition: all .2s ease;
  }
  
  .panel-lock-icon .btn-lock { opacity: 1; transform: translateX(0); transition: transform .35s cubic-bezier(.2,.8,.2,1), opacity .25s ease; }
  .panel-lock-icon .btn-lock.phase-enter { opacity: 0; transform: translateX(-140%); }
  .panel-lock-icon .btn-lock.phase-center { opacity: 1; transform: translateX(0); }
  .panel-lock-icon .btn-lock.phase-leave { opacity: 0; transform: translateX(140%); }
  
  .panel-lock-icon .btn-lock.closing svg .bling { animation: bling6132 .3s linear forwards; animation-delay: .2s; }
  .panel-lock-icon .btn-lock.closing svg .lock { stroke-dasharray: 48; animation: locked .3s linear forwards; }
  .panel-lock-icon .btn-lock.closing svg .lockb { transform: rotate(0); transform-origin: 14px 22px; }
  @keyframes bling6132 { 50% { stroke-dasharray: 3; stroke-dashoffset: 12; } 100% { stroke-dasharray: 3; stroke-dashoffset: 9; } }
  @keyframes locked { 50% { transform: translateY(1px); } }
  .palette-item { position: relative; display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px; height: 36px; cursor: pointer; }
  .palette-item input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .sw { width: 22px; height: 22px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 0 0 1px rgba(0,0,0,0.15) inset; background: var(--c); }
  .nm { display: none; }
  .palette-badge { display: none; }
  .palette-item input:checked + .sw { outline: 2px solid #f05123; outline-offset: 1px; }
  
  .palette-item.paid { background: rgba(240,81,35,0.18); border-color: rgba(240,81,35,0.35); }
  .palette-item.paid input:checked + .sw { outline-color: #fff; }

  
  .editor-group {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 10px;
    margin: 6px 0 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .editor-group-title { font-weight: 600; opacity: .9; margin-bottom: 2px; }

  .editor-buttons { display: flex; gap: 8px; align-items: center; }
  .editor-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .editor-btn.editor-primary { background: #f05123; border-color: rgba(255,255,255,0.25); }

  .editor-output { position: relative; display: flex; flex-direction: column; min-height: 380px; }
  .editor-output-header { position: absolute; top: 0; left: 0; right: 0; height: 36px; z-index: 5; background: rgba(24,26,32,0.85); border-bottom: 1px solid rgba(255,255,255,0.15); padding: 6px 10px; display: flex; align-items: center; justify-content: center; overflow: visible; }
  :global(.editor-output-header::-webkit-scrollbar) { width: 0; height: 0; }
  .editor-output-header { scrollbar-width: none; }
  
  .editor-output-box {
    position: relative;
    flex: 1;
    padding-top: 36px; 
    
    background-color: #111;
    background-image:
      linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%),
      linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 0, 8px 8px, 8px 8px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  
  .header-palette { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); margin-left: 0; height: 24px; display: inline-flex; align-items: center; }
  .header-palette .palette-row { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 24px; }
  .header-palette .swatch { position: relative; width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.35); background: var(--c); box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; padding: 0; }
  .header-palette .swatch::after { content: attr(data-label); position: absolute; left: 50%; top: calc(100% + 10px); transform: translateX(-50%); background: rgba(17,17,17,0.95); color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 6px 16px rgba(0,0,0,0.35); white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .12s ease, transform .12s ease, visibility .12s; z-index: 40; }
  .header-palette .swatch:hover::after, .header-palette .swatch:focus-visible::after { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
  .header-palette .swatch.selected { outline: 2px solid #f05123; outline-offset: 1px; }
  .header-palette .palette-popover { position: absolute; top: 100%; padding-top: 8px; left: 50%; z-index: 20; opacity: 0; transform: translate(-50%, 0) scale(.98); pointer-events: none; transition: opacity .15s ease, transform .15s ease; }
  .header-palette .palette-popover > .palette-grid { background: rgba(17,17,17,0.95); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 8px; box-shadow: 0 12px 28px rgba(0,0,0,0.45); }
  .header-palette.open .palette-popover, .header-palette:hover .palette-popover { opacity: 1; transform: translate(-50%, 0) scale(1); pointer-events: auto; }
  .header-palette .palette-grid { display: grid; grid-template-columns: repeat(14, 16px); gap: 6px; }
  
  .header-palette .swatch.is-grad-a { outline: 2px solid #f05123; outline-offset: 1px; }
  .header-palette .swatch.is-grad-b { box-shadow: 0 0 0 2px #55aaff inset; }
  .header-palette .swatch.is-grad-a.is-grad-b { outline-style: dashed; box-shadow: 0 0 0 2px #55aaff inset; }
  
  
  .edit-stage { position: absolute; inset: 0; cursor: crosshair; }
  .edit-stage.infoOpen { cursor: default; }
  .edit-stage.sizing { cursor: none; }
  .edit-canvas { position: absolute; z-index: 1; image-rendering: pixelated; image-rendering: crisp-edges; }
  .edit-canvas, .overlay-canvas { will-change: transform; }
  .overlay-canvas { position: absolute; z-index: 2; pointer-events: none; }
  .edit-stage.panning { cursor: grabbing; }
  .editor-output-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .editor-placeholder { opacity: .5; }
  .editor-busy {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    background: rgba(0,0,0,.55);
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 0 6px 18px rgba(0,0,0,0.24);
    backdrop-filter: blur(3px);
    white-space: nowrap;
  }
  .fab-container { position: absolute; right: 10px; bottom: 10px; display: flex; align-items: center; gap: 8px; z-index: 2; padding-top: 60px; }
  .fab-tools { display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateX(8px) scale(0.98); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
  .fab-tools.open { opacity: 1; transform: translateX(0) scale(1); pointer-events: auto; }
  .fab-tool-wrap { position: relative; }
  
  .gen-fab { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.95); color: #222; border: 1px solid rgba(0,0,0,0.1); display: grid; place-items: center; box-shadow: 0 8px 22px rgba(0,0,0,0.35); cursor: pointer; transition: transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .15s ease; }
  .gen-fab:hover { filter: brightness(1.05); transform: translateY(-1px); }
  .fab-tools.disabled { pointer-events: none; opacity: .45; filter: grayscale(.35); }
  .fab-tools.disabled .fab-tool.active { background: rgba(255,255,255,0.95); color: #222; }
  .header-palette.disabled { pointer-events: none; opacity: .5; filter: grayscale(.2); }
  .sticker-controls { position: absolute; right: 10px; bottom: 58px; display: flex; gap: 8px; z-index: 3; }
  .btn.small { font-size: 12px; padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .btn.small:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .gradient-tool .gradient-modes { position: absolute; left: 50%; transform: translateX(-50%); bottom: 48px; display: grid; gap: 6px; background: rgba(17,17,17,0.95); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 6px; box-shadow: 0 12px 28px rgba(0,0,0,0.45); z-index: 30; }
  .gradient-tool .gradient-modes .mode { min-width: 38px; height: 30px; padding: 0 8px; border-radius: 8px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: filter .12s ease, background .12s ease, color .12s ease, transform .12s ease; }
  .gradient-tool .gradient-modes .mode:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .gradient-tool .gradient-modes .mode.active { background: #f05123; border-color: rgba(255,255,255,0.25); }
  
  .save-fab { position: absolute; left: 10px; bottom: 10px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.95); color: #222; border: 1px solid rgba(0,0,0,0.1); display: grid; place-items: center; box-shadow: 0 8px 22px rgba(0,0,0,0.35); cursor: pointer; z-index: 2; transition: transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .15s ease; }
  .save-fab:hover { filter: brightness(1.05); }
  .info-fab { position: absolute; left: 10px; bottom: 10px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.95); color: #222; border: 1px solid rgba(0,0,0,0.1); display: grid; place-items: center; box-shadow: 0 8px 22px rgba(0,0,0,0.35); cursor: pointer; z-index: 2; transition: transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .15s ease; }
  .info-fab:hover { filter: brightness(1.05); transform: translateY(-1px); }
  .left-fab-slot { position: absolute; left: 10px; bottom: 10px; width: 44px; height: 44px; z-index: 3; }
  .left-fab-slot > button { position: absolute; inset: 0; opacity: 0; transform: scale(.96); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
  .left-fab-slot > button.visible { opacity: 1; transform: scale(1); pointer-events: auto; }
  .fab-tool { position: relative; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.95); color: #222; border: 1px solid rgba(0,0,0,0.1); display: grid; place-items: center; box-shadow: 0 6px 18px rgba(0,0,0,0.28); cursor: pointer; transition: transform .12s ease, filter .12s ease, background .12s ease, color .12s ease; }
  .tool-size-badge { position: absolute; top: -10px; right: -10px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: #111; color: #fff; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 4px 10px rgba(0,0,0,0.35); pointer-events: none; }
  .fab-tool:hover { filter: brightness(1.03); transform: translateY(-2px); }
  .fab-tool.active { background: #f05123; color: #fff; border-color: rgba(0,0,0,0.15); }

  

  
  
  .fab-tools.open .fab-tool:nth-child(1),
  .fab-tools.open .fab-tool-wrap:nth-child(1) > .fab-tool { transition-delay: .02s; }
  .fab-tools.open .fab-tool:nth-child(2),
  .fab-tools.open .fab-tool-wrap:nth-child(2) > .fab-tool { transition-delay: .04s; }
  .fab-tools.open .fab-tool:nth-child(3),
  .fab-tools.open .fab-tool-wrap:nth-child(3) > .fab-tool { transition-delay: .06s; }
  .fab-tools.open .fab-tool:nth-child(4),
  .fab-tools.open .fab-tool-wrap:nth-child(4) > .fab-tool { transition-delay: .08s; }
  .fab-tools.open .fab-tool:nth-child(5),
  .fab-tools.open .fab-tool-wrap:nth-child(5) > .fab-tool { transition-delay: .10s; }
</style>
