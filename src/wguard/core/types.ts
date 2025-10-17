export interface WGuardHooks {
  dom?: (context: WGuardContext) => void;
  network?: (context: WGuardContext) => void;
  storage?: (context: WGuardContext) => void;
}

export interface WGuardContext {
  channel: string;
  hooks: WGuardHooks;
  config?: any;
}

export interface WGuardInitOptions {
  channel?: string;
  hooks?: WGuardHooks;
}

export interface WGuardInitResult {
  context: WGuardContext;
  dispose: () => void;
}
