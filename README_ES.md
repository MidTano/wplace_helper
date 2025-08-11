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
<p align="center"><em>Herramienta de superposición para superponer/pixelar imágenes y copiar arte por mosaicos de forma rápida</em></p>
<p align="center">
  <img src="https://img.shields.io/github/stars/MidTano/wplace_helper?style=for-the-badge" alt="GitHub stars">
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=YOUR_VIDEO_ID" target="_blank">
    <img width="80%" alt="Ver demo en YouTube" src="https://github.com/user-attachments/assets/af0a1714-8a89-4374-851f-8bdacbba1129" />
  </a>
</p>

<p align="center">
✅ Funciona directamente en el navegador &nbsp;|&nbsp; 
✅ <span style="color:orange">No requiere instalación</span> &nbsp;|&nbsp; 
✅ Compatibilidad con pixelado y autoclic
</p>

## Inicio rápido
- Abre wplace.live  
- Abre DevTools → Console  
- Pega y ejecuta:
```js
(async () => {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  const code = await (await fetch(url, { cache: 'no-store' })).text();
  new Function(code)();
})();
```

Si el sitio bloquea eval/new Function, usa uno de los métodos siguientes.

## Bookmarklet (opcional)
Crea un marcador con esta URL:
```
javascript:(async()=>{const u='https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';const c=await (await fetch(u,{cache:'no-store'})).text();new Function(c)();})()
```
Haz clic en el marcador: la herramienta se cargará en la página actual. Puede no funcionar en sitios con CSP estricta.

## Userscript (Tampermonkey)
Fiable en sitios con CSP (evita <code>eval</code> en la página):
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

## Atajos de teclado
- <code>P</code> — activar/desactivar clics a través (Pass‑through); desactivado en modo Pincel  
- <code>[</code> / <code>]</code> — disminuir/aumentar la opacidad del overlay en 5%  
- <code>Esc</code> — cerrar la herramienta

## Superposición y controles básicos
- Mover: arrastra el asa “⠿” o el encabezado de la barra de herramientas (también funciona con <code>Shift</code> + <code>clic izquierdo</code> sobre la ventana)  
- Redimensionar: arrastra la esquina inferior derecha  
- <code>W</code> / <code>H</code> — define el tamaño de la ventana numéricamente  
- 🔒 — bloquear relación de aspecto  
- Múltiplos — escalas en múltiplos del tamaño original  
- Opacidad — transparencia del overlay  
- A través — permite que los clics del ratón pasen a través de la ventana  
- 📁 Abrir — cargar una imagen (o arrastrar y soltar en la barra/ventana). A la derecha se muestra el nombre del archivo

## Paleta / Autoclic / Pincel
- Tras cargar una imagen, aparece a la derecha una paleta de colores  
- Clic en un color — autoclic de todos los píxeles de ese color en la página:
  - Retardo (ms) — intervalo entre clics
- Pincel:
  - Activa “Pincel” y elige un color en la paleta
  - Tamaño — lado del pincel cuadrado en píxeles de la imagen
  - Al pasar el cursor se muestra el puntero del pincel; <code>clic izquierdo</code> — hace clic en los píxeles del color elegido dentro del área del pincel
- Notas:
  - La herramienta solo hace clic en píxeles del color seleccionado
  - El progreso del pincel para un color se restablece al volver a seleccionar ese color

## Pixelación
<img width="1233" height="809" alt="Ejemplo: Pixelación" src="https://github.com/user-attachments/assets/f9767323-6c85-4cf9-ab3e-cee6361e1550" />

Abre una imagen con 📁 Abrir (o arrastra y suelta) — aparecerá el diálogo “Pixelation”.

- Image Scaling Method: Nearest / Bilinear / Lanczos  
- Pixel Size — paso de la cuadrícula de pixel‑art  
- Palette:
  - Full — todos los colores disponibles
  - Free only — solo colores gratuitos
  - Custom — selección manual (candados en colores de pago)
  - Owned — como Free (sin integración con sitios de terceros)
- Dithering: None / Ordered 4×4 / Ordered 8×8 / Floyd–Steinberg / Atkinson  
- Distance: sRGB / OKLab  
- Estadísticas: Horizontal × Vertical (tamaño de la cuadrícula), Total, Colores usados  
- Vista previa: zoom, desplazamiento  
- Guardar como archivo — exporta un PNG de la cuadrícula de píxeles (sin multiplicar por Pixel Size)  
- Aplicar — insertar el resultado en la superposición  
- Continuar sin cambios — usar la imagen original  
- Cancelar — cerrar el diálogo

## Copiar arte
<img width="1221" height="797" alt="Ejemplo: Copiar arte" src="https://github.com/user-attachments/assets/11f25a54-3b86-4b1d-b77a-f44a2aa029de" />

Herramienta para ensamblar mosaicos y recortar un área.

- Introduce <code>X</code> y <code>Y</code> — coordenadas del centro del mosaico  
- Tamaño de la cuadrícula: 2×2, 3×3, 4×4, 5×5, 10×10  
- Retardo (s) — intervalo entre solicitudes (0.2–5.0)  
- Selección: mantener <code>clic izquierdo</code> — arrastrar — soltar (rectángulo de selección)  
- Guardar PNG — guarda el área seleccionada como .png  
- “🎯 Centro” — volver a Zoom 1 y centrar  
- Nota: esta herramienta no copia a la superposición — solo guarda PNG

## Consejos
- Si muchas teselas no se cargan: aumenta el retardo; el servidor puede limitar la frecuencia de solicitudes  
- Los mosaicos grandes requieren más tiempo de ensamblaje

## Eliminación
- <code>Esc</code> o el botón “✕ Cerrar” en la barra de herramientas  
- Reiniciar el script reemplaza la instancia actual