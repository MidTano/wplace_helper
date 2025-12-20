<script>
  import { onMount, tick } from 'svelte';
  import { getAutoConfig, updateAutoConfig, resetAutoConfig } from '../screen/autoConfig';
  import { t, lang } from '../i18n';
  import { getStencilManager } from '../template/stencilManager';
  import { tutorialStore } from '../tutorial/store/tutorialStore';
  import { restartTutorial } from '../tutorial/store/tutorialProgress';
  import { dispatchWGuardEvent, WGuardEvents } from '../wguard/core/events';
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  import ThemeModal from '../theme/ThemeModal.svelte';
  import IdleSettingsModal from '../idle/IdleSettingsModal.svelte';
  import { showToast } from '../ui/toast';
  import ColorPicker from '../ui/ColorPicker.svelte';
  import { postChannelMessage, applyMaskOverride, readMaskFlagFromStorage } from '../wguard/core/channel';
  import { MASTER_COLORS } from '../editor/palette';
  import { playSendOrbitalEffect } from '../effects/SendEffect';
  import CustomSelect from '../editor/CustomSelect.svelte';
  import QrOverlayAnimModal from '../qrmusic/QrOverlayAnimModal.svelte';
  import BootSettingsModal from '../boot/BootSettingsModal.svelte';
  import InfoIcon from '../ui/InfoIcon.svelte';
  import ScreenAccessModal from '../screen/ScreenAccessModal.svelte';
  import { hasStream } from '../screen/captureManager';
  

  let open = false;
  let cfg = getAutoConfig();
  let btnEl;
  let popEl;
  let posX = 0;
  let posY = 0;
  let colorDebounceTimer = null;
  let showColorPicker = false;
  let pickerX = 0;
  let pickerY = 0;
  let pickerR = 8;
  let pickerG = 8;
  let pickerB = 8;
  let pickerH = 0;
  let pickerS = 100;
  let pickerV = 3;
  let isDraggingSV = false;
  let isDraggingHue = false;
  let showThemeModal = false;
  let showIdleModal = false;
  let showQrAnimModal = false;
  let showBootModal = false;
  let showScreenAccessModal = false;
  const LIGHT_THEME = 'custom-winter';
  const DARK_THEME = 'dark';
  let isDarkTheme = false;
  
  let captureMethod = 'canvas';
  let isMobile = false;
  let captureMethodOptions = [];
  let colorDetectMethod = 'dom';
  let colorDetectMethodOptions = [];
  
  function isMobileDevice() {
    try {
      return !!(window && window.matchMedia && window.matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse)').matches);
    } catch { return false; }
  }
  
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 8, g: 8, b: 8 };
  }

  function openThemeModal() {
    showThemeModal = true;
  }

  function openQrAnimModal() {
    showQrAnimModal = true;
  }
  
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    
    if (max !== min) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }
  
  function hsvToRgb(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
  
  const bgColorPresets = [
    { name: 'Черный', color: '#000000' },
    { name: 'Темно-серый', color: '#080808' },
    { name: 'Серый', color: '#181818' },
    { name: 'Темно-синий', color: '#0a0a1a' },
    { name: 'Темно-коричневый', color: '#1a0f0a' },
  ];
  
  function fitAnts(node) {
    try {
      const r = node.getBoundingClientRect();
      const w = r.width || 1;
      const h = r.height || 1;
      const baseRadius = 8;
      const borderW = 2;
      const strokeW = 2.5;
      const offset = borderW / 2 + strokeW / 2;
      const radius = Math.max(0, baseRadius - offset);
      const x1 = offset;
      const y1 = offset;
      const x2 = w - offset;
      const y2 = h - offset;
      
      const path = node.querySelector('path');
      if (path) {
        const d = `
          M${x1 + radius},${y1}
          L${x2 - radius},${y1}
          Q${x2},${y1} ${x2},${y1 + radius}
          L${x2},${y2 - radius}
          Q${x2},${y2} ${x2 - radius},${y2}
          L${x1 + radius},${y2}
          Q${x1},${y2} ${x1},${y2 - radius}
          L${x1},${y1 + radius}
          Q${x1},${y1} ${x1 + radius},${y1} Z
        `.replace(/\s+/g, ' ').trim();
        path.setAttribute('d', d);
      }
    } catch {}
    return { destroy() {} };
  }

  function toggle() { open = !open; }
  function close() { open = false; }
  function onIdleNoFav() { try { showToast(t('idle.toast.noFavorites'), 4000); } catch {} }

  function onAutobuyMessage(ev) {
    const d = ev?.data;
    if (!d || d.source !== 'wplace-svelte') return;
    if (d.action === 'autobuy:success' && d.message) {
      try { showToast(String(d.message), 3000); } catch {}
    } else if (d.action === 'autobuy:error' && d.message) {
      try { showToast(String(d.message), 3000); } catch {}
    }
  }

  function onChangeNumber(key, ev) {
    const raw = Number(ev?.currentTarget?.value || ev?.target?.value || 0) || 0;
    const v = key === 'interClickDelayMs' ? Math.max(1, raw) : raw;
    cfg = updateAutoConfig({ [key]: v });
  }
  function onChangeBool(key, ev) {
    const v = !!(ev?.currentTarget?.checked ?? ev?.target?.checked);
    cfg = updateAutoConfig({ [key]: v });
    if (key === 'bmMultiColor') {
      try { triggerRedrawDebounced(); } catch {}
    }
    if (key === 'wguardBypassProtection') {
      try { postChannelMessage({ action: 'bm:setBypass', enabled: v }); } catch {}
    }
    if (key === 'maskAsBlueMarble') {
      try { postChannelMessage({ action: 'bm:setMask', enabled: v }); } catch {}
      try { applyMaskOverride(v); } catch {}
    }
  }
  function onChangeString(key, ev) {
    const v = String(ev?.currentTarget?.value ?? ev?.target?.value ?? '');
    cfg = updateAutoConfig({ [key]: v });

    if (key === 'enhancedBackgroundColor') {
      triggerRedrawDebounced();
    }
  }

  

  function runSendEffectTest() {
    try {
      const colors = [];
      const base = MASTER_COLORS.map(c => [c.rgb[0], c.rgb[1], c.rgb[2]]);
      if (!base.length) return;
      let idx = 0;
      while (colors.length < 1000) {
        colors.push(base[idx]);
        idx = (idx + 1) % base.length;
      }
      playSendOrbitalEffect(colors);
    } catch {}
  }

  let bmMode = (cfg && cfg.bmMode) ? cfg.bmMode : 'random';
  let bmModeOptions = [];
  $: if (cfg && (cfg.bmMode || 'random') !== bmMode) bmMode = cfg.bmMode || 'random';
  $: bmModeOptions = ($lang, [
    { value: 'random', label: t('settings.bm.mode.random') },
    { value: 'topDown', label: t('settings.bm.mode.topDown') },
    { value: 'bottomUp', label: t('settings.bm.mode.bottomUp') },
    { value: 'leftRight', label: t('settings.bm.mode.leftRight') },
    { value: 'rightLeft', label: t('settings.bm.mode.rightLeft') },
    { value: 'diagDown', label: t('settings.bm.mode.diagDown') },
    { value: 'diagUp', label: t('settings.bm.mode.diagUp') },
    { value: 'diagDownRight', label: t('settings.bm.mode.diagDownRight') },
    { value: 'diagUpRight', label: t('settings.bm.mode.diagUpRight') },
    { value: 'centerOut', label: t('settings.bm.mode.centerOut') },
    { value: 'edgesIn', label: t('settings.bm.mode.edgesIn') },
  ]);

  let bmColorOrder = (cfg && cfg.bmColorOrder) ? cfg.bmColorOrder : 'highToLow';
  let bmColorOrderOptions = [];
  $: if (cfg && (cfg.bmColorOrder || 'highToLow') !== bmColorOrder) bmColorOrder = cfg.bmColorOrder || 'highToLow';
  $: bmColorOrderOptions = ($lang, [
    { value: 'highToLow', label: t('settings.bm.colorOrder.highToLow') },
    { value: 'lowToHigh', label: t('settings.bm.colorOrder.lowToHigh') },
    { value: 'random', label: t('settings.bm.colorOrder.random') },
  ]);

  $: captureMethodOptions = ($lang, isMobile
    ? [
      { value: 'canvas', label: t('screen.capture.method.canvas') },
    ]
    : [
      { value: 'canvas', label: t('screen.capture.method.canvas') },
      { value: 'display', label: t('screen.capture.method.display') },
    ]
  );

  $: if (cfg && (cfg.captureMethod || 'canvas') !== captureMethod) captureMethod = cfg.captureMethod || 'canvas';
  $: if (cfg && (cfg.colorDetectMethod || 'dom') !== colorDetectMethod) colorDetectMethod = cfg.colorDetectMethod || 'dom';

  $: colorDetectMethodOptions = ($lang, [
    { value: 'dom', label: t('color.detect.method.dom') },
    { value: 'packets', label: t('color.detect.method.packets') },
  ]);
  
  function onChangeCaptureMethod(value) {
    if (isMobile) return;
    captureMethod = value;
    cfg = updateAutoConfig({ captureMethod: value });
    if (value === 'display') {
      showScreenAccessModal = true;
    }
  }

  function onChangeColorDetectMethod(value) {
    colorDetectMethod = value;
    cfg = updateAutoConfig({ colorDetectMethod: value });
  }

  function readThemePreference() {
    try {
      const value = localStorage.getItem('theme');
      isDarkTheme = value ? value !== LIGHT_THEME : false;
    } catch {
      isDarkTheme = false;
    }
  }

  function applyThemePreference(enabled) {
    isDarkTheme = enabled;
    try {
      localStorage.setItem('theme', enabled ? DARK_THEME : LIGHT_THEME);
      document.cookie = `theme=${enabled ? 'dark' : 'custom-winter'}; path=/; domain=.wplace.live; max-age=31536000; samesite=lax`;
      document.cookie = `snowflakes-enabled=false; path=/; domain=.wplace.live; max-age=31536000; samesite=lax`;
      window.location.reload();
    } catch {}
  }

  function setPresetColor(color) {
    cfg = updateAutoConfig({ enhancedBackgroundColor: color });
    triggerRedrawDebounced();
  }
  
  function openColorPicker(ev) {
    try {
      const rect = ev.currentTarget.getBoundingClientRect();
      const W = Math.max(0, window.innerWidth || 0);
      const H = Math.max(0, window.innerHeight || 0);
      const pad = 10;
      const topMenuHeight = 110;
      const pickerWidth = 260;
      const pickerHeight = 420;
      let px = rect.left;
      let py = rect.bottom + 8;
      if (px + pickerWidth > W - pad) px = Math.max(pad, W - pickerWidth - pad);
      if (py + pickerHeight > H - pad) py = Math.max(topMenuHeight + pad, H - pickerHeight - pad);
      py = Math.max(topMenuHeight + pad, py);
      pickerX = px; pickerY = py; showColorPicker = true;
    } catch {}
  }
  
  function updateColorFromRgb() {
    const hex = rgbToHex(pickerR, pickerG, pickerB);
    const hsv = rgbToHsv(pickerR, pickerG, pickerB);
    pickerH = hsv.h;
    pickerS = hsv.s;
    pickerV = hsv.v;
    cfg = updateAutoConfig({ enhancedBackgroundColor: hex });
    triggerRedrawDebounced();
  }
  
  function updateColorFromHsv() {
    const rgb = hsvToRgb(pickerH, pickerS, pickerV);
    pickerR = rgb.r;
    pickerG = rgb.g;
    pickerB = rgb.b;
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    cfg = updateAutoConfig({ enhancedBackgroundColor: hex });
    triggerRedrawDebounced();
  }
  
  function handleSVMouseDown(ev) {
    isDraggingSV = true;
    updateSVFromMouse(ev);
  }
  
  function handleSVMouseMove(ev) {
    if (isDraggingSV) updateSVFromMouse(ev);
  }
  
  function handleSVMouseUp() {
    isDraggingSV = false;
  }
  
  function updateSVFromMouse(ev) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
    pickerS = x * 100;
    pickerV = (1 - y) * 100;
    updateColorFromHsv();
  }
  
  function closeColorPicker() {
    showColorPicker = false;
  }
  
  function triggerRedrawDebounced() {
    if (colorDebounceTimer) clearTimeout(colorDebounceTimer);
    colorDebounceTimer = setTimeout(() => {
      try {
        const sm = getStencilManager();
        if (sm.enhanced) {
          dispatchWGuardEvent(WGuardEvents.REDRAW_TILES);
        }
      } catch {}
    }, 1000);
  }
  function onReset() {
    cfg = resetAutoConfig();
  }

  async function updatePosition() {
    try {
      await tick();
      const r = btnEl?.getBoundingClientRect?.();
      const W = Math.max(0, window.innerWidth || 0);
      const H = Math.max(0, window.innerHeight || 0);
      const mwRaw = popEl?.offsetWidth || 0;
      const mhRaw = popEl?.offsetHeight || 0;
      const isMobile = (() => {
        try {
          return !!(window && window.matchMedia && window.matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse)').matches);
        } catch { return false; }
      })();
      const pad = isMobile ? 12 : 10;
      const bottomPad = isMobile ? 24 : pad;
      const topMenuHeight = isMobile ? 72 : 110;
      const mw = isMobile
        ? Math.max(260, Math.min(W - pad * 2, mwRaw || (W - pad * 2)))
        : Math.max(260, mwRaw || 300);
      const maxAvailH = Math.max(200, H - (topMenuHeight + pad + bottomPad));
      const mh = isMobile
        ? Math.max(240, Math.min(maxAvailH, mhRaw || maxAvailH))
        : (mhRaw || 500);
      const nx = isMobile
        ? Math.max(pad, Math.min(Math.round((W - mw) / 2), W - mw - pad))
        : Math.max(pad, Math.min(Math.round((r?.left || 0) + (r?.width || 0)/2 - mw/2), W - mw - pad));
      let ny = isMobile
        ? Math.round((H - mh) / 2)
        : Math.round((r?.bottom || 0) + 8);
      if (ny + mh > H - bottomPad) {
        ny = Math.max(topMenuHeight + pad, H - mh - bottomPad);
      }
      ny = Math.max(topMenuHeight + pad, ny);
      posX = nx; posY = ny;
    } catch {}
  }

  onMount(() => {
    cfg = getAutoConfig();
    readThemePreference();
    isMobile = isMobileDevice();
    captureMethod = cfg?.captureMethod || 'canvas';
    colorDetectMethod = cfg?.colorDetectMethod || 'dom';
    if (isMobile) {
      if (captureMethod !== 'canvas') {
        captureMethod = 'canvas';
        cfg = updateAutoConfig({ captureMethod: 'canvas' });
      }
    }
    if (captureMethod === 'display') {
      try {
        if (!hasStream()) showScreenAccessModal = true;
      } catch {}
    }
    try { postChannelMessage({ action: 'bm:setBypass', enabled: !!cfg.wguardBypassProtection }); } catch {}
    try { postChannelMessage({ action: 'bm:setMask', enabled: 'sync' }); } catch {}
    try { applyMaskOverride(readMaskFlagFromStorage()); } catch {}
    try { window.addEventListener('resize', updatePosition); } catch {}
    try { document.addEventListener('wph:idle:noFavorites', onIdleNoFav); } catch {}
    try { window.addEventListener('message', onAutobuyMessage); } catch {}
    return () => { 
      try { window.removeEventListener('resize', updatePosition); } catch {}
      try { document.removeEventListener('wph:idle:noFavorites', onIdleNoFav); } catch {}
      try { window.removeEventListener('message', onAutobuyMessage); } catch {}
    };
  });
  $: if (open) { updatePosition(); }
  
  $: _i18n_settings_lang = $lang;
  $: L_settings = ($lang, t('btn.settings'));
</script>

<div class="tm-settings-wrap" role="group">
<button bind:this={btnEl} class="tm-fab" aria-label={L_settings} data-label={L_settings} aria-expanded={open} aria-controls="tm-settings-popover" on:click={toggle} data-tutorial="settings">
  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
    <path d="M27,16.76c0-.25,0-.5,0-.76s0-.51,0-.77l1.92-1.68A2,2,0,0,0,29.3,11L26.94,7a2,2,0,0,0-1.73-1,2,2,0,0,0-.64.1l-2.43.82a11.35,11.35,0,0,0-1.31-.75l-.51-2.52a2,2,0,0,0-2-1.61H13.64a2,2,0,0,0-2,1.61l-.51,2.52a11.48,11.48,0,0,0-1.32.75L7.43,6.06A2,2,0,0,0,6.79,6,2,2,0,0,0,5.06,7L2.7,11a2,2,0,0,0,.41,2.51L5,15.24c0,.25,0,.5,0,.76s0,.51,0,.77L3.11,18.45A2,2,0,0,0,2.7,21L5.06,25a2,2,0,0,0,1.73,1,2,2,0,0,0,.64-.1l2.43-.82a11.35,11.35,0,0,0,1.31.75l.51,2.52a2,2,0,0,0,2,1.61h4.72a2,2,0,0,0,2-1.61l.51-2.52a11.48,11.48,0,0,0,1.32-.75l2.42.82a2,2,0,0,0,.64.1,2,2,0,0,0,1.73-1L29.3,21a2,2,0,0,0-.41-2.51ZM25.21,24l-3.43-1.16a8.86,8.86,0,0,1-2.71,1.57L18.36,28H13.64l-.71-3.55a9.36,9.36,0,0,1-2.7-1.57L6.79,24,4.43,20l2.72-2.4a8.9,8.9,0,0,1,0-3.13L4.43,12,6.79,8l3.43,1.16a8.86,8.86,0,0,1,2.71-1.57L13.64,4h4.72l.71,3.55a9.36,9.36,0,0,1,2.7,1.57L25.21,8,27.57,12l-2.72,2.4a8.9,8.9,0,0,1,0,3.13L27.57,20Z" />
    <path d="M16,22a6,6,0,1,1,6-6A5.94,5.94,0,0,1,16,22Zm0-10a3.91,3.91,0,0,0-4,4,3.91,3.91,0,0,0,4,4,3.91,3.91,0,0,0,4-4A3.91,3.91,0,0,0,16,12Z" />
  </svg>
</button>

{#if open}
  <div 
    use:appendToBody 
    bind:this={popEl} 
    id="tm-settings-popover" 
    class="tm-settings-popover" 
    role="dialog" 
    aria-label={t('settings.auto.title')} 
    style={`left:${posX}px; top:${posY}px`}
    on:mouseleave={close}
  >
    <div class="title">{t('settings.auto.title')}</div>
    
    <div class="row">
      <div class="label-with-info">
        <label for="cfg-series-wait">{t('settings.seriesWait')}</label>
        <InfoIcon title={t('settings.seriesWait')} content={t('settings.info.seriesWait')} position="top" />
      </div>
      <input id="cfg-series-wait" type="number" min="0" step="1" bind:value={cfg.seriesWaitSec} on:input={(e)=>onChangeNumber('seriesWaitSec', e)} />
    </div>

    <div class="row">
      <div class="label-with-info">
        <label for="cfg-interclick">{t('settings.interClickDelay')}</label>
        <InfoIcon title={t('settings.interClickDelay')} content={t('settings.info.interClickDelay')} position="top" />
      </div>
      <input id="cfg-interclick" type="number" min="0" step="1" bind:value={cfg.interClickDelayMs} on:input={(e)=>onChangeNumber('interClickDelayMs', e)} />
    </div>

    <div class="row bm-mode-row">
      <div class="label-with-info">
        <label for="cfg-bm-mode">{t('settings.bm.mode')}</label>
        <InfoIcon title={t('settings.bm.mode')} content={t('settings.info.bmMode')} position="top" />
      </div>
      <CustomSelect bind:value={bmMode} options={bmModeOptions} onChange={() => { cfg = updateAutoConfig({ bmMode }); }} showModePreview={true} previewAnchorSelector="#tm-settings-popover" previewOffsetX={62} />
    </div>

    <div class="row bm-mode-row">
      <div class="label-with-info">
        <label for="cfg-bm-color-order">{t('settings.bm.colorOrder')}</label>
        <InfoIcon title={t('settings.bm.colorOrder')} content={t('settings.info.bmColorOrder')} position="top" />
      </div>
      <CustomSelect bind:value={bmColorOrder} options={bmColorOrderOptions} onChange={() => { cfg = updateAutoConfig({ bmColorOrder }); }} />
    </div>
    
    <div class="row">
      <div class="label-with-info">
        <label for="cfg-rand-extra">{t('settings.randomExtraWait')}</label>
        <InfoIcon title={t('settings.randomExtraWait')} content={t('settings.info.randomExtraWait')} position="top" />
      </div>
      <input id="cfg-rand-extra" type="number" min="0" step="1" bind:value={cfg.randomExtraWaitMaxSec} on:input={(e)=>onChangeNumber('randomExtraWaitMaxSec', e)} />
    </div>
    
    <div class="row">
      <div class="label-with-info">
        <label for="cfg-bm-batch">{t('settings.bm.batchLimit')}</label>
        <InfoIcon title={t('settings.bm.batchLimit')} content={t('settings.info.bmBatchLimit')} position="top" />
      </div>
      <input id="cfg-bm-batch" type="number" min="0" step="1" bind:value={cfg.bmBatchLimit} on:input={(e)=>onChangeNumber('bmBatchLimit', e)} />
    </div>

    <div class="row toggle-row">
      <div class="label-with-info">
        <label for="cfg-ignore-wrong">{t('settings.bm.ignoreWrong')}</label>
        <InfoIcon title={t('settings.bm.ignoreWrong')} content={t('settings.info.ignoreWrongColor')} position="top" />
      </div>
      <label class="toggle-control" aria-label={t('settings.bm.ignoreWrong')}>
        <input id="cfg-ignore-wrong" type="checkbox" checked={cfg.ignoreWrongColor} on:change={(e)=>onChangeBool('ignoreWrongColor', e)} />
        <span class="toggle-track"></span>
      </label>
    </div>

    <div class="row toggle-row">
      <div class="label-with-info">
        <label for="cfg-mask-bm">{t('settings.bm.maskAsBM')}</label>
        <InfoIcon title={t('settings.bm.maskAsBM')} content={t('settings.info.maskAsBM')} position="top" />
      </div>
      <label class="toggle-control" aria-label={t('settings.bm.maskAsBM')}>
        <input id="cfg-mask-bm" type="checkbox" checked={cfg.maskAsBlueMarble} on:change={(e)=>onChangeBool('maskAsBlueMarble', e)} />
        <span class="toggle-track"></span>
      </label>
    </div>
    <div class="row toggle-row send-effect-row">
      <div class="label-with-info">
        <label for="cfg-send-effect">{t('settings.sendEffect.title')}</label>
        <InfoIcon title={t('settings.sendEffect.title')} content={t('settings.info.sendEffect')} position="top" />
      </div>
      <div class="btn-with-info">
        <button type="button" class="editor-btn send-test-btn" on:click={runSendEffectTest}>{t('settings.sendEffect.test')}</button>
        <InfoIcon title={t('settings.sendEffect.test')} content={t('settings.info.sendEffectTest')} position="top" />
      </div>
      <label class="toggle-control" aria-label={t('settings.sendEffect.title')}>
        <input id="cfg-send-effect" type="checkbox" checked={cfg.sendEffectEnabled} on:change={(e)=>onChangeBool('sendEffectEnabled', e)} />
        <span class="toggle-track"></span>
      </label>
    </div>
    <div class="row toggle-row">
      <div class="label-with-info">
        <label for="cfg-theme-toggle">{t('settings.interface.dark')}</label>
        <InfoIcon title={t('settings.interface.dark')} content={t('settings.info.darkMap')} position="top" />
      </div>
      <label class="toggle-control" aria-label={t('settings.interface.dark')}>
        <input id="cfg-theme-toggle" type="checkbox" checked={isDarkTheme} on:change={(e)=>applyThemePreference(e?.currentTarget?.checked ?? false)} />
        <span class="toggle-track"></span>
      </label>
    </div>
    
    <div class="row capture-method-row">
      <label for="cfg-capture-method">{t('screen.capture.method')}</label>
      <div class="capture-method-inline">
        <CustomSelect 
          bind:value={captureMethod} 
          options={captureMethodOptions} 
          onChange={(v) => { onChangeCaptureMethod(v); }} 
          disabled={isMobile}
        />
        <InfoIcon 
          title={t('screen.capture.info.title')}
          content={isMobile ? t('screen.capture.mobile.only') : (t('screen.capture.info.canvas') + '\n\n' + t('screen.capture.info.display'))}
          position="top"
        />
      </div>
    </div>

    <div class="row capture-method-row">
      <label for="cfg-color-detect-method">{t('color.detect.method')}</label>
      <div class="capture-method-inline">
        <CustomSelect 
          bind:value={colorDetectMethod}
          options={colorDetectMethodOptions}
          onChange={(v) => { onChangeColorDetectMethod(v); }}
        />
        <InfoIcon 
          title={t('color.detect.info.title')}
          content={t('color.detect.info.dom') + '\n\n' + t('color.detect.info.packets')}
          position="top"
        />
      </div>
    </div>
    <div class="color-section" role="group" aria-labelledby="color-section-label">
      <div class="color-label" id="color-section-label">{t('settings.enhancedBackground')}</div>
      <div class="color-presets">
        {#each bgColorPresets as preset}
          <button 
            class="color-preset" 
            class:active={cfg.enhancedBackgroundColor === preset.color}
            style="background-color: {preset.color};"
            title={preset.name}
            on:click={() => setPresetColor(preset.color)}
          >
            <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
          </button>
        {/each}
      </div>
      <div class="color-input-row">
        <button 
          class="color-preview" 
          style="background-color: {cfg.enhancedBackgroundColor};"
          title="Выбрать цвет"
          on:click={openColorPicker}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white" opacity="0.8">
            <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/>
          </svg>
        </button>
        <input 
          type="text" 
          class="color-hex-input" 
          bind:value={cfg.enhancedBackgroundColor} 
          on:input={(e)=>onChangeString('enhancedBackgroundColor', e)}
          placeholder="#000000 или rgba(0,0,0,1)"
        />
      </div>
      <div class="color-actions">
        <button class="editor-btn editor-primary" on:click={onReset}>{t('editor.reset')}</button>
      </div>
    </div>
    <div class="color-section" role="group" aria-labelledby="theme-section-label">
      <div class="color-label" id="theme-section-label">{t('settings.interface.title')}</div>
      <div class="quick-actions" role="group" aria-label={t('theme.modal.quick.actions')}>
        <button class="editor-btn qa-btn" title={t('settings.qr.anim.title')} aria-label={t('settings.qr.anim.title')} on:click={openQrAnimModal}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 0h2v2h-2v-2z" />
          </svg>
        </button>
        <button class="editor-btn qa-btn" title={t('theme.modal.quick.theme')} aria-label={t('theme.modal.quick.theme')} on:click={openThemeModal}>
          <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true">
            <circle cx="10" cy="12" r="2"/>
            <circle cx="16" cy="9" r="2"/>
            <circle cx="22" cy="12" r="2"/>
            <circle cx="23" cy="18" r="2"/>
            <circle cx="19" cy="23" r="2"/>
            <path d="M16.54,2A14,14,0,0,0,2,16a4.82,4.82,0,0,0,6.09,4.65l1.12-.31A3,3,0,0,1,13,23.24V27a3,3,0,0,0,3,3A14,14,0,0,0,30,15.46,14.05,14.05,0,0,0,16.54,2Zm8.11,22.31A11.93,11.93,0,0,1,16,28a1,1,0,0,1-1-1V23.24a5,5,0,0,0-5-5,5.07,5.07,0,0,0-1.33.18l-1.12.31A2.82,2.82,0,0,1,4,16,12,12,0,0,1,16.47,4,12.18,12.18,0,0,1,28,15.53,11.89,11.89,0,0,1,24.65,24.32Z"/>
          </svg>
        </button>
        <button class="editor-btn editor-primary qa-btn" title={t('idle.settings.open')} aria-label={t('idle.settings.open')} on:click={() => { showIdleModal = true; }}>
          <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M2,12v8a3,3,0,0,0,3,3h5V15H6v2H8v4H5a1,1,0,0,1-1-1V12a1,1,0,0,1,1-1h5V9H5A3,3,0,0,0,2,12Z"/>
            <polygon points="30 11 30 9 22 9 22 23 24 23 24 17 29 17 29 15 24 15 24 11 30 11"/>
            <polygon points="12 9 12 11 15 11 15 21 12 21 12 23 20 23 20 21 17 21 17 11 20 11 20 9 12 9"/>
          </svg>
        </button>
        <button class="editor-btn qa-btn qa-boot-btn" title={t('btn.bootSettings.title')} aria-label={t('btn.bootSettings.aria')} on:click={() => { showBootModal = true; }}>
          <svg class="boot-spinner" viewBox="0 0 50 50" width="18" height="18" aria-hidden="true">
            <circle class="boot-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
    
    
    <div class="section-divider"></div>
    
    <div class="tutorial-section">
      <div class="section-label">{t('tutorial.settings.restart')}</div>
      <div class="tutorial-hint">{t('tutorial.settings.restartHint')}</div>
      <button class="editor-btn editor-primary" on:click={() => { restartTutorial(); tutorialStore.restart(); open = false; }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
        {t('tutorial.settings.restart')}
      </button>
    </div>
  </div>
{/if}

<ThemeModal bind:open={showThemeModal} />
<IdleSettingsModal bind:open={showIdleModal} />
{#if showBootModal}
  <BootSettingsModal open on:close={()=>showBootModal=false} />
{/if}
{#if showScreenAccessModal}
  <ScreenAccessModal open={showScreenAccessModal} on:close={()=>showScreenAccessModal=false} />
{/if}
{#if showColorPicker}
  <div class="color-picker-backdrop" use:appendToBody on:click={closeColorPicker} role="button" tabindex="-1" on:keydown={(e)=>{if(e.key==='Escape')closeColorPicker();}}></div>
  <ColorPicker x={pickerX} y={pickerY} value={cfg.enhancedBackgroundColor}
    on:change={(e)=>{ cfg = updateAutoConfig({ enhancedBackgroundColor: e.detail.value }); triggerRedrawDebounced(); }}
    on:close={closeColorPicker} />
{/if}
<QrOverlayAnimModal bind:open={showQrAnimModal} />
</div>

<style>
  .tm-settings-wrap { position: relative; display: inline-block; }
  .tm-settings-popover {
    position: fixed;
    z-index: 1000011;
    min-width: 280px;
    max-width: min(420px, calc(100vw - 32px));
    max-height: min(calc(100vh * 0.67), calc(100vh - 120px));
    padding: 18px 20px 24px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.14);
    background: var(--wph-surface, rgba(8,8,12,0.92));
    box-shadow: 0 18px 40px rgba(0,0,0,0.45);
    color: #fff;
    font-size: 13px;
    line-height: 1.45;
    backdrop-filter: blur(6px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.35) transparent;
    transform-origin: top center;
    will-change: transform, opacity, filter, box-shadow;
    animation: wphSettingsPopIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .tm-settings-popover > * {
    opacity: 0;
    will-change: transform, opacity;
    animation: wphSettingsItemIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: 45ms;
  }
  .tm-settings-popover > :nth-child(1) { animation-delay: 45ms; }
  .tm-settings-popover > :nth-child(2) { animation-delay: 72ms; }
  .tm-settings-popover > :nth-child(3) { animation-delay: 99ms; }
  .tm-settings-popover > :nth-child(4) { animation-delay: 126ms; }
  .tm-settings-popover > :nth-child(5) { animation-delay: 153ms; }
  .tm-settings-popover > :nth-child(6) { animation-delay: 180ms; }
  .tm-settings-popover > :nth-child(7) { animation-delay: 207ms; }
  .tm-settings-popover > :nth-child(8) { animation-delay: 234ms; }
  .tm-settings-popover > :nth-child(9) { animation-delay: 261ms; }
  .tm-settings-popover > :nth-child(10) { animation-delay: 288ms; }
  .tm-settings-popover > :nth-child(11) { animation-delay: 315ms; }
  .tm-settings-popover > :nth-child(12) { animation-delay: 342ms; }
  .tm-settings-popover > :nth-child(13) { animation-delay: 369ms; }
  .tm-settings-popover > :nth-child(14) { animation-delay: 396ms; }
  .tm-settings-popover > :nth-child(15) { animation-delay: 423ms; }
  .tm-settings-popover > :nth-child(16) { animation-delay: 450ms; }
  .tm-settings-popover > :nth-child(17) { animation-delay: 477ms; }
  .tm-settings-popover > :nth-child(18) { animation-delay: 504ms; }
  .tm-settings-popover > :nth-child(19) { animation-delay: 531ms; }
  .tm-settings-popover > :nth-child(20) { animation-delay: 558ms; }
  .tm-settings-popover > :nth-child(21) { animation-delay: 585ms; }
  .tm-settings-popover > :nth-child(22) { animation-delay: 612ms; }
  .tm-settings-popover > :nth-child(23) { animation-delay: 639ms; }
  .tm-settings-popover > :nth-child(24) { animation-delay: 666ms; }
  .tm-settings-popover > :nth-child(25) { animation-delay: 693ms; }

  @keyframes wphSettingsPopIn {
    0% { opacity: 0; transform: translateY(-18px) scale(0.96); filter: blur(10px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); }
    60% { opacity: 1; transform: translateY(0) scale(1.02); filter: blur(0); box-shadow: 0 22px 52px rgba(0,0,0,0.55); }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); box-shadow: 0 18px 40px rgba(0,0,0,0.45); }
  }

  @keyframes wphSettingsItemIn {
    0% { opacity: 0; transform: translateY(16px) scale(0.985); }
    70% { opacity: 1; transform: translateY(0) scale(1.01); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .tm-settings-popover { animation: none; }
    .tm-settings-popover > * { animation: none; opacity: 1; }
  }

  .tm-settings-popover::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .tm-settings-popover::-webkit-scrollbar-track {
    background: var(--wph-surface, rgba(255,255,255,0.08));
    border-radius: 8px;
  }

  .tm-settings-popover::-webkit-scrollbar-thumb {
    background: var(--wph-border, rgba(255,255,255,0.35));
    border-radius: 8px;
  }

  .tm-settings-popover::-webkit-scrollbar-thumb:hover {
    background: var(--wph-border, rgba(255,255,255,0.4));
  }

  .tm-settings-popover::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
    background: transparent;
    border: 0;
  }

  @media (max-width: 720px), (hover: none) and (pointer: coarse) {
    .tm-settings-popover {
      width: min(520px, calc(100vw - 24px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)));
      max-width: calc(100vw - 24px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px));
      max-height: calc(100dvh - 112px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
      padding: 16px 16px calc(18px + env(safe-area-inset-bottom, 0px));
      border-radius: 16px;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-gutter: stable;
    }
    .tm-settings-popover::-webkit-scrollbar { width: 6px; height: 6px; }
    .tm-settings-popover .row { grid-template-columns: 1fr 120px; }
    .tm-settings-popover .row.bm-mode-row { grid-template-columns: 1fr; gap: 8px; align-items: stretch; }
    .tm-settings-popover .row.bm-mode-row label { white-space: normal; }
  }

  .tm-settings-popover {
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.35) transparent;
  }
  .tm-settings-popover .title {
    font-weight: 600;
    margin-bottom: 10px;
  }
  .tm-settings-popover .row {
    display: grid;
    grid-template-columns: 1fr 110px;
    gap: 10px;
    align-items: center;
    margin: 8px 0;
  }

  .label-with-info {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .btn-with-info {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tm-settings-popover .row.bm-mode-row {
    grid-template-columns: max-content 1fr;
  }

  .tm-settings-popover .row.bm-mode-row label {
    white-space: nowrap;
  }


  .tm-settings-popover .row.toggle-row {
    grid-template-columns: 1fr auto;
  }

  .tm-settings-popover .row.send-effect-row {
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: center;
  }

  

  .tm-settings-popover .row.toggle-row label {
    margin-bottom: 0;
  }

  .tm-settings-popover .send-test-btn {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.07);
    color: #fff;
    cursor: pointer;
    transition: background .15s ease;
  }

  .tm-settings-popover .send-test-btn:hover {
    background: rgba(255,255,255,0.12);
  }

  .toggle-control {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .toggle-control input[type="checkbox"] {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .toggle-track {
    width: 40px;
    height: 22px;
    background: rgba(255,255,255,0.2);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.25);
    transition: all .2s ease;
    position: relative;
  }

  .toggle-track::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: all .2s ease;
    transform: translateY(-50%);
  }

  .toggle-control input:checked + .toggle-track {
    background: var(--wph-primary, #f05123);
    border-color: var(--wph-primary, #f05123);
  }

  .toggle-control input:checked + .toggle-track::after {
    transform: translate(18px, -50%);
  }
  .tm-settings-popover .row label { font-size: 12px; opacity: 0.95; }
  .tm-settings-popover input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .tm-settings-popover input[type="number"]::-webkit-outer-spin-button,
  .tm-settings-popover input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .tm-settings-popover input {
    width: 100%;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--wph-border, rgba(255,255,255,0.14));
    background: var(--wph-surface, rgba(255,255,255,0.06));
    color: inherit;
    outline: none;
    transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
  }
  .tm-settings-popover input:hover { background: var(--wph-surface2, rgba(255,255,255,0.1)); }
  .tm-settings-popover input:focus,
  .tm-settings-popover input:focus-visible {
    border-color: var(--wph-primary, #f05123);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #f05123) 35%, transparent);
  }
  
  .tm-settings-popover .color-section {
    margin: 12px 0;
    padding: 12px;
    border-radius: 10px;
    background: var(--wph-surface, rgba(255,255,255,0.03));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.08));
  }
  .tm-settings-popover .color-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 10px;
    opacity: 0.95;
  }
  .tm-settings-popover .quick-actions { display: flex; gap: 8px; }
  .tm-settings-popover .editor-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .tm-settings-popover .editor-btn.editor-primary { background: var(--wph-primary, #f05123); border-color: rgba(255,255,255,0.25); }
  .tm-settings-popover .qa-btn { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 0; }

  .tm-settings-popover .qa-boot-btn .boot-spinner { display: block; animation: bootSpinnerRotate 1.35s linear infinite; }
  .tm-settings-popover .qa-boot-btn .boot-spinner-path { stroke-dasharray: 1, 200; stroke-dashoffset: 0; animation: bootSpinnerDash 1.35s ease-in-out infinite; }

  @keyframes bootSpinnerRotate { 100% { transform: rotate(360deg); } }
  @keyframes bootSpinnerDash {
    0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
    50% { stroke-dasharray: 90, 200; stroke-dashoffset: -35; }
    100% { stroke-dasharray: 90, 200; stroke-dashoffset: -125; }
  }
  .tm-settings-popover .color-presets {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .tm-settings-popover .color-actions { margin-top: 16px; }
  
  .tm-settings-popover .capture-method-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .tm-settings-popover .capture-method-inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tm-settings-popover .color-preset {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 2px solid var(--wph-border, rgba(255,255,255,0.2));
    cursor: pointer;
    transition: all .2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .tm-settings-popover .color-preset:hover {
    transform: scale(1.1);
    border-color: var(--wph-border, rgba(255,255,255,0.4));
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .tm-settings-popover .color-preset .ants {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0;
    left: 0;
    top: 0;
  }
  .tm-settings-popover .color-preset .ants path {
    stroke: var(--wph-primary, #f3734d);
    stroke-width: 2.5;
    stroke-linecap: butt;
    stroke-linejoin: round;
    stroke-dasharray: 6 6;
    stroke-dashoffset: 0;
    filter: drop-shadow(0 0 3px var(--wph-primaryGlow, rgba(240,81,35,0.8)));
    vector-effect: non-scaling-stroke;
  }
  .tm-settings-popover .color-preset.active .ants {
    opacity: 1;
  }
  @keyframes antsRun {
    to { stroke-dashoffset: -12; }
  }
  .tm-settings-popover .color-preset.active .ants path {
    animation: antsRun 1.2s linear infinite;
  }
  .tm-settings-popover .color-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tm-settings-popover .color-preview {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 2px solid var(--wph-border, rgba(255,255,255,0.2));
    flex-shrink: 0;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: all .2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: 0;
  }
  .tm-settings-popover .color-preview:hover {
    transform: scale(1.05);
    border-color: var(--wph-border, rgba(255,255,255,0.4));
    box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .tm-settings-popover .color-hex-input {
    flex: 1;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--wph-border, rgba(255,255,255,0.14));
    background: var(--wph-surface, rgba(255,255,255,0.06));
    color: inherit;
    font-size: 13px;
    text-transform: uppercase;
    outline: none;
    transition: all .15s ease;
  }
  .tm-settings-popover .color-hex-input:hover { 
    background: var(--wph-surface2, rgba(255,255,255,0.1)); 
    border-color: var(--wph-border, rgba(255,255,255,0.2));
  }
  .tm-settings-popover .color-hex-input:focus { 
    border-color: var(--wph-primary, #f05123); 
    box-shadow: 0 0 0 2px var(--wph-primaryGlow, rgba(240,81,35,0.2));
  }
  
  

  .section-divider {
    height: 1px;
    background: var(--wph-border, rgba(255, 255, 255, 0.1));
    margin: 20px 0;
  }

  .tutorial-section {
    margin-top: 16px;
  }

  .tutorial-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin: 8px 0 12px;
  }
  .tm-settings-popover .tutorial-section .editor-btn { display: inline-flex; align-items: center; gap: 6px; }
</style>
