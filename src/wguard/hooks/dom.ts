import type { WGuardContext } from '../core/types';
import { markElement } from '../core/dom-utils';

let hiddenAttributes: RegExp[] = [/wplace/i, /data-userscript/i];
let hiddenSelectors: RegExp[] = [/\[data-wplace/i, /\[data-userscript/i];
let hiddenFunctions: RegExp[] = [/wplace/i, /__bm/i];

let applied = false;
let restoreFns: Array<() => void> = [];

function injectCode(code: string) {
  try {
    const s = document.createElement('script');
    markElement(s);
    try {
      const withNonce = document.querySelector('script[nonce]') as HTMLScriptElement | null;
      const nonce = (withNonce && (withNonce.nonce || withNonce.getAttribute('nonce'))) || '';
      if (nonce) { (s as any).nonce = nonce; s.setAttribute('nonce', String(nonce)); }
    } catch {}
    s.textContent = code;
    document.documentElement?.appendChild(s);
    s.remove();
  } catch {}
}

function installMutationObserverGuards() {
  const NativeMO = window.MutationObserver;
  if (!NativeMO) return;
  const sanitizeRecords = (recs: MutationRecord[]): MutationRecord[] => {
    try {
      return recs.filter(r => {
        if (r.type === 'attributes') {
          const name = r.attributeName || '';
          if (name && hiddenAttributes.some(re => re.test(name))) return false;
        }
        return true;
      });
    } catch {
      return recs;
    }
  };
  const safeLog = (msg: string) => { try { console.warn('core:', msg); } catch {} };
  const WrappedMO: any = function(callback: MutationCallback) {
    const wrapped = function(records: MutationRecord[], observer: MutationObserver) {
      const filtered = sanitizeRecords(records);
      if (filtered.length === 0) return;
      try { callback(filtered, observer); } catch {}
    };
    return new (NativeMO as any)(wrapped);
  };
  WrappedMO.prototype = NativeMO.prototype;
  const originalObserve = NativeMO.prototype.observe;
  WrappedMO.prototype.observe = function(target: Node, options?: MutationObserverInit) {
    try {
      if (options && Array.isArray(options.attributeFilter)) {
        const before = options.attributeFilter.slice();
        options.attributeFilter = before.filter(n => !hiddenAttributes.some(re => re.test(String(n))));
        if (before.length !== options.attributeFilter.length) safeLog('observer sanitized: attributeFilter');
      }
    } catch {}
    return originalObserve.call(this, target, options);
  };
  (window as any).MutationObserver = WrappedMO;
}

function ensurePageHooksForAttr(attrName: string) {
  try {
    const reAttrStr = String(attrName || 'data-wguard').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reSelStr = '\\[' + reAttrStr;
    const code = (
      `(function(){try{` +
      `var reAttr=new RegExp(${JSON.stringify(reAttrStr)},'i');` +
      `var reSel=new RegExp(${JSON.stringify(reSelStr)});` +
      `var _ga=Element.prototype.getAttribute;` +
      `var _gan=Element.prototype.getAttributeNames;` +
      `var _qs=Document.prototype.querySelector;` +
      `var _qsa=Document.prototype.querySelectorAll;` +
      `Element.prototype.getAttribute=new Proxy(_ga,{apply:function(t,a,r){try{var n=r&&r[0];if(n&&reAttr.test(String(n)))return null;}catch{}return Reflect.apply(t,a,r);}});` +
      `Element.prototype.getAttributeNames=new Proxy(_gan,{apply:function(t,a,r){try{var names=Reflect.apply(t,a,r)||[];return names.filter(function(n){return !reAttr.test(String(n));});}catch{}return Reflect.apply(t,a,r);}});` +
      `Document.prototype.querySelector=new Proxy(_qs,{apply:function(t,a,r){try{var sel=String(r&&r[0]||'');if(reSel.test(sel))return null;}catch{}return Reflect.apply(t,a,r);}});` +
      `Document.prototype.querySelectorAll=new Proxy(_qsa,{apply:function(t,a,r){try{var sel=String(r&&r[0]||'');if(reSel.test(sel)){return _qsa.call(document,'html:not(html)');}}catch{}return Reflect.apply(t,a,r);}});` +
      `}catch(e){}})();`
    );
    injectCode(code);
    const root = document.head || document.documentElement;
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        const nodes = Array.from(rec.addedNodes || []);
        for (const n of nodes) {
          if (n && (n as any).nodeType === 1) {
            const el = n as Element;
            if (el.tagName === 'SCRIPT' && (el as any).nonce) {
              try { injectCode(code); } catch {}
              try { mo.disconnect(); } catch {}
              return;
            }
          }
        }
      }
    });
    try { mo.observe(root, { childList: true, subtree: true }); } catch {}
    setTimeout(() => { try { injectCode(code); } catch {} }, 300);
    setTimeout(() => { try { injectCode(code); } catch {} }, 1000);
    setTimeout(() => { try { injectCode(code); } catch {} }, 2500);
  } catch {}
}

function parsePatternString(pattern: string): RegExp {
  try {
    const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
    if (match) {
      return new RegExp(match[1], match[2]);
    }
  } catch {}
  return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export function applyDomGuards(context: WGuardContext) {
  if (applied) return;
  applied = true;

  if (context.config?.patterns) {
    try {
      if (Array.isArray(context.config.patterns.attributes)) {
        hiddenAttributes = context.config.patterns.attributes.map(parsePatternString);
      }
      if (Array.isArray(context.config.patterns.selectors)) {
        hiddenSelectors = context.config.patterns.selectors.map(parsePatternString);
      }
      if (Array.isArray(context.config.patterns.functions)) {
        hiddenFunctions = context.config.patterns.functions.map(parsePatternString);
      }
    } catch {}
  }

  try {
    const attr = context.config?.obfuscation?.dataAttribute;
    if (attr && typeof attr === 'string') {
      hiddenAttributes.push(parsePatternString(attr));
      hiddenSelectors.push(parsePatternString(`[${attr}`));
    }
  } catch {}

  try {
    const uw: any = (window as any).unsafeWindow;
    if (uw && uw.Element && uw.Document) {
      const _ga = uw.Element.prototype.getAttribute;
      const _gan = uw.Element.prototype.getAttributeNames;
      const _qs = uw.Document.prototype.querySelector;
      const _qsa = uw.Document.prototype.querySelectorAll;
      uw.Element.prototype.getAttribute = function(name: string) {
        try { if (name && hiddenAttributes.some((re) => re.test(name))) return null; } catch {}
        return _ga.call(this, name);
      };
      uw.Element.prototype.getAttributeNames = function() {
        const names = _gan.call(this) || [];
        try { return names.filter((n: string) => !hiddenAttributes.some((re) => re.test(n))); } catch {}
        return names;
      };
      uw.Document.prototype.querySelector = function(selector: string) {
        try { if (selector && hiddenSelectors.some((re) => re.test(selector))) return null; } catch {}
        return _qs.call(this, selector);
      };
      uw.Document.prototype.querySelectorAll = function(selector: string) {
        try { if (selector && hiddenSelectors.some((re) => re.test(selector))) return _qsa.call(document, 'html:not(html)'); } catch {}
        return _qsa.call(this, selector);
      };
    }
  } catch {}

  try { ensurePageHooksForAttr(String(context.config?.obfuscation?.dataAttribute || 'data-wguard')); } catch {}

  try { hideUserscriptVars(); } catch {}
  try { maskNativeToString(); } catch {}
  try { cleanStackTraces(); } catch {}
  try { hideExtensionProperties(); } catch {}
  try { maskTimingSignatures(); } catch {}
  try { hideDataAttributes(); } catch {}
  try { installMutationObserverGuards(); } catch {}
  try { maskPageVisibility(); } catch {}
}

export function resetDomGuards() {
  for (const fn of restoreFns) {
    try { fn(); } catch {}
  }
  restoreFns = [];
  applied = false;
}

function hideUserscriptVars() {
  try {
    if (typeof (window as any).GM_info !== 'undefined') {
      Object.defineProperty(window, 'GM_info', {
        get: () => undefined,
        configurable: false,
      });
    }
  } catch {}

  const scriptVars = ['GM_getValue','GM_setValue','GM_deleteValue','GM_listValues','GM_addStyle','GM_xmlhttpRequest','GM_openInTab','GM_notification'];
  for (const v of scriptVars) {
    try {
      if ((window as any)[v]) {
        Object.defineProperty(window, v, {
          get: () => undefined,
          configurable: false,
        });
      }
    } catch {}
  }
}

function maskNativeToString() {
  const nativeToStringFn = Function.prototype.toString;
  const nativeCode = 'function () { [native code] }';

  Function.prototype.toString = new Proxy(nativeToStringFn, {
    apply(target, thisArg, args) {
      try {
        if (thisArg && typeof thisArg === 'function') {
          const name = thisArg.name || '';
          if (hiddenFunctions.some((re) => re.test(name))) {
            return nativeCode;
          }
        }
      } catch {}
      return Reflect.apply(target, thisArg, args);
    },
  });
}

function cleanStackTraces() {
  const originalPrepareStackTrace = Error.prepareStackTrace;

  Error.prepareStackTrace = function (error, stack) {
    try {
      const filtered = stack.filter((frame: any) => {
        const fileName = frame.getFileName() || '';
        const funcName = frame.getFunctionName() || '';
        return !hiddenFunctions.some((re) => re.test(funcName)) && !/user\.js/i.test(fileName) && !/userscript/i.test(fileName);
      });
      if (originalPrepareStackTrace) {
        return originalPrepareStackTrace(error, filtered);
      }
      return filtered;
    } catch {
      return originalPrepareStackTrace ? originalPrepareStackTrace(error, stack) : stack;
    }
  };
}

function hideExtensionProperties() {
  const props = ['__firefox__', '__chrome__', 'chrome', '__nightmare'];
  for (const prop of props) {
    try {
      if ((window as any)[prop]) {
        Object.defineProperty(window, prop, {
          get: () => undefined,
          configurable: false,
        });
      }
    } catch {}
  }
}

function maskTimingSignatures() {
  const originalRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (callback) {
    const wrapped = (time: number) => {
      try {
        return callback(time);
      } catch (e) {
        try {
          if (e && (e as any).stack) {
            (e as any).stack = (e as any).stack.replace(/user\.js/g, 'core.js').replace(/userscript/g, 'script').replace(/wplace/g, 'app');
          }
        } catch {}
        throw e;
      }
    };
    return originalRaf.call(window, wrapped);
  };

  const originalRic = window.requestIdleCallback;
  if (originalRic) {
    window.requestIdleCallback = function (callback: IdleRequestCallback, options?: IdleRequestOptions) {
      const wrapped = (deadline: IdleDeadline) => {
        try {
          return callback(deadline);
        } catch (e) {
          try {
            if (e && (e as any).stack) {
              (e as any).stack = (e as any).stack.replace(/user\.js/g, 'core.js').replace(/userscript/g, 'script').replace(/wplace/g, 'app');
            }
          } catch {}
          throw e;
        }
      };
      return originalRic.call(window, wrapped, options);
    };
  }
}

function hideDataAttributes() {
  const originalGetAttribute = Element.prototype.getAttribute;
  const originalGetAttributeNames = Element.prototype.getAttributeNames;
  const originalQuerySelector = Document.prototype.querySelector;
  const originalQuerySelectorAll = Document.prototype.querySelectorAll;

  Element.prototype.getAttribute = function (name: string) {
    try {
      if (name && hiddenAttributes.some((re) => re.test(name))) {
        return null;
      }
    } catch {}
    return originalGetAttribute.call(this, name);
  };

  Element.prototype.getAttributeNames = function () {
    const names = originalGetAttributeNames.call(this);
    return names.filter((n: string) => !hiddenAttributes.some((re) => re.test(n)));
  };

  Document.prototype.querySelector = function (selector: string) {
    try {
      if (selector && hiddenSelectors.some((re) => re.test(selector))) {
        return null;
      }
    } catch {}
    return originalQuerySelector.call(this, selector);
  };

  Document.prototype.querySelectorAll = function (selector: string) {
    try {
      if (selector && hiddenSelectors.some((re) => re.test(selector))) {
        const tmp = document.createElement('div');
        markElement(tmp);
        return tmp.querySelectorAll(selector);
      }
    } catch {}
    return originalQuerySelectorAll.call(this, selector);
  };

  restoreFns.push(() => {
    try { Element.prototype.getAttribute = originalGetAttribute; } catch {}
    try { Element.prototype.getAttributeNames = originalGetAttributeNames; } catch {}
    try { Document.prototype.querySelector = originalQuerySelector; } catch {}
    try { Document.prototype.querySelectorAll = originalQuerySelectorAll; } catch {}
  });
}

function maskPageVisibility() {
  try {
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true,
    });

    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
    });

    Object.defineProperty(document, 'webkitHidden', {
      get: () => false,
      configurable: true,
    });
  } catch {}

  const originalDocAddEventListener = document.addEventListener;
  const blockedDocEvents = ['visibilitychange', 'webkitvisibilitychange'];

  document.addEventListener = function (type: string, listener: any, options?: any) {
    if (blockedDocEvents.includes(type)) {
      return;
    }
    return originalDocAddEventListener.call(this, type, listener, options);
  };

  const originalWindowAddEventListener = window.addEventListener;
  const blockedWindowEvents = ['blur', 'focus', 'pagehide', 'pageshow'];

  window.addEventListener = function (type: string, listener: any, options?: any) {
    if (blockedWindowEvents.includes(type)) {
      return;
    }
    return originalWindowAddEventListener.call(this, type, listener, options);
  };

  restoreFns.push(() => {
    try { document.addEventListener = originalDocAddEventListener; } catch {}
    try { window.addEventListener = originalWindowAddEventListener; } catch {}
  });
}
