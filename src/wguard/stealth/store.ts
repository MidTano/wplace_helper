import type { WGuardContext } from '../core/types';

let applied = false;

let originalLocalDescriptor: PropertyDescriptor | undefined;
let originalSessionDescriptor: PropertyDescriptor | undefined;
let originalDateNow: (() => number) | null = null;
let originalPerformanceNow: (() => number) | null = null;

let localSnapshot: Storage | null = null;
let sessionSnapshot: Storage | null = null;

let STORAGE_SALT = '';
export function setStorageSalt(s: string) {
  try {
    const v = String(s || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 16);
    STORAGE_SALT = v ? `:${v}` : '';
  } catch { STORAGE_SALT = ''; }
}

function saltKey(key: string): string {
  try {
    if (typeof key === 'string' && key.startsWith('wguard:')) {
      const rest = key.slice('wguard:'.length);
      return `wguard${STORAGE_SALT}:${rest}`;
    }
  } catch {}
  return key;
}

const MIGRATION_MAP: Record<string, string> = {
  'wplace:auto-run:status:v1': 'wguard:auto-run',
  'wplace:share_clipboard': 'wguard:clipboard',
  'wplace:log': 'wguard:log',
  'wplace:lang:v1': 'wguard:lang',
  'wplace:auto-config:v4': 'wguard:auto-config',
};

const WGUARD_VERSION = '2.0.0';
const VERSION_KEY = 'wguard:version';

const LEGACY_PREFIX_MAP = [
  { from: 'wplace:auto-allowed-masters:v1', to: 'wguard:auto-allowed-masters:v1' },
];

const LEGACY_SESSION_KEYS: string[] = [];

const MIGRATION_FLAG_LOCAL = 'wguard:migrated:local:v1';
const MIGRATION_FLAG_SESSION = 'wguard:migrated:session:v1';

export function applyStorageGuards(context: WGuardContext) {
  if (applied) return;
  applied = true;

  localSnapshot = createProtectedStorage(readStorage('localStorage'));
  sessionSnapshot = createProtectedStorage(readStorage('sessionStorage'));

  try {
    originalLocalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => localSnapshot!,
    });
  } catch {}

  try {
    originalSessionDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => sessionSnapshot!,
    });
  } catch {}

  migrateLegacyData();
  
  const jitterRange = context.config?.timing?.jitterRange ?? 2;
  installTimeGuards(jitterRange);
}

export function resetStorageGuards() {
  if (!applied) return;
  applied = false;

  try {
    if (originalLocalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalLocalDescriptor);
    }
  } catch {}

  try {
    if (originalSessionDescriptor) {
      Object.defineProperty(window, 'sessionStorage', originalSessionDescriptor);
    }
  } catch {}

  localSnapshot = null;
  sessionSnapshot = null;
  originalLocalDescriptor = undefined;
  originalSessionDescriptor = undefined;

  restoreTimeGuards();
}

function readStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return window[name];
  } catch {
    return null;
  }
}

function migrateLegacyData() {
  try {
    if (localSnapshot && !localSnapshot.getItem(MIGRATION_FLAG_LOCAL)) {
      for (const [legacyKey, targetKey] of Object.entries(MIGRATION_MAP)) {
        const value = safeGet(localSnapshot, legacyKey);
        if (value != null && localSnapshot.getItem(targetKey) == null) {
          safeSet(localSnapshot, targetKey, value);
        }
        try { localSnapshot.removeItem(legacyKey); } catch {}
      }

      const keys = collectKeys(localSnapshot);
      for (const key of keys) {
        for (const prefix of LEGACY_PREFIX_MAP) {
          if (key.startsWith(prefix.from)) {
            const suffix = key.substring(prefix.from.length);
            const newKey = `${prefix.to}${suffix}`;
            const value = safeGet(localSnapshot, key);
            if (value != null && localSnapshot.getItem(newKey) == null) {
              safeSet(localSnapshot, newKey, value);
            }
            try { localSnapshot.removeItem(key); } catch {}
          }
        }
      }

      safeSet(localSnapshot, MIGRATION_FLAG_LOCAL, '1');
      safeSet(localSnapshot, VERSION_KEY, WGUARD_VERSION);
    }
  } catch {}

  try {
    if (sessionSnapshot && !sessionSnapshot.getItem(MIGRATION_FLAG_SESSION)) {
      for (const key of LEGACY_SESSION_KEYS) {
        const value = safeGet(sessionSnapshot, key);
        if (value != null) {
          const targetKey = `wguard:${key}`;
          if (sessionSnapshot.getItem(targetKey) == null) {
            safeSet(sessionSnapshot, targetKey, value);
          }
        }
        try { sessionSnapshot.removeItem(key); } catch {}
      }

      safeSet(sessionSnapshot, MIGRATION_FLAG_SESSION, '1');
    }
  } catch {}
}

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(saltKey(key));
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(saltKey(key), value);
  } catch {}
}

function collectKeys(storage: Storage): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
  } catch {}
  return keys;
}

function resolvePersistentStorage(): Storage | null {
  return localSnapshot ?? readStorage('localStorage');
}

function resolveSessionStorage(): Storage | null {
  return sessionSnapshot ?? readStorage('sessionStorage');
}

export function getPersistentItem(key: string, fallback: string | null = null): string | null {
  const storage = resolvePersistentStorage();
  if (!storage) return fallback;
  const value = safeGet(storage, key);
  return value ?? fallback;
}

export function setPersistentItem(key: string, value: string): void {
  const storage = resolvePersistentStorage();
  if (!storage) return;
  safeSet(storage, key, value);
}

export function removePersistentItem(key: string): void {
  const storage = resolvePersistentStorage();
  if (!storage) return;
  try { storage.removeItem(key); } catch {}
}

export function getSessionItem(key: string, fallback: string | null = null): string | null {
  const storage = resolveSessionStorage();
  if (!storage) return fallback;
  const value = safeGet(storage, key);
  return value ?? fallback;
}

export function setSessionItem(key: string, value: string): void {
  const storage = resolveSessionStorage();
  if (!storage) return;
  safeSet(storage, key, value);
}

export function removeSessionItem(key: string): void {
  const storage = resolveSessionStorage();
  if (!storage) return;
  try { storage.removeItem(key); } catch {}
}

function createProtectedStorage(storage: Storage | null): Storage {
  const target = storage ?? createFallbackStorage();
  let faulted = false;

  return new Proxy(target, {
    get(source, prop, receiver) {
      if (faulted) {
        if (prop === 'length') return 0;
        if (prop === 'key') return () => null;
        if (prop === 'getItem') return () => null;
        if (prop === 'setItem' || prop === 'removeItem' || prop === 'clear') return () => {};
      }

      const value = Reflect.get(source, prop, receiver);
      if (typeof value === 'function') {
        return function (...args: unknown[]) {
          try {
            return value.apply(source, args);
          } catch {
            faulted = true;
            return undefined;
          }
        };
      }

      return value;
    },
  });
}

function createFallbackStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(String(saltKey(key))) ?? null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(String(saltKey(key)));
    },
    setItem(key: string, value: string) {
      data.set(String(saltKey(key)), String(value));
    },
  } as Storage;
}

function installTimeGuards(jitterRange: number = 2) {
  const jitter = Math.round((Math.random() * 2 - 1) * jitterRange);

  if (!originalDateNow) {
    try {
      originalDateNow = Date.now;
      Date.now = function () {
        return originalDateNow!() + jitter;
      };
    } catch {}
  }

  if (typeof performance !== 'undefined' && typeof performance.now === 'function' && !originalPerformanceNow) {
    try {
      originalPerformanceNow = performance.now.bind(performance);
      performance.now = function () {
        return originalPerformanceNow!() + jitter;
      };
    } catch {}
  }
}

function restoreTimeGuards() {
  if (originalDateNow) {
    try { Date.now = originalDateNow; } catch {}
    originalDateNow = null;
  }

  if (originalPerformanceNow) {
    try { performance.now = originalPerformanceNow; } catch {}
    originalPerformanceNow = null;
  }
}
