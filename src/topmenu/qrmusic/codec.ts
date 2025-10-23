export type Provider = 'clck'
export type Service = 'youtube' | 'tiktok' | 'soundcloud' | 'spotify' | 'unknown'

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function idx62(c: string): number {
  const i = BASE62.indexOf(c)
  if (i >= 0) return i
  const u = c.toUpperCase()
  const iu = BASE62.indexOf(u)
  return iu >= 0 ? iu : 0
}

function toBitsMSB(value: number, bitCount: number, out: number[]) {
  for (let i = bitCount - 1; i >= 0; i--) out.push((value >> i) & 1)
}

function bitsToBytes(bits: number[]): Uint8Array {
  const n = Math.ceil(bits.length / 8)
  const arr = new Uint8Array(n)
  let b = 0
  for (let i = 0; i < bits.length; i++) {
    b = (b << 1) | (bits[i] & 1)
    if ((i & 7) === 7) {
      arr[(i >> 3)] = b
      b = 0
    }
  }
  const rem = bits.length & 7
  if (rem) arr[(bits.length >> 3)] = b << (8 - rem)
  return arr
}

 

function crc8(data: Uint8Array): number {
  let crc = 0
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let b = 0; b < 8; b++) crc = (crc & 0x80) ? ((crc << 1) ^ 0x31) & 0xFF : (crc << 1) & 0xFF
  }
  return crc & 0xFF
}

function serviceCode(s: Service): number {
  if (s === 'youtube') return 0
  if (s === 'tiktok') return 1
  if (s === 'soundcloud') return 2
  if (s === 'spotify') return 3
  return 7
}

export function encodeV2(input: { provider: Provider; service: Service; slug: string }): { symbols: number[]; bits: number[] } {
  const p = 0
  const sc = serviceCode(input.service)
  const slug = String(input.slug || '').replace(/[^0-9A-Za-z]/g, '')
  const L = Math.max(1, Math.min(15, slug.length))
  const bits: number[] = []
  toBitsMSB(2, 3, bits)
  toBitsMSB(p, 1, bits)
  toBitsMSB(sc, 3, bits)
  toBitsMSB(L, 4, bits)
  for (let i = 0; i < L; i++) toBitsMSB(idx62(slug[i]), 6, bits)
  const bytesForCrc = bitsToBytes(bits)
  const c = crc8(bytesForCrc)
  toBitsMSB(c, 8, bits)
  while (bits.length < 80) bits.push(0)
  const symbols: number[] = []
  for (let i = 0; i < 16; i++) {
    let v = 0
    for (let b = 0; b < 5; b++) v = (v << 1) | bits[i * 5 + b]
    symbols.push(v)
  }
  return { symbols, bits }
}

export function decodeV2(symbols: number[]): { ok: boolean; provider: Provider; service: Service; slug: string } {
  if (!symbols || symbols.length !== 16) return { ok: false, provider: 'clck', service: 'unknown', slug: '' }
  const bits: number[] = []
  for (let i = 0; i < 16; i++) {
    const v = symbols[i] & 31
    for (let b = 4; b >= 0; b--) bits.push((v >> b) & 1)
  }
  const v = (bits[0] << 2) | (bits[1] << 1) | bits[2]
  const s = (bits[4] << 2) | (bits[5] << 1) | bits[6]
  const L = (bits[7] << 3) | (bits[8] << 2) | (bits[9] << 1) | bits[10]
  let off = 11
  const slugVals: number[] = []
  for (let i = 0; i < L && off + 6 <= 80 - 8; i++) {
    let x = 0
    for (let b = 0; b < 6; b++) x = (x << 1) | bits[off + b]
    slugVals.push(x & 63)
    off += 6
  }
  const payloadBits = bits.slice(0, off)
  const crcBits = bits.slice(off, off + 8)
  const crcBytes = bitsToBytes(payloadBits)
  const expect = crc8(crcBytes)
  let got = 0
  for (let i = 0; i < 8; i++) got = (got << 1) | (crcBits[i] & 1)
  let slug = ''
  for (const n of slugVals) slug += BASE62[n] || '0'
  const provider: Provider = 'clck'
  let service: Service = 'unknown'
  if (s === 0) service = 'youtube'
  else if (s === 1) service = 'tiktok'
  else if (s === 2) service = 'soundcloud'
  else if (s === 3) service = 'spotify'
  const ok = v === 2 && ((got & 0xFF) === (expect & 0xFF))
  return { ok, provider, service, slug }
}
