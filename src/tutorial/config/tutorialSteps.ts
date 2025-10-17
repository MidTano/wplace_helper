import * as historyStoreModule from '../../topmenu/historyStore';
import { enhanceElement, waitTrustedClick } from '../utils/wguardHelpers';
import { findElement, getAllMatchingElements, waitForElement } from '../utils/elementFinder';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export const TUTORIAL_MODULES = {
  BASICS: 'basics',
  EDITOR: 'editor',
  TEMPLATES: 'templates',
  ADVANCED: 'advanced'
} as const;

export type TutorialModuleId = typeof TUTORIAL_MODULES[keyof typeof TUTORIAL_MODULES];
export type RequiredAction = 'click' | 'hover' | 'input' | 'none';

export type TutorialStep = {
  id: string;
  module: TutorialModuleId;
  title: string;
  description: string;
  targetSelector?: string;
  position: TooltipPosition;
  highlight: boolean;
  blockOthers: boolean;
  blockNext?: boolean;
  waitForElement?: boolean;
  autoAdvance: boolean;
  delay?: number;
  onBefore?: () => Promise<void>;
  onAfter?: () => Promise<void>;
  additionalHighlightSelectors?: string[];
  showCursorGuide?: boolean;
  disableAnimation?: boolean;
}

async function scrollEditorTarget(selector: string, block: 'start' | 'center' | 'end' = 'center') {
  await new Promise((resolve) => setTimeout(resolve, 60));
  let target = document.querySelector(selector) as HTMLElement | null;
  if (!target) {
    const all = getAllMatchingElements(selector);
    target = all.find((el) => el.ownerDocument === document) || all[0] || null;
  }
  if (!target) return;

  const portals = document.querySelectorAll('.editor-modal, .editor-panel, .portal-root') as NodeListOf<HTMLElement>;
  const candidates = new Set<HTMLElement>();
  target.closest('.editor-panel') && candidates.add(target.closest('.editor-panel') as HTMLElement);
  portals.forEach((p) => candidates.add(p));

  let scrolled = false;
  for (const panel of Array.from(candidates)) {
    if (!panel) continue;
    const panelRect = panel.getBoundingClientRect();
    if (panelRect.height <= 0 || panelRect.width <= 0) continue;
    const panelStyle = window.getComputedStyle(panel);
    if (!panelStyle.overflowY || panelStyle.overflowY === 'visible') continue;
    let offset = target.offsetTop;
    let parent = target.offsetParent as HTMLElement | null;
    while (parent && parent !== panel && parent instanceof HTMLElement) {
      offset += parent.offsetTop;
      parent = parent.offsetParent as HTMLElement | null;
    }
    const panelScrollTop = (() => {
      if (block === 'start') return offset;
      if (block === 'end') return offset - panel.clientHeight + target.offsetHeight;
      return offset - panel.clientHeight / 2 + target.offsetHeight / 2;
    })();
    try {
      panel.scrollTo({ top: Math.max(0, panelScrollTop), behavior: 'smooth' });
      scrolled = true;
      break;
    } catch {}
  }

  if (!scrolled) {
    target.scrollIntoView({ behavior: 'smooth', block });
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    module: TUTORIAL_MODULES.BASICS,
    title: 'tutorial.steps.welcome.title',
    description: 'tutorial.steps.welcome.description',
    position: 'center',
    highlight: false,
    blockOthers: true,
    waitForElement: false,
    autoAdvance: false
  },
  {
    id: 'topmenu-overview',
    module: TUTORIAL_MODULES.BASICS,
    title: 'tutorial.steps.topmenu.title',
    description: 'tutorial.steps.topmenu.description',
    targetSelector: '.topmenu-root',
    position: 'bottom',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false
  },
  {
    id: 'pickButton',
    module: TUTORIAL_MODULES.BASICS,
    title: 'tutorial.steps.pickButton.title',
    description: 'tutorial.steps.pickButton.description',
    targetSelector: '[data-tutorial="pick-button"]',
    position: 'bottom',
    highlight: true,
    blockOthers: false,
    blockNext: true,
    waitForElement: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      const el = document.querySelector('[data-tutorial="add-comparison-fab"]') as HTMLElement;
      if (!el) return;
      const title = (el.getAttribute('title') || '').toLowerCase();
      const isOn = el.classList.contains('active') || el.getAttribute('aria-pressed') === 'true' || title.includes('удалить из сравнения');
      if (isOn) {
        window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
        window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
        window.dispatchEvent(new CustomEvent('tutorial:next-step'));
      }
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        const onOpened = () => { window.removeEventListener('editor:opened', onOpened); window.dispatchEvent(new CustomEvent('tutorial:next-step')); window.dispatchEvent(new CustomEvent('tutorial:block-prev')); setTimeout(finish, 500); };
        window.addEventListener('editor:opened', onOpened);
        const btn = document.querySelector('[data-tutorial="pick-button"]') as HTMLElement;
        if (btn) {
          try { enhanceElement(btn); } catch {}
          waitTrustedClick(btn, 30000).then((ok) => { if (!done && !ok) { window.removeEventListener('editor:opened', onOpened); } finish(); });
        } else {
          setTimeout(() => { window.removeEventListener('editor:opened', onOpened); finish(); }, 30000);
        }
      });
    }
  },
  {
    id: 'pixelsize',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.pixelsize.title',
    description: 'tutorial.steps.pixelsize.description',
    targetSelector: '[data-tutorial="pixelsize"]',
    additionalHighlightSelectors: ['[data-tutorial="editor-preview"]'],
    position: 'bottom',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      await scrollEditorTarget('[data-tutorial="pixelsize"]', 'center');
    }
  },
  {
    id: 'palette',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.palette.title',
    description: 'tutorial.steps.palette.description',
    targetSelector: '[data-tutorial="palette"]',
    additionalHighlightSelectors: ['[data-tutorial="editor-preview"]'],
    position: 'left',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      await scrollEditorTarget('[data-tutorial="palette"]', 'start');
    }
  },
  {
    id: 'dither',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.dither.title',
    description: 'tutorial.steps.dither.description',
    targetSelector: '[data-tutorial="dither"]',
    additionalHighlightSelectors: ['[data-tutorial="editor-preview"]'],
    position: 'top',
    highlight: true,
    blockOthers: false,
    waitForElement: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      await scrollEditorTarget('[data-tutorial="dither"]', 'center');
    }
  },
  {
    id: 'color-correction',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.colorCorrection.title',
    description: 'tutorial.steps.colorCorrection.description',
    targetSelector: '[data-tutorial="color-correction"]',
    position: 'top',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      await scrollEditorTarget('[data-tutorial="color-correction"]', 'center');
    }
  },
  {
    id: 'add-to-comparison',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.addToComparison.title',
    description: 'tutorial.steps.addToComparison.description',
    targetSelector: '[data-tutorial="add-comparison-fab"]',
    position: 'right',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      await scrollEditorTarget('[data-tutorial="add-comparison-fab"]', 'center');
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        const goNext = () => { window.dispatchEvent(new CustomEvent('tutorial:unblock-prev')); window.dispatchEvent(new CustomEvent('tutorial:unblock-next')); window.dispatchEvent(new CustomEvent('tutorial:next-step')); };
        const onAdded = () => { window.removeEventListener('tutorial:comparison-added', onAdded); goNext(); finish(); };
        window.addEventListener('tutorial:comparison-added', onAdded);
        let addBtn = document.querySelector('[data-tutorial="add-comparison-fab"]') as HTMLElement;
        if (addBtn) {
          try { enhanceElement(addBtn); } catch {}
          const isOn = () => {
            const el = document.querySelector('[data-tutorial="add-comparison-fab"]') as HTMLElement;
            if (el && el !== addBtn) { addBtn = el; try { enhanceElement(addBtn); } catch {} }
            const title = (el?.getAttribute('title') || '').toLowerCase();
            return !!el && (el.classList.contains('active') || el.getAttribute('aria-pressed') === 'true' || title.includes('удалить из сравнения'));
          };
          if (isOn() && !done) {
            window.removeEventListener('tutorial:comparison-added', onAdded);
            goNext();
            finish();
            return;
          }
          let mo: MutationObserver | null = null;
        let moStyle: MutationObserver | null = null;
        let moItemsObserver: MutationObserver | null = null;
          try {
            mo = new MutationObserver(() => {
              if (!done && isOn()) {
                if (mo) { try { mo.disconnect(); } catch {} mo = null; }
                window.removeEventListener('tutorial:comparison-added', onAdded);
                goNext();
                finish();
              }
            });
            mo.observe(addBtn, { attributes: true, attributeFilter: ['class','title','aria-pressed'] });
          } catch {}
          const iv = window.setInterval(() => {
            if (done) { try { clearInterval(iv); } catch {} return; }
            if (isOn()) {
              try { clearInterval(iv); } catch {}
              if (mo) { try { mo.disconnect(); } catch {} mo = null; }
              window.removeEventListener('tutorial:comparison-added', onAdded);
              goNext();
              finish();
            }
          }, 150);
          waitTrustedClick(addBtn, 60000).then((ok) => {
            if (ok && !done) { window.removeEventListener('tutorial:comparison-added', onAdded); goNext(); }
            finish();
          });
        } else {
          setTimeout(() => { window.removeEventListener('tutorial:comparison-added', onAdded); finish(); }, 60000);
        }
      });
    }
  },
  {
    id: 'make-changes',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.makeChanges.title',
    description: 'tutorial.steps.makeChanges.description',
    targetSelector: '.editor-modal',
    additionalHighlightSelectors: [],
    position: 'left',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    onBefore: async () => {
      const editorModal = document.querySelector('.editor-modal') as HTMLElement;
      const editorPanel = document.querySelector('.editor-panel') as HTMLElement;
      if (editorPanel) {
        try { editorPanel.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (editorModal) {
        try { window.dispatchEvent(new CustomEvent('tutorial:switch-target', { detail: { selector: '.editor-modal' } })); } catch {}
      }
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        let btn = document.querySelector('[data-tutorial="add-comparison-fab"]') as HTMLElement | null;
        const onState = (e: any) => {
          try {
            const v = !!(e?.detail?.inComparison);
            if (!done && v === false) {
              window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
              window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
              window.dispatchEvent(new CustomEvent('tutorial:next-step'));
              finish();
            }
          } catch {}
        };
        try { window.addEventListener('tutorial:in-comparison-changed', onState as any); } catch {}
        const isAddState = () => {
          const el = document.querySelector('[data-tutorial="add-comparison-fab"]') as HTMLElement | null;
          if (el && el !== btn) { btn = el; try { enhanceElement(btn); } catch {} }
          if (!el) return false;
          const title = (el.getAttribute('title') || '').toLowerCase();
          const pressed = el.getAttribute('aria-pressed') === 'true';
          const active = el.classList.contains('active');
          const addTitle = title.includes('добавить в сравнение');
          return addTitle || (!pressed && !active);
        };
        if (isAddState()) {
          window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
          window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
          window.dispatchEvent(new CustomEvent('tutorial:next-step'));
          finish();
          return;
        }
        let mo: MutationObserver | null = null;
        try {
          if (btn) {
            try { enhanceElement(btn); } catch {}
            mo = new MutationObserver(() => {
              if (!done && isAddState()) {
                if (mo) { try { mo.disconnect(); } catch {} mo = null; }
                window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
                window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
                window.dispatchEvent(new CustomEvent('tutorial:next-step'));
                finish();
              }
            });
            mo.observe(btn, { attributes: true, attributeFilter: ['class','title','aria-pressed'] });
          }
        } catch {}
        const iv = window.setInterval(() => {
          if (done) { try { clearInterval(iv); } catch {} return; }
          if (isAddState()) {
            try { clearInterval(iv); } catch {}
            if (mo) { try { mo.disconnect(); } catch {} mo = null; }
            try { window.removeEventListener('tutorial:in-comparison-changed', onState as any); } catch {}
            window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
            window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
            window.dispatchEvent(new CustomEvent('tutorial:next-step'));
            finish();
          }
        }, 200);
        setTimeout(() => {
          try { clearInterval(iv); } catch {}
          if (mo) { try { mo.disconnect(); } catch {} mo = null; }
          try { window.removeEventListener('tutorial:in-comparison-changed', onState as any); } catch {}
          finish();
        }, 120000);
      });
    }
  }
,
  {
    id: 'add-to-comparison-2',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.addToComparison.title',
    description: 'tutorial.steps.addToComparison.description',
    targetSelector: '[data-tutorial="add-comparison-fab"]',
    additionalHighlightSelectors: ['.editor-panel', '[data-tutorial="editor-preview"]'],
    position: 'right',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    showCursorGuide: true,
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        const onAdded = () => { window.removeEventListener('tutorial:comparison-added', onAdded); window.dispatchEvent(new CustomEvent('tutorial:next-step')); finish(); };
        window.addEventListener('tutorial:comparison-added', onAdded);
        const addBtn = document.querySelector('[data-tutorial="add-comparison-fab"]') as HTMLElement;
        if (addBtn) {
          try { enhanceElement(addBtn); } catch {}
          const isOn = () => {
            const title = (addBtn.getAttribute('title') || '').toLowerCase();
            return addBtn.classList.contains('active') || addBtn.getAttribute('aria-pressed') === 'true' || title.includes('удалить из сравнения');
          };
          if (isOn() && !done) {
            window.removeEventListener('tutorial:comparison-added', onAdded);
            window.dispatchEvent(new CustomEvent('tutorial:next-step'));
            finish();
            return;
          }
          let mo: MutationObserver | null = null;
          try {
            mo = new MutationObserver(() => {
              if (!done && isOn()) {
                if (mo) { try { mo.disconnect(); } catch {} mo = null; }
                window.removeEventListener('tutorial:comparison-added', onAdded);
                window.dispatchEvent(new CustomEvent('tutorial:next-step'));
                finish();
              }
            });
            mo.observe(addBtn, { attributes: true, attributeFilter: ['class','title','aria-pressed'] });
          } catch {}
          const iv = window.setInterval(() => {
            if (!done && isOn()) {
              try { clearInterval(iv); } catch {}
              if (mo) { try { mo.disconnect(); } catch {} mo = null; }
              window.removeEventListener('tutorial:comparison-added', onAdded);
              window.dispatchEvent(new CustomEvent('tutorial:next-step'));
              finish();
            }
          }, 200);
          waitTrustedClick(addBtn, 60000).then((ok) => {
            if (ok && !done) { window.removeEventListener('tutorial:comparison-added', onAdded); window.dispatchEvent(new CustomEvent('tutorial:next-step')); }
            finish();
          });
        } else {
          setTimeout(() => { window.removeEventListener('tutorial:comparison-added', onAdded); finish(); }, 60000);
        }
      });
    }
  },
  {
    id: 'open-comparison',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.openComparison.title',
    description: 'tutorial.steps.openComparison.description',
    targetSelector: '[data-tutorial="comparison-mode-fab"]',
    position: 'right',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    showCursorGuide: true,
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        const onOpened = () => { window.removeEventListener('tutorial:comparison-opened', onOpened); window.dispatchEvent(new CustomEvent('tutorial:block-prev')); window.dispatchEvent(new CustomEvent('tutorial:next-step')); finish(); };
        window.addEventListener('tutorial:comparison-opened', onOpened);
        const compBtn = document.querySelector('[data-tutorial="comparison-mode-fab"]') as HTMLElement;
        if (compBtn) {
          try { enhanceElement(compBtn); } catch {}
          waitTrustedClick(compBtn, 60000).then((ok) => {
            if (ok && !done) { window.removeEventListener('tutorial:comparison-opened', onOpened); window.dispatchEvent(new CustomEvent('tutorial:block-prev')); window.dispatchEvent(new CustomEvent('tutorial:next-step')); }
            finish();
          });
        } else {
          setTimeout(() => { window.removeEventListener('tutorial:comparison-opened', onOpened); finish(); }, 60000);
        }
      });
    }
  },
  {
    id: 'comparison-interaction',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.comparisonInteraction.title',
    description: 'tutorial.steps.comparisonInteraction.description',
    targetSelector: '.comparison-modal .comparison-grid',
    position: 'center',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    onAfter: async () => {
      return new Promise((resolve) => {
        let isDown = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let transitionTriggered = false;
        let checkInterval: number;
        let hadPanning = false;
        let prevTransforms = '';
        let mo: MutationObserver | null = null;
        let moStyle: MutationObserver | null = null;
        let moItemsObserver: MutationObserver | null = null;
        let downTransforms = '';
        let loggedMovedOnce = false;
        let loggedTransformChanged = false;
        let prevAnyPanningFlag = false;
        let lastTransformChangeTs = 0;
        let lastPanningSeenTs = 0;
        let elBound: Array<{ el: HTMLElement, type: string, handler: any, opts: any }> = [];
        let mos: MutationObserver[] = [];
        let dragDetected = false;
        let lastActivityTs = 0;
        try { console.log('[Tutorial] step12:init'); } catch {}
        const getTransforms = () => {
          try {
            const imgs = getAllMatchingElements('.comparison-modal .comparison-image.loaded');
            let concat = '';
            imgs.forEach((el) => {
              const he = el as HTMLElement;
              const cs = window.getComputedStyle(he);
              const tf = cs.transform || he.style.transform || '';
              concat += tf + ';';
            });
            return concat;
          } catch { return ''; }
        };
        const getCloseBtn = () => findElement('.comparison-modal .comparison-close') as HTMLElement | null;
        const inGrid = (el: Element | null) => {
          if (!el) return false;
          const grid = (el as HTMLElement).closest('.comparison-grid');
          if (!grid) return false;
          return !!(grid.closest('.comparison-modal'));
        };
        const getGrids = () => getAllMatchingElements('.comparison-modal .comparison-grid') as HTMLElement[];
        const isPointInGrids = (x: number, y: number) => {
          try {
            const grids = getGrids();
            for (const g of grids) {
              const r = g.getBoundingClientRect();
              if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
            }
          } catch {}
          return false;
        };
        const cleanup = () => {
          try { console.log('[Tutorial] step12:cleanup'); } catch {}
          clearInterval(checkInterval);
          try { window.removeEventListener('pointerdown', onDown as any, true as any); } catch {}
          try { window.removeEventListener('pointermove', onMove as any, true as any); } catch {}
          try { window.removeEventListener('pointerup', onUp as any, true as any); } catch {}
          try { window.removeEventListener('mousedown', onDown as any, true as any); } catch {}
          try { window.removeEventListener('mousemove', onMove as any, true as any); } catch {}
          try { window.removeEventListener('mouseup', onUp as any, true as any); } catch {}
          try { document.removeEventListener('panChange', onPanEvent as any, true as any); } catch {}
          try { document.removeEventListener('viewportChange', onPanEvent as any, true as any); } catch {}
          try { mo && mo.disconnect(); mo = null; } catch {}
          try { moStyle && moStyle.disconnect(); moStyle = null; } catch {}
          try { moItemsObserver && moItemsObserver.disconnect(); moItemsObserver = null; } catch {}
          try { mos.forEach(m => { try { m.disconnect(); } catch {} }); mos = []; } catch {}
          try {
            elBound.forEach(({ el, type, handler, opts }) => { try { el.removeEventListener(type as any, handler, opts as any); } catch {} });
            elBound = [];
          } catch {}
        };
        const onPanEvent = (e: Event) => {
          const t = e.target as HTMLElement | null;
          if (!t) return;
          if (!t.closest('.comparison-modal')) return;
          hadPanning = true;
          moved = true;
          try { console.log('[Tutorial] step12:panEvent'); } catch {}
        };
        const onDown = (e: PointerEvent | MouseEvent) => {
          if (transitionTriggered) return;
          const target = e.target as HTMLElement | null;
          const x = (e as any).clientX;
          const y = (e as any).clientY;
          let hit: HTMLElement | null = null;
          try { if (x != null && y != null) hit = document.elementFromPoint(x, y) as HTMLElement | null; } catch {}
          try {
            let cur: any = target;
            for (let i = 0; i < 6 && cur; i++) { try { enhanceElement(cur as HTMLElement); } catch {}; cur = cur.parentElement || ((cur.getRootNode && cur.getRootNode().host) || null); }
            cur = hit;
            for (let i = 0; i < 6 && cur; i++) { try { enhanceElement(cur as HTMLElement); } catch {}; cur = cur.parentElement || ((cur.getRootNode && cur.getRootNode().host) || null); }
          } catch {}
          let inViaPath = false;
          try {
            const path = (e as any).composedPath?.();
            if (Array.isArray(path)) {
              inViaPath = path.some((n: any) => n && typeof n.closest === 'function' && !!n.closest('.comparison-grid'));
            }
          } catch {}
          let inside = inGrid(target) || inGrid(hit) || inViaPath || (x != null && y != null && isPointInGrids(x, y));
          try { if (!inside && getGrids().length === 0) { inside = true; console.log('[Tutorial] step12:down-fallback-inside'); } } catch {}
          if (!inside) { try { console.log('[Tutorial] step12:down-skip', { type: (e as any).type, targetClass: target?.className, hitClass: hit?.className }); } catch {} return; }
          const btn = (e as any).button;
          if (btn !== undefined && btn !== 0) return;
          isDown = true;
          moved = false;
          startX = (e as any).clientX;
          startY = (e as any).clientY;
          downTransforms = getTransforms();
          try { console.log('[Tutorial] step12:down', { type: (e as any).type, btn, targetClass: target?.className }); } catch {}
        };
        const onMove = (e: PointerEvent | MouseEvent) => {
          if (!isDown || transitionTriggered) return;
          const x = (e as any).clientX;
          const y = (e as any).clientY;
          const dx = Math.abs(x - startX);
          const dy = Math.abs(y - startY);
          if (dx > 4 || dy > 4) {
            moved = true;
            if (!loggedMovedOnce) { loggedMovedOnce = true; try { console.log('[Tutorial] step12:move-threshold', { dx, dy }); } catch {} }
          }
        };
        const onUp = () => {
          if (transitionTriggered) { isDown = false; moved = false; return; }
          let shouldProceed = moved || hadPanning || dragDetected;
          if (!shouldProceed) {
            const nowT = getTransforms();
            if (downTransforms && nowT && nowT !== downTransforms) {
              shouldProceed = true;
            }
          }
          if (!shouldProceed) {
            const now = Date.now();
            const recent = (now - lastTransformChangeTs < 1500) || (now - lastPanningSeenTs < 1500) || (now - lastActivityTs < 1500);
            if (recent) { shouldProceed = true; try { console.log('[Tutorial] step12:up-fallback-recent', { lastTransformChangeTs, lastPanningSeenTs }); } catch {} }
          }
          isDown = false;
          try { console.log('[Tutorial] step12:up', { moved, hadPanning, shouldProceed }); } catch {}
          if (!shouldProceed) return;
          const tryProceed = () => {
            const anyPanning = !!findElement('.comparison-modal .comparison-image-container.panning');
            if (anyPanning) { setTimeout(tryProceed, 30); return; }
            if (transitionTriggered) return;
            transitionTriggered = true;
            try { console.log('[Tutorial] step12:proceed-up'); } catch {}
            cleanup();
            const closeBtn = getCloseBtn();
            if (closeBtn) {
              closeBtn.setAttribute('data-tutorial', 'comparison-close');
              window.dispatchEvent(new CustomEvent('tutorial:focus-next-element', { detail: { selector: '[data-tutorial="comparison-close"]' } }));
            }
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('tutorial:next-step'));
              resolve();
            }, 100);
          };
          setTimeout(tryProceed, 0);
        };
        try { window.addEventListener('pointerdown', onDown as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { window.addEventListener('pointermove', onMove as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { window.addEventListener('pointerup', onUp as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { window.addEventListener('mousedown', onDown as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { window.addEventListener('mousemove', onMove as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { window.addEventListener('mouseup', onUp as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { document.addEventListener('panChange', onPanEvent as any, { capture: true } as AddEventListenerOptions); } catch {}
        try { document.addEventListener('viewportChange', onPanEvent as any, { capture: true } as AddEventListenerOptions); } catch {}

        try {
          const bind = (el: HTMLElement) => {
            try { el.addEventListener('pointerdown', onDown as any, { capture: true } as AddEventListenerOptions); elBound.push({ el, type: 'pointerdown', handler: onDown, opts: { capture: true } }); } catch {}
            try { el.addEventListener('mousedown', onDown as any, { capture: true } as AddEventListenerOptions); elBound.push({ el, type: 'mousedown', handler: onDown, opts: { capture: true } }); } catch {}
          };
          const gridEl = findElement('.comparison-modal .comparison-grid') as HTMLElement | null;
          if (gridEl) {
            bind(gridEl);
            const items = gridEl.querySelectorAll('.comparison-image-container');
            items.forEach((n) => bind(n as HTMLElement));
            try {
              moItemsObserver = new MutationObserver((muts) => {
                muts.forEach((m) => {
                  m.addedNodes && Array.from(m.addedNodes).forEach((node: any) => {
                    if (node && node.nodeType === 1) {
                      const he = node as HTMLElement;
                      if (he.matches && he.matches('.comparison-image-container')) { bind(he); }
                      const inner = he.querySelectorAll ? he.querySelectorAll('.comparison-image-container') : [] as any;
                      if (inner && inner.length) { inner.forEach((e: any) => bind(e)); }
                    }
                  });
                });
              });
              moItemsObserver.observe(gridEl, { childList: true, subtree: true });
              mos.push(moItemsObserver);
            } catch {}
            try {
              moStyle = new MutationObserver((muts) => {
                let changed = false;
                muts.forEach((m) => {
                  const t = m.target as HTMLElement;
                  if (t && t.classList && (t.classList.contains('comparison-image') || t.classList.contains('comparison-image-container'))) {
                    changed = true;
                  }
                });
                if (changed) {
                  dragDetected = true; hadPanning = true; lastTransformChangeTs = Date.now(); lastActivityTs = Date.now();
                  try { console.log('[Tutorial] step12:style-mutation'); } catch {}
                }
              });
              moStyle.observe(gridEl, { attributes: true, subtree: true, attributeFilter: ['style'] });
              mos.push(moStyle);
            } catch {}
          }
        } catch {}
        try { console.log('[Tutorial] step12:listeners-attached'); } catch {}
        try {
          const env = {
            grids: getAllMatchingElements('.comparison-modal .comparison-grid').length,
            imgs: getAllMatchingElements('.comparison-modal .comparison-image.loaded').length,
            containers: getAllMatchingElements('.comparison-modal .comparison-image-container').length
          };
          console.log('[Tutorial] step12:env', env);
        } catch {}
        try {
          mo = new MutationObserver(() => {
            if (transitionTriggered) return;
            if (!hadPanning) return;
            const anyPanning = !!findElement('.comparison-modal .comparison-image-container.panning');
            if (anyPanning) return;
            transitionTriggered = true;
            try { console.log('[Tutorial] step12:proceed-mutation'); } catch {}
            cleanup();
            const closeBtn = getCloseBtn();
            if (closeBtn) {
              closeBtn.setAttribute('data-tutorial', 'comparison-close');
              window.dispatchEvent(new CustomEvent('tutorial:focus-next-element', { detail: { selector: '[data-tutorial="comparison-close"]' } }));
            }
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('tutorial:next-step'));
              resolve();
            }, 100);
          });
          mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
        } catch {}
        checkInterval = window.setInterval(() => {
          const grid = findElement('.comparison-modal .comparison-grid') as HTMLElement | null;
          if (grid) { try { enhanceElement(grid); } catch {} }
          if (isDown && !moved) {
            const anyPanning = !!findElement('.comparison-modal .comparison-image-container.panning');
            if (anyPanning) { moved = true; hadPanning = true; lastPanningSeenTs = Date.now(); dragDetected = true; lastActivityTs = Date.now(); if (!prevAnyPanningFlag) { try { console.log('[Tutorial] step12:panning-start'); } catch {} } }
            prevAnyPanningFlag = anyPanning;
          }
          if (!isDown) {
            const anyPanning = !!findElement('.comparison-modal .comparison-image-container.panning');
            if (anyPanning) { hadPanning = true; lastPanningSeenTs = Date.now(); dragDetected = true; lastActivityTs = Date.now(); }
            if (anyPanning !== prevAnyPanningFlag) { try { console.log('[Tutorial] step12:panning-change', { anyPanning }); } catch {} }
            prevAnyPanningFlag = anyPanning;
          }
          try {
            const imgs = getAllMatchingElements('.comparison-modal .comparison-image.loaded');
            let concat = '';
            (imgs as HTMLElement[]).forEach((el) => {
              const he = el as HTMLElement;
              const cs = window.getComputedStyle(he);
              const tf = cs.transform || he.style.transform || '';
              concat += tf + ';';
            });
            if (!prevTransforms && concat) { prevTransforms = concat; }
            else if (prevTransforms && concat && concat !== prevTransforms) {
              moved = true; hadPanning = true; lastTransformChangeTs = Date.now(); dragDetected = true; lastActivityTs = Date.now(); prevTransforms = concat; if (!loggedTransformChanged) { loggedTransformChanged = true; try { console.log('[Tutorial] step12:transform-change'); } catch {} }
            }
            
          } catch {}
          if (!transitionTriggered) {
            const anyPanning = !!findElement('.comparison-modal .comparison-image-container.panning');
            const now = Date.now();
            const idleAfterChange = (lastTransformChangeTs > 0 && (now - lastTransformChangeTs > 200)) || (dragDetected && (now - lastActivityTs > 200));
            if (!anyPanning && (hadPanning || idleAfterChange || dragDetected) && !isDown) {
              transitionTriggered = true;
              try { console.log('[Tutorial] step12:proceed-interval'); } catch {}
              cleanup();
              const closeBtn = getCloseBtn();
              if (closeBtn) {
                closeBtn.setAttribute('data-tutorial', 'comparison-close');
                window.dispatchEvent(new CustomEvent('tutorial:focus-next-element', { detail: { selector: '[data-tutorial="comparison-close"]' } }));
              }
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('tutorial:next-step'));
                resolve();
              }, 100);
            }
          }
        }, 50);
        setTimeout(() => {
          if (!transitionTriggered) {
            cleanup();
            console.log('[Tutorial] Timeout reached without interaction');
            resolve();
          }
        }, 120000);
      });
    }
  },
  {
    id: 'right-click-image',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.rightClickImage.title',
    description: 'tutorial.steps.rightClickImage.description',
    targetSelector: '.comparison-modal .comparison-output',
    position: 'center',
    highlight: true,
    blockOthers: true,
    disableAnimation: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    onBefore: async () => {
      await new Promise<void>((resolve) => {
        const checkImages = () => {
          const images = document.querySelectorAll('.comparison-modal .grid-item');
          if (images.length >= 2) {
            console.log('[Tutorial] Both grid items found, proceeding');
            resolve();
          } else {
            setTimeout(checkImages, 50);
          }
        };
        checkImages();
        setTimeout(() => resolve(), 5000);
      });
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };

        const onOpen = () => {
          window.removeEventListener('tutorial:contextmenu-opened', onOpen);
          window.dispatchEvent(new CustomEvent('tutorial:next-step'));
          finish();
        };

        window.addEventListener('tutorial:contextmenu-opened', onOpen);

        window.setTimeout(() => {
          window.removeEventListener('tutorial:contextmenu-opened', onOpen);
          finish();
        }, 10000);
      });
    }
  },
  {
    id: 'select-open-in-editor',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.selectOpenInEditor.title',
    description: 'tutorial.steps.selectOpenInEditor.description',
    targetSelector: '[data-tutorial="comparison-open-editor"]',
    additionalHighlightSelectors: ['.comparison-modal .grid-item:first-child', '.comparison-modal .grid-item:not(:first-child)'],
    position: 'right',
    highlight: true,
    blockOthers: true,
    disableAnimation: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    showCursorGuide: true,
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        const onOpened = () => { window.removeEventListener('editor:opened', onOpened); window.dispatchEvent(new CustomEvent('tutorial:unblock-prev')); window.dispatchEvent(new CustomEvent('tutorial:next-step')); finish(); };
        window.addEventListener('editor:opened', onOpened);
        const attachHandler = (el: HTMLElement | null) => {
          if (!el) {
            setTimeout(() => { window.removeEventListener('editor:opened', onOpened); finish(); }, 60000);
            return;
          }
          try { enhanceElement(el); } catch {}
          waitTrustedClick(el, 60000).then((ok) => {
            if (ok && !done) {
              window.removeEventListener('editor:opened', onOpened);
              window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
              window.dispatchEvent(new CustomEvent('tutorial:next-step'));
            }
            finish();
          });
        };

        const existing = findElement('[data-tutorial="comparison-open-editor"]') as HTMLElement | null;
        if (existing) {
          attachHandler(existing);
        } else {
          waitForElement('[data-tutorial="comparison-open-editor"]', 5000).then((el) => attachHandler(el));
        }
      });
    }
  },
  {
    id: 'apply-button',
    module: TUTORIAL_MODULES.EDITOR,
    title: 'tutorial.steps.applyButton.title',
    description: 'tutorial.steps.applyButton.description',
    targetSelector: '[data-tutorial="apply-button"]',
    position: 'left',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    showCursorGuide: true,
    onBefore: async () => {
      window.dispatchEvent(new CustomEvent('tutorial:block-prev'));
      const btn = await waitForElement('[data-tutorial="apply-button"]', 5000);
      if (btn) {
        await scrollEditorTarget('[data-tutorial="apply-button"]', 'center');
      }
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        const attachHandler = (el: HTMLElement | null) => {
          if (!el) {
            window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
            resolve();
            return;
          }
          try { enhanceElement(el); } catch {}
          waitTrustedClick(el, 120000).then((ok) => {
            window.dispatchEvent(new CustomEvent('tutorial:unblock-prev'));
            if (ok) {
              window.dispatchEvent(new CustomEvent('tutorial:next-step'));
            }
            resolve();
          });
        };

        const existing = findElement('[data-tutorial="apply-button"]') as HTMLElement | null;
        if (existing) {
          attachHandler(existing);
        } else {
          waitForElement('[data-tutorial="apply-button"]', 5000).then((el) => attachHandler(el));
        }
      });
    }
  },
  {
    id: 'place-template',
    module: TUTORIAL_MODULES.TEMPLATES,
    title: 'tutorial.steps.placeTemplate.title',
    description: 'tutorial.steps.placeTemplate.description',
    targetSelector: 'canvas.maplibregl-canvas',
    position: 'center',
    highlight: true,
    blockOthers: false,
    waitForElement: true,
    blockNext: true,
    autoAdvance: false,
    onBefore: async () => {
      window.dispatchEvent(new CustomEvent('tutorial:block-prev'));
      await new Promise(resolve => setTimeout(resolve, 80));
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };

        const onPixelClick = () => {
          window.removeEventListener('tutorial:map-pixel-clicked', onPixelClick);
          window.dispatchEvent(new CustomEvent('tutorial:next-step'));
          finish();
        };

        window.addEventListener('tutorial:map-pixel-clicked', onPixelClick);

        window.setTimeout(() => {
          window.removeEventListener('tutorial:map-pixel-clicked', onPixelClick);
          finish();
        }, 120000);
      });
    }
  },
  {
    id: 'history',
    module: TUTORIAL_MODULES.BASICS,
    title: 'tutorial.steps.history.title',
    description: 'tutorial.steps.history.description',
    targetSelector: '[data-tutorial="history"]',
    position: 'bottom',
    highlight: true,
    blockOthers: false,
    blockNext: true,
    waitForElement: true,
    autoAdvance: false,
    onBefore: async () => {
      window.dispatchEvent(new CustomEvent('tutorial:history-unlock'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const items = historyStoreModule.getList();
      for (const item of items) {
        if (item.id && item.id.startsWith('demo-tutorial-')) {
          try {
            await historyStoreModule.remove(item.id);
          } catch (e) {
            console.log('Cleanup demo:', item.id);
          }
        }
      }
    },
    onAfter: async () => {
      return new Promise((resolve) => {
        window.dispatchEvent(new CustomEvent('tutorial:history-lock'));
        const historyBtn = findElement('[data-tutorial="history"]') as HTMLElement | null;
        if (!historyBtn) {
          window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
          resolve();
          return;
        }
        try { enhanceElement(historyBtn); } catch {}

        waitTrustedClick(historyBtn, 60000).then(async (ok) => {
          if (!ok) {
            window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
            resolve();
            return;
          }

          await new Promise(r => setTimeout(r, 80));
          const historyPanel = findElement('.tm-history-popover');
          if (historyPanel) {
            window.dispatchEvent(new CustomEvent('tutorial:history-ghost'));
            try {
              const mockData = [
                { id: 'demo-tutorial-1', name: 'Мой первый арт.png', timestamp: Date.now() - 3600000, coords: { x: 100, y: 100 } },
                { id: 'demo-tutorial-2', name: 'Звездное небо.jpg', timestamp: Date.now() - 7200000, coords: { x: 200, y: 150 } },
                { id: 'demo-tutorial-3', name: 'Pixel Fox.png', timestamp: Date.now() - 10800000, coords: { x: 300, y: 200 } }
              ];
              for (const item of mockData) {
                try {
                  const blob = new Blob(['demo'], { type: 'image/png' });
                  await historyStoreModule.addOrUpdate(blob as any, item.name, item.coords);
                } catch {}
              }
            } catch {}
            window.dispatchEvent(new CustomEvent('tutorial:history-refresh'));
            window.dispatchEvent(new CustomEvent('tutorial:switch-target', { detail: { selector: '.tm-history-popover' } }));
            await new Promise(r => setTimeout(r, 400));
            window.dispatchEvent(new CustomEvent('tutorial:history-solid'));
          }

          window.dispatchEvent(new CustomEvent('tutorial:unblock-next'));
          window.dispatchEvent(new CustomEvent('tutorial:next-step'));
          resolve();
        });
      });
    }
  },
  {
    id: 'auto-mode',
    module: TUTORIAL_MODULES.ADVANCED,
    title: 'tutorial.steps.autoMode.title',
    description: 'tutorial.steps.autoMode.description',
    targetSelector: '[data-tutorial="auto-mode"]',
    position: 'bottom',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false
  },
  {
    id: 'enhanced-colors',
    module: TUTORIAL_MODULES.ADVANCED,
    title: 'tutorial.steps.enhancedColors.title',
    description: 'tutorial.steps.enhancedColors.description',
    targetSelector: '[data-tutorial="enhanced-colors"]',
    position: 'bottom',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false
  },
  {
    id: 'settings',
    module: TUTORIAL_MODULES.ADVANCED,
    title: 'tutorial.steps.settings.title',
    description: 'tutorial.steps.settings.description',
    targetSelector: '[data-tutorial="settings"]',
    position: 'bottom',
    highlight: true,
    blockOthers: true,
    waitForElement: true,
    autoAdvance: false
  },
  {
    id: 'completion',
    module: TUTORIAL_MODULES.ADVANCED,
    title: 'tutorial.steps.completion.title',
    description: 'tutorial.steps.completion.description',
    position: 'center',
    highlight: false,
    blockOthers: true,
    waitForElement: false,
    autoAdvance: false
  }
];

export function getStepById(id: string): TutorialStep | undefined {
  return tutorialSteps.find(s => s.id === id);
}

export function getStepsByModule(moduleId: TutorialModuleId): TutorialStep[] {
  return tutorialSteps.filter(s => s.module === moduleId);
}

export function getTotalSteps(): number {
  return tutorialSteps.length;
}

export function getStepIndex(stepId: string): number {
  return tutorialSteps.findIndex(s => s.id === stepId);
}
