import { markElement, setDynamicAttribute } from '../../wguard';

export function enhanceElement(el: HTMLElement): void {
  try { markElement(el); } catch {}
  try { setDynamicAttribute(el); } catch {}
}

export function waitTrustedClick(el: HTMLElement, timeoutMs: number = 60000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const t = window.setTimeout(() => finish(false), timeoutMs);
    const finish = (ok: boolean) => {
      if (done) return; done = true;
      try { clearTimeout(t); } catch {}
      try { el.removeEventListener('pointerup', onUp, true); } catch {}
      try { el.removeEventListener('click', onClick, true); } catch {}
      try { el.removeEventListener('keyup', onKey, true); } catch {}
      resolve(ok);
    };

    const onUp = () => finish(true);
    const onClick = () => finish(true);
    const onKey = (e: KeyboardEvent) => {
      const code = e.code || (e as any).key;
      if (code === 'Enter' || code === 'Space' || code === 'Spacebar') finish(true);
    };

    try { enhanceElement(el); } catch {}
    try { el.addEventListener('pointerup', onUp, { capture: true, once: true } as AddEventListenerOptions); } catch {}
    try { el.addEventListener('click', onClick, { capture: true, once: true } as AddEventListenerOptions); } catch {}
    try { el.addEventListener('keyup', onKey, { capture: true, once: true } as AddEventListenerOptions); } catch {}
  });
}
