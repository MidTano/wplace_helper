import { t } from '../i18n';
export function playTvShutdown(durationMs: number = 1500, opts?: any): Promise<void> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';
    container.style.background = '#000';
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    document.body.appendChild(container);

    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    function resize() {
      const w = Math.floor(container.clientWidth * dpr);
      const h = Math.floor(container.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    resize();

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false }) as WebGLRenderingContext | null;
    if (!gl) {
      showFinalHold(container, opts);
      resolve();
      return;
    }
    const gl2 = gl as WebGLRenderingContext;

    function showFinalHold(root: HTMLDivElement, options?: any) {
      try {
        root.style.pointerEvents = 'auto';
        let styleTag = document.getElementById('wplace-tv-style') as HTMLStyleElement | null;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'wplace-tv-style';
          styleTag.textContent = [
            '@keyframes tvFlicker{0%{opacity:1}50%{opacity:.97}100%{opacity:1}}',
            '@keyframes tvCursorBlink{0%{opacity:1}49%{opacity:1}50%{opacity:0}100%{opacity:0}}',
            '@keyframes tvScan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}',
            '.buzz_wrapper{position:relative;width:min(1200px,96vw);margin:0 auto;background:#000;overflow:hidden;padding:clamp(8px,2vw,28px) clamp(12px,2vw,22px) clamp(8px,2vw,22px)}',
            '.buzz_wrapper .scanline{width:100%;display:block;background:#000;height:4px;position:relative;z-index:3;margin-bottom:5px;opacity:.1}',
            '.buzz_wrapper .text{position:relative;height:clamp(60px,14vw,120px);animation:jerkwhole 5s infinite}',
            '.buzz_wrapper .text span{position:absolute;filter:blur(1px);font-size:clamp(28px,9vw,80px);font-family:"Courier New",monospace;font-weight:700;animation:blur 30ms infinite,jerk 50ms infinite}',
            '.buzz_wrapper .text span:nth-child(1){color:red;transform:translateX(-2px);filter:blur(2px)}',
            '.buzz_wrapper .text span:nth-child(2){color:lime;transform:translateX(2px);filter:blur(2px);animation:jerkgreen 1s infinite}',
            '.buzz_wrapper .text span:nth-child(3){color:#36f;animation:jerkblue 1s infinite}',
            '.buzz_wrapper .text span:nth-child(4){color:#fff;text-shadow:0 0 50px rgba(255,255,255,.4)}',
            '.buzz_wrapper .text span:nth-child(5){color:rgba(255,255,255,.4);filter:blur(15px)}',
            '@keyframes blur{0%{filter:blur(1px);opacity:.8}50%{filter:blur(1px);opacity:1}100%{filter:blur(1px);opacity:.8}}',
            '@keyframes jerk{50%{left:1px}51%{left:0}}',
            '@keyframes jerkup{50%{top:1px}51%{top:0}}',
            '@keyframes jerkblue{0%{left:0}30%{left:0}31%{left:10px}32%{left:0}98%{left:0}100%{left:10px}}',
            '@keyframes jerkgreen{0%{left:0}30%{left:0}31%{left:-10px}32%{left:0}98%{left:0}100%{left:-10px}}',
            '@keyframes jerkwhole{30%{}40%{opacity:1;top:0;left:0;transform:scale(1,1) skew(0,0)}41%{opacity:.8;top:0;left:-100px;transform:scale(1,1.2) skew(50deg,0)}42%{opacity:.8;top:0;left:100px;transform:scale(1,1.2) skew(-80deg,0)}43%{opacity:1;top:0;left:0;transform:scale(1,1) skew(0,0)}65%{}}'
          ].join('\n');
          document.head.appendChild(styleTag);
        }
        const frame = document.createElement('div');
        frame.style.position = 'absolute';
        frame.style.inset = '0';
        frame.style.display = 'flex';
        frame.style.alignItems = 'center';
        frame.style.justifyContent = 'center';
        frame.style.perspective = '900px';
        frame.style.pointerEvents = 'auto';
        const panel = document.createElement('div');
        panel.style.position = 'relative';
        panel.style.maxWidth = '96vw';
        panel.style.transform = 'translateZ(0) scale(1.005)';
        panel.style.filter = 'contrast(1.12) saturate(1.15)';
        panel.style.animation = 'tvFlicker 2.2s infinite';
        const headline = (options && options.headline) || t('shutdown.headline');
        const defaultLines = [t('shutdown.line1'), t('shutdown.line2'), t('shutdown.line3'), t('shutdown.line4')];
        const tailLines = (options && options.messageLines && Array.isArray(options.messageLines) && options.messageLines.length)
          ? options.messageLines.slice()
          : defaultLines;
        const allLines = [headline, ...tailLines];
        const rows = [] as { spans: HTMLSpanElement[]; full: string; fit: HTMLDivElement }[];
        for (let ri = 0; ri < allLines.length; ri++) {
          const wrapper = document.createElement('div');
          wrapper.className = 'buzz_wrapper';
          const textDiv = document.createElement('div');
          textDiv.className = 'text';
          if (ri > 0) { textDiv.style.height = 'clamp(38px,8vw,64px)'; wrapper.style.padding = '8px 14px 8px'; }
          const spans: HTMLSpanElement[] = [];
          for (let i = 0; i < 5; i++) {
            const sp = document.createElement('span');
            sp.textContent = '';
            if (ri > 0) { sp.style.fontSize = 'clamp(20px,5.8vw,48px)'; }
            textDiv.appendChild(sp);
            spans.push(sp);
          }
          const fit = document.createElement('div');
          fit.style.transformOrigin = 'left center';
          fit.appendChild(textDiv);
          wrapper.appendChild(fit);
          panel.appendChild(wrapper);
          rows.push({ spans, full: String(allLines[ri] || ''), fit });
        }
        const scan = document.createElement('div');
        scan.style.position = 'absolute';
        scan.style.left = '0';
        scan.style.right = '0';
        scan.style.top = '-100%';
        scan.style.height = '200%';
        scan.style.background = 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(255,255,255,0.05))';
        scan.style.mixBlendMode = 'screen';
        scan.style.animation = 'tvScan 6s linear infinite';
        scan.style.pointerEvents = 'none';
        const mask = document.createElement('div');
        mask.style.position = 'absolute';
        mask.style.inset = '0';
        mask.style.pointerEvents = 'none';
        mask.style.background = 'radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 85%, rgba(0,0,0,0.75) 100%)';
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.inset = '0';
        dot.style.pointerEvents = 'none';
        dot.style.backgroundImage = 'radial-gradient(rgba(255,72,72,0.12) 18%, rgba(0,0,0,0) 19%)';
        dot.style.backgroundSize = '3px 3px';
        dot.style.opacity = '0.55';
        dot.style.mixBlendMode = 'screen';
        
        frame.appendChild(dot);
        frame.appendChild(mask);
        frame.appendChild(panel);
        frame.appendChild(scan);
        root.appendChild(frame);
        let li = 0, ci = 0; let st = 0; let holdMs = Math.max(600, Math.min(6000, (options && options.holdMs) || 1800));
        function setRow(ri: number, txt: string){ const r = rows[ri]; for (let k = 0; k < r.spans.length; k++) r.spans[k].textContent = txt; }
        function fitRow(ri: number){
          try{
            const r = rows[ri]; if (!r) return;
            const ref = r.spans[3] || r.spans[0];
            const pw = Math.max(80, Math.min(root.clientWidth || 0, panel.clientWidth || 0)) * 0.96;
            const w = ref.getBoundingClientRect().width || 0;
            const s = w>0?Math.min(1, pw / w):1;
            r.fit.style.transform = 'scale(' + s.toFixed(4) + ')';
          } catch {}
        }
        function onRes(){ for (let i = 0; i < rows.length; i++) fitRow(i); }
        function typeDelay(ch: string){ const base = 22; const jitter = Math.floor(Math.random()*28); const extra = (',.!?…'.indexOf(ch)>=0)?120:(ch===' '?24:0); return base + jitter + extra; }
        function eraseDelay(ch: string){ const base = 12; const jitter = Math.floor(Math.random()*12); const extra = (',.!?…'.indexOf(ch)>=0)?60:0; return base + jitter + extra; }
        function randWrongChar(src: string){ const pool='абвгдежзийклмнопрстуфхцчшщыэюяqwertyuiopasdfghjklzxcvbnm0123456789'; const c=pool.charAt(Math.floor(Math.random()*pool.length)); return (c && c!==src)?c:'x'; }
        function drive(){
          if (st === 0){
            if (li >= rows.length){ st = 1; setTimeout(drive, holdMs); return; }
            const row = rows[li]; const line = row.full;
            if (ci <= line.length){
              const txt = line.slice(0, ci);
              setRow(li, txt);
              fitRow(li);
              const ch = line.charAt(ci) || ' ';
              const prev = line.charAt(ci-1) || ' ';
              const misprint = (/[A-Za-zА-Яа-я0-9]/.test(ch) && Math.random() < 0.12);
              if (misprint){
                const wrong = randWrongChar(ch);
                setRow(li, txt + wrong);
                setTimeout(()=>{ setRow(li, txt); fitRow(li); setTimeout(drive, 40); }, 120);
                return;
              }
              ci++;
              setTimeout(drive, typeDelay(prev));
            }
            else { li++; ci = 0; setTimeout(drive, 220); }
          } else if (st === 1){ st = 2; li = rows.length - 1; ci = rows[li].full.length; setTimeout(drive, 40); }
          else {
            if (li < 0){ st = 0; li = 0; ci = 0; setTimeout(drive, 420); return; }
            const row = rows[li]; const line = row.full;
            if (ci >= 0){ const txt = line.slice(0, ci); setRow(li, txt); fitRow(li); const ch = line.charAt(ci) || ' '; ci--; setTimeout(drive, eraseDelay(ch)); }
            else { li--; if (li >= 0){ ci = rows[li].full.length; setTimeout(drive, 60); } else { st = 0; li = 0; ci = 0; setTimeout(drive, 420); } }
          }
        }
        setTimeout(()=>{ fitRow(0); try{ window.addEventListener('resize', onRes); } catch{} drive(); }, 300);
      } catch {}
    }

    function makeShader(type: number, src: string): WebGLShader {
      const sh = gl2.createShader(type)!;
      gl2.shaderSource(sh, src);
      gl2.compileShader(sh);
      if (!gl2.getShaderParameter(sh, gl2.COMPILE_STATUS)) {
        gl2.deleteShader(sh);
        throw new Error('shader');
      }
      return sh;
    }
    function makeProgram(vsSrc: string, fsSrc: string): WebGLProgram {
      const vs = makeShader(gl2.VERTEX_SHADER, vsSrc);
      const fs = makeShader(gl2.FRAGMENT_SHADER, fsSrc);
      const p = gl2.createProgram()!;
      gl2.attachShader(p, vs);
      gl2.attachShader(p, fs);
      gl2.linkProgram(p);
      gl2.deleteShader(vs);
      gl2.deleteShader(fs);
      if (!gl2.getProgramParameter(p, gl2.LINK_STATUS)) {
        gl2.deleteProgram(p);
        throw new Error('program');
      }
      return p;
    }

    const vs = "attribute vec2 a; void main(){ gl_Position=vec4(a,0.0,1.0); }";
    const fs = [
      'precision highp float;',
      'uniform vec2 uR;',
      'uniform float uT;',
      'float sat(float x){ return clamp(x,0.0,1.0); }',
      'float ga(float x, float k){ return exp(-abs(x)*k); }',
      'float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }',
      'vec2 barrel(vec2 p, float k){ float r2=dot(p,p); return p*(1.0+k*r2); }',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/uR;',
      ' vec2 p=(uv-0.5)*vec2(uR.x/uR.y,1.0);',
      ' float t=sat(uT);',
      ' float e=pow(smoothstep(0.0,1.0,t),2.4);',
      ' float e2=smoothstep(0.6,1.0,t);',
      ' float kb=mix(0.06,0.35,e2);',
      ' p=barrel(p,kb);',
      ' float k1=mix(12.0,2400.0,e);',
      ' float w=max(0.0008,mix(1.0,0.0009,e2));',
      ' vec2 pr=vec2(p.x*1.012,p.y);',
      ' vec2 pg=p;',
      ' vec2 pb=vec2(p.x*0.988,p.y);',
      ' vec2 qr=vec2(pr.x/w,pr.y/max(0.001,mix(1.0,0.25,e)));',
      ' vec2 qg=vec2(pg.x/w,pg.y/max(0.001,mix(1.0,0.25,e)));',
      ' vec2 qb=vec2(pb.x/w,pb.y/max(0.001,mix(1.0,0.25,e)));',
      ' float liner=ga(pr.y,k1);',
      ' float lineg=ga(pg.y,k1);',
      ' float lineb=ga(pb.y,k1);',
      ' float dotr=exp(-dot(qr,qr)*1300.0);',
      ' float dotg=exp(-dot(qg,qg)*1200.0);',
      ' float dotb=exp(-dot(qb,qb)*1100.0);',
      ' float scan=0.06*sin(uv.y*uR.y*1.6 + t*82.0);',
      ' float baseR=sat(liner*0.95 + dotr + scan*0.4);',
      ' float baseG=sat(lineg*0.95 + dotg + scan*0.4);',
      ' float baseB=sat(lineb*0.95 + dotb + scan*0.4);',
      ' float g1=(h(uv*vec2(uR.x*0.5,uR.y*0.5)+t*131.5)-0.5)*2.0;',
      ' float g2=(h(uv*vec2(uR.y*0.7,uR.x*0.7)+t*291.7)-0.5)*2.0;',
      ' float gn=(g1+g2)*0.5;',
      ' float gamp=mix(0.65,0.08,e);',
      ' float vig=smoothstep(1.25,0.28,length(p));',
      ' float fade=1.0-smoothstep(0.9,1.0,t);',
      ' vec3 col=vec3(baseR,baseG,baseB);',
      ' col+=gn*gamp;',
      ' col*=1.0+0.6*(1.0-e);',
      ' col*=vig;',
      ' col*=fade;',
      ' gl_FragColor=vec4(col,fade);',
      '}'
    ].join('\n');

    let prog: WebGLProgram | null = null;
    try {
      prog = makeProgram(vs, fs);
    } catch (e) {
      container.parentNode && container.parentNode.removeChild(container);
      resolve();
      return;
    }
    gl2.useProgram(prog);

    const aLoc = gl2.getAttribLocation(prog, 'a');
    const uR = gl2.getUniformLocation(prog, 'uR');
    const uT = gl2.getUniformLocation(prog, 'uT');

    const buf = gl2.createBuffer()!;
    gl2.bindBuffer(gl2.ARRAY_BUFFER, buf);
    gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl2.STATIC_DRAW);
    gl2.enableVertexAttribArray(aLoc);
    gl2.vertexAttribPointer(aLoc, 2, gl2.FLOAT, false, 0, 0);

    gl2.disable(gl2.DEPTH_TEST);
    gl2.disable(gl2.CULL_FACE);
    gl2.enable(gl2.BLEND);
    gl2.blendFunc(gl2.SRC_ALPHA, gl2.ONE_MINUS_SRC_ALPHA);

    const t0 = performance.now();
    let raf = 0;
    let cleaned = false;
    const hardTimer = setTimeout(() => {
      if (cleaned) return;
      cleaned = true;
      try { cancelAnimationFrame(raf); } catch {}
      try { gl2.bindBuffer(gl2.ARRAY_BUFFER, null); gl2.useProgram(null as any); } catch {}
      showFinalHold(container, opts);
      resolve();
    }, Math.max(800, durationMs + 600));
    function frame() {
      resize();
      const now = performance.now();
      const t = Math.min(1, (now - t0) / durationMs);
      gl2.viewport(0, 0, canvas.width, canvas.height);
      gl2.uniform2f(uR, canvas.width, canvas.height);
      gl2.uniform1f(uT, t);
      gl2.drawArrays(gl2.TRIANGLES, 0, 3);
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          if (cleaned) return;
          cleaned = true;
          try { cancelAnimationFrame(raf); } catch {}
          try { gl2.bindBuffer(gl2.ARRAY_BUFFER, null); gl2.useProgram(null as any); } catch {}
          showFinalHold(container, opts);
          try { clearTimeout(hardTimer); } catch {}
          resolve();
        }, 40);
      }
    }
    raf = requestAnimationFrame(frame);
  });
}
