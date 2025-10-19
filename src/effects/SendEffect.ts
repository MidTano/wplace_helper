import { markElement } from '../wguard';

export type SendEffectColor = [number, number, number];

let activeOverlay: HTMLDivElement | null = null;
let activeAnimation: (() => void) | null = null;


function compileShader(gl: WebGL2RenderingContext, type: GLenum, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Unknown error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'Unknown error';
    gl.deleteProgram(program);
    throw new Error(info);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function makeOverlay(): { overlay: HTMLDivElement; canvas: HTMLCanvasElement; gl: WebGL2RenderingContext } | null {
  const overlay = document.createElement('div');
  markElement(overlay);
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2147483646';
  overlay.style.background = 'transparent';

  const canvas = document.createElement('canvas');
  markElement(canvas);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  overlay.appendChild(canvas);

  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) {
    overlay.remove();
    return null;
  }
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  return { overlay, canvas, gl };
}

function resizeCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

const vertexShader = `#version 300 es
precision highp float;
out vec2 vUV;
void main() {
    vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUV = pos;
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uWeights;
uniform vec3 uSeed;
out vec4 fragColor;
void main() {
    vec2 r = uResolution;
    vec2 FC = gl_FragCoord.xy;
    vec2 screenP = (FC * 2.0 - r) / r.y;
    float baseRadius = 0.9;
    float tProg = clamp(uProgress, 0.0, 1.0);
    float circleRadius;
    if (tProg < 0.18) {
        float nt = clamp(tProg / 0.18, 0.0, 1.0);
        float g = 1.0 - pow(1.0 - nt, 2.2);
        circleRadius = baseRadius * 0.5 * g;
    } else if (tProg < 0.82) {
        float nt = clamp((tProg - 0.18) / 0.64, 0.0, 1.0);
        float osc = sin(6.28318 * (2.2 * nt) + uTime * 4.0);
        float amp = 0.04 * (1.0 - nt);
        circleRadius = baseRadius * (0.5 + amp * osc);
    } else {
        float nt = clamp((tProg - 0.82) / 0.18, 0.0, 1.0);
        float e = nt * nt; // ease-in (quad)
        circleRadius = baseRadius * 0.5 * (1.0 - e);
    }
    float distFromCenter = length(screenP);
    float inCircle = smoothstep(circleRadius + 0.1, circleRadius - 0.1, distFromCenter);
    float fade = 1.0;
    if (tProg > 0.82) {
        fade = 1.0 - smoothstep(0.82, 0.95, tProg);
    }
    vec4 o = vec4(0.0);
    if (inCircle > 0.0) {
        vec2 p = screenP * 1.1;
        float angle = length(p) * mix(3.2, 4.8, uSeed.x) + uSeed.y * 6.28318;
        mat2 R = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        p *= R;
        float l = length(p) - 0.7;
        float t = uTime * mix(1.1, 1.7, uSeed.z);
        float enhancedY = p.y;
        float phase1 = uSeed.x * 6.28318;
        float phase2 = uSeed.y * 6.28318 + 2.094;
        float phase3 = uSeed.z * 6.28318 + 4.18879;
        float k = mix(0.9, 1.3, uSeed.y);
        float pattern1 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(k*(l + enhancedY * max(1.0, -l / 0.1)) + t + phase1));
        float pattern2 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(k*(l + enhancedY * max(1.0, -l / 0.1)) + t + phase2));
        float pattern3 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(k*(l + enhancedY * max(1.0, -l / 0.1)) + t + phase3));
        vec3 pw = vec3(pattern1, pattern2, pattern3);
        pw = clamp(pw, 0.0, 1.0);
        vec3 w = pow(pw, vec3(1.6));
        w *= uWeights;
        float s = max(1e-5, w.x + w.y + w.z);
        w /= s;
        vec3 c1 = pow(uColor1, vec3(2.2));
        vec3 c2 = pow(uColor2, vec3(2.2));
        vec3 c3 = pow(uColor3, vec3(2.2));
        vec3 colLin = c1 * w.x + c2 * w.y + c3 * w.z;
        vec3 col = pow(colLin, vec3(1.0/2.2));
        float rim = smoothstep(0.3, 1.0, length(screenP));
        col *= mix(1.12, 1.25, rim);
        o = vec4(col, inCircle * fade);
    }
    fragColor = o;
}
`;

function buildColorWeights(colors: SendEffectColor[]): { colors: SendEffectColor[], weights: number[] } {
  const colorMap = new Map<string, number>();
  for (const c of colors) {
    const key = `${c[0]},${c[1]},${c[2]}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  const entries = Array.from(colorMap.entries());
  entries.sort((a, b) => b[1] - a[1]);
  const topColors = entries.slice(0, 16);
  const resultColors: SendEffectColor[] = [];
  const resultWeights: number[] = [];
  const totalWeight = topColors.reduce((sum, e) => sum + e[1], 0);
  for (const [key, count] of topColors) {
    const parts = key.split(',');
    resultColors.push([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])]);
    resultWeights.push(count / totalWeight);
  }
  return { colors: resultColors, weights: resultWeights };
}

function pickTop3Distinct(cols: SendEffectColor[], w: number[]): { c1: SendEffectColor; c2: SendEffectColor; c3: SendEffectColor; weights: [number, number, number] } {
  if (!cols.length) return { c1: [255,255,255], c2: [255,255,255], c3: [255,255,255], weights: [1,0,0] };
  if (cols.length === 1) return { c1: cols[0], c2: cols[0], c3: cols[0], weights: [1,0,0] };
  const norm = (c: SendEffectColor) => [c[0]/255, c[1]/255, c[2]/255] as [number,number,number];
  const dist = (a: SendEffectColor, b: SendEffectColor) => {
    const A = norm(a), B = norm(b);
    const dx = A[0]-B[0], dy = A[1]-B[1], dz = A[2]-B[2];
    return Math.sqrt(dx*dx+dy*dy+dz*dz);
  };
  let idx1 = 0; let maxW = -1;
  for (let i=0;i<cols.length;i++){ if (w[i] > maxW){ maxW = w[i]; idx1 = i; } }
  let idx2 = 0; let best2 = -1;
  for (let i=0;i<cols.length;i++){ const score = w[i]*dist(cols[i], cols[idx1]); if (score>best2 && i!==idx1){ best2=score; idx2=i; } }
  if (cols.length === 2) {
    const s = Math.max(1e-6, w[idx1] + w[idx2]);
    return { c1: cols[idx1], c2: cols[idx2], c3: cols[idx2], weights: [w[idx1]/s, w[idx2]/s, 0] };
  }
  let idx3 = 0; let best3 = -1;
  for (let i=0;i<cols.length;i++){
    if (i===idx1 || i===idx2) continue;
    const d1 = dist(cols[i], cols[idx1]);
    const d2 = dist(cols[i], cols[idx2]);
    const score = w[i]*Math.min(d1,d2);
    if (score>best3){ best3=score; idx3=i; }
  }
  let w1 = w[idx1], w2 = w[idx2], w3 = w[idx3];
  const s = Math.max(1e-6, w1+w2+w3); w1/=s; w2/=s; w3/=s;
  return { c1: cols[idx1], c2: cols[idx2], c3: cols[idx3], weights: [w1,w2,w3] };
}

function rgbToHsv255(c: SendEffectColor): [number, number, number] {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, v];
}

function hsvToRgb255(h: number, s: number, v: number): SendEffectColor {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function enhanceColor(c: SendEffectColor): SendEffectColor {
  const hsv = rgbToHsv255(c);
  let h = hsv[0], s = hsv[1], v = hsv[2];
  s = Math.min(1, Math.max(0.5, s * 1.25));
  v = Math.min(1, v * 1.1 + 0.03);
  return hsvToRgb255(h, s, v);
}

export function playSendOrbitalEffect(input: SendEffectColor[]): void {
  if (typeof window === 'undefined') return;
  if (!input || !input.length) return;
  
  const { colors, weights } = buildColorWeights(input);
  if (!colors.length) return;

  if (activeOverlay) {
    try { activeAnimation && activeAnimation(); } catch {}
    try { activeOverlay.remove(); } catch {}
    activeOverlay = null;
    activeAnimation = null;
  }

  const mount = makeOverlay();
  if (!mount) return;
  const { overlay, canvas, gl } = mount;
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { cancelAnimationFrame(frameHandle); } catch {}
    try { window.removeEventListener('resize', resizeHandler); } catch {}
    try { overlay.remove(); } catch {}
    if (gl && gl.getExtension) {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    if (activeOverlay === overlay) {
      activeOverlay = null;
      activeAnimation = null;
    }
  };

  activeAnimation = dispose;

  const program = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(program);

  const progressLoc = gl.getUniformLocation(program, 'uProgress');
  const timeLoc = gl.getUniformLocation(program, 'uTime');
  const resLoc = gl.getUniformLocation(program, 'uResolution');
  const color1Loc = gl.getUniformLocation(program, 'uColor1');
  const color2Loc = gl.getUniformLocation(program, 'uColor2');
  const color3Loc = gl.getUniformLocation(program, 'uColor3');
  const weightsLoc = gl.getUniformLocation(program, 'uWeights');
  const seedLoc = gl.getUniformLocation(program, 'uSeed');

  const tri = pickTop3Distinct(colors, weights);
  const e1 = enhanceColor(tri.c1);
  const e2 = enhanceColor(tri.c2);
  const e3 = enhanceColor(tri.c3);
  const color1 = [e1[0] / 255, e1[1] / 255, e1[2] / 255];
  const color2 = [e2[0] / 255, e2[1] / 255, e2[2] / 255];
  const color3 = [e3[0] / 255, e3[1] / 255, e3[2] / 255];
  let w1 = tri.weights[0];
  let w2 = tri.weights[1];
  let w3 = tri.weights[2];
  const seed = [Math.random(), Math.random(), Math.random()];

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindVertexArray(null);

  const duration = 5.0;
  const start = performance.now();
  let frameHandle = 0;

  const resizeHandler = () => resizeCanvas(gl, canvas);
  window.addEventListener('resize', resizeHandler);
  resizeCanvas(gl, canvas);

  const render = () => {
    if (disposed) return;
    const now = performance.now();
    const elapsed = (now - start) / 1000;
    const progress = Math.min(1.0, elapsed / duration);
    
    if (progress >= 1.0) {
      dispose();
      return;
    }
    
    frameHandle = requestAnimationFrame(render);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform1f(progressLoc, progress);
    gl.uniform1f(timeLoc, elapsed);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform3f(color1Loc, color1[0], color1[1], color1[2]);
    gl.uniform3f(color2Loc, color2[0], color2[1], color2[2]);
    gl.uniform3f(color3Loc, color3[0], color3[1], color3[2]);
    gl.uniform3f(weightsLoc, w1, w2, w3);
    gl.uniform3f(seedLoc, seed[0], seed[1], seed[2]);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  render();
}
