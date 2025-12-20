<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  import { t } from '../i18n';
  import { loadBootOverlaySettings, saveBootOverlaySettings } from './bootSettings';

  export let open = false;

  let enabled = true;
  let durationSec = 10;
  let disableSounds = false;
  let hideLoadButton = false;
  let initialized = false;

  $: if (open && !initialized) {
    const cfg = loadBootOverlaySettings();
    enabled = cfg.enabled;
    durationSec = cfg.durationSec;
    disableSounds = !!(cfg as any).disableSounds;
    hideLoadButton = !!(cfg as any).hideLoadButton;
    initialized = true;
  }
  $: if (!open && initialized) initialized = false;

  function close() { open = false; }

  function mark(node: HTMLElement) {
    try { (node as any).wguard = 'WGuard'; } catch {}
    return { destroy() {} };
  }

  function toggleEnabled(v: boolean) {
    enabled = v;
    saveBootOverlaySettings({ enabled });
  }

  function onDurationInput(v: number) {
    const val = Math.min(60, Math.max(5, Math.round(v || 0)));
    durationSec = val;
    saveBootOverlaySettings({ durationSec: val });
  }

  function toggleDisableSounds(v: boolean) {
    disableSounds = v;
    saveBootOverlaySettings({ disableSounds: v });
  }

  function toggleHideLoadButton(v: boolean) {
    hideLoadButton = v;
    if (hideLoadButton) {
      disableSounds = true;
      saveBootOverlaySettings({ hideLoadButton: true, disableSounds: true });
      return;
    }
    saveBootOverlaySettings({ hideLoadButton: false });
  }

  function handleInput(ev: Event) {
    const target = ev.currentTarget as HTMLInputElement | null;
    onDurationInput(Number(target?.value || 0));
  }
</script>

{#if open}
  <div use:appendToBody class="boot-backdrop" role="button" tabindex="0" on:click={close} on:keydown={(e)=>{if(e.key==='Escape')close();}}></div>
  <div use:appendToBody use:mark class="boot-modal" role="dialog" aria-modal="true" aria-label={t('boot.settings.title')}>
    <div class="boot-header">
      <div class="header-content">
        <h2>{t('boot.settings.title')}</h2>
      </div>
      <div class="header-actions">
        <label class="boot-toggle" aria-label={t('boot.settings.toggle.aria')}>
          <span class="toggle-text">{enabled ? t('boot.settings.state.on') : t('boot.settings.state.off')}</span>
          <input type="checkbox" checked={enabled} on:change={(e)=>toggleEnabled(e?.currentTarget?.checked ?? false)} />
          <span class="toggle-track"></span>
        </label>
        <button class="close-btn" type="button" aria-label={t('common.close')} on:click={close}>×</button>
      </div>
    </div>

    <div class="boot-body-anim">
      <div class="boot-body">
        <div class="form-grid">
          <label for="boot-duration">{t('boot.settings.duration.label')}</label>
          <input id="boot-duration" type="number" min="5" max="60" bind:value={durationSec} on:input={handleInput} />
        </div>
        <input class="slider" type="range" min="5" max="60" bind:value={durationSec} on:input={handleInput} style={`--min: 5; --max: 60; --val: ${durationSec};`} />
        <div class="hint">{t('boot.settings.duration.hint')}</div>

        <div class="toggles">
          <label
            class={`boot-toggle boot-toggle-row${hideLoadButton ? ' disabled' : ''}`}
            aria-label={t('boot.settings.sounds.aria')}
            title={hideLoadButton ? t('boot.settings.sounds.tooltip') : ''}
          >
            <span class="toggle-label">{t('boot.settings.sounds.label')}</span>
            <span class="toggle-right">
              <span class="toggle-text">{disableSounds ? t('boot.settings.state.on') : t('boot.settings.state.off')}</span>
              <input type="checkbox" checked={disableSounds} disabled={hideLoadButton} on:change={(e)=>toggleDisableSounds(e?.currentTarget?.checked ?? false)} />
              <span class="toggle-track"></span>
            </span>
          </label>

          <label class="boot-toggle boot-toggle-row" aria-label={t('boot.settings.hideLoad.aria')}>
            <span class="toggle-label">{t('boot.settings.hideLoad.label')}</span>
            <span class="toggle-right">
              <span class="toggle-text">{hideLoadButton ? t('boot.settings.state.on') : t('boot.settings.state.off')}</span>
              <input type="checkbox" checked={hideLoadButton} on:change={(e)=>toggleHideLoadButton(e?.currentTarget?.checked ?? false)} />
              <span class="toggle-track"></span>
            </span>
          </label>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .boot-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 2147483646; }
  .boot-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 92vw; max-width: 540px; background: rgba(12,12,16,0.96); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; box-shadow: 0 18px 52px rgba(0,0,0,0.65); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden; color: #fff; }
  .boot-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
  .boot-header h2 { margin: 0; font-size: 18px; font-weight: 700; }
  .header-actions { display: inline-flex; align-items: center; gap: 10px; }
  .boot-toggle { display: inline-flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); cursor: pointer; user-select: none; }
  .boot-toggle:hover { background: rgba(255,255,255,0.08); }
  .boot-toggle .toggle-text { font-size: 12px; font-weight: 600; opacity: 0.95; min-width: 34px; text-align: left; }
  .boot-toggle input[type="checkbox"] { opacity: 0; width: 0; height: 0; position: absolute; }
  .boot-toggle .toggle-track { width: 40px; height: 22px; background: rgba(255,255,255,0.2); border-radius: 14px; border: 1px solid rgba(255,255,255,0.25); transition: all .2s ease; position: relative; flex: 0 0 auto; }
  .boot-toggle .toggle-track::after { content: ''; position: absolute; left: 2px; top: 50%; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all .2s ease; transform: translateY(-50%); }
  .boot-toggle input:checked + .toggle-track { background: var(--wph-primary, #4f8bff); border-color: var(--wph-primary, #4f8bff); }
  .boot-toggle input:checked + .toggle-track::after { transform: translate(18px, -50%); }
  .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: rgba(255,255,255,0.06); color: #fff; font-size: 24px; line-height: 1; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
  .close-btn:hover { background: rgba(255,255,255,0.12); transform: scale(1.05); }
  .boot-body-anim { flex: 1; overflow: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.35) rgba(255,255,255,0.08); }
  .boot-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .form-grid { display: grid; grid-template-columns: 1fr 120px; gap: 12px; align-items: center; }
  .form-grid input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: inherit; outline: none; transition: background .15s ease, border-color .15s ease, box-shadow .15s ease; }
  .form-grid input:hover { background: rgba(255,255,255,0.1); }
  .form-grid input:focus,
  .form-grid input:focus-visible { border-color: var(--wph-primary, #4f8bff); box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #4f8bff) 35%, transparent); }
  .boot-modal .slider {
    width: 100%;
    accent-color: var(--wph-primary, #4f8bff);
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 999px;
    background:
      linear-gradient(var(--wph-primary, #4f8bff), var(--wph-primary, #4f8bff))
        0 / calc((var(--val) - var(--min)) * 100% / (var(--max) - var(--min))) 100% no-repeat,
      rgba(255,255,255,0.35) !important;
    outline: none;
  }
  .boot-modal .slider::-webkit-slider-runnable-track {
    height: 6px;
    background: transparent;
    border-radius: 999px;
  }
  .boot-modal .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid var(--wph-primary, #4f8bff);
    margin-top: -5px;
    opacity: 1 !important;
    transform: scale(1) !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }
  .boot-modal .slider::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background:
      linear-gradient(var(--wph-primary, #4f8bff), var(--wph-primary, #4f8bff))
        0 / calc((var(--val) - var(--min)) * 100% / (var(--max) - var(--min))) 100% no-repeat,
      rgba(255,255,255,0.35) !important;
  }
  .boot-modal .slider::-moz-range-thumb {
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid var(--wph-primary, #4f8bff);
    opacity: 1 !important;
    transform: scale(1) !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }
  .toggles { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
  .boot-toggle-row { justify-content: space-between; width: 100%; }
  .boot-toggle-row .toggle-label { font-size: 13px; font-weight: 650; opacity: 0.92; }
  .boot-toggle-row .toggle-right { display: inline-flex; align-items: center; gap: 10px; }
  .boot-toggle-row.disabled { opacity: 0.6; cursor: not-allowed; }
  .boot-toggle-row.disabled .toggle-track { cursor: not-allowed; }
  .hint { opacity: 0.8; font-size: 13px; }
</style>
