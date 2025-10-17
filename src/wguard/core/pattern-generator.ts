import { generateEnvironmentFingerprint } from './fingerprint';
import { getExternalEntropy } from './entropy';

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const combined = seed + index;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(Math.sin(hash)) % 1;
}

function generateRandomPrefix(seed: string, index: number): string {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';
  
  let result = '';
  const length = 3 + Math.floor(seededRandom(seed, index * 7) * 3);
  
  for (let i = 0; i < length; i++) {
    const useConsonant = i % 2 === 0;
    const chars = useConsonant ? consonants : vowels;
    const charIndex = Math.floor(seededRandom(seed, index * 13 + i * 17) * chars.length);
    result += chars[charIndex];
  }
  
  return result;
}

function generatePattern(seed: string, index: number): string {
  const prefix = generateRandomPrefix(seed, index);
  
  const suffixRand = seededRandom(seed, index + 1000);
  const suffix = Math.floor(suffixRand * 65536).toString(16).padStart(4, '0');
  
  return `/${prefix}_${suffix}/i`;
}

function generateDataAttribute(seed: string): string {
  const prefix = generateRandomPrefix(seed, 9999);
  const rand = seededRandom(seed, 9998);
  const suffix = Math.floor(rand * 10000).toString(36);
  return `data-${prefix}${suffix}`;
}

function generateChannelName(seed: string): string {
  const prefix = generateRandomPrefix(seed, 8888);
  const rand = seededRandom(seed, 8887);
  const suffix = Math.floor(rand * 100000).toString(36);
  return `${prefix}-${suffix}`;
}

function generateEventAction(seed: string): string {
  const prefix = generateRandomPrefix(seed, 7776);
  const rand = seededRandom(seed, 7775);
  const suffix = Math.floor(rand * 1e6).toString(36);
  return `${prefix}:${suffix}`;
}

function generateStorageSalt(seed: string): string {
  const rand = seededRandom(seed, 6666);
  const suffix = Math.floor(rand * 1e9).toString(36);
  return suffix.slice(0, 8);
}

export async function generateUserConfig(): Promise<any> {
  const fingerprint = await generateEnvironmentFingerprint();
  const entropy = await getExternalEntropy();
  
  const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
  const combinedSeed = await sha256(`${fingerprint}:${entropy}:${hoursSinceEpoch}`);
  
  return {
    version: combinedSeed.slice(0, 16),
    timestamp: Date.now(),
    fingerprint: fingerprint.slice(0, 16),
    entropy: entropy.slice(0, 16),
    patterns: {
      attributes: [
        generatePattern(combinedSeed, 0),
        generatePattern(combinedSeed, 1),
        generatePattern(combinedSeed, 2)
      ],
      selectors: [
        generatePattern(combinedSeed, 3),
        generatePattern(combinedSeed, 4)
      ],
      functions: [
        generatePattern(combinedSeed, 5),
        generatePattern(combinedSeed, 6)
      ]
    },
    obfuscation: {
      dataAttribute: generateDataAttribute(combinedSeed),
      channelSource: generateChannelName(combinedSeed),
      eventAction: generateEventAction(combinedSeed),
      storageSalt: generateStorageSalt(combinedSeed)
    },
    timing: {
      jitterRange: Math.floor(seededRandom(combinedSeed, 7777) * 15) + 5
    }
  };
}
