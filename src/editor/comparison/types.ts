
export interface EditorSettings {
  pixelSize: number;
  method: string;
  ditherMethod: string;
  ditherLevels: number;
  paletteMode: string;
  outlineThickness: number;
  erodeAmount: number;
  simplifyArea?: number;
  blurMode?: string;
  blurRadius?: number;
  sharpenAmount?: number;
  sharpenRadius?: number;
  sharpenThreshold?: number;
  modeRadius?: number;
  posterizeLevels?: number;
  posterizeAfterPalette?: boolean;
  gamma?: number;
  quantMethod?: string;
  kwEnabled?: boolean;
  kwRadius?: number;
  kwSectors?: number;
  kwStrengthPct?: number;
  kwAnisotropyPct?: number;
  kwBlend?: boolean;
  kwAfterPalette?: boolean;
  edgeEnabled?: boolean;
  edgeThreshold?: number;
  edgeThickness?: number;
  edgeThin?: boolean;
  edgeMethod?: string;
  adaptDitherEnabled?: boolean;
  adaptDitherMethod?: string;
  adaptDitherThreshold?: number;
  adaptDitherThickness?: number;
  adaptDitherThin?: boolean;
  adaptDitherInvert?: boolean;
  adaptDitherFeather?: number;
  customIndices?: number[];
  customDitherPattern?: any;
  customDitherStrength?: number;
  
  colorCorrectionEnabled?: boolean;
  brightness?: number;   
  contrast?: number;     
  saturation?: number;   
  hue?: number;          
}

export interface ComparisonImage {
  
  id: string;
  
  
  blob: Blob;
  
  
  url: string;
  
  
  metadata: {
    
    method: string;
    
    ditherMethod: string;
    
    ditherLevels: number;
    
    paletteMode: string;
    
    timestamp: number;
    
    settings: EditorSettings;
    
    dimensions?: {
      width: number;
      height: number;
    };
    
    stats?: {
      colors: number;
      opaque: number;
    };
  };
  
  
  preview?: string;
}

export interface PanPosition {
  x: number;
  y: number;
}

export type GridLayout = 'auto' | '1x1' | '2x1' | '3x1' | '2x2' | '3x2' | '3x3' | '4x3';

export interface ComparisonState {
  
  images: ComparisonImage[];
  
  
  maxImages: number;
  
  
  syncedZoom: number;
  
  
  syncedPan: PanPosition;
  
  
  activeImageId: string | null;
  
  
  gridLayout: GridLayout;
  
  
  isModalOpen: boolean;
}

export interface ComparisonEvents {
  
  imageAdded: ComparisonImage;
  
  
  imageRemoved: string;
  
  
  cleared: void;
  
  
  zoomChanged: number;
  
  
  panChanged: PanPosition;
  
  
  imageSelected: string;
  
  
  modalOpened: void;
  
  
  modalClosed: void;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality?: number;
}

export interface ThumbnailResult {
  dataUrl: string;
  blob: Blob;
}

export interface ViewportSyncOptions {
  
  minZoom?: number;
  
  
  maxZoom?: number;
  
  
  animate?: boolean;
  
  
  animationDuration?: number;
}

export interface PerformanceStats {
  
  loadTime: number;
  
  
  thumbnailTime: number;
  
  
  fileSize: number;
  
  
  syncOperations: number;
}
