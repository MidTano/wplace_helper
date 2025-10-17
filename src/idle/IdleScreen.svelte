<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let visible = false;
  export let hiding = false;
  export let gifUrl = '';
  export let offsetY = 0;
  export let offsetX = 0;
  export let width: number | null = null;
  export let height: number | null = null;

  const dispatch = createEventDispatcher();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      dispatch('instantHide');
    }
  }

  function handleBackdropKeyDown() {}
</script>

{#if visible}
  <div class="idle-backdrop" class:hiding on:click={handleBackdropClick} on:keydown={handleBackdropKeyDown} role="button" tabindex="0">
    <div class="gif-container" class:hiding style={`transform: translate(${offsetX || 0}px, ${(offsetY || 0)}px);`}>
      <img src={gifUrl} alt="" class="idle-gif" style={`height:${height ? height + 'px' : '33vh'}; max-height:${height ? height + 'px' : '33vh'}; width:${width ? width + 'px' : 'auto'};`} />
    </div>
  </div>
{/if}

<style>
  .idle-backdrop {
    position: fixed;
    inset: 0;
    display: block;
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(6px);
    z-index: 999999;
    pointer-events: auto;
    cursor: pointer;
    animation: backdropFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .idle-backdrop.hiding {
    animation: backdropFadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes backdropFadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(6px);
    }
  }

  @keyframes backdropFadeOut {
    from {
      opacity: 1;
      backdrop-filter: blur(6px);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
  }

  .gif-container {
    position: fixed;
    left: 0;
    top: 0;
    pointer-events: none;
    animation: gifAppear 0.35s ease-out;
  }

  .gif-container.hiding {
    animation: gifDisappear 0.35s ease-in forwards;
  }

  @keyframes gifAppear { from { opacity: 0; } to { opacity: 1; } }

  @keyframes gifDisappear { from { opacity: 1; } to { opacity: 0; } }

  .idle-gif {
    display: block;
    height: 33vh;
    max-height: 33vh;
    width: auto;
  }
</style>
