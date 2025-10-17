<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { t, lang } from '../i18n';
  import { appendToBody } from '../editor/modal/utils/appendToBody';
  
  let open = false;
  let stats = null; 
  function show() { open = true; }
  function hide() { open = false; }
  let btnEl;
  let popEl;
  let posX = 0;
  let posY = 0;

  function computeNextLevelPixels(level, pixelsPainted) {
    try {
      if (level == null || pixelsPainted == null) return null;
      const lvl = Math.floor(Number(level) || 0);
      const painted = Number(pixelsPainted) || 0;
      const target = Math.pow(lvl * Math.pow(30, 0.65), 1 / 0.65);
      return Math.max(0, Math.ceil(target - painted));
    } catch { return null; }
  }

  
  $: name = stats?.name ?? '—';
  $: droplets = (stats?.droplets != null) ? stats.droplets : null;
  $: pixelsPainted = (stats?.pixelsPainted != null) ? stats.pixelsPainted : null;
  $: level = (stats?.level != null) ? stats.level : null;
  $: chargesCount = (stats?.charges && typeof stats.charges === 'object') ? stats.charges.count : (Number.isFinite(stats?.charges) ? Number(stats?.charges) : (stats?.chargesCurrent ?? stats?.energy ?? null));
  $: chargesMax = (stats?.charges && typeof stats.charges === 'object') ? stats.charges.max : (stats?.chargesMax ?? stats?.maxCharges ?? stats?.maxEnergy ?? null);
  $: cooldownMs = (stats?.charges && typeof stats.charges === 'object') ? stats.charges.cooldownMs : (stats?.cooldownMs ?? null);
  $: nextLevel = computeNextLevelPixels(level, pixelsPainted);

  $: levelInt = level != null ? Math.floor(Number(level)) : null;
  $: chargesCountInt = chargesCount != null ? Math.floor(Number(chargesCount)) : null;
  $: chargesMaxInt = chargesMax != null ? Math.floor(Number(chargesMax)) : null;
  
  function onMessage(e) {
    const data = e?.data;
    if (!data || data.source !== 'wplace-svelte') return;
    if (typeof data.endpoint === 'string' && data.jsonData) {
      try {
        const u = new URL(String(data.endpoint), location.href);
        const parts = u.pathname.split('/').filter(Boolean).map(s => s.toLowerCase());
        if (parts.includes('me')) {
          stats = data.jsonData;
        }
      } catch {
        if (/\/me(\b|\/|\?)/i.test(String(data.endpoint))) {
          stats = data.jsonData;
        }
      }
    }
  }

  let removeListener = null;
  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', onMessage);
      removeListener = () => window.removeEventListener('message', onMessage);
    }
    
  });
  onDestroy(() => { try { removeListener && removeListener(); } catch {} });

  async function updatePosition() {
    try {
      await tick();
      const r = btnEl?.getBoundingClientRect?.();
      const W = Math.max(0, window.innerWidth || 0);
      const H = Math.max(0, window.innerHeight || 0);
      const pad = 10;
      const topMenuHeight = 110;
      const mwRaw = popEl?.offsetWidth || 0;
      const mhRaw = popEl?.offsetHeight || 0;
      const mw = Math.max(260, mwRaw || 300);
      const mh = mhRaw || 250;
      const nx = Math.max(pad, Math.min(Math.round((r?.left || 0) + (r?.width || 0)/2 - mw/2), W - mw - pad));
      let ny = Math.round((r?.bottom || 0) + 8);
      if (ny + mh > H - pad) {
        ny = Math.max(topMenuHeight + pad, H - mh - pad);
      }
      ny = Math.max(topMenuHeight + pad, ny);
      posX = nx; posY = ny;
    } catch {}
  }

  $: if (open) { updatePosition(); }
  
  $: _i18n_accountstats_lang = $lang;

</script>

<div class="tm-stats-wrap" role="group" on:mouseenter={show} on:mouseleave={hide}>
  <button bind:this={btnEl} class="tm-fab" aria-label={t('stats.title')} aria-expanded={open} aria-controls="tm-stats-popover">
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M21,22H19V20a1.0011,1.0011,0,0,0-1-1H14a1.0011,1.0011,0,0,0-1,1v2H11V20a3.0033,3.0033,0,0,1,3-3h4a3.0033,3.0033,0,0,1,3,3Z" />
      <path d="M16,16a3.5,3.5,0,1,1,3.5-3.5A3.5041,3.5041,0,0,1,16,16Zm0-5a1.5,1.5,0,1,0,1.5,1.5A1.5017,1.5017,0,0,0,16,11Z" />
      <path d="M30.4141,17.4141a1.9995,1.9995,0,0,0,0-2.8282L24.6272,8.7993l2.9006-2.8628a2.0018,2.0018,0,1,0-1.4416-1.3872L23.2129,7.3848,17.4141,1.5859a1.9995,1.9995,0,0,0-2.8282,0L8.7993,7.3726,5.9368,4.4717A2.002,2.002,0,1,0,4.55,5.9136l2.835,2.8735L1.5859,14.5859a1.9995,1.9995,0,0,0,0,2.8282l5.7989,5.7988L4.55,26.0864a1.9977,1.9977,0,1,0,1.387,1.4419l2.8625-2.9009,5.7866,5.7867a1.9995,1.9995,0,0,0,2.8282,0l5.7988-5.7989,2.8733,2.8355a1.998,1.998,0,1,0,1.4416-1.3872l-2.9006-2.8628ZM16,29,3,16,16,3,29,16Z" />
    </svg>
  </button>
  {#if open}
    <div use:appendToBody bind:this={popEl} id="tm-stats-popover" class="tm-stats-popover" role="tooltip" aria-label={t('stats.title')} style={`left:${posX}px; top:${posY}px`}>
      <div class="title">{t('stats.title')}</div>
      {#if !stats}
        <div class="hint">{t('stats.hint.wait')}</div>
      {/if}
      <div class="bm-lines">
        <div class="line">{t('stats.name')}: <b>{name}</b></div>
        <div class="line">{t('stats.droplets')}: <b>{droplets != null ? droplets.toLocaleString('ru-RU') : '—'}</b></div>
        <div class="line">{t('stats.level')}: <b>{levelInt != null ? levelInt.toLocaleString('ru-RU') : '—'}</b></div>
        <div class="line">{t('stats.painted')}: <b>{pixelsPainted != null ? pixelsPainted.toLocaleString('ru-RU') : '—'}</b></div>
        <div class="line">{t('stats.charges')}: <b>{(chargesCountInt != null || chargesMaxInt != null) ? `${chargesCountInt != null ? chargesCountInt.toLocaleString('ru-RU') : '—'} / ${chargesMaxInt != null ? chargesMaxInt.toLocaleString('ru-RU') : '—'}` : '—'}</b></div>
        {#if cooldownMs != null}
          <div class="line">{t('stats.cooldown')}: <b>{Math.round((Number(cooldownMs)||0)/1000)} {t('units.sec')}</b></div>
        {/if}
        <div class="line">{t('stats.nextLevel')}: <b>{nextLevel != null ? nextLevel.toLocaleString('ru-RU') : '—'}</b> {t('automenu.count.pixels')}</div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tm-stats-wrap { position: relative; }
  .tm-stats-popover {
    position: fixed;
    left: 0; top: 0; 
    background: var(--wph-surface, rgba(17,17,17,0.96));
    color: var(--wph-text, #fff);
    border: 1px solid var(--wph-border, rgba(255,255,255,0.15));
    border-radius: 10px; padding: 10px 12px; min-width: 260px; max-width: 320px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
    z-index: 1000011;
  }
  .title { font-weight: 700; margin-bottom: 6px; }
  .hint { font-size: 12px; opacity: .8; margin-bottom: 8px; }
  .bm-lines { display: grid; grid-auto-rows: minmax(18px, auto); gap: 4px; }
  .line { font-size: 12px; }
  .line b { font-weight: 700; }
  
</style>
