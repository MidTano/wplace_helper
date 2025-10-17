import { writable, get } from 'svelte/store';
import type { Translations } from './ru';
import { ru } from './ru';
import { en } from './en';
import { getPersistentItem, setPersistentItem } from '../wguard/stealth/store';

export type Locale = 'ru' | 'en';

const STORAGE_KEY = 'wguard:lang';
const MANUAL_KEY = 'wph:lang:manual';

const DICTS: Record<Locale, Translations> = {
  ru,
  en,
};

function readManualOverride(): Locale | null {
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    const raw = storage?.getItem?.(MANUAL_KEY) ?? null;
    if (raw === 'ru' || raw === 'en') return raw;
  } catch {}
  return null;
}

function writeManualOverride(v: Locale | null) {
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) return;
    if (v) storage.setItem(MANUAL_KEY, v);
    else storage.removeItem(MANUAL_KEY);
  } catch {}
}

let manualOverride = readManualOverride();

function readInitialLang(): Locale {
  if (manualOverride) return manualOverride;
  try {
    const v = getPersistentItem(STORAGE_KEY);
    if (v === 'ru' || v === 'en') return v;
  } catch {}
  try {
    const langs: string[] = [];
    if (typeof navigator !== 'undefined') {
      const n: any = navigator;
      if (Array.isArray(n.languages)) {
        for (const l of n.languages) if (typeof l === 'string') langs.push(l.toLowerCase());
      }
      if (!langs.length && typeof n.language === 'string') {
        langs.push(n.language.toLowerCase());
      }
    }
    for (const l of langs) {
      if (l === 'ru' || l.startsWith('ru-')) return 'ru';
      if (l === 'en' || l.startsWith('en-')) return 'en';
    }
  } catch {}
  return 'en';
}

export const lang = writable<Locale>(readInitialLang());
lang.subscribe((v) => {
  try { setPersistentItem(STORAGE_KEY, v); } catch {}
});

export function setLang(v: Locale, opts?: { manual?: boolean }) {
  if (opts?.manual) {
    manualOverride = v;
    writeManualOverride(v);
  }
  lang.set(v);
}
export function toggleLang() {
  const next = get(lang) === 'ru' ? 'en' : 'ru';
  setLang(next, { manual: true });
}

export function t(key: string): string {
  const l = get(lang);
  const dict = DICTS[l] || ru;
  
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  if (Object.prototype.hasOwnProperty.call(ru, key)) return ru[key];
  if (Object.prototype.hasOwnProperty.call(en, key)) return en[key];
  return key;
}
