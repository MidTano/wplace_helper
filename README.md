# WPlace Overlay Art Helper

Инструмент для накладывания изображения поверх сайта wplace.live: палитра цветов из картинки и автоклик по всем пикселям выбранного цвета.

<img src="https://github.com/user-attachments/assets/4e5431ac-7969-4040-8ac9-ae10f0d84607" alt="WPlace Overlay Helper screenshot" width="900"/>


## Быстрый старт (через консоль)
1) Откройте wplace.live.  
2) Откройте DevTools → Console.  
3) Вставьте и выполните:
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

## Как пользоваться на wplace.live
- Откройте PNG/JPG/WebP кнопкой «📁 Открыть». Окно примет размер изображения 1:1.
- Для идеального попадания:
  - Держите включённым «Кратн.» (масштаб 1x/2x/3x) и «🔒» (сохр. пропорции).
  - Масштаб браузера = 100%.
  - Подгоняйте W/H до полного совпадения по пиксельной сетке.
- «Прозр.» — регулирует прозрачность окна, чтобы видеть, что под ним на холсте.
- «Сквозь» — позволяет кликать по странице через окно (панель и уголок ресайза остаются кликабельными).
- В сайдбаре:
  - Появится палитра всех цветов изображения.
  - Клик по свотчу запускает автоклик по всем пикселям этого цвета на холсте, в том же порядке.
  - «Задержка, мс» — пауза между кликами (например, 5–20 мс). «■ Стоп» — остановить.
  - Прогресс N/всего внизу.

Подсказка: если автоклик не рисует, один раз вручную кликните по холсту для фокуса, затем запустите автоклик. На некоторых сайтах слишком высокая скорость кликов может игнорироваться — поставьте небольшую задержку (например, 10–25 мс).


