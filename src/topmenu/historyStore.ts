


export type HistoryCoords = { x: number; y: number };
export type OriginTuple = [number, number, number, number]; 
export type HistoryMeta = {
  id: string;        
  name: string;
  size: number;
  type: string;
  ts: number;        
  coords?: HistoryCoords | null; 
  origin?: OriginTuple | null;   
};

const LS_KEY = 'wplace_history_list_v1';
const DB_NAME = 'wplace_history_db_v1';
const DB_STORE = 'files';

function hasIndexedDB() {
  try { return typeof indexedDB !== 'undefined'; } catch { return false; }
}

function openDB(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export function getList(): HistoryMeta[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr: HistoryMeta[] = JSON.parse(raw) || [];
    
    for (const it of arr) {
      if ((!it.coords || typeof it.coords.x !== 'number' || typeof it.coords.y !== 'number') && Array.isArray((it as any).origin) && (it as any).origin.length >= 4) {
        const o = (it as any).origin as OriginTuple;
        it.coords = { x: o[2]|0, y: o[3]|0 };
      }
    }
    if (!Array.isArray(arr)) return [];
    
    arr.sort((a, b) => (b.ts|0) - (a.ts|0));
    return arr.slice(0, 10);
  } catch { return []; }
}

function saveList(list: HistoryMeta[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 10))); } catch {}
}

export async function saveBlob(id: string, blob: Blob): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req = store.put(blob, id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Blob) || null);
    req.onerror = () => resolve(null);
  });
}

export async function addOrUpdate(
  file: File | Blob,
  name?: string,
  coordsOrOrigin?: HistoryCoords | OriginTuple | null,
): Promise<HistoryMeta> {
  const fName = (name || (file as any).name || 'unnamed');
  const fSize = (file as any).size | 0;
  const fType = (file as any).type || 'application/octet-stream';
  const id = `${fName}|${fSize}`;
  const ts = Date.now();
  let coords: HistoryCoords | null = null;
  let origin: OriginTuple | null = null;
  if (Array.isArray(coordsOrOrigin) && coordsOrOrigin.length >= 4) {
    origin = [coordsOrOrigin[0]|0, coordsOrOrigin[1]|0, coordsOrOrigin[2]|0, coordsOrOrigin[3]|0];
    coords = { x: origin[2], y: origin[3] };
  } else if (coordsOrOrigin && typeof coordsOrOrigin === 'object') {
    const c = coordsOrOrigin as HistoryCoords;
    coords = { x: c.x|0, y: c.y|0 };
  }
  const meta: HistoryMeta = { id, name: fName, size: fSize, type: fType, ts, coords, origin };
  
  const list = getList();
  const idx = list.findIndex(it => it.id === id);
  if (idx >= 0) list.splice(idx, 1);
  list.unshift(meta);
  saveList(list);
  
  await saveBlob(id, file as Blob);
  return meta;
}

export function updateCoords(id: string, coordsOrOrigin?: HistoryCoords | OriginTuple | null) {
  const list = getList();
  const idx = list.findIndex(it => it.id === id);
  if (idx >= 0) {
    let coords: HistoryCoords | null = null;
    let origin: OriginTuple | null = list[idx].origin || null;
    if (Array.isArray(coordsOrOrigin) && coordsOrOrigin.length >= 4) {
      origin = [coordsOrOrigin[0]|0, coordsOrOrigin[1]|0, coordsOrOrigin[2]|0, coordsOrOrigin[3]|0];
      coords = { x: origin[2], y: origin[3] };
    } else if (coordsOrOrigin && typeof coordsOrOrigin === 'object') {
      const c = coordsOrOrigin as HistoryCoords;
      coords = { x: c.x|0, y: c.y|0 };
    }
    list[idx] = { ...list[idx], coords, origin, ts: Date.now() };
    saveList(list);
  }
}

export function remove(id: string) {
  const list = getList().filter(it => it.id !== id);
  saveList(list);
}
