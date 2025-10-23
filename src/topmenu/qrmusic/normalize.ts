export type Service = 'youtube' | 'tiktok' | 'soundcloud' | 'spotify' | 'unknown'

function normHost(h: string) {
  return h.replace(/^www\./i, '').toLowerCase()
}

export function detectService(input: string): Service {
  try {
    const u = new URL(input)
    const h = normHost(u.host)
    if (h.endsWith('youtube.com') || h === 'youtu.be' || h.endsWith('music.youtube.com')) return 'youtube'
    if (h.endsWith('tiktok.com') || h === 'vm.tiktok.com' || h === 'vt.tiktok.com') return 'tiktok'
    if (h.endsWith('open.spotify.com') || h === 'spotify.link') return 'spotify'
    if (h.endsWith('soundcloud.com')) return 'soundcloud'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function normalizeUrl(input: string, service: Service): string {
  try {
    const u = new URL(input)
    u.hash = ''
    const h = normHost(u.host)
    const params = u.searchParams
    const clean = (k: string) => params.delete(k)
    for (const k of Array.from(params.keys())) if (/^utm_|^si$|^feature$/.test(k)) params.delete(k)

    if (service === 'youtube') {
      if (h === 'youtu.be') {
        const id = u.pathname.replace(/^\//, '').split(/[/?#]/)[0]
        if (id) return `https://youtu.be/${id}`
      }
      if (h.endsWith('youtube.com') || h.endsWith('music.youtube.com')) {
        const p = u.pathname
        if (/^\/shorts\//.test(p)) {
          const id = p.split('/')[2] || ''
          if (id) return `https://youtu.be/${id}`
        }
        const id = params.get('v') || ''
        if (id) return `https://youtu.be/${id}`
      }
    }

    if (service === 'tiktok') {
      const p = u.pathname
      const m = p.match(/\/video\/(\d+)/)
      if (m) return `https://www.tiktok.com/@_/video/${m[1]}`
      const id = p.replace(/^\//, '')
      if (/^(@|t\/|Z|[A-Za-z0-9]+)/.test(id)) return `https://www.tiktok.com/${p}`
    }

    if (service === 'spotify') {
      if (h === 'spotify.link') return input
      const parts = u.pathname.split('/').filter(Boolean)
      const type = parts[0]
      const id = parts[1]
      if (type && id) return `https://open.spotify.com/${type}/${id}`
    }

    if (service === 'soundcloud') {
      return `https://soundcloud.com${u.pathname}`
    }

    return u.toString()
  } catch {
    return input
  }
}
