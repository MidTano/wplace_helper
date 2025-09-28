<script>
  import { onMount, tick } from 'svelte';
  import { getAutoConfig, updateAutoConfig, resetAutoConfig } from '../screen/autoConfig';
  import { setAntiIdleEnabled } from '../overlay/antiIdle';
  import { t, lang } from '../i18n';

  let open = false;
  let cfg = getAutoConfig();
  let btnEl;
  let popEl;
  let posX = 0;
  let posY = 0;

  function toggle() { open = !open; }
  function close() { open = false; }

  function onChangeNumber(key, ev) {
    const v = Number(ev?.currentTarget?.value || ev?.target?.value || 0) || 0;
    cfg = updateAutoConfig({ [key]: v });
  }
  function onChangeBool(key, ev) {
    const v = !!(ev?.currentTarget?.checked ?? ev?.target?.checked);
    cfg = updateAutoConfig({ [key]: v });
    if (key === 'antiIdleEnabled') {
      try { setAntiIdleEnabled(v, 10000); } catch {}
    }
  }
  function onChangeString(key, ev) {
    const v = String(ev?.currentTarget?.value ?? ev?.target?.value ?? '');
    cfg = updateAutoConfig({ [key]: v });
  }
  function onReset() {
    cfg = resetAutoConfig();
    try { setAntiIdleEnabled(!!cfg.antiIdleEnabled, 10000); } catch {}
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
    try { setAntiIdleEnabled(!!cfg.antiIdleEnabled, 10000); } catch {}
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
  <div use:portal bind:this={popEl} id="tm-settings-popover" class="tm-settings-popover" role="dialog" aria-label={t('settings.auto.title')} style={`left:${posX}px; top:${posY}px`}>
    <div class="title">{t('settings.auto.title')}</div>
    
    <div class="row">
      <label for="cfg-series-wait">{t('settings.seriesWait')}</label>
      <input id="cfg-series-wait" type="number" min="0" step="1" bind:value={cfg.seriesWaitSec} on:input={(e)=>onChangeNumber('seriesWaitSec', e)} />
    </div>
    <div class="row">
      <label for="cfg-anti-idle">{t('settings.antiIdle')}</label>
      <label class="switch">
        <input id="cfg-anti-idle" type="checkbox" checked={!!cfg.antiIdleEnabled} on:change={(e)=>onChangeBool('antiIdleEnabled', e)} />
        <span class="slider" aria-hidden="true"></span>
      </label>
    </div>
    <div class="row">
      <label for="cfg-bm-mode">{t('settings.bm.mode')}</label>
      <select id="cfg-bm-mode" bind:value={cfg.bmMode} on:change={(e)=>onChangeString('bmMode', e)}>
        <option value="scan">{t('settings.bm.mode.scan')}</option>
        <option value="random">{t('settings.bm.mode.random')}</option>
      </select>
    </div>
    <div class="row">
      <label for="cfg-bm-batch">{t('settings.bm.batchLimit')}</label>
      <input id="cfg-bm-batch" type="number" min="0" step="1" bind:value={cfg.bmBatchLimit} on:input={(e)=>onChangeNumber('bmBatchLimit', e)} />
    </div>
    <div class="hint">{t('settings.bm.colorsHint')}</div>
    <div class="row" style="justify-content:end">
      <button class="btn btn-primary" on:click={onReset}>{t('editor.reset')}</button>
    </div>
    <div class="hint">{t('settings.hint.enhancedRequired')}</div>
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
  
  .tm-settings-popover .switch { position: relative; width: 48px; height: 26px; display: inline-block; }
  .tm-settings-popover .switch input { opacity: 0; width: 0; height: 0; }
  .tm-settings-popover .switch .slider { position: absolute; inset: 0; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; transition: background .15s ease, border-color .15s ease; }
  .tm-settings-popover .switch .slider::before { content: ""; position: absolute; height: 20px; width: 20px; left: 3px; top: 2px; background: #fff; border-radius: 50%; transition: transform .15s ease; }
  .tm-settings-popover .switch input:checked + .slider { background: #f05123; border-color: rgba(255,255,255,0.25); }
  .tm-settings-popover .switch input:checked + .slider::before { transform: translateX(20px); }
</style>
