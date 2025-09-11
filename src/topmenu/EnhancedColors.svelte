<script>
  import { getStencilManager } from '../template/stencilManager';
  import { log } from '../overlay/log';
  import { t, lang } from '../i18n';
  let on = false;

  function toggle() {
    on = !on;
    try {
      getStencilManager().setEnhancedColors(on);
      log('ui', 'enhancedColors', { on });
    } catch {}
  }
  
  $: _i18n_enhanced_lang = $lang;
  $: L_enhanced = ($lang, t('btn.enhancedColors'));
</script>

<button class="tm-fab {on ? 'tm-primary' : ''}" type="button" on:click={toggle} aria-label={L_enhanced} data-label={L_enhanced} aria-pressed={on}>
  <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
    <rect x="2" y="27.0049" width="27.9985" height="2"/>
    <path d="M16,20a4.0045,4.0045,0,0,1,4,4h2a6,6,0,0,0-12,0h2A4.0045,4.0045,0,0,1,16,20Z"/>
    <rect x="25" y="22.0049" width="5" height="2"/>
    <rect x="21.6675" y="14.8536" width="4.958" height="1.9998" transform="rotate(-45 24.1465 15.8535)"/>
    <polygon points="19.59 9.595 17 12.175 17 4.005 15 4.005 15 12.175 12.41 9.595 11 11.005 16 16.005 21 11.005 19.59 9.595"/>
    <rect x="6.8536" y="13.3745" width="1.9998" height="4.958" transform="rotate(-45 7.853 15.854)"/>
    <rect x="2" y="22.0049" width="5" height="2"/>
  </svg>
</button>
