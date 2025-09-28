let enabled: boolean = (() => {
  try {
    const v = localStorage.getItem('wplace:log');
    if (v === '1') return true;
    if (v === '0') return false;
    return false; 
  } catch {
    return false;
  }
})();

export function setLoggingEnabled(value: boolean) {
  enabled = !!value;
  try { localStorage.setItem('wplace:log', enabled ? '1' : '0'); } catch {}
  try { (window as any).wplaceLogEnabled = enabled; } catch {}
  try {
    const w: any = window as any;
    if (!enabled) {
      if (!w.__wplace_orig_console) {
        w.__wplace_orig_console = { log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug };
      }
      const noop = function(){} as any;
      console.log = noop as any;
      console.warn = noop as any;
      console.error = noop as any;
      console.info = noop as any;
      console.debug = noop as any;
    } else {
      const o = w.__wplace_orig_console;
      if (o) {
        console.log = o.log;
        console.warn = o.warn;
        console.error = o.error;
        console.info = o.info;
        console.debug = o.debug;
      }
    }
  } catch {}
}

export function getLoggingEnabled(): boolean {
  return enabled;
}

export function log(scope: string, ...args: any[]) {
  
  return;
}

try {
  (window as any).wplaceToggleLogs = setLoggingEnabled;
  
  window.addEventListener('keydown', (e: any) => {
    try {
      if (e && e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L')) {
        setLoggingEnabled(!enabled);
      }
    } catch {}
  }, { passive: true });
} catch {}


