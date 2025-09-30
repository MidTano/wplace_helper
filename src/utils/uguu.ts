export async function uploadToUguu(blob: Blob, filename = 'image.png'): Promise<string> {
  const url = 'https://uguu.se/upload';
  const fd = new FormData();
  fd.append('files[]', blob, filename);

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
          data: fd as any,
          onload: (r: any) => {
            try {
              const txt = String(r?.responseText || '').trim();
              const json = JSON.parse(txt);
              if (json?.success && json?.files?.[0]?.url) {
                return resolve(json.files[0].url);
              }
              reject(new Error('uguu.se upload failed: ' + txt));
            } catch (e) { reject(new Error('uguu.se parse failed: ' + String(e))); }
          },
          onerror: () => reject(new Error('uguu.se GM request failed')),
        } as any);
      } catch { reject(new Error('uguu.se request setup failed')); }
    });
  }

  const res = await fetch(url, { method: 'POST', body: fd });
  const txt = (await res.text()).trim();
  if (!res.ok) {
    throw new Error('uguu.se upload failed (CORS?): ' + txt);
  }
  const json = JSON.parse(txt);
  if (json?.success && json?.files?.[0]?.url) {
    return json.files[0].url;
  }
  throw new Error('uguu.se upload failed: no URL in response');
}
