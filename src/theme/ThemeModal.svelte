<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { themeStore, setPreset, setPrimary } from './store';
  import { listPresetNames, getPreset } from './presets';
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  import { t } from '../i18n';
  import ColorPicker from '../ui/ColorPicker.svelte';

  export let open = false;
  
  const dispatch = createEventDispatcher();
  
  let presets = [];
  let selectedPreset = '';
  let customThemes = [];
  let editingCustom = false;
  let customName = '';
  let customPrimary = '#f05123';
  let customPrimary2 = '#ff6b3d';
  let customSurface = '#111111';
  let customSurface2 = '#1a1a1a';
  let customBorder = '#333333';
  let customBg = '#0a0a0a';
  
  let tabActive = 'presets';
  let showColorPicker = false;
  let pickerX = 0;
  let pickerY = 0;
  let pickerTarget = '';
  $: pickerValue = pickerTarget === 'customPrimary' ? customPrimary
    : pickerTarget === 'customPrimary2' ? customPrimary2
    : pickerTarget === 'customSurface' ? customSurface
    : pickerTarget === 'customSurface2' ? customSurface2
    : pickerTarget === 'customBorder' ? customBorder
    : '#ffffff';
  function openColorPicker(target, ev) {
    try {
      const rect = ev.currentTarget.getBoundingClientRect();
      const W = Math.max(0, window.innerWidth || 0);
      const H = Math.max(0, window.innerHeight || 0);
      const pad = 10;
      const pickerWidth = 260;
      const pickerHeight = 420;
      let px = rect.left;
      let py = rect.bottom + 8;
      if (px + pickerWidth > W - pad) px = Math.max(pad, W - pickerWidth - pad);
      if (py + pickerHeight > H - pad) py = Math.max(60 + pad, H - pickerHeight - pad);
      pickerX = px; pickerY = py; pickerTarget = target; showColorPicker = true;
    } catch {}
  }
  function closePicker() { showColorPicker = false; }
  function applyPickerValue(val) {
    if (pickerTarget === 'customPrimary') customPrimary = val;
    else if (pickerTarget === 'customPrimary2') customPrimary2 = val;
    else if (pickerTarget === 'customSurface') customSurface = val;
    else if (pickerTarget === 'customSurface2') customSurface2 = val;
    else if (pickerTarget === 'customBorder') customBorder = val;
  }
  
  $: selectedPreset = $themeStore?.preset || 'orange';
  
  function loadPresets() {
    const names = listPresetNames();
    presets = names.map(name => {
      const preset = getPreset(name);
      return {
        name,
        primary: preset?.primary || '#f05123',
        label: name
      };
    });
  }
  
  function loadCustomThemes() {
    try {
      const saved = localStorage.getItem('wph_custom_themes');
      if (saved) {
        customThemes = JSON.parse(saved);
      }
    } catch {}
  }
  
  function saveCustomThemes() {
    try {
      localStorage.setItem('wph_custom_themes', JSON.stringify(customThemes));
    } catch {}
  }
  
  function selectPreset(name) {
    setPreset(name);
    const preset = getPreset(name);
    if (preset?.primary) {
      setPrimary(preset.primary, name);
    }
  }
  
  function startEditCustom() {
    editingCustom = true;
    customName = '';
    customPrimary = $themeStore?.primary || '#f05123';
    const preset = getPreset($themeStore?.preset);
    if (preset) {
      customPrimary2 = preset.primary2 || '#ff6b3d';
    }
    customSurface = '#111111';
    customSurface2 = '#1a1a1a';
    customBorder = '#333333';
    customBg = '#0a0a0a';
  }
  
  function cancelEditCustom() {
    editingCustom = false;
    customName = '';
  }
  
  function saveCustomTheme() {
    if (!customName.trim()) return;
    
    const newTheme = {
      id: Date.now().toString(),
      name: customName.trim(),
      primary: customPrimary,
      primary2: customPrimary2,
      surface: customSurface,
      surface2: customSurface2,
      border: customBorder,
      bg: customBg,
      timestamp: Date.now()
    };
    
    customThemes = [...customThemes, newTheme];
    saveCustomThemes();
    editingCustom = false;
    customName = '';
  }
  
  function applyCustomTheme(theme) {
    const el = document.documentElement;
    if (theme.primary) el.style.setProperty('--wph-primary', theme.primary);
    if (theme.primary2) el.style.setProperty('--wph-primary2', theme.primary2);
    if (theme.surface) el.style.setProperty('--wph-surface', theme.surface);
    if (theme.surface2) el.style.setProperty('--wph-surface2', theme.surface2);
    if (theme.border) el.style.setProperty('--wph-border', theme.border);
    if (theme.text) el.style.setProperty('--wph-text', theme.text);
    if (theme.bg) el.style.setProperty('--wph-bg', theme.bg);
    setPrimary(theme.primary, 'custom');
  }
  
  function deleteCustomTheme(id) {
    customThemes = customThemes.filter(t => t.id !== id);
    saveCustomThemes();
  }
  
  function close() {
    open = false;
    dispatch('close');
  }
  
  onMount(() => {
    loadPresets();
    loadCustomThemes();
  });
  
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0.5;
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
</script>

{#if open}
  <div use:appendToBody class="theme-backdrop" role="button" tabindex="0" 
       on:click={close} 
       on:keydown={(e) => { if (e.key === 'Escape') close(); }}>
  </div>
  <div use:appendToBody class="theme-modal" role="dialog" aria-modal="true" aria-label={t('theme.modal.title')}>
    <div class="theme-header">
      <div class="header-content">
        <h2>{t('theme.modal.title')}</h2>
        <div class="current-theme-badge" style="background: linear-gradient(135deg, {$themeStore?.primary || '#f05123'} 0%, {$themeStore?.primary || '#f05123'} 100%);">
          <span style="color: {getLuminance($themeStore?.primary || '#f05123') > 0.5 ? '#000' : '#fff'}">
            {$themeStore?.preset || 'custom'}
          </span>
        </div>
      </div>
      <button class="close-btn" type="button" aria-label={t('btn.close')} on:click={close}>×</button>
    </div>

    <div class="theme-tabs">
      <button 
        class="tab-btn" 
        class:active={tabActive === 'presets'}
        on:click={() => tabActive = 'presets'}
      >
        {t('theme.modal.tab.presets')}
      </button>
      <button 
        class="tab-btn" 
        class:active={tabActive === 'custom'}
        on:click={() => tabActive = 'custom'}
      >
        {t('theme.modal.tab.custom')}
      </button>
    </div>
    
    <div class="theme-body">
      {#if tabActive === 'presets'}
        <div class="presets-grid">
          {#each presets as preset}
            <button 
              class="preset-card" 
              class:selected={selectedPreset === preset.name}
              on:click={() => selectPreset(preset.name)}
            >
              <div class="preset-preview" style="background: linear-gradient(135deg, {preset.primary} 0%, {preset.primary} 100%);">
                <div class="preview-check" style="color: {getLuminance(preset.primary) > 0.5 ? '#000' : '#fff'}">
                  {#if selectedPreset === preset.name}
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  {/if}
                </div>
              </div>
              <div class="preset-name">{preset.label}</div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="custom-section">
          {#if !editingCustom}
            <button class="btn-create" on:click={startEditCustom}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              {t('theme.modal.custom.create')}
            </button>
          {:else}
            <div class="custom-editor">
              <div class="editor-header">
                <h3>{t('theme.modal.custom.new')}</h3>
              </div>
              
              <div class="editor-layout">
                <div class="editor-fields">
                  <div class="editor-field">
                    <label for="custom-name">{t('theme.modal.custom.name')}</label>
                    <input 
                      id="custom-name"
                      type="text" 
                      bind:value={customName} 
                      placeholder={t('theme.modal.custom.namePlaceholder')}
                      maxlength="30"
                    />
                  </div>
                  
                  <div class="editor-field">
                    <label for="custom-primary">{t('theme.modal.custom.accent')}</label>
                    <div class="color-input-group">
                      <button 
                        class="color-preview" 
                        style="background-color: {customPrimary};"
                        title={t('common.pick')}
                        on:click={(e)=>openColorPicker('customPrimary', e)}
                      ></button>
                      <input 
                        type="text" 
                        bind:value={customPrimary}
                        placeholder="#f05123"
                        class="color-hex"
                      />
                    </div>
                  </div>
                  
                  <div class="editor-field">
                    <label for="custom-primary2">{t('theme.modal.custom.accent2')}</label>
                    <div class="color-input-group">
                      <button 
                        class="color-preview" 
                        style="background-color: {customPrimary2};"
                        title={t('common.pick')}
                        on:click={(e)=>openColorPicker('customPrimary2', e)}
                      ></button>
                      <input 
                        type="text" 
                        bind:value={customPrimary2}
                        placeholder="#ff6b3d"
                        class="color-hex"
                      />
                    </div>
                  </div>
                  
                  <div class="editor-field">
                    <label for="custom-surface">{t('theme.modal.custom.surface')}</label>
                    <div class="color-input-group">
                      <button 
                        class="color-preview" 
                        style="background-color: {customSurface};"
                        title={t('common.pick')}
                        on:click={(e)=>openColorPicker('customSurface', e)}
                      ></button>
                      <input 
                        type="text" 
                        bind:value={customSurface}
                        placeholder="#111111"
                        class="color-hex"
                      />
                    </div>
                  </div>
                  
                  <div class="editor-field">
                    <label for="custom-border">{t('theme.modal.custom.border')}</label>
                    <div class="color-input-group">
                      <button 
                        class="color-preview" 
                        style="background-color: {customBorder};"
                        title={t('common.pick')}
                        on:click={(e)=>openColorPicker('customBorder', e)}
                      ></button>
                      <input 
                        type="text" 
                        bind:value={customBorder}
                        placeholder="#333333"
                        class="color-hex"
                      />
                    </div>
                  </div>
                  
                  
                </div>
                
                <div class="editor-preview">
                  <div class="preview-label">{t('theme.modal.custom.preview')}</div>
                  <div class="preview-card" style="background: {customSurface}; border-color: {customBorder};">
                    <div class="preview-header" style="background: linear-gradient(135deg, {customPrimary} 0%, {customPrimary2} 100%);">
                      <span style="color: {getLuminance(customPrimary) > 0.5 ? '#000' : '#fff'}">{t('theme.modal.custom.preview.title')}</span>
                    </div>
                    <div class="preview-body">
                      <div class="preview-text">{t('theme.modal.custom.preview.text')}</div>
                      <button class="preview-btn" style="background: {customPrimary}; color: {getLuminance(customPrimary) > 0.5 ? '#000' : '#fff'}">
                        {t('theme.modal.custom.preview.button')}
                      </button>
                      <div class="preview-panel" style="background: {customSurface2}; border-color: {customBorder}; color: #fff;">
                        {t('theme.modal.custom.preview.panel')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="editor-actions">
                <button class="btn btn-secondary" on:click={cancelEditCustom}>{t('common.cancel')}</button>
                <button class="btn btn-primary" on:click={saveCustomTheme} disabled={!customName.trim()}>{t('common.save')}</button>
              </div>
            </div>
          {/if}
          
          {#if customThemes.length > 0}
            <div class="custom-list">
              <h3>{t('theme.modal.custom.saved')}</h3>
              <div class="custom-grid">
                {#each customThemes as theme (theme.id)}
                  <div class="custom-card">
                    <button 
                      class="custom-preview" 
                      style="background: linear-gradient(135deg, {theme.primary} 0%, {theme.primary2 || theme.primary} 100%);"
                      on:click={() => applyCustomTheme(theme)}
                    >
                      <div class="custom-check" style="color: {getLuminance(theme.primary) > 0.5 ? '#000' : '#fff'}">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    </button>
                    <div class="custom-info">
                      <div class="custom-name">{theme.name}</div>
                      <button 
                        class="btn-delete" 
                        on:click={() => deleteCustomTheme(theme.id)}
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  {#if showColorPicker}
    <div class="color-picker-backdrop" use:appendToBody on:click={closePicker} role="button" tabindex="0" on:keydown={(e)=>{ if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') closePicker(); }}></div>
    <ColorPicker x={pickerX} y={pickerY} value={pickerValue} on:change={(e)=>{ applyPickerValue(e.detail.value); }} on:close={closePicker} />
  {/if}
{/if}

<style>
  .theme-backdrop {
    position: fixed;
    inset: 0;
    background: var(--wph-backdrop, rgba(0,0,0,0.5));
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .theme-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 800px;
    max-height: 80vh;
    background: var(--wph-surface, rgba(17,17,17,0.98));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 16px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .theme-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1));
    background: var(--wph-surface2, rgba(255,255,255,0.03));
  }
  
  .header-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .theme-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--wph-text, #fff);
  }
  
  .current-theme-badge {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  
  .current-theme-badge span {
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: var(--wph-surface, rgba(255,255,255,0.06));
    color: var(--wph-text, #fff);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.12));
    transform: scale(1.05);
  }
  
  .theme-tabs {
    display: flex;
    gap: 4px;
    padding: 16px 24px 0;
    border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.08));
  }
  
  .tab-btn {
    padding: 10px 20px;
    background: transparent;
    border: none;
    color: var(--wph-muted, rgba(255,255,255,0.6));
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    position: relative;
    bottom: -1px;
  }
  
  .tab-btn:hover {
    color: var(--wph-text, #fff);
  }
  
  .tab-btn.active {
    color: var(--wph-primary, #f05123);
    border-bottom-color: var(--wph-primary, #f05123);
  }
  
  .theme-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  
  .presets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }
  
  .preset-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--wph-surface, rgba(255,255,255,0.04));
    border: 2px solid var(--wph-border, rgba(255,255,255,0.1));
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .preset-card:hover {
    border-color: var(--wph-border, rgba(255,255,255,0.3));
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  }
  
  .preset-card.selected {
    border-color: var(--wph-primary, #f05123);
    box-shadow: 0 0 0 3px var(--wph-primaryGlow, rgba(240,81,35,0.3));
  }
  
  .preset-preview {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  
  .preview-check {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .preset-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--wph-text, #fff);
    text-align: center;
  }
  
  .custom-section {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .btn-create {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: var(--wph-primary, #f05123);
    color: var(--wph-onPrimary, #fff);
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px var(--wph-primaryGlow, rgba(240,81,35,0.3));
  }
  
  .btn-create:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px var(--wph-primaryGlow, rgba(240,81,35,0.4));
  }
  
  .custom-editor {
    background: var(--wph-surface, rgba(255,255,255,0.04));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.1));
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .editor-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--wph-text, #fff);
  }
  
  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .editor-field label {
    font-size: 13px;
    font-weight: 600;
    color: var(--wph-text, rgba(255,255,255,0.9));
  }
  
  .editor-field input[type="text"] {
    padding: 10px 12px;
    background: var(--wph-surface, rgba(255,255,255,0.06));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 8px;
    color: var(--wph-text, #fff);
    font-size: 14px;
    outline: none;
    transition: all 0.15s ease;
  }
  
  .editor-field input[type="text"]:focus {
    border-color: var(--wph-primary, #f05123);
    box-shadow: 0 0 0 3px var(--wph-primaryGlow, rgba(240,81,35,0.2));
  }
  
  .color-input-group {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  
  
  .color-hex {
    flex: 1;
    padding: 10px 12px;
    background: var(--wph-surface, rgba(255,255,255,0.06));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 8px;
    color: var(--wph-text, #fff);
    font-size: 14px;
    text-transform: uppercase;
    outline: none;
    transition: all 0.15s ease;
  }
  
  .color-hex:focus {
    border-color: var(--wph-primary, #f05123);
    box-shadow: 0 0 0 3px var(--wph-primaryGlow, rgba(240,81,35,0.2));
  }
  .color-preview {
    width: 48px;
    height: 40px;
    border-radius: 8px;
    border: 2px solid var(--wph-border, rgba(255,255,255,0.2));
    cursor: pointer;
    background: transparent;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .color-preview:hover { transform: scale(1.05); border-color: var(--wph-border, rgba(255,255,255,0.4)); }
  
  .editor-layout {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 24px;
    margin: 16px 0;
  }
  
  .editor-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .editor-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .preview-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--wph-text, rgba(255,255,255,0.9));
  }
  
  .preview-card {
    border: 2px solid;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  
  .preview-header {
    padding: 12px;
    font-weight: 600;
    font-size: 14px;
    text-align: center;
  }
  
  .preview-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .preview-text {
    font-size: 13px;
    opacity: 0.9;
  }
  
  .preview-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }
  
  .preview-panel {
    padding: 12px;
    border: 1px solid;
    border-radius: 8px;
    font-size: 12px;
    text-align: center;
  }
  
  .editor-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 8px;
  }
  
  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }
  
  .btn-secondary {
    background: var(--wph-surface, rgba(255,255,255,0.08));
    color: var(--wph-text, #fff);
    border: 1px solid var(--wph-border, rgba(255,255,255,0.2));
  }
  
  .btn-secondary:hover {
    background: var(--wph-surface2, rgba(255,255,255,0.12));
  }
  
  .btn-primary {
    background: var(--wph-primary, #f05123);
    color: var(--wph-onPrimary, #fff);
    box-shadow: 0 2px 8px var(--wph-primaryGlow, rgba(240,81,35,0.3));
  }
  
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px var(--wph-primaryGlow, rgba(240,81,35,0.4));
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .custom-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .custom-list h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--wph-text, #fff);
  }
  
  .custom-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }
  
  .custom-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--wph-surface, rgba(255,255,255,0.04));
    border: 1px solid var(--wph-border, rgba(255,255,255,0.1));
    border-radius: 12px;
    padding: 12px;
    transition: all 0.2s ease;
  }
  
  .custom-card:hover {
    border-color: var(--wph-border, rgba(255,255,255,0.3));
    transform: translateY(-2px);
  }
  
  .custom-preview {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .custom-preview:hover {
    transform: scale(1.05);
  }
  
  .custom-check {
    display: none;
  }
  
  .custom-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  
  .custom-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--wph-text, #fff);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .btn-delete {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: var(--wph-surface, rgba(255,255,255,0.06));
    color: var(--wph-error, #ff4444);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  
  .btn-delete:hover {
    background: var(--wph-error, #ff4444);
    color: #fff;
    transform: scale(1.05);
  }
  .color-picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000020;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(2px);
  }
</style>
