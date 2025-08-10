(() => {
    "use strict";
    try {
        if (window.__IMG_OVERLAY_TOOL__?.destroy) {
            window.__IMG_OVERLAY_TOOL__.destroy()
        }
    } catch (e) {}
    const api = {},
        root = document.createElement("div");
    window.__IMG_OVERLAY_TOOL__ = api;
    document.body.appendChild(root);
    const shadow = root.attachShadow({
        mode: "open"
    });
    const css = `
:host,*{box-sizing:border-box}
:host{--radius:12px;--ui:rgba(22,24,28,0.64);--ui-strong:rgba(26,28,34,0.75);--stroke:rgba(255,255,255,0.08);--shadow:0 16px 40px rgba(0,0,0,.45);--accent:#7dd0ff;--text:#e9eef3;--muted:#b8c0c8}
.overlay{position:fixed;left:80px;top:140px;width:800px;height:240px;z-index:2147483646;background:transparent;border:1px solid var(--stroke);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;opacity:.85;pointer-events:auto}
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
.btn.primary{border-color:#2b5d74;background:#184355;color:#d7f2ff}
.btn.primary:hover{background:#1a4c61}
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
.sidebar{position:fixed;left:80px;top:140px;width:250px;height:240px;z-index:2147483647;background:var(--ui-strong);backdrop-filter:blur(12px) saturate(1.1);-webkit-backdrop-filter:blur(12px) saturate(1.1);border:1px solid var(--stroke);border-radius:var(--radius);box-shadow:var(--shadow);color:#dbe3ea;display:flex;flex-direction:column;overflow:hidden;user-select:none}
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
.swatch .name{font-weight:700;color:#f1f6fb;letter-spacing:.2px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.swatch .cnt{font-size:11px;opacity:.8;color:#b8c0c8}
.side-foot{border-top:1px solid rgba(255,255,255,.08);padding:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.side-foot .stat{margin-left:auto;opacity:.9;color:#cfe4ff;font-weight:600}
.drop-hint{position:absolute;inset:0;display:grid;place-items:center;color:#b8c0c8;font-size:13px;text-align:center;padding:16px;pointer-events:none}
.drop-hint .box{border:1px dashed #4b5563;padding:14px 16px;border-radius:10px;background:rgba(255,255,255,0.02)}
.kbd{padding:0 6px;border:1px solid #444;border-bottom-width:2px;border-radius:6px;background:#222;font-weight:700}
`;
    const style = document.createElement("style");
    style.textContent = css;
    shadow.append(style);
    const pixelCss = `
.pixel-backdrop{position:fixed;inset:0;z-index:2147483650;background:rgba(0,0,0,.45);display:grid;place-items:center}
.pixel-modal{width:980px;max-width:96vw;height:640px;max-height:92vh;background:var(--ui-strong);border:1px solid var(--stroke);border-radius:12px;box-shadow:var(--shadow);display:flex;flex-direction:column;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif}
.pixel-head{height:48px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.pixel-title{font-weight:700;letter-spacing:.2px}
.pixel-filename{margin-left:auto;opacity:.9;background:#1f232a;border:1px solid #3a3f47;border-radius:999px;padding:6px 10px;max-width:45%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pixel-body{flex:1;display:grid;grid-template-columns:360px 1fr;gap:0;min-height:0}
.pixel-controls{border-right:1px solid rgba(255,255,255,.08);padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto}
.pixel-row{display:flex;align-items:center;gap:8px}
.pixel-row .value{margin-left:auto;opacity:.9}
.pixel-select{height:32px;padding:0 10px;border:1px solid #3a3f47;background:#1f232a;color:#e7eef6;border-radius:8px}
.pixel-slider{width:100%}
.pixel-stats{margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);display:flex;flex-wrap:wrap;gap:6px;color:#cfe4ff;font-weight:600}
.pixel-preview{position:relative;overflow:hidden;background:
  linear-gradient(45deg, #1b1f27 25%, transparent 25%) -8px 0/16px 16px,
  linear-gradient(45deg, transparent 75%, #1b1f27 75%) -8px 0/16px 16px,
  linear-gradient(45deg, #1b1f27 25%, transparent 25%) 0 0/16px 16px,
  linear-gradient(45deg, transparent 75%, #1b1f27 75%) 0 0/16px 16px,
  #161a20;
}
.pixel-canvas{position:absolute;left:0;top:0}
.pixel-foot{height:56px;display:flex;align-items:center;gap:8px;padding:0 12px;border-top:1px solid rgba(255,255,255,.08)}
.pixel-foot .spacer{flex:1}
.pixel-zoom{opacity:.9}
.hidden{display:none !important}
.custom-panel{border:1px solid rgba(255,255,255,.08);background:#1a1f27;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:10px}
.custom-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.custom-actions .note{margin-left:auto;opacity:.8}
.color-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px}
.color-btn{position:relative;aspect-ratio:1/1;border-radius:10px;border:1px solid #3a3f47;overflow:hidden;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.color-btn:hover{transform:translateY(-1px);border-color:#4a5058}
.color-btn.selected{box-shadow:inset 0 0 0 2px var(--accent);border-color:var(--accent)}
.color-btn .lock{position:absolute;right:4px;bottom:4px;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#0f1218;color:#cfd6df;opacity:.9}
.color-btn .lock svg{width:14px;height:14px}
.color-btn .tip{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#0e1117;color:#dfe7f1;border:1px solid #2b313b;border-radius:8px;padding:4px 8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;box-shadow:0 6px 18px rgba(0,0,0,.45);margin-bottom:6px;font-size:11px}
.color-btn:hover .tip{opacity:1}
.custom-legend{display:flex;align-items:center;gap:6px;opacity:.9;font-size:12px}
.custom-legend .icon{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;background:#0f1218;border-radius:50%;color:#cfd6df}

/* Crop 10x10 mosaic modal */
.crop-backdrop{position:fixed;inset:0;z-index:2147483650;background:rgba(0,0,0,.5);display:grid;place-items:center}
.crop-modal{width:980px;max-width:96vw;height:640px;max-height:92vh;background:var(--ui-strong);border:1px solid var(--stroke);border-radius:12px;box-shadow:var(--shadow);display:flex;flex-direction:column;color:#e9eef3}
.crop-head{height:48px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.crop-title{font-weight:700}
.crop-body{flex:1;display:grid;grid-template-columns:360px 1fr;gap:0;min-height:0}
.crop-controls{border-right:1px solid rgba(255,255,255,.08);padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto}
.crop-row{display:flex;align-items:center;gap:8px}
.crop-row .value{margin-left:auto;opacity:.9}
.crop-input{height:32px;padding:0 10px;border:1px solid #3a3f47;background:#1f232a;color:#e7eef6;border-radius:8px;flex:1;min-width:0}
.crop-btn{height:32px;padding:0 10px;border:1px solid #3a3f47;background:#262a30;color:#e8edf3;border-radius:8px;cursor:pointer}
.crop-btn:hover{background:#2e333a;border-color:#4a5058}
.crop-stats{display:flex;flex-wrap:wrap;gap:6px;color:#cfe4ff;font-weight:600}
.crop-preview{position:relative;overflow:hidden;background:
  linear-gradient(45deg, #1b1f27 25%, transparent 25%) -8px 0/16px 16px,
  linear-gradient(45deg, transparent 75%, #1b1f27 75%) -8px 0/16px 16px,
  linear-gradient(45deg, #1b1f27 25%, transparent 25%) 0 0/16px 16px,
  linear-gradient(45deg, transparent 75%, #1b1f27 75%) 0 0/16px 16px,
  #161a20;
}
.crop-canvas{position:absolute;left:0;top:0}
.sel{position:absolute;border:1.5px dashed rgba(255,255,255,.9);box-shadow:inset 0 0 0 1px rgba(0,0,0,.5);pointer-events:none}
.crop-foot{height:56px;display:flex;align-items:center;gap:8px;padding:0 12px;border-top:1px solid rgba(255,255,255,.08)}
.crop-foot .spacer{flex:1}
.crop-zoom{opacity:.9}
`;
    const style2 = document.createElement("style");
    style2.textContent = pixelCss;
    shadow.append(style2);

    function el(t, c, txt) {
        const n = document.createElement(t);
        if (c) n.className = c;
        if (txt != null) n.textContent = txt;
        return n
    }

    function numberInput(v) {
        const i = document.createElement("input");
        i.type = "number";
        i.min = "0";
        i.step = "1";
        i.value = v || "0";
        return i
    }

    function checkbox(ch = false) {
        const c = document.createElement("input");
        c.type = "checkbox";
        c.checked = ch;
        return c
    }

    function controlWrap(lbl) {
        const w = el("div", "control"),
            l = el("label", null, lbl);
        w.append(l);
        return w
    }

    function chip(text) {
        return el("div", "chip", text)
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v))
    }

    function rgbKey(r, g, b) {
        return r + "," + g + "," + b
    }

    function rgbToHex(r, g, b) {
        const h = n => n.toString(16).padStart(2, "0");
        return "#" + h(r) + h(g) + h(b)
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms))
    }
    const overlay = el("div", "overlay");
    const content = el("div", "content");
    const img = el("img", "the-image");
    const dropHint = el("div", "drop-hint");
    dropHint.innerHTML = '<div class="box">Перетащите изображение сюда — откроется окно настроек пикселизации, либо нажмите <span class="kbd">📁 Открыть</span></div>';
    content.append(img, dropHint);
    overlay.append(content);
    const brushCursor = el("div", "brush-cursor");
    const toolbar = el("div", "toolbar");
    const dragGrip = el("div", "drag-grip", "⠿");
    const toolbarScroll = el("div", "toolbar-scroll");
    const toolbarRow = el("div", "toolbar-row");
    const title = el("div", "title");
    title.innerHTML = 'Overlay Image <span class="badge">Pixel-perfect</span>';
    const btnOpen = el("button", "btn", "📁 Открыть");
    const btnCopyArt = el("button", "btn", "✂️ Копировать арт");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    const wWrap = controlWrap("W");
    const inW = numberInput("320");
    wWrap.append(inW);
    const hWrap = controlWrap("H");
    const inH = numberInput("240");
    hWrap.append(inH);
    let lockAspect = true;
    const btnLock = el("button", "btn icon", "🔒");
    btnLock.title = "Сохранять пропорции (вкл/выкл)";
    const snapWrap = el("div", "control");
    const snapCheck = checkbox(true);
    const snapLabel = el("label", null, "Кратн.");
    snapWrap.append(snapCheck, snapLabel);
    const scaleView = el("div", "scale", "—");
    const passWrap = el("div", "control");
    const passCheck = checkbox(false);
    passCheck.title = "Сквозные клики по странице (P)";
    const passLabel = el("label", null, "Сквозь");
    passWrap.append(passCheck, passLabel);
    const transWrap = el("div", "control");
    const transLabel = el("label", null, "Прозр.");
    const transCheck = checkbox(true);
    const opacity = document.createElement("input");
    opacity.type = "range";
    opacity.min = "0";
    opacity.max = "100";
    opacity.value = "85";
    const opVal = el("span", "value", "85%");
    transWrap.append(transLabel, transCheck, opacity, opVal);
    const btnClose = el("button", "btn danger", "✕ Закрыть");
    const fileChip = chip("Файл: —");
    fileChip.style.maxWidth = "220px";
    fileChip.style.whiteSpace = "nowrap";
    fileChip.style.textOverflow = "ellipsis";
    fileChip.style.overflow = "hidden";
    toolbarRow.append(title, btnOpen, btnCopyArt, fileChip, wWrap, hWrap, btnLock, snapWrap, scaleView, passWrap, transWrap, btnClose);
    toolbarScroll.append(toolbarRow);
    const fadeL = el("div", "fade-edge fade-left");
    const fadeR = el("div", "fade-edge fade-right");
    toolbar.append(dragGrip, toolbarScroll, fadeL, fadeR);
    const resizer = el("div", "resizer");
    const sidebar = el("div", "sidebar");
    const sideHead = el("div", "side-head");
    const sideScroll = el("div", "side-scroll");
    const sideRow = el("div", "side-row");
    const delayLbl = el("span", null, "Задержка:");
    const delayInp = numberInput("5");
    delayInp.style.width = "64px";
    const ms = el("span", null, "мс");
    ms.style.opacity = ".85";
    const btnStop = el("button", "btn", "■ Стоп");
    btnStop.title = "Остановить автоклик";
    const palStat = chip("— цветов");
    const brushChk = checkbox(false);
    const brushLbl = el("label", null, "Кисть");
    const sizeLbl = el("span", null, "Размер:");
    const brushSizeInp = numberInput("1");
    brushSizeInp.style.width = "56px";
    const activeChip = chip("Кисть: —");
    sideRow.append(delayLbl, delayInp, ms, btnStop, palStat, brushChk, brushLbl, sizeLbl, brushSizeInp, activeChip);
    sideScroll.append(sideRow);
    const sfadeL = el("div", "side-fade-left");
    const sfadeR = el("div", "side-fade-right");
    sideHead.append(sideScroll, sfadeL, sfadeR);
    const sideBody = el("div", "side-body");
    const paletteEl = el("div", "palette");
    sideBody.append(paletteEl);
    const sideFoot = el("div", "side-foot");
    const runStat = el("div", "stat", "—/—");
    sideFoot.append(runStat);
    sidebar.append(sideHead, sideBody, sideFoot);
    shadow.append(overlay, toolbar, resizer, sidebar, fileInput, brushCursor);
    const state = {
        x: 80,
        y: 140,
        w: 320,
        h: 240,
        barH: 48,
        barGap: 8,
        opacity: .85,
        transparencyOn: true,
        passThrough: false,
        dragging: false,
        resizing: false,
        start: {
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            w: 0,
            h: 0
        },
        minW: 1,
        minH: 1,
        iw: 0,
        ih: 0,
        imageData: null,
        palette: [],
        positionsCache: new Map(),
        posSetCache: new Map(),
        paintedByColor: new Map(),
        running: null,
        brushMode: false,
        brushSize: 1,
        isBrushing: false,
        activeColor: null,
        activeSwatch: null,
        currentURL: null,
        currentFileName: null,
        lastTileURL: null
    };

    function applyOpacity() {
        overlay.style.opacity = String(state.opacity)
    }

    function updateOpLabel() {
        opVal.textContent = Math.round(state.opacity * 100) + "%"
    }

    function updateScaleLabel() {
        if (!state.iw || !state.ih) {
            scaleView.textContent = "—";
            return
        }
        const sx = state.w / state.iw,
            sy = state.h / state.ih,
            fx = +sx.toFixed(2),
            fy = +sy.toFixed(2);
        scaleView.textContent = Math.abs(sx - sy) < 1e-6 ? fx + "x" : fx + "x × " + fy + "x"
    }

    function updatePassThrough() {
        overlay.style.pointerEvents = state.passThrough ? "none" : "auto";
        toolbar.style.pointerEvents = "auto";
        resizer.style.pointerEvents = "auto";
        sidebar.style.pointerEvents = "auto"
    }

    function syncUI() {
        overlay.style.left = state.x + "px";
        overlay.style.top = state.y + "px";
        overlay.style.width = state.w + "px";
        overlay.style.height = state.h + "px";
        const barTop = Math.max(8, state.y - state.barH - state.barGap);
        toolbar.style.left = state.x + "px";
        toolbar.style.top = barTop + "px";
        toolbar.style.width = state.w + "px";
        resizer.style.left = (state.x + state.w - 16) + "px";
        resizer.style.top = (state.y + state.h - 16) + "px";
        sidebar.style.left = (state.x + state.w + 8) + "px";
        sidebar.style.top = state.y + "px";
        sidebar.style.height = state.h + "px";
        inW.value = String(Math.round(state.w));
        inH.value = String(Math.round(state.h));
        updateScaleLabel()
    }

    function makeHScroll(frame, scroller, fadeL, fadeR) {
        const update = () => {
            const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth),
                sl = scroller.scrollLeft;
            frame.classList.toggle("has-left", sl > 2);
            frame.classList.toggle("has-right", sl < max - 2)
        };
        const onWheel = e => {
            const amt = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if (amt !== 0 && scroller.scrollWidth > scroller.clientWidth) {
                scroller.scrollLeft += amt * (e.shiftKey ? 2 : 1);
                update();
                e.preventDefault()
            }
        };
        scroller.addEventListener("wheel", onWheel, {
            passive: false
        });
        scroller.addEventListener("scroll", update);
        new ResizeObserver(update).observe(scroller);
        update()
    }

    function startDrag(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        state.dragging = true;
        state.start.x = e.clientX;
        state.start.y = e.clientY;
        state.start.left = state.x;
        state.start.top = state.y;
        e.currentTarget?.setPointerCapture?.(e.pointerId)
    }

    function moveDrag(e) {
        if (!state.dragging) return;
        const dx = e.clientX - state.start.x,
            dy = e.clientY - state.start.y;
        state.x = Math.round(state.start.left + dx);
        state.y = Math.round(state.start.top + dy);
        syncUI()
    }

    function endDrag() {
        state.dragging = false
    }

    function applySizeFromInputs(source) {
        let w = Math.max(1, Math.round(Number(inW.value))),
            h = Math.max(1, Math.round(Number(inH.value)));
        if (!Number.isFinite(w)) w = state.w;
        if (!Number.isFinite(h)) h = state.h;
        if (state.iw && state.ih) {
            if (lockAspect) {
                if (snapCheck.checked) {
                    const k = Math.max(1, Math.round((source === "h" ? (h / state.ih) : (w / state.iw))));
                    w = state.iw * k;
                    h = state.ih * k
                } else {
                    if (source === "h") {
                        const ratio = state.iw / state.ih;
                        w = Math.round(h * ratio)
                    } else {
                        const ratio = state.ih / state.iw;
                        h = Math.round(w * ratio)
                    }
                }
            } else if (snapCheck.checked) {
                const kx = Math.max(1, Math.round(w / state.iw)),
                    ky = Math.max(1, Math.round(h / state.ih));
                w = state.iw * kx;
                h = state.ih * ky
            }
        }
        state.w = w;
        state.h = h;
        syncUI()
    }

    function onResizeDragDown(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        state.resizing = true;
        state.start.x = e.clientX;
        state.start.y = e.clientY;
        state.start.w = state.w;
        state.start.h = state.h;
        resizer.setPointerCapture(e.pointerId)
    }

    function onResizeDragMove(e) {
        if (!state.resizing) return;
        const dx = e.clientX - state.start.x,
            dy = e.clientY - state.start.y;
        let w = clamp(Math.round(state.start.w + dx), state.minW, Math.max(state.minW, window.innerWidth - state.x - 8));
        let h = clamp(Math.round(state.start.h + dy), state.minH, Math.max(state.minH, window.innerHeight - state.y - 8));
        if (state.iw && state.ih) {
            if (lockAspect) {
                if (snapCheck.checked) {
                    const k = Math.max(1, Math.round(w / state.iw));
                    w = state.iw * k;
                    h = state.ih * k
                } else {
                    const ratio = state.ih / state.iw;
                    h = Math.round(w * ratio)
                }
            } else if (snapCheck.checked) {
                const kx = Math.max(1, Math.round(w / state.iw)),
                    ky = Math.max(1, Math.round(h / state.ih));
                w = state.iw * kx;
                h = state.ih * ky
            }
        }
        state.w = w;
        state.h = h;
        syncUI()
    }

    function onResizeDragUp() {
        state.resizing = false
    }
    async function extractPalette() {
        if (!state.iw || !state.ih) return;
        const cnv = document.createElement("canvas");
        cnv.width = state.iw;
        cnv.height = state.ih;
        const ctx = cnv.getContext("2d", {
            willReadFrequently: true
        });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, state.iw, state.ih);
        const imageData = ctx.getImageData(0, 0, state.iw, state.ih);
        state.imageData = imageData;
        const data = imageData.data,
            map = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a === 0) continue;
            const r = data[i],
                g = data[i + 1],
                b = data[i + 2];
            const key = rgbKey(r, g, b);
            map.set(key, (map.get(key) || 0) + 1)
        }
        const palette = Array.from(map.entries()).map(([key, count]) => {
            const [r, g, b] = key.split(",").map(Number);
            return {
                key,
                r,
                g,
                b,
                count,
                hex: rgbToHex(r, g, b)
            }
        }).sort((a, b) => b.count - a.count);
        state.palette = palette;
        state.positionsCache.clear();
        state.posSetCache.clear()
    }

    function renderPalette() {
        paletteEl.innerHTML = "";
        palStat.textContent = state.palette.length ? `${state.palette.length} цветов` : "— цветов";
        for (const c of state.palette) {
            const sw = el("div", "swatch");
            sw.dataset.key = c.key;
            const box = el("div", "box");
            box.style.background = c.hex;
            const meta = el("div", "meta");
            const nameText = COLOR_NAME_MAP.get(c.key) || c.hex.toUpperCase();
            const nameEl = el("div", "name", nameText);
            const cnt = el("div", "cnt", `${c.count} px`);
            meta.append(nameEl, cnt);
            sw.append(box, meta);
            sw.title = "Выбрать цвет";
            sw.addEventListener("click", () => {
                if (state.brushMode) {
                    setActiveColor(c, sw, false, true)
                } else {
                    startAutoClick(c)
                }
            });
            paletteEl.append(sw)
        }
        if (state.activeColor) {
            const sw = [...paletteEl.children].find(x => x.dataset.key === state.activeColor.key);
            if (sw) setActiveColor(state.activeColor, sw, true, false)
        }
    }

    function getPositionsForColor(key) {
        if (state.positionsCache.has(key)) return state.positionsCache.get(key);
        const data = state.imageData?.data;
        if (!data || !state.iw || !state.ih) return [];
        const [tr, tg, tb] = key.split(",").map(Number), w = state.iw, h = state.ih;
        const out = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (data[i + 3] === 0) continue;
                const r = data[i],
                    g = data[i + 1],
                    b = data[i + 2];
                if (r === tr && g === tg && b === tb) out.push([x, y])
            }
        }
        state.positionsCache.set(key, out);
        return out
    }

    function getPosSetForColor(key) {
        if (state.posSetCache.has(key)) return state.posSetCache.get(key);
        const arr = getPositionsForColor(key);
        const set = new Set();
        for (const [x, y] of arr) set.add(y * state.iw + x);
        state.posSetCache.set(key, set);
        return set
    }

    function simulateClickAt(x, y) {
        const prevOverlayPE = overlay.style.pointerEvents,
            prevToolbarPE = toolbar.style.pointerEvents,
            prevResizerPE = resizer.style.pointerEvents,
            prevSidebarPE = sidebar.style.pointerEvents;
        overlay.style.pointerEvents = "none";
        toolbar.style.pointerEvents = "none";
        resizer.style.pointerEvents = "none";
        const target = document.elementFromPoint(x, y);
        const build = (extra = {}) => ({
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            screenX: (window.screenX || 0) + x,
            screenY: (window.screenY || 0) + y,
            button: 0,
            buttons: 0,
            detail: 1,
            ...extra
        });
        try {
            if (target) {
                if (window.PointerEvent) {
                    target.dispatchEvent(new PointerEvent("pointermove", {
                        ...build(),
                        pointerId: 1,
                        pointerType: "mouse",
                        isPrimary: true,
                        pressure: 0
                    }));
                    target.dispatchEvent(new PointerEvent("pointerdown", {
                        ...build({
                            buttons: 1
                        }),
                        pointerId: 1,
                        pointerType: "mouse",
                        isPrimary: true,
                        pressure: .5
                    }))
                }
                target.dispatchEvent(new MouseEvent("mousemove", build()));
                target.dispatchEvent(new MouseEvent("mousedown", build({
                    buttons: 1
                })));
                if (window.PointerEvent) {
                    target.dispatchEvent(new PointerEvent("pointerup", {
                        ...build(),
                        pointerId: 1,
                        pointerType: "mouse",
                        isPrimary: true,
                        pressure: 0
                    }))
                }
                target.dispatchEvent(new MouseEvent("mouseup", build()));
                target.dispatchEvent(new MouseEvent("click", build()))
            }
        } finally {
            overlay.style.pointerEvents = prevOverlayPE;
            toolbar.style.pointerEvents = prevToolbarPE;
            resizer.style.pointerEvents = prevResizerPE;
            sidebar.style.pointerEvents = prevSidebarPE
        }
    }

    function startAutoClick(color) {
        if (!state.iw || !state.ih || !img.src) return;
        const positions = getPositionsForColor(color.key);
        if (!positions.length) return;
        const rect = img.getBoundingClientRect(),
            sx = rect.width / state.iw,
            sy = rect.height / state.ih;
        const delay = Math.max(0, Math.round(Number(delayInp.value) || 0));
        stopAutoClick();
        const runner = {
            color,
            positions,
            rect,
            sx,
            sy,
            idx: 0,
            total: positions.length,
            timer: null,
            running: true,
            delay
        };
        state.running = runner;
        updateRunStat();
        const tick = () => {
            if (!runner.running) return;
            if (runner.idx >= runner.total) {
                stopAutoClick();
                return
            }
            const [ix, iy] = runner.positions[runner.idx++], x = runner.rect.left + (ix + .5) * runner.sx, y = runner.rect.top + (iy + .5) * runner.sy;
            simulateClickAt(x, y);
            updateRunStat();
            if (!runner.running) return;
            if (runner.delay <= 0) runner.timer = requestAnimationFrame(tick);
            else runner.timer = setTimeout(tick, runner.delay)
        };
        tick()
    }

    function stopAutoClick() {
        const r = state.running;
        if (!r) return;
        r.running = false;
        if (r.timer != null) {
            if (typeof r.timer === "number") clearTimeout(r.timer);
            else cancelAnimationFrame(r.timer)
        }
        state.running = null;
        updateRunStat()
    }

    function updateRunStat() {
        runStat.textContent = state.running ? `${state.running.idx}/${state.running.total}` : "—/—"
    }

    function setActiveColor(color, swatch, silent, reset) {
        state.activeColor = color;
        activeChip.textContent = "Кисть: " + (COLOR_NAME_MAP.get(color.key) || color.hex.toUpperCase());
        activeChip.style.borderColor = color.hex;
        brushCursor.style.borderColor = color.hex;
        if (reset) state.paintedByColor.delete(color.key);
        if (state.activeSwatch) state.activeSwatch.classList.remove("active");
        if (swatch) {
            state.activeSwatch = swatch;
            swatch.classList.add("active")
        }
        if (state.brushMode && !silent) {
            brushCursor.style.display = "block"
        }
    }

    function setBrushMode(on) {
        state.brushMode = on;
        brushChk.checked = on;
        if (on) {
            stopAutoClick();
            overlay.classList.add("brush");
            passCheck.checked = false;
            passCheck.disabled = true;
            state.passThrough = false;
            updatePassThrough();
            brushCursor.style.display = state.activeColor ? "block" : "none"
        } else {
            overlay.classList.remove("brush");
            passCheck.disabled = false;
            brushCursor.style.display = "none"
        }
    }

    function updateBrushCursorAt(clientX, clientY) {
        if (!state.brushMode || !state.activeColor) {
            brushCursor.style.display = "none";
            return
        }
        const rect = img.getBoundingClientRect();
        const sx = rect.width / state.iw,
            sy = rect.height / state.ih;
        const ix = Math.floor((clientX - rect.left) / sx);
        const iy = Math.floor((clientY - rect.top) / sy);
        const cx = rect.left + (clamp(ix, 0, state.iw - 1) + .5) * sx;
        const cy = rect.top + (clamp(iy, 0, state.ih - 1) + .5) * sy;
        const w = Math.max(1, state.brushSize) * sx;
        const h = Math.max(1, state.brushSize) * sy;
        brushCursor.style.width = w + "px";
        brushCursor.style.height = h + "px";
        brushCursor.style.left = cx + "px";
        brushCursor.style.top = cy + "px";
        brushCursor.style.display = "block"
    }

    function brushPaintAt(clientX, clientY) {
        if (!state.activeColor || !state.iw || !state.ih) return;
        const rect = img.getBoundingClientRect();
        const sx = rect.width / state.iw,
            sy = rect.height / state.ih;
        const ix = Math.floor((clientX - rect.left) / sx);
        const iy = Math.floor((clientY - rect.top) / sy);
        const size = Math.max(1, state.brushSize);
        const half = Math.floor((size - 1) / 2);
        let x0 = ix - half,
            y0 = iy - half,
            x1 = ix + size - half - 1,
            y1 = iy + size - half - 1;
        x0 = clamp(x0, 0, state.iw - 1);
        y0 = clamp(y0, 0, state.ih - 1);
        x1 = clamp(x1, 0, state.iw - 1);
        y1 = clamp(y1, 0, state.ih - 1);
        const set = getPosSetForColor(state.activeColor.key);
        if (!state.paintedByColor.has(state.activeColor.key)) state.paintedByColor.set(state.activeColor.key, new Set());
        const painted = state.paintedByColor.get(state.activeColor.key);
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const idx = y * state.iw + x;
                if (!set.has(idx) || painted.has(idx)) continue;
                const cx = rect.left + (x + .5) * sx,
                    cy = rect.top + (y + .5) * sy;
                simulateClickAt(cx, cy);
                painted.add(idx)
            }
        }
    }

    function setImageURL(url, fileName) {
        if (state.currentURL && state.currentURL !== url) {
            try {
                URL.revokeObjectURL(state.currentURL)
            } catch (e) {}
        }
        state.currentURL = url;
        state.currentFileName = fileName || null;
        img.src = url;
        fileChip.textContent = "Файл: " + (fileName || "—");
        fileChip.title = fileName || "";
    }

    function createImageElementFromURL(url) {
        return new Promise((resolve, reject) => {
            const im = new Image();
            im.decoding = "async";
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = url;
        });
    }

    function downloadBlob(blob, filename) {
        const a = document.createElement("a");
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.download = filename || "image.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 1000);
    }

    function srgb8ToLinear(u) {
        const c = u / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }

    function rgb8ToOKLab(r, g, b) {
        const R = srgb8ToLinear(r),
            G = srgb8ToLinear(g),
            B = srgb8ToLinear(b);
        const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
        const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
        const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
        const l_ = Math.cbrt(Math.max(1e-9, l));
        const m_ = Math.cbrt(Math.max(1e-9, m));
        const s_ = Math.cbrt(Math.max(1e-9, s));
        return [
            0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
        ];
    }

    function sqr(x) {
        return x * x
    }

    function nearestColorIndex(r, g, b, pal, palLab, useOKLab) {
        let best = 0,
            bd = Infinity;
        if (useOKLab) {
            const [L, a, b2] = rgb8ToOKLab(r, g, b);
            for (let i = 0; i < pal.length; i++) {
                const p = palLab[i];
                const d = sqr(L - p[0]) + sqr(a - p[1]) + sqr(b2 - p[2]);
                if (d < bd) {
                    bd = d;
                    best = i
                }
            }
        } else {
            for (let i = 0; i < pal.length; i++) {
                const p = pal[i];
                const d = sqr(r - p[0]) + sqr(g - p[1]) + sqr(b - p[2]);
                if (d < bd) {
                    bd = d;
                    best = i
                }
            }
        }
        return best
    }

    function clamp255(x) {
        return x < 0 ? 0 : x > 255 ? 255 : x
    }
    const BAYER4 = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];
    const BAYER8 = [
        [0, 32, 8, 40, 2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44, 4, 36, 14, 46, 6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [3, 35, 11, 43, 1, 33, 9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47, 7, 39, 13, 45, 5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21]
    ];
    const MASTER_COLORS = [{
            rgb: [0, 0, 0],
            name: "Black",
            paid: false
        },
        {
            rgb: [60, 60, 60],
            name: "Dark Gray",
            paid: false
        },
        {
            rgb: [120, 120, 120],
            name: "Gray",
            paid: false
        },
        {
            rgb: [170, 170, 170],
            name: "Medium Gray",
            paid: true
        },
        {
            rgb: [210, 210, 210],
            name: "Light Gray",
            paid: false
        },
        {
            rgb: [255, 255, 255],
            name: "White",
            paid: false
        },
        {
            rgb: [96, 0, 24],
            name: "Deep Red",
            paid: false
        },
        {
            rgb: [165, 14, 30],
            name: "Dark Red",
            paid: false
        },
        {
            rgb: [237, 28, 36],
            name: "Red",
            paid: false
        },
        {
            rgb: [250, 128, 114],
            name: "Light Red",
            paid: true
        },
        {
            rgb: [228, 92, 26],
            name: "Dark Orange",
            paid: true
        },
        {
            rgb: [255, 127, 39],
            name: "Orange",
            paid: false
        },
        {
            rgb: [246, 170, 9],
            name: "Gold",
            paid: false
        },
        {
            rgb: [249, 221, 59],
            name: "Yellow",
            paid: false
        },
        {
            rgb: [255, 250, 188],
            name: "Light Yellow",
            paid: false
        },
        {
            rgb: [156, 132, 49],
            name: "Dark Goldenrod",
            paid: true
        },
        {
            rgb: [197, 173, 49],
            name: "Goldenrod",
            paid: true
        },
        {
            rgb: [232, 212, 95],
            name: "Light Goldenrod",
            paid: true
        },
        {
            rgb: [74, 107, 58],
            name: "Dark Olive",
            paid: true
        },
        {
            rgb: [90, 148, 74],
            name: "Olive",
            paid: true
        },
        {
            rgb: [132, 197, 115],
            name: "Light Olive",
            paid: true
        },
        {
            rgb: [14, 185, 104],
            name: "Dark Green",
            paid: false
        },
        {
            rgb: [19, 230, 123],
            name: "Green",
            paid: false
        },
        {
            rgb: [135, 255, 94],
            name: "Light Green",
            paid: false
        },
        {
            rgb: [12, 129, 110],
            name: "Dark Teal",
            paid: false
        },
        {
            rgb: [16, 174, 166],
            name: "Teal",
            paid: false
        },
        {
            rgb: [19, 225, 190],
            name: "Light Teal",
            paid: false
        },
        {
            rgb: [15, 121, 159],
            name: "Dark Cyan",
            paid: true
        },
        {
            rgb: [96, 247, 242],
            name: "Cyan",
            paid: false
        },
        {
            rgb: [187, 250, 242],
            name: "Light Cyan",
            paid: true
        },
        {
            rgb: [40, 80, 158],
            name: "Dark Blue",
            paid: false
        },
        {
            rgb: [64, 147, 228],
            name: "Blue",
            paid: false
        },
        {
            rgb: [125, 199, 255],
            name: "Light Blue",
            paid: true
        },
        {
            rgb: [77, 49, 184],
            name: "Dark Indigo",
            paid: true
        },
        {
            rgb: [107, 80, 246],
            name: "Indigo",
            paid: false
        },
        {
            rgb: [153, 177, 251],
            name: "Light Indigo",
            paid: false
        },
        {
            rgb: [74, 66, 132],
            name: "Dark Slate Blue",
            paid: true
        },
        {
            rgb: [122, 113, 196],
            name: "Slate Blue",
            paid: true
        },
        {
            rgb: [181, 174, 241],
            name: "Light Slate Blue",
            paid: true
        },
        {
            rgb: [120, 12, 153],
            name: "Dark Purple",
            paid: false
        },
        {
            rgb: [170, 56, 185],
            name: "Purple",
            paid: false
        },
        {
            rgb: [224, 159, 249],
            name: "Light Purple",
            paid: false
        },
        {
            rgb: [203, 0, 122],
            name: "Dark Pink",
            paid: false
        },
        {
            rgb: [236, 31, 128],
            name: "Pink",
            paid: false
        },
        {
            rgb: [243, 141, 169],
            name: "Light Pink",
            paid: false
        },
        {
            rgb: [155, 82, 73],
            name: "Dark Peach",
            paid: true
        },
        {
            rgb: [209, 128, 120],
            name: "Peach",
            paid: true
        },
        {
            rgb: [250, 182, 164],
            name: "Light Peach",
            paid: true
        },
        {
            rgb: [104, 70, 52],
            name: "Dark Brown",
            paid: false
        },
        {
            rgb: [149, 104, 42],
            name: "Brown",
            paid: false
        },
        {
            rgb: [219, 164, 99],
            name: "Light Brown",
            paid: true
        },
        {
            rgb: [123, 99, 82],
            name: "Dark Tan",
            paid: true
        },
        {
            rgb: [156, 132, 107],
            name: "Tan",
            paid: true
        },
        {
            rgb: [214, 181, 148],
            name: "Light Tan",
            paid: true
        },
        {
            rgb: [209, 128, 81],
            name: "Dark Beige",
            paid: true
        },
        {
            rgb: [248, 178, 119],
            name: "Beige",
            paid: false
        },
        {
            rgb: [255, 197, 165],
            name: "Light Beige",
            paid: true
        },
        {
            rgb: [109, 100, 63],
            name: "Dark Stone",
            paid: true
        },
        {
            rgb: [148, 140, 107],
            name: "Stone",
            paid: true
        },
        {
            rgb: [205, 197, 158],
            name: "Light Stone",
            paid: true
        },
        {
            rgb: [51, 57, 65],
            name: "Dark Slate",
            paid: true
        },
        {
            rgb: [109, 117, 141],
            name: "Slate",
            paid: true
        },
        {
            rgb: [179, 185, 209],
            name: "Light Slate",
            paid: true
        }
    ];
    const COLOR_NAME_MAP = new Map(MASTER_COLORS.map(c => [rgbKey(c.rgb[0], c.rgb[1], c.rgb[2]), c.name]));

    function quantizeAndDitherSmall(sctx, w, h, options) {
        const {
            palette,
            distanceSpace,
            dither,
            ditherStrength
        } = options;
        if (!palette || palette.length === 0) return {
            used: 0,
            total: 0
        };
        const img = sctx.getImageData(0, 0, w, h);
        const src = img.data;
        const pal = palette;
        const palLab = (distanceSpace === "oklab") ? pal.map(p => rgb8ToOKLab(p[0], p[1], p[2])) : null;
        const usedIdx = new Set();
        const out = new Uint8ClampedArray(src.length);
        if (dither === "ordered4" || dither === "ordered8") {
            const M = dither === "ordered8" ? BAYER8 : BAYER4;
            const div = dither === "ordered8" ? 64 : 16;
            const amp = 63 * ditherStrength;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const p = (y * w + x) * 4;
                    const a = src[p + 3];
                    if (a < 8) {
                        out[p] = src[p];
                        out[p + 1] = src[p + 1];
                        out[p + 2] = src[p + 2];
                        out[p + 3] = a;
                        continue
                    }
                    const t = (M[y % M.length][x % M[0].length] + 0.5) / div - 0.5;
                    const r = clamp255(src[p] + t * amp);
                    const g = clamp255(src[p + 1] + t * amp);
                    const b = clamp255(src[p + 2] + t * amp);
                    const qi = nearestColorIndex(r, g, b, pal, palLab, distanceSpace === "oklab");
                    const q = pal[qi];
                    out[p] = q[0];
                    out[p + 1] = q[1];
                    out[p + 2] = q[2];
                    out[p + 3] = a;
                    usedIdx.add(qi);
                }
            }
        } else if (dither === "fs" || dither === "atkinson") {
            const wr = new Float32Array(w * h),
                wg = new Float32Array(w * h),
                wb = new Float32Array(w * h),
                wa = new Uint8ClampedArray(w * h);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const p = (y * w + x) * 4,
                        i = y * w + x;
                    wr[i] = src[p];
                    wg[i] = src[p + 1];
                    wb[i] = src[p + 2];
                    wa[i] = src[p + 3];
                }
            }
            const serp = true;
            for (let y = 0; y < h; y++) {
                const leftToRight = !serp || (y % 2 === 0);
                const xStart = leftToRight ? 0 : w - 1,
                    xEnd = leftToRight ? w : -1,
                    step = leftToRight ? 1 : -1;
                for (let x = xStart; x != xEnd; x += step) {
                    const i = y * w + x,
                        p = i * 4;
                    const a = wa[i];
                    if (a < 8) {
                        out[p] = src[p];
                        out[p + 1] = src[p + 1];
                        out[p + 2] = src[p + 2];
                        out[p + 3] = a;
                        continue
                    }
                    const r = wr[i],
                        g = wg[i],
                        b = wb[i];
                    const qi = nearestColorIndex(r, g, b, pal, palLab, distanceSpace === "oklab");
                    const q = pal[qi];
                    out[p] = q[0];
                    out[p + 1] = q[1];
                    out[p + 2] = q[2];
                    out[p + 3] = a;
                    usedIdx.add(qi);
                    let er = (r - q[0]) * ditherStrength,
                        eg = (g - q[1]) * ditherStrength,
                        eb = (b - q[2]) * ditherStrength;
                    if (dither === "fs") {
                        const dir = leftToRight ? 1 : -1;
                        if (x + dir >= 0 && x + dir < w) {
                            const j = y * w + (x + dir);
                            wr[j] += er * 7 / 16;
                            wg[j] += eg * 7 / 16;
                            wb[j] += eb * 7 / 16
                        }
                        if (y + 1 < h && x - dir >= 0 && x - dir < w) {
                            const j = (y + 1) * w + (x - dir);
                            wr[j] += er * 3 / 16;
                            wg[j] += eg * 3 / 16;
                            wb[j] += eb * 3 / 16
                        }
                        if (y + 1 < h) {
                            const j = (y + 1) * w + x;
                            wr[j] += er * 5 / 16;
                            wg[j] += eg * 5 / 16;
                            wb[j] += eb * 5 / 16
                        }
                        if (y + 1 < h && x + dir >= 0 && x + dir < w) {
                            const j = (y + 1) * w + (x + dir);
                            wr[j] += er * 1 / 16;
                            wg[j] += eg * 1 / 16;
                            wb[j] += eb * 1 / 16
                        }
                    } else {
                        const dir = leftToRight ? 1 : -1;
                        const w8 = 1 / 8;

                        function add(nx, ny, wgt) {
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const j = ny * w + nx;
                                wr[j] += er * wgt;
                                wg[j] += eg * wgt;
                                wb[j] += eb * wgt
                            }
                        }
                        add(x + dir, y, w8);
                        add(x + 2 * dir, y, w8);
                        add(x - dir, y + 1, w8);
                        add(x, y + 1, w8);
                        add(x + dir, y + 1, w8);
                        add(x, y + 2, w8);
                    }
                }
            }
        } else {
            for (let i = 0; i < src.length; i += 4) {
                const a = src[i + 3];
                if (a < 8) {
                    out[i] = src[i];
                    out[i + 1] = src[i + 1];
                    out[i + 2] = src[i + 2];
                    out[i + 3] = a;
                    continue
                }
                const qi = nearestColorIndex(src[i], src[i + 1], src[i + 2], pal, palLab, distanceSpace === "oklab");
                const q = pal[qi];
                out[i] = q[0];
                out[i + 1] = q[1];
                out[i + 2] = q[2];
                out[i + 3] = a;
                usedIdx.add(qi);
            }
        }
        img.data.set(out);
        sctx.putImageData(img, 0, 0);
        return {
            used: usedIdx.size,
            total: pal.length
        };
    }

    function tileRegex(url) {
        return /\/files\/s\d+\/tiles\/\d+\/\d+\.png(\?.*)?$/i.test(url || "")
    }

    function parseTileURL(url) {
        try {
            const u = new URL(url);
            const m = u.pathname.match(/\/files\/(s\d+)\/tiles\/(\d+)\/(\d+)\.png/i);
            if (!m) return null;
            return {
                origin: u.origin,
                s: m[1],
                x: parseInt(m[2], 10),
                y: parseInt(m[3], 10)
            }
        } catch (e) {
            return null
        }
    }

    function performanceLastTile() {
        try {
            const entries = performance.getEntriesByType("resource") || [];
            const filtered = entries.filter(e => tileRegex(e.name));
            if (!filtered.length) return null;
            filtered.sort((a, b) => a.startTime - b.startTime);
            return filtered[filtered.length - 1].name
        } catch (e) {
            return null
        }
    }

    function installTileSniffer() {
        try {
            const ofetch = window.fetch;
            if (ofetch && !ofetch.__twrapped) {
                const wf = function(input, init) {
                    const u = typeof input === "string" ? input : (input && input.url) || "";
                    return ofetch(input, init).then(res => {
                        try {
                            if (res && res.ok && tileRegex(u)) state.lastTileURL = u
                        } catch (_) {}
                        return res
                    })
                };
                wf.__twrapped = true;
                window.fetch = wf
            }
        } catch (e) {}
        try {
            const XHR = window.XMLHttpRequest;
            if (XHR && XHR.prototype && !XHR.prototype.__twrapped) {
                const open = XHR.prototype.open;
                XHR.prototype.open = function(m, u, ...rest) {
                    this.__turl = u;
                    return open.apply(this, [m, u, ...rest])
                };
                const send = XHR.prototype.send;
                XHR.prototype.send = function(...args) {
                    this.addEventListener("load", () => {
                        try {
                            if (this.status >= 200 && this.status < 300 && tileRegex(this.__turl)) state.lastTileURL = this.__turl
                        } catch (_) {}
                    })
                    return send.apply(this, args)
                };
                XHR.prototype.__twrapped = true
            }
        } catch (e) {}
        if (!state.lastTileURL) {
            const u = performanceLastTile();
            if (u) state.lastTileURL = u
        }
    }
    async function openTileCropDialog() {
        return new Promise(async (resolve) => {
            const back = el("div", "crop-backdrop");
            const modal = el("div", "crop-modal");
            const head = el("div", "crop-head");
            const title = el("div", "crop-title", "Копировать арт");
            const btnCloseX = el("button", "btn icon", "✕");
            head.append(title, btnCloseX);

            const body = el("div", "crop-body");
            const controls = el("div", "crop-controls");

            const rowXY = el("div", "crop-row");
            const lblX = el("label", null, "X");
            const inX = numberInput("0");
            inX.style.width = "90px";
            const lblY = el("label", null, "Y");
            const inY = numberInput("0");
            inY.style.width = "90px";
            rowXY.append(lblX, inX, lblY, inY);

            const rowSizes = el("div", "crop-row");
            const makeSizeBtn = n => {
                const b = el("button", "crop-btn", `${n}×${n}`);
                b.dataset.n = n;
                return b
            };
            const btn2 = makeSizeBtn(2),
                btn3 = makeSizeBtn(3),
                btn4 = makeSizeBtn(4),
                btn5 = makeSizeBtn(5),
                btn10 = makeSizeBtn(10);
            rowSizes.append(btn2, btn3, btn4, btn5, btn10);

            const rowDelay = el("div", "crop-row");
            const lblDelay = el("label", null, "Задержка, сек");
            const delay = document.createElement("input");
            delay.type = "range";
            delay.min = "0.2";
            delay.max = "5";
            delay.step = "0.1";
            delay.value = "0.5";
            delay.className = "pixel-slider";
            const delayVal = el("span", "value", "0.5s");
            rowDelay.append(lblDelay, delay, delayVal);

            const stats = el("div", "crop-stats");
            const stSrc = el("div", null, "Source: — × —");
            const sMid = el("div", null, "|");
            sMid.style.opacity = ".6";
            sMid.style.margin = "0 6px";
            const stTile = el("div", null, "Tile: — × —");
            const sMid2 = el("div", null, "|");
            sMid2.style.opacity = ".6";
            sMid2.style.margin = "0 6px";
            const stProg = el("div", null, "Progress: —/— (fail 0)");
            stats.append(stSrc, sMid, stTile, sMid2, stProg);

            controls.append(rowXY, rowSizes, rowDelay, stats);

            const preview = el("div", "crop-preview");
            const canvas = document.createElement("canvas");
            canvas.className = "crop-canvas";
            const ctx = canvas.getContext("2d", {
                alpha: true
            });
            const sel = el("div", "sel");
            preview.append(canvas, sel);

            const foot = el("div", "crop-foot");
            const zoomLbl = el("div", "crop-zoom", "Zoom: 1×");
            const btnCenter = el("button", "btn", "🎯 Центр");
            const spacer = el("div", "spacer");
            const btnSave = el("button", "btn", "💾 Сохранить PNG");
            const btnCancel = el("button", "btn danger", "Отмена");
            foot.append(zoomLbl, btnCenter, spacer, btnSave, btnCancel);

            modal.append(head, body, foot);
            body.append(controls, preview);
            back.append(modal);
            shadow.append(back);

            function sleep(ms) {
                return new Promise(r => setTimeout(r, ms))
            }

            let origin = "https://backend.wplace.live",
                sSeg = "s0";
            if (state.lastTileURL) {
                const p = parseTileURL(state.lastTileURL);
                if (p) {
                    origin = p.origin;
                    sSeg = p.s;
                    inX.value = String(p.x);
                    inY.value = String(p.y)
                }
            }
            let nSize = 10;
            let tileW = 0,
                tileH = 0,
                iw = 0,
                ih = 0;
            let mosaic = null,
                mctx = null;

            let zoom = 1,
                baseScale = 1,
                offX = 0,
                offY = 0;
            const zoomLevels = [0.5, 1, 2, 3, 4, 5, 10, 20, 30, 40, 50];

            let dragging = false,
                panMode = false,
                sx = 0,
                sy = 0,
                sox = 0,
                soy = 0;
            let selActive = false,
                selStart = {
                    x: 0,
                    y: 0
                },
                selBox = {
                    x: 0,
                    y: 0,
                    w: 0,
                    h: 0
                };
            let abortLoad = false;

            function draw() {
                const vw = canvas.width,
                    vh = canvas.height;
                ctx.clearRect(0, 0, vw, vh);
                if (mosaic) {
                    const s = baseScale * zoom;
                    const drawW = iw * s,
                        drawH = ih * s;
                    const cx = (vw - drawW) / 2 + offX,
                        cy = (vh - drawH) / 2 + offY;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(mosaic, Math.round(cx), Math.round(cy), Math.round(drawW), Math.round(drawH));
                    if (selBox.w > 0 && selBox.h > 0) {
                        const rx = cx + selBox.x * s,
                            ry = cy + selBox.y * s,
                            rw = selBox.w * s,
                            rh = selBox.h * s;
                        sel.style.display = "block";
                        sel.style.left = rx + "px";
                        sel.style.top = ry + "px";
                        sel.style.width = rw + "px";
                        sel.style.height = rh + "px";
                    } else sel.style.display = "none";
                } else sel.style.display = "none";
                zoomLbl.textContent = `Zoom: ${zoom.toFixed(2)}×`;
            }

            function fit(resetZoom) {
                const rect = preview.getBoundingClientRect();
                const vw = Math.max(100, Math.floor(rect.width));
                const vh = Math.max(100, Math.floor(rect.height));
                canvas.width = vw;
                canvas.height = vh;
                if (iw && ih) {
                    baseScale = Math.min(vw / iw, vh / ih);
                    if (resetZoom) {
                        zoom = 1;
                        offX = 0;
                        offY = 0;
                    }
                }
                draw();
            }

            function zoomAt(mx, my, nz) {
                if (!mosaic) return;
                const idx = zoomLevels.reduce((best, i, cur) =>
                    Math.abs(zoomLevels[cur] - nz) < Math.abs(zoomLevels[best] - nz) ? cur : best, 0
                );
                const z2 = zoomLevels[idx];
                const vw = canvas.width,
                    vh = canvas.height;
                const s = baseScale * zoom;
                const ns = baseScale * z2;
                const sx0 = (vw - iw * s) / 2 + offX,
                    sy0 = (vh - ih * s) / 2 + offY;
                const u = (mx - sx0) / s,
                    v = (my - sy0) / s;
                const sx1 = mx - u * ns,
                    sy1 = my - v * ns;
                offX = sx1 - (vw - iw * ns) / 2;
                offY = sy1 - (vh - ih * ns) / 2;
                zoom = z2;
                draw();
            }

            function viewToImg(px, py) {
                const vw = canvas.width,
                    vh = canvas.height;
                const s = baseScale * zoom;
                const sx = (vw - iw * s) / 2 + offX,
                    sy = (vh - ih * s) / 2 + offY;
                const ix = (px - sx) / s,
                    iy = (py - sy) / s;
                return {
                    x: ix,
                    y: iy,
                    inside: ix >= 0 && iy >= 0 && ix < iw && iy < ih
                }
            }

            const roPrev = new ResizeObserver(() => fit(false));
            roPrev.observe(preview);

            preview.addEventListener("pointerdown", (e) => {
                if (!mosaic) return;
                const rect = preview.getBoundingClientRect();
                if (e.button === 2) {
                    panMode = true;
                    dragging = true;
                    sx = e.clientX;
                    sy = e.clientY;
                    sox = offX;
                    soy = offY;
                    preview.setPointerCapture?.(e.pointerId);
                    e.preventDefault();
                    return
                }
                if (e.button === 0) {
                    const pt = viewToImg(e.clientX - rect.left, e.clientY - rect.top);
                    if (pt.inside) {
                        selActive = true;
                        dragging = true;
                        selStart = {
                            x: Math.floor(pt.x),
                            y: Math.floor(pt.y)
                        };
                        selBox = {
                            x: selStart.x,
                            y: selStart.y,
                            w: 0,
                            h: 0
                        };
                        preview.setPointerCapture?.(e.pointerId);
                        e.preventDefault();
                    }
                }
            });

            preview.addEventListener("pointermove", (e) => {
                if (!mosaic) return;
                if (panMode && dragging) {
                    offX = sox + (e.clientX - sx);
                    offY = soy + (e.clientY - sy);
                    draw();
                    return
                }
                if (selActive && dragging) {
                    const rect = preview.getBoundingClientRect();
                    const pt = viewToImg(e.clientX - rect.left, e.clientY - rect.top);
                    const ex = clamp(Math.floor(pt.x), 0, iw - 1),
                        ey = clamp(Math.floor(pt.y), 0, ih - 1);
                    const x0 = Math.min(selStart.x, ex),
                        y0 = Math.min(selStart.y, ey);
                    const x1 = Math.max(selStart.x, ex),
                        y1 = Math.max(selStart.y, ey);
                    selBox = {
                        x: x0,
                        y: y0,
                        w: x1 - x0 + 1,
                        h: y1 - y0 + 1
                    };
                    draw();
                }
            });

            preview.addEventListener("pointerup", () => {
                dragging = false;
                selActive = false;
                panMode = false
            });
            preview.addEventListener("contextmenu", e => e.preventDefault());

            preview.addEventListener("wheel", (e) => {
                e.preventDefault();
                if (!mosaic) return;
                const rect = preview.getBoundingClientRect();
                const mx = e.clientX - rect.left,
                    my = e.clientY - rect.top;

                let curIdx = zoomLevels.reduce((best, i, cur) => Math.abs(zoomLevels[cur] - zoom) < Math.abs(zoomLevels[best] - zoom) ? cur : best, 0);
                const dir = e.deltaY > 0 ? -1 : 1; 
                let nextIdx = Math.max(0, Math.min(zoomLevels.length - 1, curIdx + dir));
                const nz = zoomLevels[nextIdx];
                zoomAt(mx, my, nz);
            }, {
                passive: false
            });

            btnCenter.addEventListener("click", () => {
                if (!mosaic) return;
                zoom = 1;
                offX = 0;
                offY = 0;
                draw();
            });

            function buildTileURL(x, y) {
                return `${origin}/files/${sSeg}/tiles/${x}/${y}.png`
            }
            async function loadImageURL(url) {
                const res = await fetch(url, {
                    mode: "cors",
                    credentials: "omit"
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                const blob = await res.blob();
                return await new Promise((resolve, reject) => {
                    const im = new Image();
                    im.onload = () => resolve(im);
                    im.onerror = reject;
                    im.src = URL.createObjectURL(blob);
                });
            }
            async function fetchTileWithRetry(url, attempts, baseDelayMs) {
                let d = baseDelayMs;
                for (let i = 1; i <= attempts; i++) {
                    try {
                        const im = await loadImageURL(url);
                        return im
                    } catch (e) {
                        if (i === attempts) throw e;
                        await sleep(d);
                        d = Math.min(5000, Math.round(d * 1.6))
                    }
                }
            }
            async function loadMosaic(centerX, centerY, n) {
                abortLoad = false;
                const delaySec = Math.max(0.2, Math.min(5, parseFloat(delay.value) || 0.5));
                const startX = centerX - Math.floor(n / 2),
                    startY = centerY - Math.floor(n / 2);
                let success = 0,
                    fail = 0,
                    total = n * n;
                stProg.textContent = `Progress: 0/${total} (fail 0)`;
                mosaic = null;
                mctx = null;
                tileW = 0;
                tileH = 0;
                iw = 0;
                ih = 0;
                draw();
                for (let r = 0; r < n; r++) {
                    for (let c = 0; c < n; c++) {
                        if (abortLoad) return;
                        const tx = startX + c,
                            ty = startY + r;
                        const url = buildTileURL(tx, ty);
                        try {
                            const im = await fetchTileWithRetry(url, 3, delaySec * 1000);
                            if (!tileW) {
                                tileW = im.naturalWidth;
                                tileH = im.naturalHeight;
                                iw = tileW * n;
                                ih = tileH * n;
                                mosaic = document.createElement("canvas");
                                mosaic.width = iw;
                                mosaic.height = ih;
                                mctx = mosaic.getContext("2d");
                                mctx.imageSmoothingEnabled = false;
                                stSrc.textContent = `Source: ${iw} × ${ih}`;
                                stTile.textContent = `Tile: ${tileW} × ${tileH}`;
                                fit(true)
                            }
                            mctx.drawImage(im, c * tileW, r * tileH);
                            URL.revokeObjectURL(im.src);
                            success++;
                        } catch (e) {
                            fail++;
                            if (mctx && tileW && tileH) {
                                mctx.fillStyle = "rgba(255,255,255,0.06)";
                                mctx.fillRect(c * tileW, r * tileH, tileW, tileH);
                                mctx.strokeStyle = "rgba(255,255,255,0.12)";
                                mctx.strokeRect(c * tileW + 0.5, r * tileH + 0.5, tileW - 1, tileH - 1);
                            }
                        }
                        stProg.textContent = `Progress: ${success+fail}/${total} (fail ${fail})`;
                        draw();
                        await sleep(delaySec * 1000);
                    }
                }
            }

            delay.addEventListener("input", () => {
                delayVal.textContent = `${parseFloat(delay.value).toFixed(1)}s`
            });
            [btn2, btn3, btn4, btn5, btn10].forEach(b => {
                b.addEventListener("click", async () => {
                    const cx = Math.max(0, Math.round(+inX.value || 0));
                    const cy = Math.max(0, Math.round(+inY.value || 0));
                    nSize = parseInt(b.dataset.n, 10);
                    await loadMosaic(cx, cy, nSize);
                })
            });

            btnSave.addEventListener("click", async () => {
                if (!mosaic || selBox.w <= 0 || selBox.h <= 0) {
                    alert("Нет выделения или изображение не загружено");
                    return
                }
                const out = document.createElement("canvas");
                out.width = selBox.w;
                out.height = selBox.h;
                const octx = out.getContext("2d");
                octx.imageSmoothingEnabled = false;
                octx.drawImage(mosaic, selBox.x, selBox.y, selBox.w, selBox.h, 0, 0, out.width, out.height);
                const blob = await new Promise(res => out.toBlob(b => res(b), "image/png", 1));
                if (blob) downloadBlob(blob, `art_${selBox.w}x${selBox.h}.png`);
            });

            const close = () => {
                abortLoad = true;
                try {
                    roPrev.disconnect()
                } catch (e) {};
                try {
                    back.remove()
                } catch (e) {};
                resolve({
                    action: "cancel"
                })
            };
            btnCancel.addEventListener("click", close);
            btnCloseX.addEventListener("click", close);

            fit(true);
        });
    }

    async function openPixelArtDialog(file) {
        return new Promise(async (resolve) => {
            const fileURL = URL.createObjectURL(file);
            let bitmap = null,
                imEl = null,
                ow = 0,
                oh = 0;
            async function loadDims() {
                try {
                    bitmap = await createImageBitmap(file);
                    ow = bitmap.width;
                    oh = bitmap.height;
                } catch (e) {
                    try {
                        imEl = await createImageElementFromURL(fileURL);
                        ow = imEl.naturalWidth;
                        oh = imEl.naturalHeight;
                    } catch (err) {}
                }
            }
            await loadDims();
            if (!ow || !oh) {
                try {
                    URL.revokeObjectURL(fileURL)
                } catch (e) {}
                return resolve({
                    action: "cancel"
                });
            }
            const back = el("div", "pixel-backdrop");
            const modal = el("div", "pixel-modal");
            const head = el("div", "pixel-head");
            const t = el("div", "pixel-title", "Пикселизация");
            const fname = el("div", "pixel-filename", file.name || "image");
            const btnX = el("button", "btn icon", "✕");
            btnX.title = "Закрыть";
            head.append(t, fname, btnX);

            const body = el("div", "pixel-body");
            const controls = el("div", "pixel-controls");

            const rowScale = el("div", "pixel-row");
            const lblScale = el("label", null, "Image Scaling Method");
            const method = document.createElement("select");
            method.className = "pixel-select";
            method.innerHTML = `
      <option value="nearest">Nearest Neighbor</option>
      <option value="bilinear">Bilinear</option>
      <option value="lanczos">Lanczos (High Quality)</option>
    `;
            rowScale.append(lblScale, method);

            const rowPx = el("div", "pixel-row");
            const lblPx = el("label", null, "Pixel Size");
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "1";
            slider.max = String(Math.min(128, Math.ceil(Math.min(ow, oh) / 2)));
            slider.value = "14";
            slider.className = "pixel-slider";
            const pxVal = el("span", "value", "14");
            rowPx.append(lblPx, slider, pxVal);

            const rowQuant = el("div", "pixel-row");
            const lblQuant = el("label", null, "Palette");
            const quant = document.createElement("select");
            quant.className = "pixel-select";
            quant.innerHTML = `
      <option value="full">Full (all colors)</option>
      <option value="free">Free only</option>
      <option value="custom">Custom</option>
      <option value="owned">Owned (detected)</option>
    `;
            rowQuant.append(lblQuant, quant);

            const rowSpace = el("div", "pixel-row");
            const lblSpace = el("label", null, "Distance");
            const space = document.createElement("select");
            space.className = "pixel-select";
            space.innerHTML = `<option value="srgb">sRGB</option><option value="oklab">OKLab (perceptual)</option>`;
            rowSpace.append(lblSpace, space);

            const rowDith = el("div", "pixel-row");
            const lblDith = el("label", null, "Dithering");
            const dith = document.createElement("select");
            dith.className = "pixel-select";
            dith.innerHTML = `
      <option value="none">None</option>
      <option value="ordered4">Ordered (Bayer 4×4)</option>
      <option value="ordered8">Ordered (Bayer 8×8)</option>
      <option value="fs">Floyd–Steinberg</option>
      <option value="atkinson">Atkinson</option>
    `;
            rowDith.append(lblDith, dith);

            const rowDithStr = el("div", "pixel-row");
            const lblDithStr = el("label", null, "Dither Strength");
            const dithStr = document.createElement("input");
            dithStr.type = "range";
            dithStr.min = "0";
            dithStr.max = "100";
            dithStr.value = "70";
            dithStr.className = "pixel-slider";
            const dithVal = el("span", "value", "70");
            rowDithStr.append(lblDithStr, dithStr, dithVal);

            const customPanel = el("div", "custom-panel hidden");
            const actions = el("div", "custom-actions");
            const btnClear = el("button", "btn", "🧹 Очистить");
            const btnAddFree = el("button", "btn", "🆓 Добавить бесплатные");
            const btnSelectAll = el("button", "btn", "🟦 Выбрать все");
            const btnImportOwned = el("button", "btn", "🔓 Импорт имеющиеся");
            const selInfo = el("div", "note", "Выбрано: 0");
            actions.append(btnClear, btnAddFree, btnSelectAll, btnImportOwned, selInfo);
            const legend = el("div", "custom-legend");
            const lockIcon = el("span", "icon");
            lockIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"></path></svg>';
            legend.append(lockIcon, el("span", null, "— платный цвет"));
            const grid = el("div", "color-grid");
            customPanel.append(actions, legend, grid);

            const stats = el("div", "pixel-stats");
            const stH = el("div", null, "Horizontal: —");
            const s1 = el("div", null, "|");
            s1.style.opacity = ".6";
            s1.style.margin = "0 6px";
            const stV = el("div", null, "Vertical: —");
            const s2 = el("div", null, "|");
            s2.style.opacity = ".6";
            s2.style.margin = "0 6px";
            const stT = el("div", null, "Total: —");
            const s3 = el("div", null, "|");
            s3.style.opacity = ".6";
            s3.style.margin = "0 6px";
            const stExport = el("div", null, "Export: — × —");
            const s4 = el("div", null, "|");
            s4.style.opacity = ".6";
            s4.style.margin = "0 6px";
            const stC = el("div", null, "Colors used: —");
            stats.append(stH, s1, stV, s2, stT, s3, stExport, s4, stC);

            controls.append(rowScale, rowPx, rowQuant, rowSpace, rowDith, rowDithStr, customPanel, stats);

            const preview = el("div", "pixel-preview");
            const canvas = document.createElement("canvas");
            canvas.className = "pixel-canvas";
            const ctx = canvas.getContext("2d", {
                alpha: true
            });
            preview.append(canvas);

            body.append(controls, preview);

            const foot = el("div", "pixel-foot");
            const zoomLbl = el("div", "pixel-zoom", "Zoom: 1×");
            const spacer = el("div", "spacer");
            const btnSave = el("button", "btn", "💾 Сохранить как файл");
            const btnApply = el("button", "btn primary", "✅ Применить");
            const btnSkip = el("button", "btn", "↩ Продолжить без изменений");
            const btnCancel = el("button", "btn danger", "Отмена");
            foot.append(zoomLbl, spacer, btnSave, btnApply, btnSkip, btnCancel);

            modal.append(head, body, foot);
            back.append(modal);
            shadow.append(back);

            const small = document.createElement("canvas");
            const sctx = small.getContext("2d", {
                willReadFrequently: true
            });

            let pixelSize = Math.max(1, Math.min(parseInt(slider.max, 10) || 14, 14));
            slider.value = String(pixelSize);
            pxVal.textContent = String(pixelSize);
            let dwnW = 0,
                dwnH = 0;

            let selectedCustom = new Set();
            let customInit = false;

            function updateSelInfo() {
                selInfo.textContent = "Выбрано: " + selectedCustom.size
            }

            function renderColorGrid() {
                grid.innerHTML = "";
                MASTER_COLORS.forEach((c, idx) => {
                    const btn = document.createElement("button");
                    btn.className = "color-btn";
                    const [r, g, b] = c.rgb;
                    btn.style.background = `rgb(${r}, ${g}, ${b})`;
                    btn.setAttribute("aria-label", c.name);
                    btn.title = c.name + (c.paid ? " (платный)" : "");
                    if (selectedCustom.has(idx)) btn.classList.add("selected");
                    const tip = el("div", "tip", c.name);
                    btn.append(tip);
                    if (c.paid) {
                        const lock = document.createElement("span");
                        lock.className = "lock";
                        lock.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"></path></svg>';
                        btn.append(lock);
                    }
                    btn.addEventListener("click", () => {
                        if (selectedCustom.has(idx)) selectedCustom.delete(idx);
                        else selectedCustom.add(idx);
                        btn.classList.toggle("selected");
                        updateSelInfo();
                        fullRecalc();
                    });
                    grid.append(btn);
                });
                updateSelInfo();
            }

            function selectFree() {
                selectedCustom.clear();
                MASTER_COLORS.forEach((c, idx) => {
                    if (!c.paid) selectedCustom.add(idx)
                });
                updateSelInfo();
                renderColorGrid();
            }

            function selectAllColors() {
                selectedCustom.clear();
                MASTER_COLORS.forEach((c, idx) => selectedCustom.add(idx));
                updateSelInfo();
                renderColorGrid();
            }

            function clearCustom() {
                selectedCustom.clear();
                updateSelInfo();
                renderColorGrid();
            }

            function importOwnedToCustom() {
                const owned = null;
                selectedCustom.clear();
                MASTER_COLORS.forEach((c, idx) => {
                    if (!c.paid) selectedCustom.add(idx)
                });
                updateSelInfo();
                renderColorGrid();
            }

            const btnClearRef = btnClear,
                btnAddFreeRef = btnAddFree,
                btnSelectAllRef = btnSelectAll,
                btnImportOwnedRef = btnImportOwned;
            btnAddFreeRef.addEventListener("click", () => {
                selectFree();
                fullRecalc()
            });
            btnClearRef.addEventListener("click", () => {
                clearCustom();
                fullRecalc()
            });
            btnSelectAllRef.addEventListener("click", () => {
                selectAllColors();
                fullRecalc()
            });
            btnImportOwnedRef.addEventListener("click", () => {
                importOwnedToCustom();
                quant.value = "custom";
                applyUIState();
                fullRecalc()
            });

            function applyUIState() {
                const isCustom = quant.value === "custom";
                customPanel.classList.toggle("hidden", !isCustom);
                dithStr.disabled = dith.value === "none";
                if (isCustom && !customInit) {
                    selectFree();
                    renderColorGrid();
                    customInit = true
                }
            }

            function resizeSmall() {
                dwnW = Math.max(1, Math.round(ow / pixelSize));
                dwnH = Math.max(1, Math.round(oh / pixelSize));
                small.width = dwnW;
                small.height = dwnH;
                const m = method.value;
                const smooth = (m !== "nearest");
                const quality = (m === "lanczos") ? "high" : (m === "bilinear") ? "medium" : "low";
                sctx.imageSmoothingEnabled = smooth;
                sctx.imageSmoothingQuality = quality;
                sctx.clearRect(0, 0, dwnW, dwnH);
                if (bitmap) {
                    sctx.drawImage(bitmap, 0, 0, ow, oh, 0, 0, dwnW, dwnH)
                } else {
                    sctx.drawImage(imEl, 0, 0, ow, oh, 0, 0, dwnW, dwnH)
                }
                stH.textContent = "Horizontal: " + dwnW;
                stV.textContent = "Vertical: " + dwnH;
                stT.textContent = "Total: " + (dwnW * dwnH).toLocaleString("ru-RU");
                stExport.textContent = `Export: ${dwnW} × ${dwnH}`;
            }

            function getPaletteForMode() {
                if (quant.value === "full") {
                    return MASTER_COLORS.map(c => c.rgb);
                } else if (quant.value === "free") {
                    return MASTER_COLORS.filter(c => !c.paid).map(c => c.rgb);
                } else if (quant.value === "custom") {
                    const arr = [];
                    selectedCustom.forEach(idx => {
                        const c = MASTER_COLORS[idx];
                        if (c) arr.push(c.rgb)
                    });
                    return arr;
                } else if (quant.value === "owned") {
                    return MASTER_COLORS.filter(c => !c.paid).map(c => c.rgb);
                }
                return MASTER_COLORS.map(c => c.rgb)
            }

            function processQuantAndDither() {
                const pal = getPaletteForMode();
                if (!pal || pal.length === 0) {
                    stC.textContent = "Colors used: 0/0";
                    return
                }
                const {
                    used,
                    total
                } = quantizeAndDitherSmall(sctx, dwnW, dwnH, {
                    palette: pal,
                    distanceSpace: space.value,
                    dither: dith.value,
                    ditherStrength: (Math.max(0, Math.min(100, Number(dithStr.value) || 70))) / 100
                });
                stC.textContent = `Colors used: ${used}/${total}`;
            }

            let zoom2 = 1,
                minZoom2 = 1,
                maxZoom2 = 40,
                offX2 = 0,
                offY2 = 0;

            function fitAndRender() {
                const rect = preview.getBoundingClientRect();
                const vw = Math.max(100, Math.floor(rect.width));
                const vh = Math.max(100, Math.floor(rect.height));
                canvas.width = vw;
                canvas.height = vh;
                const fit = Math.max(1, Math.floor(Math.min(vw / dwnW, vh / dwnH)));
                if (zoom2 < fit) zoom2 = fit;
                minZoom2 = fit;
                render();
            }

            function render() {
                const vw = canvas.width,
                    vh = canvas.height;
                ctx.clearRect(0, 0, vw, vh);
                const drawW = dwnW * zoom2,
                    drawH = dwnH * zoom2;
                const cx = (vw - drawW) / 2 + offX2,
                    cy = (vh - drawH) / 2 + offY2;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(small, 0, 0, dwnW, dwnH, Math.round(cx), Math.round(cy), Math.round(drawW), Math.round(drawH));
                zoomLbl.textContent = `Zoom: ${zoom2}×`;
            }
            const roPrev = new ResizeObserver(() => fitAndRender());
            roPrev.observe(preview);

            let dragging2 = false,
                sx2 = 0,
                sy2 = 0,
                sox2 = 0,
                soy2 = 0;
            preview.addEventListener("pointerdown", (e) => {
                dragging2 = true;
                preview.setPointerCapture?.(e.pointerId);
                sx2 = e.clientX;
                sy2 = e.clientY;
                sox2 = offX2;
                soy2 = offY2;
            });
            preview.addEventListener("pointermove", (e) => {
                if (!dragging2) return;
                offX2 = sox2 + (e.clientX - sx2);
                offY2 = soy2 + (e.clientY - sy2);
                render();
            });
            preview.addEventListener("pointerup", () => {
                dragging2 = false
            });
            preview.addEventListener("wheel", (e) => {
                e.preventDefault();
                const dir = e.deltaY > 0 ? -1 : 1;
                const nz = clamp(zoom2 + dir, minZoom2, maxZoom2);
                if (nz !== zoom2) {
                    const rect = preview.getBoundingClientRect();
                    const mx = e.clientX - rect.left,
                        my = e.clientY - rect.top;
                    const k = nz / zoom2;
                    offX2 = (offX2 - mx) * k + mx;
                    offY2 = (offY2 - my) * k + my;
                    zoom2 = nz;
                    render();
                }
            }, {
                passive: false
            });
            preview.addEventListener("dblclick", () => {
                offX2 = 0;
                offY2 = 0;
                zoom2 = minZoom2;
                render()
            });

            function fullRecalc() {
                resizeSmall();
                processQuantAndDither();
                fitAndRender();
            }

            quant.value = "full";
            applyUIState();
            slider.addEventListener("input", () => {
                pixelSize = Math.max(1, Math.round(Number(slider.value) || 1));
                slider.value = String(pixelSize);
                pxVal.textContent = String(pixelSize);
                fullRecalc()
            });
            method.addEventListener("change", () => fullRecalc());
            quant.addEventListener("change", () => {
                applyUIState();
                fullRecalc()
            });
            space.addEventListener("change", () => fullRecalc());
            dith.addEventListener("change", () => {
                dithStr.disabled = (dith.value === "none");
                fullRecalc()
            });
            dithStr.addEventListener("input", () => {
                dithVal.textContent = dithStr.value;
                fullRecalc()
            });

            async function buildPixelatedBlob() {
                return new Promise(res => small.toBlob(b => res(b), "image/png", 1))
            }

            btnSave.addEventListener("click", async () => {
                const blob = await buildPixelatedBlob();
                if (blob) downloadBlob(blob, (file.name || "image").replace(/\.(\w+)$/, "") + `_grid${dwnW}x${dwnH}.png`);
            });
            btnApply.addEventListener("click", async () => {
                const blob = await buildPixelatedBlob();
                if (blob) {
                    const u = URL.createObjectURL(blob);
                    try {
                        setImageURL(u, (file.name || "image").replace(/\.(\w+)$/, "") + `_grid${dwnW}x${dwnH}.png`)
                    } finally {
                        try {
                            URL.revokeObjectURL(fileURL)
                        } catch (e) {}
                    }
                }
                cleanup();
                resolve({
                    action: "apply"
                });
            });
            btnSkip.addEventListener("click", () => {
                setImageURL(fileURL, file.name || "image");
                cleanup(false);
                resolve({
                    action: "skip"
                });
            });

            const close = () => {
                cleanup();
                resolve({
                    action: "cancel"
                })
            };
            btnCancel.addEventListener("click", close);
            btnX.addEventListener("click", close);

            function cleanup(revoke = true) {
                try {
                    roPrev.disconnect()
                } catch (e) {}
                try {
                    back.remove()
                } catch (e) {}
                try {
                    if (bitmap?.close) bitmap.close()
                } catch (e) {}
                if (revoke) {
                    try {
                        URL.revokeObjectURL(fileURL)
                    } catch (e) {}
                }
            }
            fullRecalc();
        });
    }
    applyOpacity();
    updateOpLabel();
    syncUI();
    updatePassThrough();
    makeHScroll(toolbar, toolbarScroll, fadeL, fadeR);
    makeHScroll(sideHead, sideScroll, sfadeL, sfadeR);
    dragGrip.addEventListener("pointerdown", startDrag);
    dragGrip.addEventListener("pointermove", moveDrag);
    dragGrip.addEventListener("pointerup", endDrag);
    toolbar.addEventListener("pointerdown", (e) => {
        if (!e.target.closest("input, button, label, .kbd, select, textarea, .toolbar-scroll")) startDrag(e)
    });
    toolbar.addEventListener("pointermove", moveDrag);
    toolbar.addEventListener("pointerup", endDrag);
    overlay.addEventListener("pointermove", (e) => {
        updateBrushCursorAt(e.clientX, e.clientY);
        if (state.isBrushing) brushPaintAt(e.clientX, e.clientY)
    });
    overlay.addEventListener("pointerdown", (e) => {
        if (e.button === 0 && state.brushMode) {
            e.preventDefault();
            state.isBrushing = true;
            brushPaintAt(e.clientX, e.clientY);
            overlay.setPointerCapture?.(e.pointerId)
        } else if (e.button === 0 && e.shiftKey) {
            startDrag(e)
        }
    });
    overlay.addEventListener("pointerup", () => {
        state.isBrushing = false;
    });
    resizer.addEventListener("pointerdown", onResizeDragDown);
    resizer.addEventListener("pointermove", onResizeDragMove);
    resizer.addEventListener("pointerup", onResizeDragUp);
    inW.addEventListener("change", () => applySizeFromInputs("w"));
    inH.addEventListener("change", () => applySizeFromInputs("h"));
    btnLock.addEventListener("click", () => {
        lockAspect = !lockAspect;
        btnLock.textContent = lockAspect ? "🔒" : "🔓";
        btnLock.title = "Сохранять пропорции (вкл/выкл)";
        applySizeFromInputs("w")
    });
    btnOpen.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        fileInput.value = "";
        if (f) await openPixelArtDialog(f)
    });
    toolbar.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy"
    });
    toolbar.addEventListener("drop", async (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && f.type.startsWith("image/")) await openPixelArtDialog(f)
    });
    overlay.addEventListener("dragover", (e) => {
        if (state.passThrough) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy"
    });
    overlay.addEventListener("drop", async (e) => {
        if (state.passThrough) return;
        e.preventDefault();
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && f.type.startsWith("image/")) await openPixelArtDialog(f)
    });
    btnCopyArt.addEventListener("click", async () => {
        await openTileCropDialog()
    });
    img.addEventListener("load", async () => {
        dropHint.style.display = "none";
        state.iw = img.naturalWidth || 0;
        state.ih = img.naturalHeight || 0;
        if (state.iw && state.ih) {
            state.w = Math.max(1, state.iw);
            state.h = Math.max(1, state.ih);
            state.x = clamp(state.x, 8, Math.max(8, window.innerWidth - state.w - 8));
            state.y = clamp(state.y, 8 + state.barH + state.barGap, Math.max(8 + state.barH + state.barGap, window.innerHeight - state.h - 8));
            snapCheck.checked = true;
            lockAspect = true;
            btnLock.textContent = "🔒";
            syncUI()
        }
        await extractPalette();
        renderPalette()
    });
    passCheck.addEventListener("change", () => {
        state.passThrough = passCheck.checked;
        updatePassThrough()
    });
    transCheck.addEventListener("change", () => {
        state.transparencyOn = transCheck.checked;
        state.opacity = state.transparencyOn ? Number(opacity.value) / 100 : 1;
        opacity.disabled = !state.transparencyOn;
        applyOpacity();
        updateOpLabel()
    });
    opacity.addEventListener("input", () => {
        if (state.transparencyOn) {
            state.opacity = Number(opacity.value) / 100;
            applyOpacity();
            updateOpLabel()
        }
    });
    btnStop.addEventListener("click", () => stopAutoClick());
    btnClose.addEventListener("click", () => api.destroy());
    brushChk.addEventListener("change", () => {
        setBrushMode(brushChk.checked)
    });
    brushSizeInp.addEventListener("change", () => {
        const v = Math.max(1, Math.round(Number(brushSizeInp.value) || 1));
        state.brushSize = v;
        brushSizeInp.value = String(v)
    });
    const ro = new ResizeObserver(() => {
        syncUI()
    });
    ro.observe(overlay);
    const onKey = (e) => {
        const tag = (e.target && e.target.tagName) || "";
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        if (e.key.toLowerCase() === "p") {
            if (!state.brushMode) {
                passCheck.checked = !passCheck.checked;
                passCheck.dispatchEvent(new Event("change"))
            }
        }
        if (e.key === "[") {
            const v = +opacity.value;
            opacity.value = String(Math.max(0, v - 5));
            opacity.dispatchEvent(new Event("input"))
        }
        if (e.key === "]") {
            const v = +opacity.value;
            opacity.value = String(Math.min(100, v + 5));
            opacity.dispatchEvent(new Event("input"))
        }
        if (e.key === "Escape") {
            api.destroy()
        }
    };
    document.addEventListener("keydown", onKey, true);
    api.destroy = () => {
        try {
            document.removeEventListener("keydown", onKey, true)
        } catch (e) {}
        try {
            ro.disconnect()
        } catch (e) {}
        try {
            if (state.currentURL) URL.revokeObjectURL(state.currentURL)
        } catch (e) {}
        try {
            root.remove()
        } catch (e) {}
        delete window.__IMG_OVERLAY_TOOL__
    };
    (() => {
        state.x = clamp(state.x, 8, window.innerWidth - state.w - 8);
        state.y = clamp(state.y, 8 + state.barH + state.barGap, window.innerHeight - state.h - 8);
        syncUI();
        installTileSniffer()
    })();
    makeHScroll(toolbar, toolbarScroll, fadeL, fadeR);
    makeHScroll(sideHead, sideScroll, sfadeL, sfadeR);
})();