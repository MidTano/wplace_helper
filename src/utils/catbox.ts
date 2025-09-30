export async function uploadToCatbox(blob: Blob, filename = 'image.png'): Promise<string> {
  const url = 'https://catbox.moe/user/api.php';
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  
  fd.append('fileToUpload', blob, filename);

  
  const gm = (typeof (window as any).GM_xmlhttpRequest === 'function')
    ? (window as any).GM_xmlhttpRequest
    : ((window as any).GM && typeof (window as any).GM.xmlHttpRequest === 'function')
      ? (window as any).GM.xmlHttpRequest
      : null;
  if (gm) {
    return await new Promise<string>((resolve, reject) => {
      try {
        gm({
          method: 'POST',
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          data: fd as any, 
          onload: (r: any) => {
            try {
              const txt = String(r?.responseText || '').trim();
              if (/^https?:\/\//i.test(txt)) return resolve(txt);
              reject(new Error('Catbox upload failed: ' + txt));
            } catch (e) { reject(e); }
          },
          onerror: (e: any) => reject(new Error('Catbox GM request failed')),
        } as any);
      } catch (e) { reject(e); }
    });
  }

  
  const res = await fetch(url, { method: 'POST', body: fd });
  const txt = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(txt)) {
    throw new Error('Catbox upload failed (CORS?): ' + txt);
  }
  return txt;
}

export function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const p = u.pathname.split('/').filter(Boolean);
    return p[p.length - 1] || '';
  } catch {
    const i = url.lastIndexOf('/')
    return i >= 0 ? url.slice(i + 1) : url;
  }
}
