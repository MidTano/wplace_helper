<script lang="ts">
  import type { GifItem } from './types'
  import { createEventDispatcher } from 'svelte'
  export let item: GifItem
  const dispatch = createEventDispatcher()
  function onToggle() { dispatch('toggle', { id: item.id }) }
  function onRemove() { dispatch('remove', { id: item.id }) }
  function onMove() { dispatch('move', { id: item.id }) }
</script>

<div class="gif-card">
  <div class="gif-thumb">
    <img src={item.url} alt="" loading="lazy" />
  </div>
  <div class="gif-actions">
    <button class="btn" class:active={item.favorite} on:click={onToggle} aria-label="fav" title="fav">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    </button>
    <button class="btn" on:click={onMove} aria-label="move" title="move">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2l4 4h-3v4h-2V6H8l4-4zm0 20l-4-4h3v-4h2v4h3l-4 4zM2 12l4-4v3h4v2H6v3l-4-4zm20 0l-4 4v-3h-4v-2h4V8l4 4z"/>
      </svg>
    </button>
    <button class="btn" on:click={onRemove} aria-label="del" title="del">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .gif-card { display: flex; flex-direction: column; gap: 8px; background: var(--wph-surface, rgba(255,255,255,0.04)); border: 1px solid var(--wph-border, rgba(255,255,255,0.12)); border-radius: 10px; padding: 8px; }
  .gif-thumb { width: 100%; aspect-ratio: 1/1; border-radius: 8px; overflow: hidden; background: var(--wph-surface, rgba(255,255,255,0.06)); display: flex; align-items: center; justify-content: center; }
  .gif-thumb img { max-width: 100%; max-height: 100%; display: block; }
  .gif-actions { display: flex; gap: 8px; justify-content: center; align-items: center; }
  .btn { width: 34px; height: 34px; flex: 0 0 auto; padding: 0; border-radius: 10px; border: 1px solid var(--wph-border, rgba(255,255,255,0.18)); background: var(--wph-surface, rgba(255,255,255,0.07)); color: var(--wph-text, #fff); cursor: pointer; transition: background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .15s ease; display: inline-flex; align-items: center; justify-content: center; outline: none; }
  .btn:hover { background: var(--wph-surface2, rgba(255,255,255,0.12)); transform: translateY(-1px); }
  .btn:focus,
  .btn:focus-visible { border-color: var(--wph-primary, #f05123); box-shadow: 0 0 0 2px color-mix(in srgb, var(--wph-primary, #f05123) 35%, transparent); }
  .btn.active { background: var(--wph-primary, #f05123); border-color: rgba(255,255,255,0.25); color: var(--wph-onPrimary, #fff); }
</style>
