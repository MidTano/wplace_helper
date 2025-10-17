
export function appendToBody(node: HTMLElement) {
  const placeholder = document.createComment('portal-placeholder');
  (placeholder as any).wguard = 'WGuard';
  const parent = node.parentNode;
  
  try { 
    parent && parent.insertBefore(placeholder, node); 
  } catch {}
  
  try {
    const host: any = (window as any).__wphPortalHost;
    if (host && typeof host.appendChild === 'function') {
      host.appendChild(node);
    } else {
      document.body.appendChild(node);
    }
  } catch {}
  
  return {
    destroy() {
      try {
        if (node && node.parentNode) { 
          node.parentNode.removeChild(node); 
        }
        if (parent && placeholder && placeholder.parentNode === parent) {
          try { parent.removeChild(placeholder); } catch {}
        }
      } catch {}
    }
  }
}
