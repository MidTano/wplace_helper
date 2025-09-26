
export function appendToBody(node: HTMLElement) {
  const placeholder = document.createComment('portal-placeholder');
  const parent = node.parentNode;
  
  try { 
    parent && parent.insertBefore(placeholder, node); 
  } catch {}
  
  try { 
    document.body.appendChild(node); 
  } catch {}
  
  return {
    destroy() {
      try {
        
        if (node && node.parentNode) { 
          node.parentNode.removeChild(node); 
        }
        
        
        if (parent && placeholder && placeholder.parentNode === parent) {
          try { 
            parent.removeChild(placeholder); 
          } catch {}
        }
      } catch {}
    }
  }
}
