
import type { WorkerState, WorkerCallbacks, WorkerMessage } from './workerTypes';
import { createWorkerState } from './workerTypes';
import { generateWorkerCode } from './workerCode';

export function createImageWorkers(callbacks: WorkerCallbacks = {}): WorkerState {
  const state = createWorkerState();
  
  try {
    if (state.imageWorker) return state;
    
    
    const cores = navigator.hardwareConcurrency || 4;
    state.poolSize = Math.min(Math.max(2, Math.floor(cores * 0.7)), 6);
    
    
    const workerSource = generateWorkerSource();
    const blob = new Blob([workerSource], { type: 'text/javascript' });
    state.imageWorkerUrl = URL.createObjectURL(blob);
    
    
    state.imageWorker = new Worker(state.imageWorkerUrl);
    setupMainWorker(state, callbacks);
    
    
    setupWorkerPool(state, callbacks);
    
    return state;
  } catch (error) {
    callbacks.onError?.('Failed to create image workers: ' + error);
    return state;
  }
}
 
export function destroyImageWorkers(state: WorkerState): void {
  try {
    
    if (state.imageWorker) {
      state.imageWorker.terminate();
      state.imageWorker = null;
    }
    
    
    for (const worker of state.imageWorkerPool) {
      try {
        worker.terminate();
      } catch {}
    }
    state.imageWorkerPool = [];
    
    
    if (state.imageWorkerUrl) {
      try {
        URL.revokeObjectURL(state.imageWorkerUrl);
      } catch {}
      state.imageWorkerUrl = '';
    }
    
    
    state.workerReady = false;
    state.poolReadyCount = 0;
    state.activeJobs.clear();
    state.pendingStats.clear();
  } catch (error) {
    console.warn('Error destroying workers:', error);
  }
}

export function cancelAllJobs(state: WorkerState): void {
  if (!state.workerReady || !state.imageWorker) {
    return;
  }
  
  try {
    for (const jobId of state.activeJobs) {
      
      try {
        state.imageWorker.postMessage({ type: 'cancel', jobId });
      } catch {}
      
      
      for (let i = 0; i < state.imageWorkerPool.length; i++) {
        try {
          state.imageWorkerPool[i].postMessage({ type: 'cancel', jobId });
        } catch {}
      }
    }
    
    state.activeJobs.clear();
  } catch (error) {
    console.warn('Error canceling jobs:', error);
  }
}

export function sendPreviewJob(state: WorkerState, params: {
  blob: Blob;
  pixelSize: number;
  method: string;
  ditherMethod: string;
  ditherLevels: number;
  paletteMode: string;
  outlineThickness: number;
  erodeAmount: number;
  customIndices: number[];
  palette: number[][];
  key: string;
  colorCorrectionEnabled?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
}): number {
  if (!state.workerReady || !state.imageWorker || state.workerLimited) {
    throw new Error('Worker not ready or limited');
  }
  
  
  cancelAllJobs(state);
  
  const jobId = ++state.jobSeq;
  state.lastPreviewJob = jobId;
  state.lastPreviewFinalApplied = false;
  state.activeJobs.add(jobId);
  try {
    state.imageWorker.postMessage({
      type: 'preview',
      jobId,
      key: params.key,
      blob: params.blob,
      pixelSize: params.pixelSize,
      method: params.method,
      ditherMethod: params.ditherMethod,
      ditherLevels: params.ditherLevels,
      paletteMode: params.paletteMode,
      outlineThickness: params.outlineThickness || 0,
      erodeAmount: params.erodeAmount || 0,
      customIndices: params.customIndices || [],
      palette: params.palette || [],
      colorCorrectionEnabled: !!params.colorCorrectionEnabled,
      brightness: ((params.brightness ?? 0)|0),
      contrast: ((params.contrast ?? 0)|0),
      saturation: ((params.saturation ?? 0)|0),
      hue: ((params.hue ?? 0)|0)
    });
  } catch (error) {
    state.activeJobs.delete(jobId);
    throw error;
  }
  
  return jobId;
}

export function sendStatsJob(state: WorkerState, blob: Blob, key: string): number {
  if (!state.workerReady || !state.imageWorker || state.workerLimited) {
    throw new Error('Worker not ready or limited');
  }
  
  const jobId = ++state.jobSeq;
  state.lastStatsJob = jobId;
  state.pendingStats.set(jobId, key);
  
  try {
    state.imageWorker.postMessage({
      type: 'stats',
      jobId,
      key,
      blob
    });
  } catch (error) {
    state.pendingStats.delete(jobId);
    throw error;
  }
  
  return jobId;
}



function setupMainWorker(state: WorkerState, callbacks: WorkerCallbacks): void {
  if (!state.imageWorker) return;
  
  state.imageWorker.onmessage = (ev) => {
    const data = ev?.data;
    if (!data?.type) return;
    
    handleWorkerMessage(state, data, callbacks);
  };
  
  
  state.imageWorker.postMessage({
    type: 'init',
    workerPool: {
      available: false,
      size: state.poolSize,
      readyCount: 0
    }
  });
}

function setupWorkerPool(state: WorkerState, callbacks: WorkerCallbacks): void {
  state.imageWorkerPool = [];
  state.poolReadyCount = 0;
  
  for (let i = 0; i < state.poolSize; i++) {
    const worker = new Worker(state.imageWorkerUrl);
    (worker as any).workerId = i;
    state.imageWorkerPool.push(worker);
    
    worker.onmessage = (ev) => {
      const data = ev?.data;
      if (!data?.type) return;
      
      if (data.type === 'ready') {
        state.poolReadyCount++;
        
        
        if (state.poolReadyCount === state.poolSize && state.imageWorker && state.workerReady) {
          try {
            state.imageWorker.postMessage({
              type: 'pool-update',
              workerPool: {
                available: true,
                size: state.poolSize,
                readyCount: state.poolReadyCount
              }
            });
          } catch {}
        }
      } else if (data.type === 'stripe-result') {
        
        if (state.imageWorker && state.workerReady) {
          try {
            state.imageWorker.postMessage({
              type: 'stripe-result',
              jobId: data.jobId,
              workerId: data.workerId,
              stripeInfo: data.stripeInfo,
              resultBitmap: data.resultBitmap
            }, data.resultBitmap ? [data.resultBitmap] : []);
          } catch {}
        }
      }
    };
    
    worker.postMessage({ type: 'init' });
  }
}

function handleWorkerMessage(state: WorkerState, data: WorkerMessage, callbacks: WorkerCallbacks): void {
  switch (data.type) {
    case 'ready':
      state.workerReady = true;
      callbacks.onDebug?.('imageWorker: ready');
      break;

    case 'error':
      callbacks.onError?.('imageWorker error: ' + data.error);
      break;

    case 'preview-error':
      callbacks.onError?.('imageWorker preview error: ' + (data.error || 'unknown'));
      break;
      
    case 'worker-limited':
      state.workerLimited = true;
      state.workerCapabilities = data.capabilities || {};
      callbacks.onError?. ('imageWorker has limited capabilities');
      break;
      
    case 'debug':
      callbacks.onDebug?. (data.message, data.extra);
      break;
      
    case 'preview-quick':
    case 'preview-quick-bmp':
      callbacks.onPreviewQuick?. (data);
      break;
      
    case 'preview-final':
    case 'preview-final-bytes':  
    case 'preview-final-bmp':
      callbacks.onPreviewFinal?. (data);
      break;
      
    case 'stats':
      callbacks.onStats?. (data);
      break;

    case 'stats-done':
      callbacks.onStats?. (data);
      break;
      
    case 'progress':
      callbacks.onProgress?. (data);
      break;
      
    case 'preview-done':
      state.activeJobs.delete(data.jobId || 0);
      callbacks.onPreviewDone?.(data);
      break;
    case 'magic-region': {
      const jid = data.jobId || 0;
      const pending = state.pendingMagic.get(jid);
      state.pendingMagic.delete(jid);
      state.activeJobs.delete(jid);
      if (!pending) break;
      if (data && data.regionBuffer && !data.error) {
        try {
          const region = new Uint8Array(data.regionBuffer);
          pending.resolve(region);
        } catch (e) { pending.reject(e); }
      } else {
        pending.reject(data?.error || 'unknown');
      }
      break;
    }
      
    case 'dispatch-stripes-to-pool':
      handlePoolDispatch(state, data);
      break;
  }
}

function handlePoolDispatch(state: WorkerState, data: any): void {
  if (!data.stripes || !Array.isArray(data.stripes)) return;
  
  for (let i = 0; i < data.stripes.length; i++) {
    const stripe = data.stripes[i];
    const workerId = stripe.workerId;
    
    if (workerId < state.imageWorkerPool.length) {
      try {
        state.imageWorkerPool[workerId].postMessage({
          type: 'pool-command',
          command: data.command,
          jobId: data.jobId,
          workerId: workerId,
          stripeBitmap: stripe.stripeBitmap,
          stripeInfo: stripe,
          processingParams: data.processingParams
        }, stripe.stripeBitmap ? [stripe.stripeBitmap] : []);
      } catch (error) {
        console.warn(`Failed to dispatch to worker ${workerId}:`, error);
      }
    }
  }
}


function generateWorkerSource(): string {
  return generateWorkerCode();
}

export function sendMagicSelectionJob(state: WorkerState, params: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  seedX: number;
  seedY: number;
  tolerance: number;
  mode: 'local' | 'global';
}): Promise<Uint8Array> {
  if (!state.workerReady || !state.imageWorker || state.workerLimited) {
    return Promise.reject(new Error('Worker not ready or limited'));
  }
  const jobId = ++state.jobSeq;
  state.activeJobs.add(jobId);
  return new Promise<Uint8Array>((resolve, reject) => {
    state.pendingMagic.set(jobId, { resolve, reject });
    try {
      
      const copy = new Uint8ClampedArray(params.pixels);
      const buf = copy.buffer;
      state.imageWorker!.postMessage({
        type: 'magic-select',
        jobId,
        imgWidth: params.width|0,
        imgHeight: params.height|0,
        seedX: params.seedX|0,
        seedY: params.seedY|0,
        tolerance: params.tolerance|0,
        mode: params.mode || 'local',
        pixels: buf
      }, [buf]);
    } catch (error) {
      state.pendingMagic.delete(jobId);
      state.activeJobs.delete(jobId);
      reject(error);
    }
  });
}

export function sendMagicSelectionJobBitmap(state: WorkerState, params: {
  bitmap: ImageBitmap;
  seedX: number;
  seedY: number;
  tolerance: number;
  mode: 'local' | 'global';
}): Promise<Uint8Array> {
  if (!state.workerReady || !state.imageWorker || state.workerLimited) {
    return Promise.reject(new Error('Worker not ready or limited'));
  }
  const jobId = ++state.jobSeq;
  state.activeJobs.add(jobId);
  return new Promise<Uint8Array>((resolve, reject) => {
    state.pendingMagic.set(jobId, { resolve, reject });
    try {
      const bmp = params.bitmap;
      state.imageWorker!.postMessage({
        type: 'magic-select-bmp',
        jobId,
        seedX: params.seedX|0,
        seedY: params.seedY|0,
        tolerance: params.tolerance|0,
        mode: params.mode || 'local',
        bitmap: bmp
      }, [bmp]);
    } catch (error) {
      state.pendingMagic.delete(jobId);
      state.activeJobs.delete(jobId);
      reject(error);
    }
  });
}
