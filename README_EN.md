<div align="center">

# Wplace Helper

### Assistant tool for Wplace

Templates over the map, image editor, ability to share artworks, auto-painting, and auxiliary utilities

<a href="https://discord.gg/8WGkrhXKgX">
  <img src="https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Project Discord server" />
</a>

![intro](https://github.com/user-attachments/assets/b301bd8a-568f-4dfa-842d-18f4530d2401)

</div>

---

## Installation

1) Install the Tampermonkey extension.  
2) Install the script from the release: open `overlay.user.js` from the latest release — the manager will offer to install it automatically.  
You can also use the button below  

[![Install script](https://img.shields.io/badge/Script-Install-brightgreen?style=for-the-badge&logo=javascript)](https://github.com/MidTano/wplace_helper/releases/latest/download/overlay.user.js)

if you have installation issues, check the instructions from [bluemarble](https://github.com/SwingTheVine/Wplace-BlueMarble?tab=readme-ov-file#installation-instructions) (I’m too lazy to write my own)


---

 ## Quick start
 1) Open the Wplace website.  
 2) A `Wplace Helper` panel will appear at the top.  
 3) Click “Choose image”, select a file — the editor will open.  
 4) Click “Apply”, then enable “Move” mode to place the template and start working.

 ### Video Instruction
 Coming soon...

  ---

 ## Auto-fill

Allows you to set all pixels on your template in one click, you can choose colors and installation mode (random or top-to-bottom)


https://github.com/user-attachments/assets/02dbf54d-b364-47ad-850e-bed0d3a4a3d3


 
 ---

 ## Image editor

 Features:
 - Pixelization and resampling
 - Dithering
 - Palette: full Wplace set, “free only”, or “custom”.  
 - Tools: brush, eraser, selection, “magic brush”, gradient.
 - Post-processing: outline enhancement, edge reduction.
 - Code/QR generation and result saving.

https://github.com/user-attachments/assets/c657524d-906d-4489-b20f-30117f0dd6ce


 ---
 
 ## Comparison mode

In this mode you can conveniently compare the difference between different dithering modes and other parameters


https://github.com/user-attachments/assets/acb5c710-c359-4060-a539-664343f2f950


 
 ---

 
 ## Enhanced colors mode

In this mode you can quickly and easily find unpainted pixels in your template


https://github.com/user-attachments/assets/4669a7e9-3c8b-483b-9c25-73b851c2be58


 
 ---

 ## Artwork assembly

Assembles an image from tiles from the Wplace map, supports:
 - Detecting center and scale of tiles.
 - Auto-selecting non-empty area / QR recognition.
 - Export to file and sending to editor.



https://github.com/user-attachments/assets/bf8f70e6-5cab-4b9e-a3f8-d68db9eb2220




 ---

 ## QR

The system allows quickly helping other users by scanning special codes



https://github.com/user-attachments/assets/eaa5929e-1532-473f-ac4f-ba2ff1197709



 ---

 ## ALT+C\V

The system allows quickly helping other users via special messages. Also convenient for transferring data from one browser to another.  
The artwork itself is transferred, along with the place where it is set, position, and camera zoom.



https://github.com/user-attachments/assets/e5082686-f096-405b-a8c6-bd5cebcb5fbd




 ---

 

 ## Build and development

Clone the repository, unpack it and run the commands

 Commands:
 ```bash
 npm install
 npm run build
