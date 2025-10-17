export const LEGACY_CHANNEL_SOURCE = 'wplace-svelte';
let CURRENT_CHANNEL_SOURCE = 'wguard-svelte';

export function setChannel(name: string) {
  try { if (name && typeof name === 'string') CURRENT_CHANNEL_SOURCE = name; } catch {}
}

export function getChannel(): string {
  return CURRENT_CHANNEL_SOURCE;
}

export type ChannelPayload = Record<string, unknown> & { source: string };

export function normalizeChannelData<T extends { source?: string }>(data: T | null | undefined): (T & { source: string }) | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const source = (data as any).source;
  const valid = source === LEGACY_CHANNEL_SOURCE || source === CURRENT_CHANNEL_SOURCE;
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
