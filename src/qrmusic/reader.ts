import { decodeV2 } from '../topmenu/qrmusic/codec'
import { getPalette } from '../editor/palette'
import MediaOverlay from '../media/MediaOverlay.svelte'
import MediaOverlayTikTok from '../media/MediaOverlayTikTok.svelte'
import MediaOverlaySpotify from '../media/MediaOverlaySpotify.svelte'
import MediaOverlaySoundCloud from '../media/MediaOverlaySoundCloud.svelte'
import CaptchaModal from './CaptchaModal.svelte'

function log(..._args: any[]) {}

let captchaModalInst: any = null
function showCaptchaModal(shortUrl: string, onRetry: ()=>void){
  if(captchaModalInst) return;
  captchaModalInst = new CaptchaModal({
    target: document.body,
    props: { shortUrl }
  });
  try{
    captchaModalInst.$on('retry', ()=>{
      try{ if(captchaModalInst){ captchaModalInst.$destroy(); captchaModalInst=null } }catch{}
      onRetry();
    });
    captchaModalInst.$on('closed', ()=>{
      try{ if(captchaModalInst){ captchaModalInst.$destroy(); captchaModalInst=null } }catch{}
    });
  }catch{}
}

const FREE32: Array<[number,number,number]> = getPalette('free').slice(0,32) as any

const ANCH_COLS = [0,5,10,15,20,25,30,31]
const AC = 16
const ANCH_KEYS = new Set(['0,0','4,0','0,4','4,4','2,0','0,2','4,2','2,4','2,2'])
const ANCH_MAP = new Map<string,number>([
  ['0,0',ANCH_COLS[0]],
  ['4,0',ANCH_COLS[1]],
  ['0,4',ANCH_COLS[2]],
  ['4,4',ANCH_COLS[3]],
  ['2,0',ANCH_COLS[4]],
  ['0,2',ANCH_COLS[5]],
  ['4,2',ANCH_COLS[6]],
  ['2,4',ANCH_COLS[7]],
  ['2,2',AC],
])

const tileCache = new Map<string,OffscreenCanvas>()
let lastClickKey = ''
let lastClickTs = 0
let lastOpenKey = ''
let lastOpenTs = 0
const openMap = new Map<string, any>()

function keyOf(x:number,y:number){ return `${x},${y}` }
async function resolveTikTokIdFromCode(code:string):Promise<string>{ if(!code) return ''; const tries=[`https://vt.tiktok.com/${code}/`,`https://vm.tiktok.com/${code}/`]; for(const url of tries){ const fin=await gmResolve(url); const id=fin?extractTikTokId(fin):''; if(id) return id } return '' }

function parseTileXYFromUrl(u:string){ try{ const url=new URL(u,location.href); const p=url.pathname.split('/').filter(Boolean); const i=p.findIndex(s=>s==='tiles'); if(i>=0&&i+2<p.length){ const x=Number(p[i+1].replace(/\D+/g,'')); const y=Number(p[i+2].replace(/\D+/g,'')); if(Number.isFinite(x)&&Number.isFinite(y)) return [x,y] as [number,number] } }catch{} return null }
function parseTilePixelFromPixel(u:string){ try{ const url=new URL(u,location.href); const p=url.pathname.split('/').filter(Boolean); const ty=Number(String(p[p.length-1]||'').replace(/\D+/g,'')); const tx=Number(String(p[p.length-2]||'').replace(/\D+/g,'')); const qs=url.searchParams; const px=Number(qs.get('x')||''); const py=Number(qs.get('y')||''); if([tx,ty,px,py].every(n=>Number.isFinite(n))){ const out=[tx,ty,px,py] as [number,number,number,number]; log('qrmusic','parsePx',out); return out } }catch{ log('qrmusic','parsePxErr',u) } return null }

async function blobToCanvas(blob:Blob){ const img=await createImageBitmap(blob,{colorSpaceConversion:'none'} as any); const c=new OffscreenCanvas(1000,1000); const ctx=c.getContext('2d',{willReadFrequently:true} as any); if(!ctx) return null; ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,1000,1000); ctx.drawImage(img,0,0,1000,1000); try{ img.close() }catch{} return c }

async function fetchTileCanvas(x:number,y:number){ const url=`https://backend.wplace.live/files/s0/tiles/${x}/${y}.png`; log('qrmusic','fetchTile',x,y); const r=await fetch(url,{cache:'no-cache'}); if(!r.ok){ log('qrmusic','fetchTileFail',x,y,r.status); return null } const b=await r.blob(); return await blobToCanvas(b) }

function nearestFreeIdx(r:number,g:number,b:number){ let best=0,bd=1e12; for(let i=0;i<FREE32.length;i++){ const c=FREE32[i]; const dr=r-c[0], dg=g-c[1], db=b-c[2]; const d=dr*dr+dg*dg+db*db; if(d<bd){ bd=d; best=i; if(d===0) break } } return best }

function getPixelRGB(canvas:OffscreenCanvas,x:number,y:number){ const ctx=canvas.getContext('2d',{willReadFrequently:true} as any); if(!ctx) return null; const img=ctx.getImageData(x,y,1,1).data; return [img[0]|0,img[1]|0,img[2]|0,img[3]|0] as [number,number,number,number] }

function matchAnchorsAt(canvas:OffscreenCanvas,x0:number,y0:number){ for(const [k,v] of ANCH_MAP){ const [xs,ys]=k.split(',').map(n=>Number(n)||0); const p=getPixelRGB(canvas,x0+xs,y0+ys); if(!p) return false; const idx=nearestFreeIdx(p[0],p[1],p[2]); if((idx%FREE32.length)!==(v%FREE32.length)) return false } return true }

function readSymbolsAt(canvas:OffscreenCanvas,x0:number,y0:number){ const coords: Array<[number,number]> = []; for(let y=0;y<5;y++){ const xs = y%2===0 ? [0,1,2,3,4] : [4,3,2,1,0]; for(const x of xs){ const key=`${x},${y}`; if(ANCH_KEYS.has(key)) continue; coords.push([x,y]) } } const out:number[]=[]; for(const [x,y] of coords){ const p=getPixelRGB(canvas,x0+x,y0+y); if(!p) return null; const idx=nearestFreeIdx(p[0],p[1],p[2]); out.push(idx%FREE32.length) } log('qrmusic','symsLen',out.length); return out }

function extractUrlFromYandexRedirect(u:string):string|null{ try{ const url=new URL(u); if(url.hostname==='sba.yandex.ru' && url.pathname==='/redirect'){ const target=url.searchParams.get('url'); if(target){ try{ return decodeURIComponent(target) }catch{ return target } } } }catch{} return null }

function gmResolve(url:string):Promise<string|null>{ const gm=(window as any).GM_xmlhttpRequest || ((window as any).GM&& (window as any).GM.xmlHttpRequest); if(!gm){ log('qrmusic','gmMissing'); return Promise.resolve(null) } return new Promise(res=>{ try{ log('qrmusic','gmStart',url); gm({ method:'GET', url, headers:{'Accept':'text/html'}, onload:(r:any)=>{ try{ let u=String(r?.finalUrl||'').trim(); const extracted=extractUrlFromYandexRedirect(u); if(extracted) u=extracted; log('qrmusic','gmDone',u); res(u||null) }catch{ res(null) } }, onerror:()=>{ log('qrmusic','gmError',url); res(null) } } as any) }catch{ res(null) } }) }

async function expandShort(_provider:string, slug:string):Promise<string|undefined>{ try{ const httpsUrl = `https://clck.ru/${encodeURIComponent(slug||'')}`; let fin = await gmResolve(httpsUrl); if(fin){ const extracted=extractUrlFromYandexRedirect(fin); if(extracted) fin=extracted; return fin } try{ const r = await fetch(httpsUrl, { method:'GET', redirect: 'follow' as RequestRedirect }); if(r && r.url && r.url!==httpsUrl){ let u=r.url; const extracted=extractUrlFromYandexRedirect(u); if(extracted) u=extracted; return u } }catch{} try{ const httpUrl = `http://clck.ru/${encodeURIComponent(slug||'')}`; let fin2 = await gmResolve(httpUrl); if(fin2){ const extracted=extractUrlFromYandexRedirect(fin2); if(extracted) fin2=extracted; return fin2 } }catch{} }catch{} return undefined }

function extractYouTubeId(u:string){ try{ const url=new URL(u); const h=url.hostname.toLowerCase(); if(h==='youtu.be'){ const id=url.pathname.replace(/^\//,'').split(/[/?#]/)[0]; if(id) return id } if(h.endsWith('youtube.com')){ if(/^\/shorts\//.test(url.pathname)){ const id=url.pathname.split('/')[2]||''; if(id) return id } const id=url.searchParams.get('v')||''; if(id) return id } }catch{} return '' }
function extractTikTokId(u:string){ try{ const url=new URL(u); const m=url.pathname.match(/\/video\/(\d+)/); if(m) return m[1] }catch{} return '' }
function extractTikTokShortCode(u:string){ try{ const url=new URL(u); const host=url.hostname.toLowerCase(); if(/^(?:vt|vm)\.tiktok\.com$/.test(host)){ const p=url.pathname.replace(/\/+$/,'').split('/').filter(Boolean); if(p[0]) return p[0] } if(host.endsWith('tiktok.com')){ const from=url.searchParams.get('fromUrl')||''; if(from){ const seg=String(from).replace(/^\/+/, '').split('/')[0]||''; if(seg) return seg } const p=url.pathname.replace(/^\/+/, ''); const seg=(p.split('/')[0]||'').trim(); if(seg && !/^@/.test(seg) && !/^video$/i.test(seg)) return seg } }catch{} return '' }

function cleanSoundCloud(u:string){ try{ const url=new URL(u); if(url.hostname.toLowerCase().endsWith('soundcloud.com')){ const keys:Array<string>=[]; url.searchParams.forEach((_,k)=>{ if(/^utm_/i.test(k)||k==='si') keys.push(k) }); for(const k of keys){ url.searchParams.delete(k) } return url.toString() } }catch{} return u }
async function normalizeSoundCloud(u:string):Promise<string>{ try{ const url=new URL(u); const host=url.hostname.toLowerCase(); if(host==='on.soundcloud.com'){ const fin=await gmResolve(u); if(fin) return cleanSoundCloud(fin) } if(host.endsWith('soundcloud.com')){ return cleanSoundCloud(u) } }catch{} return u }

function cleanSpotify(u:string){ try{ const url=new URL(u); const h=url.hostname.toLowerCase(); if(h.endsWith('spotify.com')){ const keys:Array<string>=[]; url.searchParams.forEach((_,k)=>{ if(/^utm_/i.test(k)||k==='si') keys.push(k) }); for(const k of keys){ url.searchParams.delete(k) } return url.toString() } }catch{} return u }
async function normalizeSpotify(u:string):Promise<string>{ try{ const url=new URL(u); const host=url.hostname.toLowerCase(); if(host==='spotify.link'){ const fin=await gmResolve(u); if(fin) return cleanSpotify(fin) } if(host.endsWith('spotify.com')){ return cleanSpotify(u) } }catch{} return u }

function canOpenOnce(key:string):boolean{ const now=Date.now(); if(lastOpenKey===key && (now-lastOpenTs)<900){ log('qrmusic','openSkip',key); return false } lastOpenKey=key; lastOpenTs=now; log('qrmusic','openKey',key); return true }
function openYouTube(id:string){ if(!id) return; const key='yt:'+id; if(openMap.has(key)) { log('qrmusic','openDup',key); return } if(!canOpenOnce(key)) return; const inst:any = new MediaOverlay({ target: document.body, props: { videoId: id } as any }); openMap.set(key, inst); try{ inst.$on('closed', ()=>{ try{ openMap.delete(key) }catch{} }) }catch{} }
function openTikTok(id:string){ if(!id) return; const key='tt:'+id; if(openMap.has(key)) { log('qrmusic','openDup',key); return } if(!canOpenOnce(key)) return; const inst:any = new MediaOverlayTikTok({ target: document.body, props: { videoId: id } as any }); openMap.set(key, inst); try{ inst.$on('closed', ()=>{ try{ openMap.delete(key) }catch{} }) }catch{} }
function openSpotify(url:string){ if(!url) return; const key='sp:'+url; if(openMap.has(key)) { log('qrmusic','openDup',key); return } if(!canOpenOnce(key)) return; const inst:any = new MediaOverlaySpotify({ target: document.body, props: { sourceUrl: url, title: 'Spotify' } as any }); openMap.set(key, inst); try{ inst.$on('closed', ()=>{ try{ openMap.delete(key) }catch{} }) }catch{} }
function openSoundCloud(url:string){ if(!url) return; const key='sc:'+url; if(openMap.has(key)) { log('qrmusic','openDup',key); return } if(!canOpenOnce(key)) return; const inst:any = new MediaOverlaySoundCloud({ target: document.body, props: { sourceUrl: url, title: 'SoundCloud' } as any }); openMap.set(key, inst); try{ inst.$on('closed', ()=>{ try{ openMap.delete(key) }catch{} }) }catch{} }

async function resolveTikTokIdViaOEmbed(u: string): Promise<string> {
  const gm = (window as any).GM_xmlhttpRequest || ((window as any).GM&& (window as any).GM.xmlHttpRequest);
  const endpoint = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(u);
  if (gm) {
    try {
      const html = await new Promise<string|null>((resolve)=>{
        try{ log('qrmusic','ttOembedGM',endpoint); gm({ method:'GET', url: endpoint, headers:{'Accept':'application/json'}, onload:(r:any)=>{ try{ resolve(String(r?.responseText||'')||null) }catch{ resolve(null) } }, onerror:()=>resolve(null) } as any) }catch{ resolve(null) }
      });
      if (html) {
        try { const json = JSON.parse(html); const h = String(json?.html||''); const m = h.match(/\/video\/(\d+)/); if (m && m[1]){ log('qrmusic','ttOembedGMId',m[1]); return m[1] } } catch {}
      }
    } catch {}
  }
  try {
    log('qrmusic','ttOembedFetch',endpoint); const res = await fetch(endpoint, { method: 'GET' });
    if (res.ok) {
      const json: any = await res.json().catch(()=>null);
      const h = String(json?.html||'');
      const m = h.match(/\/video\/(\d+)/);
      if (m && m[1]) { log('qrmusic', 'ttOembedId', m[1]); return m[1] }
    }
  } catch { }
  return '';
}

export function initQrReader() { (window as any).addEventListener('message', async (event: any) => { const data = event?.data || {}; if (data && data.blobData && typeof data.endpoint === 'string' && /\/tiles\//i.test(String(data.endpoint))) { const tile = parseTileXYFromUrl(String(data.endpoint)); log('qrmusic', 'tileMsg', tile); if (tile) { const c = await blobToCanvas(data.blobData as Blob); if (c) { tileCache.set(keyOf(tile[0], tile[1]), c); log('qrmusic', 'tileCached', tile[0], tile[1]) } } return } }); (window as any).addEventListener('tutorial:map-pixel-clicked', async (e: any) => { try { const endpoint = String(e?.detail?.endpoint || ''); log('qrmusic', 'click', endpoint); const now = Date.now(); if (lastClickKey === endpoint && (now - lastClickTs) < 800) { log('qrmusic', 'clickSkip'); return } lastClickKey = endpoint; lastClickTs = now; const info = parseTilePixelFromPixel(endpoint); if (!info) { log('qrmusic', 'noInfo'); return } const [tx, ty, px, py] = info; let canvas = tileCache.get(keyOf(tx, ty)); if (!canvas) { log('qrmusic', 'tileMiss', tx, ty); canvas = await fetchTileCanvas(tx, ty) as any } else { log('qrmusic', 'tileHit', tx, ty) } if (!canvas) { log('qrmusic', 'noCanvas'); return } const R = 12; let best: null | { x0: number, y0: number } = null; let bestD = 1e12; for (let dy = -R; dy <= R; dy++) { for (let dx = -R; dx <= R; dx++) { const x0 = (px - 2 + dx) | 0; const y0 = (py - 2 + dy) | 0; if (x0 < 0 || y0 < 0 || x0 + 4 >= 1000 || y0 + 4 >= 1000) continue; if (matchAnchorsAt(canvas, x0, y0)) { const cx = x0 + 2, cy = y0 + 2; const d = (cx - px) * (cx - px) + (cy - py) * (cy - py); if (d < bestD) { best = { x0, y0 }; bestD = d } } } } if (!best) { log('qrmusic', 'notFound'); return } log('qrmusic', 'foundAt', best.x0, best.y0, 'd2', bestD); const syms = readSymbolsAt(canvas, best.x0, best.y0); if (!syms || syms.length !== 16) { log('qrmusic', 'badSyms', syms ? syms.length : 0); return } const dec=decodeV2(syms); if(!dec || !dec.ok){ log('qrmusic','decodeFail'); return } log('qrmusic','decoded',dec.service,dec.provider,dec.slug); const processUrl = async ()=>{ let finalUrl = await expandShort(dec.provider, dec.slug); if(!finalUrl){ const short = 'https://clck.ru/' + encodeURIComponent(dec.slug||''); const fin = await gmResolve(short); if(fin) finalUrl = fin } if(!finalUrl){ try{ const cached = localStorage.getItem(`wph:qrm:clck:${dec.slug}`) || ''; if(cached) finalUrl = cached }catch{} } if(!finalUrl){ log('qrmusic','expandFail'); const shortUrl = 'https://clck.ru/' + encodeURIComponent(dec.slug||''); showCaptchaModal(shortUrl, ()=>{ processUrl() }); return } return finalUrl }; let finalUrl = await processUrl(); if(!finalUrl) return log('qrmusic', 'finalUrl', finalUrl); if (dec.service === 'youtube') { const id = extractYouTubeId(finalUrl); log('qrmusic', 'ytId', id); if (id) { openYouTube(id); return } } if (dec.service === 'tiktok') { let id = extractTikTokId(finalUrl); if (!id) { const code = extractTikTokShortCode(finalUrl); if (code) { id = await resolveTikTokIdFromCode(code) } } if (!id) { id = await resolveTikTokIdViaOEmbed(finalUrl); } if (id) { openTikTok(id); return } } if (dec.service === 'spotify') { const spUrl = await normalizeSpotify(finalUrl); openSpotify(spUrl); return } if (dec.service === 'soundcloud') { const scUrl = await normalizeSoundCloud(finalUrl); openSoundCloud(scUrl); return } log('qrmusic', 'unsupported'); } catch { } }); }
