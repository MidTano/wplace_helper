<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import IdleScreen from './IdleScreen.svelte';
  import { idleSettingsStore, getRandomFavoriteGif, addGif } from './store';

  let idleTimeoutMs = 5000;
  $: idleTimeoutMs = Math.max(5000, Math.min(7200 * 1000, Math.round((($idleSettingsStore?.idleTimeoutSec) || 5) * 1000)));
  
  let idleTimer: number | null = null;
  let isIdle = false;
  let startHiding = false;
  let currentGif = { url: '', offsetY: 0, offsetX: 0, width: null as number | null, height: null as number | null };
  let manualActive = false;
  const DEFAULT_GIF_URL = 'https://media.tenor.com/cZCGGNbpWskAAAAi/miyulily-vtuber.gif';

  function scheduleIdle() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
    if (!$idleSettingsStore?.enabled) {
      return;
    }
    
    idleTimer = window.setTimeout(() => {
      const last = $idleSettingsStore?.lastShownGifId || undefined;
      const item = getRandomFavoriteGif(last);
      if (!item) {
        try {
          const k = 'wph_idle_no_favorites_notice';
          if (!sessionStorage.getItem(k)) {
            sessionStorage.setItem(k, '1');
            const ev = new CustomEvent('wph:idle:noFavorites');
            document.dispatchEvent(ev);
          }
        } catch {}
        scheduleIdle();
        return;
      }
      currentGif = {
        url: item.url,
        offsetY: Number.isFinite((item as any).offsetY) ? (item as any).offsetY : 0,
        offsetX: Number.isFinite((item as any).offsetX) ? (item as any).offsetX : 0,
        width: item.width ?? null,
        height: item.height ?? null
      };
      isIdle = true;
      startHiding = false;
    }, idleTimeoutMs);
  }

  function triggerIdleNow() {
    if (idleTimer !== null) { try { clearTimeout(idleTimer); } catch {} idleTimer = null; }
    manualActive = true;
    const last = $idleSettingsStore?.lastShownGifId || undefined;
    const fav = getRandomFavoriteGif(last);
    let chosen: any = fav;
    if (!chosen) {
      const list = ($idleSettingsStore?.gifs || []);
      if (list.length === 0) {
        const url = DEFAULT_GIF_URL;
        try {
          Promise.resolve(addGif(url, true)).then((it) => {
            if (!it) {
              try {
                const k = 'wph_idle_no_favorites_notice';
                if (!sessionStorage.getItem(k)) {
                  sessionStorage.setItem(k, '1');
                  const ev = new CustomEvent('wph:idle:noFavorites');
                  document.dispatchEvent(ev);
                }
              } catch {}
              return;
            }
            try { idleSettingsStore.update(s => ({ ...s, lastShownGifId: it.id })); } catch {}
            try { localStorage.setItem('wph_idle_default_seed_v1', '1'); } catch {}
            currentGif = {
              url: it.url,
              offsetY: Number.isFinite((it as any).offsetY) ? (it as any).offsetY : 0,
              offsetX: Number.isFinite((it as any).offsetX) ? (it as any).offsetX : 0,
              width: it.width ?? null,
              height: it.height ?? null
            };
            isIdle = true;
            startHiding = false;
          });
        } catch {
          try {
            const k = 'wph_idle_no_favorites_notice';
            if (!sessionStorage.getItem(k)) {
              sessionStorage.setItem(k, '1');
              const ev = new CustomEvent('wph:idle:noFavorites');
              document.dispatchEvent(ev);
            }
          } catch {}
        }
        return;
      }
      let pool = list;
      if (last && list.length > 1) {
        pool = list.filter((x: any) => x.id !== last);
        if (pool.length === 0) pool = list;
      }
      const idx = Math.floor(Math.random() * pool.length);
      chosen = pool[idx];
      try { idleSettingsStore.update(s => ({ ...s, lastShownGifId: chosen.id })); } catch {}
    }
    currentGif = {
      url: chosen.url,
      offsetY: Number.isFinite((chosen as any).offsetY) ? (chosen as any).offsetY : 0,
      offsetX: Number.isFinite((chosen as any).offsetX) ? (chosen as any).offsetX : 0,
      width: chosen.width ?? null,
      height: chosen.height ?? null
    };
    isIdle = true;
    startHiding = false;
  }

  function isUiTarget(el: EventTarget | null): boolean {
    const e = (el as Element) || null;
    if (!e) return false;
    if ((e as any).closest && ((e as Element).closest('.idle-backdrop'))) return true;
    if ((e as any).closest && ((e as Element).closest('.gif-container'))) return true;
    if ((e as any).closest && ((e as Element).closest('.idle-gif'))) return true;
    if ((e as any).closest && ((e as Element).closest('.topmenu-root'))) return true;
    if ((e as any).closest && ((e as Element).closest('.tm-settings-popover'))) return true;
    if ((e as any).closest && ((e as Element).closest('.tm-fab'))) return true;
    if ((e as any).closest && ((e as Element).closest('.topmenu-peek'))) return true;
    return false;
  }

  let lastMove = 0;
  function handleUserEvent(ev: Event) {
    const t = ev.type;
    const tgt = ev.target as Element | null;
    if (t === 'keydown') {
      const ke = ev as KeyboardEvent;
      const key = ((ke && (ke.code as any)) || (ke && (ke.key as any)) || '').toString();
      const alt = !!(ke && (ke.altKey || (typeof (ke as any).getModifierState === 'function' && (ke as any).getModifierState('Alt'))));
      if (alt && (key === 'KeyL' || key === 'l' || key === 'L')) { try { ke.preventDefault(); ke.stopPropagation(); (ke as any).stopImmediatePropagation && (ke as any).stopImmediatePropagation(); } catch {} triggerIdleNow(); return; }
      if (isIdle) { return; }
      scheduleIdle();
      return;
    }
    if (t === 'click') {
      if (isIdle) {
        if (tgt && (tgt as any).closest && (tgt.closest('.idle-backdrop') || tgt.closest('.gif-container') || tgt.closest('.idle-gif'))) handleInstantHide();
        return;
      }
      if (isUiTarget(tgt)) scheduleIdle();
      return;
    }
    if (t === 'mousemove' || t === 'keypress' || t === 'scroll' || t === 'touchstart') {
      if (t === 'mousemove') {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (now - lastMove < 150) return;
        lastMove = now;
      }
      if (isIdle) { return; }
      scheduleIdle();
      return;
    }
  }

  function handleInstantHide() {
    startHiding = true;
    manualActive = false;
    
    setTimeout(() => {
      isIdle = false;
      startHiding = false;
      scheduleIdle();
    }, 400);
  }

  onMount(() => {
    const events = ['mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => { document.addEventListener(event, handleUserEvent, { passive: true, capture: true }); });
    window.addEventListener('keydown', handleUserEvent, { capture: true });
    scheduleIdle();

    return () => {
      events.forEach(event => { document.removeEventListener(event, handleUserEvent, true); });
      window.removeEventListener('keydown', handleUserEvent, true);
    };
  });

  onDestroy(() => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
  });

$: if ($idleSettingsStore?.enabled === false) {
  if (idleTimer !== null) { try { clearTimeout(idleTimer); } catch {} idleTimer = null; }
  if (isIdle && !manualActive) { isIdle = false; startHiding = false; }
} else if ($idleSettingsStore?.enabled === true) {
  scheduleIdle();
}
</script>

<IdleScreen visible={isIdle} gifUrl={currentGif.url} offsetY={currentGif.offsetY} offsetX={currentGif.offsetX} width={currentGif.width} height={currentGif.height} hiding={startHiding} on:instantHide={handleInstantHide} />

