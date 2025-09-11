import { getAutoConfig } from '../screen/autoConfig';

let enabled = false;
let intervalMs = 10000;

function post(action: 'antiIdle:start'|'antiIdle:stop', ms?: number) {
  try { window.postMessage({ source: 'wplace-svelte', action, intervalMs: ms }, '*'); } catch {}
}

export function startAntiIdle(ms = 10000) {
  enabled = true;
  intervalMs = Math.max(2000, Number(ms) || 10000);
  post('antiIdle:start', intervalMs);
}

export function stopAntiIdle() {
  enabled = false;
  post('antiIdle:stop');
}

export function setAntiIdleEnabled(on: boolean, ms = 10000) {
  if (on) startAntiIdle(ms); else stopAntiIdle();
}

export function applyAntiIdleFromConfig() {
  try {
    const cfg = getAutoConfig();
    setAntiIdleEnabled(!!cfg.antiIdleEnabled, 10000);
  } catch {}
}

export function initAntiIdle() {
  applyAntiIdleFromConfig();
  try {
    (window as any).wplaceToggleAntiIdle = (v: boolean) => setAntiIdleEnabled(!!v, intervalMs);
  } catch {}
}
