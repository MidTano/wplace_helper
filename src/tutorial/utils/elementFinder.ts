function getSearchContexts(): Array<Document | ShadowRoot | HTMLElement> {
  const ctx: Array<Document | ShadowRoot | HTMLElement> = [];
  try { ctx.push(document); } catch {}
  try {
    const host: any = (window as any).__wphPortalHost;
    if (host) {
      if (host instanceof ShadowRoot) ctx.push(host);
      if (host && host.host instanceof HTMLElement && host.host.shadowRoot) ctx.push(host.host.shadowRoot as ShadowRoot);
      if (host instanceof HTMLElement) {
        ctx.push(host);
        if ((host as any).shadowRoot) ctx.push((host as any).shadowRoot as ShadowRoot);
      }
    }
  } catch {}
  try {
    const overlay = document.getElementById('wplace-svelte-overlay-root');
    if (overlay) {
      ctx.push(overlay);
      if ((overlay as any).shadowRoot) ctx.push((overlay as any).shadowRoot as ShadowRoot);
    }
  } catch {}
  return ctx;
}

export function findElement(selector: string): HTMLElement | null {
  const ctx = getSearchContexts();
  for (const root of ctx) {
    try {
      const el = (root as any).querySelector?.(selector) as HTMLElement | null;
      if (el) return el;
    } catch {}
  }
  return null;
}

export function waitForElement(selector: string, timeout: number = 5000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const found = findElement(selector);
    if (found) { resolve(found); return; }

    const observers: MutationObserver[] = [];
    const observeRoot = (root: Node) => {
      try {
        const obs = new MutationObserver(() => {
          const el = findElement(selector);
          if (el) {
            observers.forEach(o=>{ try { o.disconnect(); } catch {} });
            resolve(el);
          }
        });
        obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','id'] });
        observers.push(obs);
      } catch {}
    };

    const ctx = getSearchContexts();
    for (const c of ctx) {
      if ((c as Document).body) observeRoot((c as Document).body as Node);
      else observeRoot(c as Node);
    }

    window.setTimeout(() => {
      observers.forEach(o=>{ try { o.disconnect(); } catch {} });
      resolve(findElement(selector));
    }, timeout);
  });
}

export function isElementVisible(element: HTMLElement): boolean {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    parseFloat(style.opacity) > 0
  );
}

export function isElementInteractive(element: HTMLElement): boolean {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return style.pointerEvents !== 'none';
}

export function getElementCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function getAllMatchingElements(selector: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const ctx = getSearchContexts();
  for (const root of ctx) {
    try {
      const list = Array.from((root as any).querySelectorAll?.(selector) || []) as HTMLElement[];
      for (const el of list) if (out.indexOf(el) < 0) out.push(el);
    } catch {}
  }
  return out;
}
