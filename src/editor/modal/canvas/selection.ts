
export function fitAnts(node: SVGElement) {
  let ro: ResizeObserver | null = null;
  
  function update() {
    try {
      const host = node.parentElement;
      if (!host) return;
      
      const r = host.getBoundingClientRect();
      const w = Math.max(0, Math.round(r.width));
      const h = Math.max(0, Math.round(r.height));
      node.setAttribute('viewBox', `0 0 ${w} ${h}`);
      
      const path = node.querySelector('path');
      const makeD = (x0: number, y0: number, x1: number, y1: number, 
                     rtlx: number, rtly: number, rtrx: number, rtry: number, 
                     rbrx: number, rbry: number, rblx: number, rbly: number) => [
        `M ${x0 + rtlx},${y0}`,
        `L ${x1 - rtrx},${y0}`,
        `A ${rtrx} ${rtry} 0 0 1 ${x1} ${y0 + rtry}`,
        `L ${x1} ${y1 - rbry}`,
        `A ${rbrx} ${rbry} 0 0 1 ${x1 - rbrx} ${y1}`,
        `L ${x0 + rblx} ${y1}`,
        `A ${rblx} ${rbly} 0 0 1 ${x0} ${y1 - rbly}`,
        `L ${x0} ${y0 + rtly}`,
        `A ${rtlx} ${rtly} 0 0 1 ${x0 + rtlx} ${y0}`,
        'Z'
      ].join(' ');
      
      if (path) {
        const cs = getComputedStyle(host);
        const parseR = (v: string) => {
          const s = String(v).trim().split('/')
            .map(part => part.trim().split(/\s+/).map(n => parseFloat(n)||0));
          const a = s[0]; 
          const b = s[1] || a;
          return { x: a[0] || 0, y: b[0] || a[0] || 0 };
        };
        
        const TL = parseR(cs.borderTopLeftRadius);
        const TR = parseR(cs.borderTopRightRadius);
        const BR = parseR(cs.borderBottomRightRadius);
        const BL = parseR(cs.borderBottomLeftRadius);
        const bwT = parseFloat(cs.borderTopWidth) || 0;
        const bwR = parseFloat(cs.borderRightWidth) || 0;
        const bwB = parseFloat(cs.borderBottomWidth) || 0;
        const bwL = parseFloat(cs.borderLeftWidth) || 0;
        const bw = (bwT + bwR + bwB + bwL) / 4;
        const dpr = (window.devicePixelRatio || 1);
        const snap = (v: number) => Math.round(v * dpr) / dpr;
        const inset = bw / 2;
        const x0 = snap(Math.max(0, inset));
        const y0 = snap(Math.max(0, inset));
        const x1 = snap(Math.max(x0, w - inset));
        const y1 = snap(Math.max(y0, h - inset));
        
        let rtlx = Math.max(0, TL.x - inset), rtly = Math.max(0, TL.y - inset);
        let rtrx = Math.max(0, TR.x - inset), rtry = Math.max(0, TR.y - inset);
        let rbrx = Math.max(0, BR.x - inset), rbry = Math.max(0, BR.y - inset);
        let rblx = Math.max(0, BL.x - inset), rbly = Math.max(0, BL.y - inset);
        
        const iw = Math.max(0, x1 - x0);
        const ih = Math.max(0, y1 - y0);
        const scaleX = Math.min(1, 
          rtlx + rtrx > 0 ? iw / (rtlx + rtrx) : 1, 
          rblx + rbrx > 0 ? iw / (rblx + rbrx) : 1);
        const scaleY = Math.min(1, 
          rtly + rbly > 0 ? ih / (rtly + rbly) : 1, 
          rtry + rbry > 0 ? ih / (rtry + rbry) : 1);
          
        rtlx *= scaleX; rtrx *= scaleX; rblx *= scaleX; rbrx *= scaleX;
        rtly *= scaleY; rtry *= scaleY; rbly *= scaleY; rbry *= scaleY;
        rtlx = snap(rtlx); rtly = snap(rtly);
        rtrx = snap(rtrx); rtry = snap(rtry);
        rbrx = snap(rbrx); rbry = snap(rbry);
        rblx = snap(rblx); rbly = snap(rbly);
        
        path.setAttribute('d', makeD(x0, y0, x1, y1, rtlx, rtly, rtrx, rtry, rbrx, rbry, rblx, rbly));
        
        let L = 0; 
        try { L = path.getTotalLength(); } catch {}
        const ideal = 24;
        const pairs = Math.max(10, Math.round(L / ideal));
        const dash = L / (pairs * 2);
        path.style.setProperty('--dash', `${dash.toFixed(2)}px`);
        const speed = Math.max(0.8, Math.min(1.8, L / 220));
        path.style.setProperty('--ants-speed', `${speed.toFixed(2)}s`);
      }
    } catch {}
  }
  
  try { 
    ro = new ResizeObserver(update); 
    ro.observe(node.parentElement!); 
  } catch {}
  
  update();
  
  return { 
    destroy() { 
      try { 
        ro && ro.disconnect(); 
      } catch {} 
    } 
  };
}
