import { writable, derived } from 'svelte/store';
import type { 
  ComparisonImage, 
  ComparisonState, 
  PanPosition, 
  GridLayout,
  EditorSettings 
} from './types';

const initialState: ComparisonState = {
  images: [],
  maxImages: 12,
  syncedZoom: 1,
  syncedPan: { x: 0, y: 0 },
  activeImageId: null,
  gridLayout: 'auto',
  isModalOpen: false
};

export const comparisonStore = writable<ComparisonState>(initialState);

export const comparisonImages = derived(
  comparisonStore, 
  $store => $store.images
);

export const canAddMore = derived(
  comparisonStore, 
  $store => $store.images.length < $store.maxImages
);

export const hasEnoughForComparison = derived(
  comparisonStore, 
  $store => $store.images.length >= 2
);

export const activeImage = derived(
  comparisonStore,
  $store => $store.images.find(img => img.id === $store.activeImageId) || null
);

export const currentZoom = derived(
  comparisonStore,
  $store => $store.syncedZoom
);

export const currentPan = derived(
  comparisonStore,
  $store => $store.syncedPan
);

export const isModalOpen = derived(
  comparisonStore,
  $store => $store.isModalOpen
);

function generateImageId(settings: EditorSettings, timestamp: number): string {
  const components = [
    `ps${settings.pixelSize}`,
    `m${settings.method}`,
    `dm${settings.ditherMethod}`,
    `dl${settings.ditherLevels}`,
    `pm${settings.paletteMode}`,
    `t${timestamp}`
  ];
  
  if (settings.outlineThickness > 0) {
    components.push(`ot${settings.outlineThickness}`);
  }
  
  if (settings.erodeAmount > 0) {
    components.push(`ea${settings.erodeAmount}`);
  }
  
  if (settings.customIndices && settings.customIndices.length > 0) {
    components.push(`ci${settings.customIndices.join('-')}`);
  }
  
  return components.join('_');
}

async function computeImageHash(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    
    return `${blob.size}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

function getAutoLayout(imageCount: number): GridLayout {
  switch (imageCount) {
    case 1: return '1x1';
    case 2: return '2x1';
    case 3: return '3x1';
    case 4: return '2x2';
    case 5:
    case 6: return '3x2';
    case 7:
    case 8:
    case 9: return '3x3';
    default: return '4x3';
  }
}

export const comparisonActions = {
  async addImage(
    blob: Blob, 
    settings: EditorSettings, 
    metadata: Partial<ComparisonImage['metadata']> = {}
  ): Promise<boolean> {
    try {
      const timestamp = Date.now();
      const id = generateImageId(settings, timestamp);
      const hash = await computeImageHash(blob);
      
      return new Promise((resolve) => {
        comparisonStore.update(state => {
          
          if (state.images.length >= state.maxImages) {
            resolve(false);
            return state;
          }
          
          
          const existsWithSameHash = state.images.find(img => 
            img.id.includes(hash.slice(0, 8))
          );
          if (existsWithSameHash) {
            resolve(false);
            return state;
          }
          
          
          const url = URL.createObjectURL(blob);
          
          
          const newImage: ComparisonImage = {
            id: `${id}_${hash.slice(0, 8)}`,
            blob,
            url,
            metadata: {
              method: settings.method,
              ditherMethod: settings.ditherMethod,
              ditherLevels: settings.ditherLevels,
              paletteMode: settings.paletteMode,
              timestamp,
              settings,
              ...metadata
            }
          };
          
          const newImages = [...state.images, newImage];
          
          resolve(true);
          return {
            ...state,
            images: newImages,
            gridLayout: getAutoLayout(newImages.length),
            activeImageId: newImage.id
          };
        });
      });
    } catch (error) {
      console.error('[ComparisonStore] Error adding image:', error);
      return false;
    }
  },
  
  removeImage(imageId: string): void {
    comparisonStore.update(state => {
      const imageToRemove = state.images.find(img => img.id === imageId);
      if (imageToRemove) {
        
        try {
          URL.revokeObjectURL(imageToRemove.url);
        } catch (error) {
          console.warn('[ComparisonStore] Error revoking URL:', error);
        }
      }
      
      const newImages = state.images.filter(img => img.id !== imageId);
      
      return {
        ...state,
        images: newImages,
        gridLayout: getAutoLayout(newImages.length),
        activeImageId: state.activeImageId === imageId 
          ? (newImages.length > 0 ? newImages[0].id : null)
          : state.activeImageId
      };
    });
  },
  
  clearAll(): void {
    comparisonStore.update(state => {
      
      state.images.forEach(image => {
        try {
          URL.revokeObjectURL(image.url);
        } catch (error) {
          console.warn('[ComparisonStore] Error revoking URL:', error);
        }
      });
      
      return {
        ...initialState,
        maxImages: state.maxImages 
      };
    });
  },
  
  updateZoom(zoom: number): void {
    const clampedZoom = Math.max(0.05, Math.min(32, zoom));
    comparisonStore.update(state => ({
      ...state,
      syncedZoom: clampedZoom
    }));
  },
  
  updatePan(pan: PanPosition): void {
    comparisonStore.update(state => ({
      ...state,
      syncedPan: { ...pan }
    }));
  },
  
  updateViewport(zoom: number, pan: PanPosition): void {
    const clampedZoom = Math.max(0.05, Math.min(32, zoom));
    comparisonStore.update(state => ({
      ...state,
      syncedZoom: clampedZoom,
      syncedPan: { ...pan }
    }));
  },
  
  setActiveImage(imageId: string | null): void {
    comparisonStore.update(state => ({
      ...state,
      activeImageId: imageId
    }));
  },
  
  reorderImages(fromIndex: number, toIndex: number): void {
    comparisonStore.update(state => {
      if (fromIndex === toIndex || 
          fromIndex < 0 || fromIndex >= state.images.length ||
          toIndex < 0 || toIndex >= state.images.length) {
        return state;
      }
      
      const newImages = [...state.images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      
      return {
        ...state,
        images: newImages
      };
    });
  },
  
  setGridLayout(layout: GridLayout): void {
    comparisonStore.update(state => ({
      ...state,
      gridLayout: layout
    }));
  },
  
  openModal(): void {
    comparisonStore.update(state => ({
      ...state,
      isModalOpen: true
    }));
  },
  
  closeModal(): void {
    comparisonStore.update(state => ({
      ...state,
      isModalOpen: false,
      
      syncedZoom: 1,
      syncedPan: { x: 0, y: 0 }
    }));
  },
  
  resetViewport(): void {
    comparisonStore.update(state => ({
      ...state,
      syncedZoom: 1,
      syncedPan: { x: 0, y: 0 }
    }));
  },
  
  hasImageWithSettings(settings: EditorSettings): boolean {
    let result = false;
    comparisonStore.subscribe(state => {
      result = state.images.some(img => {
        const s = img.metadata.settings;
        return s.pixelSize === settings.pixelSize &&
               s.method === settings.method &&
               s.ditherMethod === settings.ditherMethod &&
               s.ditherLevels === settings.ditherLevels &&
               s.paletteMode === settings.paletteMode &&
               s.outlineThickness === settings.outlineThickness &&
               s.erodeAmount === settings.erodeAmount;
      });
    })();
    return result;
  }
};

export const comparisonUtils = {

  getImageById(images: ComparisonImage[], id: string): ComparisonImage | null {
    return images.find(img => img.id === id) || null;
  },
  
  getImageIndex(images: ComparisonImage[], id: string): number {
    return images.findIndex(img => img.id === id);
  },
  
  formatMetadata(metadata: ComparisonImage['metadata']): string {
    const parts = [
      `${metadata.method}`,
      `${metadata.ditherMethod}${metadata.ditherLevels ? ` • ${metadata.ditherLevels}` : ''}`,
      `${metadata.paletteMode}`,
      `${metadata.settings.pixelSize}px`
    ];
    
    if (metadata.settings.outlineThickness > 0) {
      parts.push(`outline: ${metadata.settings.outlineThickness}`);
    }
    
    if (metadata.settings.erodeAmount > 0) {
      parts.push(`erode: ${metadata.settings.erodeAmount}`);
    }
    
    return parts.join(' • ');
  },
  
  areImagesCompatible(_img1: ComparisonImage, _img2: ComparisonImage): boolean {
    
    
    
    return true;
  }
};


export default comparisonStore;
