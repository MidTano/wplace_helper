export type AutoConfig = {
  
  minDist: number;
  
  interClickDelayMs: number;
  
  enhancedThresh: number;
  
  scanStep: number;
  
  tileUpdatedTimeoutSec: number;
  
  switchPreWaitSec: number;
  
  afterSelectWaitSec: number;
  
  paintOutWaitSec: number;
  
  antiIdleEnabled: boolean;
};

const LS_KEY = 'wplace:auto-config:v3';

const defaults: AutoConfig = {
  minDist: 5,
  interClickDelayMs: 65,
  enhancedThresh: 18,
  scanStep: 5,
  
  tileUpdatedTimeoutSec: 60,
  switchPreWaitSec: 1,
  afterSelectWaitSec: 1,
  paintOutWaitSec: 500,
  antiIdleEnabled: true,
};

let current: AutoConfig = { ...defaults };

function load(): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    
    const fromLegacy = {
      tileUpdatedTimeoutSec: (parsed.tileUpdatedTimeoutSec != null) ? Number(parsed.tileUpdatedTimeoutSec) : (parsed.tileUpdatedTimeoutMs != null ? Math.max(0, Math.round(Number(parsed.tileUpdatedTimeoutMs) / 1000)) : undefined),
      switchPreWaitSec:     (parsed.switchPreWaitSec     != null) ? Number(parsed.switchPreWaitSec)     : (parsed.switchPreWaitMs     != null ? Math.max(0, Math.round(Number(parsed.switchPreWaitMs)     / 1000)) : undefined),
      afterSelectWaitSec:   (parsed.afterSelectWaitSec   != null) ? Number(parsed.afterSelectWaitSec)   : (parsed.afterSelectWaitMs   != null ? Math.max(0, Math.round(Number(parsed.afterSelectWaitMs)   / 1000)) : undefined),
      paintOutWaitSec:      (parsed.paintOutWaitSec      != null) ? Number(parsed.paintOutWaitSec)      : (parsed.paintOutWaitMs      != null ? Math.max(0, Math.round(Number(parsed.paintOutWaitMs)      / 1000)) : undefined),
    };
    current = { ...defaults, ...parsed, ...cleanUndefined(fromLegacy) } as any;
  } catch {}
}

function save(): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(current)); } catch {}
}


try { if (typeof window !== 'undefined') load(); } catch {}

export function getAutoConfig(): AutoConfig { return current; }
export function updateAutoConfig(patch: Partial<AutoConfig>): AutoConfig {
  current = { ...current, ...patch };
  save();
  return current;
}

export function resetAutoConfig(): AutoConfig {
  current = { ...defaults };
  save();
  return current;
}

function cleanUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) (out as any)[k] = obj[k];
  }
  return out;
}
