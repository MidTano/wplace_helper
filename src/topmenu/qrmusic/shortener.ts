export type Provider = 'clck'

function gmRequest(url: string): Promise<string|null> {
  const gm = (typeof (window as any).GM_xmlhttpRequest === 'function')
    ? (window as any).GM_xmlhttpRequest
    : ((window as any).GM && typeof (window as any).GM.xmlHttpRequest === 'function')
      ? (window as any).GM.xmlHttpRequest
      : null
  if (!gm) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      gm({
        method: 'GET',
        url,
        headers: { 'Accept': 'text/plain' },
        onload: (r: any) => {
          try { const txt = String(r?.responseText || '').trim(); resolve(txt || null) } catch { resolve(null) }
        },
        onerror: () => resolve(null),
      } as any)
    } catch { resolve(null) }
  })
}

async function createShort(url: string): Promise<string|null> {
  const target = `https://clck.ru/--?url=${encodeURIComponent(url)}`
  const gmTxt = await gmRequest(target)
  if (gmTxt) {
    const t = gmTxt.trim()
    if (/^https?:\/\//i.test(t)) return t
  }
  try {
    const res = await fetch(target, { method: 'GET' })
    if (!res.ok) return null
    const txt = (await res.text()).trim()
    if (!/^https?:\/\//i.test(txt)) return null
    return txt
  } catch {
    return null
  }
}

export async function shorten(url: string): Promise<{ provider: Provider; slug: string; shortUrl: string } | null> {
  const u = String(url || '').trim()
  if (!u) return null
  const link = await createShort(u)
  if (!link) return null
  const slug = link.replace(/^https?:\/\/[^/]+\//, '')
  try { localStorage.setItem(`wph:qrm:clck:${slug}`, u) } catch {}
  return { provider: 'clck', slug, shortUrl: link }
}
