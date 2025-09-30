import App from './App.svelte';
import { installInterceptors } from './overlay/intercept';
import { setLoggingEnabled } from './overlay/log';
import { applyDarkTheme } from './theme/darkTheme';
import { registerAltCV } from './share/altcv';

function mount() {
  const rootId = 'wplace-svelte-overlay-root';
  if (document.getElementById(rootId)) return;
  const container = document.createElement('div');
  container.id = rootId;
  container.style.position = 'fixed';
  container.style.zIndex = '1000000';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  
  try { applyDarkTheme(); } catch {}
  
  try { installInterceptors(); } catch {}
  try {
    setLoggingEnabled(false);
    (window as any).wplaceSetLogs = setLoggingEnabled;
  } catch {}
  try { registerAltCV(); } catch {}

  new App({ target: container });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}


