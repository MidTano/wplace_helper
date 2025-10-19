import { getPersistentItem } from '../stealth/store';

export const LEGACY_CHANNEL_SOURCE = 'wplace-svelte';
let BASE_CHANNEL_SOURCE = 'wguard-svelte';
let CURRENT_CHANNEL_SOURCE = BASE_CHANNEL_SOURCE;
let OVERRIDE_CHANNEL_SOURCE: string | null = null;
let ORIGINAL_WINDOW_NAME: string | null = null;
let ORIGINAL_PORTAL_ID: string | null = null;

export const MASK_CHANNEL_NAME = 'bm-A';

export function setChannel(name: string) {
  try {
    if (name && typeof name === 'string') {
      BASE_CHANNEL_SOURCE = name;
      CURRENT_CHANNEL_SOURCE = OVERRIDE_CHANNEL_SOURCE || BASE_CHANNEL_SOURCE;
    }
  } catch {}
}

export function getChannel(): string {
  return CURRENT_CHANNEL_SOURCE;
}

export function overrideChannel(name: string | null | undefined): void {
  try {
    if (typeof name === 'string' && name) {
      OVERRIDE_CHANNEL_SOURCE = name;
    } else {
      OVERRIDE_CHANNEL_SOURCE = null;
    }
    CURRENT_CHANNEL_SOURCE = OVERRIDE_CHANNEL_SOURCE || BASE_CHANNEL_SOURCE;
  } catch {}
}

export type ChannelPayload = Record<string, unknown> & { source: string };

export function normalizeChannelData<T extends { source?: string }>(data: T | null | undefined): (T & { source: string }) | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const source = (data as any).source;
  const valid = source === LEGACY_CHANNEL_SOURCE || source === CURRENT_CHANNEL_SOURCE || source === BASE_CHANNEL_SOURCE;
  if (!valid) {
    return null;
  }
  return { ...data, source: CURRENT_CHANNEL_SOURCE } as T & { source: string };
}

export function isChannelPayload(data: unknown): data is ChannelPayload {
  return !!normalizeChannelData(data as any);
}

export function postChannelMessage(payload: Record<string, any>): void {
  try {
    window.postMessage({ ...payload, source: CURRENT_CHANNEL_SOURCE }, '*');
  } catch {}
}

export function readChannelPayload(event: { data?: unknown } | null | undefined): ChannelPayload | null {
  return normalizeChannelData((event as any)?.data);
}

export function sendChannel(payload: Record<string, any>): void {
  postChannelMessage(payload);
}

export function readMaskFlagFromStorage(): boolean {
  try {
    const raw = getPersistentItem('wguard:auto-config');
    if (raw) {
      const data = JSON.parse(raw);
      return !!data?.maskAsBlueMarble;
    }
  } catch {}
  return false;
}

export function applyMaskOverride(enabled: boolean): void {
  if (ORIGINAL_WINDOW_NAME == null) {
    try {
      ORIGINAL_WINDOW_NAME = String(window.name || '');
    } catch {
      ORIGINAL_WINDOW_NAME = '';
    }
  }
  try {
    const container = (window as any).__wphPortalContainer as HTMLElement | null;
    if (container) {
      if (ORIGINAL_PORTAL_ID == null || ORIGINAL_PORTAL_ID === MASK_CHANNEL_NAME) {
        const currentId = container.id && container.id !== MASK_CHANNEL_NAME ? container.id : ('_' + Math.random().toString(36).slice(2, 8));
        ORIGINAL_PORTAL_ID = currentId;
        if (!container.id) container.id = currentId;
      }
      if (enabled) {
        container.id = MASK_CHANNEL_NAME;
      } else if (ORIGINAL_PORTAL_ID) {
        container.id = ORIGINAL_PORTAL_ID;
      }
    }
  } catch {}
  if (enabled) {
    overrideChannel(MASK_CHANNEL_NAME);
    try { window.name = MASK_CHANNEL_NAME; } catch {}
  } else {
    overrideChannel(null);
    if (ORIGINAL_WINDOW_NAME != null) {
      try { window.name = ORIGINAL_WINDOW_NAME; } catch {}
    }
  }
}
