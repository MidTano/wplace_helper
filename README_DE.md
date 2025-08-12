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
<p align="center"><em>Overlay‑Tool zum Überlagern/Pixelisieren von Bildern und zum schnellen, kachelbasierten Kopieren von Artworks</em></p>
<p align="center">
  <img src="https://img.shields.io/github/stars/MidTano/wplace_helper?style=for-the-badge" alt="GitHub stars">
</p>

<p align="center">
  <img width="80%" alt="demo"src="https://github.com/user-attachments/assets/af0a1714-8a89-4374-851f-8bdacbba1129" />
</p>

<p align="center">
✅ Läuft direkt im Browser &nbsp;|&nbsp; 
✅ <span style="color:orange">Keine Installation erforderlich</span> &nbsp;|&nbsp; 
✅ Unterstützung für Pixelisierung und Autoklick
</p>

## Schnellstart
- Öffne wplace.live  
- Öffne DevTools → Console  
- Einfügen und ausführen:
```js
(async () => {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  const code = await (await fetch(url, { cache: 'no-store' })).text();
  new Function(code)();
})();
```

Wenn die Website eval/new Function blockiert, verwende eine der folgenden Methoden.

## Bookmarklet (optional)
Erstelle ein Lesezeichen mit dieser Adresse:
```
javascript:(async()=>{const u='https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';const c=await (await fetch(u,{cache:'no-store'})).text();new Function(c)();})()
```
Klick auf das Lesezeichen — das Tool lädt auf der aktuellen Seite. Funktioniert ggf. nicht auf Seiten mit striktem CSP.

## Userscript (Tampermonkey)
Zuverlässig auf Websites mit CSP (umgeht <code>eval</code> im Seitenkontext):
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

## Tastenkürzel
- <code>P</code> — „Durchklick“-Modus (Pass‑through) ein/aus; im Pinselmodus deaktiviert  
- <code>[</code> / <code>]</code> — Overlay‑Transparenz um 5% verringern/erhöhen  
- <code>Esc</code> — Tool schließen

## Overlay und Grundfunktionen
- Verschieben: am „⠿“-Griff oder an der Toolbar‑Kopfzeile ziehen (funktioniert auch mit <code>Shift</code> + Linksklick auf das Fenster)  
- Größe ändern: unten rechts ziehen  
- <code>W</code> / <code>H</code> — Fenstergröße numerisch setzen  
- 🔒 — Seitenverhältnis sperren  
- Vielfache — Skalierung in ganzzahligen Vielfachen der Originalgröße  
- Opazität — Transparenz des Overlays  
- Durchklick — Maus‑Klicks durch das Fenster hindurchlassen  
- 📁 Öffnen — Bild laden (oder auf Toolbar/Fenster ziehen). Rechts wird der Dateiname angezeigt

## Palette / Autoklick / Pinsel
- Nach dem Laden eines Bildes erscheint rechts die Farbpalette  
- Klick auf eine Farbe — Autoklick aller Pixel dieser Farbe auf der Seite:
  - Verzögerung (ms) — Intervall zwischen Klicks
- Pinsel:
  - „Pinsel“ aktivieren und Farbe in der Palette wählen
  - Größe — Kantenlänge des quadratischen Pinsels (in Bildpixeln)
  - Hover zeigt den Pinselcursor; Linksklick — klickt Pixel der gewählten Farbe im Pinselbereich
- Hinweise:
  - Das Tool klickt nur Pixel der ausgewählten Farbe
  - Pinsel‑Fortschritt pro Farbe wird zurückgesetzt, wenn du die Farbe erneut wählst

## Pixelisierung
<img width="1233" height="809" alt="Beispiel: Pixelisierung" src="https://github.com/user-attachments/assets/f9767323-6c85-4cf9-ab3e-cee6361e1550" />

Bild über 📁 Öffnen laden (oder hineinziehen) — der Dialog „Pixelization“ erscheint.

- Image Scaling Method: Nearest / Bilinear / Lanczos  
- Pixel Size — Schrittweite des Pixel‑Gitters  
- Palette:
  - Full — alle verfügbaren Farben
  - Free only — nur kostenlose
  - Custom — manuelle Auswahl (bezahlte Farben mit Schloss markiert)
  - Owned — wie Free (ohne Integration mit Drittseiten)
- Dithering: None / Ordered 4×4 / Ordered 8×8 / Floyd–Steinberg / Atkinson  
- Distance: sRGB / OKLab  
- Statistik: Horizontal × Vertikal (Größe des Pixel‑Gitters), Total, verwendete Farben  
- Vorschau: Zoom, Verschieben  
- Als Datei speichern — exportiert PNG des Pixel‑Gitters (ohne Hochskalierung um den Pixel‑Size‑Faktor)  
- Anwenden — Ergebnis ins Overlay übernehmen  
- Ohne Änderungen fortfahren — Original verwenden  
- Abbrechen — Dialog schließen

## Artwork kopieren
<img width="1221" height="797" alt="Beispiel: Artwork kopieren" src="https://github.com/user-attachments/assets/11f25a54-3b86-4b1d-b77a-f44a2aa029de" />

Tool zum Zusammenstellen von Kacheln und Zuschneiden eines Bereichs.

- <code>X</code> und <code>Y</code> eingeben — Koordinaten des Kachel‑Zentrums  
- Rastergröße: 2×2, 3×3, 4×4, 5×5, 10×10  
- Verzögerung (s) — Intervall zwischen Anfragen (0.2–5.0)  
- Auswahl: Linksklick halten — ziehen — loslassen (Auswahlrechteck)  
- PNG speichern — speichert den ausgewählten Bereich als .png  
- „🎯 Zentrum“ — Zoom 1 wiederherstellen und zentrieren  
- Hinweis: Dieses Tool kopiert nicht ins Overlay — es speichert nur PNG

## Tipps
- Wenn viele Kacheln nicht laden: Verzögerung erhöhen; der Server könnte die Anfragerate begrenzen  
- Große Mosaike benötigen mehr Zeit zum Zusammenbau

## Entfernen
- <code>Esc</code> oder die Schaltfläche „✕ Schließen“ in der Toolbar  
- Ein Neustart des Skripts ersetzt die aktuelle Instanz