
export interface DisplayMetrics {
  scale: number;
  ox: number;
  oy: number;
  dw: number;
  dh: number;
}

export function getDisplayMetrics(
  outputBox: HTMLElement | null,
  outW: number,
  outH: number,
  zoom: number,
  editMode: boolean
): DisplayMetrics | null {
  const box = outputBox?.getBoundingClientRect();
  if (!box || !outW || !outH) return null;
  
  const baseScale = Math.min(box.width / outW, box.height / outH);
  
  
  const scale = editMode ? (baseScale * zoom) : baseScale;
  const dw = outW * scale;
  const dh = outH * scale;
  const ox = (box.width - dw) / 2;
  const oy = (box.height - dh) / 2;
  
  return { scale, ox, oy, dw, dh };
}

export function screenToPixel(
  clientX: number,
  clientY: number,
  outputBox: HTMLElement | null,
  metrics: DisplayMetrics | null,
  panX: number,
  panY: number,
  editMode: boolean
): { px: number; py: number } {
  if (!metrics || !outputBox) return { px: -1, py: -1 };
  
  const x = clientX - outputBox.getBoundingClientRect().left;
  const y = clientY - outputBox.getBoundingClientRect().top;
  const addX = editMode ? panX : 0;
  const addY = editMode ? panY : 0;
  
  const oxi = Math.round(metrics.ox);
  const oyi = Math.round(metrics.oy);
  const lx = x - oxi - addX;
  const ly = y - oyi - addY;
  
  const px = Math.floor(lx / metrics.scale);
  const py = Math.floor(ly / metrics.scale);
  
  return { px, py };
}

export function calculateZoomPan(
  x: number,
  y: number,
  oldMetrics: DisplayMetrics,
  newMetrics: DisplayMetrics
): { panX: number; panY: number } {
  const worldX = (x - (oldMetrics.ox + 0)) / oldMetrics.scale;
  const worldY = (y - (oldMetrics.oy + 0)) / oldMetrics.scale;
  
  const panX = x - newMetrics.ox - worldX * newMetrics.scale;
  const panY = y - newMetrics.oy - worldY * newMetrics.scale;
  
  return { panX, panY };
}
