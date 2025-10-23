export type GalleryEntry = {
  id: string;
  title?: string;
  author?: string;
  authorId?: string;
  previewUrl?: string;
  share: any;
  createdAt?: number;
};

export type NewGalleryEntry = {
  authorId: string;
  share: any;
  createdAt?: number;
  deleteToken?: string;
};

function resolveBaseUrl(): string {
  return 'https://whelper-db047-default-rtdb.europe-west1.firebasedatabase.app';
}

const TOKEN_REGEX = /^wph-([0-9]{15,22})-[a-f0-9]{24,64}$/;
const URL_REGEX = /^https?:\/\//i;
const ALLOWED_IMG_HOSTS = new Set<string>(['files.catbox.moe', 'a.uguu.se', 'uguu.se', 'qu.ax', 'i.qu.ax']);

function generatePushId(): string {
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let now = Date.now();
  const timeStampChars = new Array(8);
  for (let i = 7; i >= 0; i--) { timeStampChars[i] = PUSH_CHARS.charAt(now % 64); now = Math.floor(now / 64); }
  let id = timeStampChars.join('');
  const randomChars = new Array(12);
  for (let i = 0; i < 12; i++) randomChars[i] = PUSH_CHARS.charAt(Math.floor(Math.random() * 64));
  id += randomChars.join('');
  return id;
}

export function parseAuthorIdFromToken(token: string): string {
  if (typeof token !== 'string') return '';
  const match = TOKEN_REGEX.exec(token.trim());
  return match ? match[1] : '';
}

function ensureValidUrls(urls: any): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  for (const u of urls) {
    if (typeof u === 'string' && URL_REGEX.test(u)) {
      try {
        const parsed = new URL(u);
        if (parsed.protocol === 'https:' && ALLOWED_IMG_HOSTS.has(parsed.hostname)) out.push(u);
      } catch {}
    }
  }
  return out.slice(0, 3);
}

function validateSharePayload(share: any): void {
  if (!share || typeof share !== 'object') throw new Error('Invalid share payload.');
  if (share.type !== 'wplace_share_v1') throw new Error('Unsupported share type.');
  if (typeof share.ts !== 'number') throw new Error('Invalid share timestamp.');
  if (share.img) {
    const img = share.img;
    if (typeof img !== 'object') throw new Error('Invalid image payload.');
    const urls = ensureValidUrls(img.urls);
    if (!urls.length) throw new Error('Image URLs missing or invalid.');
    img.urls = urls;
    if (img.size && typeof img.size !== 'number') throw new Error('Invalid image size.');
    if (img.sha256 && typeof img.sha256 !== 'string') throw new Error('Invalid image hash.');
  }
  if (share.camera) {
    const cam = share.camera;
    if (typeof cam.lng !== 'number' || typeof cam.lat !== 'number') throw new Error('Invalid camera coordinates.');
    if (cam.zoom && typeof cam.zoom !== 'number') throw new Error('Invalid camera zoom.');
  }
  if (share.origin) {
    if (!Array.isArray(share.origin) || share.origin.length < 4) throw new Error('Invalid origin.');
    share.origin = share.origin.slice(0, 4).map((n: any) => Number(n) | 0);
  }
  if (share.title && (typeof share.title !== 'string' || share.title.length > 30)) throw new Error('Invalid title.');
}

async function acquireLock(authorId: string, postId: string, ts: number, token: string, base: string): Promise<void> {
  const url = `${base}/locks/${encodeURIComponent(authorId)}/${encodeURIComponent(token)}.json`;
  const body = JSON.stringify({ ts, postId });
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function releaseLock(authorId: string, token: string, base: string): Promise<void> {
  try { await fetch(`${base}/locks/${encodeURIComponent(authorId)}/${encodeURIComponent(token)}.json`, { method: 'DELETE' }); } catch {}
}

export async function softDeleteGalleryEntry(id: string, token: string, authorId: string): Promise<boolean> {
  const base = resolveBaseUrl();
  if (!base) throw new Error('No DB URL');
  if (!TOKEN_REGEX.test(String(token))) throw new Error('Invalid token');
  const parsed = parseAuthorIdFromToken(String(token));
  if (!parsed || String(parsed) !== String(authorId || '')) throw new Error('Author mismatch');
  const reqUrl = `${base}/deleteRequests/${encodeURIComponent(id)}.json`;
  const reqBody = JSON.stringify({ authorId: String(authorId || ''), token: String(token || ''), ts: Date.now() });
  const reqRes = await fetch(reqUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: reqBody });
  if (!reqRes.ok) throw new Error(`HTTP ${reqRes.status}`);
  const url = `${base}/gallery/${encodeURIComponent(id)}.json`;
  const body = JSON.stringify({ deletedAt: Date.now() });
  const res = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

export type ProfilesMap = Record<string, { name?: string }>;

export async function fetchProfiles(): Promise<ProfilesMap> {
  const base = resolveBaseUrl();
  if (!base) return {};
  const url = `${base}/profiles.json?ts=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return {};
  const data = await res.json();
  const out: ProfilesMap = {};
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries<any>(data)) {
      if (!v || typeof v !== 'object') continue;
      out[k] = { name: typeof v.name === 'string' ? v.name : undefined };
    }
  }
  return out;
}

export async function publishGalleryEntry(data: NewGalleryEntry): Promise<string> {
  const base = resolveBaseUrl();
  if (!base) throw new Error('No DB URL');
  if (!data.deleteToken || !TOKEN_REGEX.test(String(data.deleteToken))) throw new Error('Invalid token');
  const parsedAuthorId = parseAuthorIdFromToken(String(data.deleteToken));
  if (!parsedAuthorId || String(parsedAuthorId) !== String(data.authorId || '')) throw new Error('Author mismatch');
  validateSharePayload(data.share);
  const id = generatePushId();
  const createdAt = Date.now();
  await acquireLock(data.authorId, id, createdAt, String(data.deleteToken), base);
  try {
    const inboundUrl = `${base}/inbound/create/${encodeURIComponent(id)}.json`;
    const inboundBody = JSON.stringify({ authorId: data.authorId, token: data.deleteToken, ts: createdAt });
    const inboundRes = await fetch(inboundUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: inboundBody });
    if (!inboundRes.ok) throw new Error(`HTTP ${inboundRes.status}`);
    const createUrl = `${base}/gallery/${encodeURIComponent(id)}.json`;
    const createBody = JSON.stringify({ authorId: data.authorId, share: data.share, createdAt });
    const createRes = await fetch(createUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: createBody });
    if (!createRes.ok) throw new Error(`HTTP ${createRes.status}`);
    const lpaUrl = `${base}/lastPublishAt/${encodeURIComponent(data.authorId)}.json`;
    const lpaBody = JSON.stringify({ ts: createdAt, postId: id });
    const lpaRes = await fetch(lpaUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: lpaBody });
    if (!lpaRes.ok) throw new Error(`HTTP ${lpaRes.status}`);
    return id;
  } finally {
    await releaseLock(data.authorId, String(data.deleteToken), base);
  }
}

export function hasGalleryConfig(): boolean {
  return !!resolveBaseUrl();
}

export async function fetchGalleryEntries(): Promise<GalleryEntry[]> {
  const base = resolveBaseUrl();
  if (!base) return [];
  const url = `${base}/gallery.json?ts=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== 'object') return [];
  const entries: GalleryEntry[] = [];
  for (const [key, value] of Object.entries<any>(data)) {
    if (!value || typeof value !== 'object') continue;
    if (typeof (value as any).deletedAt === 'number') continue;
    const share = (typeof value.share === 'string' || typeof value.share === 'object') ? value.share : null;
    if (!share) continue;
    entries.push({
      id: key,
      authorId: typeof value.authorId === 'string' ? value.authorId : undefined,
      share,
      createdAt: typeof value.createdAt === 'number' ? value.createdAt : undefined
    });
  }
  entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return entries;
}

