const KEY = 'wph:boot-overlay';

export type BootOverlaySettings = {
  enabled: boolean;
  durationSec: number;
  disableSounds: boolean;
  hideLoadButton: boolean;
};

const MIN_SEC = 5;
const MAX_SEC = 60;
const DEFAULT: BootOverlaySettings = { enabled: true, durationSec: 10, disableSounds: false, hideLoadButton: false };

function clampSec(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT.durationSec;
  if (v < MIN_SEC) return MIN_SEC;
  if (v > MAX_SEC) return MAX_SEC;
  return Math.round(v);
}

export function loadBootOverlaySettings(): BootOverlaySettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BootOverlaySettings>;
      return {
        enabled: parsed.enabled !== false,
        durationSec: clampSec(parsed.durationSec ?? DEFAULT.durationSec),
        disableSounds: parsed.disableSounds === true,
        hideLoadButton: parsed.hideLoadButton === true
      };
    }
  } catch {}
  return { ...DEFAULT };
}

export function saveBootOverlaySettings(patch: Partial<BootOverlaySettings>): BootOverlaySettings {
  const current = loadBootOverlaySettings();
  const next: BootOverlaySettings = {
    enabled: patch.enabled ?? current.enabled,
    durationSec: clampSec(patch.durationSec ?? current.durationSec),
    disableSounds: patch.disableSounds ?? current.disableSounds,
    hideLoadButton: patch.hideLoadButton ?? current.hideLoadButton
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}
