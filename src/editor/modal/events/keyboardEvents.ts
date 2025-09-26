
import { TOOL_SHORTCUTS } from '../shortcuts';

export interface KeyboardHandlerParams {
  
  editMode: boolean;
  showInfo: boolean;
  activeTool: string;
  hoverPx: number;
  hoverPy: number;
  
  
  redoOnce: () => void;
  undoOnce: () => void;
  clearSelection: () => void;
  invertSelection: () => void;
  drawOverlay: (px: number, py: number) => void;
  setState: (updates: Record<string, any>) => void;
}

export function createWindowKeyDownHandler(params: KeyboardHandlerParams) {
  return function onWindowKeyDown(e: KeyboardEvent) {
    
    if (e.key === 'Escape' || e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (params.showInfo) { 
        params.setState({ showInfo: false }); 
      }
      return;
    }
    
    if (!params.editMode) return;
    
    
    const target = e.target as HTMLElement;
    const tag = target && target.tagName ? String(target.tagName).toLowerCase() : '';
    const isEditable = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);
    if (isEditable) return;
    
    const ctrl = e.ctrlKey || e.metaKey;
    const key = (e.key || '').toLowerCase();
    const code = e.code || '';
    
    const letterKey = /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : '';
    
    if (ctrl) {
      
      const isZ = (e.code === 'KeyZ') || key === 'z';
      if (isZ) {
        e.preventDefault();
        if (e.shiftKey) { 
          params.redoOnce(); 
        } else { 
          params.undoOnce(); 
        }
        return;
      }
      
      
      const isD = (e.code === 'KeyD') || key === 'd';
      if (isD) {
        e.preventDefault();
        params.clearSelection();
        params.drawOverlay(params.hoverPx, params.hoverPy);
        return;
      }
      
      
      const isI = (e.code === 'KeyI') || key === 'i';
      if (isI) {
        e.preventDefault();
        params.invertSelection();
        params.drawOverlay(params.hoverPx, params.hoverPy);
        return;
      }
      return; 
    }
    
    
    const letter = letterKey || (key.length === 1 ? key : '');
    if (letter && TOOL_SHORTCUTS[letter]) {
      e.preventDefault();
      const tool = TOOL_SHORTCUTS[letter];
      if (tool === 'eyedropper') {
        params.setState({ prevTool: params.activeTool, activeTool: 'eyedropper' });
      } else {
        params.setState({ activeTool: tool });
      }
      return;
    }
  };
}

export function createBackdropKeyDownHandler(closeCallback: () => void) {
  return function onBackdropKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Esc' || e.key === 'Enter') {
      closeCallback();
    }
  };
}

export function createButtonKeyDownHandler(clickCallback: () => void) {
  return function onButtonKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clickCallback();
    }
  };
}
