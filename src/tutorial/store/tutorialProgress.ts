const STORAGE_KEYS = {
  COMPLETED: 'wplace_helper_tutorial_completed',
  PROGRESS: 'wplace_helper_tutorial_progress',
  SKIPPED: 'wplace_helper_tutorial_skipped'
} as const;

export function checkFirstLaunch(): boolean {
  try {
    const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED);
    const skipped = localStorage.getItem(STORAGE_KEYS.SKIPPED);
    if (completed !== 'true' && skipped !== 'true') {
      localStorage.setItem(STORAGE_KEYS.COMPLETED, 'true');
      localStorage.setItem(STORAGE_KEYS.PROGRESS, '0');
    }
    return false;
  } catch {
    return false;
  }
}

export function saveTutorialComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPLETED, 'true');
    localStorage.setItem(STORAGE_KEYS.PROGRESS, '0');
  } catch (e) {
    console.error('Failed to save tutorial completion:', e);
  }
}

export function saveTutorialSkipped(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SKIPPED, 'true');
  } catch (e) {
    console.error('Failed to save tutorial skip:', e);
  }
}

export function saveTutorialProgress(stepIndex: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, String(stepIndex));
  } catch (e) {
    console.error('Failed to save tutorial progress:', e);
  }
}

export function getTutorialProgress(): number {
  try {
    const progress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return progress ? parseInt(progress, 10) : 0;
  } catch {
    return 0;
  }
}

export function resetTutorial(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.COMPLETED);
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.SKIPPED);
  } catch (e) {
    console.error('Failed to reset tutorial:', e);
  }
}

export function restartTutorial(): void {
  try {
    resetTutorial();
  } catch (e) {
    console.error('Failed to restart tutorial:', e);
  }
}

export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.COMPLETED) === 'true';
  } catch {
    return false;
  }
}

export function isTutorialSkipped(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.SKIPPED) === 'true';
  } catch {
    return false;
  }
}
