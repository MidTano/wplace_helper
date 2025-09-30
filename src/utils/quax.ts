export async function uploadToQuax(blob: Blob, filename = 'image.png'): Promise<string> {
  const url = 'https://qu.ax/upload.php';
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
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          data: fd as any,
          onload: (r: any) => {
            try {
              const txt = String(r?.responseText || '').trim();
              const json = JSON.parse(txt);
              if (json?.success && json?.files?.[0]?.url) {
                return resolve(json.files[0].url);
              }
              reject(new Error('qu.ax upload failed: ' + txt));
            } catch { reject(new Error('qu.ax parse failed')); }
          },
          onerror: () => reject(new Error('qu.ax GM request failed')),
        } as any);
      } catch { reject(new Error('qu.ax request setup failed')); }
    });
  }

  const res = await fetch(url, { method: 'POST', body: fd });
  const txt = (await res.text()).trim();
  if (!res.ok) {
    throw new Error('qu.ax upload failed (CORS?): ' + txt);
  }
  const json = JSON.parse(txt);
  if (json?.success && json?.files?.[0]?.url) {
    return json.files[0].url;
  }
  throw new Error('qu.ax upload failed: no URL in response');
}
