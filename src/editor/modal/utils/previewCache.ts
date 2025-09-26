
export interface PreviewCacheEntry {
  blob: Blob;
  url: string;
  revoke: () => void;
  stats?: {
    w: number;
    h: number;
    opaque: number;
    colors: number;
  };
}

export function createPreviewCache() {
  const cache = new Map<string, PreviewCacheEntry>();

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, entry: PreviewCacheEntry) => cache.set(key, entry),
    clear: () => {
      
      for (const entry of cache.values()) {
        try { 
          entry.revoke && entry.revoke(); 
        } catch {}
      }
      cache.clear();
    },
    values: () => cache.values(),
    delete: (key: string) => {
      const entry = cache.get(key);
      if (entry) {
        try { 
          entry.revoke && entry.revoke(); 
        } catch {}
      }
      return cache.delete(key);
    }
  };
}

export function generateCacheKey(params: {
  fileStamp: number;
  pixelSize: number;
  method: string;
  ditherMethod: string;
  ditherLevels: number;
  paletteMode: string;
  outlineThickness: number;
  erodeAmount: number;
  customKey?: string;
  customDitherKey?: string;
}): string {
  const {
    fileStamp, pixelSize, method, ditherMethod, ditherLevels,
    paletteMode, outlineThickness, erodeAmount, customKey, customDitherKey
  } = params;

  let key = `${fileStamp}|ps:${pixelSize}|m:${method}|dm:${ditherMethod}|dl:${ditherLevels}|pm:${paletteMode}|o:${outlineThickness}|e:${erodeAmount}`;
  
  if (paletteMode === 'custom' && customKey) {
    key += `|ci:${customKey}`;
  }
  
  if (ditherMethod === 'custom' && customDitherKey) {
    key += `|cp:${customDitherKey}`;
  }
  
  return key;
}
