<p align="right">
  🌐
  <a href="README.md">🇷🇺 Русский</a> &nbsp;|&nbsp;
  <a href="README_EN.md">🇬🇧 English</a> &nbsp;|&nbsp;
  <a href="README_ZH.md">🇨🇳 中文</a> &nbsp;|&nbsp;
  <a href="README_DE.md">🇩🇪 Deutsch</a> &nbsp;|&nbsp;
  <a href="README_FR.md">🇫🇷 Français</a> &nbsp;|&nbsp;
  <a href="README_ES.md">🇪🇸 Español</a>
</p>

<h1 align="center">🎨 WPlace Overlay Art Helper</h1>
<p align="center"><em>Outil en superposition pour la surimpression/pixélisation d’images et la copie rapide d’œuvres par tuiles</em></p>
<p align="center">
  <img src="https://img.shields.io/github/stars/MidTano/wplace_helper?style=for-the-badge" alt="GitHub stars">
</p>

<p align="center">
  <img width="80%" alt="demo"src="https://github.com/user-attachments/assets/af0a1714-8a89-4374-851f-8bdacbba1129" />
</p>

<p align="center">
✅ Fonctionne directement dans le navigateur &nbsp;|&nbsp; 
✅ <span style="color:orange">Aucune installation requise</span> &nbsp;|&nbsp; 
✅ Prise en charge de la pixélisation et de l’autoclic
</p>

## Démarrage rapide
- Ouvrez wplace.live  
- Ouvrez DevTools → Console  
- Collez et exécutez :
```js
(async () => {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  const code = await (await fetch(url, { cache: 'no-store' })).text();
  new Function(code)();
})();
```

Si le site bloque eval/new Function, utilisez l’une des méthodes ci‑dessous.

## Bookmarklet (optionnel)
Créez un signet avec cette URL :
```
javascript:(async()=>{const u='https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';const c=await (await fetch(u,{cache:'no-store'})).text();new Function(c)();})()
```
Cliquez sur le signet — l’outil se charge sur la page courante. Peut ne pas fonctionner sur les sites avec une CSP stricte.

## Userscript (Tampermonkey)
Fiable sur les sites avec CSP (évite <code>eval</code> dans la page) :
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

## Raccourcis clavier
- <code>P</code> — activer/désactiver les clics « traversants » (Pass‑through), désactivé en mode Pinceau  
- <code>[</code> / <code>]</code> — diminuer/augmenter l’opacité de 5%  
- <code>Esc</code> — fermer l’outil

## Superposition et contrôles de base
- Déplacement : faites glisser la poignée “⠿” ou l’en‑tête de la barre d’outils (fonctionne aussi avec <code>Shift</code> + <code>clic gauche</code> sur la fenêtre)  
- Redimensionnement : faites glisser le coin inférieur droit  
- <code>W</code> / <code>H</code> — définir numériquement la taille de la fenêtre  
- 🔒 — verrouiller le rapport d’aspect  
- Multiples — échelles par multiples de la taille d’origine  
- Opacité — transparence de la superposition  
- Traversant — laisser les clics souris passer à travers la fenêtre  
- 📁 Ouvrir — charger une image (ou glisser‑déposer sur la barre d’outils/fenêtre). Le nom du fichier s’affiche à droite

## Palette / Autoclic / Pinceau
- Après le chargement d’une image, une palette de couleurs apparaît à droite  
- Clic sur une couleur — autoclic de tous les pixels de cette couleur sur la page :
  - Délai (ms) — intervalle entre les clics
- Pinceau :
  - Activez « Pinceau » et choisissez une couleur dans la palette  
  - Taille — côté du pinceau carré en pixels de l’image  
  - Le survol affiche le curseur du pinceau ; <code>clic gauche</code> — clique les pixels de la couleur choisie dans la zone du pinceau
- Remarques :
  - L’outil clique uniquement les pixels de la couleur sélectionnée  
  - La progression du pinceau pour une couleur est réinitialisée lors d’une nouvelle sélection de cette couleur

## Pixélisation
<img width="1233" height="809" alt="Exemple : Pixélisation" src="https://github.com/user-attachments/assets/f9767323-6c85-4cf9-ab3e-cee6361e1550" />

Ouvrez une image via 📁 Ouvrir (ou glisser‑déposer) — la fenêtre « Pixélisation » s’affiche.

- Image Scaling Method : Nearest / Bilinear / Lanczos  
- Pixel Size — pas de la grille de pixel‑art  
- Palette :
  - Full — toutes les couleurs disponibles
  - Free only — uniquement les gratuites
  - Custom — sélection manuelle (cadenas sur les couleurs payantes)
  - Owned — comme Free (sans intégration à des sites tiers)
- Dithering : None / Ordered 4×4 / Ordered 8×8 / Floyd–Steinberg / Atkinson  
- Distance : sRGB / OKLab  
- Statistiques : Horizontal × Vertical (taille de la grille), Total, Couleurs utilisées  
- Aperçu : zoom, déplacement  
- Enregistrer en fichier — exporte un PNG de la grille (sans multiplication par Pixel Size)  
- Appliquer — insère le résultat dans la superposition  
- Continuer sans modification — utilise l’image d’origine  
- Annuler — fermer la fenêtre

## Copier l’art
<img width="1221" height="797" alt="Exemple : Copier l’art" src="https://github.com/user-attachments/assets/11f25a54-3b86-4b1d-b77a-f44a2aa029de" />

Outil pour assembler des tuiles et découper une zone.

- Saisir <code>X</code> et <code>Y</code> — coordonnées du centre de la tuile  
- Taille de la grille : 2×2, 3×3, 4×4, 5×5, 10×10  
- Délai (s) — intervalle entre les requêtes (0.2–5.0)  
- Sélection : maintenir <code>clic gauche</code> — glisser — relâcher (rectangle de sélection)  
- Enregistrer en PNG — enregistre la zone sélectionnée en .png  
- « 🎯 Centre » — réinitialiser à Zoom 1 et centrer  
- Remarque : cet outil ne copie pas dans la superposition — il enregistre uniquement un PNG

## Astuces
- Si de nombreuses tuiles ne se chargent pas : augmentez le délai ; le serveur peut limiter le débit des requêtes  
- Les grandes mosaïques demandent plus de temps d’assemblage

## Suppression
- <code>Esc</code> ou le bouton « ✕ Fermer » dans la barre d’outils  
- Relancer le script remplace l’instance actuelle