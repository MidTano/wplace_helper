import { writable, get } from 'svelte/store';
import { parseCanonicalTileHref, CanonicalTile } from './tiles';

export type LastTileState = {
  tile: CanonicalTile | null;
  at: number;
};

const _last = writable<LastTileState>({ tile: null, at: 0 });

export const lastTileStore = _last;

export function getLastTile(): CanonicalTile | null { return get(_last).tile; }

let inited = false;
export function initCopyArtListeners() {
  if (inited) return;
  inited = true;
  try {
    window.addEventListener('message', (ev: any) => {
      const d = ev?.data;
      if (!d || d.source !== 'wplace-svelte') return;
      if (d.action === 'tileUpdated' && typeof d.endpoint === 'string') {
        const parsed = parseCanonicalTileHref(d.endpoint);
        if (parsed) _last.set({ tile: parsed, at: Date.now() });
      }
    });
  } catch {}
}
