interface EntropySource {
  name: string;
  fetch: () => Promise<string>;
  weight: number;
}

const ENTROPY_SOURCES: EntropySource[] = [
  {
    name: 'random.org',
    weight: 10,
    async fetch() {
      const response = await fetch(
        'https://www.random.org/integers/?num=20&min=0&max=999999&col=1&base=10&format=plain&rnd=new',
        { cache: 'no-cache' }
      );
      if (!response.ok) throw new Error('Random.org failed');
      const text = await response.text();
      return text.replace(/\s/g, '');
    }
  },
  {
    name: 'random.org-strings',
    weight: 8,
    async fetch() {
      const response = await fetch(
        'https://www.random.org/strings/?num=10&len=8&digits=on&upperalpha=on&loweralpha=on&format=plain&rnd=new',
        { cache: 'no-cache' }
      );
      if (!response.ok) throw new Error('Random.org strings failed');
      return await response.text();
    }
  },
  {
    name: 'anu-qrng',
    weight: 9,
    async fetch() {
      const response = await fetch(
        'https://qrng.anu.edu.au/API/jsonI.php?length=20&type=uint16',
        { cache: 'no-cache' }
      );
      if (!response.ok) throw new Error('ANU QRNG failed');
      const json = await response.json();
      return json.data.join('');
    }
  }
];

const CACHE_KEY = 'wguard:entropy';
const CACHE_DURATION = 60 * 60 * 1000;

export async function getExternalEntropy(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = getCachedEntropy();
    if (cached) return cached;
  }

  const errors: string[] = [];
  
  for (const source of ENTROPY_SOURCES) {
    try {
      const entropy = await Promise.race([
        source.fetch(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      if (entropy && entropy.length > 10) {
        cacheEntropy(entropy);
        return entropy;
      }
    } catch (err: any) {
      errors.push(`${source.name}: ${err.message}`);
    }
  }
  
  const fallback = generateCryptoFallback();
  cacheEntropy(fallback);
  return fallback;
}

function getCachedEntropy(): string | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    if (age < CACHE_DURATION) {
      return data.entropy;
    }
  } catch {}
  return null;
}

function cacheEntropy(entropy: string): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      entropy,
      timestamp: Date.now()
    }));
  } catch {}
}

function generateCryptoFallback(): string {
  const array = new Uint32Array(20);
  crypto.getRandomValues(array);
  return Array.from(array).join('');
}
