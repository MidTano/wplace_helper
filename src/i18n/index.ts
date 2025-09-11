import { writable, get } from 'svelte/store';
import type { Translations } from './ru';
import { ru } from './ru';
import { en } from './en';

export type Locale = 'ru' | 'en';

const STORAGE_KEY = 'wplace:lang:v1';

const DICTS: Record<Locale, Translations> = {
  ru,
  en,
};

function readInitialLang(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'ru' || v === 'en') return v;
  } catch {}
  
  return 'ru';
}

export const lang = writable<Locale>(readInitialLang());
lang.subscribe((v) => {
  try { localStorage.setItem(STORAGE_KEY, v); } catch {}
});

export function setLang(v: Locale) { lang.set(v); }
export function toggleLang() { lang.set(get(lang) === 'ru' ? 'en' : 'ru'); }

export function t(key: string): string {
  const l = get(lang);
  const dict = DICTS[l] || ru;
  return (dict && dict[key]) || (ru[key]) || (en[key]) || key;
}
