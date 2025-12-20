import App from './App.svelte';
import { setLoggingEnabled } from './overlay/log';
import { applyDarkTheme } from './theme/darkTheme';
import { loadThemeFromStorage } from './theme/applyTheme';
import { registerAltCV } from './share/altcv';
import { bootstrapWGuard, markElement } from './wguard';
import { createBootOverlay } from './boot/bootOverlay';
import { loadBootOverlaySettings } from './boot/bootSettings';
import './styles/wph-shared.css';
import { setupPerfObserver, perfMark } from './utils/perf';
import { initQrReader } from './qrmusic/reader';
import { initQrScreenScanner } from './qrmusic/screenScanner';
import { initRealStats } from './stats/realStats';

const __isTop = (() => { try { return window.top === window; } catch { return true; } })();
let wguardInit: any = null;

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
if (__isTop) { (async () => { try { perfMark('wguard:bootstrap:start'); wguardInit = await bootstrapWGuard(); try { (window as any).__wphWguard = wguardInit; } catch {} } catch {} finally { try { perfMark('wguard:bootstrap:end'); } catch {} } })(); }

async function mount() {
  perfMark('mount:start');
  const htmlEl = document.documentElement;
  const htmlStyle0 = (() => { try { return htmlEl.getAttribute('style'); } catch { return null; } })();
  const htmlClass0 = (() => { try { return htmlEl.getAttribute('class'); } catch { return null; } })();
  try { initRealStats(); } catch {}
  
  const rootId = '_' + Math.random().toString(36).slice(2, 8);
  if (document.getElementById(rootId)) return;
  const z = computeZIndex();
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
    pStyle.textContent = `:host{all:initial;position:fixed;pointer-events:none;z-index:${z};--z-base:${z};--z-menu:${z + 200};--z-popover:${z + 300};--z-backdrop:${z + 1000};--z-modal:${z + 1001}}*,input,button{pointer-events:auto}`;
    host.appendChild(pStyle);
  } catch {}

  try {
    let pendingNodes: (HTMLStyleElement | HTMLLinkElement)[] = [];
    let copying = false;
    const budgetMs = 4;
    const maxPerFrame = 40;

    const collectPending = () => {
      try {
        const nodes = Array.from(document.head.querySelectorAll('style,link[rel="stylesheet"]')) as (HTMLStyleElement|HTMLLinkElement)[];
        pendingNodes = [];
        for (const n of nodes) {
          if ((n as any).__wguard_cloned) continue;
          pendingNodes.push(n);
        }
      } catch {
        pendingNodes = [];
      }
    };

    const cloneOne = (n: HTMLStyleElement | HTMLLinkElement) => {
      if ((n as any).__wguard_cloned) return;
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
    };

    const processBatch = () => {
      const start = (() => { try { return performance.now(); } catch { return 0; } })();
      let count = 0;
      try {
        while (pendingNodes.length) {
          const now = (() => { try { return performance.now(); } catch { return start; } })();
          if (count >= maxPerFrame) break;
          if (start && now - start >= budgetMs) break;
          const n = pendingNodes.shift()!;
          cloneOne(n);
          count++;
        }
      } catch {}

      if (pendingNodes.length) {
        try { requestAnimationFrame(processBatch); } catch {
          copying = false;
        }
        return;
      }

      copying = false;
      try { perfMark('copyStyles:end'); } catch {}
    };

    const scheduleCopy = () => {
      if (copying) return;
      copying = true;
      try { perfMark('copyStyles:start'); } catch {}
      collectPending();
      try { requestAnimationFrame(processBatch); } catch {
        copying = false;
        try {
          for (let i = 0; i < pendingNodes.length; i++) cloneOne(pendingNodes[i]);
        } catch {}
        pendingNodes = [];
        try { perfMark('copyStyles:end'); } catch {}
      }
    };

    scheduleCopy();
    const mo = new MutationObserver(() => { scheduleCopy(); });
    try { mo.observe(document.head, { childList: true, subtree: true }); } catch {}
  } catch {}

  try { applyDarkTheme(); } catch {}
  try { loadThemeFromStorage(); } catch {}
  
  try {
    setLoggingEnabled(false);
    (window as any).wplaceSetLogs = setLoggingEnabled;
  } catch {}
  try { registerAltCV(); } catch {}

  const mountTarget = (() => { try { return (shadow as any) ? (shadow as any).appendChild(document.createElement('div')) : container; } catch { return container; } })();
  try { if (mountTarget !== container) markElement(mountTarget as any); } catch {}
  const app = new App({ target: mountTarget as HTMLElement });
  try { (window as any).__wphApp = app; } catch {}
  try { (window as any).__wphMountTarget = mountTarget; } catch {}

  let unloaded = false;
  const unload = () => {
    if (unloaded) return;
    unloaded = true;
    try { (app as any)?.$destroy?.(); } catch {}
    try { wguardInit && wguardInit.dispose && wguardInit.dispose(); } catch {}
    try {
      if (htmlStyle0 == null) htmlEl.removeAttribute('style');
      else htmlEl.setAttribute('style', htmlStyle0);
    } catch {}
    try {
      if (htmlClass0 == null) htmlEl.removeAttribute('class');
      else htmlEl.setAttribute('class', htmlClass0);
    } catch {}
    try {
      const s = htmlEl.style;
      const names: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const n = s.item(i);
        if (n && n.startsWith('--wph-')) names.push(n);
      }
      for (let i = 0; i < names.length; i++) {
        try { s.removeProperty(names[i]); } catch {}
      }
      if (!htmlEl.getAttribute('style')) {
        try { htmlEl.removeAttribute('style'); } catch {}
      }
    } catch {}
    try { container && container.remove(); } catch {}
    try { delete (window as any).__wphPortalHost; } catch {}
    try { delete (window as any).__wphPortalContainer; } catch {}
    try { delete (window as any).__wphMountTarget; } catch {}
    try { delete (window as any).__wphApp; } catch {}
    try { delete (window as any).__wphWguard; } catch {}
  };
  try { (window as any).__wphUnload = unload; } catch {}

  try {
    const bootCfg = loadBootOverlaySettings();
    if (bootCfg.enabled) {
      try {
        requestAnimationFrame(() => {
          try { createBootOverlay(host as any, { durationMs: bootCfg.durationSec * 1000, disableSounds: (bootCfg as any).disableSounds, hideLoadButton: (bootCfg as any).hideLoadButton }); } catch {}
        });
      } catch {
        try { setTimeout(() => { try { createBootOverlay(host as any, { durationMs: bootCfg.durationSec * 1000, disableSounds: (bootCfg as any).disableSounds, hideLoadButton: (bootCfg as any).hideLoadButton }); } catch {} }, 0); } catch {}
      }
    }
  } catch {}
  try {
    const runIdle = (fn: () => void) => {
      try {
        const ric = (window as any).requestIdleCallback;
        if (typeof ric === 'function') {
          ric(() => { try { fn(); } catch {} }, { timeout: 1500 });
          return;
        }
      } catch {}
      try { setTimeout(() => { try { fn(); } catch {} }, 0); } catch {}
    };
    runIdle(() => { try { initQrReader(); } catch {} });
    runIdle(() => { try { initQrScreenScanner(); } catch {} });
  } catch {}
  perfMark('mount:end');
}

if (__isTop) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}



