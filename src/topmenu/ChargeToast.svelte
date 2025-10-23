<script>
  import { onMount, onDestroy } from 'svelte';
  let visible = false;
  let text = '';
  let hideTo = null;
  let lastText = '';
  let lastAt = 0;
  function onMsg(e) {
    const d = e?.data;
    if (!d || d.source !== 'wplace-svelte') return;
    if (d.action === 'charges:update' && d.charges) {
      const c = Math.floor(Number(d.charges.count) || 0);
      const m = Math.floor(Number(d.charges.max) || 0);
      text = `${c} / ${m}`;
      const now = Date.now();
      if (!(text === lastText && (now - lastAt) < 1500)) { lastText = text; lastAt = now; show(); }
      return;
    }
  }
  function show() {
    visible = true;
    if (hideTo) { clearTimeout(hideTo); hideTo = null; }
    hideTo = setTimeout(()=>{ visible = false; }, 2500);
  }
  onMount(()=>{ 
    try { 
      window.addEventListener('message', onMsg); 
    } catch {};
  });
  onDestroy(()=>{ 
    try { 
      window.removeEventListener('message', onMsg); 
    } catch {}; 
    if (hideTo) { try { clearTimeout(hideTo); } catch {}; hideTo = null; } 
  });
</script>

{#if visible}
  <div class="charge-toast" role="status" aria-live="polite">
    {text}
  </div>
{/if}

<style>
  .charge-toast {
    position: absolute;
    top: calc(100% + 30px);
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 10px;
    border-radius: 10px;
    background: rgba(24,26,32,0.88);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 20px rgba(0,0,0,0.35);
    font-size: 13px;
    line-height: 1;
    z-index: 1000012;
    user-select: none;
    pointer-events: none;
  }
</style>
