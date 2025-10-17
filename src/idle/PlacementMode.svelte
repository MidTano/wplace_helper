<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  import { t } from '../i18n'
  import type { GifItem } from './types'
  import { idleSettingsStore, updateGifOffsets, updateGifSize } from './store'
  import { createEventDispatcher } from 'svelte'

  export let open = false
  export let item: GifItem | null = null

  const dispatch = createEventDispatcher()
  let dragging = false
  let resizing = false
  let resizingLB = false
  let startX = 0
  let startY = 0
  let startOX = 0
  let startOY = 0
  let startW: number | null = null
  let startH: number | null = null
  let keepRatio = true
  let lastMove = 0
  let origX = 0
  let origY = 0
  let origW: number | null = null
  let origH: number | null = null
  let started = false
  let activeItem: GifItem | null = null

  $: activeItem = item ? (($idleSettingsStore?.gifs || []).find(x => x.id === item.id) || item) : null

  function onStartDrag(e: MouseEvent) {
    if (!item) return
    dragging = true
    startX = e.clientX
    startY = e.clientY
    const cur = activeItem || item
    startOX = (cur && cur.offsetX) || 0
    startOY = (cur && cur.offsetY) || 0
    e.preventDefault()
  }

  function onStartResizeLB(e: MouseEvent) {
    if (!item) return
    resizingLB = true
    startX = e.clientX
    startY = e.clientY
    const cur = activeItem || item
    startW = (cur && cur.width) || 0
    startH = (cur && cur.height) || 0
    startOX = (cur && cur.offsetX) || 0
    startOY = (cur && cur.offsetY) || 0
    e.preventDefault()
  }

  function onMove(e: MouseEvent) {
    if (!item) return
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
    if (now - lastMove < 16) return
    lastMove = now
    if (dragging) {
      const dx = Math.round(e.clientX - startX)
      const dy = Math.round(e.clientY - startY)
      const nx = Math.round(startOX + dx)
      const ny = Math.round(startOY + dy)
      updateGifOffsets(item.id, nx, ny)
    } else if (resizing) {
      keepRatio = !e.shiftKey
      const dx = Math.round(e.clientX - startX)
      const dy = Math.round(e.clientY - startY)
      let w = Math.max(50, (startW || 0) + dx)
      let h = Math.max(50, (startH || 0) + (keepRatio ? Math.round(dx * ((startH || 1)/(startW || 1))) : dy))
      const vpW = Math.max(100, window.innerWidth || 0)
      const vpH = Math.max(100, window.innerHeight || 0)
      if (w > vpW) w = vpW
      if (h > vpH) h = vpH
      updateGifSize(item.id, w, h)
    } else if (resizingLB) {
      keepRatio = !e.shiftKey
      const dx = Math.round(e.clientX - startX)
      const dy = Math.round(e.clientY - startY)
      let w = Math.max(50, (startW || 0) - dx)
      let h: number
      if (keepRatio) {
        const ratio = (startH || 1) / (startW || 1)
        h = Math.max(50, Math.round(w * ratio))
      } else {
        h = Math.max(50, (startH || 0) + dy)
      }
      const vpW = Math.max(100, window.innerWidth || 0)
      const vpH = Math.max(100, window.innerHeight || 0)
      if (w > vpW) w = vpW
      if (h > vpH) h = vpH
      const nx = Math.round(startOX + dx)
      updateGifOffsets(item.id, nx, (activeItem?.offsetY ?? item.offsetY) || 0)
      updateGifSize(item.id, w, h)
    }
  }

  function onEnd() {
    dragging = false
    resizing = false
    resizingLB = false
  }

  function onStartResize(e: MouseEvent) {
    if (!item) return
    resizing = true
    startX = e.clientX
    startY = e.clientY
    const cur = activeItem || item
    startW = (cur && cur.width) || 0
    startH = (cur && cur.height) || 0
    e.preventDefault()
  }

  function mark(node: HTMLElement) { try { (node as any).wguard = 'WGuard' } catch {}; return { destroy() {} } }

  $: if (open && item && !started) {
    started = true
    const cur = activeItem || item
    origX = (cur && cur.offsetX) || 0
    origY = (cur && cur.offsetY) || 0
    origW = (cur && (cur.width ?? null)) ?? null
    origH = (cur && (cur.height ?? null)) ?? null
  }
  $: if (!open && started) { started = false }

  function confirmAction() {
    open = false
    dispatch('confirm', { id: item && item.id })
  }

  function cancelAction() {
    if (item) {
      updateGifOffsets(item.id, origX, origY)
      updateGifSize(item.id, origW, origH)
    }
    open = false
    dispatch('cancel', { id: item && item.id })
  }
</script>

<svelte:window on:mousemove={onMove} on:mouseup={onEnd} on:mouseout={onEnd} />

{#if open && item}
  <div use:appendToBody class="pm-backdrop"></div>
  <div use:appendToBody use:mark class="pm-wrap">
    <div class="pm-box" style={`transform: translate(${((activeItem?.offsetX ?? item.offsetX) || 0)}px, ${((activeItem?.offsetY ?? item.offsetY) || 0)}px);`}>
      <img src={activeItem?.url || item.url} alt="" style={`width:${(activeItem?.width ?? item.width)?(activeItem?.width ?? item.width)+'px':'auto'}; height:${(activeItem?.height ?? item.height)?(activeItem?.height ?? item.height)+'px':'33vh'};`} />
      <button class="pm-drag" type="button" aria-label="Drag to move" on:mousedown={onStartDrag}></button>
      <button class="pm-resize" type="button" aria-label="Resize" on:mousedown={onStartResize}></button>
      <button class="pm-resize-lb" type="button" aria-label="Resize LB" on:mousedown={onStartResizeLB}></button>
    </div>
    <div class="pm-controls">
      <button type="button" class="editor-btn" on:click={cancelAction} aria-label={t('common.cancel')}>{t('common.cancel')}</button>
      <button type="button" class="editor-btn editor-primary" on:click={confirmAction} aria-label={t('editor.apply')}>{t('editor.apply')}</button>
    </div>
  </div>
{/if}

<style>
  .pm-backdrop { position: fixed; inset: 0; z-index: 2147483600; background: rgba(10,10,10,0.85); backdrop-filter: blur(4px); }
  .pm-wrap { position: fixed; inset: 0; z-index: 2147483601; pointer-events: none; }
  .pm-box { position: fixed; left: 0; top: 0; transform-origin: left top; pointer-events: auto; }
  .pm-drag { position: absolute; inset: -20px -20px -20px -20px; cursor: move; border: none; background: transparent; padding: 0; }
  .pm-resize { position: absolute; right: -10px; bottom: -10px; width: 20px; height: 20px; border-radius: 50%; background: var(--wph-primary, #f05123); box-shadow: 0 0 0 3px rgba(0,0,0,0.2); cursor: nwse-resize; border: none; padding: 0; }
  .pm-resize-lb { position: absolute; left: -10px; bottom: -10px; width: 20px; height: 20px; border-radius: 50%; background: var(--wph-primary, #f05123); box-shadow: 0 0 0 3px rgba(0,0,0,0.2); cursor: nesw-resize; border: none; padding: 0; }
  .pm-controls { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; gap: 8px; pointer-events: auto; }
  .editor-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; }
  .editor-btn.editor-primary { background: var(--wph-primary, #f05123); border-color: rgba(255,255,255,0.25); }
</style>
