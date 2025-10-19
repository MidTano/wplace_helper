import App from './App.svelte';
import { setLoggingEnabled } from './overlay/log';
import { applyDarkTheme } from './theme/darkTheme';
import { registerAltCV } from './share/altcv';
import { bootstrapWGuard, markElement } from './wguard';
import './styles/wph-shared.css';
import { setupPerfObserver, perfMark } from './utils/perf';

const __isTop = (() => { try { return window.top === window; } catch { return true; } })();

function __hash32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}

function computeZIndex(): number {
  try {
    const raw = sessionStorage.getItem('wguard:user-config');
    if (raw) {
      const cfg = JSON.parse(raw);
      const fp = String(cfg?.config?.fingerprint || '');
      const ver = String(cfg?.config?.version || '');
      const seed = (__hash32(fp) ^ __hash32(ver)) >>> 0;
      const min = 1000000;
      const max = 900000000;
      const span = max - min;
      return min + (seed % span);
    }
  } catch {}
  return 2140000000 - Math.floor(Math.random() * 10000);
}

setupPerfObserver();
if (__isTop) { (async () => { try { perfMark('wguard:bootstrap:start'); await bootstrapWGuard(); } catch {} finally { try { perfMark('wguard:bootstrap:end'); } catch {} } })(); }

async function mount() {
  perfMark('mount:start');
  
  const rootId = '_' + Math.random().toString(36).slice(2, 8);
  if (document.getElementById(rootId)) return;
  const container = document.createElement('div');
  markElement(container);
  container.id = rootId;
  document.body.appendChild(container);
  try { (window as any).__wphPortalContainer = container; } catch {}

  let shadow: ShadowRoot | null = null;
  try { shadow = (container as any).attachShadow({ mode: 'closed' }); } catch {}
  const host = shadow || container;
  try { (window as any).__wphPortalHost = host; } catch {}

  if (!shadow) {
    try {
      const z = computeZIndex();
      container.style.position = 'fixed';
      container.style.pointerEvents = 'none';
      container.style.zIndex = String(z);
      container.style.setProperty('--z-base', String(z));
      container.style.setProperty('--z-menu', String(z + 200));
      container.style.setProperty('--z-popover', String(z + 300));
      container.style.setProperty('--z-backdrop', String(z + 1000));
      container.style.setProperty('--z-modal', String(z + 1001));
    } catch {}
  }

  try {
    const pStyle = document.createElement('style');
    markElement(pStyle);
    const z = computeZIndex();
    pStyle.textContent = `:host{all:initial;position:fixed;pointer-events:none;z-index:${z};--z-base:${z};--z-menu:${z + 200};--z-popover:${z + 300};--z-backdrop:${z + 1000};--z-modal:${z + 1001}}*,input,button{pointer-events:auto}`;
    host.appendChild(pStyle);
  } catch {}

  try {
    const copyStyles = () => {
      const nodes = Array.from(document.head.querySelectorAll('style,link[rel="stylesheet"]')) as (HTMLStyleElement|HTMLLinkElement)[];
      for (const n of nodes) {
        if ((n as any).__wguard_cloned) continue;
        let clone: Node | null = null;
        if (n.tagName === 'STYLE') {
          const s = document.createElement('style');
          markElement(s);
          s.textContent = (n as HTMLStyleElement).textContent || '';
          (s as any).__wguard_cloned = true;
          clone = s;
        } else {
          const l = document.createElement('link');
          markElement(l);
          l.rel = 'stylesheet';
          l.href = (n as HTMLLinkElement).href;
          (l as any).__wguard_cloned = true;
          clone = l;
        }
        try { host.appendChild(clone!); } catch {}
      }
    };
    perfMark('copyStyles:start');
    copyStyles();
    perfMark('copyStyles:end');
    let copyScheduled = false;
    const scheduleCopy = () => {
      if (copyScheduled) return;
      copyScheduled = true;
      try {
        requestAnimationFrame(() => { copyScheduled = false; try { copyStyles(); } catch {} });
      } catch {
        copyScheduled = false; try { copyStyles(); } catch {}
      }
    };
    const mo = new MutationObserver(() => { scheduleCopy(); });
    try { mo.observe(document.head, { childList: true, subtree: true }); } catch {}
  } catch {}

  try { applyDarkTheme(); } catch {}
  
  try {
    setLoggingEnabled(false);
    (window as any).wplaceSetLogs = setLoggingEnabled;
  } catch {}
  try { registerAltCV(); } catch {}

  const mountTarget = (() => { try { return (shadow as any) ? (shadow as any).appendChild(document.createElement('div')) : container; } catch { return container; } })();
  try { if (mountTarget !== container) markElement(mountTarget as any); } catch {}
  new App({ target: mountTarget as HTMLElement });
  perfMark('mount:end');
}

if (__isTop) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}



