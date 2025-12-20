export function generateQrScannerWorkerCode(): string {
  return `
var FREE32 = null;
var RGB_TO_FREE = null;

var ANCH_COLS = [0,5,10,15,20,25,30,31];
var AC = 16;
var ANCH_KEYS = new Set(['0,0','4,0','0,4','4,4','2,0','0,2','4,2','2,4','2,2']);
var ANCH_POS = [
  {x:0,y:0,v:ANCH_COLS[0]},
  {x:4,y:0,v:ANCH_COLS[1]},
  {x:0,y:4,v:ANCH_COLS[2]},
  {x:4,y:4,v:ANCH_COLS[3]},
  {x:2,y:0,v:ANCH_COLS[4]},
  {x:0,y:2,v:ANCH_COLS[5]},
  {x:4,y:2,v:ANCH_COLS[6]},
  {x:2,y:4,v:ANCH_COLS[7]},
  {x:2,y:2,v:AC},
];

var SYMBOL_COORDS = (function(){
  var coords=[];
  for(var y=0;y<5;y++){
    var xs = (y%2===0)?[0,1,2,3,4]:[4,3,2,1,0];
    for(var k=0;k<xs.length;k++){
      var x=xs[k];
      var key=String(x)+','+String(y);
      if(ANCH_KEYS.has(key)) continue;
      coords.push([x,y]);
    }
  }
  return coords;
})();

function bitsToBytes(bits){
  var n=Math.ceil(bits.length/8);
  var arr=new Uint8Array(n);
  var b=0;
  for(var i=0;i<bits.length;i++){
    b=(b<<1)|(bits[i]&1);
    if((i&7)===7){
      arr[(i>>3)]=b;
      b=0;
    }
  }
  var rem=bits.length&7;
  if(rem) arr[(bits.length>>3)]=b<<(8-rem);
  return arr;
}

function crc8(data){
  var crc=0;
  for(var i=0;i<data.length;i++){
    crc^=data[i];
    for(var b=0;b<8;b++) crc=(crc&0x80)?(((crc<<1)^0x31)&0xFF):((crc<<1)&0xFF);
  }
  return crc&0xFF;
}

function decodeV2(symbols){
  if(!symbols||symbols.length!==16) return {ok:false};
  var bits=[];
  for(var i=0;i<16;i++){
    var v=symbols[i]&31;
    for(var b=4;b>=0;b--) bits.push((v>>b)&1);
  }
  var ver=(bits[0]<<2)|(bits[1]<<1)|bits[2];
  var s=(bits[4]<<2)|(bits[5]<<1)|bits[6];
  var L=(bits[7]<<3)|(bits[8]<<2)|(bits[9]<<1)|bits[10];
  var off=11;
  for(var j=0;j<L && off+6<=72;j++) off+=6;
  var payloadBits=bits.slice(0,off);
  var crcBits=bits.slice(off,off+8);
  var crcBytes=bitsToBytes(payloadBits);
  var expect=crc8(crcBytes);
  var got=0;
  for(var k=0;k<8;k++) got=(got<<1)|(crcBits[k]&1);
  return { ok: ver===2 && ((got&0xFF)===(expect&0xFF)), serviceCode: s|0 };
}

function freeIdxAtExact(data,i){
  var r=data[i]|0, g=data[i+1]|0, b=data[i+2]|0;
  var k=((r&255)<<16)|((g&255)<<8)|(b&255);
  var ex=RGB_TO_FREE.get(k);
  return ex==null?null:ex;
}

function freeIdxAtSafe(data,i){
  var ex=freeIdxAtExact(data,i);
  if(ex!=null) return ex;
  var r=data[i]|0, g=data[i+1]|0, b=data[i+2]|0;
  var best=0, bd=1e12;
  for(var j=0;j<FREE32.length;j++){
    var c=FREE32[j];
    var dr=r-c[0], dg=g-c[1], db=b-c[2];
    var d=dr*dr+dg*dg+db*db;
    if(d<bd){ bd=d; best=j; if(d===0) break; }
  }
  return best;
}

function anchorsMatchExact(data,w,h,x0,y0,s){
  if(x0<0||y0<0) return false;
  var size=5*s;
  if(x0+size>=w||y0+size>=h) return false;
  var mid=Math.max(0,Math.floor(s/2));
  for(var i=0;i<ANCH_POS.length;i++){
    var a=ANCH_POS[i];
    var cx=(x0+a.x*s+mid)|0;
    var cy=(y0+a.y*s+mid)|0;
    if(cx<0||cy<0||cx>=w||cy>=h) return false;
    var idx=(cy*w+cx)*4;
    var ex=freeIdxAtExact(data,idx);
    if(ex==null) return false;
    var fi=ex%FREE32.length;
    if(fi!==(a.v%FREE32.length)) return false;
  }
  return true;
}

function tryDecodeAtSafe(data,w,h,x0,y0,s){
  if(x0<0||y0<0) return null;
  var size=5*s;
  if(x0+size>=w||y0+size>=h) return null;
  var mid=Math.max(0,Math.floor(s/2));
  for(var i=0;i<ANCH_POS.length;i++){
    var a=ANCH_POS[i];
    var cx=(x0+a.x*s+mid)|0;
    var cy=(y0+a.y*s+mid)|0;
    if(cx<0||cy<0||cx>=w||cy>=h) return null;
    var idx=(cy*w+cx)*4;
    var fi=(freeIdxAtSafe(data,idx)%FREE32.length)|0;
    if(fi!==((a.v%FREE32.length)|0)) return null;
  }
  var symbols=[];
  for(var k=0;k<SYMBOL_COORDS.length;k++){
    var p=SYMBOL_COORDS[k];
    var sx=p[0]|0, sy=p[1]|0;
    var cx2=(x0+sx*s+mid)|0;
    var cy2=(y0+sy*s+mid)|0;
    if(cx2<0||cy2<0||cx2>=w||cy2>=h) return null;
    var idx2=(cy2*w+cx2)*4;
    var fi2=(freeIdxAtSafe(data,idx2)%FREE32.length)|0;
    symbols.push(fi2);
  }
  var d=decodeV2(symbols);
  if(!d||!d.ok) return null;
  return { symbols: symbols, x0: x0|0, y0: y0|0, size: size|0 };
}

function tryDecodeAtFast(data,w,h,x0,y0,s){
  if(!anchorsMatchExact(data,w,h,x0,y0,s)) return null;
  var size=5*s;
  var mid=Math.max(0,Math.floor(s/2));
  var symbols=[];
  for(var k=0;k<SYMBOL_COORDS.length;k++){
    var p=SYMBOL_COORDS[k];
    var sx=p[0]|0, sy=p[1]|0;
    var cx=(x0+sx*s+mid)|0;
    var cy=(y0+sy*s+mid)|0;
    if(cx<0||cy<0||cx>=w||cy>=h) return null;
    var idx=(cy*w+cx)*4;
    var fi=(freeIdxAtSafe(data,idx)%FREE32.length)|0;
    symbols.push(fi);
  }
  var d=decodeV2(symbols);
  if(!d||!d.ok) return null;
  return { symbols: symbols, x0: x0|0, y0: y0|0, size: size|0 };
}

var lastFound = null;
var lastFuzzyScanTs = 0;
var lastRobustScanTs = 0;
var lastAnyFoundTs = 0;
var robustScanState = null;
var fuzzyScanState = null;
var scanPhase = 0;

function resetState(){
  lastFound = null;
  lastFuzzyScanTs = 0;
  lastRobustScanTs = 0;
  lastAnyFoundTs = 0;
  robustScanState = null;
  fuzzyScanState = null;
  scanPhase = 0;
}

function detectOnPixels(data,w,h,nowTs){
  if(!data||w<=0||h<=0) return [];
  var t0 = (typeof performance!=='undefined' && performance && performance.now) ? performance.now() : nowTs;
  var maxItems=6;
  var items=[];
  var boxes=[];

  function isOverlapping(x0,y0,size){
    var pad=Math.max(2,Math.floor(size/5));
    var l=x0-pad, t=y0-pad, r=x0+size+pad, b=y0+size+pad;
    for(var i=0;i<boxes.length;i++){
      var bb=boxes[i];
      var pad2=Math.max(2,Math.floor(bb.size/5));
      var l2=bb.x0-pad2, t2=bb.y0-pad2, r2=bb.x0+bb.size+pad2, b2=bb.y0+bb.size+pad2;
      if(l<r2 && r>l2 && t<b2 && b>t2) return true;
    }
    return false;
  }

  function addItem(r){
    if(items.length>=maxItems) return;
    items.push({ symbols: r.symbols, x0: r.x0|0, y0: r.y0|0, size: r.size|0 });
    boxes.push({ x0: r.x0|0, y0: r.y0|0, size: r.size|0 });
    lastAnyFoundTs = nowTs;
    robustScanState = null;
    fuzzyScanState = null;
  }

  var prefer = lastFound;
  if(prefer){
    var r0 = tryDecodeAtFast(data,w,h,prefer.x0|0,prefer.y0|0,prefer.s|0);
    if(r0) addItem(r0);
    if(!r0){
      var r1 = tryDecodeAtSafe(data,w,h,prefer.x0|0,prefer.y0|0,prefer.s|0);
      if(r1) addItem(r1);
    }
  }

  var step = 4;
  var thrMain = 12000;
  scanPhase = (scanPhase + 1) | 0;
  var phase = scanPhase | 0;
  var ox = (phase % step) | 0;
  var oy = (((phase / step) | 0) % step) | 0;
  var scales = [1,2,3,4,5,6,8,10,12,16];
  var scalesRobust = [1,2,3,4,5,6,8,10,12,16,20,24];
  var ac = FREE32[AC%FREE32.length];

  function nearAc(i,thr){
    var r=data[i]|0, g=data[i+1]|0, b=data[i+2]|0;
    var dr=r-ac[0], dg=g-ac[1], db=b-ac[2];
    var d=dr*dr+dg*dg+db*db;
    return d<=thr;
  }

  for(var y=oy;y<h;y+=step){
    var row=y*w*4;
    for(var x=ox;x<w;x+=step){
      if(items.length>=maxItems) break;
      var i=row+x*4;
      var ex=freeIdxAtExact(data,i);
      var match=false;
      if(ex!=null && (ex%FREE32.length)===(AC%FREE32.length)) match=true;
      else if(nearAc(i,thrMain)) match=true;
      if(!match) continue;
      for(var si=0;si<scales.length;si++){
        if(items.length>=maxItems) break;
        var s=scales[si]|0;
        var x0=(x-2*s)|0;
        var y0=(y-2*s)|0;
        var size=5*s;
        if(isOverlapping(x0,y0,size)) continue;
        var rr=tryDecodeAtFast(data,w,h,x0,y0,s);
        if(rr){ addItem(rr); break; }
        var rrS=tryDecodeAtSafe(data,w,h,x0,y0,s);
        if(rrS){ addItem(rrS); break; }
        var off=Math.max(1,Math.floor(s/3));
        for(var dy=-off;dy<=off;dy+=off){
          for(var dx=-off;dx<=off;dx+=off){
            if(!dx && !dy) continue;
            var x1=(x0+dx)|0;
            var y1=(y0+dy)|0;
            if(isOverlapping(x1,y1,size)) continue;
            var rr2=tryDecodeAtFast(data,w,h,x1,y1,s);
            if(rr2){ addItem(rr2); dy=off+1; break; }
            var rr2s=tryDecodeAtSafe(data,w,h,x1,y1,s);
            if(rr2s){ addItem(rr2s); dy=off+1; break; }
          }
        }
      }
    }
    if(items.length>=maxItems) break;
  }

  if(!items.length){
    var hungry = (nowTs - lastAnyFoundTs) > 4200;
    var stepR = hungry ? 3 : 6;
    var thrR = hungry ? 14000 : 9800;
    var budgetMs = hungry ? 10 : 6;

    if(!robustScanState || robustScanState.step!==stepR || robustScanState.thr!==thrR){
      if(nowTs - lastRobustScanTs > 1800){
        lastRobustScanTs = nowTs;
        robustScanState = { x:0, y:0, step:stepR, thr:thrR };
      }
    }

    if(robustScanState){
      var y2 = robustScanState.y|0;
      var xStart = robustScanState.x|0;
      for(; y2<h; y2+=robustScanState.step){
        var row2=y2*w*4;
        for(var x2=xStart; x2<w; x2+=robustScanState.step){
          if(items.length>=maxItems) break;
          var ti = (typeof performance!=='undefined' && performance && performance.now) ? performance.now() : Date.now();
          if(ti - t0 > budgetMs){
            robustScanState.x = x2;
            robustScanState.y = y2;
            xStart = 0;
            y2 = h;
            break;
          }
          var ii=row2+x2*4;
          if(!nearAc(ii, robustScanState.thr)) continue;
          for(var si2=0; si2<scalesRobust.length; si2++){
            if(items.length>=maxItems) break;
            var s2=scalesRobust[si2]|0;
            var xx0=(x2-2*s2)|0;
            var yy0=(y2-2*s2)|0;
            var size2=5*s2;
            if(isOverlapping(xx0,yy0,size2)) continue;
            var rr3=tryDecodeAtSafe(data,w,h,xx0,yy0,s2);
            if(!rr3) continue;
            addItem(rr3);
            break;
          }
        }
        if(items.length>=maxItems) break;
        xStart = 0;
      }

      if(items.length){
        robustScanState = null;
      } else {
        if(y2>=h) robustScanState = null;
      }
    }
  }

  var fuzzyAllowed = (nowTs - lastFuzzyScanTs > 3200) || !!fuzzyScanState;
  if(fuzzyAllowed){
    if(!fuzzyScanState) lastFuzzyScanTs = nowTs;
    var thr=7800;
    var step2=16;
    var budgetMs2=4;
    if(!fuzzyScanState) fuzzyScanState = { x:0, y:0 };
    var y3=fuzzyScanState.y|0;
    var xStart2=fuzzyScanState.x|0;
    for(; y3<h; y3+=step2){
      var row3=y3*w*4;
      for(var x3=xStart2; x3<w; x3+=step2){
        if(items.length>=maxItems) break;
        var ti2 = (typeof performance!=='undefined' && performance && performance.now) ? performance.now() : Date.now();
        if(ti2 - t0 > budgetMs2){
          fuzzyScanState.x = x3;
          fuzzyScanState.y = y3;
          xStart2 = 0;
          y3 = h;
          break;
        }
        var iii=row3+x3*4;
        if(!nearAc(iii,thr)) continue;
        for(var si3=0; si3<scalesRobust.length; si3++){
          if(items.length>=maxItems) break;
          var s3=scalesRobust[si3]|0;
          var xxx0=(x3-2*s3)|0;
          var yyy0=(y3-2*s3)|0;
          var size3=5*s3;
          if(isOverlapping(xxx0,yyy0,size3)) continue;
          var rr4=tryDecodeAtSafe(data,w,h,xxx0,yyy0,s3);
          if(!rr4) continue;
          addItem(rr4);
          break;
        }
      }
      if(items.length>=maxItems) break;
      xStart2 = 0;
    }

    if(items.length){
      fuzzyScanState = null;
    } else {
      if(y3>=h) fuzzyScanState = null;
    }
  }

  if(items.length){
    var first=items[0];
    lastFound = { x0: first.x0|0, y0: first.y0|0, s: Math.max(1, Math.round((first.size|0)/5)) };
  }

  return items;
}

self.onmessage = function(ev){
  var msg = ev && ev.data ? ev.data : null;
  if(!msg || !msg.type) return;

  if(msg.type==='init'){
    FREE32 = Array.isArray(msg.palette) ? msg.palette : null;
    if(!FREE32 || !FREE32.length){ FREE32 = null; RGB_TO_FREE = null; return; }
    RGB_TO_FREE = new Map();
    for(var i=0;i<FREE32.length;i++){
      var c=FREE32[i];
      var k=((c[0]&255)<<16)|((c[1]&255)<<8)|(c[2]&255);
      RGB_TO_FREE.set(k,i);
    }
    return;
  }

  if(msg.type==='reset'){
    resetState();
    return;
  }

  if(msg.type==='scan'){
    if(!FREE32 || !RGB_TO_FREE){
      try{ self.postMessage({ type:'result', jobId: (msg.jobId|0)||0, epoch:(msg.epoch|0)||0, items: [] }); }catch(e){}
      return;
    }
    var w=(msg.width|0)||0;
    var h=(msg.height|0)||0;
    var buf=msg.pixels;
    var data=null;
    try{ data=new Uint8ClampedArray(buf); }catch(e){ data=null; }
    var items=[];
    try{ if(data) items = detectOnPixels(data,w,h,Date.now()); }catch(e){ items=[]; }
    try{ self.postMessage({ type:'result', jobId: (msg.jobId|0)||0, epoch:(msg.epoch|0)||0, items: items||[] }); }catch(e){}
  }
};
`;
}
