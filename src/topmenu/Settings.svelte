<script>
  import { onMount, tick } from 'svelte';
  import { getAutoConfig, updateAutoConfig, resetAutoConfig } from '../screen/autoConfig';
  import { t, lang } from '../i18n';
  import { getStencilManager } from '../template/stencilManager';
  import CustomSelect from '../editor/CustomSelect.svelte';
  import { tutorialStore } from '../tutorial/store/tutorialStore';
  import { restartTutorial } from '../tutorial/store/tutorialProgress';
  import { dispatchWGuardEvent, WGuardEvents } from '../wguard/core/events';
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  import ThemeModal from '../theme/ThemeModal.svelte';
  import IdleSettingsModal from '../idle/IdleSettingsModal.svelte';
  import { showToast } from '../ui/toast';
  import ColorPicker from '../ui/ColorPicker.svelte';
  import { postChannelMessage } from '../wguard/core/channel';

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
      const offset = 4;
      const radius = 8 + offset;
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

  function onChangeNumber(key, ev) {
    const v = Number(ev?.currentTarget?.value || ev?.target?.value || 0) || 0;
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
  }
  function onChangeString(key, ev) {
    const v = String(ev?.currentTarget?.value ?? ev?.target?.value ?? '');
    cfg = updateAutoConfig({ [key]: v });
    
    if (key === 'enhancedBackgroundColor') {
      triggerRedrawDebounced();
    }
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
      const pad = 10;
      const topMenuHeight = 110;
      const mwRaw = popEl?.offsetWidth || 0;
      const mhRaw = popEl?.offsetHeight || 0;
      const mw = Math.max(260, mwRaw || 300);
      const mh = mhRaw || 500;
      const nx = Math.max(pad, Math.min(Math.round((r?.left || 0) + (r?.width || 0)/2 - mw/2), W - mw - pad));
      let ny = Math.round((r?.bottom || 0) + 8);
      if (ny + mh > H - pad) {
        ny = Math.max(topMenuHeight + pad, H - mh - pad);
      }
      ny = Math.max(topMenuHeight + pad, ny);
      posX = nx; posY = ny;
    } catch {}
  }

  onMount(() => {
    cfg = getAutoConfig();
    try { postChannelMessage({ action: 'bm:setBypass', enabled: !!cfg.wguardBypassProtection }); } catch {}
    try { window.addEventListener('resize', updatePosition); } catch {}
    try { document.addEventListener('wph:idle:noFavorites', onIdleNoFav); } catch {}
    return () => { 
      try { window.removeEventListener('resize', updatePosition); } catch {}
      try { document.removeEventListener('wph:idle:noFavorites', onIdleNoFav); } catch {}
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
      <label for="cfg-series-wait">{t('settings.seriesWait')}</label>
      <input id="cfg-series-wait" type="number" min="0" step="1" bind:value={cfg.seriesWaitSec} on:input={(e)=>onChangeNumber('seriesWaitSec', e)} />
    </div>
    <div class="row">
      <label for="cfg-rand-extra">Случайная добавка (сек, 0=выкл)</label>
      <input id="cfg-rand-extra" type="number" min="0" step="1" bind:value={cfg.randomExtraWaitMaxSec} on:input={(e)=>onChangeNumber('randomExtraWaitMaxSec', e)} />
    </div>
    <div class="row vertical">
      <label for="cfg-bm-mode">{t('settings.bm.mode')}</label>
      <div class="field-control">
        <CustomSelect 
          bind:value={cfg.bmMode}
          showModePreview={true}
          options={[
            { value: 'random', label: t('settings.bm.mode.random') },
            { value: 'topDown', label: t('settings.bm.mode.topDown') },
            { value: 'bottomUp', label: t('settings.bm.mode.bottomUp') },
            { value: 'leftRight', label: t('settings.bm.mode.leftRight') },
            { value: 'rightLeft', label: t('settings.bm.mode.rightLeft') },
            { value: 'snakeRow', label: t('settings.bm.mode.snakeRow') },
            { value: 'snakeCol', label: t('settings.bm.mode.snakeCol') },
            { value: 'diagDown', label: t('settings.bm.mode.diagDown') },
            { value: 'diagUp', label: t('settings.bm.mode.diagUp') },
            { value: 'diagDownRight', label: t('settings.bm.mode.diagDownRight') },
            { value: 'diagUpRight', label: t('settings.bm.mode.diagUpRight') },
            { value: 'centerOut', label: t('settings.bm.mode.centerOut') },
            { value: 'edgesIn', label: t('settings.bm.mode.edgesIn') },
          ]}
          onChange={() => onChangeString('bmMode', { target: { value: cfg.bmMode } })}
        />
      </div>
    </div>
    <div class="row">
      <label for="cfg-bm-batch">{t('settings.bm.batchLimit')}</label>
      <input id="cfg-bm-batch" type="number" min="0" step="1" bind:value={cfg.bmBatchLimit} on:input={(e)=>onChangeNumber('bmBatchLimit', e)} />
    </div>
    <div class="row toggle-row">
      <label for="cfg-bm-multi">{t('settings.bm.multiColor')}</label>
      <label class="toggle-control" aria-label={t('settings.bm.multiColor')}>
        <input id="cfg-bm-multi" type="checkbox" checked={cfg.bmMultiColor} on:change={(e)=>onChangeBool('bmMultiColor', e)} />
        <span class="toggle-track"></span>
      </label>
    </div>
    <div class="row toggle-row">
      <label for="cfg-ignore-wrong">{t('settings.bm.ignoreWrong')}</label>
      <label class="toggle-control" aria-label={t('settings.bm.ignoreWrong')}>
        <input id="cfg-ignore-wrong" type="checkbox" checked={cfg.ignoreWrongColor} on:change={(e)=>onChangeBool('ignoreWrongColor', e)} />
        <span class="toggle-track"></span>
      </label>
    </div>
    <div class="row toggle-row">
      <label for="cfg-bypass-wguard">{t('settings.bm.bypassWguard')}</label>
      <label class="toggle-control" aria-label={t('settings.bm.bypassWguard')}>
        <input id="cfg-bypass-wguard" type="checkbox" checked={cfg.wguardBypassProtection} on:change={(e)=>onChangeBool('wguardBypassProtection', e)} />
        <span class="toggle-track"></span>
      </label>
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
      <div class="color-label" id="theme-section-label">Настройки интерфейса</div>
      <div class="quick-actions" role="group" aria-label="actions">
        <button class="editor-btn qa-btn" title="Тема" aria-label="Тема" on:click={openThemeModal}>
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

{#if showColorPicker}
  <div class="color-picker-backdrop" use:appendToBody on:click={closeColorPicker} role="button" tabindex="-1" on:keydown={(e)=>{if(e.key==='Escape')closeColorPicker();}}></div>
  <ColorPicker x={pickerX} y={pickerY} value={cfg.enhancedBackgroundColor}
    on:change={(e)=>{ cfg = updateAutoConfig({ enhancedBackgroundColor: e.detail.value }); triggerRedrawDebounced(); }}
    on:close={closeColorPicker} />
{/if}
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

  .tm-settings-popover .row.vertical {
    grid-template-columns: 1fr;
    gap: 6px;
    align-items: stretch;
  }

  .tm-settings-popover .row.vertical label {
    margin-bottom: 2px;
  }

  .tm-settings-popover .row.vertical .field-control {
    width: 100%;
  }

  .tm-settings-popover .row.vertical .field-control :global(.custom-select) {
    width: 100%;
  }

  .tm-settings-popover .row.toggle-row {
    grid-template-columns: 1fr auto;
  }

  .tm-settings-popover .row.toggle-row label {
    margin-bottom: 0;
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
    top: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: all .2s ease;
  }

  .toggle-control input:checked + .toggle-track {
    background: var(--wph-primary, #f05123);
    border-color: var(--wph-primary, #f05123);
  }

  .toggle-control input:checked + .toggle-track::after {
    transform: translateX(18px);
  }
  .tm-settings-popover .row label { font-size: 12px; opacity: 0.95; }
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
  .tm-settings-popover input:focus { border-color: var(--wph-border, rgba(255,255,255,0.28)); box-shadow: 0 0 0 2px var(--wph-surface, rgba(255,255,255,0.08)) inset; }
  
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
  .tm-settings-popover .color-presets {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .tm-settings-popover .color-actions { margin-top: 16px; }
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
    inset: -4px;
    width: calc(100% + 8px);
    height: calc(100% + 8px);
    pointer-events: none;
    opacity: 0;
    left: -4px;
    top: -4px;
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
  
  
  
  .color-picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000020;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(2px);
  }
</style>
