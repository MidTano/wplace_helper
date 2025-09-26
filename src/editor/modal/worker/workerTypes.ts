
export interface WorkerState {
  imageWorker: Worker | null;
  imageWorkerUrl: string;
  workerReady: boolean;
  imageWorkerPool: Worker[];
  poolSize: number;
  poolReadyCount: number;
  workerLimited: boolean;
  workerCapabilities: any;
  jobSeq: number;
  lastPreviewJob: number;
  lastStatsJob: number;
  lastPreviewFinalApplied: boolean;
  activeJobs: Set<number>;
  pendingStats: Map<number, string>;
  pendingMagic: Map<number, { resolve: (region: Uint8Array) => void; reject: (err: any) => void }>;
}

export interface WorkerMessage {
  type: string;
  jobId?: number;
  key?: string;
  [key: string]: any;
}

export interface WorkerCallbacks {
  onPreviewQuick?: (data: any) => void;
  onPreviewFinal?: (data: any) => void;
  onStats?: (data: any) => void;
  onProgress?: (data: any) => void;
  onPreviewDone?: (data: any) => void;
  onError?: (error: string) => void;
  onDebug?: (message: string, extra?: any) => void;
}

export function createWorkerState(): WorkerState {
  return {
    imageWorker: null,
    imageWorkerUrl: '',
    workerReady: false,
    imageWorkerPool: [],
    poolSize: 0,
    poolReadyCount: 0,
    workerLimited: false,
    workerCapabilities: null,
    jobSeq: 0,
    lastPreviewJob: 0,
    lastStatsJob: 0,
    lastPreviewFinalApplied: false,
    activeJobs: new Set(),
    pendingStats: new Map(),
    pendingMagic: new Map()
  };
}
