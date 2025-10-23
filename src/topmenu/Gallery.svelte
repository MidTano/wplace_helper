<script>
  import { createEventDispatcher } from 'svelte';
  import { t, lang } from '../i18n';
  const dispatch = createEventDispatcher();
  function onClick() {
    dispatch('open');
  }
  $: _i18n_gallery_lang = $lang;
  $: L_gallery = ($lang, t('btn.gallery'));
</script>

<button class="tm-fab tm-tip" on:click={onClick} aria-label={L_gallery} data-label={L_gallery} title={L_gallery} data-tutorial="gallery">
  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
    <polygon points="22 23 13.83 23 16.41 20.41 15 19 10 24 15 29 16.41 27.59 13.83 25 22 25 22 23" />
    <polygon points="11 13 19.17 13 16.59 10.41 18 9 23 14 18 19 16.59 17.59 19.17 15 11 15 11 13" />
    <path d="M24.5 25H24V23h.5a5.4961 5.4961 0 0 0 .377-10.9795l-.8365-.0566-.09-.834a7.9979 7.9979 0 0 0-15.9014 0l-.09.834-.8365.0566A5.4961 5.4961 0 0 0 7.5 23H8v2H7.5A7.4964 7.4964 0 0 1 6.1782 10.124a9.9992 9.9992 0 0 1 19.6436 0A7.4964 7.4964 0 0 1 24.5 25Z" />
  </svg>
</button>
