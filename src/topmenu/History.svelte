<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getList, getBlob, addOrUpdate } from './historyStore';
  import { t, lang } from '../i18n';

  const dispatch = createEventDispatcher();
  let open = false;
  let items = [];
  let btnEl; let popEl; let posX = 0; let posY = 0;

  function toggle() { open = !open; if (open) { refresh(); updatePosition(); } }
  function refresh() { items = getList(); checkAvailability(); }

  let hasBlobMap = new Map();
  async function checkAvailability() {
    try {
      const list = Array.isArray(items) ? items.slice(0, 10) : [];
      await Promise.all(list.map(async (it) => {
        try { const b = await getBlob(it.id); hasBlobMap.set(it.id, !!b); } catch { hasBlobMap.set(it.id, false); }
      }));
      
      hasBlobMap = new Map(hasBlobMap);
    } catch {}
  }

  function pickFileNative(accept = 'image/*') {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = accept; input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', () => {
          const f = input.files && input.files[0];
          input.remove();
          if (f) resolve(f); else reject(new Error('no file'));
        }, { once: true });
        input.click();
      } catch (e) { reject(e); }
    });
  }

  async function onItemClick(meta) {
    
    let blob = await getBlob(meta.id);
    if (!blob) {
      
      try {
        const file = await pickFileNative();
        const saved = await addOrUpdate(file, file.name, (meta && meta.origin) ? meta.origin : (meta && meta.coords ? meta.coords : null));
        blob = file;
        refresh();
      } catch {}
    }
    if (blob) {
      dispatch('load', { blob, meta });
      open = false;
    }
  }

  async function onItemDownload(meta, ev) {
    try { ev && ev.stopPropagation && ev.stopPropagation(); } catch {}
    try {
      const blob = await getBlob(meta.id);
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = meta?.name || 'image.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ try { URL.revokeObjectURL(a.href); a.remove(); } catch {} }, 600);
    } catch {}
  }

  function portal(node) { try { document.body.appendChild(node); } catch {} return { destroy() { try { node.remove(); } catch {} } }; }
  async function updatePosition() {
    try {
      await Promise.resolve();
      const r = btnEl?.getBoundingClientRect?.();
      const W = Math.max(0, window.innerWidth || 0);
      const pad = 10;
      const mwRaw = popEl?.offsetWidth || 0;
      const mw = Math.max(240, mwRaw || 260);
      const nx = Math.max(pad, Math.min(Math.round((r?.left || 0) + (r?.width || 0)/2 - mw/2), W - mw - pad));
      const ny = Math.round((r?.bottom || 0) + 8);
      posX = nx; posY = ny;
    } catch {}
  }
  onMount(() => { refresh(); try { window.addEventListener('resize', updatePosition); } catch {} return () => { try { window.removeEventListener('resize', updatePosition); } catch {} }; });
  
  $: _i18n_history_lang = $lang;
  $: L_history = ($lang, t('btn.history'));
</script>

<div class="tm-history-wrap" role="group">
  <button bind:this={btnEl} class="tm-fab" aria-label={L_history} data-label={L_history} on:click={toggle} aria-expanded={open} aria-controls="tm-history-popover">
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
      <rect x="14" y="19" width="4" height="2"/>
      <path d="M6,2V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V2ZM24,28H8V16H24Zm0-14H8V10H24ZM8,8V4H24V8Z"/>
    </svg>
  </button>
  {#if open}
    <div use:portal bind:this={popEl} id="tm-history-popover" class="tm-history-popover" role="menu" tabindex="0" style={`left:${posX}px; top:${posY}px`}
         on:mouseleave={() => open=false}
         on:keydown={(e)=>{ if(e.key==='Escape') open=false; }}>
      {#if items.length === 0}
        <div class="empty">{t('history.empty')}</div>
      {:else}
        <ul class="list" role="none">
          {#each items as it (it.id)}
            <li role="none">
              <div class="row" role="menuitem" tabindex="0" on:click={() => onItemClick(it)} on:keydown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); onItemClick(it); } }} title={`${it.name} • ${Math.round(it.size/1024)} ${t('units.kb')}${(it.coords && Number.isFinite(it.coords.x) && Number.isFinite(it.coords.y))?` • x:${it.coords.x} y:${it.coords.y}`:''}`}>
                <div class="row-head">
                  <div class="name">{it.name}</div>
                  {#if hasBlobMap.get(it.id)}
                    <button class="dl-btn" title={t('editor.saveImage')} aria-label={t('editor.saveImage')} on:click={(e)=>onItemDownload(it, e)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zM7 5h8v4H7V5zm5 14H6v-6h6v6z"></path></svg>
                    </button>
                  {/if}
                </div>
                <div class="meta">
                  <span>{Math.round(it.size/1024)} {t('units.kb')}</span>
                  {#if it.coords && Number.isFinite(it.coords.x) && Number.isFinite(it.coords.y)}
                    <span>• x:{it.coords.x} y:{it.coords.y}</span>
                  {/if}
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
  
</div>

<style>
  .tm-history-wrap { position: relative; }
  .tm-history-popover {
    position: fixed;
    background: rgba(17,17,17,0.96);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px; padding: 8px; min-width: 240px; max-height: 260px; overflow: auto;
    box-shadow: 0 12px 28px rgba(0,0,0,0.45);
    backdrop-filter: blur(6px);
    z-index: 1000003;
  }
  .empty { padding: 6px 8px; opacity: .7; }
  .list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
  .row {
    width: 100%; text-align: left; display: flex; flex-direction: column; gap: 2px;
    padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;
    transition: background .15s ease, transform .15s ease;
  }
  .row:hover { background: rgba(255,255,255,0.07); transform: translateY(-1px); }
  .row-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .name { font-weight: 600; }
  .meta { font-size: 12px; opacity: .85; }
  .dl-btn { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; }
  .dl-btn:hover { background: rgba(255,255,255,0.1); }
</style>
