<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  import { t } from '../i18n'
  import type { GifItem } from './types'
  import { updateGifOffsets } from './store'

  export let open = false
  export let item: GifItem | null = null

  let ox = 0
  let oy = 0

  $: if (item) { ox = Number.isFinite(item.offsetX) ? item.offsetX : 0; oy = Number.isFinite(item.offsetY) ? item.offsetY : 0 }

  function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, Math.round(n))) }
  function onSave() { if (item) { updateGifOffsets(item.id, clamp(ox, -500, 500), clamp(oy, -500, 500)); open = false } }
  function onCancel() { open = false }

  function mark(node: HTMLElement) { try { (node as any).wguard = 'WGuard' } catch {}; return { destroy() {} } }
</script>

{#if open && item}
  <div use:appendToBody class="idle-backdrop" role="button" tabindex="0" on:click={onCancel} on:keydown={(e)=>{if(e.key==='Escape')onCancel();}}></div>
  <div use:appendToBody use:mark class="idle-modal" role="dialog" aria-modal="true" aria-label={t('idle.collection.edit')}>
    <div class="idle-header">
      <div class="header-content">
        <h2>{t('idle.collection.edit')}</h2>
      </div>
      <button class="close-btn" type="button" aria-label={t('btn.close')} on:click={onCancel}>×</button>
    </div>

    <div class="idle-body">
      <div class="preview">
        <img src={item.url} alt="" style={`margin-left:${ox}px; margin-bottom:${oy}px;`} />
      </div>
      <div class="form-grid">
        <label for="ox">offsetX</label>
        <input id="ox" type="number" min="-500" max="500" bind:value={ox} />
        <input type="range" min="-500" max="500" bind:value={ox} />
        <label for="oy">offsetY</label>
        <input id="oy" type="number" min="-500" max="500" bind:value={oy} />
        <input type="range" min="-500" max="500" bind:value={oy} />
      </div>
      <div class="actions-row">
        <button class="btn btn-secondary" on:click={onCancel}>{t('common.cancel')}</button>
        <button class="btn btn-primary" on:click={onSave}>{t('editor.apply')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .idle-backdrop { position: fixed; inset: 0; background: var(--wph-backdrop, rgba(0,0,0,0.5)); z-index: 2147483646; }
  .idle-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90vw; max-width: 640px; max-height: 80vh; background: var(--wph-surface, rgba(17,17,17,0.98)); border: 1px solid var(--wph-border, rgba(255,255,255,0.15)); border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden; }
  .idle-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1)); background: var(--wph-surface2, rgba(255,255,255,0.03)); }
  .idle-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--wph-text, #fff); }
  .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--wph-surface, rgba(255,255,255,0.06)); color: var(--wph-text, #fff); font-size: 24px; line-height: 1; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
  .close-btn:hover { background: var(--wph-surface2, rgba(255,255,255,0.12)); transform: scale(1.05); }
  .idle-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .preview { display: flex; justify-content: center; align-items: center; background: var(--wph-surface, rgba(255,255,255,0.06)); border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); border-radius: 10px; padding: 12px; }
  .preview img { max-width: 100%; max-height: 40vh; display: block; }
  .form-grid { display: grid; grid-template-columns: 80px 120px 1fr; gap: 10px; align-items: center; }
  .form-grid input[type="number"], .form-grid input[type="range"] { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: var(--wph-surface, rgba(255,255,255,0.06)); color: inherit; outline: none; }
  .actions-row { display: flex; gap: 8px; justify-content: flex-end; }
  .btn { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.18)); background: var(--wph-surface, rgba(255,255,255,0.07)); color: var(--wph-text, #fff); cursor: pointer; transition: all .15s ease; }
  .btn-primary { background: var(--wph-primary, #f05123); color: var(--wph-onPrimary, #fff); box-shadow: 0 2px 8px var(--wph-primaryGlow, rgba(240,81,35,0.3)); border: none; }
</style>
