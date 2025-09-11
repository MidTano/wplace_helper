import { log } from './log';
import { getStencilManager } from '../template/stencilManager';
import { updateCoords } from '../topmenu/historyStore';

let selectedFile: Blob | null = null;
let originCoords: [number, number, number, number] | null = null; 
let currentHistoryId: string | null = null;
let moveMode = false; 

export const drawMult = 5;
export const tileSize = 1000;

export function setSelectedFile(file: Blob | null) {
  selectedFile = file;
  log('state', 'setSelectedFile', { has: !!file });
}

export function getSelectedFile(): Blob | null {
  return selectedFile;
}

export function setOriginCoords(coords: [number, number, number, number] | null) {
  originCoords = coords;
  log('state', 'setOriginCoords', coords);
  try { window.dispatchEvent(new CustomEvent('wplace:origin', { detail: { coords } })); } catch {}
  
  try {
    if (!coords) return;
    
    let id = currentHistoryId;
    if (!id && selectedFile) {
      const name = (selectedFile as any).name || 'edited.png';
      const size = ((selectedFile as any).size | 0);
      if (size > 0) id = `${name}|${size}`;
    }
    if (id) updateCoords(id, coords);
  } catch {}
}

export function getOriginCoords(): [number, number, number, number] | null {
  return originCoords;
}


export function setCurrentHistoryId(id: string | null) {
  currentHistoryId = id;
}


export function setMoveMode(v: boolean) {
  moveMode = !!v;
  log('state', 'setMoveMode', { on: moveMode });
  try { window.dispatchEvent(new CustomEvent('wplace:moveMode', { detail: { on: moveMode } })); } catch {}
}

export function isMoveMode(): boolean { return moveMode; }

export async function rebuildStencilFromState() {
  const file = selectedFile;
  const origin = originCoords;
  if (!file || !origin) { log('state', 'rebuildTemplateFromState skip', { hasFile: !!file, hasOrigin: !!origin }); return; }
  log('state', 'rebuildTemplateFromState begin', { origin });
  const sm = getStencilManager();
  await sm.create(file, origin);
  log('state', 'rebuildTemplateFromState done');
}


export async function rebuildStencilFromBlob(blob: Blob) {
  const origin = originCoords;
  if (!blob || !origin) { log('state', 'rebuildStencilFromBlob skip', { hasBlob: !!blob, hasOrigin: !!origin }); return; }
  const sm = getStencilManager();
  await sm.create(blob, origin);
}


