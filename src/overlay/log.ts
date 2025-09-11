let enabled: boolean = (() => {
  try {
    const v = localStorage.getItem('wplace:log');
    if (v === '1') return true;
    if (v === '0') return false;
    return false; 
  } catch {
    return false;
  }
})();

export function setLoggingEnabled(value: boolean) {
  enabled = !!value;
  try { localStorage.setItem('wplace:log', enabled ? '1' : '0'); } catch {}
  try { (window as any).wplaceLogEnabled = enabled; } catch {}
}

export function getLoggingEnabled(): boolean {
  return enabled;
}

export function log(scope: string, ...args: any[]) {
  
  return;
}

try {
  (window as any).wplaceToggleLogs = setLoggingEnabled;
  
  window.addEventListener('keydown', (e: any) => {
    try {
      if (e && e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L')) {
        setLoggingEnabled(!enabled);
      }
    } catch {}
  }, { passive: true });
} catch {}


