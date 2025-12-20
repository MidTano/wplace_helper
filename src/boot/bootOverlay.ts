import { markElement } from '../wguard';
import { getBootStats } from '../stats/realStats';
import { saveBootOverlaySettings } from './bootSettings';
import { t } from '../i18n';
import padsLoopSrc from '../../loop.mp3?inline';
import softAlertSrc from '../../open_close.mp3?inline';
import centerNoticeSrc from '../ui/centerNotice.ts?raw';

type BootOverlayOptions = {
  durationMs?: number;
  disableSounds?: boolean;
  hideLoadButton?: boolean;
};

type BootStats = {
  manual: {
    yesterday: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    week: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    allTime: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
  };
  auto: {
    yesterday: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    week: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
    allTime: { timeSec: number; timeDelta: number; clicks: number; clicksDelta: number; bestColor: { name: string; count: number; hex: string; delta: number } };
  };
};

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function getSeed(): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] >>> 0;
  } catch {
    return (Math.random() * 0xffffffff) >>> 0;
  }
}

function readCssVar(name: string, fallback: string, root?: Element | null): string {
  try {
    const el = root && root instanceof Element ? root : document.documentElement;
    let v = getComputedStyle(el).getPropertyValue(name).trim();
    if (!v && el !== document.documentElement) v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function resolveThemeRoot(): HTMLElement {
  try {
    const host = (window as any).__wphPortalHost as any;
    if (host) {
      if (host.host instanceof HTMLElement) return host.host;
      if (host instanceof ShadowRoot && host.host instanceof HTMLElement) return host.host;
      if (host instanceof HTMLElement) return host;
    }
    const el = document.getElementById('wph-theme-root');
    if (el) return el;
    return document.documentElement;
  } catch {
    return document.documentElement;
  }
}

function hash2(i: number, j: number): number {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

export function createBootOverlay(host: ShadowRoot | HTMLElement, opts: BootOverlayOptions = {}) {
  try {
    const durationMs = typeof opts.durationMs === 'number' ? opts.durationMs : 10000;
    const tvAnimMs = 680;
    const hideLoadButton = !!(opts as any).hideLoadButton;
    const disableSounds = !!(opts as any).disableSounds || hideLoadButton;
    const hostEl = (() => {
      try { return host instanceof ShadowRoot ? host.host : host; } catch { return host as any; }
    })() as any;

    const audio = disableSounds ? null : (() => {
      try {
        const alert = new Audio(softAlertSrc);
        const loop = new Audio(padsLoopSrc);
        try { alert.preload = 'auto'; } catch {}
        try { loop.preload = 'auto'; } catch {}
        try { loop.loop = true; } catch {}
        try { alert.volume = 0.7; } catch {}
        try { loop.volume = 0.15; } catch {}

        let destroyed = false;
        let unlocked = false;
        let pendingStart = false;
        let loopStarted = false;
        let startSeq = 0;
        let fallbackTimer: any = 0;

        const safePlay = (a: HTMLAudioElement) => {
          try {
            const p: any = a.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch {}
        };
        const stop = (a: HTMLAudioElement) => {
          try { a.pause(); } catch {}
          try { a.currentTime = 0; } catch {}
        };

        const startLoop = () => {
          if (destroyed || loopStarted) return;
          loopStarted = true;
          safePlay(loop);
        };

        const playAlert = () => {
          if (destroyed) return;
          stop(alert);
          safePlay(alert);
        };

        const playStart = () => {
          if (destroyed) return;
          pendingStart = true;
          startSeq = (startSeq + 1) | 0;
          const seq = startSeq;
          loopStarted = false;
          stop(loop);

          try { fallbackTimer && clearTimeout(fallbackTimer); } catch {}
          fallbackTimer = 0;

          let endedFired = false;
          const onEnd = () => {
            if (destroyed) return;
            if (seq !== startSeq) return;
            if (endedFired) return;
            endedFired = true;
            try { alert.removeEventListener('ended', onEnd); } catch {}
            startLoop();
          };
          try { alert.addEventListener('ended', onEnd); } catch {}

          const scheduleFallback = () => {
            if (destroyed) return;
            if (seq !== startSeq) return;
            const dur = Number((alert as any).duration);
            const ms = Number.isFinite(dur) && dur > 0 ? Math.ceil(dur * 1000) + 40 : 1200;
            try { fallbackTimer && clearTimeout(fallbackTimer); } catch {}
            try {
              fallbackTimer = window.setTimeout(() => {
                if (destroyed) return;
                if (seq !== startSeq) return;
                startLoop();
              }, ms);
            } catch {}
          };
          try { scheduleFallback(); } catch {}
          try { alert.addEventListener('loadedmetadata', scheduleFallback, { once: true } as any); } catch {}

          playAlert();
        };

        const playEnd = () => {
          if (destroyed) return;
          pendingStart = false;
          stop(loop);
          playAlert();
        };

        const unlock = () => {
          if (destroyed || unlocked) return;
          unlocked = true;
          try { loop.muted = true; } catch {}
          safePlay(loop);
          try { stop(loop); } catch {}
          try { loop.muted = false; } catch {}
          if (pendingStart) {
            try { playStart(); } catch {}
          }
        };

        const destroy = () => {
          if (destroyed) return;
          destroyed = true;
          pendingStart = false;
          try { fallbackTimer && clearTimeout(fallbackTimer); } catch {}
          fallbackTimer = 0;
          try { stop(loop); } catch {}
          try { stop(alert); } catch {}
        };

        return { playStart, playEnd, unlock, destroy };
      } catch {
        return null;
      }
    })();
    try { hostEl && hostEl.setAttribute && hostEl.setAttribute('data-wph-boot', '1'); } catch {}
    try { (window as any).__wphBootOverlayActive = true; } catch {}

    const style = document.createElement('style');
    markElement(style);
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=Jost:ital,wght@0,100..900;1,100..900&family=Pixelify+Sans:wght@400..700&family=Righteous&family=Tiny5&display=swap');
      :root{--wph-dot-mx:50%;--wph-dot-my:50%;}
      :host([data-wph-boot='1']) .topmenu-root,[data-wph-boot='1'] .topmenu-root{opacity:0!important;visibility:hidden!important;pointer-events:none!important;}
      .wph-boot-black{position:fixed;inset:0;z-index:2147483646;background:#000;opacity:1;visibility:visible;pointer-events:none;}
      .wph-boot-overlay{position:fixed;inset:0;z-index:2147483647;pointer-events:auto;opacity:1;visibility:visible;overflow:hidden;}
      .wph-boot-tv{position:absolute;inset:0;background:linear-gradient(to bottom,#0d0d0d,#0f0f23);color:#869CF1;font-family:"Geist Mono","Geist",sans-serif;font-weight:700;overflow:hidden;transform-origin:50% 50%;transform:scaleY(1);will-change:transform,filter,opacity;}

      .wph-boot-build{position:absolute;left:10px;right:10px;bottom:0;z-index:9;display:flex;justify-content:space-between;gap:12px;pointer-events:none;padding:6px 0 calc(6px + env(safe-area-inset-bottom, 0px));font-family:"Geist Mono","Geist",sans-serif;font-weight:650;font-size:11px;letter-spacing:0.2px;opacity:0.72;color:rgba(255,255,255,0.85);text-shadow:0 1px 2px rgba(0,0,0,0.55);}
      .wph-boot-build .wph-left{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .wph-boot-build .wph-right{flex:0 0 auto;white-space:nowrap;opacity:0.78;}
      .wph-boot-overlay::before,.wph-boot-overlay::after{content:"";position:absolute;left:-25%;right:-25%;height:2px;opacity:0;pointer-events:none;z-index:30;background:linear-gradient(90deg,transparent,var(--wph-boot-glow,#3b6cff),transparent);mix-blend-mode:screen;}
      .wph-boot-overlay::before{top:0;transform:translateY(-140vh) scaleX(1);box-shadow:0 -6px 18px var(--wph-boot-glow,#3b6cff),0 -22px 70px var(--wph-boot-glow,#3b6cff),0 -90px 280px var(--wph-boot-glow,#3b6cff),0 -260px 980px var(--wph-boot-glow,#3b6cff);}
      .wph-boot-overlay::after{bottom:0;transform:translateY(140vh) scaleX(1);box-shadow:0 6px 18px var(--wph-boot-glow,#3b6cff),0 22px 70px var(--wph-boot-glow,#3b6cff),0 90px 280px var(--wph-boot-glow,#3b6cff),0 260px 980px var(--wph-boot-glow,#3b6cff);}
      @keyframes wph-tv-on{0%{opacity:1;transform:scaleY(0.005);filter:drop-shadow(0 0 44px var(--wph-boot-glow,#3b6cff)) drop-shadow(0 0 160px rgba(0,0,0,0.18));}42%{opacity:1;transform:scaleY(0.005);filter:drop-shadow(0 0 56px var(--wph-boot-glow,#3b6cff)) drop-shadow(0 0 220px rgba(0,0,0,0.22));}100%{opacity:1;transform:scaleY(1);filter:none;}}
      @keyframes wph-tv-off{0%{opacity:1;transform:scaleY(1);filter:none;}62%{opacity:1;transform:scaleY(0.005);filter:drop-shadow(0 0 56px var(--wph-boot-glow,#3b6cff)) drop-shadow(0 0 220px rgba(0,0,0,0.22));}100%{opacity:0;transform:scaleY(0.005);filter:drop-shadow(0 0 44px var(--wph-boot-glow,#3b6cff)) drop-shadow(0 0 160px rgba(0,0,0,0.18));}}
      @keyframes wph-line-on-top{0%{opacity:1;transform:translateY(50vh) scaleX(0.66);}42%{opacity:1;transform:translateY(50vh) scaleX(0.66);}100%{opacity:0;transform:translateY(0) scaleX(1);}}
      @keyframes wph-line-on-bot{0%{opacity:1;transform:translateY(-50vh) scaleX(0.66);}42%{opacity:1;transform:translateY(-50vh) scaleX(0.66);}100%{opacity:0;transform:translateY(0) scaleX(1);}}
      @keyframes wph-line-off-top{0%{opacity:1;transform:translateY(0) scaleX(1);}62%{opacity:1;transform:translateY(50vh) scaleX(0.66);}100%{opacity:0;transform:translateY(50vh) scaleX(0.66);}}
      @keyframes wph-line-off-bot{0%{opacity:1;transform:translateY(0) scaleX(1);}62%{opacity:1;transform:translateY(-50vh) scaleX(0.66);}100%{opacity:0;transform:translateY(-50vh) scaleX(0.66);}}
      .wph-boot-overlay.wph-enter .wph-boot-tv{animation:wph-tv-on .68s cubic-bezier(.22,0,.86,1) both;}
      .wph-boot-overlay.wph-enter::before{animation:wph-line-on-top .68s cubic-bezier(.22,0,.86,1) both;}
      .wph-boot-overlay.wph-enter::after{animation:wph-line-on-bot .68s cubic-bezier(.22,0,.86,1) both;}
      .wph-boot-overlay.wph-hide{pointer-events:none;}
      .wph-boot-overlay.wph-hide .wph-boot-tv{animation:wph-tv-off .68s cubic-bezier(.22,0,.86,1) both;}
      .wph-boot-overlay.wph-hide::before{animation:wph-line-off-top .68s cubic-bezier(.22,0,.86,1) both;}
      .wph-boot-overlay.wph-hide::after{animation:wph-line-off-bot .68s cubic-bezier(.22,0,.86,1) both;}
      .wph-boot-overlay.wph-enter .wph-noise{opacity:0!important;}
      .wph-boot-overlay .wph-noise{position:absolute;inset:0;width:100%;height:100%;z-index:2;background-image:url("https://mafiko.top/assets/templ/temlplates/EntranceAnimationForImages-main/img/noise.png");background-size:150px;pointer-events:none;mix-blend-mode:soft-light;opacity:0.35;}
      .wph-boot-overlay .wph-boot-bg-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1;}
      .wph-boot-overlay .wph-boot-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:3;opacity:1;mix-blend-mode:screen;filter:contrast(1.12) saturate(1.05);}
      .wph-boot-overlay.wph-prestart::before,.wph-boot-overlay.wph-prestart::after{display:none!important;}
      .wph-boot-overlay.wph-prestart .wph-boot-tv{background:#000!important;}
      .wph-boot-overlay.wph-prestart .wph-boot-bg-canvas,.wph-boot-overlay.wph-prestart .wph-boot-canvas,.wph-boot-overlay.wph-prestart .wph-noise{display:none!important;}
      .wph-boot-overlay .wph-stats{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none;padding:14px;overflow:hidden;}
      .wph-boot-overlay .wph-dotfield{display:none;}
      .wph-boot-overlay .wph-start{position:absolute;inset:0;z-index:7;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;pointer-events:auto;}
      .wph-boot-overlay .wph-start.wph-start-hide{opacity:0;transform:scale(0.985);pointer-events:none;transition:opacity .22s ease,transform .22s ease;}
      @keyframes _w_notice_logo_bounce{0%,20%,50%,80%,100%{transform:translateY(0);}40%{transform:translateY(-20px);}60%{transform:translateY(-10px);}}
      .wph-boot-overlay .wph-start-logo{width:92px;height:92px;color:var(--wph-accent,#dfe8ff);filter:drop-shadow(0 0 18px var(--wph-accent,#dfe8ff));}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo{width:100%;height:100%;transform:scale(2);transform-origin:center;display:block;}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo path{fill:currentColor;opacity:1;transform-origin:center;animation:_w_notice_logo_bounce 1.5s ease-in-out infinite;}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo path:nth-child(1){animation-delay:0s;}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo path:nth-child(2){animation-delay:0.1s;}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo path:nth-child(3){animation-delay:0.2s;}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo path:nth-child(4){animation-delay:0.3s;}
      .wph-boot-overlay .wph-start-logo ._w_notice_logo path:nth-child(5){animation-delay:0.4s;}
      .wph-boot-overlay .wph-start-btn{appearance:none;border-radius:14px;padding:14px 22px;border:0;background:var(--wph-accent,#dfe8ff);color:#000;font-family:"Geist Mono","Geist",sans-serif;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;font-size:16px;cursor:pointer;position:relative;overflow:hidden;box-shadow:0 0 18px var(--wph-accent,#dfe8ff);}
      .wph-boot-overlay .wph-start-btn:hover{filter:brightness(1.06);}
      .wph-boot-overlay .wph-start-btn:active{transform:translateY(1px);filter:brightness(0.98);}

      .wph-boot-overlay .wph-hint{width:min(520px,92vw);min-height:128px;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;position:relative;border:1px solid rgba(255,255,255,0.16);border-radius:18px;background:rgba(0,0,0,0.22);backdrop-filter:blur(12px);padding:30px 22px 24px;box-shadow:0 18px 40px rgba(0,0,0,0.45);}
      .wph-boot-overlay .wph-hint-title{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);padding:4px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.78);font-size:17px;font-weight:900;letter-spacing:1.1px;}
      .wph-boot-overlay .wph-hint-cat{padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);font-size:13.5px;font-weight:850;letter-spacing:0.9px;opacity:0.95;text-transform:uppercase;color:var(--wph-accent,#dfe8ff);}
      .wph-boot-overlay .wph-hint-body{font-size:12.5px;font-weight:750;line-height:1.6;letter-spacing:0.18px;opacity:0.98;white-space:pre-line;text-align:center;max-width:46ch;text-shadow:0 1px 2px rgba(0,0,0,0.32);}

      .wph-boot-overlay .wph-cancel-btn{appearance:none;border-radius:14px;padding:12px 20px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.18);color:#fff;font-family:"Geist Mono","Geist",sans-serif;font-weight:850;letter-spacing:0.9px;text-transform:uppercase;font-size:14px;cursor:pointer;backdrop-filter:blur(6px);}
      .wph-boot-overlay .wph-cancel-btn:hover{background:rgba(255,255,255,0.08);}
      .wph-boot-overlay .wph-cancel-btn:active{transform:translateY(1px);}
      .wph-boot-overlay .wph-start-btn{margin-top:50px;}
      .wph-boot-overlay .wph-card{position:relative;width:min(980px,96vw);background:transparent;border:0;border-radius:18px;padding:18px 20px;display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:center;pointer-events:auto;overflow:hidden;}
      .wph-boot-overlay .wph-card::before{content:"";position:absolute;inset:0;background:transparent;}
      .wph-boot-overlay .wph-card .wph-left{display:flex;flex-direction:column;gap:10px;min-width:0;}
      .wph-boot-overlay .wph-card h3{margin:0;font-size:21px;letter-spacing:0.7px;text-transform:uppercase;}
      .wph-boot-overlay .wph-dot-text{color:#fff;filter:none;letter-spacing:0.85px;}
      .wph-boot-overlay .wph-card .wph-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:stretch;}
      .wph-boot-overlay .wph-chip{position:relative;overflow:hidden;background:transparent;border-radius:14px;padding:14px 16px;min-width:0;display:flex;flex-direction:column;gap:10px;border:0;}
      .wph-boot-overlay .wph-chip::after{content:"";position:absolute;inset:0;background:transparent;}
      .wph-boot-overlay .wph-chip .label{font-size:15px;opacity:0.9;}
      .wph-boot-overlay .wph-chip .value{font-size:27px;font-weight:850;letter-spacing:0.3px;}
      .wph-boot-overlay .wph-chip .wph-row{display:flex;align-items:center;justify-content:space-between;gap:12px;white-space:nowrap;flex-wrap:nowrap;}
      .wph-boot-overlay .wph-chip .wph-main{min-width:0;white-space:nowrap;}
      .wph-boot-overlay .wph-chip .wph-delta{white-space:nowrap;flex:0 0 auto;font-size:15px;font-weight:900;}
      .wph-boot-overlay .wph-chip .wph-best-dot{width:14px;height:14px;border-radius:50%;box-shadow:0 0 12px rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.12);flex:0 0 auto;}
      .wph-boot-overlay .wph-chip .wph-best-main{display:flex;align-items:center;gap:10px;min-width:0;white-space:nowrap;}
      .wph-boot-overlay .wph-sheen{display:none;}
      @media (max-width:720px){
        .wph-boot-overlay{transition:opacity .28s ease;}
        .wph-boot-overlay::before,.wph-boot-overlay::after{display:none!important;}
        .wph-boot-overlay.wph-enter .wph-boot-tv{animation:none!important;}
        .wph-boot-overlay.wph-hide .wph-boot-tv{animation:none!important;}
        .wph-boot-overlay.wph-hide{opacity:0!important;}
        .wph-boot-overlay .wph-start-btn{width:min(260px,72vw);justify-content:center;}
        .wph-boot-overlay .wph-dot-text{color:#fff!important;filter:none!important;}
        .wph-boot-overlay .wph-card{grid-template-columns:1fr;justify-items:flex-start;}
        .wph-boot-overlay .wph-card .wph-meta{grid-template-columns:1fr;}
        .wph-boot-build{left:12px;right:12px;font-size:10px;opacity:0.66;}
      }

      .wph-boot-overlay .wph-close-btn{position:absolute;top:18px;right:18px;z-index:10;appearance:none;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.22);color:#fff;width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;line-height:1;backdrop-filter:blur(6px);}
      .wph-boot-overlay .wph-close-btn:hover{background:rgba(255,255,255,0.10);}
      .wph-boot-overlay .wph-close-btn:active{transform:translateY(1px);}
      .wph-boot-overlay.wph-prestart .wph-close-btn{display:none;}

      .wph-boot-overlay .wph-pref{display:inline-flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);background:rgba(0,0,0,0.18);backdrop-filter:blur(6px);cursor:pointer;user-select:none;color:#fff;margin-top:128px;max-width:min(620px,92vw);}
      .wph-boot-overlay .wph-pref:hover{background:rgba(255,255,255,0.08);}
      .wph-boot-overlay .wph-pref .wph-pref-txt{font-size:12px;font-weight:800;letter-spacing:0.6px;}
      .wph-boot-overlay .wph-pref input{opacity:0;width:0;height:0;position:absolute;}
      .wph-boot-overlay .wph-pref .wph-pref-track{width:42px;height:22px;background:rgba(255,255,255,0.18);border-radius:14px;border:1px solid rgba(255,255,255,0.20);transition:all .2s ease;position:relative;flex:0 0 auto;}
      .wph-boot-overlay .wph-pref .wph-pref-track::after{content:"";position:absolute;left:2px;top:50%;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.35);transition:all .2s ease;transform:translateY(-50%);}
      .wph-boot-overlay .wph-pref input:checked + .wph-pref-track{background:var(--wph-accent,#dfe8ff);border-color:var(--wph-accent,#dfe8ff);}
      .wph-boot-overlay .wph-pref input:checked + .wph-pref-track::after{transform:translate(20px,-50%);}
    `;

    const blackEl = document.createElement('div');
    markElement(blackEl);
    blackEl.className = 'wph-boot-black';

    const el = document.createElement('div');
    markElement(el);
    el.className = hideLoadButton ? 'wph-boot-overlay' : 'wph-boot-overlay wph-prestart';
    try { (el.style as any).opacity = '1'; } catch {}
    try { (el.style as any).visibility = 'visible'; } catch {}
    try { (el.style as any).pointerEvents = 'auto'; } catch {}

    const tv = document.createElement('div');
    markElement(tv);
    tv.className = 'wph-boot-tv';

    const closeBtn = document.createElement('button');
    markElement(closeBtn);
    closeBtn.className = 'wph-close-btn wph-dot-text';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t('boot.overlay.close.aria'));
    closeBtn.textContent = '×';

    const noiseLayer = document.createElement('div');
    markElement(noiseLayer);
    noiseLayer.className = 'wph-noise';

    const buildEl = document.createElement('div');
    markElement(buildEl);
    buildEl.className = 'wph-boot-build';
    const buildLeft = document.createElement('div');
    markElement(buildLeft);
    buildLeft.className = 'wph-left';
    const buildRight = document.createElement('div');
    markElement(buildRight);
    buildRight.className = 'wph-right';
    const wphVer = (() => { try { return String(__WPH_VERSION__ || '').trim(); } catch { return ''; } })();
    const wphBuild = (() => { try { return String(__WPH_BUILD_ID__ || '').trim(); } catch { return ''; } })();
    const wphTime = (() => { try { return String(__WPH_BUILD_TIME__ || '').trim(); } catch { return ''; } })();
    buildLeft.textContent = wphVer ? `Wplace Helper v${wphVer}` : 'Wplace Helper';
    buildRight.textContent = wphBuild || wphTime ? `${wphBuild}${wphBuild && wphTime ? ' • ' : ''}${wphTime}` : '';
    buildEl.appendChild(buildLeft);
    buildEl.appendChild(buildRight);

    const bgCanvas = document.createElement('canvas');
    markElement(bgCanvas);
    bgCanvas.className = 'wph-boot-bg-canvas';

    const canvas = document.createElement('canvas');
    markElement(canvas);
    canvas.className = 'wph-boot-canvas';

    const statsWrap = document.createElement('div');
    markElement(statsWrap);
    statsWrap.className = 'wph-stats';
    try { (statsWrap.style as any).display = 'none'; } catch {}
    const statsDots = document.createElement('div');
    markElement(statsDots);
    statsDots.className = 'wph-dotfield';

    let startWrap: HTMLDivElement | null = null;
    let startBtn: HTMLButtonElement | null = null;
    if (!hideLoadButton) {
      startWrap = document.createElement('div');
      markElement(startWrap);
      startWrap.className = 'wph-start';
      const startLogo = document.createElement('div');
      markElement(startLogo);
      startLogo.className = 'wph-start-logo';
      try {
        const m = String(centerNoticeSrc || '').match(/<svg\s+class="_w_notice_logo"[\s\S]*?<\/svg>/);
        startLogo.innerHTML = m && m[0] ? m[0] : '';
      } catch {
        startLogo.innerHTML = '';
      }
      startBtn = document.createElement('button');
      markElement(startBtn);
      startBtn.className = 'wph-start-btn';
      startBtn.type = 'button';
      startBtn.textContent = t('boot.overlay.start');

      const hintBox = document.createElement('div');
      markElement(hintBox);
      hintBox.className = 'wph-hint wph-dot-text';
      const hintTitle = document.createElement('div');
      markElement(hintTitle);
      hintTitle.className = 'wph-hint-title wph-dot-text';
      hintTitle.textContent = t('boot.hint.title');
      const hintCat = document.createElement('div');
      markElement(hintCat);
      hintCat.className = 'wph-hint-cat wph-dot-text';
      const hintBody = document.createElement('div');
      markElement(hintBody);
      hintBody.className = 'wph-hint-body wph-dot-text';
      try {
        const LAST_HINT_KEY = 'wph:boot:hint:last';
        const hintEntries = [
          { cat: 'boot.hint.cat.hotkeys', text: 'boot.hint.text.hotkeys.altc' },
          { cat: 'boot.hint.cat.hotkeys', text: 'boot.hint.text.hotkeys.altv' },
          { cat: 'boot.hint.cat.hotkeys', text: 'boot.hint.text.hotkeys.altl' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.tools' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.undoRedo' },
          { cat: 'boot.hint.cat.qrmusic', text: 'boot.hint.text.qrmusic.what' },
          { cat: 'boot.hint.cat.qrmusic', text: 'boot.hint.text.qrmusic.how' },
          { cat: 'boot.hint.cat.wguard', text: 'boot.hint.text.wguard.what' },
          { cat: 'boot.hint.cat.themes', text: 'boot.hint.text.themes.what' },
          { cat: 'boot.hint.cat.idle', text: 'boot.hint.text.idle.what' },
          { cat: 'boot.hint.cat.idle', text: 'boot.hint.text.idle.timeout' },
          { cat: 'boot.hint.cat.idle', text: 'boot.hint.text.idle.favorites' },
          { cat: 'boot.hint.cat.idle', text: 'boot.hint.text.idle.capture' },
          { cat: 'boot.hint.cat.copyart', text: 'boot.hint.text.copyart.what' },
          { cat: 'boot.hint.cat.copyart', text: 'boot.hint.text.copyart.grid' },
          { cat: 'boot.hint.cat.copyart', text: 'boot.hint.text.copyart.slow' },
          { cat: 'boot.hint.cat.gallery', text: 'boot.hint.text.gallery.what' },
          { cat: 'boot.hint.cat.gallery', text: 'boot.hint.text.gallery.token' },
          { cat: 'boot.hint.cat.gallery', text: 'boot.hint.text.gallery.likeBlock' },
          { cat: 'boot.hint.cat.gallery', text: 'boot.hint.text.gallery.viewMap' },
          { cat: 'boot.hint.cat.history', text: 'boot.hint.text.history.what' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.what' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.pixelSize' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.dither' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.palette' },
          { cat: 'boot.hint.cat.editor', text: 'boot.hint.text.editor.hotkeys' },
        ];
        const len = hintEntries.length;
        let idx = len > 0 ? (getSeed() % len) : 0;
        try {
          if (len > 1) {
            const lastRaw = sessionStorage.getItem(LAST_HINT_KEY);
            const last = lastRaw != null ? (parseInt(lastRaw, 10) | 0) : -1;
            if (last >= 0 && last < len && idx === last) {
              const shift = 1 + (getSeed() % (len - 1));
              idx = (idx + shift) % len;
            }
          }
        } catch {}
        const e = hintEntries[idx] || hintEntries[0];
        hintCat.textContent = t(e.cat);
        hintBody.textContent = t(e.text);
        try { sessionStorage.setItem(LAST_HINT_KEY, String(idx)); } catch {}
      } catch {
        hintCat.textContent = t('boot.hint.cat.hotkeys');
        hintBody.textContent = t('boot.hint.text.hotkeys.altc');
      }
      hintBox.appendChild(hintTitle);
      hintBox.appendChild(hintCat);
      hintBox.appendChild(hintBody);

      const cancelBtn = document.createElement('button');
      markElement(cancelBtn);
      cancelBtn.className = 'wph-cancel-btn wph-dot-text';
      cancelBtn.type = 'button';
      cancelBtn.textContent = t('boot.overlay.cancel');
      try {
        cancelBtn.addEventListener('click', (ev: any) => {
          try { ev && ev.preventDefault && ev.preventDefault(); } catch {}
          try { beginClose(); } catch {}
          try {
            window.setTimeout(() => {
              try { (window as any).__wphUnload && (window as any).__wphUnload(); } catch {}
            }, tvAnimMs + 60);
          } catch {}
        }, { capture: true } as any);
      } catch {}

      const pref = document.createElement('label');
      markElement(pref);
      pref.className = 'wph-pref wph-dot-text';
      pref.setAttribute('aria-label', t('boot.overlay.pref.showStats.aria'));
      pref.setAttribute('title', t('boot.overlay.pref.showStats.tooltip'));
      const prefTxt = document.createElement('span');
      markElement(prefTxt);
      prefTxt.className = 'wph-pref-txt';
      prefTxt.textContent = t('boot.overlay.pref.showStats.label');
      const prefInput = document.createElement('input');
      markElement(prefInput);
      prefInput.type = 'checkbox';
      prefInput.checked = true;
      const prefTrack = document.createElement('span');
      markElement(prefTrack);
      prefTrack.className = 'wph-pref-track';
      pref.appendChild(prefTxt);
      pref.appendChild(prefInput);
      pref.appendChild(prefTrack);
      try {
        prefInput.addEventListener('change', () => {
          const checked = !!prefInput.checked;
          try { saveBootOverlaySettings({ enabled: checked }); } catch {}
          if (!checked) {
            try { beginClose(); } catch {}
          }
        });
      } catch {}

      startWrap.appendChild(startLogo);
      startWrap.appendChild(hintBox);
      startWrap.appendChild(startBtn);
      startWrap.appendChild(cancelBtn);
      startWrap.appendChild(pref);
    }

    tv.appendChild(bgCanvas);
    tv.appendChild(canvas);
    tv.appendChild(statsDots);
    tv.appendChild(statsWrap);
    if (startWrap) tv.appendChild(startWrap);
    tv.appendChild(closeBtn);
    tv.appendChild(buildEl);
    tv.appendChild(noiseLayer);
    el.appendChild(tv);

    try { host.appendChild(style); } catch {}
    try { host.appendChild(blackEl); } catch {}
    try { host.appendChild(el); } catch {}

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      let removed = false;
      const remove = () => {
        if (removed) return;
        removed = true;
        try { hostEl && hostEl.removeAttribute && hostEl.removeAttribute('data-wph-boot'); } catch {}
        try { (window as any).__wphBootOverlayActive = false; } catch {}
        try { window.dispatchEvent(new CustomEvent('wph:boot-overlay:done')); } catch {}
        try { style.remove(); } catch {}
        try { el.remove(); } catch {}
      };
      try {
        window.setTimeout(() => {
          try { el.classList.add('wph-hide'); } catch {}
          try { window.setTimeout(() => { remove(); }, tvAnimMs + 40); } catch { remove(); }
        }, durationMs);
      } catch {}
      return remove;
    }

    const prefersReduced = (() => {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
    })();

    const seed = getSeed();
    const rnd = mulberry32(seed);

    const parseCssColor = (value: string) => {
      const v = String(value || '').trim();
      if (!v) return [0, 102, 255];
      if (v[0] === '#') {
        const h = v.replace('#', '');
        if (h.length === 3) {
          const r = parseInt(h[0] + h[0], 16);
          const g = parseInt(h[1] + h[1], 16);
          const b = parseInt(h[2] + h[2], 16);
          return [r, g, b];
        }
        if (h.length !== 6) return [0, 102, 255];
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return [r, g, b];
      }
      const m = v.match(/^rgba?\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*(?:,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*)?\)$/i);
      if (m) {
        const r = clampByte(parseFloat(m[1]));
        const g = clampByte(parseFloat(m[2]));
        const b = clampByte(parseFloat(m[3]));
        return [r, g, b];
      }
      return [0, 102, 255];
    };
    const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const dimRgb = (rgb: number[], mul: number) => [
      clampByte(rgb[0] * mul),
      clampByte(rgb[1] * mul),
      clampByte(rgb[2] * mul)
    ];
    const shade = (rgb: number[], k: number) => {
      const t = k < 0 ? 0 : 255;
      const p = Math.abs(k);
      return [
        clampByte(rgb[0] + (t - rgb[0]) * p),
        clampByte(rgb[1] + (t - rgb[1]) * p),
        clampByte(rgb[2] + (t - rgb[2]) * p)
      ];
    };
    const rgbToHex = (rgb: number[]) => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    let themeRoot: HTMLElement = resolveThemeRoot();
    let themeKey = '';
    let baseRgb = [0, 102, 255];
    let themeSuccessHex = '#22c55e';
    let themeErrorHex = '#ef4444';
    let circlePalette: string[] = ['#0d3bff', '#0b33da', '#082aa9', '#2b5cff', '#3b6cff', '#4b7cff'];
    let dotFill18Hex = '#0d3bff';
    let themeDirty = true;
    let themeUpdatesEnabled = true;

    const runIdle = (fn: () => void) => {
      try {
        const ric = (window as any).requestIdleCallback;
        if (typeof ric === 'function') {
          ric(() => { try { fn(); } catch {} }, { timeout: 600 });
          return;
        }
      } catch {}
      try { setTimeout(() => { try { fn(); } catch {} }, 0); } catch {}
    };

    const refreshThemeColors = () => {
      if (!themeUpdatesEnabled) return;
      themeRoot = resolveThemeRoot();
      const themeBase0 = readCssVar('--wph-primary', '#1356e9', themeRoot);
      const themeSuccess0 = readCssVar('--wph-success', '#22c55e', themeRoot);
      const themeError0 = readCssVar('--wph-error', '#ef4444', themeRoot);
      const nextKey = `${themeBase0}|${themeSuccess0}|${themeError0}`;
      if (nextKey === themeKey && !themeDirty) return;
      themeKey = nextKey;
      baseRgb = dimRgb(parseCssColor(themeBase0), 0.5);
      themeSuccessHex = rgbToHex(dimRgb(parseCssColor(themeSuccess0), 0.5));
      themeErrorHex = rgbToHex(dimRgb(parseCssColor(themeError0), 0.5));
      const baseDark = shade(baseRgb, -0.2);
      dotFill18Hex = rgbToHex(shade(baseRgb, 0.18));
      circlePalette = [
        rgbToHex(shade(baseDark, -0.06)),
        rgbToHex(shade(baseDark, -0.12)),
        rgbToHex(baseDark),
        rgbToHex(shade(baseDark, 0.08)),
        rgbToHex(shade(baseDark, 0.15)),
        rgbToHex(shade(baseDark, 0.22))
      ];
      try { el.style.setProperty('--wph-accent', themeBase0); } catch {}
      try { el.style.setProperty('--wph-boot-glow', rgbToHex(shade(baseRgb, 0.78))); } catch {}
      themeDirty = true;
    };

    const mkZero = () => ({ timeSec: 0, timeDelta: 0, clicks: 0, clicksDelta: 0, bestColor: { name: 'Unknown', count: 0, hex: '#000000', delta: 0 } });
    const getStatsSafe = (): BootStats => {
      try { return getBootStats() as any; } catch {
        const z = mkZero();
        return {
          manual: { yesterday: z, week: z, allTime: z },
          auto: { yesterday: z, week: z, allTime: z }
        };
      }
    };

    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmtTime = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      if (h > 0) return `${h}${t('units.hourShort')} ${pad(m)}${t('units.minShort')}`;
      return `${m}${t('units.minShort')} ${pad(s)}${t('units.secShort')}`;
    };

    const renderDomStats = () => {
      try { statsWrap.textContent = ''; } catch {}

      const sampleStats: BootStats = getStatsSafe();

      const fmtDelta = (d: number) => {
        const p = Math.round(d * 100);
        if (p > 0) return `+${p}%`;
        if (p < 0) return `${p}%`;
        return `0%`;
      };

      const deltaColor = (d: number) => {
        if (d > 0.0005) return '#22c55e';
        if (d < -0.0005) return '#ef4444';
        return '#dfe8ff';
      };

      const makeDelta = (d: number) => {
        const el = document.createElement('span');
        markElement(el);
        el.className = 'wph-delta';
        el.textContent = fmtDelta(d);
        try { (el.style as any).letterSpacing = '0.2px'; } catch {}
        try { (el.style as any).color = deltaColor(d); } catch {}
        return el;
      };

      const makeChip = (title: string, timeSec: number, timeDelta: number, clicks: number, clicksDelta: number, bestColor: { count: number; hex: string; delta: number }) => {
        const chip = document.createElement('div');
        markElement(chip);
        chip.className = 'wph-chip';

        const label = document.createElement('div');
        markElement(label);
        label.className = 'label wph-dot-text';
        label.textContent = title;
        chip.appendChild(label);

        const timeRow = document.createElement('div');
        markElement(timeRow);
        timeRow.className = 'wph-row value wph-dot-text';
        const timeMain = document.createElement('span');
        markElement(timeMain);
        timeMain.className = 'wph-main';
        timeMain.textContent = fmtTime(timeSec);
        timeRow.appendChild(timeMain);
        timeRow.appendChild(makeDelta(timeDelta));
        chip.appendChild(timeRow);

        const clicksRow = document.createElement('div');
        markElement(clicksRow);
        try { (clicksRow.style as any).fontSize = '15px'; } catch {}
        try { (clicksRow.style as any).opacity = '0.92'; } catch {}
        clicksRow.className = 'wph-row wph-dot-text';
        const clicksMain = document.createElement('span');
        markElement(clicksMain);
        clicksMain.className = 'wph-main';
        clicksMain.textContent = `${t('boot.stats.clicks')}: ${clicks}`;
        clicksRow.appendChild(clicksMain);
        clicksRow.appendChild(makeDelta(clicksDelta));
        chip.appendChild(clicksRow);

        const bestRow = document.createElement('div');
        markElement(bestRow);
        bestRow.className = 'wph-row wph-dot-text';

        const bestMain = document.createElement('span');
        markElement(bestMain);
        bestMain.className = 'wph-best-main';
        const bestDot = document.createElement('span');
        markElement(bestDot);
        bestDot.className = 'wph-best-dot';
        try { (bestDot.style as any).background = bestColor.hex; } catch {}
        const bestCount = document.createElement('span');
        markElement(bestCount);
        bestCount.textContent = String(bestColor.count);
        bestMain.appendChild(bestDot);
        bestMain.appendChild(bestCount);
        bestRow.appendChild(bestMain);
        bestRow.appendChild(makeDelta(bestColor.delta));
        chip.appendChild(bestRow);

        return chip;
      };

      const buildMode = (title: string, mode: BootStats['manual']) => {
        const card = document.createElement('div');
        markElement(card);
        card.className = 'wph-card';

        const left = document.createElement('div');
        markElement(left);
        left.className = 'wph-left';

        const h3 = document.createElement('h3');
        markElement(h3);
        h3.className = 'wph-dot-text';
        h3.textContent = title;
        left.appendChild(h3);

        const meta = document.createElement('div');
        markElement(meta);
        meta.className = 'wph-meta';

        meta.appendChild(makeChip(t('boot.stats.range.today'), mode.yesterday.timeSec, mode.yesterday.timeDelta, mode.yesterday.clicks, mode.yesterday.clicksDelta, mode.yesterday.bestColor));
        meta.appendChild(makeChip(t('boot.stats.range.week'), mode.week.timeSec, mode.week.timeDelta, mode.week.clicks, mode.week.clicksDelta, mode.week.bestColor));
        meta.appendChild(makeChip(t('boot.stats.range.all'), mode.allTime.timeSec, mode.allTime.timeDelta, mode.allTime.clicks, mode.allTime.clicksDelta, mode.allTime.bestColor));
        left.appendChild(meta);

        card.appendChild(left);
        return card;
      };

      try { statsWrap.appendChild(buildMode(t('boot.stats.mode.manual'), sampleStats.manual)); } catch {}
      try { statsWrap.appendChild(buildMode(t('boot.stats.mode.auto'), sampleStats.auto)); } catch {}
    };

    type Rect = { x: number; y: number; w: number; h: number };

    const getWarp = (
      x: number,
      y: number,
      macro: number,
      macroW0: number,
      macroH0: number,
      macroField0: Float32Array,
      macroShiftX0: Float32Array,
      macroShiftY0: Float32Array
    ) => {
      const fx = x / macro;
      const fy = y / macro;
      let mx0 = Math.floor(fx);
      let my0 = Math.floor(fy);
      if (mx0 < 0) mx0 = 0;
      if (my0 < 0) my0 = 0;
      if (mx0 > macroW0 - 2) mx0 = macroW0 - 2;
      if (my0 > macroH0 - 2) my0 = macroH0 - 2;
      const tx = fx - mx0;
      const ty = fy - my0;
      const i00 = my0 * macroW0 + mx0;
      const i10 = i00 + 1;
      const i01 = i00 + macroW0;
      const i11 = i01 + 1;
      const v00 = macroField0[i00];
      const v10 = macroField0[i10];
      const v01 = macroField0[i01];
      const v11 = macroField0[i11];
      const sx00 = macroShiftX0[i00];
      const sx10 = macroShiftX0[i10];
      const sx01 = macroShiftX0[i01];
      const sx11 = macroShiftX0[i11];
      const sy00 = macroShiftY0[i00];
      const sy10 = macroShiftY0[i10];
      const sy01 = macroShiftY0[i01];
      const sy11 = macroShiftY0[i11];
      const v0 = v00 + (v10 - v00) * tx;
      const v1 = v01 + (v11 - v01) * tx;
      const v = v0 + (v1 - v0) * ty;
      const sx0 = sx00 + (sx10 - sx00) * tx;
      const sx1 = sx01 + (sx11 - sx01) * tx;
      const sy0 = sy00 + (sy10 - sy00) * tx;
      const sy1 = sy01 + (sy11 - sy01) * tx;
      const sx = sx0 + (sx1 - sx0) * ty;
      const sy = sy0 + (sy1 - sy0) * ty;
      return { sx, sy, v };
    };

    const getWarpScaled = (
      x: number,
      y: number,
      macro: number,
      macroW0: number,
      macroH0: number,
      macroField0: Float32Array,
      macroShiftX0: Float32Array,
      macroShiftY0: Float32Array,
      mul: number
    ) => {
      const w = getWarp(x, y, macro, macroW0, macroH0, macroField0, macroShiftX0, macroShiftY0);
      return { sx: w.sx * mul, sy: w.sy * mul, v: w.v };
    };

    const drawDot = (x: number, y: number, s: number) => {
      const sz = Math.max(0.12, s);
      ctx.fillRect(x - sz * 0.5, y - sz * 0.5, sz, sz);
    };

    const drawDotRectOutline = (
      r: Rect,
      step: number,
      macro: number,
      macroW0: number,
      macroH0: number,
      macroField0: Float32Array,
      macroShiftX0: Float32Array,
      macroShiftY0: Float32Array,
      baseA: number
    ) => {
      const x0 = Math.floor(r.x / step) * step;
      const y0 = Math.floor(r.y / step) * step;
      const x1 = Math.ceil((r.x + r.w) / step) * step;
      const y1 = Math.ceil((r.y + r.h) / step) * step;
      const s = Math.max(0.12, step * 0.07);
      const halo = Math.max(0.16, step * 0.20);
      ctx.fillStyle = '#dfe8ff';

      const drawP = (x: number, y: number, k: number) => {
        const w = getWarpScaled(x, y, macro, macroW0, macroH0, macroField0, macroShiftX0, macroShiftY0, 0.55);
        const a = clamp01(baseA * (0.80 + 0.45 * w.v) * k);
        if (a <= 0.002) return;
        ctx.globalAlpha = a * 0.28;
        drawDot(x + w.sx, y + w.sy, halo);
        ctx.globalAlpha = a;
        drawDot(x + w.sx, y + w.sy, s);
      };

      for (let x = x0; x <= x1; x += step) {
        if (x >= r.x - step && x <= r.x + r.w + step) {
          drawP(x, r.y, 1);
          drawP(x, r.y + r.h, 1);
        }
      }
      for (let y = y0; y <= y1; y += step) {
        if (y >= r.y - step && y <= r.y + r.h + step) {
          drawP(r.x, y, 1);
          drawP(r.x + r.w, y, 1);
        }
      }
      ctx.globalAlpha = 1;
    };

    type TextRaster = { w: number; h: number; scale: number; bx: number; by: number; bw: number; bh: number; canvas: HTMLCanvasElement };
    const textRasterCache = new Map<string, TextRaster>();

    const getTextRaster = (text: string, fontPx: number, weight: number, boxW: number, boxH: number, align: CanvasTextAlign, color: string) => {
      const w = Math.max(1, Math.round(boxW));
      const h = Math.max(1, Math.round(boxH));
      const scale = 2;
      const key = `${text}\n${Math.round(fontPx)}\n${weight}\n${w}\n${h}\n${align}\n${color}\n${scale}`;
      const cached = textRasterCache.get(key);
      if (cached) return cached;

      const c = document.createElement('canvas');
      markElement(c);
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      c.width = cw;
      c.height = ch;
      const cctx = c.getContext('2d');
      if (!cctx) {
        const empty: TextRaster = { w: cw, h: ch, scale, bx: 0, by: 0, bw: w, bh: h, canvas: c };
        textRasterCache.set(key, empty);
        return empty;
      }
      cctx.setTransform(scale, 0, 0, scale, 0, 0);
      cctx.clearRect(0, 0, w, h);
      cctx.fillStyle = color;
      cctx.textBaseline = 'middle';
      cctx.textAlign = align;
      cctx.font = `${weight} ${Math.round(fontPx)}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
      const padX = Math.max(1, Math.round(fontPx * 0.12));
      const x = align === 'left' ? padX : (align === 'right' ? (w - padX) : (w * 0.5));
      const m = cctx.measureText(text);
      const asc = (m.actualBoundingBoxAscent || (fontPx * 0.78));
      const desc = (m.actualBoundingBoxDescent || (fontPx * 0.28));
      const th = asc + desc;
      const ty = (h * 0.5) - asc;
      const tx = align === 'left' ? x : (align === 'right' ? (x - m.width) : (x - m.width * 0.5));
      const margin = Math.max(2, Math.round(fontPx * 0.10));
      const bx = Math.max(0, Math.floor(tx - margin));
      const by = Math.max(0, Math.floor(ty - margin));
      const bw = Math.max(1, Math.min(w - bx, Math.ceil(m.width + margin * 2)));
      const bh = Math.max(1, Math.min(h - by, Math.ceil(th + margin * 2)));
      cctx.fillText(text, x, h * 0.5);

      const raster: TextRaster = { w: cw, h: ch, scale, bx, by, bw, bh, canvas: c };
      if (textRasterCache.size > 260) textRasterCache.clear();
      textRasterCache.set(key, raster);
      return raster;
    };

    const drawWarpedText = (
      r: Rect,
      text: string,
      fontPx: number,
      weight: number,
      align: CanvasTextAlign,
      macro: number,
      macroW0: number,
      macroH0: number,
      macroField0: Float32Array,
      macroShiftX0: Float32Array,
      macroShiftY0: Float32Array,
      color: string,
      alpha: number
    ) => {
      if (!text) return;
      const raster = getTextRaster(text, fontPx, weight, r.w, r.h, align, color);
      const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
      let st = Math.round(clamp(fontPx * 1.65, 18, 72));
      const area = r.w * r.h;
      if (area > 220000) st = Math.max(st, 42);
      if (area > 520000) st = Math.max(st, 56);
      const prevA = ctx.globalAlpha;
      ctx.globalAlpha = clamp01(alpha);

      const sw = r.w;
      const sh = r.h;
      const sc = raster.scale;

      const bx0 = Math.max(0, raster.bx);
      const by0 = Math.max(0, raster.by);
      const bx1 = Math.min(sw, raster.bx + raster.bw);
      const by1 = Math.min(sh, raster.by + raster.bh);

      const ox0 = Math.floor(bx0 / st) * st;
      const oy0 = Math.floor(by0 / st) * st;
      const ox1 = Math.ceil(bx1 / st) * st;
      const oy1 = Math.ceil(by1 / st) * st;

      for (let oy = oy0; oy < oy1; oy += st) {
        const th = Math.min(st, sh - oy);
        for (let ox = ox0; ox < ox1; ox += st) {
          const tw = Math.min(st, sw - ox);
          const x = r.x + ox + tw * 0.5;
          const y = r.y + oy + th * 0.5;
          const w = getWarpScaled(x, y, macro, macroW0, macroH0, macroField0, macroShiftX0, macroShiftY0, 0.55);
          const sx = Math.round(ox * sc);
          const sy = Math.round(oy * sc);
          const sww = Math.round(tw * sc);
          const shh = Math.round(th * sc);
          ctx.drawImage(raster.canvas, sx, sy, sww, shh, r.x + ox + w.sx, r.y + oy + w.sy, tw, th);
        }
      }

      ctx.globalAlpha = prevA;
    };

    const drawWarpedCircle = (
      cx: number,
      cy: number,
      radius: number,
      color: string,
      macro: number,
      macroW0: number,
      macroH0: number,
      macroField0: Float32Array,
      macroShiftX0: Float32Array,
      macroShiftY0: Float32Array
    ) => {
      const w = getWarpScaled(cx, cy, macro, macroW0, macroH0, macroField0, macroShiftX0, macroShiftY0, 0.55);
      const x = cx + w.sx;
      const y = cy + w.sy;
      const prevA = ctx.globalAlpha;

      ctx.fillStyle = '#dfe8ff';
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = prevA;
    };

    let statsDashCanvas: HTMLCanvasElement | null = null;
    let statsDashCtx: CanvasRenderingContext2D | null = null;
    let statsDashW = 0;
    let statsDashH = 0;
    let statsDashKey = '';

    const ensureStatsDashboard = (key: string) => {
      if (!statsDashCanvas || !statsDashCtx || statsDashW !== wCss || statsDashH !== hCss || statsDashKey !== key) {
        const c = document.createElement('canvas');
        markElement(c);
        c.width = Math.max(1, Math.floor(wCss));
        c.height = Math.max(1, Math.floor(hCss));
        const cctx = c.getContext('2d');
        if (!cctx) return null;
        statsDashCanvas = c;
        statsDashCtx = cctx;
        statsDashW = wCss;
        statsDashH = hCss;
        statsDashKey = key;
      }
      return statsDashCtx;
    };

    const drawStatsOverlay = (
      macro: number,
      macroW0: number,
      macroH0: number,
      macroField0: Float32Array,
      macroShiftX0: Float32Array,
      macroShiftY0: Float32Array
    ) => {
      const prevOp = ctx.globalCompositeOperation;
      const base = Math.min(wCss, hCss);
      const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
      const key = `${wCss}x${hCss}|${themeKey}`;
      const cctx = ensureStatsDashboard(key);
      if (!cctx || !statsDashCanvas) return;

      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, wCss, hCss);
      cctx.globalAlpha = 1;
      cctx.fillStyle = '#dfe8ff';

      const titleFont = Math.round(clamp(base * 0.06, 30, 72));
      const modeFont = Math.round(clamp(base * 0.035, 18, 44));
      const headFont = Math.round(clamp(base * 0.022, 12, 28));
      const labelFont = Math.round(clamp(base * 0.020, 12, 26));
      const valueFont = Math.round(clamp(base * 0.032, 16, 44));
      const arrowFont = Math.round(clamp(base * 0.030, 14, 42));

      const pad = Math.round(clamp(base * 0.018, 10, 22));
      const gap = Math.round(clamp(base * 0.020, 10, 26));
      const dash: Rect = {
        x: Math.round(wCss * 0.04),
        y: Math.round(hCss * 0.06),
        w: Math.round(wCss * 0.92),
        h: Math.round(hCss * 0.88)
      };

      const titleRect: Rect = { x: dash.x + pad, y: dash.y, w: dash.w - pad * 2, h: Math.round(clamp(base * 0.10, 52, 140)) };
      cctx.font = `900 ${titleFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
      cctx.textAlign = 'left';
      cctx.textBaseline = 'top';
      cctx.fillText('СТАТИСТИКА', titleRect.x, titleRect.y);

      const sectionH = Math.round((dash.h - titleRect.h - gap) * 0.5);
      const sectionW = dash.w;

      const periods = [
        { key: 'yesterday' as const, title: 'Вчера' },
        { key: 'week' as const, title: '7 дней' },
        { key: 'allTime' as const, title: 'Всё время' }
      ];

      const trendLevel = (d: number) => {
        const a = Math.abs(d);
        if (a < 0.05) return 0;
        if (a < 0.15) return 1;
        if (a < 0.35) return 2;
        return 3;
      };

      const trendGlyph = (d: number) => {
        const n = trendLevel(d);
        if (n <= 0) return { text: '', color: '#dfe8ff' };
        if (d > 0) return { text: '↑'.repeat(n), color: themeSuccessHex };
        return { text: '↓'.repeat(n), color: themeErrorHex };
      };

      const drawMode = (idx: number, title: string, data: BootStats['manual']) => {
        const sx = dash.x;
        const sy = titleRect.y + titleRect.h + gap + idx * (sectionH + gap);
        const section: Rect = { x: sx, y: sy, w: sectionW, h: sectionH };

        cctx.globalAlpha = 0.22;
        cctx.strokeStyle = '#dfe8ff';
        cctx.lineWidth = 1;
        cctx.strokeRect(section.x, section.y, section.w, section.h);
        cctx.globalAlpha = 1;

        cctx.font = `900 ${modeFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
        cctx.fillStyle = '#dfe8ff';
        cctx.textAlign = 'left';
        cctx.textBaseline = 'top';
        cctx.fillText(title, section.x + pad, section.y + pad);

        const gridY = section.y + pad + Math.round(clamp(base * 0.06, 28, 80)) + Math.round(pad * 0.4);
        const gridH = section.y + section.h - pad - gridY;
        const labelColW = Math.round(section.w * 0.22);
        const colW = Math.round((section.w - pad * 2 - labelColW) / 3);
        const gridX = section.x + pad;
        const headerH = Math.round(clamp(gridH * 0.18, 28, 72));
        const rowH = Math.round((gridH - headerH) / 3);

        cctx.font = `900 ${headFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
        cctx.globalAlpha = 0.92;
        cctx.textAlign = 'left';
        cctx.textBaseline = 'top';
        for (let p = 0; p < periods.length; p++) {
          const colX = gridX + labelColW + p * colW;
          cctx.fillText(periods[p].title, colX, gridY);
        }
        cctx.globalAlpha = 1;

        const rows = [
          { key: 'time' as const, label: 'Время' },
          { key: 'clicks' as const, label: 'Клики' },
          { key: 'color' as const, label: 'Лучший цвет' }
        ];

        for (let r = 0; r < rows.length; r++) {
          const rowY = gridY + headerH + r * rowH;
          cctx.font = `800 ${labelFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
          cctx.globalAlpha = 0.82;
          cctx.fillStyle = '#dfe8ff';
          cctx.textAlign = 'left';
          cctx.textBaseline = 'middle';
          cctx.fillText(rows[r].label, gridX, rowY + Math.round(rowH * 0.54));
          cctx.globalAlpha = 1;

          for (let p = 0; p < periods.length; p++) {
            const k = periods[p].key;
            const cellX = gridX + labelColW + p * colW;
            const cellY = rowY;
            const cellW = colW;
            const cellH = rowH;
            const midY = cellY + Math.round(cellH * 0.54);
            const padX = Math.max(6, Math.round(cellW * 0.04));
            const arrowGap = Math.max(10, Math.round(cellW * 0.03));

            if (rows[r].key === 'time') {
              const tg = trendGlyph(data[k].timeDelta);
              cctx.font = `900 ${valueFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
              cctx.fillStyle = '#dfe8ff';
              cctx.textAlign = 'left';
              cctx.textBaseline = 'middle';
              const val = fmtTime(data[k].timeSec);
              const mw = cctx.measureText(val).width;
              cctx.fillText(val, cellX + padX, midY);
              if (tg.text) {
                cctx.fillStyle = tg.color;
                cctx.font = `900 ${arrowFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
                cctx.textBaseline = 'middle';
                const aw = cctx.measureText(tg.text).width;
                const ax = Math.min(cellX + cellW - padX - aw, cellX + padX + mw + arrowGap);
                cctx.textAlign = 'left';
                cctx.fillText(tg.text, ax, midY);
              }
            } else if (rows[r].key === 'clicks') {
              const tg = trendGlyph(data[k].clicksDelta);
              cctx.font = `900 ${valueFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
              cctx.fillStyle = '#dfe8ff';
              cctx.textAlign = 'left';
              cctx.textBaseline = 'middle';
              const val = String(data[k].clicks);
              const mw = cctx.measureText(val).width;
              cctx.fillText(val, cellX + padX, midY);
              if (tg.text) {
                cctx.fillStyle = tg.color;
                cctx.font = `900 ${arrowFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
                cctx.textBaseline = 'middle';
                const aw = cctx.measureText(tg.text).width;
                const ax = Math.min(cellX + cellW - padX - aw, cellX + padX + mw + arrowGap);
                cctx.textAlign = 'left';
                cctx.fillText(tg.text, ax, midY);
              }
            } else {
              const tg = trendGlyph(data[k].bestColor.delta);
              const cr = Math.max(10, Math.round(Math.min(cellW, cellH) * 0.12));
              const cx = cellX + cr + Math.round(cellW * 0.04);
              const cy = cellY + Math.round(cellH * 0.56);
              cctx.globalAlpha = 0.18;
              cctx.fillStyle = '#dfe8ff';
              cctx.beginPath();
              cctx.arc(cx, cy, cr * 1.38, 0, Math.PI * 2);
              cctx.fill();
              cctx.globalAlpha = 1;
              cctx.fillStyle = data[k].bestColor.hex;
              cctx.beginPath();
              cctx.arc(cx, cy, cr, 0, Math.PI * 2);
              cctx.fill();

              const tx = cx + cr + Math.round(cellW * 0.04);
              cctx.font = `900 ${valueFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
              cctx.fillStyle = '#dfe8ff';
              cctx.textAlign = 'left';
              cctx.textBaseline = 'middle';
              const val = `${data[k].bestColor.name} · ${data[k].bestColor.count}`;
              const mw = cctx.measureText(val).width;
              cctx.fillText(val, tx, midY);
              if (tg.text) {
                cctx.fillStyle = tg.color;
                cctx.font = `900 ${arrowFont}px "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
                cctx.textBaseline = 'middle';
                const aw = cctx.measureText(tg.text).width;
                const ax = Math.min(cellX + cellW - padX - aw, tx + mw + arrowGap);
                cctx.textAlign = 'left';
                cctx.fillText(tg.text, ax, midY);
              }
            }
          }
        }
      };

      const stats0: BootStats = getStatsSafe();
      drawMode(0, 'РУЧНОЙ РЕЖИМ', stats0.manual);
      drawMode(1, 'АВТОРЕЖИМ', stats0.auto);

      try { ctx.globalCompositeOperation = 'screen'; } catch {}
      const st = Math.round(clamp(base * 0.055, 42, 96));
      const m = Math.max(st * 2, Math.round(base * 0.10));
      const x0 = Math.max(0, dash.x - m);
      const y0 = Math.max(0, dash.y - m);
      const x1 = Math.min(wCss, dash.x + dash.w + m);
      const y1 = Math.min(hCss, dash.y + dash.h + m);
      const sx0 = Math.floor(x0 / st) * st;
      const sy0 = Math.floor(y0 / st) * st;

      for (let oy = sy0; oy < y1; oy += st) {
        const th = Math.min(st, hCss - oy);
        for (let ox = sx0; ox < x1; ox += st) {
          const tw = Math.min(st, wCss - ox);
          const x = ox + tw * 0.5;
          const y = oy + th * 0.5;
          const w = getWarpScaled(x, y, macro, macroW0, macroH0, macroField0, macroShiftX0, macroShiftY0, 0.275);
          ctx.drawImage(statsDashCanvas, ox, oy, tw, th, ox + w.sx, oy + w.sy, tw, th);
        }
      }

      try { ctx.globalCompositeOperation = prevOp; } catch {}
    };

    type Circle = { x: number; y: number; radius: number; sigma: number; inv2s2: number; vx: number; vy: number; interactive: boolean; color: string; r: number; g: number; b: number; paletteIndex: number };
    let circles: Circle[] = [];

    const lut82 = new Float32Array(256);
    const lut80 = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      lut82[i] = Math.pow(x, 0.82);
      lut80[i] = Math.pow(x, 0.8);
    }

    const bayer8 = [
      0, 48, 12, 60, 3, 51, 15, 63,
      32, 16, 44, 28, 35, 19, 47, 31,
      8, 56, 4, 52, 11, 59, 7, 55,
      40, 24, 36, 20, 43, 27, 39, 23,
      2, 50, 14, 62, 1, 49, 13, 61,
      34, 18, 46, 30, 33, 17, 45, 29,
      10, 58, 6, 54, 9, 57, 5, 53,
      42, 26, 38, 22, 41, 25, 37, 21
    ];

    let macroW = 0;
    let macroH = 0;
    let macroField: Float32Array | null = null;
    let macroShiftX: Float32Array | null = null;
    let macroShiftY: Float32Array | null = null;
    let gridStep = 26;
    let gridMacro = 0;
    let gridWarpPx = 0;
    let gridShiftScale = 0;
    let gridMargin = 0;
    let gridBaseR = 0;
    let gridXs: number[] = [];
    let gridIxs: number[] = [];
    let gridMx0: number[] = [];
    let gridTx: number[] = [];
    let gridYs: number[] = [];
    let gridIys: number[] = [];
    let gridMy0: number[] = [];
    let gridTy: number[] = [];
    let gridRowBase: number[] = [];
    let baseGridStep = 26;
    const bgScale = 0.75;
    let lastSimMs = 0;

    let frameId = 0;

    let wCss = 1;
    let hCss = 1;
    let raf = 0;
    let glRender: (() => void) | null = null;
    let glResize: (() => void) | null = null;
    let destroyWebgl: (() => void) | null = null;
    let stopped = false;

    const isMobile = () => {
      try {
        return window.matchMedia('(max-width:720px)').matches;
      } catch {
        try { return (window.innerWidth || 9999) <= 720; } catch { return false; }
      }
    };

    const rebuildGrid = (step: number) => {
      const s = Math.max(12, Math.min(28, Math.round(step)));
      gridStep = s;

      gridMacro = gridStep * 12;
      macroW = Math.ceil(wCss / gridMacro) + 2;
      macroH = Math.ceil(hCss / gridMacro) + 2;
      macroField = new Float32Array(macroW * macroH);
      macroShiftX = new Float32Array(macroW * macroH);
      macroShiftY = new Float32Array(macroW * macroH);

      gridWarpPx = gridStep * 2.6;
      gridShiftScale = 1 / Math.max(1, (wCss + hCss) * 0.12);
      gridMargin = Math.ceil(gridWarpPx * 2 + gridStep * 3);
      gridBaseR = gridStep * 0.038;

      gridXs = [];
      gridIxs = [];
      gridMx0 = [];
      gridTx = [];
      const xStart = -gridMargin;
      const xEnd = wCss + gridMargin + gridStep;
      for (let x = xStart; x < xEnd; x += gridStep) {
        const ix = (x / gridStep) | 0;
        const fx = x / gridMacro;
        let mx0 = Math.floor(fx);
        if (mx0 < 0) mx0 = 0;
        if (mx0 > macroW - 2) mx0 = macroW - 2;
        gridXs.push(x);
        gridIxs.push(ix);
        gridMx0.push(mx0);
        gridTx.push(fx - mx0);
      }

      gridYs = [];
      gridIys = [];
      gridMy0 = [];
      gridTy = [];
      gridRowBase = [];
      const yStart = -gridMargin;
      const yEnd = hCss + gridMargin + gridStep;
      for (let y = yStart; y < yEnd; y += gridStep) {
        const iy = (y / gridStep) | 0;
        const fy = y / gridMacro;
        let my0 = Math.floor(fy);
        if (my0 < 0) my0 = 0;
        if (my0 > macroH - 2) my0 = macroH - 2;
        gridYs.push(y);
        gridIys.push(iy);
        gridMy0.push(my0);
        gridTy.push(fy - my0);
        gridRowBase.push(my0 * macroW);
      }
    };

    const resize = () => {
      try {
        wCss = Math.max(1, Math.floor(window.innerWidth || 1));
        hCss = Math.max(1, Math.floor(window.innerHeight || 1));
        try { glResize && glResize(); } catch {}

        baseGridStep = isMobile() ? 20 : 26;

        rebuildGrid(baseGridStep);

        const dpr2d = Math.min(1, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.floor(wCss * dpr2d));
        canvas.height = Math.max(1, Math.floor(hCss * dpr2d));
        ctx.setTransform(dpr2d, 0, 0, dpr2d, 0, 0);
        circles = [];
        const baseRadius = (wCss + hCss) * 0.34 * (isMobile() ? (1 / 3) : 1);
        for (let i = 0; i < 3; i++) {
          const x = rnd() * wCss;
          const y = rnd() * hCss;
          const speed = (1 + rnd() * 3.5) * 5;
          const rScale = 0.55 + rnd() * 1.15;
          const paletteIndex = circlePalette.length ? (i % circlePalette.length) : 0;
          const col = circlePalette[paletteIndex] || '#1356e9';
          const colRgb = parseCssColor(col);
          const radius = baseRadius * rScale;
          const sigma = radius * 0.22;
          const inv2s2 = 1 / (2 * sigma * sigma + 1e-6);
          circles.push({ x, y, radius, sigma, inv2s2, vx: (rnd() - 0.5) * speed, vy: (rnd() - 0.5) * speed, interactive: false, color: col, r: colRgb[0], g: colRgb[1], b: colRgb[2], paletteIndex });
        }
        const paletteIndex = circlePalette.length ? Math.min(5, circlePalette.length - 1) : 0;
        const radius = baseRadius * 0.72;
        const sigma = radius * 0.22;
        const inv2s2 = 1 / (2 * sigma * sigma + 1e-6);
        const col = circlePalette[paletteIndex] || '#1356e9';
        const colRgb = parseCssColor(col);
        circles.push({ x: wCss * 0.5, y: hCss * 0.5, radius, sigma, inv2s2, vx: 0, vy: 0, interactive: true, color: col, r: colRgb[0], g: colRgb[1], b: colRgb[2], paletteIndex });
      } catch {}
    };

    const draw = (tMs: number, loop = true) => {
      if (stopped) return;

      if (themeDirty) {
        for (let i = 0; i < circles.length; i++) {
          const c = circles[i];
          const idx = circlePalette.length ? (c.paletteIndex % circlePalette.length) : 0;
          c.color = circlePalette[idx] || c.color;
          const colRgb = parseCssColor(c.color);
          c.r = colRgb[0];
          c.g = colRgb[1];
          c.b = colRgb[2];
        }
        statsDashKey = '';
        themeDirty = false;
      }
      frameId = (frameId + 1) | 0;

      try { glRender && glRender(); } catch {}

      const dt = (() => {
        const prev = lastSimMs || tMs;
        lastSimMs = tMs;
        const raw = (tMs - prev) * 0.001;
        if (raw < 0) return 0;
        if (raw > 0.05) return 0.05;
        return raw;
      })();

      const tt = tMs * 0.001;
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        if (!c.interactive) {
          c.x += c.vx;
          c.y += c.vy;
          const wx = wCss + c.radius * 2;
          const wy = hCss + c.radius * 2;
          if (wx > 0) {
            while (c.x > wCss + c.radius) c.x -= wx;
            while (c.x < -c.radius) c.x += wx;
          }
          if (wy > 0) {
            while (c.y > hCss + c.radius) c.y -= wy;
            while (c.y < -c.radius) c.y += wy;
          }
        } else {
          const tx = (wCss * (0.5 + 0.26 * Math.sin(tt * 0.33)));
          const ty = (hCss * (0.5 + 0.22 * Math.cos(tt * 0.29)));
          const a = 1 - Math.exp(-dt / 0.10);
          c.x += (tx - c.x) * a;
          c.y += (ty - c.y) * a;
        }
      }

      ctx.clearRect(0, 0, wCss, hCss);
      const macro = gridMacro;
      const warpPx = gridWarpPx;
      const shiftScale = gridShiftScale;

      if (!macroField || !macroShiftX || !macroShiftY) {
        ctx.globalAlpha = 1;
        if (!prefersReduced && loop) {
          try { raf = requestAnimationFrame(draw); } catch {}
        }
        return;
      }

      for (let my = 0; my < macroH; my++) {
        const y = my * macro;
        for (let mx = 0; mx < macroW; mx++) {
          const x = mx * macro;
          let fieldSum = 0;
          let vx = 0;
          let vy = 0;
          for (let i = 0; i < circles.length && i < 6; i++) {
            const c = circles[i];
            const dx = x - c.x;
            const dy = y - c.y;
            const val = Math.exp(-(dx * dx + dy * dy) * c.inv2s2);
            fieldSum += val;
            vx += (-dx) * val;
            vy += (-dy) * val;
          }

          const intensity = clamp01(Math.pow(fieldSum, 1.4));
          let v = intensity;

          const bias = (hash2(mx + (seed & 255), my + ((seed >>> 8) & 255)) - 0.5) * 0.08;
          v = clamp01(v * 1.12 + 0.12 + bias);
          v = Math.round(v * 16) / 16;

          macroField[my * macroW + mx] = v;
          macroShiftX[my * macroW + mx] = vx * shiftScale * warpPx;
          macroShiftY[my * macroW + mx] = vy * shiftScale * warpPx;
        }
      }

      const baseR = gridBaseR;

      const dotFill18 = dotFill18Hex;
      const haloFill = '#dfe8ff';
      let currentFill = '';
      let currentAlphaQ = -1;
      const qA = (a0: number) => {
        let a = a0;
        if (a <= 0) return 0;
        if (a >= 1) return 32;
        return (a * 32 + 0.5) | 0;
      };
      const setStyle = (fill: string, a0: number) => {
        if (fill !== currentFill) {
          ctx.fillStyle = fill;
          currentFill = fill;
        }
        const qa = qA(a0);
        if (qa !== currentAlphaQ) {
          ctx.globalAlpha = qa * (1 / 32);
          currentAlphaQ = qa;
        }
      };

      ctx.globalCompositeOperation = 'source-over';

      for (let yi = 0; yi < gridYs.length; yi++) {
        const y = gridYs[yi];
        const iy = gridIys[yi];
        const ty = gridTy[yi];
        const rowBase = gridRowBase[yi];

        for (let xi = 0; xi < gridXs.length; xi++) {
          const x = gridXs[xi];
          const ix = gridIxs[xi];
          const mx0 = gridMx0[xi];
          const tx = gridTx[xi];
          const i00 = rowBase + mx0;
          const i10 = i00 + 1;
          const i01 = i00 + macroW;
          const i11 = i01 + 1;

          const v00 = macroField[i00];
          const v10 = macroField[i10];
          const v01 = macroField[i01];
          const v11 = macroField[i11];
          const sx00 = macroShiftX[i00];
          const sx10 = macroShiftX[i10];
          const sx01 = macroShiftX[i01];
          const sx11 = macroShiftX[i11];
          const sy00 = macroShiftY[i00];
          const sy10 = macroShiftY[i10];
          const sy01 = macroShiftY[i01];
          const sy11 = macroShiftY[i11];

          const v0 = v00 + (v10 - v00) * tx;
          const v1 = v01 + (v11 - v01) * tx;
          const v = v0 + (v1 - v0) * ty;

          const sx0 = sx00 + (sx10 - sx00) * tx;
          const sx1 = sx01 + (sx11 - sx01) * tx;
          const sy0 = sy00 + (sy10 - sy00) * tx;
          const sy1 = sy01 + (sy11 - sy01) * tx;
          const sx = sx0 + (sx1 - sx0) * ty;
          const sy = sy0 + (sy1 - sy0) * ty;

          const x0 = x + sx;
          const y0 = y + sy;

          const b = bayer8[((ix & 7) + ((iy & 7) << 3))] / 64;
          let d = v * 1.45 - (b * 0.55);
          if (d <= 0) continue;
          d *= 1.35;
          if (d >= 1) d = 1;

          setStyle(dotFill18, 0.66 + d * 0.62);
          const p1 = lut82[(d * 255) | 0];
          const r1 = baseR * p1;
          const s1 = Math.max(1.15, r1 * 2);
          ctx.fillRect(x0 - s1 * 0.5, y0 - s1 * 0.5, s1, s1);

          setStyle(haloFill, 0.22 + d * 0.42);
          const halo = s1 * 1.9;
          ctx.fillRect(x0 - halo * 0.5, y0 - halo * 0.5, halo, halo);
        }
      }

      ctx.globalAlpha = 1;

      try {
        void drawStatsOverlay;
      } catch {}

      ctx.globalAlpha = 1;


      if (!prefersReduced && loop) {
        try { raf = requestAnimationFrame(draw); } catch {}
      }
    };

    const start = () => {
      if (prefersReduced) {
        draw(0);
        stopped = true;
        return;
      }
      try { raf = requestAnimationFrame(draw); } catch {}
    };

    const hexToUnitRgb = (hex: string) => {
      const [r, g, b] = parseCssColor(hex);
      return [r / 255, g / 255, b / 255] as [number, number, number];
    };

    const initWebgl = () => {
      const gl = bgCanvas.getContext('webgl');
      if (!gl) return null;

      let width = bgCanvas.width = Math.max(1, Math.floor((window.innerWidth || 1) * bgScale));
      let height = bgCanvas.height = Math.max(1, Math.floor((window.innerHeight || 1) * bgScale));

      const resizeCanvas = () => {
        width = bgCanvas.width = Math.max(1, Math.floor((window.innerWidth || 1) * bgScale));
        height = bgCanvas.height = Math.max(1, Math.floor((window.innerHeight || 1) * bgScale));
        gl.viewport(0, 0, width, height);
      };

      const backgroundColorsHex = ['#0d0d0d', '#0f0f23'];
      const backgroundColors = backgroundColorsHex.map(hexToUnitRgb);

      const vertexSrc = `attribute vec2 a_position;varying vec2 v_uv;void main(void){v_uv=a_position*0.5+0.5;v_uv.y=1.0-v_uv.y;gl_Position=vec4(a_position,0.0,1.0);}`;
      const fragmentSrc = `precision mediump float;varying vec2 v_uv;uniform vec2 u_resolution;uniform int u_circleCount;uniform vec3 u_circlesColor[6];uniform vec3 u_circlesPosRad[6];uniform vec3 u_topColor;uniform vec3 u_bottomColor;void main(void){vec2 st=v_uv*u_resolution;vec3 bgColor=mix(u_topColor,u_bottomColor,st.y/u_resolution.y);float fieldSum=0.0;vec3 weightedColorSum=vec3(0.0);for(int i=0;i<6;i++){if(i>=u_circleCount){break;}vec3 posRad=u_circlesPosRad[i];vec2 cPos=vec2(posRad.r,posRad.g);float radius=posRad.b;float dist=length(st-cPos);float sigma=radius*0.5;float val=exp(-(dist*dist)/(2.0*sigma*sigma));fieldSum+=val;weightedColorSum+=u_circlesColor[i]*val;}vec3 finalCirclesColor=vec3(0.0);if(fieldSum>0.0){finalCirclesColor=weightedColorSum/fieldSum;}float intensity=pow(fieldSum,1.4);vec3 finalColor=mix(bgColor,finalCirclesColor,clamp(intensity,0.0,1.0));gl_FragColor=vec4(finalColor,1.0);}`;

      const createShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertShader = createShader(gl.VERTEX_SHADER, vertexSrc);
      const fragShader = createShader(gl.FRAGMENT_SHADER, fragmentSrc);
      if (!vertShader || !fragShader) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
      gl.useProgram(program);

      const quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const a_position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(a_position);
      gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

      const u_resolution = gl.getUniformLocation(program, 'u_resolution');
      const u_circleCount = gl.getUniformLocation(program, 'u_circleCount');
      const u_circlesColor = gl.getUniformLocation(program, 'u_circlesColor');
      const u_circlesPosRad = gl.getUniformLocation(program, 'u_circlesPosRad');
      const u_topColor = gl.getUniformLocation(program, 'u_topColor');
      const u_bottomColor = gl.getUniformLocation(program, 'u_bottomColor');

      gl.uniform3fv(u_topColor, new Float32Array(backgroundColors[0]));
      gl.uniform3fv(u_bottomColor, new Float32Array(backgroundColors[1]));

      const colorsArr = new Float32Array(18);
      const posRadArr = new Float32Array(18);

      const render = () => {
        if (stopped) return;
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        const useCount = Math.min(6, circles.length);
        gl.uniform1i(u_circleCount, useCount);
        gl.uniform2f(u_resolution, width, height);
        for (let i = 0; i < 6; i++) {
          const cOff = i * 3;
          if (i < useCount) {
            const c = circles[i];
            colorsArr[cOff + 0] = c.r * (1 / 255);
            colorsArr[cOff + 1] = c.g * (1 / 255);
            colorsArr[cOff + 2] = c.b * (1 / 255);
            posRadArr[cOff + 0] = c.x;
            posRadArr[cOff + 1] = c.y;
            posRadArr[cOff + 2] = c.radius;
          } else {
            colorsArr[cOff + 0] = 0;
            colorsArr[cOff + 1] = 0;
            colorsArr[cOff + 2] = 0;
            posRadArr[cOff + 0] = 0;
            posRadArr[cOff + 1] = 0;
            posRadArr[cOff + 2] = 0;
          }
        }
        gl.uniform3fv(u_circlesColor, colorsArr);
        gl.uniform3fv(u_circlesPosRad, posRadArr);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };

      const destroyGl = () => {
        try { gl.deleteProgram(program); } catch {}
        try { gl.deleteShader(vertShader); } catch {}
        try { gl.deleteShader(fragShader); } catch {}
        try { gl.deleteBuffer(quadBuffer); } catch {}
      };

      resizeCanvas();
      render();
      return { render, resize: resizeCanvas, destroy: destroyGl };
    };

    let webglInited = false;
    const ensureWebgl = () => {
      if (webglInited) return;
      webglInited = true;
      const webgl = initWebgl();
      glRender = webgl ? webgl.render : null;
      glResize = webgl ? webgl.resize : null;
      destroyWebgl = webgl ? webgl.destroy : null;
    };

    let themeObs: MutationObserver | null = null;
    try {
      themeObs = new MutationObserver(() => {
        try { refreshThemeColors(); } catch {}
      });
      themeObs.observe(themeRoot, { attributes: true, attributeFilter: ['style', 'class'] });
      if (themeRoot !== document.documentElement) {
        themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
      }
    } catch {}

    try {
      window.setTimeout(() => {
        try { ensureWebgl(); } catch {}
        try { refreshThemeColors(); } catch {}
        try { resize(); } catch {}
        try { draw(0, false); } catch {}
      }, 0);
    } catch {}

    let hideTimer: any = 0;
    let started = false;

    let closing = false;
    const beginClose = () => {
      if (closing) return;
      closing = true;
      try { hideTimer && clearTimeout(hideTimer); } catch {}
      hideTimer = 0;
      try { el.classList.add('wph-hide'); } catch {}
      try { audio && audio.playEnd && audio.playEnd(); } catch {}
      try {
        window.setTimeout(() => { remove(); }, tvAnimMs + 40);
      } catch {
        remove();
      }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      try {
        if (!ev) return;
        if (ev.key !== 'Escape') return;
        try { ev.preventDefault(); } catch {}
        try { ev.stopPropagation(); } catch {}
        beginClose();
      } catch {}
    };
    try { window.addEventListener('keydown', onKeyDown as any, { capture: true } as any); } catch {}
    try { closeBtn.addEventListener('click', () => { try { beginClose(); } catch {} }, { capture: true } as any); } catch {}
    const startBoot = () => {
      if (started) return;
      started = true;
      try { startBtn && (startBtn.disabled = true); } catch {}
      try { startWrap && startWrap.classList.add('wph-start-hide'); } catch {}
      try { el.classList.remove('wph-prestart'); } catch {}
      try {
        window.setTimeout(() => {
          try { startWrap && startWrap.remove(); } catch {}
        }, 240);
      } catch {}

      try { (statsWrap.style as any).display = ''; } catch {}
      try { runIdle(() => { try { renderDomStats(); } catch {} }); } catch {}
      try { themeUpdatesEnabled = false; } catch {}
      try { themeObs && themeObs.disconnect(); } catch {}

      try { audio && audio.unlock && audio.unlock(); } catch {}
      try { el.classList.add('wph-enter'); } catch {}
      try { audio && audio.playStart && audio.playStart(); } catch {}
      try { start(); } catch {}

      try {
        window.setTimeout(() => {
          try { el.classList.remove('wph-enter'); } catch {}
          try { blackEl && blackEl.remove(); } catch {}
        }, tvAnimMs + 40);
      } catch {}

      try { hideTimer && clearTimeout(hideTimer); } catch {}
      hideTimer = 0;
      try {
        hideTimer = window.setTimeout(() => {
          beginClose();
        }, durationMs);
      } catch {}
    };

    if (startBtn) {
      try {
        startBtn.addEventListener('click', (ev: any) => { try { ev && ev.preventDefault && ev.preventDefault(); } catch {} try { startBoot(); } catch {} }, { capture: true } as any);
      } catch {}
    }

    if (hideLoadButton) {
      try {
        window.setTimeout(() => { try { startBoot(); } catch {} }, 0);
      } catch {}
    }

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      stopped = true;
      try { hideTimer && clearTimeout(hideTimer); } catch {}
      hideTimer = 0;
      try { window.removeEventListener('keydown', onKeyDown as any, { capture: true } as any); } catch {}
      try { audio && audio.destroy && audio.destroy(); } catch {}
      try { hostEl && hostEl.removeAttribute && hostEl.removeAttribute('data-wph-boot'); } catch {}
      try { (window as any).__wphBootOverlayActive = false; } catch {}
      try { window.dispatchEvent(new CustomEvent('wph:boot-overlay:done')); } catch {}
      try { cancelAnimationFrame(raf); } catch {}
      try { themeObs && themeObs.disconnect(); } catch {}
      try { destroyWebgl && destroyWebgl(); } catch {}
      try { blackEl && blackEl.remove(); } catch {}
      try { style.remove(); } catch {}
      try { el.remove(); } catch {}
    };

    return remove;
  } catch {
    return () => {};
  }
}
