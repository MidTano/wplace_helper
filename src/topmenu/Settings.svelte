<script>
  import { onMount, tick } from 'svelte';
  import { getAutoConfig, updateAutoConfig, resetAutoConfig } from '../screen/autoConfig';
  import { t, lang } from '../i18n';
  import { getStencilManager } from '../template/stencilManager';
  import CustomSelect from '../editor/CustomSelect.svelte';

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
  
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 8, g: 8, b: 8 };
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

  function onChangeNumber(key, ev) {
    const v = Number(ev?.currentTarget?.value || ev?.target?.value || 0) || 0;
    cfg = updateAutoConfig({ [key]: v });
  }
  function onChangeBool(key, ev) {
    const v = !!(ev?.currentTarget?.checked ?? ev?.target?.checked);
    cfg = updateAutoConfig({ [key]: v });
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
      const rgb = hexToRgb(cfg.enhancedBackgroundColor || '#080808');
      pickerR = rgb.r;
      pickerG = rgb.g;
      pickerB = rgb.b;
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      pickerH = hsv.h;
      pickerS = hsv.s;
      pickerV = hsv.v;
      
      const rect = ev.currentTarget.getBoundingClientRect();
      pickerX = rect.left;
      pickerY = rect.bottom + 8;
      showColorPicker = true;
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
          window.dispatchEvent(new CustomEvent('wplace:redraw-tiles'));
        }
      } catch {}
    }, 1000);
  }
  function onReset() {
    cfg = resetAutoConfig();
  }

  function portal(node) {
    try { document.body.appendChild(node); } catch {}
    return { destroy() { try { node.remove(); } catch {} } };
  }

  async function updatePosition() {
    try {
      await tick();
      const r = btnEl?.getBoundingClientRect?.();
      const W = Math.max(0, window.innerWidth || 0);
      const pad = 10;
      const mwRaw = popEl?.offsetWidth || 0;
      const mhRaw = popEl?.offsetHeight || 0;
      const mw = Math.max(260, mwRaw || 300);
      const nx = Math.max(pad, Math.min(Math.round((r?.left || 0) + (r?.width || 0)/2 - mw/2), W - mw - pad));
      const ny = Math.round((r?.bottom || 0) + 8);
      posX = nx; posY = ny;
    } catch {}
  }

  onMount(() => {
    cfg = getAutoConfig();
    try { window.addEventListener('resize', updatePosition); } catch {}
    return () => { try { window.removeEventListener('resize', updatePosition); } catch {} };
  });
  $: if (open) { updatePosition(); }
  
  $: _i18n_settings_lang = $lang;
  $: L_settings = ($lang, t('btn.settings'));
</script>

<div class="tm-settings-wrap" role="group">
<button bind:this={btnEl} class="tm-fab" aria-label={L_settings} data-label={L_settings} aria-expanded={open} aria-controls="tm-settings-popover" on:click={toggle}>
  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
    <path d="M27,16.76c0-.25,0-.5,0-.76s0-.51,0-.77l1.92-1.68A2,2,0,0,0,29.3,11L26.94,7a2,2,0,0,0-1.73-1,2,2,0,0,0-.64.1l-2.43.82a11.35,11.35,0,0,0-1.31-.75l-.51-2.52a2,2,0,0,0-2-1.61H13.64a2,2,0,0,0-2,1.61l-.51,2.52a11.48,11.48,0,0,0-1.32.75L7.43,6.06A2,2,0,0,0,6.79,6,2,2,0,0,0,5.06,7L2.7,11a2,2,0,0,0,.41,2.51L5,15.24c0,.25,0,.5,0,.76s0,.51,0,.77L3.11,18.45A2,2,0,0,0,2.7,21L5.06,25a2,2,0,0,0,1.73,1,2,2,0,0,0,.64-.1l2.43-.82a11.35,11.35,0,0,0,1.31.75l.51,2.52a2,2,0,0,0,2,1.61h4.72a2,2,0,0,0,2-1.61l.51-2.52a11.48,11.48,0,0,0,1.32-.75l2.42.82a2,2,0,0,0,.64.1,2,2,0,0,0,1.73-1L29.3,21a2,2,0,0,0-.41-2.51ZM25.21,24l-3.43-1.16a8.86,8.86,0,0,1-2.71,1.57L18.36,28H13.64l-.71-3.55a9.36,9.36,0,0,1-2.7-1.57L6.79,24,4.43,20l2.72-2.4a8.9,8.9,0,0,1,0-3.13L4.43,12,6.79,8l3.43,1.16a8.86,8.86,0,0,1,2.71-1.57L13.64,4h4.72l.71,3.55a9.36,9.36,0,0,1,2.7,1.57L25.21,8,27.57,12l-2.72,2.4a8.9,8.9,0,0,1,0,3.13L27.57,20Z" />
    <path d="M16,22a6,6,0,1,1,6-6A5.94,5.94,0,0,1,16,22Zm0-10a3.91,3.91,0,0,0-4,4,3.91,3.91,0,0,0,4,4,3.91,3.91,0,0,0,4-4A3.91,3.91,0,0,0,16,12Z" />
  </svg>
</button>

{#if open}
  <div 
    use:portal 
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
      <label for="cfg-bm-mode">{t('settings.bm.mode')}</label>
      <CustomSelect 
        bind:value={cfg.bmMode}
        options={[
          { value: 'scan', label: t('settings.bm.mode.scan') },
          { value: 'random', label: t('settings.bm.mode.random') }
        ]}
        onChange={() => onChangeString('bmMode', { target: { value: cfg.bmMode } })}
      />
    </div>
    <div class="row">
      <label for="cfg-bm-batch">{t('settings.bm.batchLimit')}</label>
      <input id="cfg-bm-batch" type="number" min="0" step="1" bind:value={cfg.bmBatchLimit} on:input={(e)=>onChangeNumber('bmBatchLimit', e)} />
    </div>
    <div class="hint">{t('settings.bm.colorsHint')}</div>
    
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
          placeholder="#000000"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
    <div class="row" style="justify-content:end">
      <button class="btn btn-primary" on:click={onReset}>{t('editor.reset')}</button>
    </div>
    <div class="hint">{t('settings.hint.enhancedRequired')}</div>
  </div>
{/if}

{#if showColorPicker}
  <div class="color-picker-backdrop" use:portal on:click={closeColorPicker} role="button" tabindex="-1" on:keydown={(e)=>{if(e.key==='Escape')closeColorPicker();}}></div>
  <div class="custom-color-picker" use:portal style="left: {pickerX}px; top: {pickerY}px;">
    <div class="picker-header">
      <span>{t('settings.colorPicker.title')}</span>
      <button class="picker-close" on:click={closeColorPicker}>×</button>
    </div>
    
    <div class="picker-body">
      <div 
        class="picker-sv-area"
        style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl({pickerH}, 100%, 50%));"
        on:mousedown={handleSVMouseDown}
        on:mousemove={handleSVMouseMove}
        on:mouseup={handleSVMouseUp}
        on:mouseleave={handleSVMouseUp}
        role="slider"
        tabindex="0"
        aria-label="Выбор насыщенности и яркости"
        aria-valuenow="{Math.round(pickerS)}"
      >
        <div 
          class="picker-sv-cursor" 
          style="left: {pickerS}%; top: {100 - pickerV}%;"
        ></div>
      </div>
      
      <div class="picker-sliders">
        <div class="slider-row">
          <span class="slider-label">HUE</span>
          <input 
            type="range" 
            min="0" 
            max="360" 
            bind:value={pickerH} 
            on:input={updateColorFromHsv}
            class="color-slider hue-slider"
          />
        </div>
        
        <div class="slider-row">
          <span class="slider-label">R</span>
          <input 
            type="range" 
            min="0" 
            max="255" 
            bind:value={pickerR} 
            on:input={updateColorFromRgb}
            class="color-slider red-slider"
          />
          <input 
            type="number" 
            min="0" 
            max="255" 
            bind:value={pickerR} 
            on:input={updateColorFromRgb}
            class="color-input"
          />
        </div>
        
        <div class="slider-row">
          <span class="slider-label">G</span>
          <input 
            type="range" 
            min="0" 
            max="255" 
            bind:value={pickerG} 
            on:input={updateColorFromRgb}
            class="color-slider green-slider"
          />
          <input 
            type="number" 
            min="0" 
            max="255" 
            bind:value={pickerG} 
            on:input={updateColorFromRgb}
            class="color-input"
          />
        </div>
        
        <div class="slider-row">
          <span class="slider-label">B</span>
          <input 
            type="range" 
            min="0" 
            max="255" 
            bind:value={pickerB} 
            on:input={updateColorFromRgb}
            class="color-slider blue-slider"
          />
          <input 
            type="number" 
            min="0" 
            max="255" 
            bind:value={pickerB} 
            on:input={updateColorFromRgb}
            class="color-input"
          />
        </div>
      </div>
      
      <div class="picker-hex">
        <span class="hex-label">HEX</span>
        <span class="hex-value">{rgbToHex(pickerR, pickerG, pickerB)}</span>
      </div>
    </div>
  </div>
{/if}
</div>

<style>
  .tm-settings-wrap { position: relative; display: inline-block; }
  .tm-settings-popover {
    position: fixed;
    z-index: 1000003;
    min-width: 280px;
    max-width: 360px;
    padding: 12px;
    border-radius: 10px;
    background: rgba(17,17,17,0.96);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
    overflow: hidden;
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
  .tm-settings-popover .row label { font-size: 12px; opacity: 0.95; }
  .tm-settings-popover input {
    width: 100%;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: inherit;
    outline: none;
    transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
  }
  .tm-settings-popover input:hover { background: rgba(255,255,255,0.1); }
  .tm-settings-popover input:focus { border-color: rgba(255,255,255,0.28); box-shadow: 0 0 0 2px rgba(255,255,255,0.08) inset; }
  
  .tm-settings-popover .color-section {
    margin: 12px 0;
    padding: 12px;
    border-radius: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .tm-settings-popover .color-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 10px;
    opacity: 0.95;
  }
  .tm-settings-popover .color-presets {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .tm-settings-popover .color-preset {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.2);
    cursor: pointer;
    transition: all .2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .tm-settings-popover .color-preset:hover {
    transform: scale(1.1);
    border-color: rgba(255,255,255,0.4);
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
    stroke: #f3734d;
    stroke-width: 2.5;
    stroke-linecap: butt;
    stroke-linejoin: round;
    stroke-dasharray: 6 6;
    stroke-dashoffset: 0;
    filter: drop-shadow(0 0 3px rgba(240,81,35,0.8));
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
    border: 2px solid rgba(255,255,255,0.2);
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
    border-color: rgba(255,255,255,0.4);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .tm-settings-popover .color-hex-input {
    flex: 1;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: inherit;
    font-family: monospace;
    font-size: 13px;
    text-transform: uppercase;
    outline: none;
    transition: all .15s ease;
  }
  .tm-settings-popover .color-hex-input:hover { 
    background: rgba(255,255,255,0.1); 
    border-color: rgba(255,255,255,0.2);
  }
  .tm-settings-popover .color-hex-input:focus { 
    border-color: #f05123; 
    box-shadow: 0 0 0 2px rgba(240,81,35,0.2);
  }
  
  .tm-settings-popover .hint { margin-top: 10px; opacity: .8; font-size: 12px; }

  
  .tm-settings-popover .btn {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.07);
    color: #fff;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, filter .15s ease, transform .15s ease;
  }
  .tm-settings-popover .btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .tm-settings-popover .btn:disabled { opacity: .55; cursor: default; filter: none; transform: none; }
  .tm-settings-popover .btn.btn-primary {
    background: #f05123;
    border-color: rgba(255,255,255,0.25);
    color: #fff;
  }
  
  .color-picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000020;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(2px);
  }
  
  .custom-color-picker {
    position: fixed;
    z-index: 1000021;
    min-width: 240px;
    padding: 0;
    border-radius: 12px;
    background: rgba(20,20,20,0.98);
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 16px 40px rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    overflow: hidden;
  }
  
  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
  }
  
  .picker-header span {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.95;
  }
  
  .picker-close {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: rgba(255,255,255,0.06);
    color: #fff;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .15s ease;
  }
  
  .picker-close:hover {
    background: rgba(255,255,255,0.12);
    transform: scale(1.05);
  }
  
  .picker-body {
    padding: 16px;
  }
  
  .picker-sv-area {
    width: 100%;
    height: 180px;
    border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.2);
    position: relative;
    cursor: crosshair;
    margin-bottom: 16px;
    user-select: none;
    overflow: hidden;
  }
  
  .picker-sv-cursor {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4);
  }
  
  .picker-sliders {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .slider-row {
    display: grid;
    grid-template-columns: 35px 1fr 60px;
    gap: 10px;
    align-items: center;
  }
  
  .slider-row:first-child {
    grid-template-columns: 35px 1fr;
  }
  
  .slider-label {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.9;
  }
  
  .color-slider {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.3);
    cursor: pointer;
  }
  
  .color-slider::-webkit-slider-track {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    border: none;
  }
  
  .color-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 3px solid rgba(0,0,0,0.5);
    box-shadow: 0 3px 8px rgba(0,0,0,0.5);
    margin-top: -5px;
  }
  
  .color-slider::-moz-range-track {
    width: 100%;
    height: 10px;
    border-radius: 5px;
    border: none;
  }
  
  .color-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 3px solid rgba(0,0,0,0.5);
    box-shadow: 0 3px 8px rgba(0,0,0,0.5);
  }
  
  .red-slider {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.3);
  }
  
  .green-slider {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.3);
  }
  
  .blue-slider {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.3);
  }
  
  .hue-slider {
    background: linear-gradient(to right, 
      rgb(255,0,0) 0%, 
      rgb(255,255,0) 16.66%, 
      rgb(0,255,0) 33.33%, 
      rgb(0,255,255) 50%, 
      rgb(0,0,255) 66.66%, 
      rgb(255,0,255) 83.33%, 
      rgb(255,0,0) 100%);
    border: 2px solid rgba(255,255,255,0.5);
  }
  
  .color-input {
    width: 60px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.08);
    color: #fff;
    font-size: 13px;
    text-align: center;
    outline: none;
  }
  
  .color-input:focus {
    border-color: #f05123;
    box-shadow: 0 0 0 2px rgba(240,81,35,0.2);
  }
  
  .picker-hex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
  }
  
  .hex-label {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.8;
  }
  
  .hex-value {
    font-family: monospace;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    color: #f05123;
  }
  
</style>
