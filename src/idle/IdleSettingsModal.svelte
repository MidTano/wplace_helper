<script lang="ts">
  import { onMount } from 'svelte'
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  import { t } from '../i18n'
  import { idleSettingsStore, setIdleTimeoutSec, addGif, removeGif, toggleFavorite, setIdleEnabled } from './store'
  import GifGridItem from './GifGridItem.svelte'
  import type { GifItem } from './types'
  import PlacementMode from './PlacementMode.svelte'
  import { getAutoConfig } from '../screen/autoConfig'

  export let open = false

  let url = ''
  let tempIdle = 360
  let showPlace = false
  let placeItem: GifItem | null = null
  let initialized = false
  let captureMethod = 'canvas'
  let isMobile = false
  let showCaptureTooltip = false
  let tooltipEl: HTMLElement | null = null
  let toggleEl: HTMLElement | null = null
  
  function isCaptureEnabled() {
    try {
      const cfg = getAutoConfig();
      captureMethod = cfg?.captureMethod || 'canvas';
      return captureMethod === 'display';
    } catch {
      return false;
    }
  }

  function isMobileDevice() {
    try {
      return !!(window && window.matchMedia && window.matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse)').matches);
    } catch { return false; }
  }

  function positionTooltip() {
    if (!tooltipEl || !toggleEl) return;
    const r = toggleEl.getBoundingClientRect();
    const tRect = tooltipEl.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left + r.width / 2 - tRect.width / 2, window.innerWidth - tRect.width - 8));
    const top = Math.max(8, r.bottom + 8);
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  }

  function showTooltip() {
    if (!(isCaptureEnabled() || isMobile)) return;
    showCaptureTooltip = true;
    setTimeout(positionTooltip, 0);
  }

  function hideTooltip() {
    showCaptureTooltip = false;
  }

  $: if (open && !initialized) {
    tempIdle = Math.max(5, Math.min(7200, Math.round(($idleSettingsStore?.idleTimeoutSec) || 360)))
    initialized = true
  }
  $: if (!open && initialized) { initialized = false }

  onMount(() => {
    isMobile = isMobileDevice();
    if (isMobile) {
      try { setIdleEnabled(false); } catch {}
    }
  });

  function close() { open = false }

  async function addUrl() {
    const s = (url || '').trim()
    if (!s) return
    const item = await addGif(s, true)
    if (item) url = ''
  }

  function mark(node: HTMLElement) {
    try { (node as any).wguard = 'WGuard' } catch {}
    return { destroy() {} }
  }
</script>

{#if open}
  {#if !showPlace}
    <div use:appendToBody class="idle-backdrop" role="button" tabindex="0" on:click={close} on:keydown={(e)=>{if(e.key==='Escape')close();}}></div>
    <div use:appendToBody use:mark class="idle-modal" class:small={(($idleSettingsStore?.gifs || []).length === 0)} role="dialog" aria-modal="true" aria-label={t('idle.settings.title')}>
      <div class="idle-header">
        <div class="header-content">
          <h2>{t('idle.settings.title')}</h2>
        </div>
        <div class="header-actions">
          <label
            bind:this={toggleEl}
            class="idle-toggle"
            class:disabled={isCaptureEnabled() || isMobile}
            aria-label={t('idle.settings.title')}
            on:mouseenter={showTooltip}
            on:mouseleave={hideTooltip}
            on:focus={showTooltip}
            on:blur={hideTooltip}
          >
            <span class="toggle-text">{$idleSettingsStore?.enabled ? t('idle.toggle.on') : t('idle.toggle.off')}</span>
            <input type="checkbox" checked={$idleSettingsStore?.enabled && !isCaptureEnabled() && !isMobile} disabled={isCaptureEnabled() || isMobile} on:change={(e)=>{ if (isCaptureEnabled() || isMobile) return; setIdleEnabled(e?.currentTarget?.checked ?? false); }} />
            <span class="toggle-track"></span>
          </label>
          {#if showCaptureTooltip && (isCaptureEnabled() || isMobile)}
            <div bind:this={tooltipEl} use:appendToBody class="idle-tooltip-floating">
              {isMobile ? t('idle.mobile.disabled') : t('screen.capture.idle.tooltip')}
            </div>
          {/if}
          <button class="close-btn" type="button" aria-label={t('btn.close')} on:click={close}>×</button>
        </div>
      </div>

      <div class="idle-body-anim">
        <div class="idle-body">
          <div class="settings-wrap">
            <div class="form-grid">
              <label for="idle-timeout">{t('idle.settings.idleTimeout')}</label>
              <input id="idle-timeout" type="number" min="5" max="7200" bind:value={tempIdle} on:input={() => setIdleTimeoutSec(tempIdle)} />
            </div>
          </div>

          <div class="collection-wrap">
            <div class="add-row">
              <input type="url" inputmode="url" placeholder="https://media.giphy.com/media/abc.gif" bind:value={url} spellcheck="false" />
              <button type="button" class="editor-btn editor-primary" on:click={addUrl}>{t('idle.collection.add')}</button>
            </div>
            {#if ($idleSettingsStore?.gifs || []).length === 0}
              <div class="empty">{t('idle.collection.empty')}</div>
            {:else}
              <div class="grid">
                {#each $idleSettingsStore.gifs as g (g.id)}
                  <div class="grid-item">
                    <GifGridItem item={g}
                      on:toggle={(e)=>toggleFavorite(e.detail.id)}
                      on:remove={(e)=>removeGif(e.detail.id)}
                      on:move={(e)=>{ const id = e.detail.id; const found = ($idleSettingsStore?.gifs || []).find(x=>x.id===id); if (found) { placeItem = found; showPlace = true } }} />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
  <PlacementMode bind:open={showPlace} bind:item={placeItem} />
{/if}

<style>
  .idle-backdrop { position: fixed; inset: 0; background: var(--wph-backdrop, rgba(0,0,0,0.5)); z-index: 2147483646; }
  .idle-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90vw; max-width: 820px; max-height: 80vh; background: var(--wph-surface, rgba(17,17,17,0.98)); border: 1px solid var(--wph-border, rgba(255,255,255,0.15)); border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden; transition: max-height .3s ease; color: var(--wph-text, #fff); }
  .idle-modal.small { max-height: 60vh; }
  .idle-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1)); background: var(--wph-surface2, rgba(255,255,255,0.03)); }
  .idle-header h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--wph-text, #fff); }
  .header-actions { display: inline-flex; align-items: center; gap: 10px; }
  .idle-toggle { display: inline-flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--wph-border, rgba(255,255,255,0.12)); background: var(--wph-surface, rgba(255,255,255,0.04)); cursor: pointer; user-select: none; }
  .idle-toggle:hover { background: var(--wph-surface2, rgba(255,255,255,0.08)); }
  .idle-toggle .toggle-text { font-size: 12px; font-weight: 600; opacity: 0.95; min-width: 38px; text-align: left; }
  .idle-toggle input[type="checkbox"] { opacity: 0; width: 0; height: 0; position: absolute; }
  .idle-toggle .toggle-track { width: 40px; height: 22px; background: rgba(255,255,255,0.2); border-radius: 14px; border: 1px solid rgba(255,255,255,0.25); transition: all .2s ease; position: relative; flex: 0 0 auto; }
  .idle-toggle .toggle-track::after { content: ''; position: absolute; left: 2px; top: 50%; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all .2s ease; transform: translateY(-50%); }
  .idle-toggle input:checked + .toggle-track { background: var(--wph-primary, #f05123); border-color: var(--wph-primary, #f05123); }
  .idle-toggle input:checked + .toggle-track::after { transform: translate(18px, -50%); }
  .idle-toggle input:focus + .toggle-track,
  .idle-toggle input:focus-visible + .toggle-track { box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #f05123) 35%, transparent); }
  .idle-toggle.disabled { opacity: 0.6; cursor: not-allowed; }
  .idle-toggle.disabled input { cursor: not-allowed; }
  .idle-tooltip-floating {
    position: fixed;
    z-index: 2147483647;
    max-width: 260px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(8,8,12,0.95);
    color: #fff;
    font-size: 12px;
    line-height: 1.4;
    box-shadow: 0 8px 18px rgba(0,0,0,0.35);
    pointer-events: none;
  }
  .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--wph-surface, rgba(255,255,255,0.06)); color: var(--wph-text, #fff); font-size: 24px; line-height: 1; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
  .close-btn:hover { background: var(--wph-surface2, rgba(255,255,255,0.12)); transform: scale(1.05); }
  .idle-body-anim { flex: 1; overflow: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--wph-border, rgba(255,255,255,0.35)) var(--wph-surface, rgba(255,255,255,0.08)); }
  .idle-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .settings-wrap { padding-top: 8px; }
  .collection-wrap { padding-top: 8px; }
  .form-grid { display: grid; grid-template-columns: 1fr 140px; gap: 12px; align-items: center; }
  .form-grid input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: var(--wph-surface, rgba(255,255,255,0.06)); color: inherit; outline: none; transition: background .15s ease, border-color .15s ease, box-shadow .15s ease; }
  .editor-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .editor-btn.editor-primary { background: var(--wph-primary, #f05123); border-color: rgba(255,255,255,0.25); }
  .add-row { display: flex; gap: 12px; align-items: stretch; margin-bottom: 12px; }
  .add-row input { flex: 1 1 auto; min-width: 0; width: auto; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: var(--wph-surface, rgba(255,255,255,0.06)); color: inherit; outline: none; transition: background .15s ease, border-color .15s ease, box-shadow .15s ease; }
  .add-row .editor-btn { flex: 0 0 auto; min-width: 140px; padding: 8px 14px; border-radius: 10px; }
  .idle-modal input:hover { background: var(--wph-surface2, rgba(255,255,255,0.1)); }
  .idle-modal input:focus,
  .idle-modal input:focus-visible { border-color: var(--wph-primary, #f05123); box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #f05123) 35%, transparent); }
  .add-row input:focus,
  .add-row input:focus-visible { position: relative; z-index: 1; box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #f05123) 35%, transparent) inset; }
  .idle-modal input[type="number"] { appearance: textfield; -moz-appearance: textfield; }
  .idle-modal input[type="number"]::-webkit-outer-spin-button,
  .idle-modal input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .empty { opacity: .8; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .grid-item { display: flex; flex-direction: column; gap: 8px; }

  :global(.idle-body-anim::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(.idle-body-anim::-webkit-scrollbar-track) { background: var(--wph-surface, rgba(255,255,255,0.06)); border-radius: 8px; }
  :global(.idle-body-anim::-webkit-scrollbar-thumb) { background: var(--wph-border, rgba(255,255,255,0.28)); border-radius: 8px; }
  :global(.idle-body-anim::-webkit-scrollbar-thumb:hover) { background: var(--wph-border, rgba(255,255,255,0.38)); }
  :global(.idle-body-anim::-webkit-scrollbar-button) { display: none; width: 0; height: 0; }
</style>
