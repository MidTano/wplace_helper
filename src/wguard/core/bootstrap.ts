import type { WGuardInitOptions, WGuardInitResult, WGuardContext } from './types';
import { applyDomGuards, resetDomGuards } from '../hooks/dom';
import { applyNetworkGuards, resetNetworkGuards } from '../hooks/network.js';
import { applyStorageGuards, resetStorageGuards } from '../stealth/store';
import { generateUserConfig } from './pattern-generator';
import { printConsoleBanner } from './console-banner';
import { setChannel } from './channel';
import { setEventAction } from './events';
import { setStorageSalt } from '../stealth/store';

const DEFAULT_CHANNEL = 'WGuard';

let initialized = false;
let lastResult: WGuardInitResult | null = null;
let userConfig: any = null;

async function getUserConfig() {
  if (userConfig) return userConfig;
  
  try {
    const cached = sessionStorage.getItem('wguard:user-config');
    if (cached) {
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      
      if (age < 60 * 60 * 1000) {
        userConfig = data.config;
        return userConfig;
      }
    }
  } catch {}
  
  userConfig = await generateUserConfig();
  
  try {
    sessionStorage.setItem('wguard:user-config', JSON.stringify({
      config: userConfig,
      timestamp: Date.now()
    }));
  } catch {}
  
  return userConfig;
}

export async function bootstrapWGuard(options: WGuardInitOptions = {}): Promise<WGuardInitResult> {
  if (initialized && lastResult) {
    return lastResult;
  }
  
  const config = await getUserConfig();
  
  const mergedHooks = {
    dom: options.hooks?.dom ?? applyDomGuards,
    network: options.hooks?.network ?? applyNetworkGuards,
    storage: options.hooks?.storage ?? applyStorageGuards,
  };

  const channel = config?.obfuscation?.channelSource ?? options.channel ?? DEFAULT_CHANNEL;
  try { setChannel(String(channel)); } catch {}
  try { if (config?.obfuscation?.eventAction) setEventAction(String(config.obfuscation.eventAction)); } catch {}
  try { if (config?.obfuscation?.storageSalt) setStorageSalt(String(config.obfuscation.storageSalt)); } catch {}

  const context: WGuardContext = {
    channel,
    hooks: mergedHooks,
    config: config
  };

  try { mergedHooks.dom(context); } catch {}
  try { mergedHooks.network(context); } catch {}
  try { mergedHooks.storage(context); } catch {}

  initialized = true;
  
  try {
    printConsoleBanner({
      version: config.version || 'unknown',
      fingerprint: config.fingerprint || 'unknown',
      entropy: config.entropy || 'unknown',
      patterns: config.patterns || { attributes: [], selectors: [], functions: [] },
      obfuscation: config.obfuscation || { channelSource: 'unknown', dataAttribute: 'unknown' },
      timing: config.timing || { jitterRange: 0 },
      timestamp: config.timestamp || Date.now()
    });
  } catch {}
  
  lastResult = {
    context,
    dispose() {
      initialized = false;
      try { resetDomGuards(); } catch {}
      try { resetNetworkGuards(); } catch {}
      try { resetStorageGuards(); } catch {}
      lastResult = null;
    },
  };

  return lastResult;
}
