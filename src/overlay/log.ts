import { getPersistentItem, setPersistentItem } from '../wguard/stealth/store';

const STORAGE_KEY = 'wguard:log';

const ORIG = (() => {
  try {
    const w: any = window as any;
    const base = w.__wplace_orig_console || console;
    return {
      log: (base.log || console.log).bind(base),
      warn: (base.warn || console.warn).bind(base),
      error: (base.error || console.error).bind(base),
      info: (base.info || console.info).bind(base),
      debug: (base.debug || console.debug).bind(base),
    };
  } catch {
    return { log: (...args:any[])=>{}, warn: (...args:any[])=>{}, error: (...args:any[])=>{}, info: (...args:any[])=>{}, debug: (...args:any[])=>{} } as any;
  }
})();

let enabled: boolean = (() => {
  const value = getPersistentItem(STORAGE_KEY);
  if (value === '1') return true;
  if (value === '0') return false;
  return true;
})();

export function setLoggingEnabled(value: boolean) {
  enabled = !!value;
  try {
    if (enabled) {
      setPersistentItem(STORAGE_KEY, '1');
    } else {
      setPersistentItem(STORAGE_KEY, '0');
    }
  } catch {}
  try { (window as any).wguardLogEnabled = enabled; } catch {}
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
  if (!enabled) return;
  try {
    const prefix = `[${scope}]`;
    ORIG.log(prefix, ...args);
    try {
      const w: any = window as any;
      if (!Array.isArray(w.__wplace_logBuffer)) w.__wplace_logBuffer = [];
      w.__wplace_logBuffer.push([Date.now(), scope, args]);
    } catch {}
  } catch {}
}

try {
  (window as any).wguardToggleLogs = setLoggingEnabled;
  (window as any).wguardDumpLogs = () => {
    try {
      const w: any = window as any;
      const buf: any[] = Array.isArray(w.__wplace_logBuffer) ? w.__wplace_logBuffer : [];
      for (const it of buf) {
        try { ORIG.log(`[dump:${String(it[1])}]`, ...(it[2] || [])); } catch {}
      }
    } catch {}
  };
  
  window.addEventListener('keydown', (e: any) => {
    try {
      if (e && e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L')) {
        setLoggingEnabled(!enabled);
      }
    } catch {}
  }, { passive: true });
  try { setLoggingEnabled(true); } catch {}
} catch {}


