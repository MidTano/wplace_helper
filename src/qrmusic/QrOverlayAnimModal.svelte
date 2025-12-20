<script lang="ts">
  import { appendToBody } from '../editor/modal/utils/appendToBody'
  import { t } from '../i18n'
  import { getAutoConfig, updateAutoConfig } from '../screen/autoConfig'

  export let open = false

  type Anim = 'classic' | 'neon' | 'double' | 'dashed' | 'corners' | 'glass'

  let selected: Anim = 'glass'
  let initialized = false

  const options: Array<{ value: Anim; labelKey: string }> = [
    { value: 'classic', labelKey: 'settings.qr.anim.classic' },
    { value: 'neon', labelKey: 'settings.qr.anim.neon' },
    { value: 'double', labelKey: 'settings.qr.anim.double' },
    { value: 'dashed', labelKey: 'settings.qr.anim.dashed' },
    { value: 'corners', labelKey: 'settings.qr.anim.corners' },
    { value: 'glass', labelKey: 'settings.qr.anim.glass' },
  ]

  $: if (open && !initialized) {
    const cfg = getAutoConfig()
    const raw = (cfg && (cfg as any).qrOverlayAnim ? String((cfg as any).qrOverlayAnim) : 'glass')
    selected = (raw === 'classic' || raw === 'neon' || raw === 'double' || raw === 'dashed' || raw === 'corners' || raw === 'glass') ? (raw as Anim) : 'glass'
    initialized = true
  }
  $: if (!open && initialized) initialized = false

  function close() { open = false }

  function selectAnim(v: Anim) {
    selected = v
    updateAutoConfig({ qrOverlayAnim: v } as any)
  }
</script>

{#if open}
  <div use:appendToBody class="qra-backdrop" role="button" tabindex="0" on:click={close} on:keydown={(e)=>{if(e.key==='Escape')close();}}></div>
  <div use:appendToBody class="qra-modal" role="dialog" aria-modal="true" aria-label={t('settings.qr.anim.title')}>
    <div class="qra-header">
      <div class="qra-title">{t('settings.qr.anim.title')}</div>
      <button class="qra-close" type="button" aria-label={t('btn.close')} on:click={close}>×</button>
    </div>

    <div class="qra-body">
      <div class="qra-preview-wrap">
        <div class="qra-preview-label">{t('common.preview')}</div>
        <div class="qra-preview-stage">
          <div class="qra-preview" data-anim={selected}>
            <div class="ring"></div>
            <div class="badge" title="QR">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 0h2v2h-2v-2z" fill="currentColor"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div class="qra-options">
        {#each options as opt (opt.value)}
          <button type="button" class="qra-opt" class:active={selected === opt.value} aria-pressed={selected === opt.value} on:click={() => selectAnim(opt.value)}>
            <div class="qra-opt-name">{t(opt.labelKey)}</div>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .qra-backdrop { position: fixed; inset: 0; background: var(--wph-backdrop, rgba(0,0,0,0.5)); z-index: 2147483646; }
  .qra-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 92vw; max-width: 520px; max-height: 80vh; background: var(--wph-surface, rgba(17,17,17,0.98)); border: 1px solid var(--wph-border, rgba(255,255,255,0.15)); border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); z-index: 2147483647; display: flex; flex-direction: column; overflow: hidden; color: var(--wph-text, #fff); }
  .qra-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--wph-border, rgba(255,255,255,0.1)); background: var(--wph-surface2, rgba(255,255,255,0.03)); }
  .qra-title { font-size: 16px; font-weight: 700; }
  .qra-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--wph-surface, rgba(255,255,255,0.06)); color: var(--wph-text, #fff); font-size: 24px; line-height: 1; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
  .qra-close:hover { background: var(--wph-surface2, rgba(255,255,255,0.12)); transform: scale(1.05); }

  .qra-body { padding: 18px 20px 20px; display: grid; gap: 14px; overflow: auto; }

  .qra-preview-wrap { border-radius: 14px; border: 1px solid var(--wph-border, rgba(255,255,255,0.12)); background: var(--wph-surface2, rgba(255,255,255,0.04)); padding: 12px; }
  .qra-preview-label { font-size: 12px; opacity: 0.85; margin-bottom: 10px; }
  .qra-preview-stage { position: relative; border-radius: 14px; border: 1px solid var(--wph-border, rgba(255,255,255,0.14)); background: rgba(0,0,0,0.25); padding: 14px; display: grid; place-items: center; }
  .qra-preview { position: relative; width: 150px; height: 150px; border-radius: 14px; display: grid; place-items: center; overflow: hidden; --qrm-border: var(--wph-primary, #f05123); --qrm-glow: var(--wph-primaryGlow, rgba(240,81,35,0.55)); --qrm-glow2: var(--wph-primaryGlow, rgba(240,81,35,0.22)); }

  .qra-preview .ring { position: absolute; inset: 12px; border-radius: var(--qrm-radius, 14px); border: var(--qrm-bw, 2px) solid var(--qrm-border); box-shadow: var(--qrm-shadow, 0 0 0 2px rgba(0,0,0,0.55), 0 0 24px var(--qrm-glow), inset 0 0 18px var(--qrm-glow2)); transform: translateZ(0); }
  .qra-preview .ring::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
  .qra-preview .ring::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
  .qra-preview .badge { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: var(--wph-surface, rgba(12,12,14,0.65)); border: 1px solid var(--wph-border, rgba(255,255,255,0.18)); color: var(--wph-primary, #f05123); backdrop-filter: blur(6px); box-shadow: 0 10px 24px rgba(0,0,0,0.25); }
  .qra-preview .badge svg { width: 18px; height: 18px; display: block; opacity: 0.95; fill: currentColor; }

  .qra-preview[data-anim="classic"] { --qrm-radius: 14px; --qrm-bw: 2px; }
  .qra-preview[data-anim="classic"] .ring { overflow: hidden; }
  .qra-preview[data-anim="classic"] .ring::after { inset: -30% 0; background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 60%, rgba(255,255,255,0) 100%); mix-blend-mode: screen; filter: blur(0.2px); animation: qra-scanLine 1.65s ease-in-out infinite; }
  .qra-preview[data-anim="neon"] { --qrm-radius: 14px; --qrm-bw: 2px; --qrm-shadow: 0 0 0 2px rgba(0,0,0,0.55), 0 0 34px var(--wph-primaryGlow, rgba(240,81,35,0.7)), inset 0 0 24px var(--wph-primaryGlow, rgba(240,81,35,0.28)); }
  .qra-preview[data-anim="neon"] .ring { animation: qra-neonPulse 1.15s ease-in-out infinite; }
  .qra-preview[data-anim="double"] { --qrm-radius: 14px; --qrm-bw: 2px; }
  .qra-preview[data-anim="double"] .ring { animation: qra-doublePulse 1.35s ease-in-out infinite; }
  .qra-preview[data-anim="double"] .ring::before { inset: 5px; border: 2px solid rgba(255,255,255,0.24); box-shadow: inset 0 0 12px rgba(0,0,0,0.22); animation: qra-doubleInner 1.35s ease-in-out infinite; }
  .qra-preview[data-anim="dashed"] { --qrm-radius: 14px; --qrm-bw: 0px; --qrm-dash-bw: 3px; --qrm-dash-l: 10px; --qrm-dash-g: 8px; }
  .qra-preview[data-anim="dashed"] .ring { border: 0; }
  .qra-preview[data-anim="dashed"] .ring::before { inset: 0; border-radius: inherit; box-sizing: border-box; padding: var(--qrm-dash-bw, 3px); background:
    repeating-linear-gradient(90deg, var(--qrm-border) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 0 0/100% var(--qrm-dash-bw, 3px) no-repeat,
    repeating-linear-gradient(180deg, var(--qrm-border) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 100% 0/var(--qrm-dash-bw, 3px) 100% no-repeat,
    repeating-linear-gradient(90deg, var(--qrm-border) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 0 100%/100% var(--qrm-dash-bw, 3px) no-repeat,
    repeating-linear-gradient(180deg, var(--qrm-border) 0 var(--qrm-dash-l, 10px), rgba(0,0,0,0) var(--qrm-dash-l, 10px) calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 0 0/var(--qrm-dash-bw, 3px) 100% no-repeat;
    background-position: 0 0, 100% 0, 0 100%, 0 0;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    filter: drop-shadow(0 0 6px var(--wph-primaryGlow, rgba(240,81,35,0.45)));
    animation: qra-dashMarch 1.1s linear infinite;
  }
  .qra-preview[data-anim="corners"] { --qrm-radius: 0px; --qrm-bw: 0px; --qrm-shadow: none; }
  .qra-preview[data-anim="corners"] .ring::before { inset: 0; border-radius: 0; --qrm-corner-l: min(22px, 20%); --qrm-corner-t: clamp(2px, 2.6%, 4px); background:
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left top/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left top/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right top/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right top/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left bottom/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) left bottom/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right bottom/var(--qrm-corner-l) var(--qrm-corner-t) no-repeat,
    linear-gradient(var(--wph-primary, #f05123),var(--wph-primary, #f05123)) right bottom/var(--qrm-corner-t) var(--qrm-corner-l) no-repeat;
    transform-origin: center; animation: qra-cornerPop 1.05s ease-in-out infinite; }
  .qra-preview[data-anim="glass"] { --qrm-radius: 16px; --qrm-bw: 1px; --qrm-border: rgba(255,255,255,0.24); --qrm-shadow: 0 10px 36px rgba(0,0,0,0.28), 0 0 0 2px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08); }
  .qra-preview[data-anim="glass"] .ring { background: radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.00) 100%); overflow: hidden; }
  .qra-preview[data-anim="glass"] .ring::after { inset: 0; background: linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0) 60%); mix-blend-mode: overlay; transform: translateX(-120%); animation: qra-glassShine 2.65s ease-in-out infinite; }
  .qra-preview[data-anim="pixel"] { --qrm-radius: 0px; --qrm-bw: 3px; --qrm-shadow: 0 0 0 2px rgba(0,0,0,0.55), 0 0 18px var(--wph-primaryGlow, rgba(240,81,35,0.45)); }
  .qra-preview[data-anim="pixel"] .ring { overflow: hidden; }
  .qra-preview[data-anim="pixel"] .ring::before { inset: -3px; border-radius: inherit; background:
    linear-gradient(90deg, rgba(240,81,35,0.35) 0 50%, rgba(0,0,0,0) 50% 100%),
    linear-gradient(0deg, rgba(240,81,35,0.25) 0 50%, rgba(0,0,0,0) 50% 100%);
    background-size: 6px 6px, 6px 6px; mix-blend-mode: screen; opacity: 0.9; animation: qra-pixelNoise 0.22s linear infinite; }
  .qra-preview[data-anim="pixel"] .ring::after { inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); opacity: 0.75; animation: qra-pixelGlow 0.7s ease-in-out infinite; }

  @keyframes qra-neonPulse { 0% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.03); filter: brightness(1.35); } 100% { transform: scale(1); filter: brightness(1); } }
  @keyframes qra-dashMarch { to { background-position: calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px)) 0, 100% calc(var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px)), calc(-1 * (var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))) 100%, 0 calc(-1 * (var(--qrm-dash-l, 10px) + var(--qrm-dash-g, 8px))); } }
  @keyframes qra-scanLine { 0% { transform: translateY(-120%); opacity: 0; } 18% { opacity: 0.62; } 45% { opacity: 0.18; } 100% { transform: translateY(120%); opacity: 0; } }
  @keyframes qra-glassShine { 0% { transform: translateX(-120%); opacity: 0; } 20% { opacity: 0.95; } 55% { opacity: 0.55; } 100% { transform: translateX(120%); opacity: 0; } }
  @keyframes qra-cornerPop { 0% { transform: scale(0.96); } 50% { transform: scale(1.02); } 100% { transform: scale(0.96); } }
  @keyframes qra-doublePulse { 0% { transform: translateZ(0) scale(1); } 50% { transform: translateZ(0) scale(1.03); } 100% { transform: translateZ(0) scale(1); } }
  @keyframes qra-doubleInner { 0% { opacity: 0.75; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1.02); } 100% { opacity: 0.75; transform: scale(0.98); } }
  @keyframes qra-pixelNoise { 0% { background-position: 0 0, 0 0; } 50% { background-position: 3px 3px, -3px -3px; } 100% { background-position: 6px 6px, -6px -6px; } }
  @keyframes qra-pixelGlow { 0% { opacity: 0.55; } 50% { opacity: 1; } 100% { opacity: 0.55; } }

  .qra-options { display: grid; gap: 8px; }
  .qra-opt { width: 100%; text-align: left; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--wph-border, rgba(255,255,255,0.12)); background: var(--wph-surface, rgba(255,255,255,0.04)); color: inherit; cursor: pointer; transition: background .15s ease, border-color .15s ease, transform .15s ease; }
  .qra-opt:hover { background: var(--wph-surface2, rgba(255,255,255,0.08)); transform: translateY(-1px); }
  .qra-opt.active { border-color: var(--wph-primary, #f05123); box-shadow: 0 0 0 2px var(--wph-primaryGlow, rgba(240,81,35,0.22)); }
  .qra-opt-name { font-size: 13px; font-weight: 600; }
</style>
