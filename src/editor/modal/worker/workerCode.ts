
export function generateWorkerCode(): string {
  return `
    
    var cancelled = new Map();
    var currentPreviewJob = 0; 
    var workerPoolInfo = { available: false, size: 0, readyCount: 0 };
    var hasWorkerPool = false;
    var dbg = function(m, extra){
      try { self.postMessage({ type: 'debug', message: String(m||''), extra: (extra===undefined?null:extra) }); } catch(_d){}
    };
    var qmethod = 'rgb';
    
    
    var stripeJobs = new Map();
    var jobCtx = new Map();
    
    
    function clampByte(v){ return v < 0 ? 0 : v > 255 ? 255 : v|0; }
    function s2l(v){ var x=v/255; return x<=0.04045? x/12.92 : Math.pow((x+0.055)/1.055,2.4); }
    function toYCbCr(r,g,b){ var Y=0.299*r+0.587*g+0.114*b; var Cb=-0.168736*r-0.331264*g+0.5*b; var Cr=0.5*r-0.418688*g-0.081312*b; return [Y,Cb,Cr]; }
    function toOklab(r8,g8,b8){ var r=s2l(r8), g=s2l(g8), b=s2l(b8); var l=0.4122214708*r+0.5363325363*g+0.0514459929*b; var m=0.2119034982*r+0.6806995451*g+0.1073969566*b; var s=0.0883024619*r+0.2817188376*g+0.6299787005*b; var l_=Math.cbrt(l), m_=Math.cbrt(m), s_=Math.cbrt(s); var L=0.2104542553*l_+0.7936177850*m_-0.0040720468*s_; var A=1.9779984951*l_-2.4285922050*m_+0.4505937099*s_; var B=0.0259040371*l_+0.7827717662*m_-0.8086757660*s_; return [L,A,B]; }
    function distRgb(r,g,b, pr,pg,pb){ var dr=r-pr, dg=g-pg, db=b-pb; return dr*dr+dg*dg+db*db; }
    function distLinear(r,g,b, pr,pg,pb){ var rl=s2l(r), gl=s2l(g), bl=s2l(b); var prl=s2l(pr), pgl=s2l(pg), pbl=s2l(pb); var dr=rl-prl, dg=gl-pgl, db=bl-pbl; return dr*dr+dg*dg+db*db; }
    function distYCbCr(r,g,b, pr,pg,pb){ var a=toYCbCr(r,g,b), p=toYCbCr(pr,pg,pb); var dy=a[0]-p[0], dcb=a[1]-p[1], dcr=a[2]-p[2]; return dy*dy+dcb*dcb+dcr*dcr; }
    function distOklab(r,g,b, pr,pg,pb){ var a=toOklab(r,g,b), p=toOklab(pr,pg,pb); var d0=a[0]-p[0], d1=a[1]-p[1], d2=a[2]-p[2]; return d0*d0+d1*d1+d2*d2; }
    function nearestPaletteColor(r,g,b,pal){ var bi=0, bd=Infinity; for(var i=0;i<pal.length;i++){ var pr=pal[i][0]|0, pg=pal[i][1]|0, pb=pal[i][2]|0; var d; if(qmethod==='linear'){ d=distLinear(r,g,b,pr,pg,pb); } else if(qmethod==='ycbcr'){ d=distYCbCr(r,g,b,pr,pg,pb); } else if(qmethod==='oklab'){ d=distOklab(r,g,b,pr,pg,pb); } else { d=distRgb(r,g,b,pr,pg,pb); } if(d<bd){ bd=d; bi=i; } } var p=pal[bi]; return [p[0]|0,p[1]|0,p[2]|0]; }
    function findDarkerColor(r,g,b,palette,fallbackR,fallbackG,fallbackB){ var origBrightness=0.299*(r/255)+0.587*(g/255)+0.114*(b/255); var bestColor=[fallbackR,fallbackG,fallbackB]; var bestBrightness=0.299*(fallbackR/255)+0.587*(fallbackG/255)+0.114*(fallbackB/255); for(var i=0;i<palette.length;i++){ var c=palette[i]; var brightness=0.299*(c[0]/255)+0.587*(c[1]/255)+0.114*(c[2]/255); if(brightness<=origBrightness&&brightness<bestBrightness){ bestColor=c; bestBrightness=brightness; } } return bestColor; }
    
    function dErrorPaletteCanvas(canvas, palette, kernel, div, serpentine, errorScale){ 
      try {
        var cx=canvas.getContext('2d',{willReadFrequently:true}); 
        var img=cx.getImageData(0,0,canvas.width,canvas.height); 
        var w=img.width,h=img.height; 
        var s=Math.max(0,Math.min(1,(typeof errorScale==='number'?errorScale:1))); 
        
        for (var y=0;y<h;y++){ 
          var ltr=(serpentine!==false? ((y%2)===0) : true); 
          var xStart=ltr?0:w-1; var xEnd=ltr?w:-1; var step=ltr?1:-1; 
          for (var x=xStart; x!==xEnd; x+=step){ 
            var i=(y*w+x)*4; 
            var oldR=img.data[i], oldG=img.data[i+1], oldB=img.data[i+2]; 
            var np=nearestPaletteColor(oldR,oldG,oldB,palette); 
            var nr=np[0], ng=np[1], nb=np[2]; 
            var errR=oldR-nr, errG=oldG-ng, errB=oldB-nb; 
            img.data[i]=nr; img.data[i+1]=ng; img.data[i+2]=nb; 
            
            for (var kk=0; kk<kernel.length; kk++){ 
              var k=kernel[kk]; 
              var dx=ltr? k.dx : -k.dx; 
              var xx=x+dx, yy=y+k.dy; 
              if (xx<0||yy<0||xx>=w||yy>=h) continue; 
              var j=(yy*w+xx)*4; 
              img.data[j]  = clampByte(img.data[j]  + s*((errR*k.w)/div)); 
              img.data[j+1]=clampByte(img.data[j+1] + s*((errG*k.w)/div)); 
              img.data[j+2]=clampByte(img.data[j+2] + s*((errB*k.w)/div)); 
            } 
          } 
        } 
        
        cx.putImageData(img,0,0); 
        return canvas;
      } catch(e) {
        return canvas; 
      }
    }
    
    function dOrderedPalette(canvas, palette, matrix, strength){ 
      try {
        var cx=canvas.getContext('2d',{willReadFrequently:true}); 
        var img=cx.getImageData(0,0,canvas.width,canvas.height); 
        var data=img.data; var w=img.width,h=img.height,mw=matrix[0].length,mh=matrix.length,den=mw*mh; 
        
        
        var s = Math.max(0, Math.min(1, strength || 0.5));
        var noiseAmount = s * 64; 
        
        for (var y=0;y<h;y++){ 
          for (var x=0;x<w;x++){ 
            var i=(y*w+x)*4; 
            var r=data[i], g=data[i+1], b=data[i+2];
            
            
            var threshold = matrix[y%mh][x%mw]/den;
            var noise = (threshold - 0.5) * noiseAmount;
            
            var nr = Math.max(0, Math.min(255, r + noise));
            var ng = Math.max(0, Math.min(255, g + noise));  
            var nb = Math.max(0, Math.min(255, b + noise));
            
            
            var np = nearestPaletteColor(nr, ng, nb, palette);
            data[i] = np[0]; 
            data[i+1] = np[1]; 
            data[i+2] = np[2]; 
          } 
        } 
        
        cx.putImageData(img,0,0); 
        return canvas;
      } catch(e) {
        return canvas; 
      }
    }
    
    function dOrderedPalette2(canvas, palette, matrix, strength){ return dOrderedPalette(canvas, palette, matrix, strength); }
    function dRandomPalette(canvas, palette, strength){ var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,canvas.width,canvas.height); var data=img.data; var s=Math.max(0,Math.min(1, strength||0)); var amp=64*s; for (var i=0;i<data.length;i+=4){ var r=data[i], g=data[i+1], b=data[i+2]; var nr=Math.max(0,Math.min(255, r + (Math.random()-0.5)*2*amp)); var ng=Math.max(0,Math.min(255, g + (Math.random()-0.5)*2*amp)); var nb=Math.max(0,Math.min(255, b + (Math.random()-0.5)*2*amp)); var np=nearestPaletteColor(nr,ng,nb,palette); data[i]=np[0]; data[i+1]=np[1]; data[i+2]=np[2]; } cx.putImageData(img,0,0); return canvas; }
    function dither(canvas, levels, method){ if (!method||method==='none') return canvas; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,canvas.width,canvas.height); function put(){ var c=new OffscreenCanvas(img.width,img.height); var x=c.getContext('2d',{willReadFrequently:true}); x.putImageData(img,0,0); return c; }
      function dOrdered(matrix){ var w=img.width,h=img.height,mw=matrix[0].length,mh=matrix.length,den=mw*mh; for (var y=0;y<h;y++){ for (var x=0;x<w;x++){ var i=(y*w+x)*4; var t=matrix[y%mh][x%mw]/den; for (var c=0;c<3;c++){ var v=img.data[i+c]/255; var lv=Math.floor(v*(levels-1)); var frac=v*(levels-1)-lv; var up=(frac>=t)?lv+1:lv; img.data[i+c]=((up/(levels-1))*255)|0; } } } return put(); }
      function qChan(v){ if (levels<=1) return 0; var step=255/(levels-1); return Math.round(v/step)*step; }
      function dError(kernel,div){ var w=img.width,h=img.height; for (var y=0;y<h;y++){ var ltr=((y%2)===0); for (var x=ltr?0:w-1; ltr? x<w : x>=0; x+=ltr?1:-1){ var i=(y*w+x)*4; var oldR=img.data[i], oldG=img.data[i+1], oldB=img.data[i+2]; var newR=qChan(oldR), newG=qChan(oldG), newB=qChan(oldB); var errR=oldR-newR, errG=oldG-newG, errB=oldB-newB; img.data[i]=newR; img.data[i+1]=newG; img.data[i+2]=newB; for (var kk=0; kk<kernel.length; kk++){ var k=kernel[kk]; var dx=ltr? k.dx : -k.dx; var xx=x+dx, yy=y+k.dy; if (xx<0||yy<0||xx>=w||yy>=h) continue; var j=(yy*w+xx)*4; img.data[j]  = clampByte(img.data[j]  + (errR*k.w)/div);
          img.data[j+1]= clampByte(img.data[j+1]+ (errG*k.w)/div);
          img.data[j+2]= clampByte(img.data[j+2]+ (errB*k.w)/div); } } } return put(); }
      
      var BAYER2=[[0,2],[3,1]]; 
      var BAYER4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
      var BAYER8=[[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
      
      switch(method){
        case 'bayer2': return dOrdered(BAYER2);
        case 'bayer4': return dOrdered(BAYER4);
        case 'bayer8': return dOrdered(BAYER8);
        case 'custom': return dOrdered(BAYER8);
        case 'floyd': return dError([{dx:1,dy:0,w:7},{dx:-1,dy:1,w:3},{dx:0,dy:1,w:5},{dx:1,dy:1,w:1}],16);
        case 'falsefloydsteinberg': return dError([{dx:1,dy:0,w:3},{dx:0,dy:1,w:3},{dx:1,dy:1,w:2}],8);
        case 'burkes': return dError([{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2}],32);
        case 'jarvis': return dError([{dx:1,dy:0,w:7},{dx:2,dy:0,w:5},{dx:-2,dy:1,w:3},{dx:-1,dy:1,w:5},{dx:0,dy:1,w:7},{dx:1,dy:1,w:5},{dx:2,dy:1,w:3},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:3},{dx:0,dy:2,w:5},{dx:1,dy:2,w:3},{dx:2,dy:2,w:1}],48);
        case 'stucki': return dError([{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:4},{dx:1,dy:2,w:2},{dx:2,dy:2,w:1}],42);
        case 'sierra': return dError([{dx:1,dy:0,w:5},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:5},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:3},{dx:1,dy:2,w:2}],32);
        case 'twosierra': return dError([{dx:1,dy:0,w:4},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:1},{dx:-1,dy:1,w:2},{dx:0,dy:1,w:3},{dx:1,dy:1,w:2},{dx:2,dy:1,w:1}],16);
        case 'sierralite': return dError([{dx:1,dy:0,w:2},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1}],4);
        case 'atkinson': return dError([{dx:1,dy:0,w:1},{dx:2,dy:0,w:1},{dx:-1,dy:1,w:1},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1},{dx:0,dy:2,w:1}],8);
        case 'random': var w=img.width,h=img.height; for (var y=0;y<h;y++){ for (var x=0;x<w;x++){ var i=(y*w+x)*4; var t=Math.random(); for (var c=0;c<3;c++){ var v=img.data[i+c]/255; var lv=Math.floor(v*(levels-1)); var frac=v*(levels-1)-lv; var up=(frac>=t)?lv+1:lv; img.data[i+c]=((up/(levels-1))*255)|0; } } } return put();
      }
      return canvas; }
    
    function applyColorCorrection(canvas, enabled, brightness, contrast, saturation, hue, gamma){
      try {
        if (!enabled) return canvas;
        var cx = canvas.getContext('2d', { willReadFrequently: true });
        var img = cx.getImageData(0,0,canvas.width,canvas.height);
        var d = img.data;
        var bAdd = (brightness|0); 
        var cVal = (contrast|0);   
        var sVal = (saturation|0); 
        var hVal = (hue|0);        
        var cFactor = (259*(cVal+255))/(255*(259-cVal));
        var sFactor = 1 + (sVal/100);
        var rad = (hVal||0) * Math.PI/180;
        var cosA = Math.cos(rad), sinA = Math.sin(rad);
        var gVal = Math.max(0.2, Math.min(5, Number(gamma)||1));
        var invG = 1 / gVal;
        
        var q11=0.299, q12=0.587, q13=0.114;
        var r2y=0.299, g2y=0.587, b2y=0.114;
        var r2i=0.595716, g2i=-0.274453, b2i=-0.321263;
        var r2q=0.211456, g2q=-0.522591, b2q=0.311135;
        var y2r=1.0,    i2r=0.9563,  q2r=0.6210;
        var y2g=1.0,    i2g=-0.2721, q2g=-0.6474;
        var y2b=1.0,    i2b=-1.1070, q2b=1.7046;
        
        var bAdd255 = (bAdd/100)*255;
        for (var i=0; i<d.length; i+=4){
          var r=d[i], g=d[i+1], b=d[i+2];
          
          if (hVal){
            var Y = r2y*r + g2y*g + b2y*b;
            var I = r2i*r + g2i*g + b2i*b;
            var Q = r2q*r + g2q*g + b2q*b;
            var I2 = I*cosA - Q*sinA;
            var Q2 = I*sinA + Q*cosA;
            r = clampByte(Y*y2r + I2*i2r + Q2*q2r);
            g = clampByte(Y*y2g + I2*i2g + Q2*q2g);
            b = clampByte(Y*y2b + I2*i2b + Q2*q2b);
          }
          
          if (sVal){
            var gray = (0.299*r + 0.587*g + 0.114*b);
            r = clampByte(gray + (r - gray)*sFactor);
            g = clampByte(gray + (g - gray)*sFactor);
            b = clampByte(gray + (b - gray)*sFactor);
          }
          
          if (cVal){
            r = clampByte(cFactor*(r-128)+128);
            g = clampByte(cFactor*(g-128)+128);
            b = clampByte(cFactor*(b-128)+128);
          }
          
          if (bAdd){
            r = clampByte(r + bAdd255);
            g = clampByte(g + bAdd255);
            b = clampByte(b + bAdd255);
          }
          if (gVal !== 1) {
            r = clampByte(Math.pow(r/255, invG) * 255);
            g = clampByte(Math.pow(g/255, invG) * 255);
            b = clampByte(Math.pow(b/255, invG) * 255);
          }
          d[i]=r; d[i+1]=g; d[i+2]=b;
        }
        cx.putImageData(img,0,0);
        return canvas;
      } catch(e){ return canvas; }
    }
    function quantizeToPalette(canvas, palette){ var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,canvas.width,canvas.height); var data=img.data; for (var i=0;i<data.length;i+=4){ var a=data[i+3]; if (a<128){ data[i]=0; data[i+1]=0; data[i+2]=0; data[i+3]=0; continue; } var r=data[i], g=data[i+1], b=data[i+2]; var np=nearestPaletteColor(r,g,b,palette); data[i]=np[0]; data[i+1]=np[1]; data[i+2]=np[2]; data[i+3]=255; } cx.putImageData(img,0,0); return canvas; }
    function simplifyRegions(canvas, minArea){ try{ var thr=Math.max(1, (minArea|0)); if (thr<=1) return canvas; var w=canvas.width|0,h=canvas.height|0; if (w===0||h===0) return canvas; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; var visited=new Uint8Array(w*h); var qx=new Int32Array(w*h); var qy=new Int32Array(w*h); function idx(x,y){ return (y*w+x)*4; } var qs=0,qe=0; for (var y=0;y<h;y++){ for (var x=0;x<w;x++){ var li=y*w+x; if (visited[li]) continue; var p=li*4; var a=d[p+3]|0; if (a<128){ visited[li]=1; continue; } var r0=d[p]|0,g0=d[p+1]|0,b0=d[p+2]|0; var key=((r0<<16)|(g0<<8)|b0)>>>0; visited[li]=1; qs=0; qe=0; qx[qe]=x; qy[qe]=y; qe++; var comp=[]; var borderColors={}; while(qs<qe){ var cx0=qx[qs], cy0=qy[qs]; qs++; var pi=idx(cx0,cy0); comp.push(pi); var nb=[[1,0],[-1,0],[0,1],[0,-1]]; for (var k=0;k<4;k++){ var nx=cx0+nb[k][0], ny=cy0+nb[k][1]; if (nx<0||ny<0||nx>=w||ny>=h) continue; var l2=ny*w+nx; if (visited[l2]) continue; var p2=idx(nx,ny); var a2=d[p2+3]|0; if (a2<128){ visited[l2]=1; continue; } var r=d[p2]|0,g=d[p2+1]|0,b=d[p2+2]|0; var k2=((r<<16)|(g<<8)|b)>>>0; if (k2===key){ visited[l2]=1; qx[qe]=nx; qy[qe]=ny; qe++; } else { borderColors[k2]=(borderColors[k2]||0)+1; } } }
        if (comp.length>0 && comp.length<thr){ var bestKey=-1,bestCnt=-1; for (var ks in borderColors){ var c=borderColors[ks]|0; if (c>bestCnt){ bestCnt=c; bestKey=(ks|0); } } if (bestKey>=0){ var nr=(bestKey>>>16)&255, ng=(bestKey>>>8)&255, nb=bestKey&255; for (var ii=0;ii<comp.length;ii++){ var pp=comp[ii]; d[pp]=nr; d[pp+1]=ng; d[pp+2]=nb; d[pp+3]=255; } } }
      } }
      cx.putImageData(img,0,0); return canvas; } catch(_){ return canvas; } }
    function erodeInward(canvas, amount){ var a=Math.max(0, amount|0); if (a<=0) return canvas; var w=canvas.width,h=canvas.height; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var data=img.data; var mask=new Uint8Array(w*h); for (var i=0,p=0;i<mask.length;i++,p+=4) mask[i]=data[p+3]>=128?1:0; var er=new Uint8Array(mask); var tmp=new Uint8Array(mask.length); function erodeOnce(){ tmp.fill(0); for (var y=0;y<h;y++){ for (var x=0;x<w;x++){ var ii=y*w+x; if (!er[ii]) { tmp[ii]=0; continue; } var okL=(x>0)?er[ii-1]:0; var okR=(x+1<w)?er[ii+1]:0; var okU=(y>0)?er[ii-w]:0; var okD=(y+1<h)?er[ii+w]:0; tmp[ii]=(okL&&okR&&okU&&okD)?1:0; } } er.set(tmp); }
      for (var k=0;k<a;k++) erodeOnce(); for (var i2=0,p2=0;i2<er.length;i2++,p2+=4){ if (!er[i2]) data[p2+3]=0; } cx.putImageData(img,0,0); return canvas; }
    function drawBlackOutline(canvas, thickness){ var t=Math.max(0, thickness|0); if (t<=0) return canvas; var w=canvas.width,h=canvas.height; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var data=img.data; var mask=new Uint8Array(w*h); for (var i=0,p=0;i<mask.length;i++,p+=4) mask[i]=data[p+3]>=128?1:0; var dil=new Uint8Array(mask); var tmp=new Uint8Array(mask.length); function dilOnce(){ tmp.fill(0); for (var y=0;y<h;y++){ for (var x=0;x<w;x++){ var ii=y*w+x; if (dil[ii]) { tmp[ii]=1; continue; } if ((x>0&&dil[ii-1])||(x+1<w&&dil[ii+1])||(y>0&&dil[ii-w])||(y+1<h&&dil[ii+w])) tmp[ii]=1; } } dil.set(tmp); }
      for (var k2=0;k2<t;k2++) dilOnce(); for (var y4=0;y4<h;y4++){ for (var x4=0;x4<w;x4++){ var i3=y4*w+x4; if (dil[i3] && !mask[i3]){ var p4=i3*4; data[p4]=0; data[p4+1]=0; data[p4+2]=0; data[p4+3]=255; } } } cx.putImageData(img,0,0); return canvas; }

    function sobelEdgeMask(canvas, threshold, thin){ try{ var w=canvas.width|0,h=canvas.height|0; if(w===0||h===0) return new Uint8Array(0); var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; var gxk=[-1,0,1,-2,0,2,-1,0,1]; var gyk=[-1,-2,-1,0,0,0,1,2,1]; var mag=new Float32Array(w*h); var dir = thin ? new Int8Array(w*h) : null; for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var sx=0,sy=0,k=0; for(var dy=-1;dy<=1;dy++){ var yy=y+dy; var off=yy*w; for(var dx=-1;dx<=1;dx++){ var xx=x+dx; var p=((off+xx)*4)|0; var L=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]; var gxx=gxk[k], gyy=gyk[k]; k++; sx+=gxx*L; sy+=gyy*L; } } var m=Math.abs(sx)+Math.abs(sy); mag[y*w+x]=m; if(dir){ var ax=Math.abs(sx), ay=Math.abs(sy); var idx=0; if(ax>=ay) idx=0; else idx=1; dir[y*w+x]=idx; } } } var thr=Math.max(0, threshold|0); var mask=new Uint8Array(w*h); if(thin && dir){ for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var i=y*w+x; var m=mag[i]; if(m<thr) continue; var d0=dir[i]; var m1=0,m2=0; if(d0===0){ m1=mag[i-1]; m2=mag[i+1]; } else { m1=mag[i-w]; m2=mag[i+w]; } if(m>=m1 && m>=m2) mask[i]=1; } } } else { for(var i2=0;i2<mask.length;i2++){ if(mag[i2]>=thr) mask[i2]=1; } } return mask; } catch(_){ return new Uint8Array(0); } }

    function prewittEdgeMask(canvas, threshold, thin){ try{ var w=canvas.width|0,h=canvas.height|0; if(w===0||h===0) return new Uint8Array(0); var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; var gxk=[-1,0,1,-1,0,1,-1,0,1]; var gyk=[1,1,1,0,0,0,-1,-1,-1]; var mag=new Float32Array(w*h); var dir = thin ? new Int8Array(w*h) : null; for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var sx=0,sy=0,k=0; for(var dy=-1;dy<=1;dy++){ var yy=y+dy; var off=yy*w; for(var dx=-1;dx<=1;dx++){ var xx=x+dx; var p=((off+xx)*4)|0; var L=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]; var gxx=gxk[k], gyy=gyk[k]; k++; sx+=gxx*L; sy+=gyy*L; } } var m=Math.abs(sx)+Math.abs(sy); mag[y*w+x]=m; if(dir){ var ax=Math.abs(sx), ay=Math.abs(sy); var idx=0; if(ax>=ay) idx=0; else idx=1; dir[y*w+x]=idx; } } } var thr=Math.max(0, threshold|0); var mask=new Uint8Array(w*h); if(thin && dir){ for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var i=y*w+x; var m=mag[i]; if(m<thr) continue; var d0=dir[i]; var m1=0,m2=0; if(d0===0){ m1=mag[i-1]; m2=mag[i+1]; } else { m1=mag[i-w]; m2=mag[i+w]; } if(m>=m1 && m>=m2) mask[i]=1; } } } else { for(var i2=0;i2<mask.length;i2++){ if(mag[i2]>=thr) mask[i2]=1; } } return mask; } catch(_){ return new Uint8Array(0); } }

    function scharrEdgeMask(canvas, threshold, thin){ try{ var w=canvas.width|0,h=canvas.height|0; if(w===0||h===0) return new Uint8Array(0); var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; var gxk=[3,0,-3,10,0,-10,3,0,-3]; var gyk=[3,10,3,0,0,0,-3,-10,-3]; var mag=new Float32Array(w*h); var dir = thin ? new Int8Array(w*h) : null; for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var sx=0,sy=0,k=0; for(var dy=-1;dy<=1;dy++){ var yy=y+dy; var off=yy*w; for(var dx=-1;dx<=1;dx++){ var xx=x+dx; var p=((off+xx)*4)|0; var L=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]; var gxx=gxk[k], gyy=gyk[k]; k++; sx+=gxx*L; sy+=gyy*L; } } var m=Math.abs(sx)+Math.abs(sy); mag[y*w+x]=m; if(dir){ var ax=Math.abs(sx), ay=Math.abs(sy); var idx=0; if(ax>=ay) idx=0; else idx=1; dir[y*w+x]=idx; } } } var thr=Math.max(0, threshold|0); var mask=new Uint8Array(w*h); if(thin && dir){ for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var i=y*w+x; var m=mag[i]; if(m<thr) continue; var d0=dir[i]; var m1=0,m2=0; if(d0===0){ m1=mag[i-1]; m2=mag[i+1]; } else { m1=mag[i-w]; m2=mag[i+w]; } if(m>=m1 && m>=m2) mask[i]=1; } } } else { for(var i2=0;i2<mask.length;i2++){ if(mag[i2]>=thr) mask[i2]=1; } } return mask; } catch(_){ return new Uint8Array(0); } }

    function laplacianEdgeMask(canvas, threshold){ try{ var w=canvas.width|0,h=canvas.height|0; if(w===0||h===0) return new Uint8Array(0); var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; var k=[0,1,0,1,-4,1,0,1,0]; var mag=new Float32Array(w*h); for(var y=1;y<h-1;y++){ for(var x=1;x<w-1;x++){ var s=0,idx=0; for(var dy=-1;dy<=1;dy++){ var yy=y+dy; var off=yy*w; for(var dx=-1;dx<=1;dx++){ var xx=x+dx; var p=((off+xx)*4)|0; var L=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]; s+=k[idx++]*L; } } mag[y*w+x]=Math.abs(s); } } var thr=Math.max(0, threshold|0); var mask=new Uint8Array(w*h); for(var i=0;i<mask.length;i++){ if(mag[i]>=thr) mask[i]=1; } return mask; } catch(_){ return new Uint8Array(0); } }

    function dilateMask(mask, w, h, times){ var out=new Uint8Array(mask); var tmp=new Uint8Array(mask.length); var t=Math.max(1, times|0); for(var s=0;s<t;s++){ tmp.fill(0); for(var y=0;y<h;y++){ for(var x=0;x<w;x++){ var i=y*w+x; if(out[i]){ tmp[i]=1; continue; } if((x>0&&out[i-1])||(x+1<w&&out[i+1])||(y>0&&out[i-w])||(y+1<h&&out[i+w])) tmp[i]=1; } } out.set(tmp); } return out; }

    function nearestInPalette(palette, r, g, b){ try{ if(!palette||!palette.length) return [r|0,g|0,b|0]; var np=nearestPaletteColor(r,g,b,palette); return [np[0]|0,np[1]|0,np[2]|0]; } catch(_){ return [r|0,g|0,b|0]; } }

    function overlayEdges(canvas, mask, r, g, b){ try{ var w=canvas.width|0,h=canvas.height|0; if((w*h)!==mask.length) return canvas; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; for(var i=0,p=0;i<mask.length;i++,p+=4){ if(mask[i]){ d[p]=r; d[p+1]=g; d[p+2]=b; d[p+3]=255; } } cx.putImageData(img,0,0); return canvas; } catch(_){ return canvas; } }
    function mixByMask(primary, secondary, mask, pickSecondaryOnMask){ try{ var w=primary.width|0,h=primary.height|0; if(w===0||h===0) return primary; if(((secondary.width|0)!==w)||((secondary.height|0)!==h)) return primary; if((w*h)!==mask.length) return primary; var cxA=primary.getContext('2d',{willReadFrequently:true}); var imgA=cxA.getImageData(0,0,w,h); var dA=imgA.data; var cxB=secondary.getContext('2d',{willReadFrequently:true}); var imgB=cxB.getImageData(0,0,w,h); var dB=imgB.data; for(var i=0,p=0;i<mask.length;i++,p+=4){ var m=mask[i]?1:0; var pickB=pickSecondaryOnMask?m:(1-m); if(pickB){ dA[p]=dB[p]; dA[p+1]=dB[p+1]; dA[p+2]=dB[p+2]; dA[p+3]=dB[p+3]; } } cxA.putImageData(imgA,0,0); return primary; } catch(_){ return primary; } }
    function mixByWeights(primary, secondary, weights, pickSecondaryOnMask){ try{ var w=primary.width|0,h=primary.height|0; if(w===0||h===0) return primary; if(((secondary.width|0)!==w)||((secondary.height|0)!==h)) return primary; if((w*h)!==weights.length) return primary; var cxA=primary.getContext('2d',{willReadFrequently:true}); var imgA=cxA.getImageData(0,0,w,h); var dA=imgA.data; var cxB=secondary.getContext('2d',{willReadFrequently:true}); var imgB=cxB.getImageData(0,0,w,h); var dB=imgB.data; for(var i=0,p=0;i<weights.length;i++,p+=4){ var wv=weights[i]; if(!isFinite(wv)) wv=0; if(!pickSecondaryOnMask) wv=1-wv; if(wv<=0) continue; if(wv>=1){ dA[p]=dB[p]; dA[p+1]=dB[p+1]; dA[p+2]=dB[p+2]; dA[p+3]=dB[p+3]; continue; } var ia=1-wv; dA[p]=(dA[p]*ia + dB[p]*wv)|0; dA[p+1]=(dA[p+1]*ia + dB[p+1]*wv)|0; dA[p+2]=(dA[p+2]*ia + dB[p+2]*wv)|0; dA[p+3]=(dA[p+3]*ia + dB[p+3]*wv)|0; } cxA.putImageData(imgA,0,0); return primary; } catch(_){ return primary; } }
    function blurMaskToWeights(mask, w, h, radius){ var r=Math.max(1, radius|0); var out=new Float32Array(w*h); for(var y=0;y<h;y++){ for(var x=0;x<w;x++){ var sum=0, cnt=0; var y0=Math.max(0,y-r), y1=Math.min(h-1,y+r); var x0=Math.max(0,x-r), x1=Math.min(w-1,x+r); for(var yy=y0; yy<=y1; yy++){ var off=yy*w; for(var xx=x0; xx<=x1; xx++){ sum += mask[off+xx]?1:0; cnt++; } } out[y*w+x] = cnt>0 ? (sum/cnt) : 0; } } return out; }

    function preBlur(canvas, mode, radius){ try{ var r=(radius|0); if(!mode||mode==='none'||r<=0) return canvas; if(mode==='box') return boxBlur(canvas,r); if(mode==='gaussian') return gaussianApprox(canvas,r); if(mode==='bilateral') return bilateral(canvas,r); if(mode==='kuwahara') return kuwahara(canvas,r); return canvas; } catch(_){ return canvas; } }
    function boxBlur(canvas, r){ var w=canvas.width|0,h=canvas.height|0; if(r<=0||w===0||h===0) return canvas; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var s=img.data; var tmp=new Uint8ClampedArray(s.length); var win=2*r+1; var i=0; for(var y=0;y<h;y++){ var rs=0,gs=0,bs=0,as=0; var yoff=y*w*4; var x0=0; var x1=0; for(var k=-r;k<=r;k++){ var xx=k<0?0:k; var p=(yoff+xx*4); rs+=s[p]; gs+=s[p+1]; bs+=s[p+2]; as+=s[p+3]; } for(var x=0;x<w;x++){ i=yoff+x*4; tmp[i]=(rs/win)|0; tmp[i+1]=(gs/win)|0; tmp[i+2]=(bs/win)|0; tmp[i+3]=(as/win)|0; x0=x-r; x1=x+r+1; if(x0<0) x0=0; if(x1>=w) x1=w-1; var p0=yoff+x0*4; var p1=yoff+x1*4; rs+=s[p1]-s[p0]; gs+=s[p1+1]-s[p0+1]; bs+=s[p1+2]-s[p0+2]; as+=s[p1+3]-s[p0+3]; } } var out=new Uint8ClampedArray(s.length); for(var x=0;x<w;x++){ var rs=0,gs=0,bs=0,as=0; var xoff=x*4; var y0=0; var y1=0; for(var k=-r;k<=r;k++){ var yy=k<0?0:k; var p=(yy*w*4+xoff); rs+=tmp[p]; gs+=tmp[p+1]; bs+=tmp[p+2]; as+=tmp[p+3]; } for(var y=0;y<h;y++){ i=y*w*4+xoff; out[i]=(rs/win)|0; out[i+1]=(gs/win)|0; out[i+2]=(bs/win)|0; out[i+3]=(as/win)|0; y0=y-r; y1=y+r+1; if(y0<0) y0=0; if(y1>=h) y1=h-1; var p0=y0*w*4+xoff; var p1=y1*w*4+xoff; rs+=tmp[p1]-tmp[p0]; gs+=tmp[p1+1]-tmp[p0+1]; bs+=tmp[p1+2]-tmp[p0+2]; as+=tmp[p1+3]-tmp[p0+3]; } } img.data.set(out); cx.putImageData(img,0,0); return canvas; }
    function gaussianApprox(canvas, r){ var passes=3; for(var i=0;i<passes;i++){ canvas=boxBlur(canvas,Math.max(1,(r|0))); } return canvas; }
    function bilateral(canvas, r){ var w=canvas.width|0,h=canvas.height|0; if(r<=0||w===0||h===0) return canvas; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var s=img.data; var out=new Uint8ClampedArray(s.length); var sr=25; var twoSr2=2*sr*sr; var twoSs2=2*r*r; for(var y=0;y<h;y++){ for(var x=0;x<w;x++){ var i=(y*w+x)*4; var r0=s[i],g0=s[i+1],b0=s[i+2],a0=s[i+3]; var wr=0,wg=0,wb=0,wa=0,wSum=0; for(var dy=-r;dy<=r;dy++){ var yy=y+dy; if(yy<0||yy>=h) continue; for(var dx=-r;dx<=r;dx++){ var xx=x+dx; if(xx<0||xx>=w) continue; var j=(yy*w+xx)*4; var dr=r0-s[j], dg=g0-s[j+1], db=b0-s[j+2]; var ds=dx*dx+dy*dy; var rc=dr*dr+dg*dg+db*db; var wgt=Math.exp(-ds/twoSs2)*Math.exp(-rc/twoSr2); wr+=s[j]*wgt; wg+=s[j+1]*wgt; wb+=s[j+2]*wgt; wa+=s[j+3]*wgt; wSum+=wgt; } } out[i]=(wr/wSum)|0; out[i+1]=(wg/wSum)|0; out[i+2]=(wb/wSum)|0; out[i+3]=(wa/wSum)|0; } } img.data.set(out); cx.putImageData(img,0,0); return canvas; }

    function kuwahara(canvas, r){ var w=canvas.width|0,h=canvas.height|0; if(r<=0||w===0||h===0) return canvas; var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var s=img.data; var out=new Uint8ClampedArray(s.length); var sw=w+1; var N=sw*(h+1); var iR=new Float64Array(N), iG=new Float64Array(N), iB=new Float64Array(N), iC=new Float64Array(N), iL=new Float64Array(N), iL2=new Float64Array(N); function id(x,y){ return y*sw+x; }
      for(var y=0;y<h;y++){ for(var x=0;x<w;x++){ var p=(y*w+x)*4; var a=s[p+3]|0; var c=(a>=128)?1:0; var r0=s[p]|0, g0=s[p+1]|0, b0=s[p+2]|0; var lum=0.299*r0+0.587*g0+0.114*b0; var ii=id(x+1,y+1); var left=id(x,y+1), up=id(x+1,y), upleft=id(x,y); iR[ii]=iR[left]+iR[up]-iR[upleft]+(c?r0:0); iG[ii]=iG[left]+iG[up]-iG[upleft]+(c?g0:0); iB[ii]=iB[left]+iB[up]-iB[upleft]+(c?b0:0); iC[ii]=iC[left]+iC[up]-iC[upleft]+c; iL[ii]=iL[left]+iL[up]-iL[upleft]+(c?lum:0); iL2[ii]=iL2[left]+iL2[up]-iL2[upleft]+(c?lum*lum:0); } }
      function rect(ii,x0,y0,x1,y1){ var a=id(x0,y0), b=id(x1,y0), c=id(x0,y1), d=id(x1,y1); return ii[d]-ii[b]-ii[c]+ii[a]; }
      for(var y=0;y<h;y++){ for(var x=0;x<w;x++){ var p=(y*w+x)*4; var a=s[p+3]|0; if(a<128){ out[p]=s[p]; out[p+1]=s[p+1]; out[p+2]=s[p+2]; out[p+3]=a; continue; } var x0=Math.max(0,x-r), x1=x, x2=Math.min(w-1,x+r); var y0=Math.max(0,y-r), y1=y, y2=Math.min(h-1,y+r); var regs=[{x0:x0,y0:y0,x1:x1,y1:y1},{x0:x1,y0:y0,x1:x2,y1:y1},{x0:x0,y0:y1,x1:x1,y1:y2},{x0:x1,y0:y1,x1:x2,y1:y2}]; var best=1e20, mR=s[p], mG=s[p+1], mB=s[p+2]; for(var k=0;k<4;k++){ var rx0=regs[k].x0, ry0=regs[k].y0, rx1=regs[k].x1, ry1=regs[k].y1; var ex0=rx0, ey0=ry0, ex1=rx1+1, ey1=ry1+1; var cnt=rect(iC,ex0,ey0,ex1,ey1); if(cnt<=0) continue; var sumL=rect(iL,ex0,ey0,ex1,ey1); var sumL2=rect(iL2,ex0,ey0,ex1,ey1); var meanL=sumL/cnt; var v=(sumL2/cnt)-meanL*meanL; if(v<best){ best=v; var sr=rect(iR,ex0,ey0,ex1,ey1); var sg=rect(iG,ex0,ey0,ex1,ey1); var sb=rect(iB,ex0,ey0,ex1,ey1); mR=clampByte((sr/cnt)|0); mG=clampByte((sg/cnt)|0); mB=clampByte((sb/cnt)|0); } } out[p]=mR; out[p+1]=mG; out[p+2]=mB; out[p+3]=255; } }
      img.data.set(out); cx.putImageData(img,0,0); return canvas; }

    function unsharp(canvas, amount, radius, threshold){ try{
      var w=canvas.width|0,h=canvas.height|0; if(w===0||h===0) return canvas;
      var a=Math.max(0, Number(amount)||0); var r=(radius|0); var th=(threshold|0);
      if (a<=0 || r<=0) return canvas;
      var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var orig=img.data;
      var bc=new OffscreenCanvas(w,h); var bcx=bc.getContext('2d',{willReadFrequently:true}); bcx.clearRect(0,0,w,h); bcx.drawImage(canvas,0,0);
      bc=gaussianApprox(bc, r);
      var bimg=bcx.getImageData(0,0,w,h); var bdat=bimg.data;
      var k=a/100;
      for (var i=0;i<orig.length;i+=4){
        var dr=orig[i]-bdat[i]; var dg=orig[i+1]-bdat[i+1]; var db=orig[i+2]-bdat[i+2];
        if (Math.abs(dr)>=th) orig[i] = clampByte(orig[i] + k*dr);
        if (Math.abs(dg)>=th) orig[i+1] = clampByte(orig[i+1] + k*dg);
        if (Math.abs(db)>=th) orig[i+2] = clampByte(orig[i+2] + k*db);
      }
      cx.putImageData(img,0,0); return canvas;
    } catch(_){ return canvas; } }

    function modeFilter(canvas, radius){ try{
      var n=(radius|0); if (n<=1) return canvas; var w=canvas.width|0,h=canvas.height|0; if (w===0||h===0) return canvas;
      var left = Math.floor((n-1)/2); var right = n - left - 1;
      var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var s=img.data; var out=new Uint8ClampedArray(s.length);
      for (var y=0;y<h;y++){
        for (var x=0;x<w;x++){
          var i=(y*w+x)*4; var a=s[i+3]|0; if (a<128){ out[i]=s[i]; out[i+1]=s[i+1]; out[i+2]=s[i+2]; out[i+3]=a; continue; }
          var counts={}; var best=0,bR= s[i], bG=s[i+1], bB=s[i+2];
          for (var dy=-left; dy<=right; dy++){
            var yy=y+dy; if (yy<0||yy>=h) continue;
            for (var dx=-left; dx<=right; dx++){
              var xx=x+dx; if (xx<0||xx>=w) continue; var j=(yy*w+xx)*4; if ((s[j+3]|0)<128) continue;
              var key=((s[j]|0)<<16)|((s[j+1]|0)<<8)|(s[j+2]|0);
              var c=(counts[key]||0)+1; counts[key]=c; if (c>best){ best=c; bR=s[j]; bG=s[j+1]; bB=s[j+2]; }
            }
          }
          out[i]=bR; out[i+1]=bG; out[i+2]=bB; out[i+3]=255;
        }
      }
      img.data.set(out); cx.putImageData(img,0,0); return canvas;
    } catch(_){ return canvas; } }

    function posterize(canvas, levels){ try{
      var n=(levels|0); if (n<=1) return canvas; var w=canvas.width|0,h=canvas.height|0; if (w===0||h===0) return canvas;
      var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var d=img.data; var div=255/Math.max(1,(n-1));
      for (var i=0;i<d.length;i+=4){ var a=d[i+3]|0; if (a<128) continue; var r=d[i], g=d[i+1], b=d[i+2]; var L=0.299*r+0.587*g+0.114*b; var qL=Math.round(L/div)*div; var scale=L>0?(qL/L):0; var nr=r*scale, ng=g*scale, nb=b*scale; d[i]=nr<0?0:nr>255?255:nr|0; d[i+1]=ng<0?0:ng>255?255:ng|0; d[i+2]=nb<0?0:nb>255?255:nb|0; }
      cx.putImageData(img,0,0); return canvas;
    } catch(_){ return canvas; } }

    function kuwaharaStage(canvas, radius, sectors, strengthPct, anisotropyPct, blend){ try{
      var r=(radius|0); var w=canvas.width|0,h=canvas.height|0; if(r<=0||w===0||h===0) return canvas;
      var cx=canvas.getContext('2d',{willReadFrequently:true}); var img=cx.getImageData(0,0,w,h); var s=img.data; var out=new Uint8ClampedArray(s.length);
      var sw=w+1; var N=sw*(h+1);
      var iR=new Float64Array(N), iG=new Float64Array(N), iB=new Float64Array(N), iC=new Float64Array(N), iL=new Float64Array(N), iL2=new Float64Array(N);
      function id(x,y){ return y*sw+x; }
      for (var y=0;y<h;y++){
        for (var x=0;x<w;x++){
          var p=(y*w+x)*4; var a=s[p+3]|0; var c=(a>=128)?1:0; var r0=s[p]|0, g0=s[p+1]|0, b0=s[p+2]|0; var lum=0.299*r0+0.587*g0+0.114*b0;
          var ii=id(x+1,y+1), left=id(x,y+1), up=id(x+1,y), upleft=id(x,y);
          iR[ii]=iR[left]+iR[up]-iR[upleft]+(c?r0:0);
          iG[ii]=iG[left]+iG[up]-iG[upleft]+(c?g0:0);
          iB[ii]=iB[left]+iB[up]-iB[upleft]+(c?b0:0);
          iC[ii]=iC[left]+iC[up]-iC[upleft]+c;
          iL[ii]=iL[left]+iL[up]-iL[upleft]+(c?lum:0);
          iL2[ii]=iL2[left]+iL2[up]-iL2[upleft]+(c?lum*lum:0);
        }
      }
      function rect(ii,x0,y0,x1,y1){ var a=id(x0,y0), b=id(x1,y0), c=id(x0,y1), d=id(x1,y1); return ii[d]-ii[b]-ii[c]+ii[a]; }
      function sobelTheta(x,y){ var gx=0, gy=0; for (var dy=-1;dy<=1;dy++){ var yy=(y+dy); if(yy<0) yy=0; if(yy>=h) yy=h-1; for (var dx=-1;dx<=1;dx++){ var xx=(x+dx); if(xx<0) xx=0; if(xx>=w) xx=w-1; var pp=(yy*w+xx)*4; var L=0.299*s[pp]+0.587*s[pp+1]+0.114*s[pp+2]; var kx=(dx===-1&&dy===-1?-1:dx===0&&dy===-1?0:dx===1&&dy===-1?1:dx===-1&&dy===0?-2:dx===0&&dy===0?0:dx===1&&dy===0?2:dx===-1&&dy===1?-1:dx===0&&dy===1?0:1); var ky=(dx===-1&&dy===-1?-1:dx===0&&dy===-1?-2:dx===1&&dy===-1?-1:dx===-1&&dy===0?0:dx===0&&dy===0?0:dx===1&&dy===0?0:dx===-1&&dy===1?1:dx===0&&dy===1?2:1); gx+=kx*L; gy+=ky*L; } } return Math.atan2(gy,gx); }
      var an = Math.max(0, Math.min(1, (anisotropyPct|0)/100));
      var str = Math.max(0, Math.min(1, (strengthPct|0)/100));
      var useBlend = !!blend;
      for (var y=0;y<h;y++){
        for (var x=0;x<w;x++){
          var p=(y*w+x)*4; var a=s[p+3]|0; if (a<128){ out[p]=s[p]; out[p+1]=s[p+1]; out[p+2]=s[p+2]; out[p+3]=a; continue; }
          var x0=Math.max(0,x-r), x1=x, x2=Math.min(w-1,x+r);
          var y0=Math.max(0,y-r), y1=y, y2=Math.min(h-1,y+r);
          var regs4=[{x0:x0,y0:y0,x1:x1,y1:y1,ang:135},{x0:x1,y0:y0,x1:x2,y1:y1,ang:45},{x0:x0,y0:y1,x1:x1,y1:y2,ang:-135},{x0:x1,y0:y1,x1:x2,y1:y2,ang:-45}];
          var regs8=regs4.concat([{x0:x0,y0:y0,x1:x2,y1:y1,ang:90},{x0:x1,y0:y0,x1:x2,y1:y2,ang:0},{x0:x0,y0:y1,x1:x2,y1:y2,ang:-90},{x0:x0,y0:y0,x1:x1,y1:y2,ang:180}]);
          var regs = ((sectors|0)===8)?regs8:regs4;
          var mR=s[p], mG=s[p+1], mB=s[p+2];
          var theta=0; if (an>0) theta=sobelTheta(x,y);
          if (!useBlend){
            var best=1e20;
            for (var k=0;k<regs.length;k++){
              var rx0=regs[k].x0, ry0=regs[k].y0, rx1=regs[k].x1, ry1=regs[k].y1;
              var ex0=rx0, ey0=ry0, ex1=rx1+1, ey1=ry1+1;
              var cnt=rect(iC,ex0,ey0,ex1,ey1); if (cnt<=0) continue;
              var sumL=rect(iL,ex0,ey0,ex1,ey1); var sumL2=rect(iL2,ex0,ey0,ex1,ey1);
              var meanL=sumL/cnt; var v=(sumL2/cnt)-meanL*meanL;
              var cost=v;
              if (an>0){ var ang=regs[k].ang*Math.PI/180; var d=theta-ang; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; var wgt=(1-an)+an*Math.max(0, Math.cos(d)); cost=v/(0.0001+wgt); }
              if (cost<best){ best=cost; var sr=rect(iR,ex0,ey0,ex1,ey1); var sg=rect(iG,ex0,ey0,ex1,ey1); var sb=rect(iB,ex0,ey0,ex1,ey1); mR=clampByte((sr/cnt)|0); mG=clampByte((sg/cnt)|0); mB=clampByte((sb/cnt)|0); }
            }
          } else {
            var wr=0, wg=0, wb=0, wSum=0;
            for (var k=0;k<regs.length;k++){
              var rx0=regs[k].x0, ry0=regs[k].y0, rx1=regs[k].x1, ry1=regs[k].y1;
              var ex0=rx0, ey0=ry0, ex1=rx1+1, ey1=ry1+1;
              var cnt=rect(iC,ex0,ey0,ex1,ey1); if (cnt<=0) continue;
              var sumL=rect(iL,ex0,ey0,ex1,ey1); var sumL2=rect(iL2,ex0,ey0,ex1,ey1);
              var meanL=sumL/cnt; var v=(sumL2/cnt)-meanL*meanL;
              var dirW=1; if (an>0){ var ang=regs[k].ang*Math.PI/180; var d=theta-ang; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; dirW=(1-an)+an*Math.max(0, Math.cos(d)); }
              var wgt=dirW/(0.0001+v);
              var sr=rect(iR,ex0,ey0,ex1,ey1), sg=rect(iG,ex0,ey0,ex1,ey1), sb=rect(iB,ex0,ey0,ex1,ey1);
              wr+=wgt*(sr/cnt); wg+=wgt*(sg/cnt); wb+=wgt*(sb/cnt); wSum+=wgt;
            }
            if (wSum>0){ mR=clampByte((wr/wSum)|0); mG=clampByte((wg/wSum)|0); mB=clampByte((wb/wSum)|0); }
          }
          var rS=s[p], gS=s[p+1], bS=s[p+2];
          out[p]=clampByte(rS + str*(mR - rS));
          out[p+1]=clampByte(gS + str*(mG - gS));
          out[p+2]=clampByte(bS + str*(mB - bS));
          out[p+3]=255;
        }
      }
      img.data.set(out); cx.putImageData(img,0,0); return canvas;
    } catch(_){ return canvas; } }

    self.onmessage = function(e) {
      try {
        var msg = e && e.data;
        if (!msg || !msg.type) return;
        if (msg.type === 'init') {
          try { self.postMessage({ type: 'ready' }); } catch (err) { try { self.postMessage({ type: 'error', error: String(err) }); } catch(_){} }
          
          workerPoolInfo = msg.workerPool || { available: false, size: 0, readyCount: 0 };
          hasWorkerPool = workerPoolInfo.available && workerPoolInfo.size > 0;
          try {
            var hasOC = (typeof OffscreenCanvas !== 'undefined');
            var oc;
            try { oc = hasOC ? new OffscreenCanvas(1,1) : null; } catch(_oc) { oc = null; }
            var env = {
              hasOffscreenCanvas: !!hasOC,
              hasConvertToBlob: !!(oc && oc.convertToBlob),
              hasTransferToImageBitmap: !!(oc && oc.transferToImageBitmap),
              hasCreateImageBitmap: (typeof createImageBitmap === 'function')
            };
            var isWorkerCapable = env.hasCreateImageBitmap && env.hasOffscreenCanvas && (env.hasConvertToBlob || env.hasTransferToImageBitmap);
            if (!isWorkerCapable) {
              dbg('env-limited', { reason: 'missing critical APIs', env: env });
              try { self.postMessage({ type: 'worker-limited', capabilities: env }); } catch(_){ }
            } else {
              dbg('env-capable', { workerFullySupported: true });
            }
            if (hasWorkerPool) dbg('worker-pool-info', 'Pool available: size=' + workerPoolInfo.size + ', ready=' + workerPoolInfo.readyCount);
            else dbg('worker-pool-info', 'Pool not available');
            dbg('env', env);
          } catch(_e){}
          return;
        }
        if (msg.type === 'magic-select-blob') {
          var mjidb = msg.jobId|0;
          try {
            var blb = msg.blob;
            var seedXb = msg.seedX|0, seedYb = msg.seedY|0;
            var tolb = msg.tolerance|0;
            var modeb = String(msg.mode||'local');
            if (!blb || typeof createImageBitmap !== 'function') { try { self.postMessage({ type: 'magic-region', jobId: mjidb, error: 'bad-blob' }); } catch(_){}; return; }
            createImageBitmap(blb).then(function(bmp){
              try {
                var w3 = bmp.width|0, h3 = bmp.height|0;
                var off3 = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w3, h3) : null;
                if (!off3) { try { self.postMessage({ type: 'magic-region', jobId: mjidb, error: 'no-offscreen' }); } catch(_){}; try { bmp.close&&bmp.close(); } catch(_c3){}; return; }
                var cx3 = off3.getContext('2d', { willReadFrequently: true });
                cx3.imageSmoothingEnabled = false;
                cx3.clearRect(0,0,w3,h3);
                cx3.drawImage(bmp, 0, 0);
                try { bmp.close && bmp.close(); } catch(_c3){}
                var img3 = cx3.getImageData(0,0,w3,h3);
                var data3 = img3.data;
                var N3 = w3*h3;
                var region3 = new Uint8Array(N3);
                function idx3(x,y){ return (y*w3 + x) * 4; }
                var i03 = idx3(seedXb, seedYb);
                var sr3 = data3[i03], sg3 = data3[i03+1], sb3 = data3[i03+2];
                if (modeb === 'global') {
                  for (var i=0, p=0; i<N3; i++, p+=4) {
                    var dr = Math.abs((data3[p]|0) - sr3);
                    var dg = Math.abs((data3[p+1]|0) - sg3);
                    var db = Math.abs((data3[p+2]|0) - sb3);
                    var md = dr>dg? (dr>db?dr:db) : (dg>db?dg:db);
                    if (md <= tolb) region3[i] = 1;
                  }
                } else {
                  var visited3 = new Uint8Array(N3);
                  var qx3 = new Int32Array(N3);
                  var qy3 = new Int32Array(N3);
                  var qs3=0, qe3=0;
                  qx3[qe3]=seedXb; qy3[qe3]=seedYb; qe3++;
                  while (qs3 < qe3) {
                    var x3 = qx3[qs3], y3 = qy3[qs3]; qs3++;
                    if (x3<0||y3<0||x3>=w3||y3>=h3) continue;
                    var li3 = y3*w3 + x3; if (visited3[li3]) continue; visited3[li3]=1;
                    var offp3 = li3*4;
                    var r3 = data3[offp3], g3 = data3[offp3+1], b3 = data3[offp3+2];
                    var dr3 = Math.abs(r3 - sr3), dg3 = Math.abs(g3 - sg3), db3 = Math.abs(b3 - sb3);
                    var md3 = dr3>dg3? (dr3>db3?dr3:db3) : (dg3>db3?dg3:db3);
                    if (md3 <= tolb) {
                      region3[li3]=1;
                      qx3[qe3]=x3-1; qy3[qe3]=y3; qe3++;
                      qx3[qe3]=x3+1; qy3[qe3]=y3; qe3++;
                      qx3[qe3]=x3; qy3[qe3]=y3-1; qe3++;
                      qx3[qe3]=x3; qy3[qe3]=y3+1; qe3++;
                      qx3[qe3]=x3-1; qy3[qe3]=y3-1; qe3++;
                      qx3[qe3]=x3+1; qy3[qe3]=y3-1; qe3++;
                      qx3[qe3]=x3-1; qy3[qe3]=y3+1; qe3++;
                      qx3[qe3]=x3+1; qy3[qe3]=y3+1; qe3++;
                    }
                  }
                }
                try { self.postMessage({ type: 'magic-region', jobId: mjidb, width: w3, height: h3, regionBuffer: region3.buffer }, [region3.buffer]); } catch(eMR3) { try { self.postMessage({ type: 'magic-region', jobId: mjidb, error: String(eMR3) }); } catch(_){} }
              } catch (eBMP) {
                try { self.postMessage({ type: 'magic-region', jobId: mjidb, error: String(eBMP) }); } catch(_){}
              }
            }).catch(function(eCIB){ try { self.postMessage({ type: 'magic-region', jobId: mjidb, error: String(eCIB) }); } catch(_){} });
          } catch (eBL) {
            try { self.postMessage({ type: 'magic-region', jobId: mjidb, error: String(eBL) }); } catch(_){}
          }
          return;
        }
        if (msg.type === 'magic-select-bmp') {
          var mjid2 = msg.jobId|0;
          try {
            var bmp = msg.bitmap;
            var seedX2 = msg.seedX|0, seedY2 = msg.seedY|0;
            var tol2 = msg.tolerance|0;
            var mode2 = String(msg.mode||'local');
            if (!bmp || !bmp.width || !bmp.height) { try { self.postMessage({ type: 'magic-region', jobId: mjid2, error: 'bad-bitmap' }); } catch(_){}; return; }
            var w2 = bmp.width|0, h2 = bmp.height|0;
            var off2 = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w2, h2) : null;
            if (!off2) { try { self.postMessage({ type: 'magic-region', jobId: mjid2, error: 'no-offscreen' }); } catch(_){}; return; }
            var cx2 = off2.getContext('2d', { willReadFrequently: true });
            cx2.imageSmoothingEnabled = false;
            cx2.clearRect(0,0,w2,h2);
            cx2.drawImage(bmp, 0, 0);
            try { bmp.close && bmp.close(); } catch(_c){}
            var img2 = cx2.getImageData(0,0,w2,h2);
            var data2 = img2.data;
            var N2 = w2*h2;
            var region2 = new Uint8Array(N2);
            function idx2(x,y){ return (y*w2 + x) * 4; }
            var i02 = idx2(seedX2, seedY2);
            var sr2 = data2[i02], sg2 = data2[i02+1], sb2 = data2[i02+2];
            if (mode2 === 'global') {
              for (var i=0, p=0; i<N2; i++, p+=4) {
                var dr = Math.abs((data2[p]|0) - sr2);
                var dg = Math.abs((data2[p+1]|0) - sg2);
                var db = Math.abs((data2[p+2]|0) - sb2);
                var md = dr>dg? (dr>db?dr:db) : (dg>db?dg:db);
                if (md <= tol2) region2[i] = 1;
              }
            } else {
              var visited2 = new Uint8Array(N2);
              var qx2 = new Int32Array(N2);
              var qy2 = new Int32Array(N2);
              var qs2=0, qe2=0;
              qx2[qe2]=seedX2; qy2[qe2]=seedY2; qe2++;
              while (qs2 < qe2) {
                var x2 = qx2[qs2], y2 = qy2[qs2]; qs2++;
                if (x2<0||y2<0||x2>=w2||y2>=h2) continue;
                var li2 = y2*w2 + x2; if (visited2[li2]) continue; visited2[li2]=1;
                var offp = li2*4;
                var r2 = data2[offp], g2 = data2[offp+1], b2 = data2[offp+2];
                var dr2 = Math.abs(r2 - sr2), dg2 = Math.abs(g2 - sg2), db2 = Math.abs(b2 - sb2);
                var md2 = dr2>dg2? (dr2>db2?dr2:db2) : (dg2>db2?dg2:db2);
                if (md2 <= tol2) {
                  region2[li2]=1;
                  qx2[qe2]=x2-1; qy2[qe2]=y2; qe2++;
                  qx2[qe2]=x2+1; qy2[qe2]=y2; qe2++;
                  qx2[qe2]=x2; qy2[qe2]=y2-1; qe2++;
                  qx2[qe2]=x2; qy2[qe2]=y2+1; qe2++;
                  qx2[qe2]=x2-1; qy2[qe2]=y2-1; qe2++;
                  qx2[qe2]=x2+1; qy2[qe2]=y2-1; qe2++;
                  qx2[qe2]=x2-1; qy2[qe2]=y2+1; qe2++;
                  qx2[qe2]=x2+1; qy2[qe2]=y2+1; qe2++;
                }
              }
            }
            try { self.postMessage({ type: 'magic-region', jobId: mjid2, width: w2, height: h2, regionBuffer: region2.buffer }, [region2.buffer]); } catch(eMR2) { try { self.postMessage({ type: 'magic-region', jobId: mjid2, error: String(eMR2) }); } catch(_){} }
          } catch (eMB) {
            try { self.postMessage({ type: 'magic-region', jobId: mjid2, error: String(eMB) }); } catch(_){}
          }
          return;
        }
        if (msg.type === 'pool-update') {
          workerPoolInfo = msg.workerPool || { available: false, size: 0, readyCount: 0 };
          hasWorkerPool = workerPoolInfo.available && workerPoolInfo.size > 0;
          dbg('pool-update-received', 'Pool updated: size=' + workerPoolInfo.size + ', ready=' + workerPoolInfo.readyCount);
          return;
        }
        if (msg.type === 'cancel') {
          var cancelJobId = msg.jobId;
          if (cancelJobId !== undefined) {
            cancelled.set(cancelJobId, true);
            dbg('cancel-job', { jobId: cancelJobId });
            try { stripeJobs.delete(cancelJobId); jobCtx.delete(cancelJobId); } catch(_e){}
          }
          return;
        }
        if (msg.type === 'pool-command') {
          
          var cmd = msg.command;
          var workerId = msg.workerId;
          var jobId = msg.jobId;
          dbg('pool-command-received', 'Worker ' + workerId + ' received command: ' + cmd + ' for job ' + jobId);
          var result = '';
          if (cmd === 'process-real-stripe') {
            var stripeBitmap = msg.stripeBitmap;
            var stripeInfo = msg.stripeInfo;
            var params = msg.processingParams;
            if (!stripeBitmap || !stripeInfo || !params) {
              result = 'error: missing stripe data';
              dbg('real-stripe-error', 'Worker ' + workerId + ': missing stripe data for job ' + jobId);
            } else {
              dbg('real-stripe-received', 'Worker ' + workerId + ': received real stripe ' + stripeInfo.startY + '+' + stripeInfo.height + 'px, factor=' + params.factor + ', method=' + params.method);
              if (cancelled.has(jobId)) {
                result = 'cancelled';
                try { stripeBitmap && stripeBitmap.close && stripeBitmap.close(); } catch(_){ }
              } else try {
                var srcW = stripeBitmap.width;
                var srcH = stripeBitmap.height;
                var factor = Math.max(1, params.factor || 1);
                var dstW = Math.max(1, Math.floor(srcW / factor));
                var y0 = Math.round((stripeInfo.startY || 0) / factor);
                var y1 = Math.round(((stripeInfo.startY || 0) + (stripeInfo.height || srcH)) / factor);
                var dstH = Math.max(1, y1 - y0);
                var dstCanvas = new OffscreenCanvas(dstW, dstH);
                var dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true });
                if (params.method === 'nearest') dstCtx.imageSmoothingEnabled = false; else { dstCtx.imageSmoothingEnabled = true; dstCtx.imageSmoothingQuality = 'high'; }
                dstCtx.clearRect(0, 0, dstW, dstH);
                dstCtx.drawImage(stripeBitmap, 0, 0, dstW, dstH);
                try { stripeBitmap && stripeBitmap.close && stripeBitmap.close(); } catch(_){ }
                createImageBitmap(dstCanvas).then(function(resultBitmap) {
                  if (cancelled.has(jobId)) { dbg('stripe-send-skip-cancelled', 'Worker ' + workerId + ': skip sending stripe for cancelled job ' + jobId); try { resultBitmap && resultBitmap.close && resultBitmap.close(); } catch(_){ } return; }
                  try {
                    self.postMessage({
                      type: 'stripe-result',
                      jobId: jobId,
                      workerId: workerId,
                      stripeInfo: { startY: stripeInfo.startY, srcHeight: stripeInfo.height, dstHeight: dstH },
                      resultBitmap: resultBitmap
                    }, [resultBitmap]);
                  } catch (e) { dbg('stripe-send-error', 'Worker ' + workerId + ': failed to send result: ' + e); }
                }).catch(function(e){ dbg('stripe-bitmap-error', 'Worker ' + workerId + ': failed to create result bitmap: ' + e); });
                result = 'processing: ' + srcW + 'x' + srcH + ' -> ' + dstW + 'x' + dstH + ' (async result follows)';
              } catch (e) {
                result = 'processing error: ' + e;
                dbg('stripe-process-error', 'Worker ' + workerId + ': processing failed: ' + e);
              }
            }
          }
          try { self.postMessage({ type: 'pool-response', command: cmd, jobId: jobId, workerId: workerId, result: result }); } catch (e) { dbg('pool-response-error', 'Failed to send response: ' + e); }
          return;
        }
        if (msg.type === 'stripe-result') {
          
          var jobIdSr = msg.jobId;
          var workerIdSr = msg.workerId;
          var stripeInfoSr = msg.stripeInfo;
          var resultBitmapSr = msg.resultBitmap;
          if (cancelled.has(jobIdSr)) { dbg('stripe-result-ignored-cancelled', 'Main worker: job ' + jobIdSr + ' cancelled; drop stripe from worker ' + workerIdSr); try { resultBitmapSr && resultBitmapSr.close && resultBitmapSr.close(); } catch(_){ } return; }
          if (jobIdSr !== currentPreviewJob) { dbg('stripe-result-ignored-stale', 'Main worker: stale stripe for job ' + jobIdSr + ' (current=' + currentPreviewJob + '); drop'); try { resultBitmapSr && resultBitmapSr.close && resultBitmapSr.close(); } catch(_){ } return; }
          dbg('stripe-result-received', 'Main worker: received result from worker ' + workerIdSr + ', startY=' + stripeInfoSr.startY + ', size=' + resultBitmapSr.width + 'x' + resultBitmapSr.height + ' for job ' + jobIdSr);
          var st = stripeJobs.get(jobIdSr);
          if (!st || !st.canvas || !st.ctx) { dbg('merge-state-missing', 'Main worker: no merge state for job ' + jobIdSr + '; dropping stripe'); try { resultBitmapSr && resultBitmapSr.close && resultBitmapSr.close(); } catch(_){ } return; }
          var dy = Math.round(((stripeInfoSr && stripeInfoSr.startY ? stripeInfoSr.startY : 0) / Math.max(1, (st.factor||1))));
          if (dy < 0) dy = 0;
          if (dy + resultBitmapSr.height > st.dstH) dy = Math.max(0, st.dstH - resultBitmapSr.height);
          try { st.ctx.drawImage(resultBitmapSr, 0, dy); } catch(_d) { dbg('merge-draw-error', String(_d)); }
          try { resultBitmapSr && resultBitmapSr.close && resultBitmapSr.close(); } catch(_){ }
          st.received = (st.received|0) + 1;
          var pct = 65 + Math.min(30, Math.floor(30 * (st.received / Math.max(1, st.expected||1))));
          try { self.postMessage({ type: 'progress', jobId: jobIdSr, percent: pct, stage: 'merge' }); } catch(_e){}
          if (st.received < st.expected) return;
          dbg('merge-complete', 'Main worker: all stripes received for job ' + jobIdSr + '; proceeding to post-processing');
          if (cancelled.has(jobIdSr)) { dbg('merge-cancelled', 'Main worker: job ' + jobIdSr + ' cancelled after merge'); stripeJobs.delete(jobIdSr); jobCtx.delete(jobIdSr); return; }
          if (jobIdSr !== currentPreviewJob) { dbg('merge-stale', 'Main worker: job ' + jobIdSr + ' is stale after merge (current=' + currentPreviewJob + ')'); stripeJobs.delete(jobIdSr); jobCtx.delete(jobIdSr); return; }
          var ctxInfoSr = jobCtx.get(jobIdSr) || {};
          var c1 = st.canvas;
          var levelsSr = Math.max(2, Math.min(10, (typeof ctxInfoSr.ditherLevels==='number'? ctxInfoSr.ditherLevels : 2)));
          var ditherMethodSr = ctxInfoSr.ditherMethod || 'none';
          var outlineThicknessSr = (ctxInfoSr.outlineThickness|0) || 0;
          var erodeAmountSr = (ctxInfoSr.erodeAmount|0) || 0;
          var paletteSr = Array.isArray(ctxInfoSr.palette) ? ctxInfoSr.palette : [];
          var keySr = ctxInfoSr.key || '';
          try {
            try { qmethod = String(ctxInfoSr.quantMethod || 'rgb'); } catch(_q) { qmethod = 'rgb'; }
            
            if (ctxInfoSr.colorCorrectionEnabled) {
              c1 = applyColorCorrection(c1, true, (ctxInfoSr.brightness|0)||0, (ctxInfoSr.contrast|0)||0, (ctxInfoSr.saturation|0)||0, (ctxInfoSr.hue|0)||0, Number(ctxInfoSr.gamma)||1);
            }
            try { var pzSr=(ctxInfoSr.posterizeLevels|0)||0; var pzPost=!!ctxInfoSr.posterizeAfterPalette; if (pzSr>=2 && !pzPost){ var pzClamped= Math.max(2, Math.min(16, pzSr)); c1 = posterize(c1, pzClamped); } } catch(_pz){}
            try { if (ctxInfoSr.kwEnabled && !ctxInfoSr.kwAfterPalette){ c1 = kuwaharaStage(c1, (ctxInfoSr.kwRadius|0)||0, ((ctxInfoSr.kwSectors|0)===8)?8:4, (ctxInfoSr.kwStrengthPct|0)||0, (ctxInfoSr.kwAnisotropyPct|0)||0, !!ctxInfoSr.kwBlend); } } catch(_kw){}
            dbg('merge-dither-start', { method: ditherMethodSr, paletteLength: paletteSr ? paletteSr.length : 0, levels: levelsSr });
            var diffusionSet = { floyd:1, falsefloydsteinberg:1, burkes:1, jarvis:1, stucki:1, sierra:1, twosierra:1, sierralite:1, atkinson:1 };
            if (paletteSr && paletteSr.length && diffusionSet[ditherMethodSr]) {
              dbg('merge-using-diffusion', ditherMethodSr);
              switch(ditherMethodSr){
                case 'floyd': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:7},{dx:-1,dy:1,w:3},{dx:0,dy:1,w:5},{dx:1,dy:1,w:1}],16,true,sN); } break;
                case 'falsefloydsteinberg': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:3},{dx:0,dy:1,w:3},{dx:1,dy:1,w:2}],8,true,sN); } break;
                case 'burkes': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2}],32,true,sN); } break;
                case 'jarvis': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:7},{dx:2,dy:0,w:5},{dx:-2,dy:1,w:3},{dx:-1,dy:1,w:5},{dx:0,dy:1,w:7},{dx:1,dy:1,w:5},{dx:2,dy:1,w:3},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:3},{dx:0,dy:2,w:5},{dx:1,dy:2,w:3},{dx:2,dy:2,w:1}],48,true,sN); } break;
                case 'stucki': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:4},{dx:1,dy:2,w:2},{dx:2,dy:2,w:1}],42,true,sN); } break;
                case 'sierra': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:5},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:5},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:3},{dx:1,dy:2,w:2}],32,true,sN); } break;
                case 'twosierra': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:4},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:1},{dx:-1,dy:1,w:2},{dx:0,dy:1,w:3},{dx:1,dy:1,w:2},{dx:2,dy:1,w:1}],16,true,sN); } break;
                case 'sierralite': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:2},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1}],4,true,sN); } break;
                case 'atkinson': { var sN = Math.max(0, Math.min(1, (levelsSr - 2) / 8)); c1 = dErrorPaletteCanvas(c1,paletteSr,[{dx:1,dy:0,w:1},{dx:2,dy:0,w:1},{dx:-1,dy:1,w:1},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1},{dx:0,dy:2,w:1}],8,true,sN); } break;
              }
            } else {
              
              var bayerMethods = { bayer2:1, bayer4:1, bayer8:1, custom:1 };
              if (paletteSr && paletteSr.length && bayerMethods[ditherMethodSr]) {
                dbg('merge-using-bayer-palette', ditherMethodSr);
                
                var matrix;
                if (ditherMethodSr === 'bayer2') matrix = [[0,2],[3,1]];
                else if (ditherMethodSr === 'bayer4') matrix = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
                else if (ditherMethodSr === 'bayer8') matrix = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
                else matrix = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]]; 
                c1 = dOrderedPalette(c1, paletteSr, matrix);
              } else if (paletteSr && paletteSr.length && ditherMethodSr==='random') {
                var s1 = Math.max(0, Math.min(1, (levelsSr - 2) / 8));
                c1 = dRandomPalette(c1, paletteSr, s1);
              } else {
                dbg('merge-using-old-dither', ditherMethodSr);
                c1 = dither(c1, levelsSr, ditherMethodSr);
              }
            }
          } catch(_p1){}
          try { self.postMessage({ type: 'progress', jobId: jobIdSr, percent: 75, stage: 'quantize' }); } catch(_e){}
          
          try {
            var usedPaletteDithering = (paletteSr && paletteSr.length && (diffusionSet[ditherMethodSr] || bayerMethods[ditherMethodSr] || ditherMethodSr==='random'));
            if (!usedPaletteDithering && Array.isArray(paletteSr) && paletteSr.length && (paletteSr.length <= 128 || ((ctxInfoSr && (ctxInfoSr.simplifyArea|0) > 0)))) {
              dbg('merge-quantize-only', 'Applying quantizeToPalette (forced for simplify)');
              c1 = quantizeToPalette(c1, paletteSr);
            } else if (usedPaletteDithering) {
              dbg('merge-skip-quantize', 'Skipping quantizeToPalette - already dithered with palette');
            }
          } catch(_p2){}
          try { var pzSr2=(ctxInfoSr.posterizeLevels|0)||0; var pzPost2=!!ctxInfoSr.posterizeAfterPalette; if (pzSr2>=2 && pzPost2){ var pzClamped2=Math.max(2,Math.min(16,pzSr2)); c1 = posterize(c1, pzClamped2); } } catch(_pz2){}
          try { if (ctxInfoSr.kwEnabled && ctxInfoSr.kwAfterPalette){ c1 = kuwaharaStage(c1, (ctxInfoSr.kwRadius|0)||0, ((ctxInfoSr.kwSectors|0)===8)?8:4, (ctxInfoSr.kwStrengthPct|0)||0, (ctxInfoSr.kwAnisotropyPct|0)||0, !!ctxInfoSr.kwBlend); } } catch(_kw2){}
          try { var sa2 = (ctxInfoSr && ctxInfoSr.simplifyArea ? (ctxInfoSr.simplifyArea|0) : 0); if (sa2>0){ c1 = simplifyRegions(c1, sa2); } } catch(_simp2){}
          try {
            var mr = (ctxInfoSr.modeRadius|0)||0; if (mr>0) { c1 = modeFilter(c1, mr); }
          } catch(_mf){}
          try { self.postMessage({ type: 'progress', jobId: jobIdSr, percent: 85, stage: 'morphology' }); } catch(_e){}
          try { c1 = erodeInward(c1, erodeAmountSr); } catch(_p3){}
          try { c1 = drawBlackOutline(c1, outlineThicknessSr); } catch(_p4){}
          try { self.postMessage({ type: 'progress', jobId: jobIdSr, percent: 95, stage: 'encode' }); } catch(_e){}
          (c1.convertToBlob ? c1.convertToBlob({type:'image/png'}) : Promise.reject()).then(function(finalBlob){
            var sentFinal = false;
            try { self.postMessage({ type: 'preview-final', jobId: jobIdSr, key: keySr, blob: finalBlob, w: c1.width, h: c1.height }); sentFinal = true; } catch(ePF) { dbg('final-post-error', String(ePF)); }
            try { finalBlob.arrayBuffer().then(function(bytes){ try { self.postMessage({ type: 'preview-final-bytes', jobId: jobIdSr, key: keySr, bytes: bytes, mime: finalBlob.type || 'image/png', w: c1.width, h: c1.height }, [bytes]); } catch(eBytes){} try { self.postMessage({ type: 'preview-done', jobId: jobIdSr }); } catch(_e){} }).catch(function(){ try { self.postMessage({ type: 'preview-done', jobId: jobIdSr }); } catch(_e){} }); } catch(eArr){}
            try { var ibAux = c1.transferToImageBitmap ? c1.transferToImageBitmap() : null; if (ibAux) { self.postMessage({ type: 'preview-final-bmp', jobId: jobIdSr, key: keySr, bitmap: ibAux, w: c1.width, h: c1.height }, [ibAux]); } } catch(eAux){}
            try { stripeJobs.delete(jobIdSr); jobCtx.delete(jobIdSr); } catch(_cl){}
          }).catch(function(){
            try {
              var ib = c1.transferToImageBitmap ? c1.transferToImageBitmap() : null;
              if (ib) { try { self.postMessage({ type: 'preview-final-bmp', jobId: jobIdSr, key: keySr, bitmap: ib, w: c1.width, h: c1.height }, [ib]); } catch(_e){} }
              try { self.postMessage({ type: 'preview-done', jobId: jobIdSr }); } catch(_e){}
            } catch(_err) { dbg('final-error', String(_err)); try { self.postMessage({ type: 'preview-done', jobId: jobIdSr }); } catch(_e){} }
          });
          return;
        }
        if (msg.type === 'preview') {
          var jid = msg.jobId;
          try {
            var bl = msg.blob; var px = Math.max(1, Number(msg.pixelSize) || 1); var key = msg.key || '';
            var method = msg.method || 'nearest'; var ditherMethod = msg.ditherMethod || 'none'; var ditherLevels = (typeof msg.ditherLevels==='number'? msg.ditherLevels : 2);
            var outlineThickness = (msg.outlineThickness|0) || 0; var erodeAmount = (msg.erodeAmount|0) || 0; var palette = Array.isArray(msg.palette) ? msg.palette : [];
            var blurMode = String(msg.blurMode||'none'); var blurRadius = (msg.blurRadius|0)||0;
            var sharpenAmount = (msg.sharpenAmount|0)||0; var sharpenRadius = (msg.sharpenRadius|0)||0; var sharpenThreshold = (msg.sharpenThreshold|0)||0;
            var modeRadius = (msg.modeRadius|0)||0; var posterizeLevels = (msg.posterizeLevels|0)||0; var posterizeAfterPalette = !!msg.posterizeAfterPalette; var gamma = Number(msg.gamma)||1; var kwEnabled=!!msg.kwEnabled; var kwRadius=(msg.kwRadius|0)||0; var kwSectors=(msg.kwSectors|0)||0; var kwStrengthPct=(msg.kwStrengthPct|0)||0; var kwAnisotropyPct=(msg.kwAnisotropyPct|0)||0; var kwAfterPalette=!!msg.kwAfterPalette; var simplifyArea=(msg.simplifyArea|0)||0; var kwBlend=!!msg.kwBlend; var edgeEnabled=!!msg.edgeEnabled; var edgeThreshold=(msg.edgeThreshold|0)||0; var edgeThickness=(msg.edgeThickness|0)||1; var edgeThin=!!msg.edgeThin;
            var adaptEnabled=!!msg.adaptDitherEnabled; var adaptMethod=String(msg.adaptDitherMethod||'sobel'); var adaptThreshold=(msg.adaptDitherThreshold|0)||0; var adaptThickness=(msg.adaptDitherThickness|0)||1; var adaptThin=!!msg.adaptDitherThin; var adaptInvert=!!msg.adaptDitherInvert; var adaptFeather=(msg.adaptDitherFeather|0)||0;
            try { qmethod = String(msg.quantMethod||'rgb'); } catch(_q) { qmethod = 'rgb'; }
            currentPreviewJob = jid;
            try { self.postMessage({ type: 'progress', jobId: jid, percent: 10 }); } catch(_e){}
            if (cancelled.has(jid)) { dbg('preview-cancelled-early', { jobId: jid }); return; }
            if (!bl || typeof createImageBitmap !== 'function') {
              dbg('preview-missing-requirements', { hasBlob: !!bl, hasCreateImageBitmap: typeof createImageBitmap === 'function' });
              try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}; return;
            }
            createImageBitmap(bl).then(function(bmp){
              if (cancelled.has(jid)) { dbg('preview-cancelled-after-createImageBitmap', { jobId: jid }); try { bmp.close && bmp.close(); } catch(_){}; return; }
              if (jid !== currentPreviewJob) { dbg('preview-race-after-createImageBitmap', { jobId: jid, current: currentPreviewJob }); try { bmp.close && bmp.close(); } catch(_){}; return; }
              var w = bmp.width|0, h = bmp.height|0;
              var cap = 1024;
              var scaleCap = Math.max(1, Math.ceil(Math.max(w, h) / cap));
              var ps = Math.max(1, Number(px) || 1, scaleCap);
              var wOut = Math.max(1, Math.floor(w / ps));
              var hOut = Math.max(1, Math.floor(h / ps));
              try {
                var off = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(wOut, hOut) : null;
                if (!off) {
                  try {
                    if (typeof createImageBitmap === 'function') {
                      createImageBitmap(bmp, 0, 0, w, h, { resizeWidth: wOut, resizeHeight: hOut }).then(function(ib2){
                        try { self.postMessage({ type: 'preview-quick-bmp', jobId: jid, bitmap: ib2, w: wOut, h: hOut }, [ib2]); } catch(_y){}
                        dbg('quick-posted', { type: 'bmp', w: wOut, h: hOut });
                        try { self.postMessage({ type: 'progress', jobId: jid, percent: 60 }); } catch(_e){}
                        try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}
                      }).catch(function(){ try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){} });
                    } else {
                      try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}
                    }
                  } catch(__e) { try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){} }
                  try { bmp.close && bmp.close(); } catch(_){}; return;
                }
                var cx = off.getContext('2d');
                try { cx.imageSmoothingEnabled = false; } catch(_s){}
                cx.drawImage(bmp, 0, 0, wOut, hOut);
                off.convertToBlob && off.convertToBlob({ type: 'image/png' }).then(function(pb){
                  try { self.postMessage({ type: 'preview-quick', jobId: jid, blob: pb, w: wOut, h: hOut }); dbg('quick-posted', { type: 'blob', w: wOut, h: hOut }); } catch(eQP){ dbg('quick-post-error', String(eQP)); try { var ibq = off.transferToImageBitmap ? off.transferToImageBitmap() : null; if (ibq) { self.postMessage({ type: 'preview-quick-bmp', jobId: jid, bitmap: ibq, w: wOut, h: hOut }, [ibq]); dbg('quick-posted', { type: 'bmp', w: wOut, h: hOut }); } } catch(eQPB){ dbg('quick-post-bmp-error', String(eQPB)); }
                  }
                  try { self.postMessage({ type: 'progress', jobId: jid, percent: 60 }); } catch(_e){}
                  
                  
                  try {
                    if (cancelled.has(jid)) { dbg('preview-cancelled-before-final', { jobId: jid }); try { bmp && bmp.close && bmp.close(); } catch(_){}; return; }
                    if (jid !== currentPreviewJob) { dbg('preview-race-before-final', { jobId: jid, current: currentPreviewJob }); try { bmp && bmp.close && bmp.close(); } catch(_){}; return; }
                    var factor = Math.max(1, Number(px) || 1);
                    var dstW = Math.max(1, Math.floor(w / factor));
                    var dstH = Math.max(1, Math.floor(h / factor));
                    
                    var hasDithering = ditherMethod && ditherMethod !== 'none';
                    var hasBlur = (blurMode !== 'none' && blurRadius > 0);
                    var hasSharpen = (sharpenAmount > 0 && sharpenRadius > 0);
                    var poolAvailable = hasWorkerPool && workerPoolInfo.readyCount >= workerPoolInfo.size && !hasDithering && !hasBlur && !hasSharpen && !edgeEnabled;
                    dbg('pool-decision', { hasWorkerPool: hasWorkerPool, readyCount: workerPoolInfo.readyCount, size: workerPoolInfo.size, hasDithering: hasDithering, ditherMethod: ditherMethod, hasBlur: hasBlur, blurMode: blurMode, blurRadius: blurRadius, hasSharpen: hasSharpen, sharpenAmount: sharpenAmount, sharpenRadius: sharpenRadius, sharpenThreshold: sharpenThreshold, poolAvailable: poolAvailable });
                    if (poolAvailable) {
                      try {
                        var mergeCanvas = new OffscreenCanvas(dstW, dstH);
                        var mergeCtx = mergeCanvas.getContext('2d', { willReadFrequently: true });
                        try { mergeCtx.imageSmoothingEnabled = false; } catch(_s){}
                        stripeJobs.set(jid, { canvas: mergeCanvas, ctx: mergeCtx, expected: 0, received: 0, factor: factor, dstW: dstW, dstH: dstH });
                        jobCtx.set(jid, { key: key, ditherLevels: ditherLevels, ditherMethod: ditherMethod, outlineThickness: outlineThickness, erodeAmount: erodeAmount, simplifyArea: simplifyArea, palette: palette, modeRadius: modeRadius, posterizeLevels: posterizeLevels, posterizeAfterPalette: posterizeAfterPalette, gamma: gamma, kwEnabled: kwEnabled, kwRadius: kwRadius, kwSectors: kwSectors, kwStrengthPct: kwStrengthPct, kwAnisotropyPct: kwAnisotropyPct, kwAfterPalette: kwAfterPalette, kwBlend: kwBlend, quantMethod: String(msg.quantMethod||'rgb'), colorCorrectionEnabled: !!msg.colorCorrectionEnabled, brightness: (msg.brightness|0)||0, contrast: (msg.contrast|0)||0, saturation: (msg.saturation|0)||0, hue: (msg.hue|0)||0 });
                        var stripeHeight = Math.ceil(h / workerPoolInfo.size);
                        var stripePromises = [];
                        for (var i = 0; i < workerPoolInfo.size; i++) {
                          var startY = i * stripeHeight;
                          var endY = Math.min(startY + stripeHeight, h);
                          var actualHeight = endY - startY;
                          if (actualHeight > 0) {
                            (function(workerId, stripeStartY, stripeActualHeight){
                              stripePromises.push(
                                createImageBitmap(bmp, 0, stripeStartY, w, stripeActualHeight)
                                  .then(function(stripeBitmap){
                                    return { stripeBitmap: stripeBitmap, workerId: workerId, startY: stripeStartY, height: stripeActualHeight };
                                  })
                              );
                            })(i, startY, actualHeight);
                          }
                        }
                        Promise.all(stripePromises).then(function(stripes){
                          var st = stripeJobs.get(jid); if (st) st.expected = stripes.length;
                          try {
                            self.postMessage({
                              type: 'dispatch-stripes-to-pool',
                              command: 'process-real-stripe',
                              jobId: jid,
                              poolSize: workerPoolInfo.size,
                              stripes: stripes,
                              processingParams: { factor: factor, method: method, srcWidth: w, srcHeight: h }
                            });
                          } catch(_dp) {}
                          try { bmp && bmp.close && bmp.close(); } catch(_c){}
                        }).catch(function(err){ dbg('parallel-error', 'Failed to create stripes: ' + err); try { bmp && bmp.close && bmp.close(); } catch(_c2){} });
                      } catch (_pe) {
                        dbg('parallel-error', String(_pe));
                        
                      }
                      return;
                    }
                    
                    dbg('single-thread-start', { ditherMethod, levels: ditherLevels, paletteLength: palette ? palette.length : 0 });
                    var c1 = new OffscreenCanvas(dstW, dstH);
                    var x1 = c1.getContext('2d', { willReadFrequently: true });
                    x1.imageSmoothingEnabled = (method !== 'nearest');
                    x1.clearRect(0, 0, dstW, dstH);
                    var srcCanvas = null;
                    if (blurMode !== 'none' && blurRadius > 0) {
                      var pre = new OffscreenCanvas(w, h);
                      var prex = pre.getContext('2d', { willReadFrequently: true });
                      try { prex.imageSmoothingEnabled = false; } catch(_s){}
                      prex.clearRect(0,0,w,h);
                      prex.drawImage(bmp, 0, 0);
                      pre = preBlur(pre, blurMode, blurRadius);
                      if (sharpenAmount > 0 && sharpenRadius > 0) {
                        pre = unsharp(pre, sharpenAmount, sharpenRadius, sharpenThreshold);
                      }
                      srcCanvas = pre;
                    } else {
                      if (sharpenAmount > 0 && sharpenRadius > 0) {
                        var pre2 = new OffscreenCanvas(w, h);
                        var pre2x = pre2.getContext('2d', { willReadFrequently: true });
                        try { pre2x.imageSmoothingEnabled = false; } catch(_s){}
                        pre2x.clearRect(0,0,w,h);
                        pre2x.drawImage(bmp, 0, 0);
                        pre2 = unsharp(pre2, sharpenAmount, sharpenRadius, sharpenThreshold);
                        srcCanvas = pre2;
                      } else {
                        srcCanvas = bmp;
                      }
                    }
                    x1.drawImage(srcCanvas, 0, 0, dstW, dstH);
                    var edgeMask = null; if (edgeEnabled){ try{ var base = new OffscreenCanvas(dstW,dstH); var bx = base.getContext('2d',{willReadFrequently:true}); try{ bx.imageSmoothingEnabled=false; }catch(_){} bx.clearRect(0,0,dstW,dstH); bx.drawImage(bmp,0,0,dstW,dstH); var em = String(msg.edgeMethod||'sobel'); edgeMask = (em==='prewitt'?prewittEdgeMask(base, edgeThreshold|0, !!edgeThin) : (em==='scharr'?scharrEdgeMask(base, edgeThreshold|0, !!edgeThin) : (em==='laplacian'?laplacianEdgeMask(base, edgeThreshold|0) : sobelEdgeMask(base, edgeThreshold|0, !!edgeThin)))); var eth = Math.max(1, edgeThickness|0); if (eth>1 && edgeMask) edgeMask = dilateMask(edgeMask, base.width|0, base.height|0, eth-1); } catch(_ed){} }
                    var adaptMask = null; var adaptWeights = null; if (adaptEnabled){ try{ var baseA = new OffscreenCanvas(dstW,dstH); var bxa = baseA.getContext('2d',{willReadFrequently:true}); try{ bxa.imageSmoothingEnabled=false; }catch(_){} bxa.clearRect(0,0,dstW,dstH); bxa.drawImage(bmp,0,0,dstW,dstH); adaptMask = (adaptMethod==='prewitt'?prewittEdgeMask(baseA, adaptThreshold|0, !!adaptThin) : (adaptMethod==='scharr'?scharrEdgeMask(baseA, adaptThreshold|0, !!adaptThin) : (adaptMethod==='laplacian'?laplacianEdgeMask(baseA, adaptThreshold|0) : sobelEdgeMask(baseA, adaptThreshold|0, !!adaptThin)))); var ath = Math.max(1, adaptThickness|0); if (ath>1 && adaptMask) adaptMask = dilateMask(adaptMask, baseA.width|0, baseA.height|0, ath-1); if ((adaptFeather|0)>0 && adaptMask){ adaptWeights = blurMaskToWeights(adaptMask, baseA.width|0, baseA.height|0, adaptFeather|0); } } catch(_ad){} }
                    var levels = Math.max(2, Math.min(10, (typeof ditherLevels==='number'? ditherLevels : 2)));
                    
                    if (msg.colorCorrectionEnabled) {
                      c1 = applyColorCorrection(c1, true, (msg.brightness|0)||0, (msg.contrast|0)||0, (msg.saturation|0)||0, (msg.hue|0)||0, gamma);
                    }
                    try { var pz1=(posterizeLevels|0)||0; if (pz1>=2){ var pz1c=Math.max(2, Math.min(16, pz1)); c1 = posterize(c1, pz1c); } } catch(_pz){}
                    try { if (kwEnabled){ c1 = kuwaharaStage(c1, kwRadius, ((kwSectors|0)===8)?8:4, kwStrengthPct, kwAnisotropyPct, kwBlend); } } catch(_kw){}
                    try {
                      var diffusionSet2 = { floyd:1, falsefloydsteinberg:1, burkes:1, jarvis:1, stucki:1, sierra:1, twosierra:1, sierralite:1, atkinson:1 };
                      dbg('single-dither-check', { ditherMethod, hasPalette: !!(palette && palette.length), isDiffusion: !!diffusionSet2[ditherMethod] });
                      var canvasNoDither = null; if (adaptMask && palette && palette.length){ try{ var cnd = new OffscreenCanvas(dstW,dstH); var cndx = cnd.getContext('2d',{willReadFrequently:true}); cndx.imageSmoothingEnabled=false; cndx.clearRect(0,0,dstW,dstH); cndx.drawImage(c1,0,0); canvasNoDither = quantizeToPalette(cnd, palette); } catch(_cnd){} }
                      if (palette && palette.length && diffusionSet2[ditherMethod]) {
                        dbg('single-using-diffusion', ditherMethod);
                        
                        
                        var testCtx = c1.getContext('2d',{willReadFrequently:true}); 
                        var testData = testCtx.getImageData(0,0,Math.min(10,c1.width),1).data;
                        dbg('pixels-before-diffusion', { sample: [testData[0], testData[1], testData[2], testData[4], testData[5], testData[6]] });
                        
                        switch(ditherMethod){
                          case 'floyd': { 
                            
                            var sN2 = Math.max(0.1, Math.min(1, levels / 10)); 
                            dbg('before-dErrorPaletteCanvas-call', { hasFunc: typeof dErrorPaletteCanvas, sN2, levels });
                            c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:7},{dx:-1,dy:1,w:3},{dx:0,dy:1,w:5},{dx:1,dy:1,w:1}],16,true,sN2);
                            dbg('after-dErrorPaletteCanvas-call', 'returned from floyd');
                          } break;
                          case 'falsefloydsteinberg': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:3},{dx:0,dy:1,w:3},{dx:1,dy:1,w:2}],8,true,sN2); } break;
                          case 'burkes': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2}],32,true,sN2); } break;
                          case 'jarvis': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:7},{dx:2,dy:0,w:5},{dx:-2,dy:1,w:3},{dx:-1,dy:1,w:5},{dx:0,dy:1,w:7},{dx:1,dy:1,w:5},{dx:2,dy:1,w:3},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:3},{dx:0,dy:2,w:5},{dx:1,dy:2,w:3},{dx:2,dy:2,w:1}],48,true,sN2); } break;
                          case 'stucki': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:4},{dx:1,dy:2,w:2},{dx:2,dy:2,w:1}],42,true,sN2); } break;
                          case 'sierra': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:5},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:5},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:3},{dx:1,dy:2,w:2}],32,true,sN2); } break;
                          case 'twosierra': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:4},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:1},{dx:-1,dy:1,w:2},{dx:0,dy:1,w:3},{dx:1,dy:1,w:2},{dx:2,dy:1,w:1}],16,true,sN2); } break;
                          case 'sierralite': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:2},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1}],4,true,sN2); } break;
                          case 'atkinson': { var sN2 = Math.max(0, Math.min(1, (levels - 2) / 8)); c1 = dErrorPaletteCanvas(c1,palette,[{dx:1,dy:0,w:1},{dx:2,dy:0,w:1},{dx:-1,dy:1,w:1},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1},{dx:0,dy:2,w:1}],8,true,sN2); } break;
                        }
                        
                        
                        var testCtx2 = c1.getContext('2d',{willReadFrequently:true}); 
                        var testData2 = testCtx2.getImageData(0,0,Math.min(10,c1.width),1).data;
                        dbg('pixels-after-diffusion', { sample: [testData2[0], testData2[1], testData2[2], testData2[4], testData2[5], testData2[6]] });
                        if (canvasNoDither && (adaptWeights || adaptMask)) { try { c1 = adaptWeights ? mixByWeights(c1, canvasNoDither, adaptWeights, !adaptInvert) : mixByMask(c1, canvasNoDither, adaptMask, !adaptInvert); } catch(_mixd){} }
                      } else {
                        
                        var bayerMethods2 = { bayer2:1, bayer4:1, bayer8:1, custom:1 };
                        if (palette && palette.length && bayerMethods2[ditherMethod]) {
                          dbg('single-using-bayer', ditherMethod);
                          
                          var matrix2;
                          if (ditherMethod === 'bayer2') matrix2 = [[0,2],[3,1]];
                          else if (ditherMethod === 'bayer4') matrix2 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
                          else if (ditherMethod === 'bayer8') matrix2 = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
                          else matrix2 = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]]; 
                          
                          
                          var testCtx = c1.getContext('2d',{willReadFrequently:true}); 
                          var testData = testCtx.getImageData(0,0,Math.min(10,c1.width),1).data;
                          dbg('pixels-before-bayer', { w: c1.width, h: c1.height, sample: [testData[0], testData[1], testData[2], testData[4], testData[5], testData[6]] });
                          
                          
                          var bayerStrength = Math.max(0, Math.min(1, levels / 10));
                          dbg('before-dOrderedPalette2-call', { hasFunc: typeof dOrderedPalette2, hasMatrix: !!matrix2, matrixLen: matrix2.length, strength: bayerStrength, levels });
                          c1 = dOrderedPalette2(c1, palette, matrix2, bayerStrength);
                          dbg('after-dOrderedPalette2-call', 'returned from function');
                          if (canvasNoDither && (adaptWeights || adaptMask)) { try { c1 = adaptWeights ? mixByWeights(c1, canvasNoDither, adaptWeights, !adaptInvert) : mixByMask(c1, canvasNoDither, adaptMask, !adaptInvert); } catch(_mixb){} }
                          
                          
                          var testCtx2 = c1.getContext('2d',{willReadFrequently:true}); 
                          var testData2 = testCtx2.getImageData(0,0,Math.min(10,c1.width),1).data;
                          dbg('pixels-after-bayer', { sample: [testData2[0], testData2[1], testData2[2], testData2[4], testData2[5], testData2[6]] });
                        } else if (palette && palette.length && ditherMethod==='random') {
                          dbg('single-using-random', ditherMethod);
                          
                          var s2 = Math.max(0.1, Math.min(1, levels / 10));
                          c1 = dRandomPalette(c1, palette, s2);
                          if (canvasNoDither && (adaptWeights || adaptMask)) { try { c1 = adaptWeights ? mixByWeights(c1, canvasNoDither, adaptWeights, !adaptInvert) : mixByMask(c1, canvasNoDither, adaptMask, !adaptInvert); } catch(_mixr){} }
                        } else {
                          dbg('single-using-old-dither', ditherMethod);
                          c1 = dither(c1, levels, ditherMethod);
                        }
                      }
                    } catch(_p1){}
                    try { self.postMessage({ type: 'progress', jobId: jid, percent: 75, stage: 'quantize' }); } catch(_e){}
                    
                    try {
                      var usedPaletteDithering2 = (palette && palette.length && (diffusionSet2[ditherMethod] || bayerMethods2[ditherMethod] || ditherMethod==='random'));
                      if (!usedPaletteDithering2 && Array.isArray(palette) && palette.length && (palette.length <= 128 || ((simplifyArea|0) > 0))) {
                        c1 = quantizeToPalette(c1, palette);
                      }
                    } catch(_p2){}
                    try { var sa=(simplifyArea|0)||0; if (sa>0){ c1 = simplifyRegions(c1, sa); } } catch(_simp){}
                    
                    
                    try { if ((modeRadius|0)>0) { c1 = modeFilter(c1, (modeRadius|0)); } } catch(_mf){}
                    try { self.postMessage({ type: 'progress', jobId: jid, percent: 85, stage: 'morphology' }); } catch(_e){}
                    try { c1 = erodeInward(c1, erodeAmount); } catch(_p3){}
                    try { c1 = drawBlackOutline(c1, outlineThickness); } catch(_p4){}
                    try { if (edgeMask && palette && palette.length) { var oc = nearestInPalette(palette,0,0,0); c1 = overlayEdges(c1, edgeMask, oc[0]|0, oc[1]|0, oc[2]|0); } } catch(_peo){}
                    try { self.postMessage({ type: 'progress', jobId: jid, percent: 95, stage: 'encode' }); } catch(_e){}
                    (c1.convertToBlob ? c1.convertToBlob({ type: 'image/png' }) : Promise.reject()).then(function(finalBlob){
                      try { self.postMessage({ type: 'preview-final', jobId: jid, key: key, blob: finalBlob, w: c1.width, h: c1.height }); } catch(ePF) { dbg('final-post-error', String(ePF)); }
                      try { finalBlob.arrayBuffer().then(function(bytes){ try { self.postMessage({ type: 'preview-final-bytes', jobId: jid, key: key, bytes: bytes, mime: finalBlob.type || 'image/png', w: c1.width, h: c1.height }, [bytes]); } catch(_eB){} try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){} }).catch(function(){ try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){} }); } catch(_eArr){}
                      try { var ibAux = c1.transferToImageBitmap ? c1.transferToImageBitmap() : null; if (ibAux) { self.postMessage({ type: 'preview-final-bmp', jobId: jid, key: key, bitmap: ibAux, w: c1.width, h: c1.height }, [ibAux]); } } catch(_eBmp){}
                    }).catch(function(){
                      try {
                        var ib = c1.transferToImageBitmap ? c1.transferToImageBitmap() : null;
                        if (ib) { try { self.postMessage({ type: 'preview-final-bmp', jobId: jid, key: key, bitmap: ib, w: c1.width, h: c1.height }, [ib]); } catch(_e){} }
                        try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}
                      } catch(_) { try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){} }
                    });
                  } catch(_procErr) {
                    try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}
                  } finally {
                    try { bmp && bmp.close && bmp.close(); } catch(_){}
                  }
                }).catch(function(){
                  try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}
                });
              } catch(err) {
                try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}; try { bmp && bmp.close && bmp.close(); } catch(_){}
              }
            }).catch(function(){ try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){} });
          } catch (previewErr) {
            dbg('preview-error', { jobId: jid, error: String(previewErr) });
            try { self.postMessage({ type: 'preview-error', jobId: jid, error: String(previewErr) }); } catch(_){ }
            try { self.postMessage({ type: 'preview-done', jobId: jid }); } catch(_e){}
          }
          return;
        }
        if (msg.type === 'magic-select') {
          var mjid = msg.jobId|0;
          try {
            var w = msg.imgWidth|0, h = msg.imgHeight|0;
            var seedX = msg.seedX|0, seedY = msg.seedY|0;
            var tol = msg.tolerance|0;
            var mode = String(msg.mode||'local'); 
            var pixBuf = msg.pixels; 
            if (!pixBuf || !w || !h) { try { self.postMessage({ type: 'magic-region', jobId: mjid, error: 'bad-args' }); } catch(_){}; return; }
            var data = new Uint8ClampedArray(pixBuf);
            var N = w*h;
            var region = new Uint8Array(N);
            function idx(x,y){ return (y*w + x) * 4; }
            var i0 = idx(seedX, seedY);
            var sr = data[i0], sg = data[i0+1], sb = data[i0+2];
            if (mode === 'global') {
              for (var i=0, p=0; i<N; i++, p+=4) {
                var dr = Math.abs((data[p]|0) - sr);
                var dg = Math.abs((data[p+1]|0) - sg);
                var db = Math.abs((data[p+2]|0) - sb);
                var md = dr>dg? (dr>db?dr:db) : (dg>db?dg:db);
                if (md <= tol) region[i] = 1;
              }
            } else {
              
              var visited = new Uint8Array(N);
              var qx = new Int32Array(N);
              var qy = new Int32Array(N);
              var qs=0, qe=0;
              qx[qe]=seedX; qy[qe]=seedY; qe++;
              while (qs < qe) {
                var x = qx[qs], y = qy[qs]; qs++;
                if (x<0||y<0||x>=w||y>=h) continue;
                var li = y*w + x; if (visited[li]) continue; visited[li]=1;
                var off = li*4;
                var r = data[off], g = data[off+1], b = data[off+2];
                var dr = Math.abs(r - sr), dg = Math.abs(g - sg), db = Math.abs(b - sb);
                var md = dr>dg? (dr>db?dr:db) : (dg>db?dg:db);
                if (md <= tol) {
                  region[li]=1;
                  
                  qx[qe]=x-1; qy[qe]=y; qe++;
                  qx[qe]=x+1; qy[qe]=y; qe++;
                  qx[qe]=x; qy[qe]=y-1; qe++;
                  qx[qe]=x; qy[qe]=y+1; qe++;
                  qx[qe]=x-1; qy[qe]=y-1; qe++;
                  qx[qe]=x+1; qy[qe]=y-1; qe++;
                  qx[qe]=x-1; qy[qe]=y+1; qe++;
                  qx[qe]=x+1; qy[qe]=y+1; qe++;
                }
              }
            }
            try { self.postMessage({ type: 'magic-region', jobId: mjid, width: w, height: h, regionBuffer: region.buffer }, [region.buffer]); } catch(eMR) { try { self.postMessage({ type: 'magic-region', jobId: mjid, error: String(eMR) }); } catch(_){} }
          } catch (eM) {
            try { self.postMessage({ type: 'magic-region', jobId: mjid, error: String(eM) }); } catch(_){}
          }
          return;
        }
        if (msg.type === 'stats') {
          var sid = msg.jobId; var k = msg.key; var bl = msg.blob;
          dbg('stats-start', { jobId: sid, key: k });
          if (cancelled.has(sid)) { dbg('stats-cancelled', { jobId: sid }); return; }
          if (!bl || typeof createImageBitmap !== 'function') { try { self.postMessage({ type: 'stats-done', jobId: sid, key: k, stats: { w: 0, h: 0, opaque: 0, colors: 0 } }); } catch(_e){}; return; }
          createImageBitmap(bl).then(function(bmp){
            var w = bmp.width || 0, h = bmp.height || 0;
            try {
              var off = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : null;
              if (!off) { self.postMessage({ type: 'stats-done', jobId: sid, key: k, stats: { w: w, h: h, opaque: 0, colors: 0 } }); try { bmp.close && bmp.close(); } catch(_){}; return; }
              var cx = off.getContext('2d', { willReadFrequently: true });
              cx.drawImage(bmp, 0, 0);
              var img = cx.getImageData(0, 0, w, h);
              var data = img.data;
              var opaque = 0;
              var set = new Set();
              for (var i = 0; i < data.length; i += 4) {
                var a = data[i + 3] | 0;
                if (a >= 128) {
                  opaque++;
                  var r = data[i] | 0, g = data[i + 1] | 0, b2 = data[i + 2] | 0;
                  set.add(((r & 255) << 16) | ((g & 255) << 8) | (b2 & 255));
                }
              }
              try { self.postMessage({ type: 'stats-done', jobId: sid, key: k, stats: { w: w, h: h, opaque: opaque, colors: set.size|0 } }); } catch(_e){}
            } catch(_errStats) {
              try { self.postMessage({ type: 'stats-done', jobId: sid, key: k, stats: { w: w, h: h, opaque: 0, colors: 0 } }); } catch(_e){}
            } finally {
              try { bmp.close && bmp.close(); } catch(_){ }
            }
          }).catch(function(){ try { self.postMessage({ type: 'stats-done', jobId: sid, key: k, stats: { w: 0, h: 0, opaque: 0, colors: 0 } }); } catch(_e){} });
          return;
        }
      } catch(e) {
        try { self.postMessage({ type: 'error', error: String(e) }); } catch(_){ }
      }
    };
  `;
}
