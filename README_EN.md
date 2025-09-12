<div align="center">

# Wplace Helper

### A helper tool for Wplace

Template overlays on the map, image editor, art sharing, auto-paint, and helper utilities

![intro](https://github.com/user-attachments/assets/b301bd8a-568f-4dfa-842d-18f4530d2401)

</div>

---

## Installation

1) Install the Tampermonkey extension.  
2) Install the script from the release: open `overlay.user.js` from the latest release — the manager will prompt you to install it.  
You can also use the button below

[![Install the script](https://img.shields.io/badge/Script-Install-brightgreen?style=for-the-badge&logo=javascript)](https://github.com/MidTano/wplace_helper/releases/latest/download/overlay.user.js)

---

## Quick Start
1) Open the Wplace website.  
2) A Wplace Helper toolbar will appear at the top.  
3) Click "Choose Image", select a file — the editor will open.  
4) Click "Apply", then enable the "Move" mode to position the template and start working.

### Video Guide
Coming soon...

---

## Image Editor

Features:
- Pixelation and resampling
- Dithering
- Palette: full Wplace set, "free only", or "custom"
- Tools: brush, eraser, selection, "magic brush", gradient
- Post-processing: outline enhancement, edge shrink
- Code/QR generation and saving the result

https://github.com/user-attachments/assets/8f14afd8-c988-4991-8ff1-a7ac72b3ab7e

---

## Copy Art

Reconstructs an image from Wplace map tiles; supports:
- Determining tile center and scale
- Auto-select of non-empty area / QR recognition
- Export to file and sending to the editor

![copyart](https://github.com/user-attachments/assets/33e119cd-cf97-4c4e-bdf2-5b47414ae7a1)

---

 ## QR

The system allows you to quickly help other users by scanning special codes.



https://github.com/user-attachments/assets/eaa5929e-1532-473f-ac4f-ba2ff1197709



 ---

## Build and Development

Clone the repository, unpack it, and run the commands

Commands:
```bash
npm install
npm run build 
```
