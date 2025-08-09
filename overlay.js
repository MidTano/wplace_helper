(()=>{ "use strict";
try{ if(window.__IMG_OVERLAY_TOOL__?.destroy){ window.__IMG_OVERLAY_TOOL__.destroy() } }catch(e){}
const api={}, root=document.createElement("div"); window.__IMG_OVERLAY_TOOL__=api; document.body.appendChild(root);
const shadow=root.attachShadow({mode:"open"});
const css=`
:host,*{box-sizing:border-box}
:host{--radius:12px;--ui:rgba(22,24,28,0.64);--ui-strong:rgba(26,28,34,0.75);--stroke:rgba(255,255,255,0.08);--shadow:0 16px 40px rgba(0,0,0,.45);--accent:#7dd0ff;--text:#e9eef3;--muted:#b8c0c8}
.overlay{position:fixed;left:80px;top:140px;width:320px;height:240px;z-index:2147483646;background:transparent;border:1px solid var(--stroke);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;opacity:.85;pointer-events:auto}
.overlay.brush{cursor:crosshair}
.content{position:absolute;inset:0;overflow:hidden;background:transparent;pointer-events:none}
img.the-image{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;image-rendering:pixelated;image-rendering:crisp-edges;image-rendering:-moz-crisp-edges;-ms-interpolation-mode:nearest-neighbor;pointer-events:none;backface-visibility:hidden;transform:translateZ(0)}
.brush-cursor{position:fixed;z-index:2147483647;pointer-events:none;border:1px solid var(--accent);border-radius:9999px;transform:translate(-50%,-50%);box-shadow:0 0 0 1px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.2);display:none}
.toolbar{position:fixed;left:80px;top:92px;height:48px;width:320px;z-index:2147483647;background:var(--ui);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15);border:1px solid var(--stroke);border-radius:var(--radius);box-shadow:var(--shadow);display:flex;align-items:stretch;gap:0;user-select:none;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;font-size:12px;line-height:1;overflow:hidden}
.drag-grip{width:36px;height:100%;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);cursor:move;font-size:16px;color:#d5deea;letter-spacing:.3px;user-select:none;flex:0 0 auto}
.drag-grip:hover{background:rgba(255,255,255,.07)}
.toolbar-scroll{position:relative;flex:1;overflow-x:auto;overflow-y:hidden;display:block;scrollbar-width:none;-ms-overflow-style:none}
.toolbar-scroll::-webkit-scrollbar{display:none}
.toolbar-row{height:100%;display:inline-flex;align-items:center;gap:8px;padding:0 10px;min-width:max-content;cursor:default}
.fade-edge{position:absolute;top:0;bottom:0;width:28px;pointer-events:none;opacity:0;transition:opacity .2s ease}
.fade-left{left:36px;background:linear-gradient(90deg,rgba(0,0,0,.35),transparent)}
.fade-right{right:0;background:linear-gradient(270deg,rgba(0,0,0,.35),transparent)}
.toolbar.has-left .fade-left{opacity:1}
.toolbar.has-right .fade-right{opacity:1}
.title{font-weight:700;letter-spacing:.2px;margin-right:6px;color:#f2f6fa;display:inline-flex;align-items:center;gap:6px;cursor:move}
.badge{padding:4px 8px;border-radius:999px;background:rgba(125,208,255,.15);border:1px solid rgba(125,208,255,.35);color:#cfeeff;font-weight:600}
.btn{appearance:none;border:1px solid #3a3f47;background:#262a30;color:#e8edf3;border-radius:8px;height:32px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;transition:background .15s ease,transform .05s ease,border-color .15s ease}
.btn:hover{background:#2e333a;border-color:#4a5058}
.btn:active{transform:translateY(1px)}
.btn.icon{width:32px;padding:0;justify-content:center}
.btn.danger{border-color:#5a2c32;background:#352024;color:#ffc9cf}
.btn.danger:hover{background:#40272c}
.chip{height:28px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #3a3f47;background:#1f2228;color:#dbe3ea}
.control{display:inline-flex;align-items:center;gap:6px;color:#dbe3ea}
.control label{opacity:.85}
input[type=checkbox]{width:16px;height:16px;cursor:pointer;accent-color:var(--accent)}
input[type=range]{width:120px;cursor:pointer;accent-color:var(--accent)}
input[type=number]{width:76px;height:28px;padding:0 8px;background:#1a1e24;color:#e7eef6;border:1px solid #3a3f47;border-radius:8px;font-size:12px;outline:none}
input[type=number]:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(125,208,255,.15)}
input[type=color]{width:32px;height:28px;padding:0;border:1px solid #3a3f47;border-radius:8px;background:#1f2228;cursor:pointer}
.value{min-width:40px;text-align:right;opacity:.8;font-variant-numeric:tabular-nums}
.scale{min-width:60px;text-align:right;opacity:.9;font-weight:600;color:#d4ecff}
.resizer{position:fixed;width:16px;height:16px;z-index:2147483647;cursor:nwse-resize;opacity:.9;background:linear-gradient(135deg,transparent 50%,#9aa0a6 50%) no-repeat,linear-gradient(135deg,transparent calc(50% - 1px),#0d0d0f calc(50% - 1px),#0d0d0f calc(50% + 1px),transparent calc(50% + 1px)) no-repeat;background-size:100% 100%,100% 100%;border-radius:3px}
.sidebar{position:fixed;left:80px;top:140px;width:250px;height:240px;z-index:2147483647;background:var(--ui-strong);backdrop-filter:blur(12px) saturate(1.1);-webkit-backdrop-filter:blur(12px) saturate(1.1);border:1px solid var(--stroke);border-radius:var(--radius);box-shadow:var(--shadow);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;font-size:12px;display:flex;flex-direction:column;overflow:hidden;user-select:none}
.side-head{position:relative;height:44px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding:0 0;overflow:hidden}
.side-scroll{position:relative;flex:1;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.side-scroll::-webkit-scrollbar{display:none}
.side-row{height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 10px;min-width:max-content}
.side-fade-left,.side-fade-right{position:absolute;top:0;bottom:0;width:22px;pointer-events:none;opacity:0;transition:opacity .2s}
.side-fade-left{left:0;background:linear-gradient(90deg,rgba(0,0,0,.35),transparent)}
.side-fade-right{right:0;background:linear-gradient(270deg,rgba(0,0,0,.35),transparent)}
.side-head.has-left .side-fade-left{opacity:1}
.side-head.has-right .side-fade-right{opacity:1}
.side-body{flex:1;overflow:auto;padding:10px}
.palette{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.swatch{display:grid;grid-template-columns:28px 1fr;align-items:center;gap:8px;border:1px solid #39404a;border-radius:10px;padding:8px;background:#1f232a;cursor:pointer;transition:transform .05s ease,background .15s ease,border-color .15s}
.swatch:hover{background:#242a33;border-color:#4a5260;transform:translateY(-1px)}
.swatch.active{border-color:var(--accent);box-shadow:inset 0 0 0 1px rgba(125,208,255,.5)}
.swatch .box{width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.25)}
.swatch .meta{display:flex;flex-direction:column;line-height:1.05}
.swatch .hex{font-weight:700;color:#f1f6fb;letter-spacing:.2px}
.swatch .cnt{font-size:11px;opacity:.8;color:var(--muted)}
.side-foot{border-top:1px solid rgba(255,255,255,.08);padding:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.side-foot .stat{margin-left:auto;opacity:.9;color:#cfe4ff;font-weight:600}
.drop-hint{position:absolute;inset:0;display:grid;place-items:center;color:#b8c0c8;font-size:13px;text-align:center;padding:16px;pointer-events:none}
.drop-hint .box{border:1px dashed #4b5563;padding:14px 16px;border-radius:10px;background:rgba(255,255,255,0.02)}
.kbd{padding:0 6px;border:1px solid #444;border-bottom-width:2px;border-radius:6px;background:#222;font-weight:700}
`; const style=document.createElement("style"); style.textContent=css; shadow.append(style);

function el(t,c,txt){ const n=document.createElement(t); if(c) n.className=c; if(txt!=null) n.textContent=txt; return n }
function numberInput(v){ const i=document.createElement("input"); i.type="number"; i.min="1"; i.step="1"; i.value=v||"1"; return i }
function checkbox(ch=false){ const c=document.createElement("input"); c.type="checkbox"; c.checked=ch; return c }
function controlWrap(lbl){ const w=el("div","control"), l=el("label",null,lbl); w.append(l); return w }
function chip(text){ return el("div","chip",text) }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)) }
function rgbKey(r,g,b){ return r+","+g+","+b }
function rgbToHex(r,g,b){ const h=n=>n.toString(16).padStart(2,"0"); return "#"+h(r)+h(g)+h(b) }

const overlay=el("div","overlay");
const content=el("div","content");
const img=el("img","the-image");
const dropHint=el("div","drop-hint"); dropHint.innerHTML='<div class="box">Перетащите изображение сюда или нажмите <span class="kbd">📁 Открыть</span></div>';
content.append(img,dropHint); overlay.append(content);
const brushCursor=el("div","brush-cursor");

const toolbar=el("div","toolbar");
const dragGrip=el("div","drag-grip","⠿");
const toolbarScroll=el("div","toolbar-scroll");
const toolbarRow=el("div","toolbar-row");
const title=el("div","title"); title.innerHTML='Overlay Image <span class="badge">Pixel-perfect</span>';
const btnOpen=el("button","btn","📁 Открыть");
const fileInput=document.createElement("input"); fileInput.type="file"; fileInput.accept="image/*"; fileInput.style.display="none";

const wWrap=controlWrap("W"); const inW=numberInput("320"); wWrap.append(inW);
const hWrap=controlWrap("H"); const inH=numberInput("240"); hWrap.append(inH);
let lockAspect=true; const btnLock=el("button","btn icon","🔒"); btnLock.title="Сохранять пропорции (вкл/выкл)";
const snapWrap=el("div","control"); const snapCheck=checkbox(true); const snapLabel=el("label",null,"Кратн."); snapWrap.append(snapCheck,snapLabel);
const scaleView=el("div","scale","—");
const passWrap=el("div","control"); const passCheck=checkbox(false); passCheck.title="Сквозные клики по странице (P)"; const passLabel=el("label",null,"Сквозь"); passWrap.append(passCheck,passLabel);
const transWrap=el("div","control"); const transLabel=el("label",null,"Прозр."); const transCheck=checkbox(true); const opacity=document.createElement("input"); opacity.type="range"; opacity.min="0"; opacity.max="100"; opacity.value="85"; const opVal=el("span","value","85%"); transWrap.append(transLabel,transCheck,opacity,opVal);
const btnClose=el("button","btn danger","✕ Закрыть");

toolbarRow.append(title,btnOpen,wWrap,hWrap,btnLock,snapWrap,scaleView,passWrap,transWrap,btnClose);
toolbarScroll.append(toolbarRow);
const fadeL=el("div","fade-edge fade-left");
const fadeR=el("div","fade-edge fade-right");
toolbar.append(dragGrip,toolbarScroll,fadeL,fadeR);

const resizer=el("div","resizer");

const sidebar=el("div","sidebar");
const sideHead=el("div","side-head");
const sideScroll=el("div","side-scroll");
const sideRow=el("div","side-row");
const delayLbl=el("span",null,"Задержка:");
const delayInp=numberInput("5"); delayInp.style.width="64px";
const ms=el("span",null,"мс"); ms.style.opacity=".85";
const btnStop=el("button","btn","■ Стоп"); btnStop.title="Остановить автоклик";
const palStat=chip("— цветов");
const brushChk=checkbox(false); const brushLbl=el("label",null,"Кисть");
const sizeLbl=el("span",null,"Размер:"); const brushSizeInp=numberInput("1"); brushSizeInp.style.width="56px";
const activeChip=chip("Кисть: —");
sideRow.append(delayLbl,delayInp,ms,btnStop,palStat,brushChk,brushLbl,sizeLbl,brushSizeInp,activeChip);
sideScroll.append(sideRow);
const sfadeL=el("div","side-fade-left");
const sfadeR=el("div","side-fade-right");
sideHead.append(sideScroll,sfadeL,sfadeR);
const sideBody=el("div","side-body");
const paletteEl=el("div","palette");
sideBody.append(paletteEl);
const sideFoot=el("div","side-foot");
const runStat=el("div","stat","—/—");
sideFoot.append(runStat);
sidebar.append(sideHead,sideBody,sideFoot);

shadow.append(overlay,toolbar,resizer,sidebar,fileInput,brushCursor);

const state={
  x:80,y:140,w:320,h:240,
  barH:48,barGap:8,
  opacity:.85, transparencyOn:true,
  passThrough:false,
  dragging:false, resizing:false,
  start:{x:0,y:0,left:0,top:0,w:0,h:0},
  minW:1,minH:1,
  iw:0,ih:0,
  imageData:null,
  palette:[],
  positionsCache:new Map(),
  posSetCache:new Map(),
  paintedByColor:new Map(),
  running:null,
  brushMode:false, brushSize:1, isBrushing:false, activeColor:null, activeSwatch:null
};

function applyOpacity(){ overlay.style.opacity=String(state.opacity) }
function updateOpLabel(){ opVal.textContent=Math.round(state.opacity*100)+"%" }
function updateScaleLabel(){
  if(!state.iw||!state.ih){ scaleView.textContent="—"; return }
  const sx=state.w/state.iw, sy=state.h/state.ih, fx=+sx.toFixed(2), fy=+sy.toFixed(2);
  scaleView.textContent=Math.abs(sx-sy)<1e-6?fx+"x":fx+"x × "+fy+"x"
}
function updatePassThrough(){
  overlay.style.pointerEvents=state.passThrough?"none":"auto";
  toolbar.style.pointerEvents="auto";
  resizer.style.pointerEvents="auto";
  sidebar.style.pointerEvents="auto"
}
function syncUI(){
  overlay.style.left=state.x+"px";
  overlay.style.top=state.y+"px";
  overlay.style.width=state.w+"px";
  overlay.style.height=state.h+"px";
  const barTop=Math.max(8, state.y - state.barH - state.barGap);
  toolbar.style.left=state.x+"px";
  toolbar.style.top=barTop+"px";
  toolbar.style.width=state.w+"px";
  resizer.style.left=(state.x+state.w-16)+"px";
  resizer.style.top=(state.y+state.h-16)+"px";
  sidebar.style.left=(state.x+state.w+8)+"px";
  sidebar.style.top=state.y+"px";
  sidebar.style.height=state.h+"px";
  inW.value=String(Math.round(state.w));
  inH.value=String(Math.round(state.h));
  updateScaleLabel()
}
function makeHScroll(frame, scroller, fadeL, fadeR){
  const update=()=>{
    const max=Math.max(0, scroller.scrollWidth - scroller.clientWidth), sl=scroller.scrollLeft;
    frame.classList.toggle("has-left", sl>2);
    frame.classList.toggle("has-right", sl<max-2)
  };
  const onWheel=e=>{
    const amt=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(amt!==0 && scroller.scrollWidth>scroller.clientWidth){
      scroller.scrollLeft+=amt*(e.shiftKey?2:1);
      update();
      e.preventDefault()
    }
  };
  scroller.addEventListener("wheel", onWheel, {passive:false});
  scroller.addEventListener("scroll", update);
  new ResizeObserver(update).observe(scroller);
  update()
}

function startDrag(e){
  if(e.button!==0) return;
  e.preventDefault();
  state.dragging=true;
  state.start.x=e.clientX; state.start.y=e.clientY;
  state.start.left=state.x; state.start.top=state.y;
  e.currentTarget?.setPointerCapture?.(e.pointerId)
}
function moveDrag(e){
  if(!state.dragging) return;
  const dx=e.clientX-state.start.x, dy=e.clientY-state.start.y;
  state.x=Math.round(state.start.left+dx);
  state.y=Math.round(state.start.top+dy);
  syncUI()
}
function endDrag(){ state.dragging=false }

function applySizeFromInputs(source){
  let w=Math.max(1, Math.round(Number(inW.value))), h=Math.max(1, Math.round(Number(inH.value)));
  if(!Number.isFinite(w)) w=state.w; if(!Number.isFinite(h)) h=state.h;
  if(state.iw&&state.ih){
    if(lockAspect){
      if(snapCheck.checked){
        const k=Math.max(1, Math.round((source==="h"? (h/state.ih):(w/state.iw))));
        w=state.iw*k; h=state.ih*k
      }else{
        if(source==="h"){ const ratio=state.iw/state.ih; w=Math.round(h*ratio) }
        else{ const ratio=state.ih/state.iw; h=Math.round(w*ratio) }
      }
    }else if(snapCheck.checked){
      const kx=Math.max(1, Math.round(w/state.iw)), ky=Math.max(1, Math.round(h/state.ih));
      w=state.iw*kx; h=state.ih*ky
    }
  }
  state.w=w; state.h=h; syncUI()
}

function onResizeDragDown(e){
  if(e.button!==0) return;
  e.preventDefault();
  state.resizing=true;
  state.start.x=e.clientX; state.start.y=e.clientY;
  state.start.w=state.w; state.start.h=state.h;
  resizer.setPointerCapture(e.pointerId)
}
function onResizeDragMove(e){
  if(!state.resizing) return;
  const dx=e.clientX-state.start.x, dy=e.clientY-state.start.y;
  let w=clamp(Math.round(state.start.w+dx), state.minW, Math.max(state.minW, window.innerWidth-state.x-8));
  let h=clamp(Math.round(state.start.h+dy), state.minH, Math.max(state.minH, window.innerHeight-state.y-8));
  if(state.iw&&state.ih){
    if(lockAspect){
      if(snapCheck.checked){
        const k=Math.max(1, Math.round(w/state.iw)); w=state.iw*k; h=state.ih*k
      }else{
        const ratio=state.ih/state.iw; h=Math.round(w*ratio)
      }
    }else if(snapCheck.checked){
      const kx=Math.max(1, Math.round(w/state.iw)), ky=Math.max(1, Math.round(h/state.ih));
      w=state.iw*kx; h=state.ih*ky
    }
  }
  state.w=w; state.h=h; syncUI()
}
function onResizeDragUp(){ state.resizing=false }

function loadFile(file){
  const reader=new FileReader();
  reader.onload=()=>{ img.src=reader.result };
  reader.onerror=()=>alert("Не удалось прочитать файл");
  reader.readAsDataURL(file)
}

async function extractPalette(){
  if(!state.iw||!state.ih) return;
  const cnv=document.createElement("canvas");
  cnv.width=state.iw; cnv.height=state.ih;
  const ctx=cnv.getContext("2d",{willReadFrequently:true});
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,0,0,state.iw,state.ih);
  const imageData=ctx.getImageData(0,0,state.iw,state.ih);
  state.imageData=imageData;
  const data=imageData.data, map=new Map();
  for(let i=0;i<data.length;i+=4){
    const a=data[i+3]; if(a===0) continue;
    const r=data[i], g=data[i+1], b=data[i+2];
    const key=rgbKey(r,g,b);
    map.set(key,(map.get(key)||0)+1)
  }
  const palette=Array.from(map.entries()).map(([key,count])=>{
    const [r,g,b]=key.split(",").map(Number);
    return {key,r,g,b,count,hex:rgbToHex(r,g,b)}
  }).sort((a,b)=>b.count-a.count);
  state.palette=palette;
  state.positionsCache.clear();
  state.posSetCache.clear()
}
function renderPalette(){
  paletteEl.innerHTML="";
  palStat.textContent=state.palette.length?`${state.palette.length} цветов`:"— цветов";
  for(const c of state.palette){
    const sw=el("div","swatch");
    sw.dataset.key=c.key;
    const box=el("div","box"); box.style.background=c.hex;
    const meta=el("div","meta");
    const hex=el("div","hex",c.hex.toUpperCase());
    const cnt=el("div","cnt",`${c.count} px`);
    meta.append(hex,cnt);
    sw.append(box,meta);
    sw.title="Выбрать цвет";
    sw.addEventListener("click",()=>{ if(state.brushMode){ setActiveColor(c,sw,false,true) } else { startAutoClick(c) } });
    paletteEl.append(sw)
  }
  if(state.activeColor){
    const sw=[...paletteEl.children].find(x=>x.dataset.key===state.activeColor.key);
    if(sw) setActiveColor(state.activeColor, sw, true, false)
  }
}
function getPositionsForColor(key){
  if(state.positionsCache.has(key)) return state.positionsCache.get(key);
  const data=state.imageData?.data; if(!data||!state.iw||!state.ih) return [];
  const [tr,tg,tb]=key.split(",").map(Number), w=state.iw, h=state.ih;
  const out=[];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if(data[i+3]===0) continue;
      const r=data[i], g=data[i+1], b=data[i+2];
      if(r===tr && g===tg && b===tb) out.push([x,y])
    }
  }
  state.positionsCache.set(key,out);
  return out
}
function getPosSetForColor(key){
  if(state.posSetCache.has(key)) return state.posSetCache.get(key);
  const arr=getPositionsForColor(key);
  const set=new Set();
  for(const [x,y] of arr) set.add(y*state.iw + x);
  state.posSetCache.set(key,set);
  return set
}
function simulateClickAt(x,y){
  const prevOverlayPE=overlay.style.pointerEvents, prevToolbarPE=toolbar.style.pointerEvents, prevResizerPE=resizer.style.pointerEvents, prevSidebarPE=sidebar.style.pointerEvents;
  overlay.style.pointerEvents="none"; toolbar.style.pointerEvents="none"; resizer.style.pointerEvents="none";
  const target=document.elementFromPoint(x,y);
  const build=(extra={})=>({bubbles:true,cancelable:true,composed:true,clientX:x,clientY:y,screenX:(window.screenX||0)+x,screenY:(window.screenY||0)+y,button:0,buttons:0,detail:1,...extra});
  try{
    if(target){
      if(window.PointerEvent){
        target.dispatchEvent(new PointerEvent("pointermove",{...build(),pointerId:1,pointerType:"mouse",isPrimary:true,pressure:0}));
        target.dispatchEvent(new PointerEvent("pointerdown",{...build({buttons:1}),pointerId:1,pointerType:"mouse",isPrimary:true,pressure:.5}))
      }
      target.dispatchEvent(new MouseEvent("mousemove",build()));
      target.dispatchEvent(new MouseEvent("mousedown",build({buttons:1})));
      if(window.PointerEvent){
        target.dispatchEvent(new PointerEvent("pointerup",{...build(),pointerId:1,pointerType:"mouse",isPrimary:true,pressure:0}))
      }
      target.dispatchEvent(new MouseEvent("mouseup",build()));
      target.dispatchEvent(new MouseEvent("click",build()))
    }
  }finally{
    overlay.style.pointerEvents=prevOverlayPE; toolbar.style.pointerEvents=prevToolbarPE; resizer.style.pointerEvents=prevResizerPE; sidebar.style.pointerEvents=prevSidebarPE
  }
}
function startAutoClick(color){
  if(!state.iw||!state.ih||!img.src) return;
  const positions=getPositionsForColor(color.key);
  if(!positions.length) return;
  const rect=img.getBoundingClientRect(), sx=rect.width/state.iw, sy=rect.height/state.ih;
  const delay=Math.max(0, Math.round(Number(delayInp.value)||0));
  stopAutoClick();
  const runner={color,positions,rect,sx,sy,idx:0,total:positions.length,timer:null,running:true,delay};
  state.running=runner; updateRunStat();
  const tick=()=>{
    if(!runner.running) return;
    if(runner.idx>=runner.total){ stopAutoClick(); return }
    const [ix,iy]=runner.positions[runner.idx++], x=runner.rect.left+(ix+.5)*runner.sx, y=runner.rect.top+(iy+.5)*runner.sy;
    simulateClickAt(x,y);
    updateRunStat();
    if(!runner.running) return;
    if(runner.delay<=0) runner.timer=requestAnimationFrame(tick); else runner.timer=setTimeout(tick, runner.delay)
  };
  tick()
}
function stopAutoClick(){
  const r=state.running; if(!r) return;
  r.running=false;
  if(r.timer!=null){ if(typeof r.timer==="number") clearTimeout(r.timer); else cancelAnimationFrame(r.timer) }
  state.running=null; updateRunStat()
}
function updateRunStat(){ runStat.textContent=state.running?`${state.running.idx}/${state.running.total}`:"—/—" }

function setActiveColor(color, swatch, silent, reset){
  state.activeColor=color;
  activeChip.textContent="Кисть: "+color.hex.toUpperCase();
  activeChip.style.borderColor=color.hex;
  brushCursor.style.borderColor=color.hex;
  if(reset) state.paintedByColor.delete(color.key);
  if(state.activeSwatch) state.activeSwatch.classList.remove("active");
  if(swatch){ state.activeSwatch=swatch; swatch.classList.add("active") }
  if(state.brushMode && !silent){ brushCursor.style.display="block" }
}
function setBrushMode(on){
  state.brushMode=on;
  brushChk.checked=on;
  if(on){
    stopAutoClick();
    overlay.classList.add("brush");
    passCheck.checked=false; passCheck.disabled=true;
    state.passThrough=false; updatePassThrough();
    brushCursor.style.display=state.activeColor?"block":"none"
  }else{
    overlay.classList.remove("brush");
    passCheck.disabled=false;
    brushCursor.style.display="none"
  }
}
function updateBrushCursorAt(clientX, clientY){
  if(!state.brushMode || !state.activeColor) { brushCursor.style.display="none"; return }
  const rect=img.getBoundingClientRect();
  const sx=rect.width/state.iw, sy=rect.height/state.ih;
  const ix=Math.floor((clientX-rect.left)/sx);
  const iy=Math.floor((clientY-rect.top)/sy);
  const cx=rect.left+(clamp(ix,0,state.iw-1)+.5)*sx;
  const cy=rect.top +(clamp(iy,0,state.ih-1)+.5)*sy;
  const w=Math.max(1, state.brushSize)*sx;
  const h=Math.max(1, state.brushSize)*sy;
  brushCursor.style.width=w+"px";
  brushCursor.style.height=h+"px";
  brushCursor.style.left=cx+"px";
  brushCursor.style.top=cy+"px";
  brushCursor.style.display="block"
}
function brushPaintAt(clientX, clientY){
  if(!state.activeColor || !state.iw || !state.ih) return;
  const rect=img.getBoundingClientRect();
  const sx=rect.width/state.iw, sy=rect.height/state.ih;
  const ix=Math.floor((clientX-rect.left)/sx);
  const iy=Math.floor((clientY-rect.top)/sy);
  const size=Math.max(1, state.brushSize);
  const half=Math.floor((size-1)/2);
  let x0=ix-half, y0=iy-half, x1=ix+size-half-1, y1=iy+size-half-1;
  x0=clamp(x0,0,state.iw-1); y0=clamp(y0,0,state.ih-1);
  x1=clamp(x1,0,state.iw-1); y1=clamp(y1,0,state.ih-1);
  const set=getPosSetForColor(state.activeColor.key);
  if(!state.paintedByColor.has(state.activeColor.key)) state.paintedByColor.set(state.activeColor.key,new Set());
  const painted=state.paintedByColor.get(state.activeColor.key);
  for(let y=y0;y<=y1;y++){
    for(let x=x0;x<=x1;x++){
      const idx=y*state.iw+x;
      if(!set.has(idx) || painted.has(idx)) continue;
      const cx=rect.left+(x+.5)*sx, cy=rect.top+(y+.5)*sy;
      simulateClickAt(cx,cy);
      painted.add(idx)
    }
  }
}

applyOpacity(); updateOpLabel(); syncUI(); updatePassThrough(); makeHScroll(toolbar,toolbarScroll,fadeL,fadeR); makeHScroll(sideHead,sideScroll,sfadeL,sfadeR);

dragGrip.addEventListener("pointerdown",startDrag);
dragGrip.addEventListener("pointermove",moveDrag);
dragGrip.addEventListener("pointerup",endDrag);
toolbar.addEventListener("pointerdown",(e)=>{ if(!e.target.closest("input, button, label, .kbd, select, textarea, .toolbar-scroll")) startDrag(e) });
toolbar.addEventListener("pointermove",moveDrag);
toolbar.addEventListener("pointerup",endDrag);

overlay.addEventListener("pointermove",(e)=>{ updateBrushCursorAt(e.clientX,e.clientY); if(state.isBrushing) brushPaintAt(e.clientX,e.clientY) });
overlay.addEventListener("pointerdown",(e)=>{ if(e.button===0 && state.brushMode){ e.preventDefault(); state.isBrushing=true; brushPaintAt(e.clientX,e.clientY); overlay.setPointerCapture?.(e.pointerId) } else if(e.button===0 && e.shiftKey){ startDrag(e) }});
overlay.addEventListener("pointerup",()=>{ state.isBrushing=false; });

resizer.addEventListener("pointerdown",onResizeDragDown);
resizer.addEventListener("pointermove",onResizeDragMove);
resizer.addEventListener("pointerup",onResizeDragUp);

inW.addEventListener("change",()=>applySizeFromInputs("w"));
inH.addEventListener("change",()=>applySizeFromInputs("h"));
btnLock.addEventListener("click",()=>{ lockAspect=!lockAspect; btnLock.textContent=lockAspect?"🔒":"🔓"; btnLock.title=lockAspect?"Сохранять пропорции: вкл":"Сохранять пропорции: выкл"; applySizeFromInputs("w") });

btnOpen.addEventListener("click",()=>fileInput.click());
fileInput.addEventListener("change",(e)=>{ const f=e.target.files&&e.target.files[0]; if(f) loadFile(f); fileInput.value="" });

toolbar.addEventListener("dragover",(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect="copy" });
toolbar.addEventListener("drop",(e)=>{ e.preventDefault(); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f&&f.type.startsWith("image/")) loadFile(f) });
overlay.addEventListener("dragover",(e)=>{ if(state.passThrough) return; e.preventDefault(); e.dataTransfer.dropEffect="copy" });
overlay.addEventListener("drop",(e)=>{ if(state.passThrough) return; e.preventDefault(); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f&&f.type.startsWith("image/")) loadFile(f) });

img.addEventListener("load",async ()=>{
  dropHint.style.display="none";
  state.iw=img.naturalWidth||0; state.ih=img.naturalHeight||0;
  if(state.iw&&state.ih){
    state.w=Math.max(1,state.iw); state.h=Math.max(1,state.ih);
    state.x=clamp(state.x,8,Math.max(8, window.innerWidth-state.w-8));
    state.y=clamp(state.y,8+state.barH+state.barGap,Math.max(8+state.barH+state.barGap, window.innerHeight-state.h-8));
    snapCheck.checked=true; lockAspect=true; btnLock.textContent="🔒";
    syncUI()
  }
  await extractPalette();
  renderPalette()
});

passCheck.addEventListener("change",()=>{ state.passThrough=passCheck.checked; updatePassThrough() });
transCheck.addEventListener("change",()=>{ state.transparencyOn=transCheck.checked; state.opacity=state.transparencyOn?Number(opacity.value)/100:1; opacity.disabled=!state.transparencyOn; applyOpacity(); updateOpLabel() });
opacity.addEventListener("input",()=>{ if(state.transparencyOn){ state.opacity=Number(opacity.value)/100; applyOpacity(); updateOpLabel() } });

btnStop.addEventListener("click",()=>stopAutoClick());
btnClose.addEventListener("click",()=>api.destroy());

brushChk.addEventListener("change",()=>{ setBrushMode(brushChk.checked) });
brushSizeInp.addEventListener("change",()=>{ const v=Math.max(1, Math.round(Number(brushSizeInp.value)||1)); state.brushSize=v; brushSizeInp.value=String(v) });

const ro=new ResizeObserver(()=>{ syncUI() }); ro.observe(overlay);
const onKey=(e)=>{
  const tag=(e.target&&e.target.tagName)||"";
  if(/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if(e.key.toLowerCase()==="p"){ if(!state.brushMode){ passCheck.checked=!passCheck.checked; passCheck.dispatchEvent(new Event("change")) } }
  if(e.key==="["){ const v=+opacity.value; opacity.value=String(Math.max(0,v-5)); opacity.dispatchEvent(new Event("input")) }
  if(e.key==="]"){ const v=+opacity.value; opacity.value=String(Math.min(100,v+5)); opacity.dispatchEvent(new Event("input")) }
  if(e.key==="Escape"){ api.destroy() }
};
document.addEventListener("keydown",onKey,true);

api.destroy=()=>{ try{ document.removeEventListener("keydown",onKey,true) }catch(e){} try{ ro.disconnect() }catch(e){} try{ root.remove() }catch(e){} delete window.__IMG_OVERLAY_TOOL__ };

(()=>{ state.x=clamp(state.x,8,window.innerWidth-state.w-8); state.y=clamp(state.y,8+state.barH+state.barGap,window.innerHeight-state.h-8); syncUI() })();
makeHScroll(toolbar,toolbarScroll,fadeL,fadeR);
makeHScroll(sideHead,sideScroll,sfadeL,sfadeR);
console.log("Overlay Image — Pixel-perfect. Палитра/Автоклик и Кисть. Повторный выбор цвета сбрасывает прогресс кисти. Двигать: за ⠿, за заголовок, или Shift+ЛКМ по окну. Хоткеи: [ и ] — прозрачность, P — сквозные клики (в кисти выключено), Esc — закрыть.");
})();