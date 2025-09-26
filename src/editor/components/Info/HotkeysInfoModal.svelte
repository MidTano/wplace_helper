<script>
  import { createEventDispatcher } from 'svelte';
  import { t, lang } from '../../../i18n';
  import { TOOL_SHORTCUT_LIST } from '../../modal/shortcuts';
  const dispatch = createEventDispatcher();
  function close() { dispatch('close'); }
  
  $: _i18n_hotkeys_lang = $lang;
</script>

<div class="info-layer" role="presentation"
     on:mousedown|stopPropagation
     on:mouseup|stopPropagation
     on:mousemove|stopPropagation
     on:wheel|stopPropagation
     on:contextmenu|preventDefault>
  <button type="button" class="info-backdrop" aria-label={t('hotkeys.help.closeAria')}
          on:click={close}
          on:keydown={(e)=> (e.key==='Enter'||e.key===' ') && close()}
          on:wheel|stopPropagation></button>
  <div class="info-modal" role="dialog" aria-modal="true" aria-label={t('hotkeys.help.dialogAria')}
       on:wheel|stopPropagation>
    <div class="info-header">
      <div class="info-title">{t('hotkeys.help.title')}</div>
      <button class="info-close" on:click={close} aria-label={t('btn.close')}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12.01l-6.3-6.3-1.4 1.41 6.29 6.3-6.3 6.29 1.41 1.41 6.3-6.29 6.29 6.29 1.41-1.41-6.29-6.29 6.29-6.3z"/></svg>
      </button>
    </div>
    <div class="info-body">
      <div class="info-group">
        <div class="info-group-title">{t('hotkeys.group.tools')}</div>
        <ul class="info-list">
          <li><span class="info-label">{t('hotkeys.tools.brushEraser.label')}</span> — <kbd>Alt</kbd> + {t('hotkeys.common.wheel')} {t('hotkeys.tools.brushEraser.wheelResizes')}; <kbd>Alt</kbd> + <kbd>{t('hotkeys.common.rmb')}</kbd> + {t('hotkeys.tools.brushEraser.dragUpDown')}</li>
          <li><span class="info-label">{t('hotkeys.tools.selection.label')}</span> — <kbd>Shift</kbd> {t('hotkeys.common.add')}, <kbd>Alt</kbd> {t('hotkeys.common.subtract')}</li>
        </ul>
      </div>
      <div class="info-group">
        <div class="info-group-title">{t('hotkeys.group.toolShortcuts')}</div>
        <ul class="info-list">
          {#each TOOL_SHORTCUT_LIST as entry}
            <li><span class="info-label">{t(entry.labelI18nKey)}</span> — <kbd class="k">{entry.key.toUpperCase()}</kbd></li>
          {/each}
        </ul>
      </div>
      <div class="info-group">
        <div class="info-group-title">{t('hotkeys.group.navigation')}</div>
        <ul class="info-list">
          <li><span class="info-label">{t('hotkeys.nav.zoom')}</span> — {t('hotkeys.nav.zoomWheel')}</li>
          <li><span class="info-label">{t('hotkeys.nav.pan')}</span> — <kbd>{t('hotkeys.common.mmb')}</kbd> {t('hotkeys.nav.or')} <kbd>{t('hotkeys.common.rmb')}</kbd> ({t('hotkeys.nav.holdAndDrag')})</li>
        </ul>
      </div>
      <div class="info-group">
        <div class="info-group-title">{t('hotkeys.group.shortcuts')}</div>
        <ul class="info-list">
          <li><kbd class="k">Ctrl</kbd> + <kbd class="k">Z</kbd> — {t('hotkeys.undo')}</li>
          <li><kbd class="k">Ctrl</kbd> + <kbd class="k">Shift</kbd> + <kbd class="k">Z</kbd> — {t('hotkeys.redo')}</li>
          <li><kbd class="k">Ctrl</kbd> + <kbd class="k">D</kbd> — {t('hotkeys.deselect')}</li>
          <li><kbd class="k">Ctrl</kbd> + <kbd class="k">I</kbd> — {t('hotkeys.invert')}</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  .info-layer { position: absolute; inset: 0; z-index: 30; }
  .info-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border: none; padding: 0; margin: 0; cursor: pointer; }
  .info-modal { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(520px, calc(100% - 40px)); max-height: min(70vh, 560px); background: rgba(255,255,255,0.98); color: #111; border: 1px solid rgba(0,0,0,0.1); border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,0.35); z-index: 31; display: flex; flex-direction: column; overflow: hidden; animation: modal-fade .14s ease; backdrop-filter: saturate(1.2) blur(2px); }
  @keyframes modal-fade { from { opacity: 0; } to { opacity: 1; } }
  .info-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .info-title { font-weight: 800; letter-spacing: .2px; color: #111; }
  .info-close { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: #fff; color: #111; display: grid; place-items: center; cursor: pointer; transition: background .12s ease, color .12s ease, border-color .12s ease; }
  .info-close:hover { background: #f05123; color: #fff; border-color: #f05123; }
  .info-body { padding: 12px 14px 16px; overflow: auto; display: grid; grid-template-columns: 1fr; gap: 12px; }
  .info-group { border: 1px dashed rgba(240,81,35,0.3); border-radius: 10px; padding: 10px 12px; background: rgba(250,250,250,0.9); }
  .info-group-title { font-weight: 800; margin-bottom: 6px; color: #111; }
  .info-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .info-label { display: inline-block; min-width: 120px; font-weight: 700; color: #111; }
  kbd { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #fff; color: #f05123; font-weight: 800; font-size: 12px; border: 1px solid #f05123; box-shadow: 0 2px 6px rgba(0,0,0,0.12); margin: 0 2px; }
</style>
