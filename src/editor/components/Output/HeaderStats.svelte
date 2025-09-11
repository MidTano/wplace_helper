<script>
  export let outW = 0;
  export let outH = 0;
  export let opaqueCount = 0;
  export let colorCount = 0;
  export let etaSeconds = 0;
  export let formatEta = (v) => String(v);
  export let compact = false;
  import { t, lang } from '../../../i18n';
  
  $: _i18n_headerstats_lang = $lang;
</script>

<div class="editor-output-title" class:compact={compact}>
  <span class="badge">{outW} × {outH}</span>
  <span class="sep">•</span>
  <span class="badge">{t('editor.stats.total')} {opaqueCount.toLocaleString()}</span>
  <span class="sep">•</span>
  <span class="badge">{t('editor.stats.colors')} {colorCount}</span>
  <span class="sep">•</span>
  <span class="badge">{t('editor.stats.time')} {formatEta(etaSeconds)}</span>
</div>

<style>
  .editor-output-title { position: static; transform: none; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; font-weight: 600; color: #fff; opacity: .98; }
  .editor-output-title .badge { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); border-radius: 999px; padding: 2px 8px; font-weight: 700; color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
  .editor-output-title .sep { opacity: .9; color: #fff; }
  .editor-output-title.compact { opacity: 0; visibility: hidden; }
  
</style>
