
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
<p align="center"><em>Инструмент‑оверлей для наложения/пикселизации изображений и быстрого копирования артов</em></p>
<p align="center">
  <img src="https://img.shields.io/github/stars/MidTano/wplace_helper?style=for-the-badge" alt="GitHub stars">
</p>


<p align="center">
  <img width="80%" alt="Смотреть демо на YouTube"src="https://github.com/user-attachments/assets/af0a1714-8a89-4374-851f-8bdacbba1129" />
</p>


<p align="center">
✅ Работает прямо в браузере &nbsp;|&nbsp; 
✅ <span style="color:orange">Не требует установки</span> &nbsp;|&nbsp; 
✅ Поддержка пикселизации и автоклика &nbsp; 
</p>



## Быстрый старт
- Откройте wplace.live.  
- Откройте DevTools → Console.  
- Вставьте и выполните:
```js
(async () => {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  const code = await (await fetch(url, { cache: 'no-store' })).text();
  new Function(code)();
})();
```

Если сайт блокирует eval/new Function, используйте способ ниже.

## Букмарклет (по желанию)
Создайте закладку с адресом:
```
javascript:(async()=>{const u='https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';const c=await (await fetch(u,{cache:'no-store'})).text();new Function(c)();})()
```
Клик по закладке — инструмент загрузится на текущую страницу. На сайтах с жёстким CSP может не работать.

## Юзерскрипт (Tampermonkey)
Надёжно для сайтов с CSP (обходится без eval в странице):
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

## Горячие клавиши
- P — включить/выключить “Сквозные клики” (pass-through), в режиме кисти выключено.
- [ / ] — уменьшить/увеличить прозрачность окна на 5%.
- Esc — закрыть инструмент.

## Оверлей и базовые элементы
- Перемещение: тяните за “⠿” или за шапку тулбара (Shift+ЛКМ по окну тоже работает).
- Размер: тяните за нижний‑правый угол.
- W / H — задать размеры окна числом.
- 🔒 — фиксировать пропорции.
- Кратн. — кратные масштабы (к исходным размерам).
- Прозр. — прозрачность оверлея.
- Сквозь — пропускать клики мыши сквозь окно.
- 📁 Открыть — загрузка изображения (или перетащите файл на тулбар/окно). Справа показывается имя файла.

## Палитра / Автоклик / Кисть
- После загрузки изображения справа появляется палитра (названия цветов).
- Клик по цвету — автоклик всех пикселей этого цвета по странице:
  - Задержка (мс) — интервал между кликами.
- Кисть:
  - Включите “Кисть” и выберите цвет в палитре.
  - Размер — сторона квадратной кисти в пикселях изображения.
  - Наведение показывает курсор кисти; ЛКМ — клики по пикселям выбранного цвета в зоне кисти.
- Примечания:
  - Инструмент кликает только по пикселям выбранного цвета.
  - Прогресс кисти для цвета сбрасывается при повторном выборе этого цвета.

## Пикселизация
<img width="1233" height="809" alt="{A1F8D140-A3DB-487F-B6F2-862115710D82}" src="https://github.com/user-attachments/assets/f9767323-6c85-4cf9-ab3e-cee6361e1550" />

Откройте через 📁 Открыть (или перетащите изображение) — появится окно “Пикселизация”.

- Image Scaling Method: Nearest / Bilinear / Lanczos.
- Pixel Size: шаг сетки пиксель-арта.
- Palette:
  - Full — все доступные цвета,
  - Free only — только бесплатные,
  - Custom — ручной выбор (сетка с замочками на платных),
  - Owned — как Free (без интеграции со сторонними сайтами).
- Dithering: None / Ordered 4×4 / Ordered 8×8 / Floyd–Steinberg / Atkinson.
- Distance: sRGB / OKLab.
- Статистика: Horizontal × Vertical (размер пиксель-сетки), Total, Colors used.
- Превью: зум, перетаскивание.
- Сохранить как файл — экспорт PNG пиксель‑сетки (без умножения на Pixel Size).
- Применить — подставить результат в оверлей.
- Продолжить без изменений — использовать исходник.
- Отмена — закрыть окно.

## Копировать арт
<img width="1221" height="797" alt="{FB6080A1-4192-4290-9C5B-A5F2F247ABB3}" src="https://github.com/user-attachments/assets/11f25a54-3b86-4b1d-b77a-f44a2aa029de" />

Инструмент для сборки тайлов и вырезания области.

- Введите X и Y — координаты тайла‑центра.
- Выберите размер сетки: 2×2, 3×3, 4×4, 5×5, 10×10.
- Задержка, сек — интервал между запросами (0.2–5.0).
- Выделение: зажмите ЛКМ — потяните — отпустите (прямоугольник выделения).
- Сохранить PNG — сохраняет выделенную область как .png.
- Кнопка “🎯 Центр” — вернуть к Zoom 1 и центрировать.
- Примечание: этот инструмент не копирует в оверлей — только сохранение PNG.

## Подсказки
- Если много тайлов не загружается: увеличьте задержку; сервер может ограничивать частоту запросов.
- Для больших сеток мозаики ожидайте больше времени на сборку.

## Удаление
- Esc или кнопка “✕ Закрыть” в тулбаре.
- Перезапуск скрипта заменит текущий экземпляр.
