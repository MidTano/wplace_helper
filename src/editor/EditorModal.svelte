<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import { resampleImage, blobToObjectUrl, resampleAndDither } from './imageOps';
  import { drawOverlayForTool, paintAtTool, applyGradientOnCanvas, computeMagicRegion, computeMagicRegionGlobal, copySelectionRect, writeSelectionRect, applyMagicSelectionOnMask, paintMaskedBlock, applySelectionRectOnMask, buildSelectionAntsCanvas, drawGradientPreviewOverlay, refreshSelectionVisFromMask as refreshSelectionVisFromMaskTool, refreshSelectionVisSubrect } from './modal/tools';
  import { downloadBlob } from './save';
  import { RESAMPLE_METHODS } from './resamplers';
  import { DITHER_METHODS, methodSupportsStrength, setCustomDitherPatternBinary } from './dithering';
  import { MASTER_COLORS, getFreeIndices, getPalette, getPaletteFromIndices, PALETTE_PRESETS } from './palette';
  import HotkeysInfoModal from './components/Info/HotkeysInfoModal.svelte';
  import MainFab from './components/Fab/MainFab.svelte';
  import CancelFab from './components/Fab/CancelFab.svelte';
  import HeaderStats from './components/Output/HeaderStats.svelte';
  import CustomSelect from './CustomSelect.svelte';
  import { t, lang } from '../i18n';
  import { uploadToCatbox, fileNameFromUrl } from '../utils/catbox';
  import { buildCodeCanvas } from '../utils/codeTileEncoder';
  import { setMoveMode } from '../overlay/state';
  import { appendToBody } from './modal/utils/appendToBody';
  import { fitAnts } from './modal/canvas/selection';
  import { createPreviewCache, generateCacheKey } from './modal/utils/previewCache';
  import { getDisplayMetrics, screenToPixel, calculateZoomPan } from './modal/utils/metrics';
  import { showQrBanner, hideQrBanner, waitForCoordinates, generateFileName } from './modal/qr/qrWorkflow';
  import { createStickerState, placeStickerAtCenter, startStickerDrag, updateStickerPosition, stopStickerDrag, isPointInSticker, cancelSticker, confirmSticker } from './modal/qr/stickerManager';
  import { createImageWorkers, destroyImageWorkers, cancelAllJobs, sendPreviewJob, sendStatsJob, sendMagicSelectionJob, sendMagicSelectionJobBitmap } from './modal/worker/workerManager';
  import { createSmoothDrawingState, startStroke, addPointToStroke, finishStroke, cancelStroke, getBufferCanvas, hasActiveStroke, hasBufferedChanges, getUndoData, clearUndoData, getGhostData, clearGhostData, getEraserGhostCanvas } from './modal/drawing/smoothDrawing';
  import { 
    createStageMouseMoveHandler, 
    createStageMouseLeaveHandler, 
    createStageMouseDownHandler, 
    createStageMouseUpHandler, 
    createWindowMouseUpHandler,
    createStartPatternDragHandler,
    createMovePatternDragHandler,
    createGlobalWheelHandler,
    createStageWheelHandler
  } from './modal/events';
  import { 
    createWindowKeyDownHandler,
    createBackdropKeyDownHandler,
    createButtonKeyDownHandler
  } from './modal/events/keyboardEvents';
  
  
  import { 
    comparisonStore, 
    comparisonImages, 
    canAddMore, 
    hasEnoughForComparison,
    isModalOpen,
    comparisonActions 
  } from './comparison/ComparisonStore';
  import ComparisonModal from './comparison/ComparisonModal.svelte';

  

  export let open = false;
  export let file = null; 

  const dispatch = createEventDispatcher();
  
  $: _i18n_editor_modal_lang = $lang;

  let pixelSize = 1;
  let method = 'nearest';
  let ditherMethod = 'none';
  let ditherLevels = 4;
  $: ditherSupportsStrength = methodSupportsStrength(ditherMethod);
  let paletteMode = 'full'; 
  let outlineThickness = 0; 
  let erodeAmount = 0; 
  let customIndices = [];
  let customInitialized = false;
  
  const makePattern = () => Array.from({length:8},()=>Array(8).fill(0));
  let customDitherPattern = makePattern(); 
  let customDitherAppliedKey = ''; 
  let customDitherStrengthPct = 100; 
  $: customDitherStrength = Math.max(0, Math.min(100, customDitherStrengthPct|0)) / 100;
  function flattenPattern(p) { try { return p.flat().map(v=>v?1:0).join(''); } catch { return ''; } }
  function clampStep(n, min, max, step) {
    let x = Number(n);
    if (!isFinite(x)) x = Number(min);
    x = Math.min(Number(max), Math.max(Number(min), x));
    if (step && step > 0) {
      x = Math.round(x / step) * step;
      x = Number(x.toFixed(6));
    }
    return x;
  }
  function applyCustomDitherPattern() {
    try {
      setCustomDitherPatternBinary(customDitherPattern, customDitherStrength);
      customDitherAppliedKey = `${flattenPattern(customDitherPattern)}|s:${Math.round(customDitherStrength*100)}`;
      schedulePreviewUpdate(); 
    } catch {}
  }

  function applySettingsFromComparison(img) {
    try {
      const s = img?.metadata?.settings || {};
      
      if (typeof s.pixelSize === 'number') pixelSize = Math.max(1, Number(s.pixelSize) || 1);
      if (typeof s.method === 'string') method = s.method;
      if (typeof s.ditherMethod === 'string') ditherMethod = s.ditherMethod;
      if (typeof s.ditherLevels === 'number') ditherLevels = s.ditherLevels;
      if (typeof s.paletteMode === 'string') paletteMode = s.paletteMode;
      if (typeof s.outlineThickness === 'number') outlineThickness = Math.max(0, s.outlineThickness|0);
      if (typeof s.erodeAmount === 'number') erodeAmount = Math.max(0, s.erodeAmount|0);

      
      if (paletteMode === 'custom') {
        if (Array.isArray(s.customIndices)) {
          customIndices = s.customIndices.slice();
        }
      }
      
      if (ditherMethod === 'custom') {
        if (s.customDitherPattern) customDitherPattern = s.customDitherPattern;
        if (typeof s.customDitherStrength === 'number') customDitherStrength = s.customDitherStrength;
      }

      
      colorCorrectionEnabled = !!s.colorCorrectionEnabled;
      if (colorCorrectionEnabled) {
        if (typeof s.brightness === 'number') brightness = Math.max(-100, Math.min(100, s.brightness|0));
        if (typeof s.contrast === 'number') contrast = Math.max(-100, Math.min(100, s.contrast|0));
        if (typeof s.saturation === 'number') saturation = Math.max(-100, Math.min(100, s.saturation|0));
        if (typeof s.hue === 'number') hue = Math.max(-180, Math.min(180, s.hue|0));
      } else {
        brightness = 0; contrast = 0; saturation = 0; hue = 0;
      }

      
      schedulePreviewUpdate(0);
    } catch {}
  }

  
  
  let tagMinCount = 3;
  let ALL_PRESET_TAGS = [];
  let presetQuery = '';
  let selectedTags = new Set();
  let onlyFreePresets = false;
  let onlyFavoritePresets = false;
  let filteredPresets = PALETTE_PRESETS;
  const FAVORITES_KEY = 'wph_palette_favs';
  const CUSTOM_INDICES_KEY = 'wph_custom_indices';
  let favoritePresetIds = new Set();

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) favoritePresetIds = new Set(arr.filter(x => typeof x === 'string'));
    } catch {}
  }
  function saveFavorites() {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favoritePresetIds))); } catch {}
  }
  function toggleFavoritePreset(p) {
    try {
      const next = new Set(favoritePresetIds);
      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
      favoritePresetIds = next;
      saveFavorites();
    } catch {}
  }
  
  $: {
    const counts = new Map();
    for (const p of PALETTE_PRESETS) {
      for (const tag of (p.tags || [])) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    
    const countAt = (min) => {
      let k = 0; counts.forEach(v => { if ((v || 0) >= min) k++; }); return k;
    };
    
    let t = 3;
    if (countAt(3) >= 30) t = 4; 
    if (countAt(4) >= 30) t = 5; 
    tagMinCount = t;

    ALL_PRESET_TAGS = Array.from(counts.keys())
      .filter(tag => (counts.get(tag) || 0) >= tagMinCount)
      .sort();
    
    if (selectedTags && selectedTags.size) {
      const allow = new Set(ALL_PRESET_TAGS);
      const nextSel = new Set([...selectedTags].filter(tg => allow.has(tg)));
      if (nextSel.size !== selectedTags.size) selectedTags = nextSel;
    }
  }
  $: {
    const q = (presetQuery || '').trim().toLowerCase();
    filteredPresets = PALETTE_PRESETS.filter(p => {
      if (q && !String(p.name || '').toLowerCase().includes(q)) return false;
      if (selectedTags && selectedTags.size > 0) {
        const tags = p.tags || [];
        for (const t of selectedTags) { if (!tags.includes(t)) return false; }
      }
      if (onlyFreePresets) {
        if (!p.indices.every(i => MASTER_COLORS[i] && MASTER_COLORS[i].paid === false)) return false;
      }
      if (onlyFavoritePresets) {
        if (!favoritePresetIds.has(p.id)) return false;
      }
      return true;
    }).slice().sort((a, b) => {
      const af = favoritePresetIds.has(a.id) ? 1 : 0;
      const bf = favoritePresetIds.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af; 
      return String(a.name||'').localeCompare(String(b.name||''));
    });
  }
  function toggleTag(tag) {
    const next = new Set(selectedTags);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    selectedTags = next;
  }
  function clearPresetFilters() {
    presetQuery = '';
    selectedTags = new Set();
    onlyFreePresets = false;
    onlyFavoritePresets = false;
  }
  onMount(() => { loadFavorites(); });
  async function applyPreset(p) {
    try {
      customIndices = p.indices.slice();
      await tick();
      schedulePreviewUpdate();
    } catch {}
  }
  function resetCustomPattern() {
    customDitherPattern = makePattern();
  }
  
  let isPatternDragging = false;
  let patternDragValue = 1;
  
  
  $: if (paletteMode === 'custom') {
    if (!customInitialized) {
      try {
        const saved = localStorage.getItem(CUSTOM_INDICES_KEY);
        if ((!Array.isArray(customIndices) || customIndices.length === 0) && saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr) && arr.every(n => Number.isInteger(n))) {
            customIndices = arr;
          }
        }
      } catch {}
      if (!Array.isArray(customIndices) || customIndices.length === 0) {
        customIndices = getFreeIndices();
      }
      customInitialized = true;
    }
  } else {
    customInitialized = false;
  }
  $: if (paletteMode === 'custom' && Array.isArray(customIndices)) {
    try { localStorage.setItem(CUSTOM_INDICES_KEY, JSON.stringify(customIndices)); } catch {}
  }
  $: customKey = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
  $: customDitherKey = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';

  
  
  
  let isCurrentImageInComparison = false;
  $: {
    
    if (hasEdits) {
      isCurrentImageInComparison = false;
    } else {
      
      const currentKey = `${pixelSize}|${method}|${ditherMethod}|${ditherLevels}|${paletteMode}|${outlineThickness}|${erodeAmount}|${customKey}|${customDitherKey}`;
      isCurrentImageInComparison = $comparisonImages.some(img => {
        const s = img.metadata.settings;
        const ciMatch = (paletteMode !== 'custom') ? true : ((s.customIndices ? s.customIndices.join('-') : '') === customKey);
        const ccMatch = (
          (s.colorCorrectionEnabled || false) === (colorCorrectionEnabled || false)
          && (!colorCorrectionEnabled || (
            (s.brightness|0) === (brightness|0) &&
            (s.contrast|0) === (contrast|0) &&
            (s.saturation|0) === (saturation|0) &&
            (s.hue|0) === (hue|0)
          ))
        );
        return s.pixelSize === pixelSize &&
          s.method === method &&
          s.ditherMethod === ditherMethod &&
          s.ditherLevels === ditherLevels &&
          s.paletteMode === paletteMode &&
          s.outlineThickness === outlineThickness &&
          s.erodeAmount === erodeAmount &&
          ciMatch && ccMatch &&
          (ditherMethod !== 'custom' || true); 
      });
    }
  }
  
  function getCurrentEditorSettings() {
    return {
      pixelSize,
      method,
      ditherMethod,
      ditherLevels,
      paletteMode,
      outlineThickness,
      erodeAmount,
      customIndices: paletteMode === 'custom' ? customIndices : undefined,
      customDitherPattern: ditherMethod === 'custom' ? customDitherPattern : undefined,
      customDitherStrength: ditherMethod === 'custom' ? customDitherStrength : undefined,
      colorCorrectionEnabled,
      brightness,
      contrast,
      saturation,
      hue
    };
  }

  async function addToComparison() {
    try {
      
      if (isCurrentImageInComparison) {
        const currentSettings = getCurrentEditorSettings();
        const imageToRemove = $comparisonImages.find(img => {
          const s = img.metadata.settings;
          const ciMatch = (s.paletteMode !== 'custom' && currentSettings.paletteMode !== 'custom')
            ? true
            : ((s.customIndices?.join('-') || '') === (currentSettings.customIndices?.join('-') || ''));
          const ccMatch = ((s.colorCorrectionEnabled||false) === (currentSettings.colorCorrectionEnabled||false)) &&
            (!(currentSettings.colorCorrectionEnabled) || (
              (s.brightness|0) === (currentSettings.brightness|0) &&
              (s.contrast|0) === (currentSettings.contrast|0) &&
              (s.saturation|0) === (currentSettings.saturation|0) &&
              (s.hue|0) === (currentSettings.hue|0)
            ));
          return (
            s.pixelSize === currentSettings.pixelSize &&
            s.method === currentSettings.method &&
            s.ditherMethod === currentSettings.ditherMethod &&
            s.ditherLevels === currentSettings.ditherLevels &&
            s.paletteMode === currentSettings.paletteMode &&
            s.outlineThickness === currentSettings.outlineThickness &&
            s.erodeAmount === currentSettings.erodeAmount &&
            ciMatch && ccMatch
          );
        });
        
        if (imageToRemove) {
          comparisonActions.removeImage(imageToRemove.id);
          console.log('Изображение удалено из сравнения');
        }
        return;
      }
      
      if (!$canAddMore) {
        console.warn('Достигнут лимит изображений для сравнения');
        return;
      }
      
      
      let currentBlob = null;
      const customKeyNow = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
      const customDitherKeyNow = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';
      const ccKey = colorCorrectionEnabled ? `|cc:1|b:${brightness}|c:${contrast}|s:${saturation}|h:${hue}` : '|cc:0';
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKeyNow}`:''}${ditherMethod==='custom'?`|cp:${customDitherKeyNow}`:''}${ccKey}`;
      
      
      const cached = previewCache.get(key);
      if (cached && cached.blob) {
        currentBlob = cached.blob;
      } else {
        
        currentBlob = await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices, colorCorrectionEnabled, brightness, contrast, saturation, hue);
      }
      
      if (!currentBlob) {
        console.error('Не удалось получить blob текущего изображения');
        return;
      }
      
      
      const settings = getCurrentEditorSettings();
      const metadata = {
        dimensions: outW && outH ? { width: outW, height: outH } : undefined,
        stats: opaqueCount && colorCount ? { colors: colorCount, opaque: opaqueCount } : undefined
      };
      
      const success = await comparisonActions.addImage(currentBlob, settings, metadata);
      if (success) {
        console.log(`Изображение добавлено в сравнение. Всего изображений: ${$comparisonImages.length + 1}`);
      } else {
        console.warn('Не удалось добавить изображение в сравнение (возможно, дубликат)');
      }
    } catch (error) {
      console.error('Ошибка при работе с системой сравнения:', error);
    }
  }
  
  function openComparisonModal() {
    try {
      if ($comparisonImages.length < 2) {
        console.warn('Для сравнения необходимо минимум 2 изображения');
        return;
      }
      
      comparisonActions.openModal();
      console.log('Открыто модальное окно сравнения с', $comparisonImages.length, 'изображениями');
    } catch (error) {
      console.error('Ошибка при открытии модального окна сравнения:', error);
    }
  }

  
  function applyGradient(x0, y0, x1, y1) {
    if (!editCanvas || !outW || !outH) return;
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
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
  let quickPreviewUrl = '';
  let quickPreviewRevoke = null;
  
  let imageWorker = null;
  let imageWorkerUrl = '';
  let workerReady = false;
  
  let imageWorkerPool = [];
  let poolSize = 0;
  let poolReadyCount = 0;
  
  let workerLimited = false;
  let workerCapabilities = null;
  let workerState = null;
  let jobSeq = 0;
  let lastPreviewJob = 0;
  let lastStatsJob = 0;
  let lastPreviewFinalApplied = false;
  let activeJobs = new Set(); 
  const pendingStats = new Map();
  let modalRef;
  let backdropRef;
  let panelRef;
  let panelScrollTop = 0; 
  
  let waitingForCoords = false;
  let qrFileName = '';
  let qrBannerEl = null;
  let suspendVisible = false; 
  
  let stickerState = createStickerState();
  $: stickerMode = stickerState.mode;
  $: stickerCanvas = stickerState.canvas;
  $: stickerW = stickerState.w;
  $: stickerH = stickerState.h;
  $: stickerX = stickerState.x;
  $: stickerY = stickerState.y;
  $: stickerDragging = stickerState.dragging;
  function showQrBannerLocal() {
    qrBannerEl = showQrBanner(t);
  }
  function hideQrBannerLocal() { 
    hideQrBanner(qrBannerEl); 
    qrBannerEl = null; 
  }

  async function beginQrGeneration() {
    try {
      const customKeyNow = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
      const customDitherKeyNow = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';
      const ccKey2 = colorCorrectionEnabled ? `|cc:1|b:${brightness}|c:${contrast}|s:${saturation}|h:${hue}` : '|cc:0';
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKeyNow}`:''}${ditherMethod==='custom'?`|cp:${customDitherKeyNow}`:''}${ccKey2}`;
      const cached = previewCache.get(key);
      
      const filename = generateFileName(file, pixelSize, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount);
      let outBlob = cached?.blob;
      if (!outBlob) {
        outBlob = await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices, colorCorrectionEnabled, brightness, contrast, saturation, hue);
      }
      
      const url = await uploadToCatbox(outBlob, filename);
      qrFileName = fileNameFromUrl(url);
      
      suspendVisible = true; waitingForCoords = true; showQrBannerLocal();
      try { setMoveMode(true); } catch {}
      const coords = await waitForCoordinates();
      hideQrBannerLocal(); waitingForCoords = false; suspendVisible = false;
      
      const cvs = await buildCodeCanvas(qrFileName, coords);
      stickerState = placeStickerAtCenter(stickerState, cvs, outW, outH);
      
      editMode = true;
      startPanelLockAnimation();
      await tick();
      ensureEditSurface();
      drawOverlay(hoverPx, hoverPy);
    } catch (e) {
      hideQrBannerLocal(); waitingForCoords = false; suspendVisible = false;
    }
  }

  function confirmStickerLocal() {
    const result = confirmSticker(stickerState, editCanvas, outW, outH);
    if (result && result.before && result.after) { 
      undoStack.push(result); 
      if (undoStack.length > 100) undoStack.shift(); 
      redoStack.length = 0; 
      hasEdits = true; 
    }
    stickerState = cancelSticker(stickerState); 
    drawOverlay(hoverPx, hoverPy);
  }
  function cancelStickerLocal() { 
    stickerState = cancelSticker(stickerState); 
    drawOverlay(hoverPx, hoverPy); 
  }

  
  function createImageWorkerLocal() {
    try {
      if (workerState && workerState.imageWorker) return;
      workerState = createImageWorkers({
        onDebug: (message, extra) => {
          try {
            if (message === 'imageWorker: ready') {
              workerReady = true;
              console.debug('[wph] imageWorker: ready');
            } else {
              
              console.debug('[wph] worker debug:', message, extra);
            }
          } catch {}
        },
        onError: (error) => {
          try { console.warn('[wph] imageWorker error:', error); } catch {}
          if (String(error || '').includes('limited')) {
            workerLimited = true;
            workerCapabilities = workerState ? (workerState.workerCapabilities || {}) : {};
          }
        },
        onProgress: (data) => {
          if (data.jobId !== lastPreviewJob) { return; }
          
        },
        onPreviewQuick: (data) => {
          try {
            if (data.jobId !== lastPreviewJob) { return; }
            if (lastPreviewFinalApplied) { return; }
            if (data && data.blob) {
              const b = data.blob;
              if (quickPreviewRevoke) { try { quickPreviewRevoke(); } catch {} }
              const u = URL.createObjectURL(b);
              quickPreviewUrl = u;
              quickPreviewRevoke = () => { try { URL.revokeObjectURL(u); } catch {} };
              previewUrl = u;
              
              return;
            }
            if (data && data.bitmap) {
              const bmp = data.bitmap; const w = data.w|0, h = data.h|0;
              const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d'); try { ctx.imageSmoothingEnabled = false; } catch {}
              ctx.clearRect(0,0,w,h); ctx.drawImage(bmp,0,0,w,h);
              try { bmp.close && bmp.close(); } catch {}
              canvas.toBlob((blob) => {
                try {
                  if (data.jobId !== lastPreviewJob || lastPreviewFinalApplied) return;
                  if (!blob) return;
                  if (quickPreviewRevoke) { try { quickPreviewRevoke(); } catch {} }
                  const u = URL.createObjectURL(blob);
                  quickPreviewUrl = u;
                  quickPreviewRevoke = () => { try { URL.revokeObjectURL(u); } catch {} };
                  previewUrl = u;
                  
                } catch {}
              }, 'image/png');
              return;
            }
          } catch {}
        },
        onPreviewFinal: (data) => {
          try {
            if (data.jobId !== lastPreviewJob) { try { console.debug('[wph] worker ' + data.type + ' (stale)', data.jobId); } catch {} return; }
            if (lastPreviewFinalApplied) { try { console.debug('[wph] ignore ' + data.type + ': final already applied for job', data.jobId); } catch {} return; }
            if (data.type === 'preview-final-bytes') {
              const bytes = data.bytes; const mime = data.mime || 'image/png'; const k = data.key;
              if (bytes) {
                const b = new Blob([bytes], { type: mime });
                if (quickPreviewRevoke) { try { quickPreviewRevoke(); quickPreviewRevoke = null; } catch {} }
                quickPreviewUrl = '';
                const u = URL.createObjectURL(b);
                previewUrl = u;
                const revoke = () => { try { URL.revokeObjectURL(u); } catch {} };
                if (k) previewCache.set(k, { blob: b, url: u, revoke });
                lastPreviewFinalApplied = true; working = false;
                activeJobs.delete(data.jobId);
                try { const sid = sendStatsJob(workerState, b, k); lastStatsJob = sid; pendingStats.set(sid, k); } catch {}
                const p = parseParamsFromKey(k);
                dispatch('update', { blob: b, pixelSize: p.pixelSize, method: p.method, ditherMethod: p.ditherMethod, ditherLevels: p.ditherLevels });
              }
              return;
            }
            if (data.type === 'preview-final') {
              const b = data.blob; const k = data.key;
              if (b) {
                if (quickPreviewRevoke) { try { quickPreviewRevoke(); quickPreviewRevoke = null; } catch {} }
                quickPreviewUrl = '';
                const u = URL.createObjectURL(b);
                previewUrl = u;
                const revoke = () => { try { URL.revokeObjectURL(u); } catch {} };
                if (k) previewCache.set(k, { blob: b, url: u, revoke });
                lastPreviewFinalApplied = true; working = false;
                activeJobs.delete(data.jobId);
                try { const sid = sendStatsJob(workerState, b, k); lastStatsJob = sid; pendingStats.set(sid, k); } catch {}
                const p = parseParamsFromKey(k);
                dispatch('update', { blob: b, pixelSize: p.pixelSize, method: p.method, ditherMethod: p.ditherMethod, ditherLevels: p.ditherLevels });
              }
              return;
            }
            if (data.type === 'preview-final-bmp') {
              try { console.debug('[wph] received preview-final-bmp', data.jobId, { w: data.w, h: data.h, hasBitmap: !!data.bitmap }); } catch {}
              const bmp = data.bitmap; const k = data.key; const w = data.w|0, h = data.h|0;
              const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d'); try { ctx.imageSmoothingEnabled = false; } catch {}
              ctx.clearRect(0,0,w,h); ctx.drawImage(bmp,0,0,w,h);
              try { bmp.close && bmp.close(); } catch {}
              canvas.toBlob((blob) => {
                try {
                  if (data.jobId !== lastPreviewJob) return;
                  if (!blob) return;
                  if (quickPreviewRevoke) { try { quickPreviewRevoke(); quickPreviewRevoke = null; } catch {} }
                  quickPreviewUrl = '';
                  const u = URL.createObjectURL(blob);
                  previewUrl = u;
                  const revoke = () => { try { URL.revokeObjectURL(u); } catch {} };
                  if (k) previewCache.set(k, { blob, url: u, revoke });
                  lastPreviewFinalApplied = true; working = false;
                  activeJobs.delete(data.jobId);
                  try { const sid = sendStatsJob(workerState, blob, k); lastStatsJob = sid; pendingStats.set(sid, k); } catch {}
                  
                  const p = parseParamsFromKey(k);
                  dispatch('update', { blob, pixelSize: p.pixelSize, method: p.method, ditherMethod: p.ditherMethod, ditherLevels: p.ditherLevels });
                } catch {}
              }, 'image/png');
            }
          } catch {}
        },
        onStats: (data) => {
          try {
            if (data.type === 'stats-done') {
              if (data.jobId !== lastStatsJob) { return; }
              const st = data.stats || {};
              outW = st.w|0; outH = st.h|0; opaqueCount = st.opaque|0; colorCount = st.colors|0;
              const k = data.key;
              if (k) { const pc = previewCache.get(k); if (pc) pc.stats = { w: outW, h: outH, opaque: opaqueCount, colors: colorCount }; }
              pendingStats.delete(data.jobId);
            }
          } catch {}
        },
        onPreviewDone: (data) => {
          if (data.jobId !== lastPreviewJob) { try { console.debug('[wph] worker preview-done (stale)', data.jobId); } catch {} return; }
          try { console.debug('[wph] worker preview-done', data.jobId); } catch {}
          
          
          try {
            if (workerState && workerState.workerReady && !workerState.workerLimited) {
              return;
            }
          } catch {}
          setTimeout(() => {
            if (data.jobId !== lastPreviewJob || lastPreviewFinalApplied) return;
            (async () => {
              try {
                const customKeyNow = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
                const customDitherKeyNow = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';
                const ccKey3 = colorCorrectionEnabled ? `|cc:1|b:${brightness}|c:${contrast}|s:${saturation}|h:${hue}` : '|cc:0';
                const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKeyNow}`:''}${ditherMethod==='custom'?`|cp:${customDitherKeyNow}`:''}${ccKey3}`;
                const out = await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices, colorCorrectionEnabled, brightness, contrast, saturation, hue);
                const obj = await blobToObjectUrl(out);
                previewUrl = obj.url;
                if (workerReady && workerState && workerState.imageWorker) {
                  previewCache.set(key, { blob: out, url: obj.url, revoke: obj.revoke });
                  try { const sid = sendStatsJob(workerState, out, key); lastStatsJob = sid; pendingStats.set(sid, key); } catch {}
                  outW = outH = opaqueCount = colorCount = 0;
                } else {
                  const stats = await computeStatsForBlob(out);
                  outW = stats.w; outH = stats.h; opaqueCount = stats.opaque; colorCount = stats.colors;
                  previewCache.set(key, { blob: out, url: obj.url, revoke: obj.revoke, stats });
                }
                lastPreviewFinalApplied = true; working = false;
                activeJobs.delete(data.jobId);
                const p = parseParamsFromKey(key);
                dispatch('update', { blob: out, pixelSize: p.pixelSize, method: p.method, ditherMethod: p.ditherMethod, ditherLevels: p.ditherLevels });
              } catch (_e) {
                try { console.warn('[wph] fallback final failed:', _e); } catch {}
                working = false;
              }
            })();
          }, 64);
        }
      });
      
      imageWorker = workerState.imageWorker;
      imageWorkerPool = workerState.imageWorkerPool;
      poolSize = workerState.poolSize;
      poolReadyCount = 0;
      try { console.debug(`[wph] hardware: ${navigator.hardwareConcurrency || 4} cores, selected ${poolSize} workers`); } catch {}
    } catch {}
  }

  function destroyImageWorkerLocal() {
    try {
      if (workerState) {
        try { cancelAllJobs(workerState); } catch {}
        destroyImageWorkers(workerState);
        workerState = null;
      }
      workerReady = false;
      poolReadyCount = 0;
      activeJobs.clear();
      imageWorkerPool = [];
      poolSize = 0;
      if (quickPreviewRevoke) { try { quickPreviewRevoke(); } catch {} quickPreviewRevoke = null; }
      quickPreviewUrl = '';
      imageWorker = null;
      imageWorkerUrl = '';
    } catch {}
  }

  function cancelPreviousJobsLocal() {
    try {
      if (workerState) cancelAllJobs(workerState);
      activeJobs.clear();
    } catch {}
  }

  
  let showCancelFab = false;
  let cancelHideTimer = null;
  function onApplyHoverEnter() { if (!editMode) return; if (cancelHideTimer) { clearTimeout(cancelHideTimer); cancelHideTimer = null; } showCancelFab = true; }
  function onApplyHoverLeave() { if (!editMode) return; if (cancelHideTimer) clearTimeout(cancelHideTimer); cancelHideTimer = setTimeout(() => { showCancelFab = false; cancelHideTimer = null; }, 350); }
  function onCancelHoverEnter() { if (!editMode) return; if (cancelHideTimer) { clearTimeout(cancelHideTimer); cancelHideTimer = null; } showCancelFab = true; }
  function onCancelHoverLeave() { if (!editMode) return; if (cancelHideTimer) clearTimeout(cancelHideTimer); cancelHideTimer = setTimeout(() => { showCancelFab = false; cancelHideTimer = null; }, 250); }

  
  let editMode = false;
  let activeTool = 'brush'; 
  let prevTool = 'brush';
  
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
  
  
  let brightness = 0;    
  let contrast = 0;      
  let saturation = 0;    
  let hue = 0;           
  let colorCorrectionEnabled = false; 
  
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
  let hoverBrushBtn = false;
  let hoverEraserBtn = false;
  let hoverSelectBtn = false;
  let hoverMagicBtn = false;
  let hoverGradientBtn = false;
  let showGradientModes = false;
  let gradientModesHideTimer = null;
  
  let magicMode = 'local';
  let showMagicModes = false;
  let magicModesHideTimer = null;
  function openMagicModes() {
    if (magicModesHideTimer) { try { clearTimeout(magicModesHideTimer); } catch {} magicModesHideTimer = null; }
    showMagicModes = true;
  }
  function closeMagicModesSoon(delay = 350) {
    if (magicModesHideTimer) { try { clearTimeout(magicModesHideTimer); } catch {} }
    magicModesHideTimer = setTimeout(() => { showMagicModes = false; magicModesHideTimer = null; }, delay);
  }
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
    try { panelScrollTop = panelRef ? (panelRef.scrollTop || 0) : 0; } catch {}
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
  
  
  function resetSelectionNoHistory() {
    selStartX = -1; selStartY = -1; selEndX = -1; selEndY = -1;
    selectionMode = false;
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
  function startEyedropper() {
    
    prevTool = activeTool;
    activeTool = 'eyedropper';
    if (!editMode) {
      editMode = true;
      startPanelLockAnimation();
    }
  }
  function cancelEdit() {
    if (!editMode) return;
    
    editMode = false;
    activeTool = 'brush';
    zoom = 1; panX = 0; panY = 0;
    undoStack = []; redoStack = []; hasEdits = false;
    
    resetSelectionNoHistory();
    drawOverlay(-1, -1);
    layoutStage();
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
  
  
  let smoothDrawingState = createSmoothDrawingState(); 
  
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
  
  
  let selStartX = -1, selStartY = -1, selEndX = -1, selEndY = -1;
  let selectionMode = false;
  
  let showInfo = false;

  
  let zoomPanelOpen = false;      
  let zoomPanelHover = false;     
  let zoomPanelHideTimer = null;
  function openZoomPanel() {
    try { if (zoomPanelHideTimer) { clearTimeout(zoomPanelHideTimer); zoomPanelHideTimer = null; } } catch {}
    zoomPanelOpen = true;
  }
  function closeZoomPanelSoon(delay = 1400) {
    try { if (zoomPanelHideTimer) clearTimeout(zoomPanelHideTimer); } catch {}
    zoomPanelHideTimer = setTimeout(() => { zoomPanelOpen = false; zoomPanelHideTimer = null; }, Math.max(0, delay|0));
  }

  function getDisplayMetricsLocal() {
    return getDisplayMetrics(outputBox, outW, outH, zoom, editMode);
  }

  
  
  
  function createMouseEventParams() {
    return {
      
      editMode,
      stickerMode,
      activeTool,
      prevTool,
      
      
      isDrawing,
      isPanning,
      isSelecting,
      isSizing,
      stickerDragging: stickerState.dragging || false,
      gradientDragging,
      isPatternDragging,
      
      
      hoverPx,
      hoverPy,
      panX,
      panY,
      panStartPointerX,
      panStartPointerY,
      panStartX,
      panStartY,
      
      
      brushSize,
      eraserSize,
      selectSize,
      magicTolerance,
      
      
      gradStartPx,
      gradStartPy,
      gradEndPx,
      gradEndPy,
      
      
      outW,
      outH,
      
      allowedColors,
      
      
      sizeFrozenPx,
      sizeFrozenPy,
      sizeStartY,
      sizeStartValue,
      
      
      customDitherPattern,
      patternDragValue,
      
      
      stickerState,
      stickerCanvas: stickerState.canvas,
      
      
      outputBox,
      overlayCanvas,
      editCanvas,
      
      
      selectionStrokeTiles,
      selectionAntsCanvas,
      selectionReplaceCleared,
      selectionCount,
      
      
      undoStack,
      redoStack,
      
      
      screenToPixelLocal,
      getDisplayMetricsLocal,
      layoutStage,
      drawOverlay,
      paintAt,
      updateStickerPosition,
      startStickerDrag,
      stopStickerDrag,
      applySelectionAt,
      applyMagicSelection,
      applyGradient,
      finalizeStroke,
      clampSize,
      clampTolerance: (v) => Math.max(0, Math.min(100, Math.round(v))),
      copySelectionRect,
      rebuildSelectionAnts,
      
      
      startSmoothStroke,
      addSmoothPoint,
      completeSmoothStroke,
      cancelSmoothStroke,
      hasActiveStroke: () => hasActiveStroke(smoothDrawingState),
      hasBufferedChanges: () => hasBufferedChanges(smoothDrawingState),
      getUndoData: () => getUndoData(smoothDrawingState),
      clearUndoData: () => clearUndoData(smoothDrawingState),
      
      
      setState: (updates) => {
        if (updates.hoverPx !== undefined) hoverPx = updates.hoverPx;
        if (updates.hoverPy !== undefined) hoverPy = updates.hoverPy;
        if (updates.isDrawing !== undefined) isDrawing = updates.isDrawing;
        if (updates.isPanning !== undefined) isPanning = updates.isPanning;
        if (updates.isSelecting !== undefined) isSelecting = updates.isSelecting;
        if (updates.isSizing !== undefined) isSizing = updates.isSizing;
        if (updates.gradientDragging !== undefined) gradientDragging = updates.gradientDragging;
        if (updates.isPatternDragging !== undefined) isPatternDragging = updates.isPatternDragging;
        if (updates.activeTool !== undefined) activeTool = updates.activeTool;
        if (updates.prevTool !== undefined) prevTool = updates.prevTool;
        if (updates.panX !== undefined) panX = updates.panX;
        if (updates.panY !== undefined) panY = updates.panY;
        if (updates.brushSize !== undefined) brushSize = updates.brushSize;
        if (updates.eraserSize !== undefined) eraserSize = updates.eraserSize;
        if (updates.selectSize !== undefined) selectSize = updates.selectSize;
        if (updates.magicTolerance !== undefined) magicTolerance = updates.magicTolerance;
        if (updates.brushColorRGB !== undefined) brushColorRGB = updates.brushColorRGB;
        if (updates.gradientColorA !== undefined) gradientColorA = updates.gradientColorA;
        if (updates.gradientColorB !== undefined) gradientColorB = updates.gradientColorB;
        if (updates.gradStartPx !== undefined) gradStartPx = updates.gradStartPx;
        if (updates.gradStartPy !== undefined) gradStartPy = updates.gradStartPy;
        if (updates.gradEndPx !== undefined) gradEndPx = updates.gradEndPx;
        if (updates.gradEndPy !== undefined) gradEndPy = updates.gradEndPy;
        if (updates.sizeFrozenPx !== undefined) sizeFrozenPx = updates.sizeFrozenPx;
        if (updates.sizeFrozenPy !== undefined) sizeFrozenPy = updates.sizeFrozenPy;
        if (updates.sizeStartY !== undefined) sizeStartY = updates.sizeStartY;
        if (updates.sizeStartValue !== undefined) sizeStartValue = updates.sizeStartValue;
        if (updates.selectionAntsCanvas !== undefined) selectionAntsCanvas = updates.selectionAntsCanvas;
        if (updates.selectionReplaceCleared !== undefined) selectionReplaceCleared = updates.selectionReplaceCleared;
        if (updates.patternDragValue !== undefined) patternDragValue = updates.patternDragValue;
        if (updates.stickerState !== undefined) stickerState = updates.stickerState;
        if (updates.customDitherPattern !== undefined) customDitherPattern = updates.customDitherPattern;
        if (updates.panStartPointerX !== undefined) panStartPointerX = updates.panStartPointerX;
        if (updates.panStartPointerY !== undefined) panStartPointerY = updates.panStartPointerY;
        if (updates.panStartX !== undefined) panStartX = updates.panStartX;
        if (updates.panStartY !== undefined) panStartY = updates.panStartY;
        if (updates.stickerDragging !== undefined) {
          
          if (updates.stickerDragging !== stickerState.dragging) {
            stickerState = { ...stickerState, dragging: updates.stickerDragging };
          }
        }
      }
    };
  }

  
  let sizingContext = {
    active: false,
    frozenPx: -1,
    frozenPy: -1,
    startY: 0,
    startValue: 0
  };

  
  function createKeyboardEventParams() {
    
    const setStateLocal = (updates) => {
      if (updates.showInfo !== undefined) showInfo = updates.showInfo;
      if (updates.activeTool !== undefined) activeTool = updates.activeTool;
      if (updates.prevTool !== undefined) prevTool = updates.prevTool;
      
    };
    
    return {
      editMode,
      showInfo,
      activeTool,
      hoverPx,
      hoverPy,
      redoOnce,
      undoOnce,
      clearSelection,
      invertSelection,
      drawOverlay,
      setState: setStateLocal
    };
  }

  
  function createWheelEventParams() {
    
    const setStateLocal = (updates) => {
      if (updates.isDrawing !== undefined) isDrawing = updates.isDrawing;
      if (updates.brushSize !== undefined) brushSize = updates.brushSize;
      if (updates.eraserSize !== undefined) eraserSize = updates.eraserSize;
      if (updates.selectSize !== undefined) selectSize = updates.selectSize;
      if (updates.magicTolerance !== undefined) magicTolerance = updates.magicTolerance;
      if (updates.magicHintUntil !== undefined) magicHintUntil = updates.magicHintUntil;
      if (updates.zoom !== undefined) {
        zoom = updates.zoom;
        
        openZoomPanel();
        closeZoomPanelSoon(1500);
      }
      if (updates.panX !== undefined) panX = updates.panX;
      if (updates.panY !== undefined) panY = updates.panY;
    };
    
    return {
      editMode,
      stickerMode,
      activeTool,
      isDrawing,
      brushSize,
      eraserSize,
      selectSize,
      magicTolerance,
      magicHintUntil,
      zoom,
      panX,
      panY,
      hoverPx,
      hoverPy,
      outputBox,
      clampSize,
      clampTolerance,
      getDisplayMetricsLocal,
      layoutStage,
      drawOverlay,
      setState: setStateLocal
    };
  }

  
  function onStageMouseMoveWrapper(e) {
    const params = createMouseEventParams();
    
    params.sizingContext = sizingContext;
    return createStageMouseMoveHandler(params)(e);
  }
  
  function onStageMouseLeaveWrapper() {
    const params = createMouseEventParams();
    params.sizingContext = sizingContext;
    return createStageMouseLeaveHandler(params)();
  }
  
  function onStageMouseDownWrapper(e) {
    const params = createMouseEventParams();
    params.sizingContext = sizingContext;
    return createStageMouseDownHandler(params)(e);
  }
  
  function onStageMouseUpWrapper() {
    const params = createMouseEventParams();
    params.sizingContext = sizingContext;
    return createStageMouseUpHandler(params)();
  }
  
  function onWindowMouseUpWrapper() {
    const params = createMouseEventParams();
    params.sizingContext = sizingContext;
    return createWindowMouseUpHandler(params)();
  }
  function onWindowMouseMoveWrapper(e) {
    if (!(isDrawing || isPanning || isSelecting || gradientDragging || (stickerMode && (stickerState.dragging || false)))) return;
    if (outputBox && e && e.target && outputBox.contains(e.target)) return;
    const params = createMouseEventParams();
    params.sizingContext = sizingContext;
    return createStageMouseMoveHandler(params)(e);
  }
  
  function startPatternDragWrapper(y, x, e) {
    return createStartPatternDragHandler(createMouseEventParams())(y, x, e);
  }
  
  function movePatternDragWrapper(y, x, e) {
    return createMovePatternDragHandler(createMouseEventParams())(y, x, e);
  }

  
  function onWindowKeyDownWrapper(e) {
    
    if ((e.code === 'Escape' || e.key === 'Escape') && $isModalOpen) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    return createWindowKeyDownHandler(createKeyboardEventParams())(e);
  }

  function onBackdropKeyDownWrapper(e) {
    
    if ((e.code === 'Escape' || e.key === 'Escape') && $isModalOpen) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    return createBackdropKeyDownHandler(() => close())(e);
  }

  function createPresetKeyDownWrapper(presetApplyCallback) {
    return createButtonKeyDownHandler(presetApplyCallback);
  }

  
  function onGlobalWheelWrapper(e) {
    return createGlobalWheelHandler(createWheelEventParams())(e);
  }

  function onStageWheelWrapper(e) {
    return createStageWheelHandler(createWheelEventParams())(e);
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
    const m = getDisplayMetricsLocal();
    if (!m) return;
    
    const ov = overlayCanvas;
    const ec = editCanvas;
    if (!ov || !ec) return;
    
    const box = outputBox?.getBoundingClientRect();
    const vw = Math.max(1, Math.floor(box?.width || 0));
    const vh = Math.max(1, Math.floor(box?.height || 0));
    const dpr = (window.devicePixelRatio || 1);
    ov.width = Math.max(1, Math.floor(vw * dpr));
    ov.height = Math.max(1, Math.floor(vh * dpr));
    ov.style.left = '0px';
    ov.style.top = '0px';
    ov.style.width = vw + 'px'; ov.style.height = vh + 'px';
    
    const oxi = Math.round(m.ox);
    const oyi = Math.round(m.oy);
    ec.style.left = oxi + 'px';
    ec.style.top = oyi + 'px';
    ec.style.width = m.dw + 'px'; ec.style.height = m.dh + 'px';
    
    const tx = editMode ? panX : 0;
    const ty = editMode ? panY : 0;
    
    ec.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(ty)}px, 0)`;
  }

  
  $: zoomPercent = Math.round(Math.max(0.01, zoom) * 100);
  
  $: zoomPercentText = (() => {
    try {
      if (!Number.isFinite(zoomPercent)) return '100%';
      const p = Math.max(0, zoomPercent|0);
      if (p >= 1_000_000) return Math.round(p / 1_000_000) + 'M%';
      if (p >= 10_000) return Math.round(p / 1_000) + 'k%';
      return String(p) + '%';
    } catch { return String(zoomPercent) + '%'; }
  })();
  
  $: zoomFontSize = (() => {
    const raw = String(zoomPercent);
    const len = raw.length + 1; 
    if (len <= 3) return 11;    
    if (len <= 4) return 9;    
    if (len <= 5) return 8;     
    if (len <= 6) return 7;     
    return 8;                   
  })();
  function zoomTo(newZoom, focusX = -1, focusY = -1) {
    try {
      if (!outputBox || !outW || !outH) return;
      const oldM = getDisplayMetricsLocal();
      const nz = Math.max(0.05, Math.min(32, newZoom));
      
      const box = outputBox.getBoundingClientRect();
      const cx = (focusX >= 0 ? focusX : (box.width / 2));
      const cy = (focusY >= 0 ? focusY : (box.height / 2));
      const newM = getDisplayMetrics(outputBox, outW, outH, nz, true);
      if (oldM && newM) {
        const pan = calculateZoomPan(cx, cy, oldM, newM);
        zoom = nz;
        panX = pan.panX;
        panY = pan.panY;
      } else {
        zoom = nz; panX = 0; panY = 0;
      }
      layoutStage();
      drawOverlay(hoverPx, hoverPy);
      
      openZoomPanel();
      closeZoomPanelSoon(1500);
    } catch {}
  }
  function zoomIn() { zoomTo(zoom * 1.25); }
  function zoomOut() { zoomTo(zoom / 1.25); }
  function resetView() { zoom = 1; panX = 0; panY = 0; layoutStage(); drawOverlay(hoverPx, hoverPy); }

  function screenToPixelLocal(clientX, clientY) {
    const boxRect = outputBox?.getBoundingClientRect();
    const ecRect = editCanvas?.getBoundingClientRect();
    if (!boxRect || !ecRect || !outW || !outH) return { px: -1, py: -1 };
    const x = clientX - boxRect.left;
    const y = clientY - boxRect.top;
    const imgLeft = ecRect.left - boxRect.left;
    const imgTop = ecRect.top - boxRect.top;
    const displayW = ecRect.width;
    const displayH = ecRect.height;
    
    
    
    
    const scaleCss = displayW / outW;
    const px = Math.floor((x - imgLeft) / scaleCss);
    const py = Math.floor((y - imgTop) / scaleCss);
    return { px, py };
  }

  let overlayThrottleState = {
    rafId: null,
    pending: false,
    lastTime: 0,
    pendingPx: -1,
    pendingPy: -1
  };
  const OVERLAY_FRAME_INTERVAL = 1000 / 144;

  function drawOverlayThrottled(px, py) {
    overlayThrottleState.pendingPx = px;
    overlayThrottleState.pendingPy = py;
    
    if (overlayThrottleState.rafId !== null) {
      overlayThrottleState.pending = true;
      return;
    }
    
    const now = performance.now ? performance.now() : Date.now();
    const elapsed = now - overlayThrottleState.lastTime;
    
    if (elapsed >= OVERLAY_FRAME_INTERVAL) {
      overlayThrottleState.lastTime = now;
      drawOverlayImmediate(px, py);
    } else {
      overlayThrottleState.pending = true;
      overlayThrottleState.rafId = requestAnimationFrame(() => {
        overlayThrottleState.rafId = null;
        const nextNow = performance.now ? performance.now() : Date.now();
        overlayThrottleState.lastTime = nextNow;
        
        if (overlayThrottleState.pending) {
          overlayThrottleState.pending = false;
          drawOverlayImmediate(overlayThrottleState.pendingPx, overlayThrottleState.pendingPy);
        }
      });
    }
  }

  function drawOverlay(px, py) {
    drawOverlayThrottled(px, py);
  }

  function drawOverlayImmediate(px, py) {
    const m = getDisplayMetricsLocal();
    if (!m) return;
    const ctx = overlayCanvas.getContext('2d');
    const size = activeTool === 'brush' ? brushSize : (activeTool === 'eraser' ? eraserSize : (activeTool === 'select' ? selectSize : undefined));
    
    
    const box = outputBox?.getBoundingClientRect();
    const vw = Math.max(1, Math.floor(box?.width || 0));
    const vh = Math.max(1, Math.floor(box?.height || 0));
    const dpr = (window.devicePixelRatio || 1);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    const boxRect = outputBox?.getBoundingClientRect();
    const ecRect = editCanvas?.getBoundingClientRect();
    const imgLeft = (ecRect && boxRect) ? (ecRect.left - boxRect.left) : (m.ox + (editMode ? panX : 0));
    const imgTop = (ecRect && boxRect) ? (ecRect.top - boxRect.top) : (m.oy + (editMode ? panY : 0));
    const displayW = (ecRect?.width || m.dw);
    const displayH = (ecRect?.height || m.dh);
    const imgRight = imgLeft + displayW;
    const imgBottom = imgTop + displayH;
    const viewLeft = 0, viewTop = 0, viewRight = vw, viewBottom = vh;
    const visLeft = Math.max(viewLeft, imgLeft);
    const visTop = Math.max(viewTop, imgTop);
    const visRight = Math.min(viewRight, imgRight);
    const visBottom = Math.min(viewBottom, imgBottom);
    
    function drawImageMapped(canvas, globalAlpha = 1) {
      if (!canvas) return;
      ctx.save();
      ctx.globalAlpha = globalAlpha;
      ctx.imageSmoothingEnabled = false;
      try { ctx.drawImage(canvas, 0, 0, outW, outH, imgLeft, imgTop, displayW, displayH); } catch {}
      ctx.restore();
    }
    function drawImageMappedMasked(canvas, maskCanvas) {
      if (!canvas || !maskCanvas) return;
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.floor(displayW));
      off.height = Math.max(1, Math.floor(displayH));
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) { drawImageMapped(canvas, 1); return; }
      octx.imageSmoothingEnabled = false;
      try { octx.drawImage(canvas, 0, 0, outW, outH, 0, 0, displayW, displayH); } catch {}
      octx.globalCompositeOperation = 'destination-in';
      try { octx.drawImage(maskCanvas, 0, 0, outW, outH, 0, 0, displayW, displayH); } catch {}
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      try { ctx.drawImage(off, Math.round(imgLeft), Math.round(imgTop)); } catch {}
      ctx.restore();
    }
    
    
    if (activeTool === 'brush' && hasActiveStroke(smoothDrawingState) && hasBufferedChanges(smoothDrawingState)) {
      const bufferCanvas = getBufferCanvas(smoothDrawingState);
      if (bufferCanvas && outW && outH) {
        if (selectionCount > 0 && selectionVisCanvas) {
          drawImageMappedMasked(bufferCanvas, selectionVisCanvas);
        } else {
          drawImageMapped(bufferCanvas, 1);
        }
      }
    }
    
    
    if (activeTool === 'eraser' && hasActiveStroke(smoothDrawingState)) {
      const ghostCanvas = getEraserGhostCanvas(smoothDrawingState);
      if (ghostCanvas && outW && outH) {
        if (selectionCount > 0 && selectionVisCanvas) {
          drawImageMappedMasked(ghostCanvas, selectionVisCanvas);
        } else {
          drawImageMapped(ghostCanvas, 1);
        }
      }
    }
    
    if (stickerMode && stickerCanvas && outW && outH) {
      const s = displayW / outW;
      const dx = Math.round(stickerX * s + imgLeft);
      const dy = Math.round(stickerY * s + imgTop);
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
        drawImageMapped(selectionVisCanvas, 0.28);
      } else {
        if (!selectionAntsCanvas) rebuildSelectionAnts();
        if (selectionAntsCanvas) drawImageMapped(selectionAntsCanvas, 0.8);
      }
    }
    
    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'select') {
      ctx.save();
      ctx.translate(imgLeft, imgTop);
      const mAdj = { ...m, scale: (displayW / outW), dw: displayW, dh: displayH };
      let ringColor = (activeTool === 'brush') ? brushColorCss : undefined;
      
      drawOverlayForTool(ctx, mAdj, px, py, activeTool, size, ringColor);
      ctx.restore();
    }
    
    
    if (activeTool === 'gradient' && gradientDragging) {
      ctx.save();
      ctx.translate(imgLeft, imgTop);
      
      drawGradientPreviewOverlay(ctx, (displayW / outW), gradStartPx, gradStartPy, gradEndPx, gradEndPy, gradientColorA, gradientColorB);
      ctx.restore();
    }
    
    if (activeTool === 'magic' && px >= 0 && py >= 0 && (isSizing || ((performance.now ? performance.now() : Date.now()) <= magicHintUntil))) {
      const s = (displayW / outW);
      const dx = (px * s + imgLeft + 8);
      const dy = (py * s + imgTop + 8);
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
      ctx.drawImage(
        stickerCanvas,
        0, 0, stickerW, stickerH,
        Math.round(stickerX * s + imgLeft),
        Math.round(stickerY * s + imgTop),
        Math.round(stickerW * s),
        Math.round(stickerH * s)
      );
      ctx.restore();
    }
  }

  function rebuildSelectionAnts() {
    if (!selectionMask || selectionCount === 0) { selectionAntsCanvas = null; selectionAntsCtx = null; return; }
    const c = buildSelectionAntsCanvas(selectionMask, outW, outH);
    selectionAntsCanvas = c;
    selectionAntsCtx = c.getContext('2d');
  }

  
  function startSmoothStroke(px, py) {
    if (!editCanvas || !outW || !outH) return;
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;
    
    const size = activeTool === 'brush' ? brushSize : eraserSize;
    const color = activeTool === 'brush' ? brushColorCss : 'rgba(0,0,0,0)';
    
    startStroke(smoothDrawingState, { x: px, y: py }, editCanvas, outW, outH, activeTool, size, color);
    hasEdits = true;
  }
  
  function addSmoothPoint(px, py) {
    if (!hasActiveStroke(smoothDrawingState)) return;
    
    const size = activeTool === 'brush' ? brushSize : eraserSize;
    const color = activeTool === 'brush' ? brushColorCss : 'rgba(0,0,0,0)';
    
    addPointToStroke(smoothDrawingState, { x: px, y: py }, activeTool, size, color);
    
    drawOverlay(px, py);
  }
  
  function completeSmoothStroke() {
    if (!hasActiveStroke(smoothDrawingState) || !editCanvas) return;
    
    
    finishStroke(
      smoothDrawingState,
      editCanvas,
      (selectionMask && selectionCount > 0) ? selectionMask : null,
      outW,
      outH
    );
    
    
    finalizeStrokeForUndo();
  }
  
  function cancelSmoothStroke() {
    if (hasActiveStroke(smoothDrawingState)) {
      cancelStroke(smoothDrawingState);
    }
  }

  
  function paintAt(px, py) {
    if (!editCanvas) return;
    
    
    if ((activeTool === 'brush' || activeTool === 'eraser') && hasActiveStroke(smoothDrawingState)) {
      addSmoothPoint(px, py);
      return;
    }
    
    
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
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

  function finalizeStroke() {
    if (!editCanvas) return;
    if (!strokeTiles.size) return;
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
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
  
  
  function finalizeStrokeForUndo() {
    if (!editCanvas || !outW || !outH) return;
    
    
    const undoData = getUndoData(smoothDrawingState);
    if (!undoData.before || !undoData.area) {
      clearUndoData(smoothDrawingState);
      return;
    }
    
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
    const tiles = [];
    
    try {
      
      const after = ctx.getImageData(
        undoData.area.x, 
        undoData.area.y, 
        undoData.area.w, 
        undoData.area.h
      );
      
      if (after) {
        tiles.push({ 
          x: undoData.area.x, 
          y: undoData.area.y, 
          w: undoData.area.w, 
          h: undoData.area.h, 
          before: undoData.before,
          after 
        });
      }
    } catch (e) {
      console.warn('Ошибка при создании undo tile:', e);
    }
    
    if (tiles.length) {
      undoStack.push({ tiles });
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }
    
    
    clearUndoData(smoothDrawingState);
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
    
    setTimeout(() => {
      (async () => {
        let region;
        const canWorker = workerState && workerReady && workerState.imageWorker && !workerLimited;
        if (canWorker && typeof createImageBitmap === 'function') {
          try {
            const bmp = await createImageBitmap(editCanvas);
            region = await sendMagicSelectionJobBitmap(workerState, {
              bitmap: bmp,
              seedX: px,
              seedY: py,
              tolerance: (magicTolerance | 0),
              mode: magicMode === 'global' ? 'global' : 'local'
            });
          } catch (_ep) {
            try {
              const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
              const img = ctx.getImageData(0, 0, outW, outH);
              const pixels = new Uint8ClampedArray(img.data);
              region = await sendMagicSelectionJob(workerState, {
                pixels,
                width: outW,
                height: outH,
                seedX: px,
                seedY: py,
                tolerance: (magicTolerance | 0),
                mode: magicMode === 'global' ? 'global' : 'local'
              });
            } catch (_ep2) {
              const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
              let img; try { img = ctx.getImageData(0, 0, outW, outH); } catch { return; }
              region = (magicMode === 'global')
                ? computeMagicRegionGlobal(img, outW, outH, px, py, (magicTolerance | 0))
                : computeMagicRegion(img, outW, outH, px, py, (magicTolerance | 0));
            }
          }
        } else {
          const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
          let img; try { img = ctx.getImageData(0, 0, outW, outH); } catch { return; }
          region = (magicMode === 'global')
            ? computeMagicRegionGlobal(img, outW, outH, px, py, (magicTolerance | 0))
            : computeMagicRegion(img, outW, outH, px, py, (magicTolerance | 0));
        }
        const res = applyMagicSelectionOnMask(region, selectionMask, outW, outH, op, TILE_SIZE);
        selectionCount += res.delta;
        if (selectionVisCtx) refreshSelectionVisFromMask();
        undoStack.push({ selTiles: res.tiles });
        if (undoStack.length > 100) undoStack.shift();
        redoStack.length = 0;
        if (selectionCount > 0) rebuildSelectionAnts(); else selectionAntsCanvas = null;
        drawOverlay(hoverPx, hoverPy);
      })();
    }, 0);
  }


  function undoOnce() {
    if (!editCanvas || !undoStack.length) return;
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
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
    const ctx = editCanvas.getContext('2d', { willReadFrequently: true });
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
      const customKeyNow = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
      const customDitherKeyNow = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';
      const ccKey = colorCorrectionEnabled ? `|cc:1|b:${brightness}|c:${contrast}|s:${saturation}|h:${hue}` : '|cc:0';
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKeyNow}`:''}${ditherMethod==='custom'?`|cp:${customDitherKeyNow}`:''}${ccKey}`;
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
          case 'bayer2': return 'b2';
          case 'bayer4': return 'b4';
          case 'bayer8': return 'b8';
          case 'floyd': return 'fs';
          case 'atkinson': return 'at';
          case 'random': return 'rnd';
          case 'custom': return 'ct';
          default: return String(dm || 'n');
        }
      };
      const paletteCode = (pm) => pm === 'full' ? 'F' : (pm === 'free' ? 'f' : 'C');
      const base = getBaseName();
      const suffix = `${pixelSize}${ditherCode(ditherMethod)}${ditherLevels}${paletteCode(paletteMode)}${outlineThickness}${erodeAmount}`;
      const filename = `${base}_${suffix}.png`;
      if (cached?.blob) { downloadBlob(cached.blob, filename); return; }
      
      resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices, colorCorrectionEnabled, brightness, contrast, saturation, hue)
        .then((blob) => downloadBlob(blob, filename))
        .catch(() => {});
    } catch {}
  }

  $: if (editMode && previewUrl && outW && outH && editCanvas && overlayCanvas) {
    ensureEditSurface();
  }

  
  
  
  const previewCache = createPreviewCache();
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

  let queuedPreview = false;
  let updateDebounceTimer = null;
  function schedulePreviewUpdate(delay = 280) {
    try {
      if (!open || !file) return;
      if (updateDebounceTimer) { clearTimeout(updateDebounceTimer); updateDebounceTimer = null; }
      updateDebounceTimer = setTimeout(() => {
        updateDebounceTimer = null;
        updatePreview();
      }, Math.max(0, delay|0));
    } catch {}
  }
  
  function parseParamsFromKey(k) {
    try {
      const parts = String(k || '').split('|');
      const out = {
        pixelSize: pixelSize,
        method: method,
        ditherMethod: ditherMethod,
        ditherLevels: ditherLevels,
        paletteMode: paletteMode,
        outlineThickness: outlineThickness,
        erodeAmount: erodeAmount
      };
      for (const p of parts) {
        if (p.startsWith('ps:')) out.pixelSize = Math.max(1, parseFloat(p.slice(3)) || 1);
        else if (p.startsWith('m:')) out.method = p.slice(2);
        else if (p.startsWith('dm:')) out.ditherMethod = p.slice(3);
        else if (p.startsWith('dl:')) {
          const dl = parseFloat(p.slice(3));
          out.ditherLevels = Math.max(2, Math.min(10, isNaN(dl) ? 4 : dl));
        }
        else if (p.startsWith('pm:')) out.paletteMode = p.slice(3);
        else if (p.startsWith('o:')) out.outlineThickness = Math.max(0, parseInt(p.slice(2)) || 0);
        else if (p.startsWith('e:')) out.erodeAmount = Math.max(0, parseInt(p.slice(2)) || 0);
      }
      return out;
    } catch {
      return { pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount };
    }
  }
  async function updatePreview() {
    if (!open || !file) return;
    if (working) {
      if (workerReady && imageWorker && !workerLimited) {
        
        const provisionalId = jobSeq + 1;
        lastPreviewJob = provisionalId;
        lastPreviewFinalApplied = false;
        cancelPreviousJobs();
        
        working = false;
      } else {
        queuedPreview = true; 
        return; 
      }
    }
    working = true;
    try {
      try {
        const f = Math.max(1, Number(pixelSize) || 1);
        if (originalDims && originalDims.w && originalDims.h) {
          outW = Math.max(1, Math.floor(originalDims.w / f));
          outH = Math.max(1, Math.floor(originalDims.h / f));
        }
      } catch {}
      const customKeyNow = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
      const customDitherKeyNow = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';
      const ccKey5 = colorCorrectionEnabled ? `|cc:1|b:${brightness}|c:${contrast}|s:${saturation}|h:${hue}` : '|cc:0';
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKeyNow}`:''}${ditherMethod==='custom'?`|cp:${customDitherKeyNow}`:''}${ccKey5}`;
      const cached = previewCache.get(key);
      if (cached) {
        
        previewUrl = cached.url;
        if (cached.stats) {
          outW = cached.stats.w; outH = cached.stats.h; opaqueCount = cached.stats.opaque; colorCount = cached.stats.colors;
        } else {
          if (workerReady && imageWorker && !workerLimited) {
            jobSeq++; const sid = jobSeq; lastStatsJob = sid; pendingStats.set(sid, key);
            try { imageWorker.postMessage({ type: 'stats', jobId: sid, key, blob: cached.blob }); } catch {}
            outW = outH = opaqueCount = colorCount = 0;
          } else {
            const stats = await computeStatsForBlob(cached.blob);
            outW = stats.w; outH = stats.h; opaqueCount = stats.opaque; colorCount = stats.colors;
            cached.stats = stats;
          }
        }
        lastPreviewFinalApplied = true;
        dispatch('update', { blob: cached.blob, pixelSize, method, ditherMethod, ditherLevels });
      } else {
        if (workerReady && imageWorker && !workerLimited) {
          
          cancelPreviousJobsLocal();
          try {
            const jid = sendPreviewJob(workerState, {
              blob: file,
              pixelSize: Math.max(1, Number(pixelSize) || 1),
              method,
              ditherMethod,
              ditherLevels,
              paletteMode,
              outlineThickness: outlineThickness|0 || 0,
              erodeAmount: erodeAmount|0 || 0,
              customIndices: (paletteMode === 'custom') ? (customIndices || []) : [],
              palette: allowedColors || [],
              key,
              colorCorrectionEnabled,
              brightness: brightness|0 || 0,
              contrast: contrast|0 || 0,
              saturation: saturation|0 || 0,
              hue: hue|0 || 0
            });
            lastPreviewJob = jid; lastPreviewFinalApplied = false;
            jobSeq = Math.max(jobSeq, jid);
            activeJobs.add(jid);
            try { console.debug('[wph] dispatch preview job', jid); } catch {}
            try { console.debug('[wph] activeJobs add', jid, 'total', activeJobs.size); } catch {}
          } catch {}
          
        } else {
          
          const fallbackReason = workerLimited ? 'worker capabilities limited' : 'worker not ready';
          try { console.debug('[wph] fallback to CPU processing:', fallbackReason); } catch {}
          
          const out = await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices, colorCorrectionEnabled, brightness, contrast, saturation, hue);
          const obj = await blobToObjectUrl(out);
          previewUrl = obj.url;
          const stats = await computeStatsForBlob(out);
          outW = stats.w; outH = stats.h; opaqueCount = stats.opaque; colorCount = stats.colors;
          previewCache.set(key, { blob: out, url: obj.url, revoke: obj.revoke, stats });
          lastPreviewFinalApplied = true;
          dispatch('update', { blob: out, pixelSize, method, ditherMethod, ditherLevels });
        }
      }
      debugLayout('after-preview');
    } catch {}
    if (!workerReady || lastPreviewFinalApplied) { working = false; }
    if (queuedPreview) {
      queuedPreview = false;
      await tick();
      return updatePreview();
    }
    await tick();
  }

  function close() {
    
    try { if (overlayThrottleState.rafId !== null) { cancelAnimationFrame(overlayThrottleState.rafId); overlayThrottleState.rafId = null; } } catch {}
    
    
    try { for (const v of previewCache.values()) { try { v.revoke && v.revoke(); } catch {} } } catch {}
    previewCache.clear();
    previewUrl = '';
    quickPreviewUrl = '';
    if (quickPreviewRevoke) { try { quickPreviewRevoke(); } catch {} quickPreviewRevoke = null; }
    
    
    pixelSize = 1;
    method = 'nearest';
    ditherMethod = 'none';
    ditherLevels = 4;
    paletteMode = 'full';
    outlineThickness = 0;
    erodeAmount = 0;
    
    
    customIndices = [];
    customInitialized = false;
    customDitherPattern = makePattern();
    customDitherAppliedKey = '';
    customDitherStrengthPct = 100;
    
    
    editMode = false;
    activeTool = 'brush';
    prevTool = 'brush';
    hasEdits = false;
    undoStack = [];
    redoStack = [];
    zoom = 1;
    panX = 0;
    panY = 0;
    
    
    selectionMode = false;
    selectionCount = 0;
    selectionReplaceCleared = false;
    
    
    stickerMode = false;
    stickerState = createStickerState();
    
    
    gradientMode = 'linear';
    gradientColorA = 0;
    gradientColorB = 15;
    
    
    brightness = 0;
    contrast = 0;
    saturation = 0;
    hue = 0;
    colorCorrectionEnabled = false;
    
    
    working = false;
    lastPreviewJob = 0;
    lastStatsJob = 0;
    lastPreviewFinalApplied = false;
    activeJobs.clear();
    
    
    outW = outH = opaqueCount = colorCount = 0;
    originalDims = { w: 0, h: 0 };
    
    
    showInfo = false;
    showLock = false;
    showTapes = false;
    lockState = 'locked';
    lockPhase = 'enter';
    panelScrollTop = 0;
    
    
    try { if (updateDebounceTimer) { clearTimeout(updateDebounceTimer); updateDebounceTimer = null; } } catch {}
    try { if (lockPhaseTimer) { clearTimeout(lockPhaseTimer); lockPhaseTimer = null; } } catch {}
    try { if (tapesPhaseTimer) { clearTimeout(tapesPhaseTimer); tapesPhaseTimer = null; } } catch {}
    
    
    destroyImageWorkerLocal();
    
    
    try { comparisonActions.clearAll(); } catch {}
    
    dispatch('close');
  }

  async function apply() {
    if (!file) { close(); return; }
    try {
      const customKeyNow = (paletteMode === 'custom' && customIndices && customIndices.length) ? customIndices.join('-') : '';
      const customDitherKeyNow = (ditherMethod === 'custom') ? (customDitherAppliedKey || '') : '';
      const ccKey = colorCorrectionEnabled ? `|cc:1|b:${brightness}|c:${contrast}|s:${saturation}|h:${hue}` : '|cc:0';
      const key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}${paletteMode==='custom'?`|ci:${customKeyNow}`:''}${ditherMethod==='custom'?`|cp:${customDitherKeyNow}`:''}${ccKey}`;
      const cached = previewCache.get(key);
      const out = cached?.blob || await resampleAndDither(file, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customIndices, colorCorrectionEnabled, brightness, contrast, saturation, hue);
      
      dispatch('apply', { blob: out, pixelSize, method, ditherMethod, ditherLevels, paletteMode, outlineThickness, erodeAmount, customKey: customKeyNow, hadPixelEdits });
      
      close();
    } catch {
      
    }
  }

  function reset() {
    pixelSize = 1;
    method = 'nearest';
    ditherMethod = 'none';
    ditherLevels = 4;
    paletteMode = 'full';
    outlineThickness = 0;
    erodeAmount = 0;
    
    brightness = 0;
    contrast = 0;
    saturation = 0;
    hue = 0;
    colorCorrectionEnabled = false;
    schedulePreviewUpdate();
  }

  

  $: if (open) {
    
    createImageWorkerLocal();
    loadOriginalDims().then(updatePreview);
  }

  $: if (open && file && pixelSize && method && ditherMethod && ditherLevels && paletteMode !== undefined) {
  
  
  if (ditherMethod === 'custom') {
    if (customDitherKey) schedulePreviewUpdate();
  } else {
    schedulePreviewUpdate();
  }
}

  $: if (file) {
    fileStamp = Date.now();
    
    for (const v of previewCache.values()) { try { v.revoke && v.revoke(); } catch {} }
    previewCache.clear();
  }

  function debugLayout(label = '') {
    try { 
      const m = modalRef;
      const b = backdropRef;
      const mr = m && m.getBoundingClientRect ? m.getBoundingClientRect() : null;
      const br = b && b.getBoundingClientRect ? b.getBoundingClientRect() : null;
      void(label); void(mr); void(br); 
    } catch {}
  }

  function cancelPreviousJobs() {
    if (!workerReady || !imageWorker) {
      try { console.debug('[wph] cancelPreviousJobs: worker not ready', { workerReady, hasWorker: !!imageWorker }); } catch {}
      return;
    }
    try {
      const activeCount = activeJobs.size;
      try { console.debug('[wph] cancelPreviousJobs called', { activeCount, activeJobs: Array.from(activeJobs) }); } catch {}
      
      for (const jobId of activeJobs) {
        try { 
          imageWorker.postMessage({ type: 'cancel', jobId });
          try { console.debug('[wph] cancelled job', jobId); } catch {}
        } catch {}
        
        for (let i = 0; i < imageWorkerPool.length; i++) {
          try {
            imageWorkerPool[i].postMessage({ type: 'cancel', jobId });
            try { console.debug(`[wph] cancelled job ${jobId} in pool worker ${i}`); } catch {}
          } catch {}
        }
      }
      activeJobs.clear();
    } catch {}
  }

  function createImageWorker_DEPRECATED() {
    
    
    try { console.debug('[wph] createImageWorker_DEPRECATED removed - using workerManager instead'); } catch {}
  }

  function destroyImageWorker_DEPRECATED() {
    try {
      workerReady = false;
      poolReadyCount = 0;
      activeJobs.clear(); 
      
      
      for (let i = 0; i < imageWorkerPool.length; i++) {
        try { imageWorkerPool[i].terminate(); } catch {}
      }
      imageWorkerPool = [];
      poolSize = 0;
      
      if (imageWorker) { try { imageWorker.terminate(); } catch {} imageWorker = null; }
      if (imageWorkerUrl) { try { URL.revokeObjectURL(imageWorkerUrl); } catch {} imageWorkerUrl = ''; }
      if (quickPreviewRevoke) { try { quickPreviewRevoke(); } catch {} quickPreviewRevoke = null; }
      quickPreviewUrl = '';
    } catch {}
  }

  onMount(() => {
    debugLayout('mount');
  });
  onDestroy(() => {
    try { if (updateDebounceTimer) { clearTimeout(updateDebounceTimer); updateDebounceTimer = null; } } catch {}
    try { if (overlayThrottleState.rafId !== null) { cancelAnimationFrame(overlayThrottleState.rafId); overlayThrottleState.rafId = null; } } catch {}
    destroyImageWorkerLocal();
  });

  $: if (open) {
    
    hadPixelEdits = false;
    tick().then(() => debugLayout('after-open'));
  }

  
  
  
  function onWindowResize() { layoutStage(); }
</script>

<svelte:window on:resize={onWindowResize} on:wheel={onGlobalWheelWrapper} on:mousemove={onWindowMouseMoveWrapper} on:mouseup={() => { isPatternDragging = false; onWindowMouseUpWrapper(); }} on:keydown={onWindowKeyDownWrapper} />

{#if open}
  <div use:appendToBody class="editor-backdrop" bind:this={backdropRef} role="button" tabindex="0" style={`z-index:1000000000000; display:${suspendVisible ? 'none' : 'flex'};`}
       on:click={(e) => { if (e.target === e.currentTarget) close(); }}
       on:keydown={onBackdropKeyDownWrapper}>
    <div class="editor-modal" bind:this={modalRef} role="dialog" aria-modal="true" tabindex="-1" style="z-index:1000000000001;">
      <div class="editor-grid">
        
        <div class="editor-panel" class:locked={editMode} bind:this={panelRef}
             on:scroll={(e) => { try { panelScrollTop = e.currentTarget.scrollTop || 0; } catch {} }}>
          <div class="editor-panel-title">{t('editor.panel.title')}</div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.downscale.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.method')}</div>
              <div class="editor-row">
                <CustomSelect 
                  bind:value={method} 
                  options={RESAMPLE_METHODS.map(m => ({ value: m, label: t('editor.resample.method.' + m) }))}
                  onChange={() => schedulePreviewUpdate()}
                />
              </div>
            </div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.downscale.pixelSize')}</div>
              <div class="editor-row">
                <input type="range" min="1" max="20" step="0.1" bind:value={pixelSize} on:input={() => schedulePreviewUpdate()} style="--min:1; --max:20; --val:{pixelSize};" />
                <input type="number" min="1" max="20" step="0.1" inputmode="decimal" bind:value={pixelSize} on:change={() => { pixelSize = clampStep(pixelSize, 1, 20, 0.1); schedulePreviewUpdate(); }} on:blur={() => { pixelSize = clampStep(pixelSize, 1, 20, 0.1); }} class="editor-number" />
              </div>
              <div class="editor-hint">{t('editor.panel.resultSize')}: {Math.max(1, Math.floor(originalDims.w / pixelSize))} × {Math.max(1, Math.floor(originalDims.h / pixelSize))}</div>
            </div>
          </div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.dither.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.method')}</div>
              <div class="editor-row">
                <CustomSelect 
                  bind:value={ditherMethod} 
                  options={DITHER_METHODS.map(dm => ({ value: dm, label: t('editor.dither.method.' + dm) }))}
                  onChange={() => { if (ditherMethod !== 'custom') schedulePreviewUpdate(); }}
                />
              </div>
            </div>
            {#if ditherSupportsStrength}
              <div class="editor-control">
                <div class="editor-control-title">{t('editor.panel.dither.strength')}</div>
                <div class="editor-row">
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    bind:value={ditherLevels}
                    on:input={() => { if (ditherMethod !== 'custom') schedulePreviewUpdate(); }}
                    style="--min:2; --max:10; --val:{ditherLevels};"
                  />
                  <input type="number" min="2" max="10" step="0.5" inputmode="decimal" bind:value={ditherLevels} on:change={() => { ditherLevels = clampStep(ditherLevels, 2, 10, 0.5); if (ditherMethod !== 'custom') schedulePreviewUpdate(); }} on:blur={() => { ditherLevels = clampStep(ditherLevels, 2, 10, 0.5); }} class="editor-number" />
                </div>
              </div>
            {:else}
              <div class="editor-hint">{t('editor.panel.dither.strengthUnavailable')}</div>
            {/if}
            {#if ditherMethod === 'custom'}
              <div class="custom-dither-panel">
                {#if t('editor.dither.custom.title')}
                  <div class="custom-dither-title">{t('editor.dither.custom.title')}</div>
                {/if}
                <div class="custom-dither-grid" role="grid" aria-label={t('editor.dither.custom.title')}>
                  {#each Array(8) as _, y}
                    <div class="row" role="row">
                      {#each Array(8) as __, x}
                        <button class="cell"
                                aria-pressed={customDitherPattern[y][x]===1}
                                aria-label={`cell ${y+1},${x+1}`}
                                class:on={customDitherPattern[y][x]===1}
                                on:mousedown={(e) => startPatternDragWrapper(y, x, e)}
                                on:mouseenter={(e) => movePatternDragWrapper(y, x, e)}
                                on:click|preventDefault={() => {  }}
                                on:contextmenu|preventDefault>
                        </button>
                      {/each}
                    </div>
                  {/each}
                </div>
                <div class="custom-dither-brightness" style="margin-top:10px; width:100%; display:flex; flex-direction:column; gap:6px;">
                  <div class="editor-control-title">{t('editor.dither.custom.brightness')}</div>
                  <input type="range" min="0" max="100" step="1" bind:value={customDitherStrengthPct} style="--min:0; --max:100; --val:{customDitherStrengthPct}; width:100%;" />
                </div>
                <div class="custom-dither-actions">
                  <button class="editor-btn" on:click={resetCustomPattern}>{t('editor.dither.custom.reset')}</button>
                  <button class="editor-btn editor-primary" on:click={applyCustomDitherPattern}>{t('editor.dither.custom.apply')}</button>
                </div>
              </div>
            {/if}
          </div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.palette.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.palette.set')}</div>
              <div class="editor-row">
                <CustomSelect 
                  bind:value={paletteMode} 
                  options={[
                    { value: 'full', label: t('editor.panel.palette.opt.full') },
                    { value: 'free', label: t('editor.panel.palette.opt.free') },
                    { value: 'custom', label: t('editor.panel.palette.opt.custom') }
                  ]}
                  onChange={() => schedulePreviewUpdate()}
                />
              </div>
              {#if paletteMode === 'custom'}
                <div class="palette-toolbar">
                  <div class="palette-count">{t('editor.panel.palette.selected')}: {customIndices.length}</div>
                  <div class="palette-actions">
                    <button class="palette-btn primary" on:click={() => { customIndices = Array.from({length: MASTER_COLORS.length}, (_,i)=>i); schedulePreviewUpdate(); }}>{t('editor.panel.palette.enableAll')}</button>
                    <button class="palette-btn ghost" on:click={() => { customIndices = []; schedulePreviewUpdate(); }}>{t('editor.panel.palette.disableAll')}</button>
                  </div>
                </div>
                <div class="palette-custom">
                  {#each MASTER_COLORS as c, i}
                    <label class="palette-item" class:paid={c.paid} title={c.name}>
                      <input type="checkbox" checked={customIndices.includes(i)} on:change={(e) => {
                        const set = new Set(customIndices);
                        if (e.currentTarget.checked) set.add(i); else set.delete(i);
                        customIndices = Array.from(set).sort((a,b)=>a-b);
                        schedulePreviewUpdate();
                      }}/>
                      <span class="sw" style={`--c: rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`}></span>
                      <span class="nm">{c.name}</span>
                      {#if c.paid}<span class="palette-badge">{t('editor.palette.paid')}</span>{/if}
                    </label>
                  {/each}
                </div>
                <div class="palette-presets">
                  <div class="palette-presets-title">{t('editor.panel.palette.presets')}</div>
                  <div class="preset-filters">
                    <input class="preset-search" type="text" placeholder={t('editor.presets.search.placeholder')} bind:value={presetQuery} on:input={() => {  }} />
                    <div class="preset-toggles">
                      
                      <button type="button" class="tile {onlyFreePresets ? 'selected' : ''}" aria-pressed={onlyFreePresets} on:click={() => { onlyFreePresets = !onlyFreePresets; }}>
                        <div class="tile-inner">
                          <span class="name">{t('editor.presets.freeOnly')}</span>
                        </div>
                        <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
                      </button>
                      
                      <button type="button" class="tile {onlyFavoritePresets ? 'selected' : ''}" aria-pressed={onlyFavoritePresets} on:click={() => { onlyFavoritePresets = !onlyFavoritePresets; }}>
                        <div class="tile-inner">
                          <span class="name">{t('editor.presets.favoritesOnly')}</span>
                        </div>
                        <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
                      </button>
                      <button class="palette-btn ghost" on:click={clearPresetFilters}>{t('editor.presets.clear')}</button>
                    </div>
                    {#if ALL_PRESET_TAGS.length}
                      <div class="preset-tags">
                        {#each ALL_PRESET_TAGS as tg}
                          <button
                            type="button"
                            class="tile tag-tile {selectedTags.has(tg) ? 'selected' : ''}"
                            aria-pressed={selectedTags.has(tg)}
                            on:click={() => toggleTag(tg)}
                          >
                            <div class="tile-inner">
                              <span class="name">{tg}</span>
                            </div>
                            <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  
                  <div class="preset-list compact">
                    {#each filteredPresets as p}
                      <div class="preset-btn" role="button" tabindex="0" title={p.name}
                           aria-label={p.name}
                           on:click={() => applyPreset(p)}
                           on:keydown={createPresetKeyDownWrapper(() => applyPreset(p))}>
                        <button
                          type="button"
                          class="preset-star {favoritePresetIds.has(p.id) ? 'active' : ''}"
                          title={favoritePresetIds.has(p.id) ? t('editor.presets.unstar') : t('editor.presets.star')}
                          aria-label={favoritePresetIds.has(p.id) ? t('editor.presets.unstar') : t('editor.presets.star')}
                          aria-pressed={favoritePresetIds.has(p.id)}
                          on:click|stopPropagation={() => toggleFavoritePreset(p)}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.18-.61L12 2 9.18 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        </button>
                        <div class="preset-swatches">
                          {#each p.indices.slice(0, 8) as idx}
                            <span class="sw" style={`--c: rgb(${MASTER_COLORS[idx].rgb[0]},${MASTER_COLORS[idx].rgb[1]},${MASTER_COLORS[idx].rgb[2]})`}></span>
                          {/each}
                        </div>
                        <div class="preset-meta">
                          <span class="preset-name">{p.name}</span>
                        </div>
                      </div>
                    {/each}
                    {#if filteredPresets.length === 0}
                      <div class="preset-empty">{t('editor.presets.noResults')}</div>
                    {/if}
                  </div>
                </div>
              {/if}
              
            </div>
          </div>

          <div class="editor-group">
            <div class="editor-group-title">{t('editor.panel.post.title')}</div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.post.outline')}</div>
              <div class="editor-row">
                <input type="range" min="0" max="8" step="1" bind:value={outlineThickness} on:input={() => schedulePreviewUpdate()} style="--min:0; --max:8; --val:{outlineThickness};" />
                <input type="number" min="0" max="8" step="1" inputmode="numeric" bind:value={outlineThickness} on:change={() => { outlineThickness = clampStep(outlineThickness, 0, 8, 1); schedulePreviewUpdate(); }} on:blur={() => { outlineThickness = clampStep(outlineThickness, 0, 8, 1); }} class="editor-number" />
              </div>
            </div>
            <div class="editor-control">
              <div class="editor-control-title">{t('editor.panel.post.erode')}</div>
              <div class="editor-row">
                <input type="range" min="0" max="8" step="1" bind:value={erodeAmount} on:input={() => schedulePreviewUpdate()} style="--min:0; --max:8; --val:{erodeAmount};" />
                <input type="number" min="0" max="8" step="1" inputmode="numeric" bind:value={erodeAmount} on:change={() => { erodeAmount = clampStep(erodeAmount, 0, 8, 1); schedulePreviewUpdate(); }} on:blur={() => { erodeAmount = clampStep(erodeAmount, 0, 8, 1); }} class="editor-number" />
              </div>
            </div>
          </div>

          
          <div class="editor-group">
            <div class="editor-group-title">
              {t('editor.panel.colorCorrection.title')}
              <label class="color-correction-toggle">
                <input type="checkbox" bind:checked={colorCorrectionEnabled} on:change={() => schedulePreviewUpdate()} />
                <span class="checkmark"></span>
              </label>
            </div>
            
            {#if colorCorrectionEnabled}
              <div class="editor-control">
                <div class="editor-control-title">{t('editor.panel.colorCorrection.brightness')}</div>
                <div class="editor-row">
                  <input type="range" min="-100" max="100" step="1" bind:value={brightness} on:input={() => schedulePreviewUpdate()} style="--min:-100; --max:100; --val:{brightness};" />
                  <input type="number" min="-100" max="100" step="1" inputmode="numeric" bind:value={brightness} on:change={() => { brightness = clampStep(brightness, -100, 100, 1); schedulePreviewUpdate(); }} on:blur={() => { brightness = clampStep(brightness, -100, 100, 1); }} class="editor-number" />
                  <span class="reset-dot" role="button" tabindex="0" title={t('editor.reset.title')}
                        aria-label={t('editor.reset.brightness')}
                        on:click={() => { brightness = 0; schedulePreviewUpdate(); }}
                        on:keydown={(e) => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); brightness = 0; schedulePreviewUpdate(); } }} />
                </div>
              </div>
              
              <div class="editor-control">
                <div class="editor-control-title">{t('editor.panel.colorCorrection.contrast')}</div>
                <div class="editor-row">
                  <input type="range" min="-100" max="100" step="1" bind:value={contrast} on:input={() => schedulePreviewUpdate()} style="--min:-100; --max:100; --val:{contrast};" />
                  <input type="number" min="-100" max="100" step="1" inputmode="numeric" bind:value={contrast} on:change={() => { contrast = clampStep(contrast, -100, 100, 1); schedulePreviewUpdate(); }} on:blur={() => { contrast = clampStep(contrast, -100, 100, 1); }} class="editor-number" />
                  <span class="reset-dot" role="button" tabindex="0" title={t('editor.reset.title')}
                        aria-label={t('editor.reset.contrast')}
                        on:click={() => { contrast = 0; schedulePreviewUpdate(); }}
                        on:keydown={(e) => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); contrast = 0; schedulePreviewUpdate(); } }} />
                </div>
              </div>
              
              <div class="editor-control">
                <div class="editor-control-title">{t('editor.panel.colorCorrection.saturation')}</div>
                <div class="editor-row">
                  <input type="range" min="-100" max="100" step="1" bind:value={saturation} on:input={() => schedulePreviewUpdate()} style="--min:-100; --max:100; --val:{saturation};" />
                  <input type="number" min="-100" max="100" step="1" inputmode="numeric" bind:value={saturation} on:change={() => { saturation = clampStep(saturation, -100, 100, 1); schedulePreviewUpdate(); }} on:blur={() => { saturation = clampStep(saturation, -100, 100, 1); }} class="editor-number" />
                  <span class="reset-dot" role="button" tabindex="0" title={t('editor.reset.title')}
                        aria-label={t('editor.reset.saturation')}
                        on:click={() => { saturation = 0; schedulePreviewUpdate(); }}
                        on:keydown={(e) => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); saturation = 0; schedulePreviewUpdate(); } }} />
                </div>
              </div>
              
              <div class="editor-control">
                <div class="editor-control-title">{t('editor.panel.colorCorrection.hue')}</div>
                <div class="editor-row">
                  <input type="range" min="-180" max="180" step="1" bind:value={hue} on:input={() => schedulePreviewUpdate()} style="--min:-180; --max:180; --val:{hue};" />
                  <input type="number" min="-180" max="180" step="1" inputmode="numeric" bind:value={hue} on:change={() => { hue = clampStep(hue, -180, 180, 1); schedulePreviewUpdate(); }} on:blur={() => { hue = clampStep(hue, -180, 180, 1); }} class="editor-number" />
                  <span class="reset-dot" role="button" tabindex="0" title={t('editor.reset.title')}
                        aria-label={t('editor.reset.hue')}
                        on:click={() => { hue = 0; schedulePreviewUpdate(); }}
                        on:keydown={(e) => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); hue = 0; schedulePreviewUpdate(); } }} />
                </div>
              </div>
            {/if}
          </div>

          <div class="editor-buttons">
            <button class="editor-btn" on:click={reset} disabled={working}>{t('editor.reset')}</button>
            <div style="flex:1"></div>
            <button class="editor-btn" on:click={close}>{t('common.cancel')}</button>
            <button class="editor-btn editor-primary" on:click={apply} disabled={working || !file}>{t('editor.apply')}</button>
          </div>
          {#if editMode}
            
            <div class="panel-lock" aria-hidden="true" on:wheel|preventDefault on:touchmove|preventDefault
                 style={`transform: translateY(${panelScrollTop}px);`}>
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
                  <div class="palette-selected">
                    {#if activeTool==='gradient' || activeTool==='eyedropper'}
                      <div class="selected-chip a" title={t('editor.palette.chipA.title')}>
                        <span class="chip-swatch" style="--c: rgb({gradientColorA[0]}, {gradientColorA[1]}, {gradientColorA[2]})"></span>
                        <span class="chip-label">{getColorName(gradientColorA)}</span>
                        <span class="chip-tag">A</span>
                      </div>
                      <div class="selected-chip b" title={t('editor.palette.chipB.title')}>
                        <span class="chip-swatch" style="--c: rgb({gradientColorB[0]}, {gradientColorB[1]}, {gradientColorB[2]})"></span>
                        <span class="chip-label">{getColorName(gradientColorB)}</span>
                        <span class="chip-tag">B</span>
                      </div>
                    {:else}
                      <div class="selected-chip single" title={t('editor.palette.allowed')}>
                        <span class="chip-swatch" style="--c: rgb({brushColorRGB[0]}, {brushColorRGB[1]}, {brushColorRGB[2]})"></span>
                        <span class="chip-label">{getColorName(brushColorRGB)}</span>
                      </div>
                    {/if}
                  </div>
                  <div class="palette-popover" role="presentation">
                    <div class="palette-grid">
                      {#each allowedColors as c, i}
                        <button class="swatch" style="--c: rgb({c[0]},{c[1]},{c[2]});" data-label={getColorName(c)}
                                on:click={() => { if (activeTool==='gradient' || activeTool==='eyedropper') { gradientColorA = c; } else { brushColorRGB = c; } }}
                                on:contextmenu|preventDefault={() => { if (activeTool==='gradient' || activeTool==='eyedropper') { gradientColorB = c; } }}
                                class:selected={activeTool!=='gradient' && activeTool!=='eyedropper' && c[0]===brushColorRGB[0] && c[1]===brushColorRGB[1] && c[2]===brushColorRGB[2]}
                                class:is-grad-a={(activeTool==='gradient' || activeTool==='eyedropper') && c[0]===gradientColorA[0] && c[1]===gradientColorA[1] && c[2]===gradientColorA[2]}
                                class:is-grad-b={(activeTool==='gradient' || activeTool==='eyedropper') && c[0]===gradientColorB[0] && c[1]===gradientColorB[1] && c[2]===gradientColorB[2]}></button>
                      {/each}
                    </div>
                    {#if activeTool==='gradient' || activeTool==='eyedropper'}
                      <div class="palette-hint">{t('editor.palette.hint.gradient')}</div>
                    {:else}
                      <div class="palette-hint">{t('editor.palette.hint.single')}</div>
                    {/if}
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
                     on:wheel={onStageWheelWrapper}
                     on:mousemove={onStageMouseMoveWrapper}
                     on:mouseleave={onStageMouseLeaveWrapper}
                     on:mousedown={onStageMouseDownWrapper}
                     on:mouseup={onStageMouseUpWrapper}
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
              <div class="editor-busy" role="status" aria-live="polite">
                <span class="busy-spinner" aria-hidden="true"></span>
                <span class="busy-text">{t('editor.busy')}</span>
              </div>
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
                
                  <div class="fab-tool-wrap gradient-tool magic-popover" role="group" aria-label={t('editor.tool.magic')}
                       on:mouseenter={() => { hoverMagicBtn = true; if (activeTool==='magic') openMagicModes(); }}
                       on:mouseleave={() => { hoverMagicBtn = false; closeMagicModesSoon(350); }}>
                    <button class="fab-tool magic-button" class:active={activeTool==='magic' && !stickerMode} title={t('editor.tool.magic')} aria-label={t('editor.tool.magic')} on:click={() => pickTool('magic')}>
                      <svg fill="currentColor" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
                        <path d="M29.4141,24,12,6.5859a2.0476,2.0476,0,0,0-2.8281,0l-2.586,2.586a2.0021,2.0021,0,0,0,0,2.8281L23.999,29.4141a2.0024,2.0024,0,0,0,2.8281,0l2.587-2.5865a1.9993,1.9993,0,0,0,0-2.8281ZM8,10.5859,10.5859,8l5,5-2.5866,2.5869-5-5Z"/>
                        <rect x="2.5858" y="14.5858" width="2.8284" height="2.8284" transform="translate(-10.1421 7.5147) rotate(-45)"/>
                        <rect x="14.5858" y="2.5858" width="2.8284" height="2.8284" transform="translate(1.8579 12.4853) rotate(-45)"/>
                        <rect x="2.5858" y="2.5858" width="2.8284" height="2.8284" transform="translate(-1.6569 4) rotate(-45)"/>
                        <rect width="32" height="32" fill="none" />
                      </svg>
                      {#if activeTool==='magic'}
                        <span class="tool-size-badge">{magicTolerance}</span>
                        <span class="tool-mode-badge">{magicMode === 'global' ? 'G' : 'L'}</span>
                      {/if}
                    </button>
                    {#if activeTool==='magic' && showMagicModes}
                      <div class="gradient-modes" role="menu" tabindex="0" aria-label={t('editor.tool.magic')} on:mouseenter={() => openMagicModes()} on:mouseleave={() => closeMagicModesSoon(280)}>
                        <button class="mode" role="menuitem" class:active={magicMode==='local'} on:click={() => { magicMode='local'; showMagicModes=false; }} title={t('editor.magic.local.hint')}>{t('editor.magic.local')}</button>
                        <button class="mode" role="menuitem" class:active={magicMode==='global'} on:click={() => { magicMode='global'; showMagicModes=false; }} title={t('editor.magic.global.hint')}>{t('editor.magic.global')}</button>
                      </div>
                    {/if}
                  </div>
             
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
                  
                  <button class="fab-tool" class:active={activeTool==='eyedropper' && !stickerMode} title={t('editor.tool.eyedropper')} aria-label={t('editor.tool.eyedropper')} on:click={startEyedropper}>
                    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="27" width="3" height="3"/>
                      <path d="M29.71,7.29l-5-5a1,1,0,0,0-1.41,0h0L20,5.59l-1.29-1.3L17.29,5.71,18.59,7,8.29,17.29A1,1,0,0,0,8,18v1.59l-2.71,2.7a1,1,0,0,0,0,1.41h0l3,3a1,1,0,0,0,1.41,0h0L12.41,24H14a1,1,0,0,0,.71-.29L25,13.41l1.29,1.3,1.42-1.42L26.41,12l3.3-3.29a1,1,0,0,0,0-1.41ZM13.59,22h-2L9,24.59,7.41,23,10,20.41v-2l10-10L23.59,12ZM25,10.59,21.41,7,24,4.41,27.59,8Z" transform="translate(0 0)"/>
                      <rect width="32" height="32" fill="none"/>
                    </svg>
                  </button>
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
                  <button class="btn small" on:click={confirmStickerLocal}>{t('qr.confirm')}</button>
                  <button class="btn small" on:click={cancelStickerLocal}>{t('common.cancel')}</button>
                </div>
              {/if}
            </div>
       
            
            {#if $hasEnoughForComparison && !editMode}
              <div class="comparison-mode-fab-slot">
                <button 
                  class="comparison-mode-fab" 
                  title={t('editor.comparison.mode').replace('{0}', $comparisonImages.length)}
                  on:click={openComparisonModal}
                >
                  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
                    <path d="M20,16a5,5,0,0,0,10,0,1,1,0,0,0-.1055-.4473L25.896,7.5562a.8913.8913,0,0,0-.0454-.0816A1,1,0,0,0,25,7H18.8218A3.0155,3.0155,0,0,0,17,5.1841V2H15V5.1841A3.0155,3.0155,0,0,0,13.1782,7H7a1,1,0,0,0-.8945.5527l-4,8A1,1,0,0,0,2,16a5,5,0,0,0,10,0,1,1,0,0,0-.1055-.4473L8.6182,9h4.56A3.0147,3.0147,0,0,0,15,10.8154V28H6v2H26V28H17V10.8159A3.0155,3.0155,0,0,0,18.8218,9h4.56l-3.2763,6.5527A1,1,0,0,0,20,16ZM7,19a2.9958,2.9958,0,0,1-2.8152-2h5.63A2.9956,2.9956,0,0,1,7,19Zm2.3821-4H4.6179L7,10.2363ZM16,9a1,1,0,1,1,1-1A1.0009,1.0009,0,0,1,16,9Zm9,10a2.9958,2.9958,0,0,1-2.8152-2h5.63A2.9956,2.9956,0,0,1,25,19Zm0-8.7637L27.3821,15H22.6179Z"/>
                  </svg>
                  <div class="fab-count-badge">{$comparisonImages.length}</div>
                </button>
              </div>
            {/if}
            
            
            {#if !editMode}
            <div class="add-comparison-fab-slot">
              <button 
                class="add-comparison-fab" 
                class:active={isCurrentImageInComparison}
                disabled={!$canAddMore || working}
                title={isCurrentImageInComparison ? t('editor.comparison.remove') : t('editor.comparison.add')}
                on:click={addToComparison}
              >
                {#if isCurrentImageInComparison}
                  
                  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
                    <path d="M16,2l-4.55,9.22L1.28,12.69l7.36,7.18L6.9,30,16,25.22,25.1,30,23.36,19.87l7.36-7.17L20.55,11.22Z"/>
                  </svg>
                {:else}
                  
                  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
                    <path d="M16,6.52l2.76,5.58.46,1,1,.15,6.16.89L22,18.44l-.75.73.18,1,1.05,6.13-5.51-2.89L16,23l-.93.49L9.56,26.34l1-6.13.18-1L10,18.44,5.58,14.09l6.16-.89,1-.15.46-1L16,6.52M16,2l-4.55,9.22L1.28,12.69l7.36,7.18L6.9,30,16,25.22,25.1,30,23.36,19.87l7.36-7.17L20.55,11.22Z"/>
                  </svg>
                {/if}
              </button>
            </div>
            {/if}

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
            
            <div class="zoom-hotspot" aria-hidden="true" role="presentation"
                 class:visible={editMode}
                 on:mouseenter={() => { zoomPanelHover = true; openZoomPanel(); }}
                 on:mouseleave={() => { zoomPanelHover = false; closeZoomPanelSoon(500); }}
            />

            
            <div class="zoom-panel" class:visible={editMode} aria-hidden={!editMode}>
              <div class="zoom-card" role="region" aria-label={t('editor.zoom.controls.aria')}
                   class:active={editMode && (zoomPanelOpen || zoomPanelHover)}
                   on:mouseenter={() => { zoomPanelHover = true; openZoomPanel(); }}
                   on:mouseleave={() => { zoomPanelHover = false; closeZoomPanelSoon(500); }}>
                <button class="zoom-btn plus" on:click={zoomIn} title="+">
                  <span aria-hidden="true">+</span>
                </button>
                <div class="zoom-value" aria-live="polite" style={`font-size:${zoomFontSize}px`}>{zoomPercentText}</div>
                <button class="zoom-btn minus" on:click={zoomOut} title="-">
                  <span aria-hidden="true">−</span>
                </button>
                <div class="zoom-sep" aria-hidden="true"></div>
                <button class="zoom-btn fit" on:click={resetView} title={t('editor.zoom.fit')} aria-label={t('editor.zoom.fit')}>
                  
                  <svg viewBox="0 0 32 32" width="14" height="14" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="8 2 2 2 2 8 4 8 4 4 8 4 8 2"/>
                    <polygon points="24 2 30 2 30 8 28 8 28 4 24 4 24 2"/>
                    <polygon points="8 30 2 30 2 24 4 24 4 28 8 28 8 30"/>
                    <polygon points="24 30 30 30 30 24 28 24 28 28 24 28 24 30"/>
                    <path d="M24,24H8a2.0023,2.0023,0,0,1-2-2V10A2.0023,2.0023,0,0,1,8,8H24a2.0023,2.0023,0,0,1,2,2V22A2.0023,2.0023,0,0,1,24,24ZM8,10V22H24V10Z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}


<ComparisonModal 
  on:close={() => comparisonActions.closeModal()} 
  on:applySettings={(e) => applySettingsFromComparison(e.detail)}
/>

<style>
  .editor-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
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
    background: rgba(17, 17, 17, 0.96) !important;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 16px;
    box-shadow: 0 16px 36px rgba(0,0,0,0.5);
    backdrop-filter: blur(8px);
    padding: 12px;
    overflow: hidden;
    z-index: 2147483647;
    opacity: 1 !important;
    visibility: visible !important;
    color: #fff;
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
  .reset-dot {
    width: 12px;
    height: 12px;
    min-width: 12px;
    min-height: 12px;
    border-radius: 50%;
    background: #f05123;
    border: 1px solid rgba(0,0,0,0.25);
    box-shadow: 0 1px 2px rgba(0,0,0,0.35);
    display: inline-block;
    cursor: pointer;
    outline: none;
  }
  .reset-dot:hover { filter: brightness(1.05); }
  .reset-dot:active { transform: scale(0.95); }
  .reset-dot:focus { box-shadow: 0 0 0 2px rgba(240,81,35,0.45), 0 1px 2px rgba(0,0,0,0.35); }
  
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
  .editor-hint { font-size: 12px; opacity: .7; }
  .editor-number {
    width: 60px;
    height: 32px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    transition: border-color .12s ease, box-shadow .12s ease;
  }
  .editor-number:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(240,81,35,0.28);
    border-color: rgba(255,255,255,0.28);
  }
  .editor-number:hover {
    border-color: rgba(255,255,255,0.25);
  }

  
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
  .palette-toolbar { 
    position: sticky; 
    top: 0; 
    z-index: 4; 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    gap: 8px; 
    margin: 0 -10px 10px -10px;
    padding: 8px 10px;
    background: rgba(36, 36, 36, 0.95);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  
  .palette-count {
    font-size: 12px; 
    font-weight: 600;
    display: inline-flex; 
    align-items: center; 
    gap: 4px;
    padding: 6px 10px; 
    border-radius: 6px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .palette-actions { display: flex; gap: 6px; align-items: center; }
  .palette-btn {
    font-size: 11px; 
    font-weight: 600;
    padding: 6px 10px; 
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.08);
    color: #fff; 
    cursor: pointer;
    transition: all .15s ease;
    white-space: nowrap;
  }
  .palette-btn:hover { 
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.28);
    transform: translateY(-1px);
  }
  .palette-btn:focus-visible { 
    outline: none; 
    box-shadow: 0 0 0 3px rgba(240,81,35,0.28); 
    border-color: rgba(255,255,255,0.28); 
  }
  .palette-btn.primary { 
    background: #f05123; 
    border-color: rgba(240,81,35,0.3);
    color: #fff; 
  }
  .palette-btn.primary:hover {
    background: #ff6433;
    border-color: rgba(240,81,35,0.4);
  }
  .palette-btn.ghost { 
    background: rgba(255,255,255,0.06); 
    color: #fff; 
    border-color: rgba(255,255,255,0.15);
  }
  .palette-btn.ghost:hover {
    background: rgba(255,255,255,0.1);
  }

  
  .palette-presets { margin: 2px 0 10px; }
  .palette-presets-title { font-size: 12px; opacity: .9; margin: 2px 0 6px; }
  .preset-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
  .preset-btn { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 8px 40px 8px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: inherit; cursor: pointer; text-align: left; transition: filter .12s ease, transform .12s ease, background .12s ease; }
  .preset-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
  .preset-star {
    position: absolute; top: 6px; right: 8px;
    width: 26px; height: 26px; display: grid; place-items: center;
    border-radius: 50%; border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08); color: #fff;
    cursor: pointer; transition: transform .12s ease, filter .12s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  }
  .preset-star:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .preset-star.active { background: #f05123; border-color: rgba(255,255,255,0.36); color: #fff; box-shadow: 0 4px 12px rgba(240,81,35,0.45); }
  .preset-swatches { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; }
  .preset-swatches .sw { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.45); background: var(--c); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
  .preset-meta { display: flex; align-items: center; justify-content: flex-start; gap: 6px; font-size: 12px; opacity: .92; }
  .preset-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  

  
  .preset-filters { display: grid; gap: 8px; margin: 6px 0 8px; }
  .preset-search { height: 32px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fff; font-weight: 600; }
  .preset-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(240,81,35,0.28); border-color: rgba(255,255,255,0.28); }
  .preset-toggles { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  
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
  .preset-tags { display: flex; flex-wrap: wrap; gap: 8px; }
  
  .tag-tile { min-height: 32px; padding: 6px 10px; border-radius: 10px; }
  .tag-tile .tile-inner .name { font-size: 12px; font-weight: 600; }
  .preset-list.compact .preset-btn { flex-direction: row; align-items: center; gap: 8px; padding: 6px 40px 6px 6px; }
  .preset-list.compact .preset-swatches { grid-template-columns: repeat(8, 12px); gap: 3px; }
  .preset-list.compact .preset-swatches .sw { width: 12px; height: 12px; border-radius: 3px; }
  .preset-list.compact .preset-meta { min-width: 0; }
  .preset-list.compact .preset-star { top: 50%; right: 8px; transform: translateY(-50%); }
  .preset-list.compact .preset-star:hover { transform: translateY(calc(-50% - 1px)); }
  .preset-empty { padding: 10px; text-align: center; opacity: .8; font-size: 12px; }

  
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
  .editor-group-title { 
    font-weight: 600; 
    opacity: .9; 
    margin-bottom: 2px; 
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  
  .color-correction-toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;
  }
  
  .color-correction-toggle input[type="checkbox"] {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .color-correction-toggle .checkmark {
    width: 36px;
    height: 18px;
    background: rgba(255,255,255,0.15);
    border-radius: 12px;
    position: relative;
    transition: background 0.2s ease;
    border: 1px solid rgba(255,255,255,0.25);
  }
  
  .color-correction-toggle .checkmark::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255,255,255,0.9);
    transition: transform 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  
  .color-correction-toggle input:checked + .checkmark {
    background: #f05123;
    border-color: #f05123;
  }
  
  .color-correction-toggle input:checked + .checkmark::after {
    transform: translateX(18px);
  }
  
  .color-correction-toggle:hover .checkmark {
    background: rgba(255,255,255,0.25);
  }
  
  .color-correction-toggle input:checked:hover + .checkmark {
    background: #e04619;
  }

  .editor-buttons { display: flex; gap: 8px; align-items: center; }
  .editor-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .editor-btn.editor-primary { background: #f05123; border-color: rgba(255,255,255,0.25); }

  .editor-output { position: relative; display: flex; flex-direction: column; min-height: 380px; }
  .editor-output-header { position: absolute; top: 0; left: 0; right: 0; height: 36px; z-index: 5; background: rgba(24,26,32,0.85); border-bottom: 1px solid rgba(255,255,255,0.15); padding: 6px 10px; display: flex; align-items: center; justify-content: center; overflow: visible; }
  :global(.editor-output-header::-webkit-scrollbar) { width: 0; height: 0; }
  .editor-output-header { scrollbar-width: none; }
  .editor-output-header.compact { background: none; border-bottom: none; }
  
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
  .header-palette { gap: 8px; }
  .header-palette .palette-selected { display: inline-flex; align-items: center; gap: 8px; height: 24px; }
  .header-palette .selected-chip { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 2px 8px; border-radius: 999px; background: rgba(17,17,17,0.7); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
  .header-palette .selected-chip.single { padding-right: 10px; }
  .header-palette .chip-swatch { width: 14px; height: 14px; border-radius: 4px; background: var(--c); border: 1px solid rgba(255,255,255,0.45); box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
  .header-palette .chip-label { font-size: 12px; opacity: .98; color: #fff; white-space: nowrap; }
  .header-palette .chip-tag { display: inline-flex; align-items: center; justify-content: center; height: 16px; min-width: 16px; padding: 0 6px; font-size: 11px; font-weight: 700; color: #111; background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.25); border-radius: 999px; line-height: 1; }
  .header-palette .selected-chip.a .chip-tag { background: #f05123; color: #fff; border-color: rgba(0,0,0,0.25); }
  .header-palette .selected-chip.b .chip-tag { background: #55aaff; color: #071018; border-color: rgba(0,0,0,0.2); }
  .header-palette .swatch { position: relative; width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.35); background: var(--c); box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; padding: 0; }
  .header-palette .swatch::after { content: attr(data-label); position: absolute; left: 50%; top: calc(100% + 10px); transform: translateX(-50%); background: rgba(17,17,17,0.95); color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 6px 16px rgba(0,0,0,0.35); white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .12s ease, transform .12s ease, visibility .12s; z-index: 40; }
  .header-palette .swatch:hover::after, .header-palette .swatch:focus-visible::after { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
  .header-palette .swatch.selected { outline: 2px solid #f05123; outline-offset: 1px; }
  .header-palette .palette-popover { position: absolute; top: 100%; padding-top: 8px; left: 50%; z-index: 20; opacity: 0; transform: translate(-50%, 0) scale(.98); pointer-events: none; transition: opacity .15s ease, transform .15s ease; text-align: center; display: flex; flex-direction: column; align-items: center; width: max-content; }
  .header-palette .palette-popover > .palette-grid { background: rgba(17,17,17,0.95); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 8px; box-shadow: 0 12px 28px rgba(0,0,0,0.45); margin: 0 auto; }
  .header-palette.open .palette-popover, .header-palette:hover .palette-popover { opacity: 1; transform: translate(-50%, 0) scale(1); pointer-events: auto; }
  .header-palette .palette-grid { display: grid; grid-template-columns: repeat(14, 16px); gap: 6px; }
  .header-palette .palette-hint { margin-top: 8px; text-align: center; font-size: 12px; opacity: 1; color: #fff; background: rgba(17,17,17,0.95); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); display: block; width: 100%; box-shadow: 0 8px 18px rgba(0,0,0,0.4); }
  
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
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 0 6px 18px rgba(0,0,0,0.24);
    backdrop-filter: blur(3px);
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #fff;
  }
  .editor-busy .busy-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.22);
    border-top-color: #f05123;
    border-right-color: #f05123;
    animation: eb-spin .8s linear infinite;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.25) inset, 0 0 10px rgba(240,81,35,0.25);
  }
  .editor-busy .busy-text { opacity: .95; }
  @keyframes eb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .fab-container { position: absolute; right: 10px; bottom: 10px; display: flex; align-items: center; gap: 8px; z-index: 2; padding-top: 60px; }
  .fab-tools { display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateX(8px) scale(0.98); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
  .fab-tools.open { opacity: 1; transform: translateX(0) scale(1); pointer-events: auto; }
  .fab-tool-wrap { position: relative; }
  
  .gen-fab { width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.95); color: #222; border: 1px solid rgba(0,0,0,0.1); display: grid; place-items: center; box-shadow: 0 8px 22px rgba(0,0,0,0.35); cursor: pointer; transition: transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .15s ease; }
  .gen-fab:hover { filter: brightness(1.05); transform: translateY(-1px); }

  
  .custom-dither-panel { margin-top: 8px; padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; display: flex; flex-direction: column; align-items: center; }
  .custom-dither-title { font-size: 12px; opacity: .85; margin-bottom: 6px; text-align: center; }
  .custom-dither-grid { display: inline-flex; flex-direction: column; gap: 2px; user-select: none; }
  .custom-dither-grid .row { display: flex; gap: 2px; }
  .custom-dither-grid .cell { width: 18px; height: 18px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.18); background: rgba(0,0,0,0.3); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35); cursor: pointer; }
  .custom-dither-grid .cell.on { background: #f05123; border-color: rgba(255,255,255,0.3); box-shadow: 0 0 8px rgba(240,81,35,0.6), inset 0 0 0 1px rgba(0,0,0,0.35); }
  .custom-dither-actions { width: 100%; display: flex; justify-content: center; margin-top: 8px; gap: 12px; }
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
  
  .magic-button .tool-size-badge { top: auto; right: -8px; bottom: -8px; }
  .tool-mode-badge { position: absolute; bottom: -8px; left: -8px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: #f05123; color: #fff; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 4px 10px rgba(0,0,0,0.35); pointer-events: none; }
  
  .magic-popover .gradient-modes .mode { white-space: nowrap; min-width: 112px; }
  .fab-tool:hover { filter: brightness(1.03); transform: translateY(-2px); }
  .fab-tool.active { background: #f05123; color: #fff; border-color: rgba(0,0,0,0.15); }

  
  .zoom-panel {
    position: absolute;
    left: 10px;
    bottom: 120px; 
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0; 
    padding: 0;
    background: transparent;
    color: inherit;
    border: none;
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    z-index: 3;
    opacity: 0; transform: translateY(6px) scale(.98);
    pointer-events: none;
    transition: opacity .18s ease, transform .18s ease;
  }
  .zoom-panel.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .zoom-hotspot { position: absolute; left: 0; bottom: 120px; width: 12px; height: 130px; z-index: 3; opacity: 0; }
  .zoom-hotspot.visible { opacity: 1; pointer-events: auto; }
  .zoom-card {
    width: 42px; 
    padding: 6px 5px;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 12px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    pointer-events: auto; 
    transform: translateX(-48px);
    transition: transform .18s ease;
  }
  .zoom-card.active { transform: translateX(0); }
  .zoom-btn {
    width: 28px; height: 28px; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.95);
    color: #222;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 5px 14px rgba(0,0,0,0.24);
    font-size: 14px; font-weight: 800;
    cursor: pointer;
    transition: transform .12s ease, filter .12s ease, background .12s ease, color .12s ease, box-shadow .12s ease;
  }
  .zoom-btn:hover { filter: brightness(1.03); transform: translateY(-2px); }
  .zoom-btn:active { transform: translateY(0); }
  .zoom-btn.plus, .zoom-btn.minus { background: rgba(255,255,255,0.98); }
  .zoom-value {
    width: 28px; height: 28px;
    display: grid; place-items: center;
    font-size: 10px; font-weight: 800; letter-spacing: .2px;
    color: #222;
    background: rgba(0,0,0,0.06);
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 50%;
    font-variant-numeric: tabular-nums;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .zoom-sep { width: 2px; height: 2px; background: transparent; margin: 0; }
  .zoom-btn.fit { background: transparent; color: #f05123; border-color: #f05123; }
  .zoom-btn.fit svg { fill: currentColor; }
  .zoom-btn.fit:hover { background: #f05123; color: #fff; border-color: rgba(255,255,255,0.25); }

  

  
  
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

  
  
  
  .comparison-mode-fab-slot {
    position: absolute;
    left: 10px;
    bottom: 120px; 
    width: 44px;
    height: 44px;
    z-index: 3;
  }
  
  .comparison-mode-fab {
    position: absolute;
    inset: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    color: #222;
    border: 1px solid rgba(0,0,0,0.1);
    display: grid;
    place-items: center;
    box-shadow: 0 8px 22px rgba(0,0,0,0.35);
    cursor: pointer;
    z-index: 2;
    transition: transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .15s ease;
  }
  
  .comparison-mode-fab:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }
  
  
  .add-comparison-fab-slot {
    position: absolute;
    left: 10px;
    bottom: 65px; 
    width: 44px;
    height: 44px;
    z-index: 3;
  }
  
  .add-comparison-fab {
    position: absolute;
    inset: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    color: #222;
    border: 1px solid rgba(0,0,0,0.1);
    display: grid;
    place-items: center;
    box-shadow: 0 8px 22px rgba(0,0,0,0.35);
    cursor: pointer;
    z-index: 2;
    transition: transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .15s ease;
  }
  
  .add-comparison-fab:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }
  
  .add-comparison-fab.active {
    background: #f05123;
    color: #fff;
    border-color: rgba(255,255,255,0.25);
  }
  
  .add-comparison-fab:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.3);
  }
  
  .add-comparison-fab:disabled:hover {
    transform: none;
    filter: grayscale(0.3);
  }
  
  
  .fab-count-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border-radius: 999px;
    background: #f05123;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    line-height: 1;
  }
</style>
