<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  export let message: string = ''
  export let duration: number = 3000
  let open = true
  let timer: any
  function close() { open = false }
  $: if (open) { clearTimeout(timer); timer = setTimeout(close, Math.max(800, duration)) }
</script>

{#if open}
  <div class="toast-wrap" use:appendToBody>
    <button class="toast" type="button" on:click={close} aria-label="Close notification">{message}</button>
  </div>
{/if}

<style>
  .toast-wrap { position: fixed; inset: 0; pointer-events: none; z-index: 1000030; }
  .toast { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); pointer-events: auto; background: var(--wph-surface, rgba(20,20,20,0.96)); color: var(--wph-text, #fff); border: 1px solid var(--wph-border, rgba(255,255,255,0.18)); box-shadow: 0 10px 24px rgba(0,0,0,0.45); border-radius: 10px; padding: 10px 14px; font-size: 14px; min-width: 200px; text-align: center; }
</style>
