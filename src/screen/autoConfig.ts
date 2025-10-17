import { getPersistentItem, setPersistentItem } from '../wguard/stealth/store';

export type AutoConfig = {
  
  minDist: number;
  
  interClickDelayMs: number;
  
  enhancedThresh: number;
  
  tileUpdatedTimeoutSec: number;
  
  switchPreWaitSec: number;
  
  afterSelectWaitSec: number;
  useDirectPlacement: boolean;
  bmMode: 'random' | 'topDown' | 'bottomUp' | 'leftRight' | 'rightLeft' | 'snakeRow' | 'snakeCol' | 'diagDown' | 'diagUp' | 'diagDownRight' | 'diagUpRight' | 'centerOut' | 'edgesIn';
  bmSelectedMasterIdx: number | null;
  bmOnlySelected: boolean;
  bmMultiColor: boolean;
  bmBatchLimit: number;
  seriesWaitSec: number;
  persistAutoRun: boolean;
  randomExtraWaitMaxSec: number;
  enhancedBackgroundColor: string;
};

const LS_KEY = 'wguard:auto-config';

const defaults: AutoConfig = {
  minDist: 5,
  interClickDelayMs: 65,
  enhancedThresh: 18,
  tileUpdatedTimeoutSec: 60,
  switchPreWaitSec: 1,
  afterSelectWaitSec: 1,
  useDirectPlacement: true,
  bmMode: 'random',
  bmSelectedMasterIdx: null,
  bmOnlySelected: false,
  bmMultiColor: true,
  bmBatchLimit: 0,
  seriesWaitSec: 90,
  persistAutoRun: true,
  randomExtraWaitMaxSec: 0,
  enhancedBackgroundColor: '#080808',
};

let current: AutoConfig = { ...defaults };

function load(): void {
  try {
    let raw = getPersistentItem(LS_KEY);
    if (!raw) {
      try {
        const ls = window.localStorage as Storage;
        const direct = ls.getItem(LS_KEY);
        if (direct) raw = direct;
      } catch {}
    }
    if (!raw) {
      try {
        const ls = window.localStorage as Storage;
        const candidates: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i) || '';
          if (k === LS_KEY || (k.startsWith('wguard:') && k.endsWith(':auto-config'))) candidates.push(k);
        }
        for (const k of candidates) {
          const v = ls.getItem(k);
          if (v) { raw = v; }
        }
      } catch {}
    }
    if (!raw) return;
    const parsed = JSON.parse(raw);
    
    const fromLegacy = {
      tileUpdatedTimeoutSec: (parsed.tileUpdatedTimeoutSec != null) ? Number(parsed.tileUpdatedTimeoutSec) : (parsed.tileUpdatedTimeoutMs != null ? Math.max(0, Math.round(Number(parsed.tileUpdatedTimeoutMs) / 1000)) : undefined),
      switchPreWaitSec:     (parsed.switchPreWaitSec     != null) ? Number(parsed.switchPreWaitSec)     : (parsed.switchPreWaitMs     != null ? Math.max(0, Math.round(Number(parsed.switchPreWaitMs)     / 1000)) : undefined),
      afterSelectWaitSec:   (parsed.afterSelectWaitSec   != null) ? Number(parsed.afterSelectWaitSec)   : (parsed.afterSelectWaitMs   != null ? Math.max(0, Math.round(Number(parsed.afterSelectWaitMs)   / 1000)) : undefined),
    };
    current = { ...defaults, ...parsed, ...cleanUndefined(fromLegacy) } as any;
    if (current && typeof current.bmMode === 'string') {
      const m = String(current.bmMode);
      if (m === 'spiralOutCW' || m === 'spiralOutCCW' || m === 'spiralInCW' || m === 'spiralInCCW' || m === 'outsideIn') {
        current.bmMode = 'random';
      }
    }
    current.persistAutoRun = true;
  } catch {}
}

function save(): void {
  try { setPersistentItem(LS_KEY, JSON.stringify(current)); } catch {}
  try {
    const ls = window.localStorage as Storage;
    ls.setItem(LS_KEY, JSON.stringify(current));
  } catch {}
}


try { if (typeof window !== 'undefined') load(); } catch {}

export function getAutoConfig(): AutoConfig { return current; }
export function updateAutoConfig(patch: Partial<AutoConfig>): AutoConfig {
  current = { ...current, ...patch };
  current.persistAutoRun = true;
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
