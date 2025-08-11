<p align="right">
  🌐
  <a href="README_RU.md">🇷🇺 Русский</a> &nbsp;|&nbsp;
  <a href="README_EN.md">🇬🇧 English</a> &nbsp;|&nbsp;
  <a href="README_ZH.md">🇨🇳 中文</a> &nbsp;|&nbsp;
  <a href="README_DE.md">🇩🇪 Deutsch</a> &nbsp;|&nbsp;
  <a href="README_FR.md">🇫🇷 Français</a> &nbsp;|&nbsp;
  <a href="README_ES.md">🇪🇸 Español</a>
</p>

<h1 align="center">🎨 WPlace Overlay Art Helper</h1>
<p align="center"><em>Overlay tool for image overlay/pixelation and fast tile-based art copying</em></p>
<p align="center">
  <img src="https://img.shields.io/github/stars/MidTano/wplace_helper?style=for-the-badge" alt="GitHub stars">
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=YOUR_VIDEO_ID" target="_blank">
    <img width="80%" alt="Watch demo on YouTube" src="https://github.com/user-attachments/assets/af0a1714-8a89-4374-851f-8bdacbba1129" />
  </a>
</p>

<p align="center">
✅ Works right in the browser &nbsp;|&nbsp; 
✅ <span style="color:orange">No installation required</span> &nbsp;|&nbsp; 
✅ Pixelation and autoclick support
</p>

## Quick Start
- Open wplace.live  
- Open DevTools → Console  
- Paste and run:
```js
(async () => {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  const code = await (await fetch(url, { cache: 'no-store' })).text();
  new Function(code)();
})();
```

If the site blocks eval/new Function, use one of the methods below.

## Bookmarklet (optional)
Create a bookmark with this URL:
```
javascript:(async()=>{const u='https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';const c=await (await fetch(u,{cache:'no-store'})).text();new Function(c)();})()
```
Click the bookmark — the tool will load on the current page. May not work on sites with strict CSP.

## Userscript (Tampermonkey)
Reliable on sites with CSP (avoids eval inside the page):
```js
// ==UserScript==
// @name         WPlace Overlay Helper Loader
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==
(function() {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  GM_xmlhttpRequest({
    method: 'GET',
    url,
    onload: r => { new Function(r.responseText)(); }
  });
})();
```

## Hotkeys
- <code>P</code> — toggle Pass-through clicks (disabled in Brush mode)  
- <code>[</code> / <code>]</code> — decrease/increase overlay opacity by 5%  
- <code>Esc</code> — close the tool

## Overlay and Basic Controls
- Move: drag the “⠿” handle or the toolbar header (also works with <code>Shift</code> + <code>LMB</code> on the window)  
- Resize: drag the bottom-right corner  
- <code>W</code> / <code>H</code> — set window size numerically  
- 🔒 — lock aspect ratio  
- Multiples — discrete scale steps (relative to the original size)  
- Opacity — overlay transparency  
- Pass-through — let mouse clicks pass through the window  
- 📁 Open — load an image (or drag & drop onto the toolbar/window). File name is shown on the right

## Palette / Autoclick / Brush
- After loading an image, a color palette appears on the right  
- Click a color — autoclick all pixels of that color on the page:
  - Delay (ms) — interval between clicks
- Brush:
  - Enable “Brush” and pick a color in the palette
  - Size — square brush side in image pixels
  - Hover shows the brush cursor; <code>LMB</code> — clicks pixels of the selected color within the brush area
- Notes:
  - The tool clicks only pixels of the selected color
  - Brush progress for a color resets when you reselect that color

## Pixelation
<img width="1233" height="809" alt="{A1F8D140-A3DB-487F-B6F2-862115710D82}" src="https://github.com/user-attachments/assets/f9767323-6c85-4cf9-ab3e-cee6361e1550" />

Open an image via 📁 Open (or drag & drop) — the “Pixelation” dialog will appear.

- Image Scaling Method: Nearest / Bilinear / Lanczos  
- Pixel Size — pixel-art grid step  
- Palette:
  - Full — all available colors
  - Free only — only free colors
  - Custom — manual selection (grid shows locks on paid colors)
  - Owned — same as Free (no integration with third-party sites)
- Dithering: None / Ordered 4×4 / Ordered 8×8 / Floyd–Steinberg / Atkinson  
- Distance: sRGB / OKLab  
- Stats: Horizontal × Vertical (pixel grid size), Total, Colors used  
- Preview: zoom, panning  
- Save as file — export PNG of the pixel grid (without multiplying by Pixel Size)  
- Apply — insert the result into the overlay  
- Continue without changes — use the original image  
- Cancel — close the dialog

## Copy Art
<img width="1221" height="797" alt="{FB6080A1-4192-4290-9C5B-A5F2F247ABB3}" src="https://github.com/user-attachments/assets/11f25a54-3b86-4b1d-b77a-f44a2aa029de" />

Tool for assembling tiles and cropping an area.

- Enter <code>X</code> and <code>Y</code> — coordinates of the tile center  
- Grid size: 2×2, 3×3, 4×4, 5×5, 10×10  
- Delay (s) — interval between requests (0.2–5.0)  
- Selection: hold <code>LMB</code> — drag — release (selection rectangle)  
- Save PNG — saves the selected area as .png  
- “🎯 Center” — reset to Zoom 1 and center  
- Note: this tool does not copy to the overlay — it only saves PNG

## Tips
- If many tiles fail to load: increase the delay; the server may rate-limit requests  
- Large mosaics take more time to assemble

## Removal
- <code>Esc</code> or the “✕ Close” button in the toolbar  
- Relaunching the script replaces the current instance