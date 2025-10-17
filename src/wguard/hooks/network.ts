import type { WGuardContext } from '../core/types';
import { installInterceptors } from '../../overlay/intercept';

let applied = false;

export function applyNetworkGuards(_context: WGuardContext) {
  if (applied) return;
  applied = true;
  try {
    installInterceptors();
  } catch {}
}

export function resetNetworkGuards() {
  applied = false;
}
