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
    <button class="btn" class:active={item.favorite} on:click={onToggle} aria-label="fav">★</button>
    <button class="btn" on:click={onMove} aria-label="move" title="move">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2l4 4h-3v4h-2V6H8l4-4zm0 20l-4-4h3v-4h2v4h3l-4 4zM2 12l4-4v3h4v2H6v3l-4-4zm20 0l-4 4v-3h-4v-2h4V8l4 4z"/>
      </svg>
    </button>
    <button class="btn" on:click={onRemove} aria-label="del">×</button>
  </div>
</div>

<style>
  .gif-card { display: flex; flex-direction: column; gap: 8px; background: var(--wph-surface, rgba(255,255,255,0.04)); border: 1px solid var(--wph-border, rgba(255,255,255,0.12)); border-radius: 10px; padding: 8px; }
  .gif-thumb { width: 100%; aspect-ratio: 1/1; border-radius: 8px; overflow: hidden; background: var(--wph-surface, rgba(255,255,255,0.06)); display: flex; align-items: center; justify-content: center; }
  .gif-thumb img { max-width: 100%; max-height: 100%; display: block; }
  .gif-actions { display: flex; gap: 8px; justify-content: center; align-items: center; }
  .btn { flex: 0 0 auto; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wph-border, rgba(255,255,255,0.18)); background: var(--wph-surface, rgba(255,255,255,0.07)); color: var(--wph-text, #fff); cursor: pointer; transition: all .15s ease; display: inline-flex; align-items: center; justify-content: center; }
  .gif-actions .btn { width: 32px; height: 32px; padding: 0; }
  .btn.active { background: var(--wph-primary, #f05123); color: var(--wph-onPrimary, #fff); }
  .btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
</style>
