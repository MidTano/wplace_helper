<script>
  import { t, lang } from '../i18n';
  
  
  $: _i18n_close_lang = $lang;
</script>

<button class="tm-fab tm-danger" aria-label={t('btn.close')} data-label={t('btn.close')}>
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path fill="currentColor" d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
</button>
