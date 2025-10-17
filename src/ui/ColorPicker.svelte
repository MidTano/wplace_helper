<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  import { t } from '../i18n'
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte'

  export let x = 0
  export let y = 0
  export let value: string = '#080808'

  const dispatch = createEventDispatcher()
  let hostEl: HTMLElement | null = null
  let left = 0
  let top = 0

  async function reposition() {
    try {
      await tick()
      const pad = 10
      const W = Math.max(0, window.innerWidth || 0)
      const H = Math.max(0, window.innerHeight || 0)
      const el = hostEl
      // fallback sizes if not rendered yet
      const w = Math.max(240, el?.offsetWidth || 260)
      const h = Math.max(240, el?.offsetHeight || 420)
      let nx = Math.round(x)
      let ny = Math.round(y)
      if (nx + w > W - pad) nx = Math.max(pad, W - w - pad)
      if (ny + h > H - pad) ny = Math.max(pad, H - h - pad)
      if (nx < pad) nx = pad
      if (ny < pad) ny = pad
      left = nx
      top = ny
    } catch {}
  }

  let _resizeHandler = () => reposition()
  let _scrollHandler = () => reposition()
  onMount(() => {
    left = x; top = y; reposition()
    try { window.addEventListener('resize', _resizeHandler) } catch {}
    try { window.addEventListener('scroll', _scrollHandler, { passive: true }) } catch {}
  })
  onDestroy(() => {
    try { window.removeEventListener('resize', _resizeHandler) } catch {}
    try { window.removeEventListener('scroll', _scrollHandler as any) } catch {}
  })
  $: x, y, reposition()

  function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

  function hexToRgb(hex: string) {
    let v = String(hex || '').trim()
    if (!v.startsWith('#')) return null
    if (v.length === 4) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
    const m = /^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(v)
    if (!m) return null
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 1 }
  }
  function parseRgba(s: string) {
    const m = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)/i.exec(String(s||''))
    if (!m) return null
    const r = clamp(parseInt(m[1]), 0, 255)
    const g = clamp(parseInt(m[2]), 0, 255)
    const b = clamp(parseInt(m[3]), 0, 255)
    const a = m[4] != null ? clamp(parseFloat(m[4]), 0, 1) : 1
    return { r, g, b, a }
  }
  function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const d = max - min
    let h = 0
    const s = max === 0 ? 0 : d / max
    const v = max
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h: h * 360, s: s * 100, v: v * 100 }
  }
  function hsvToRgb(h: number, s: number, v: number) {
    h /= 360; s /= 100; v /= 100
    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)
    let r=0,g=0,b=0
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break
      case 1: r = q; g = v; b = p; break
      case 2: r = p; g = v; b = t; break
      case 3: r = p; g = q; b = v; break
      case 4: r = t; g = p; b = v; break
      case 5: r = v; g = p; b = q; break
    }
    return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) }
  }

  let pickerR = 8, pickerG = 8, pickerB = 8
  let pickerA = 100
  let pickerH = 0, pickerS = 100, pickerV = 3
  let isDraggingSV = false

  function setFromValue(v: string) {
    const rgba = parseRgba(v) || hexToRgb(v)
    const c = rgba || { r: 8, g: 8, b: 8, a: 1 }
    pickerR = c.r; pickerG = c.g; pickerB = c.b; pickerA = Math.round((c.a ?? 1) * 100)
    const hsv = rgbToHsv(c.r, c.g, c.b)
    pickerH = hsv.h; pickerS = hsv.s; pickerV = hsv.v
  }

  $: setFromValue(value)

  function emitColor() {
    const a = clamp(pickerA, 0, 100) / 100
    const out = `rgba(${clamp(pickerR,0,255)}, ${clamp(pickerG,0,255)}, ${clamp(pickerB,0,255)}, ${a.toFixed(2)})`
    dispatch('change', { value: out })
  }

  function updateFromRgb() {
    pickerR = clamp(pickerR|0, 0, 255)
    pickerG = clamp(pickerG|0, 0, 255)
    pickerB = clamp(pickerB|0, 0, 255)
    const hsv = rgbToHsv(pickerR, pickerG, pickerB)
    pickerH = hsv.h; pickerS = hsv.s; pickerV = hsv.v
    emitColor()
  }
  function updateFromHsv() {
    const rgb = hsvToRgb(pickerH, pickerS, pickerV)
    pickerR = rgb.r; pickerG = rgb.g; pickerB = rgb.b
    emitColor()
  }
  function updateA() { pickerA = clamp(pickerA|0, 0, 100); emitColor() }

  function handleSVDown(ev: MouseEvent) { isDraggingSV = true; handleSVMove(ev) }
  function handleSVMove(ev: MouseEvent) {
    if (!isDraggingSV) return
    const el = ev.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    const x = clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1)
    const y = clamp((ev.clientY - r.top) / Math.max(1, r.height), 0, 1)
    pickerS = x * 100
    pickerV = (1 - y) * 100
    updateFromHsv()
  }
  function handleSVUp() { isDraggingSV = false }

  function close() { dispatch('close') }
</script>

<div class="custom-color-picker" use:appendToBody bind:this={hostEl} style={`left:${left}px; top:${top}px;`}>
  <div class="picker-header">
    <span>{t('settings.colorPicker.title')}</span>
    <button class="picker-close" on:click={close}>×</button>
  </div>
  <div class="picker-body">
    <div 
      class="picker-sv-area"
      style={`background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${pickerH}, 100%, 50%));`}
      on:mousedown={handleSVDown}
      on:mousemove={handleSVMove}
      on:mouseup={handleSVUp}
      on:mouseleave={handleSVUp}
      role="slider"
      tabindex="0"
      aria-label="SV"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(pickerS)}
    >
      <div class="picker-sv-cursor" style={`left:${pickerS}%; top:${100 - pickerV}%;`}></div>
    </div>

    <div class="picker-sliders">
      <div class="slider-row">
        <span class="slider-label">HUE</span>
        <input type="range" min="0" max="360" bind:value={pickerH} on:input={updateFromHsv} class="color-slider hue-slider" />
      </div>
      <div class="slider-row">
        <span class="slider-label">R</span>
        <input type="range" min="0" max="255" bind:value={pickerR} on:input={updateFromRgb} class="color-slider red-slider" />
        <input type="number" min="0" max="255" bind:value={pickerR} on:input={updateFromRgb} class="color-input" />
      </div>
      <div class="slider-row">
        <span class="slider-label">G</span>
        <input type="range" min="0" max="255" bind:value={pickerG} on:input={updateFromRgb} class="color-slider green-slider" />
        <input type="number" min="0" max="255" bind:value={pickerG} on:input={updateFromRgb} class="color-input" />
      </div>
      <div class="slider-row">
        <span class="slider-label">B</span>
        <input type="range" min="0" max="255" bind:value={pickerB} on:input={updateFromRgb} class="color-slider blue-slider" />
        <input type="number" min="0" max="255" bind:value={pickerB} on:input={updateFromRgb} class="color-input" />
      </div>
      <div class="slider-row">
        <span class="slider-label">A</span>
        <input type="range" min="0" max="100" bind:value={pickerA} on:input={updateA} class="color-slider alpha-slider" />
        <input type="number" min="0" max="100" bind:value={pickerA} on:input={updateA} class="color-input" />
      </div>
    </div>
  </div>
</div>

<style>
  .custom-color-picker { position: fixed; z-index: 2147483648; min-width: 240px; padding: 0; border-radius: 12px; background: var(--wph-surface, rgba(20,20,20,0.98)); border: 1px solid var(--wph-border, rgba(255,255,255,0.2)); box-shadow: 0 16px 40px rgba(0,0,0,0.6); backdrop-filter: blur(8px); overflow: hidden; color: #fff; }
  .picker-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1)); background: var(--wph-surface, rgba(255,255,255,0.03)); }
  .picker-header span { font-size: 13px; font-weight: 500; opacity: 0.95; color: #fff; }
  .picker-close { width: 28px; height: 28px; border-radius: 6px; border: none; background: var(--wph-surface, rgba(255,255,255,0.06)); color: #fff; cursor: pointer; font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all .15s ease; }
  .picker-close:hover { background: var(--wph-surface2, rgba(255,255,255,0.12)); transform: scale(1.05); }
  .picker-body { padding: 16px; }
  .picker-sv-area { width: 100%; height: 180px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.2); position: relative; cursor: crosshair; margin-bottom: 16px; user-select: none; overflow: hidden; }
  .picker-sv-cursor { position: absolute; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4); }
  .picker-sliders { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
  .slider-row { display: grid; grid-template-columns: 35px 1fr 60px; gap: 10px; align-items: center; }
  .slider-row:first-child { grid-template-columns: 35px 1fr; }
  .slider-label { font-size: 12px; font-weight: 600; opacity: 0.9; color: #fff; }
  .color-slider { width: 100%; height: 10px; border-radius: 5px; outline: none; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); cursor: pointer; }
  .color-slider::-webkit-slider-track { width: 100%; height: 10px; border-radius: 5px; border: none; }
  .color-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: white; cursor: pointer; border: 3px solid rgba(0,0,0,0.5); box-shadow: 0 3px 8px rgba(0,0,0,0.5); margin-top: -5px; }
  .color-slider::-moz-range-track { width: 100%; height: 10px; border-radius: 5px; border: none; }
  .color-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: white; cursor: pointer; border: 3px solid rgba(0,0,0,0.5); box-shadow: 0 3px 8px rgba(0,0,0,0.5); }
  .hue-slider { background: linear-gradient(to right, rgb(255,0,0) 0%, rgb(255,255,0) 16.66%, rgb(0,255,0) 33.33%, rgb(0,255,255) 50%, rgb(0,0,255) 66.66%, rgb(255,0,255) 83.33%, rgb(255,0,0) 100%); border: 2px solid rgba(255,255,255,0.5); }
  .color-input { width: 60px; padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fff; font-size: 13px; text-align: center; outline: none; }
</style>
