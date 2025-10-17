<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  import { t } from '../i18n'
  import { idleSettingsStore, setIdleTimeoutSec, addGif, removeGif, toggleFavorite, setIdleEnabled } from './store'
  import GifGridItem from './GifGridItem.svelte'
  import type { GifItem } from './types'
  import PlacementMode from './PlacementMode.svelte'

  export let open = false

  let url = ''
  let tempIdle = 360
  let showPlace = false
  let placeItem: GifItem | null = null
  let initialized = false

  $: if (open && !initialized) {
    tempIdle = Math.max(5, Math.min(7200, Math.round(($idleSettingsStore?.idleTimeoutSec) || 360)))
    initialized = true
  }
  $: if (!open && initialized) { initialized = false }

  function close() { open = false }

  async function addUrl() {
    const s = (url || '').trim()
    if (!s) return
    const item = await addGif(s, true)
    if (item) url = ''
  }

  function mark(node: HTMLElement) {
    try { (node as any).wguard = 'WGuard' } catch {}
    return { destroy() {} }
  }

  function fitAnts(node: SVGSVGElement) {
    let ro: ResizeObserver | null = null
    function update() {
      try {
        const host = node.parentElement
        if (!host) return
        const r = host.getBoundingClientRect()
        const w = Math.max(0, Math.round(r.width))
        const h = Math.max(0, Math.round(r.height))
        node.setAttribute('viewBox', `0 0 ${w} ${h}`)
        const path = node.querySelector('path') as SVGPathElement | null
        const makeD = (x0:number,y0:number,x1:number,y1:number,rtlx:number,rtly:number,rtrx:number,rtry:number,rbrx:number,rbry:number,rblx:number,rbly:number) => [
          `M ${x0 + rtlx},${y0}`,
          `L ${x1 - rtrx},${y0}`,
          `A ${rtrx} ${rtry} 0 0 1 ${x1} ${y0 + rtry}`,
          `L ${x1} ${y1 - rbry}`,
          `A ${rbrx} ${rbry} 0 0 1 ${x1 - rbrx} ${y1}`,
          `L ${x0 + rblx} ${y1}`,
          `A ${rblx} ${rbly} 0 0 1 ${x0} ${y1 - rbly}`,
          `L ${x0} ${y0 + rtly}`,
          `A ${rtlx} ${rtly} 0 0 1 ${x0 + rtlx} ${y0}`,
          'Z'
        ].join(' ')
        if (path) {
          const cs = getComputedStyle(host)
          const parseR = (v:string) => {
            const s = String(v).trim().split('/')
              .map(part => part.trim().split(/\s+/).map(n => parseFloat(n)||0))
            const a = s[0]; const b = s[1] || a
            return { x: a[0] || 0, y: b[0] || a[0] || 0 }
          }
          const TL = parseR(cs.borderTopLeftRadius)
          const TR = parseR(cs.borderTopRightRadius)
          const BR = parseR(cs.borderBottomRightRadius)
          const BL = parseR(cs.borderBottomLeftRadius)
          const bwT = parseFloat(cs.borderTopWidth) || 0
          const bwR = parseFloat(cs.borderRightWidth) || 0
          const bwB = parseFloat(cs.borderBottomWidth) || 0
          const bwL = parseFloat(cs.borderLeftWidth) || 0
          const bw = (bwT + bwR + bwB + bwL) / 4
          const dpr = (window.devicePixelRatio || 1)
          const snap = (v:number) => Math.round(v * dpr) / dpr
          const inset = bw / 2
          const x0 = snap(Math.max(0, inset))
          const y0 = snap(Math.max(0, inset))
          const x1 = snap(Math.max(x0, w - inset))
          const y1 = snap(Math.max(y0, h - inset))
          let rtlx = Math.max(0, TL.x - inset), rtly = Math.max(0, TL.y - inset)
          let rtrx = Math.max(0, TR.x - inset), rtry = Math.max(0, TR.y - inset)
          let rbrx = Math.max(0, BR.x - inset), rbry = Math.max(0, BR.y - inset)
          let rblx = Math.max(0, BL.x - inset), rbly = Math.max(0, BL.y - inset)
          const iw = Math.max(0, x1 - x0)
          const ih = Math.max(0, y1 - y0)
          const scaleX = Math.min(1, rtlx + rtrx > 0 ? iw / (rtlx + rtrx) : 1, rblx + rbrx > 0 ? iw / (rblx + rbrx) : 1)
          const scaleY = Math.min(1, rtly + rbly > 0 ? ih / (rtly + rbly) : 1, rtry + rbry > 0 ? ih / (rtry + rbry) : 1)
          rtlx *= scaleX; rtrx *= scaleX; rblx *= scaleX; rbrx *= scaleX
          rtly *= scaleY; rtry *= scaleY; rbly *= scaleY; rbry *= scaleY
          rtlx = snap(rtlx); rtly = snap(rtly)
          rtrx = snap(rtrx); rtry = snap(rtry)
          rbrx = snap(rbrx); rbry = snap(rbry)
          rblx = snap(rblx); rbly = snap(rbly)
          path.setAttribute('d', makeD(x0, y0, x1, y1, rtlx, rtly, rtrx, rtry, rbrx, rbry, rblx, rbly))
          let L = 0; try { L = path.getTotalLength() } catch {}
          const ideal = 24
          const pairs = Math.max(10, Math.round(L / ideal))
          const dash = L / (pairs * 2)
          path.style.setProperty('--dash', `${dash.toFixed(2)}px`)
          const speed = Math.max(0.8, Math.min(1.8, L / 220))
          path.style.setProperty('--ants-speed', `${speed.toFixed(2)}s`)
        }
      } catch {}
    }
    try { ro = new ResizeObserver(update); if (node.parentElement) ro.observe(node.parentElement) } catch {}
    update()
    return { destroy() { try { ro && ro.disconnect() } catch {} } }
  }
</script>

{#if open}
  {#if !showPlace}
    <div use:appendToBody class="idle-backdrop" role="button" tabindex="0" on:click={close} on:keydown={(e)=>{if(e.key==='Escape')close();}}></div>
    <div use:appendToBody use:mark class="idle-modal" class:small={(($idleSettingsStore?.gifs || []).length === 0)} role="dialog" aria-modal="true" aria-label={t('idle.settings.title')}>
      <div class="idle-header">
        <div class="header-content">
          <h2>{t('idle.settings.title')}</h2>
        </div>
        <button class="close-btn" type="button" aria-label={t('btn.close')} on:click={close}>×</button>
      </div>

      <div class="idle-body-anim">
        <div class="idle-body">
          <div class="settings-wrap">
            <div class="tiles">
              <button type="button" class="tile {($idleSettingsStore?.enabled)?'selected':''}" aria-pressed={$idleSettingsStore?.enabled} on:click={() => setIdleEnabled(!$idleSettingsStore?.enabled)}>
                <div class="tile-inner"><span class="name">{$idleSettingsStore?.enabled ? t('idle.toggle.on') : t('idle.toggle.off')}</span></div>
                <svg class="ants" use:fitAnts aria-hidden="true"><path fill="none" /></svg>
              </button>
            </div>
            <div class="form-grid">
              <label for="idle-timeout">{t('idle.settings.idleTimeout')}</label>
              <input id="idle-timeout" type="number" min="5" max="7200" bind:value={tempIdle} on:input={() => setIdleTimeoutSec(tempIdle)} />
            </div>
          </div>

          <div class="collection-wrap">
            <div class="add-row">
              <input type="text" placeholder={t('idle.collection.url')} bind:value={url} />
              <button class="editor-btn editor-primary" on:click={addUrl}>{t('idle.collection.add')}</button>
            </div>
            {#if ($idleSettingsStore?.gifs || []).length === 0}
              <div class="empty">{t('idle.collection.empty')}</div>
            {:else}
              <div class="grid">
                {#each $idleSettingsStore.gifs as g (g.id)}
                  <div class="grid-item">
                    <GifGridItem item={g}
                      on:toggle={(e)=>toggleFavorite(e.detail.id)}
                      on:remove={(e)=>removeGif(e.detail.id)}
                      on:move={(e)=>{ const id = e.detail.id; const found = ($idleSettingsStore?.gifs || []).find(x=>x.id===id); if (found) { placeItem = found; showPlace = true } }} />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
  <PlacementMode bind:open={showPlace} bind:item={placeItem} />
{/if}

<style>
  .idle-backdrop { position: fixed; inset: 0; background: var(--wph-backdrop, rgba(0,0,0,0.5)); z-index: 2147483646; }
  .idle-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90vw; max-width: 820px; max-height: 80vh; background: var(--wph-surface, rgba(17,17,17,0.98)); border: 1px solid var(--wph-border, rgba(255,255,255,0.15)); border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden; transition: max-height .3s ease; color: var(--wph-text, #fff); }
  .idle-modal.small { max-height: 60vh; }
  .idle-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1)); background: var(--wph-surface2, rgba(255,255,255,0.03)); }
  .idle-header h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--wph-text, #fff); }
  .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--wph-surface, rgba(255,255,255,0.06)); color: var(--wph-text, #fff); font-size: 24px; line-height: 1; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
  .close-btn:hover { background: var(--wph-surface2, rgba(255,255,255,0.12)); transform: scale(1.05); }
  .idle-body-anim { flex: 1; overflow: auto; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--wph-border, rgba(255,255,255,0.35)) var(--wph-surface, rgba(255,255,255,0.08)); }
  .idle-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .settings-wrap { padding-top: 8px; }
  .collection-wrap { padding-top: 8px; }
  .form-grid { display: grid; grid-template-columns: 1fr 140px; gap: 12px; align-items: center; }
  .form-grid input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: var(--wph-surface, rgba(255,255,255,0.06)); color: inherit; outline: none; }
  .editor-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .editor-btn.editor-primary { background: var(--wph-primary, #f05123); border-color: rgba(255,255,255,0.25); }
  .add-row { display: grid; grid-template-columns: 1fr 140px; gap: 10px; margin-bottom: 12px; }
  .add-row input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: var(--wph-surface, rgba(255,255,255,0.06)); color: inherit; outline: none; }
  .empty { opacity: .8; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .grid-item { display: flex; flex-direction: column; gap: 8px; }

  .tiles { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin-bottom: 12px; }
  .tile { position: relative; display: block; padding: 8px 10px; border-radius: 12px; border: none; background: var(--wph-surface, rgba(255,255,255,0.04)); color: inherit; cursor: pointer; text-align: left; overflow: hidden; }
  .tile .tile-inner { display: grid; grid-template-columns: 1fr; align-items: center; gap: 10px; }
  .tile:hover { background: var(--wph-surface2, rgba(255,255,255,0.08)); }
  .tile .name { font-size: 12px; line-height: 1.2; opacity: 0.95; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
  .ants { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; }
  .ants path { stroke: var(--wph-primary, #f3734d); stroke-width: 2; stroke-linecap: butt; stroke-linejoin: round; stroke-dasharray: var(--dash) var(--dash); stroke-dashoffset: 0; filter: drop-shadow(0 0 3px var(--wph-primaryGlow, rgba(240,81,35,0.8))); vector-effect: non-scaling-stroke; }
  .tile.selected .ants { opacity: 1; }
  @keyframes antsRun { to { stroke-dashoffset: calc(-2 * var(--dash)); } }
  .tile.selected .ants path { animation: antsRun var(--ants-speed, 1.2s) linear infinite; }

  :global(.idle-body-anim::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(.idle-body-anim::-webkit-scrollbar-track) { background: var(--wph-surface, rgba(255,255,255,0.06)); border-radius: 8px; }
  :global(.idle-body-anim::-webkit-scrollbar-thumb) { background: var(--wph-border, rgba(255,255,255,0.28)); border-radius: 8px; }
  :global(.idle-body-anim::-webkit-scrollbar-thumb:hover) { background: var(--wph-border, rgba(255,255,255,0.38)); }
  :global(.idle-body-anim::-webkit-scrollbar-button) { display: none; width: 0; height: 0; }
</style>
