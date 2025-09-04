// ==UserScript==
// @name         Wplace Helper
// @namespace    https://github.com/MidTano/wplace_helper
// @version      0.3.0
// @author       MidTano
// @match        https://wplace.live/*
// @updateURL    https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay_new.user.js
// @downloadURL  https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay_new.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wplace.live
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM.setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(async () => {
    "use strict";

    try {
        const ALLOWED_ORIGIN = 'https://wplace.live';
        const curOrigin = (location && location.origin) ? location.origin : '';
        if (curOrigin !== ALLOWED_ORIGIN) {
            try {
                console.warn('[Guard] Script disabled: origin', curOrigin, '!=', ALLOWED_ORIGIN);
            } catch (_) {}
            return;
        }
    } catch (_) {
        return;
    }

    const TILE_SIZE = 1000;

    function getDrawMult() {

        return (typeof state !== 'undefined' && state && state.acidModeEnabled) ? 1 : 3;
    }
    const __DBG = {
        on: false
    };

    function dbg(...a) {
        try {
            if (__DBG.on) console.log('[DBG]', ...a);
        } catch (_) {}
    }
    try {
        window.__DBG = __DBG;
    } catch (_) {}
    const LANGS = [{
        code: "RU",
        flag: `<svg width="18" height="12" viewBox="0 -4 28 28" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0)"><rect x="0.25" y="0.25" width="27.5" height="19.5" rx="1.75" fill="white" stroke="#F5F5F5" stroke-width="0.5"/><mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="0" width="28" height="20"><rect x="0.25" y="0.25" width="27.5" height="19.5" rx="1.75" fill="white" stroke="white" stroke-width="0.5"/></mask><g mask="url(#mask0)"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 13.3333H28V6.66667H0V13.3333Z" fill="#0C47B7"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0 20H28V13.3333H0V20Z" fill="#E53B35"/></g></g><defs><clipPath id="clip0"><rect width="28" height="20" rx="2" fill="white"/></clipPath></defs></svg>`,
        name: "Русский"
    }, {
        code: "EN",
        flag: `<svg width="18" height="12" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#41479B" d="M473.655,88.276H38.345C17.167,88.276,0,105.443,0,126.621V385.38 c0,21.177,17.167,38.345,38.345,38.345h435.31c21.177,0,38.345-17.167,38.345-38.345V126.621 C512,105.443,494.833,88.276,473.655,88.276z"/><path fill="#F5F5F5" d="M511.469,120.282c-3.022-18.159-18.797-32.007-37.814-32.007h-9.977l-163.54,107.147V88.276h-88.276 v107.147L48.322,88.276h-9.977c-19.017,0-34.792,13.847-37.814,32.007l139.778,91.58H0v88.276h140.309L0.531,391.717 c3.022,18.159,18.797,32.007,37.814,32.007h9.977l163.54-107.147v107.147h88.276V316.577l163.54,107.147h9.977 c19.017,0,34.792-13.847,37.814-32.007l-139.778-91.58H512v-88.276H371.691L511.469,120.282z"/><g fill="#FF4B55"><polygon points="282.483,88.276 229.517,88.276 229.517,229.517 0,229.517 0,282.483 229.517,282.483 229.517,423.724 282.483,423.724 282.483,282.483 512,282.483 512,229.517 282.483,229.517"/><path d="M24.793,421.252l186.583-121.114h-32.428L9.224,410.31 C13.377,415.157,18.714,418.955,24.793,421.252z"/><path d="M346.388,300.138H313.96l180.716,117.305c5.057-3.321,9.277-7.807,12.287-13.075L346.388,300.138z"/><path d="M4.049,109.475l157.73,102.387h32.428L15.475,95.842 C10.676,99.414,6.749,104.084,4.049,109.475z"/><path d="M332.566,211.862l170.035-110.375c-4.199-4.831-9.578-8.607-15.699-10.86L300.138,211.862H332.566z"/></g></svg>`,
        name: "English"
    }, {
        code: "DE",
        flag: `<svg width="18" height="12" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><path fill="#FFCD05" d="M0 27a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4v-4H0v4z"/><path fill="#ED1F24" d="M0 14h36v9H0z"/><path fill="#141414" d="M32 5H4a4 4 0 0 0-4 4v5h36V9a4 4 0 0 0-4-4z"/></svg>`,
        name: "Deutsch"
    }, {
        code: "FR",
        flag: `<svg width="18" height="12" viewBox="0 0 130 120" xmlns="http://www.w3.org/2000/svg"><rect x="87" fill="#DB3A49" width="43" height="120"/><rect x="43" fill="#FFFFFF" width="44" height="120"/><rect fill="#2A66B7" width="43" height="120"/></svg>`,
        name: "Français"
    }, {
        code: "ES",
        flag: `<svg width="18" height="12" viewBox="0 0 130 120" xmlns="http://www.w3.org/2000/svg"><rect y="0" fill="#DC4437" width="130" height="23"/><rect y="97" fill="#DC4437" width="130" height="23"/><rect y="23" fill="#FCBE1F" width="130" height="74"/><path fill="#DC4437" d="M45.3,45.8v-3h5.5v-8.2h-5.5v-6.3h-8.7v6.3h-5.5v8.2h5.5v3c-18,1-15.6,1.9-15.6,1.9v11.5V74 c0,0-1.2,16,20,16s20-16,20-16V59.2V47.6C61,47.6,63.3,46.8,45.3,45.8z"/></svg>`,
        name: "Español"
    }, {
        code: "CN",
        flag: `<svg width="18" height="12" viewBox="0 0 130 120" xmlns="http://www.w3.org/2000/svg"><rect fill="#DC4437" width="130" height="120"/><polygon fill="#FCBE1F" points="31,14.5 36.9,27 50,29 40.5,38.8 42.7,52.5 31,46 19.3,52.5 21.5,38.8 12,29 25.1,27"/><polygon fill="#FCBE1F" points="60.5,8 62.8,12.9 68,13.7 64.2,17.6 65.1,23 60.5,20.4 55.9,23 56.8,17.6 53,13.7 58.2,12.9"/><polygon fill="#FCBE1F" points="64.5,25.8 66.8,30.8 72,31.6 68.2,35.4 69.1,40.8 64.5,38.3 59.9,40.8 60.8,35.4 57,31.6 62.2,30.8"/><polygon fill="#FCBE1F" points="60.5,44 62.8,48.9 68,49.7 64.2,53.6 65.1,59 60.5,56.4 55.9,59 56.8,53.6 53,49.7 58.2,48.9"/></svg>`,
        name: "中文"
    }];
    const I18N = {
        RU: {
            open: "Открыть",
            copyArt: "Копировать арт",
            close: "Закрыть",
            stop: "Стоп",
            save: "Сохранить",
            center: "Центр",
            cancel: "Отмена",
            transparency: "Прозрачность",
            passThrough: "Сквозные клики",
            brush: "Кисть",
            delay: "Задержка (ms)",
            file: "Файл",
            snap: "Кратн.",
            opacity: "Прозрачн.",
            filename: "Имя файла",
            image: "Изображение",
            zoom: "Масштаб",
            palette: "Палитра",
            export: "Экспорт",
            colorsUsed: "Исп. цветов",
            horizontal: "Горизонталь",
            vertical: "Вертикаль",
            total: "Всего",
            dropHint: "Перетащите изображение сюда — откроется окно настроек пикселизации, либо нажмите <span class=\"kbd\">📁</span>",
            filePrefix: "Файл: ",
            colorsSuffix: "цветов",
            selectColor: "Выбрать цвет",
            brushPrefix: "Кисть: ",
            copyArtTitle: "Копировать арт",
            xLabel: "X",
            yLabel: "Y",
            delaySec: "Задержка, сек",
            secondsSuffix: "s",
            sourceStats: "Source: — × —",
            tileStats: "Tile: — × —",
            progressStats: "Progress: —/— (fail 0)",
            pixelizationTitle: "Пикселизация",
            closeTitle: "Закрыть",
            scalingMethod: "Метод масштабирования изображения",
            nearestNeighbor: "Ближайший сосед",
            bilinear: "Билинейный",
            lanczos: "Ланцош (высокое качество)",
            pixelSize: "Размер пикселя",
            fullPalette: "Полная (все цвета)",
            freeOnly: "Только бесплатные",
            custom: "Пользовательская",
            ownedDetected: "Имеющиеся (обнаруженные)",
            distance: "Расстояние",
            srgb: "sRGB",
            oklab: "OKLab (перцептивное)",
            dithering: "Дизеринг",
            none: "Нет",
            ordered4: "Упорядоченный (Bayer 4×4)",
            ordered8: "Упорядоченный (Bayer 8×8)",
            fs: "Floyd–Steinberg",
            atkinson: "Atkinson",
            ditherStrength: "Сила дизеринга",
            clear: "🧹 Очистить",
            addFree: "🆓 Добавить бесплатные",
            selectAll: "🟦 Выбрать все",
            importOwned: "🔓 Импорт имеющиеся",
            selectedCount: "Выбрано: ",
            paidColor: "— платный цвет",
            horizontalStats: "Горизонталь: —",
            verticalStats: "Вертикаль: —",
            totalStats: "Всего: —",
            exportStats: "Экспорт: — × —",
            colorsUsedStats: "Исп. цветов: —",
            saveAsFile: "Сохранить как файл",
            apply: "Применить",
            skip: "Продолжить без изменений",
            transparencyShort: "Прозр.",
            sizeLabel: "Размер:",
            outlineGrowBlack: "Увеличить контур (черный)",
            shrinkEdgesInward: "Уменьшить края (внутрь)",
            hintEditModeRequired: "Войдите в режим редактирования — ошибка поиска цвета",
            hintAcidRequired: "Включите режим \"Глаз\", чтобы кликать по цветам",
            acidOn: "Улучшеные цвета: Включены",
            acidOff: "Улучшеные цвета: Выключены",
            moveModeTitle: "Режим перемещения (M)",
            acidToggleTitle: "Улучшеные цвета (вкл/выкл)",
            pcPreviewTitle: "Показать улучшеные цвета",
            selectLanguageTitle: "Выберите язык",
            autoSelectTitle: "Автовыбор",
            calibrationTitle: "Калибровка",
            startupTitle: "Требуется доступ к этой вкладке",
            startupBody: "Этому инструменту нужно разрешение на захват экрана окна/вкладки, где он запущен, чтобы корректно кликать по пикселям.",
            ok: "ОК",
            giveAccess: "Понял / Дать доступ",
            accessActive: "Доступ активен",
            hintAccessRequired: "Нужно дать доступ к экрану",
            timeSpend: "Время",
            dayShort: "д",
            hourShort: "ч",
            minuteShort: "мин",
            secondShort: "с",
            history: "История",
            historyEmpty: "История пуста",
            mismatchTitle: "Несоответствие",
            mismatchBody: "Текущее изображение отличается от записи истории. Разместить по сохранённым координатам?",
            selectedFileDiffers: "Выбранный файл «{file}» отличается от «{expected}».",
            continue: "Продолжить",
            undoTitle: "Отменить (Ctrl+Z)",
            redoTitle: "Повторить (Ctrl+Y / Ctrl+Shift+Z)",
            brushTitle: "Кисть (B)",
            eraserTitle: "Ластик (E)",
            eyedropperTitle: "Пипетка (Alt)",
            editPixelsTitle: "Редактировать",
            done: "Готово",
            accountStatsTitle: "Статистика аккаунта",
            accountStatsSendPixelPrompt: "Отправьте пиксель для получения статистики",
            accName: "Имя",
            accChargesMax: "Заряды (макс)",
            accDroplets: "Капли",
            accPixels: "Пикселей",
            accLevel: "Уровень",
            accPixelsToNext: "Пикселей до нового уровня",
            accPixelsToNextUnknown: "Пикселей до нового уровня: — (нет данных от API)",
        },
        EN: {
            open: "Open",
            copyArt: "Copy Art",
            close: "Close",
            stop: "Stop",
            save: "Save",
            center: "Center",
            cancel: "Cancel",
            transparency: "Transparency",
            passThrough: "Pass-through Clicks",
            brush: "Brush",
            delay: "Delay (ms)",
            file: "File",
            width: "Width",
            height: "Height",
            keepAspect: "Keep Aspect Ratio",
            snap: "Snap",
            scale: "Scale",
            opacity: "Opacity",
            filename: "Filename",
            image: "Image",
            zoom: "Zoom",
            palette: "Palette",
            export: "Export",
            colorsUsed: "Colors Used",
            horizontal: "Horizontal",
            vertical: "Vertical",
            total: "Total",
            dropHint: "Drag image here — pixelization settings window will open, or click <span class=\"kbd\">📁</span>",
            keepAspectTitle: "Keep aspect ratio (on/off)",
            passThroughTitle: "Pass-through clicks on page (P)",
            filePrefix: "File: ",
            colorsSuffix: "colors",
            selectColor: "Select color",
            brushPrefix: "Brush: ",
            copyArtTitle: "Copy Art",
            xLabel: "X",
            yLabel: "Y",
            delaySec: "Delay, sec",
            secondsSuffix: "s",
            sourceStats: "Source: — × —",
            tileStats: "Tile: — × —",
            progressStats: "Progress: —/— (fail 0)",
            pixelizationTitle: "Pixelization",
            closeTitle: "Close",
            scalingMethod: "Image Scaling Method",
            nearestNeighbor: "Nearest Neighbor",
            bilinear: "Bilinear",
            lanczos: "Lanczos (High Quality)",
            pixelSize: "Pixel Size",
            fullPalette: "Full (all colors)",
            freeOnly: "Free only",
            custom: "Custom",
            ownedDetected: "Owned (detected)",
            distance: "Distance",
            srgb: "sRGB",
            oklab: "OKLab (perceptual)",
            dithering: "Dithering",
            none: "None",
            ordered4: "Ordered (Bayer 4×4)",
            ordered8: "Ordered (Bayer 8×8)",
            fs: "Floyd–Steinberg",
            atkinson: "Atkinson",
            ditherStrength: "Dither Strength",
            clear: "🧹 Clear",
            addFree: "🆓 Add free",
            selectAll: "🟦 Select all",
            importOwned: "🔓 Import owned",
            selectedCount: "Selected: ",
            paidColor: "— paid color",
            horizontalStats: "Horizontal: —",
            verticalStats: "Vertical: —",
            totalStats: "Total: —",
            exportStats: "Export: — × —",
            colorsUsedStats: "Colors used: —",
            saveAsFile: "Save as file",
            apply: "Apply",
            skip: "Continue without changes",
            transparencyShort: "Transp.",
            sizeLabel: "Size:",
            outlineGrowBlack: "Outline Grow (Black)",
            shrinkEdgesInward: "Shrink Edges (Inward)",
            hintEditModeRequired: "Enter edit mode — color search error",
            hintAcidRequired: "Enable Eye mode to click colors",
            acidOn: "Improved colors: Enabled",
            acidOff: "Improved colors: Disabled",
            moveModeTitle: "Move mode (M)",
            acidToggleTitle: "Improved colors (on/off)",
            pcPreviewTitle: "Show improved colors",
            selectLanguageTitle: "Select language",
            autoSelectTitle: "Auto select",
            calibrationTitle: "Calibration",
            startupTitle: "Access to this tab is required",
            startupBody: "This tool needs permission to capture the window/tab where it runs to auto‑click pixels correctly.",
            ok: "OK",
            giveAccess: "Give access",
            accessActive: "Access active",
            hintAccessRequired: "You need to grant screen access",
            timeSpend: "Time",
            dayShort: "d",
            hourShort: "h",
            minuteShort: "min",
            secondShort: "s",
            history: "History",
            historyEmpty: "History is empty",
            mismatchTitle: "Mismatch",
            mismatchBody: "The current image differs from the history entry. Place at saved coordinates anyway?",
            selectedFileDiffers: "Selected file “{file}” differs from “{expected}”.",
            continue: "Continue",
            undoTitle: "Undo (Ctrl+Z)",
            redoTitle: "Redo (Ctrl+Y / Ctrl+Shift+Z)",
            brushTitle: "Brush (B)",
            eraserTitle: "Eraser (E)",
            eyedropperTitle: "Eyedropper (Alt)",
            editPixelsTitle: "Edit",
            done: "Done",
            accountStatsTitle: "Account stats",
            accountStatsSendPixelPrompt: "Place a pixel to fetch stats",
            accName: "Name",
            accChargesMax: "Charges (max)",
            accDroplets: "Droplets",
            accPixels: "Pixels",
            accLevel: "Level",
            accPixelsToNext: "Pixels to next level",
            accPixelsToNextUnknown: "Pixels to next level: — (no data from API)",
        },
        DE: {
            open: "Öffnen",
            copyArt: "Kunst kopieren",
            close: "Schließen",
            stop: "Stopp",
            save: "Speichern",
            center: "Zentrieren",
            cancel: "Abbrechen",
            transparency: "Transparenz",
            passThrough: "Durchklicken",
            brush: "Pinsel",
            delay: "Verzögerung (ms)",
            file: "Datei",
            width: "Breite",
            height: "Höhe",
            keepAspect: "Seitenverhältnis behalten",
            snap: "Raster",
            scale: "Maßstab",
            opacity: "Deckkraft",
            filename: "Dateiname",
            image: "Bild",
            zoom: "Zoom",
            palette: "Palette",
            export: "Export",
            colorsUsed: "Farben verwendet",
            horizontal: "Horizontal",
            vertical: "Vertikal",
            total: "Gesamt",
            dropHint: "Bild hierher ziehen — Pixelisierungs-Einstellungsfenster öffnet sich, oder klicken Sie auf <span class=\"kbd\">📁</span>",
            keepAspectTitle: "Seitenverhältnis beibehalten (ein/aus)",
            passThroughTitle: "Durchklicks auf der Seite (P)",
            filePrefix: "Datei: ",
            colorsSuffix: "Farben",
            selectColor: "Farbe auswählen",
            brushPrefix: "Pinsel: ",
            copyArtTitle: "Kunst kopieren",
            xLabel: "X",
            yLabel: "Y",
            delaySec: "Verzögerung, Sek",
            secondsSuffix: "s",
            sourceStats: "Quelle: — × —",
            tileStats: "Kachel: — × —",
            progressStats: "Fortschritt: —/— (Fehler 0)",
            pixelizationTitle: "Pixelisierung",
            closeTitle: "Schließen",
            scalingMethod: "Bildskalierungsmethode",
            nearestNeighbor: "Nächster Nachbar",
            bilinear: "Bilineare",
            lanczos: "Lanczos (Hohe Qualität)",
            pixelSize: "Pixelgröße",
            fullPalette: "Voll (alle Farben)",
            freeOnly: "Nur kostenlos",
            custom: "Benutzerdefiniert",
            ownedDetected: "Besessen (erkannt)",
            distance: "Abstand",
            srgb: "sRGB",
            oklab: "OKLab (wahrnehmungsbezogen)",
            dithering: "Dithering",
            none: "Kein",
            ordered4: "Geordnet (Bayer 4×4)",
            ordered8: "Geordnet (Bayer 8×8)",
            fs: "Floyd–Steinberg",
            atkinson: "Atkinson",
            ditherStrength: "Dither-Stärke",
            clear: "🧹 Löschen",
            addFree: "🆓 Kostenlose hinzufügen",
            selectAll: "🟦 Alle auswählen",
            importOwned: "🔓 Besessene importieren",
            selectedCount: "Ausgewählt: ",
            paidColor: "— bezahlte Farbe",
            horizontalStats: "Horizontal: —",
            verticalStats: "Vertikal: —",
            totalStats: "Gesamt: —",
            exportStats: "Export: — × —",
            colorsUsedStats: "Verwendete Farben: —",
            saveAsFile: "Als Datei speichern",
            apply: "Anwenden",
            skip: "Ohne Änderungen fortfahren",
            transparencyShort: "Transp.",
            sizeLabel: "Größe:",
            outlineGrowBlack: "Kontur vergrößern (schwarz)",
            shrinkEdgesInward: "Kanten verkleinern (nach innen)",
            hintEditModeRequired: "Bearbeitungsmodus aktivieren — Farbsuche-Fehler",
            hintAcidRequired: "Augenmodus aktivieren, um Farben zu klicken",
            acidOn: "Verbesserte Farben: Aktiviert",
            acidOff: "Verbesserte Farben: Deaktiviert",
            moveModeTitle: "Verschiebemodus (M)",
            acidToggleTitle: "Verbesserte Farben (ein/aus)",
            pcPreviewTitle: "Verbesserte Farben anzeigen",
            selectLanguageTitle: "Sprache wählen",
            autoSelectTitle: "Autoauswahl",
            calibrationTitle: "Kalibrierung",
            startupTitle: "Zugriff auf diesen Tab erforderlich",
            startupBody: "Dieses Tool benötigt die Berechtigung, das Fenster/den Tab aufzunehmen, in dem es läuft, um Pixel korrekt automatisch zu klicken.",
            ok: "OK",
            giveAccess: "Zugriff geben",
            accessActive: "Zugriff aktiv",
            hintAccessRequired: "Bildschirmzugriff muss erteilt werden",
            timeSpend: "Zeit",
            dayShort: "T",
            hourShort: "Std",
            minuteShort: "Min",
            secondShort: "s",
            undoTitle: "Rückgängig (Ctrl+Z)",
            redoTitle: "Wiederholen (Ctrl+Y / Ctrl+Shift+Z)",
            continue: "Weiter",
            history: "Verlauf",
            selectedFileDiffers: "Ausgewählte Datei „{file}“ unterscheidet sich von „{expected}“.",
            brushTitle: "Pinsel (B)",
            eraserTitle: "Radierer (E)",
            eyedropperTitle: "Pipette (Alt)",
            editPixelsTitle: "Bearbeiten",
            done: "Fertig",
            accountStatsTitle: "Account-Statistik",
            accountStatsSendPixelPrompt: "Setze einen Pixel, um Statistiken abzurufen",
            accName: "Name",
            accChargesMax: "Ladungen (max)",
            accDroplets: "Tropfen",
            accPixels: "Pixel",
            accLevel: "Stufe",
            accPixelsToNext: "Pixel bis zur nächsten Stufe",
            accPixelsToNextUnknown: "Pixel bis zur nächsten Stufe: — (keine API-Daten)",
        },
        FR: {
            open: "Ouvrir",
            copyArt: "Copier l'art",
            close: "Fermer",
            stop: "Arrêter",
            save: "Enregistrer",
            center: "Centrer",
            cancel: "Annuler",
            transparency: "Transparence",
            passThrough: "Clics à travers",
            brush: "Pinceau",
            delay: "Délai (ms)",
            file: "Fichier",
            width: "Largeur",
            height: "Hauteur",
            keepAspect: "Conserver proportions",
            snap: "Aligner",
            scale: "Échelle",
            opacity: "Opacité",
            filename: "Nom du fichier",
            image: "Image",
            zoom: "Zoom",
            palette: "Palette",
            export: "Exporter",
            colorsUsed: "Couleurs utilisées",
            horizontal: "Horizontal",
            vertical: "Vertical",
            total: "Total",
            dropHint: "Glissez l'image ici — la fenêtre des paramètres de pixelisation s'ouvrira, ou cliquez sur <span class=\"kbd\">📁</span>",
            keepAspectTitle: "Conserver le rapport d'aspect (on/off)",
            passThroughTitle: "Clics traversants sur la page (P)",
            filePrefix: "Fichier: ",
            colorsSuffix: "couleurs",
            selectColor: "Sélectionner la couleur",
            brushPrefix: "Pinceau: ",
            copyArtTitle: "Copier l'art",
            xLabel: "X",
            yLabel: "Y",
            delaySec: "Délai, sec",
            secondsSuffix: "s",
            sourceStats: "Source: — × —",
            tileStats: "Tuile: — × —",
            progressStats: "Progrès: —/— (échec 0)",
            pixelizationTitle: "Pixelisation",
            closeTitle: "Fermer",
            scalingMethod: "Méthode de mise à l'échelle de l'image",
            nearestNeighbor: "Voisin le plus proche",
            bilinear: "Bilinéaire",
            lanczos: "Lanczos (Haute qualité)",
            pixelSize: "Taille de pixel",
            fullPalette: "Complet (toutes les couleurs)",
            freeOnly: "Gratuit seulement",
            custom: "Personnalisé",
            ownedDetected: "Possédé (détecté)",
            distance: "Distance",
            srgb: "sRGB",
            oklab: "OKLab (perceptuel)",
            dithering: "Dithering",
            none: "Aucun",
            ordered4: "Ordonné (Bayer 4×4)",
            ordered8: "Ordonné (Bayer 8×8)",
            fs: "Floyd–Steinberg",
            atkinson: "Atkinson",
            ditherStrength: "Force de dithering",
            clear: "🧹 Effacer",
            addFree: "🆓 Ajouter gratuit",
            selectAll: "🟦 Sélectionner tout",
            importOwned: "🔓 Importer possédés",
            selectedCount: "Sélectionné: ",
            paidColor: "— couleur payante",
            horizontalStats: "Horizontal: —",
            verticalStats: "Vertical: —",
            totalStats: "Total: —",
            exportStats: "Export: — × —",
            colorsUsedStats: "Couleurs utilisées: —",
            saveAsFile: "Enregistrer comme fichier",
            apply: "Appliquer",
            skip: "Continuer sans modifications",
            transparencyShort: "Transp.",
            sizeLabel: "Taille:",
            outlineGrowBlack: "Croissance du contour (noir)",
            shrinkEdgesInward: "Réduire les bords (vers l’intérieur)",
            hintEditModeRequired: "Activer le mode édition — erreur de recherche de couleur",
            hintAcidRequired: "Activez le mode \"œil\" pour cliquer les couleurs",
            acidOn: "Couleurs améliorées : Activées",
            acidOff: "Couleurs améliorées : Désactivées",
            moveModeTitle: "Mode déplacement (M)",
            acidToggleTitle: "Couleurs améliorées (activer/désactiver)",
            pcPreviewTitle: "Afficher les couleurs améliorées",
            selectLanguageTitle: "Choisir la langue",
            autoSelectTitle: "Sélection auto",
            calibrationTitle: "Étalonnage",
            startupTitle: "Accès à cet onglet requis",
            startupBody: "Cet outil doit pouvoir capturer la fenêtre/onglet où il s’exécute afin de cliquer automatiquement sur les pixels correctement.",
            ok: "OK",
            giveAccess: "Donner l’accès",
            accessActive: "Accès actif",
            hintAccessRequired: "Vous devez autoriser l’accès à l’écran",
            timeSpend: "Temps",
            dayShort: "j",
            hourShort: "h",
            minuteShort: "min",
            secondShort: "s",
            undoTitle: "Annuler (Ctrl+Z)",
            redoTitle: "Rétablir (Ctrl+Y / Ctrl+Shift+Z)",
            continue: "Continuer",
            history: "Historique",
            selectedFileDiffers: "Le fichier sélectionné « {file} » est différent de « {expected} ».",
            brushTitle: "Pinceau (B)",
            eraserTitle: "Gomme (E)",
            eyedropperTitle: "Pipette (Alt)",
            editPixelsTitle: "Modifier",
            done: "Terminé",
            accountStatsTitle: "Statistiques du compte",
            accountStatsSendPixelPrompt: "Placez un pixel pour récupérer les statistiques",
            accName: "Nom",
            accChargesMax: "Charges (max)",
            accDroplets: "Gouttes",
            accPixels: "Pixels",
            accLevel: "Niveau",
            accPixelsToNext: "Pixels jusqu'au prochain niveau",
            accPixelsToNextUnknown: "Pixels jusqu'au prochain niveau : — (pas de données API)",
        },
        ES: {
            open: "Abrir",
            copyArt: "Copiar arte",
            close: "Cerrar",
            stop: "Detener",
            save: "Guardar",
            center: "Centrar",
            cancel: "Cancelar",
            transparency: "Transparencia",
            passThrough: "Clics a través",
            brush: "Pincel",
            delay: "Retraso (ms)",
            file: "Archivo",
            width: "Ancho",
            height: "Altura",
            keepAspect: "Mantener proporción",
            snap: "Ajustar",
            scale: "Escala",
            opacity: "Opacidad",
            filename: "Nombre de archivo",
            image: "Imagen",
            zoom: "Zoom",
            palette: "Paleta",
            export: "Exportar",
            colorsUsed: "Colores usados",
            horizontal: "Horizontal",
            vertical: "Vertical",
            total: "Total",
            dropHint: "Arrastre la imagen aquí — se abrirá la ventana de configuración de pixelación, o haga clic en <span class=\"kbd\">📁</span>",
            keepAspectTitle: "Mantener proporción (on/off)",
            passThroughTitle: "Clics pasantes en la página (P)",
            filePrefix: "Archivo: ",
            colorsSuffix: "colores",
            selectColor: "Seleccionar color",
            brushPrefix: "Pincel: ",
            copyArtTitle: "Copiar arte",
            xLabel: "X",
            yLabel: "Y",
            delaySec: "Retraso, seg",
            secondsSuffix: "s",
            sourceStats: "Fuente: — × —",
            tileStats: "Azulejo: — × —",
            progressStats: "Progreso: —/— (fallo 0)",
            pixelizationTitle: "Pixelación",
            closeTitle: "Cerrar",
            scalingMethod: "Método de escalado de imagen",
            nearestNeighbor: "Vecino más cercano",
            bilinear: "Bilineal",
            lanczos: "Lanczos (Alta calidad)",
            pixelSize: "Tamaño de píxel",
            fullPalette: "Completo (todos los colores)",
            freeOnly: "Solo gratis",
            custom: "Personalizado",
            ownedDetected: "Propietario (detectado)",
            distance: "Distancia",
            srgb: "sRGB",
            oklab: "OKLab (perceptivo)",
            dithering: "Dithering",
            none: "Ninguno",
            ordered4: "Ordenado (Bayer 4×4)",
            ordered8: "Ordenado (Bayer 8×8)",
            fs: "Floyd–Steinberg",
            atkinson: "Atkinson",
            ditherStrength: "Fuerza de dithering",
            clear: "🧹 Limpiar",
            addFree: "🆓 Añadir gratis",
            selectAll: "🟦 Seleccionar todo",
            importOwned: "🔓 Importar propiedad",
            selectedCount: "Seleccionado: ",
            paidColor: "— color pagado",
            horizontalStats: "Horizontal: —",
            verticalStats: "Vertical: —",
            totalStats: "Total: —",
            exportStats: "Exportar: — × —",
            colorsUsedStats: "Colores usados: —",
            saveAsFile: "Guardar como archivo",
            apply: "Aplicar",
            skip: "Continuar sin cambios",
            transparencyShort: "Transp.",
            sizeLabel: "Tamaño:",
            outlineGrowBlack: "Crecer contorno (negro)",
            shrinkEdgesInward: "Encoger bordes (hacia dentro)",
            hintEditModeRequired: "Entrar en modo edición — error de búsqueda de color",
            hintAcidRequired: "Active el modo \"ojo\" para clicar colores",
            acidOn: "Colores mejorados: Activados",
            acidOff: "Colores mejorados: Desactivados",
            moveModeTitle: "Modo mover (M)",
            acidToggleTitle: "Colores mejorados (activar/desactivar)",
            pcPreviewTitle: "Mostrar colores mejorados",
            selectLanguageTitle: "Seleccionar idioma",
            autoSelectTitle: "Selección automática",
            calibrationTitle: "Calibración",
            startupTitle: "Se requiere acceso a esta pestaña",
            startupBody: "Esta herramienta necesita permiso para capturar la ventana/pestaña donde se ejecuta para hacer clic automático en píxeles correctamente.",
            ok: "OK",
            giveAccess: "Dar acceso",
            accessActive: "Acceso activo",
            hintAccessRequired: "Debe otorgar acceso a la pantalla",
            timeSpend: "Tiempo",
            dayShort: "d",
            hourShort: "h",
            minuteShort: "min",
            secondShort: "s",
            undoTitle: "Deshacer (Ctrl+Z)",
            redoTitle: "Rehacer (Ctrl+Y / Ctrl+Shift+Z)",
            continue: "Continuar",
            history: "Historial",
            selectedFileDiffers: "El archivo seleccionado «{file}» difiere de «{expected}».",
            brushTitle: "Pincel (B)",
            eraserTitle: "Borrador (E)",
            eyedropperTitle: "Cuentagotas (Alt)",
            editPixelsTitle: "Editar",
            done: "Hecho",
            accountStatsTitle: "Estadísticas de la cuenta",
            accountStatsSendPixelPrompt: "Coloca un píxel para obtener estadísticas",
            accName: "Nombre",
            accChargesMax: "Cargas (máx.)",
            accDroplets: "Gotas",
            accPixels: "Píxeles",
            accLevel: "Nivel",
            accPixelsToNext: "Píxeles hasta el siguiente nivel",
            accPixelsToNextUnknown: "Píxeles hasta el siguiente nivel: — (sin datos de la API)",
        },
        CN: {
            open: "打开",
            copyArt: "复制作品",
            close: "关闭",
            stop: "停止",
            save: "保存",
            center: "居中",
            cancel: "取消",
            transparency: "透明度",
            passThrough: "穿透点击",
            brush: "画笔",
            delay: "延迟 (ms)",
            file: "文件",
            width: "宽度",
            height: "高度",
            keepAspect: "保持比例",
            snap: "对齐",
            scale: "比例",
            opacity: "不透明度",
            filename: "文件名",
            image: "图像",
            zoom: "缩放",
            palette: "调色板",
            export: "导出",
            colorsUsed: "使用颜色数",
            horizontal: "水平",
            vertical: "垂直",
            total: "总计",
            dropHint: "将图像拖到这里 — 将打开像素化设置窗口，或单击 <span class=\"kbd\">📁</span>",
            keepAspectTitle: "保持纵横比 (开/关)",
            passThroughTitle: "页面穿透点击 (P)",
            filePrefix: "文件: ",
            colorsSuffix: "颜色",
            selectColor: "选择颜色",
            brushPrefix: "画笔: ",
            copyArtTitle: "复制艺术",
            xLabel: "X",
            yLabel: "Y",
            delaySec: "延迟, 秒",
            secondsSuffix: "s",
            sourceStats: "来源: — × —",
            tileStats: "图块: — × —",
            progressStats: "进度: —/— (失败 0)",
            pixelizationTitle: "像素化",
            closeTitle: "关闭",
            scalingMethod: "图像缩放方法",
            nearestNeighbor: "最近邻",
            bilinear: "双线性",
            lanczos: "Lanczos (高质量)",
            pixelSize: "像素大小",
            fullPalette: "完整 (所有颜色)",
            freeOnly: "仅免费",
            custom: "自定义",
            ownedDetected: "拥有的 (检测到)",
            distance: "距离",
            srgb: "sRGB",
            oklab: "OKLab (感知)",
            dithering: "抖动",
            none: "无",
            ordered4: "有序 (Bayer 4×4)",
            ordered8: "有序 (Bayer 8×8)",
            fs: "Floyd–Steinberg",
            atkinson: "Atkinson",
            ditherStrength: "抖动强度",
            clear: "🧹 清除",
            addFree: "🆓 添加免费",
            selectAll: "🟦 选择所有",
            importOwned: "🔓 导入拥有的",
            selectedCount: "已选择: ",
            paidColor: "— 付费颜色",
            horizontalStats: "水平: —",
            verticalStats: "垂直: —",
            totalStats: "总计: —",
            exportStats: "导出: — × —",
            colorsUsedStats: "使用的颜色: —",
            saveAsFile: "保存为文件",
            apply: "应用",
            skip: "继续而不更改",
            transparencyShort: "透明",
            sizeLabel: "大小:",
            outlineGrowBlack: "轮廓扩展（黑色）",
            shrinkEdgesInward: "收缩边缘（向内）",
            hintEditModeRequired: "进入编辑模式 — 颜色搜索错误",
            hintAcidRequired: "启用“眼睛”模式以点击颜色",
            acidOn: "增强色彩：已启用",
            acidOff: "增强色彩：已禁用",
            moveModeTitle: "移动模式 (M)",
            acidToggleTitle: "增强色彩（开/关）",
            pcPreviewTitle: "显示增强色彩",
            selectLanguageTitle: "选择语言",
            autoSelectTitle: "自动选择",
            calibrationTitle: "校准",
            startupTitle: "需要访问此选项卡",
            startupBody: "该工具需要权限捕获运行所在的窗口/选项卡，以便正确自动点击像素。",
            ok: "确定",
            giveAccess: "授予访问权限",
            accessActive: "访问已启用",
            hintAccessRequired: "需要授予屏幕访问权限",
            timeSpend: "时间",
            dayShort: "天",
            hourShort: "小时",
            minuteShort: "分钟",
            secondShort: "秒",
            undoTitle: "撤销 (Ctrl+Z)",
            redoTitle: "重做 (Ctrl+Y / Ctrl+Shift+Z)",
            continue: "继续",
            history: "历史",
            selectedFileDiffers: "所选文件“{file}”与“{expected}”不同。",
            brushTitle: "画笔 (B)",
            eraserTitle: "橡皮 (E)",
            eyedropperTitle: "滴管 (Alt)",
            editPixelsTitle: "编辑",
            done: "完成",
            accountStatsTitle: "账户统计",
            accountStatsSendPixelPrompt: "放置一个像素以获取统计信息",
            accName: "名称",
            accChargesMax: "充能（上限）",
            accDroplets: "水滴",
            accPixels: "像素数",
            accLevel: "等级",
            accPixelsToNext: "距离下一级所需像素",
            accPixelsToNextUnknown: "距离下一级所需像素：—（无 API 数据）",
        }
    };

    function t(key) {
        const dict = I18N[currentLang] || I18N.EN;
        return dict[key] || key
    }
    let currentLang = localStorage.getItem("overlay_tool_lang") || null;

    function showLanguageSelector() {
        return new Promise(resolve => {
            const back = document.createElement("div");
            back.style.cssText = `
      position:fixed; inset:0; z-index:2147483652; background:rgba(12,14,18,.45);
      backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
      display:grid; place-items:center;`;
            const modal = document.createElement("div");
            modal.style.cssText = `
      width:auto; max-width:min(480px,96vw); background:rgba(26,28,34,.75);
      border:1px solid rgba(255,255,255,.08); border-radius:12px; box-shadow:0 16px 40px rgba(0,0,0,.45);
      color:#e9eef3; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;
      display:flex; flex-direction:column; overflow:hidden;`;
            const head = document.createElement("div");
            head.style.cssText = `display:flex; align-items:center; gap:10px; padding:10px 14px;
      border-bottom:1px solid rgba(255,255,255,.08);`;
            const emoji = document.createElement("div");
            emoji.style.cssText = "width:18px; height:18px; line-height:0; display:inline-flex; align-items:center; justify-content:center;";
            emoji.innerHTML = '<svg width="18" height="18" viewBox="796 796 200 200" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M973.166,818.5H818.833c-12.591,0-22.833,10.243-22.833,22.833v109.333c0,12.59,10.243,22.833,22.833,22.833h154.333c12.59,0,22.834-10.243,22.834-22.833V841.333C996,828.743,985.756,818.5,973.166,818.5z M896,961.5h-77.167c-5.973,0-10.833-4.859-10.833-10.833V841.333c0-5.974,4.86-10.833,10.833-10.833H896V961.5z M978.58,872.129c-0.547,9.145-5.668,27.261-20.869,39.845c4.615,1.022,9.629,1.573,14.92,1.573v12c-10.551,0-20.238-1.919-28.469-5.325c-7.689,3.301-16.969,5.325-28.125,5.325v-12c5.132,0,9.924-0.501,14.366-1.498c-8.412-7.016-13.382-16.311-13.382-26.78h11.999c0,8.857,5.66,16.517,14.884,21.623c4.641-2.66,8.702-6.112,12.164-10.351c5.628-6.886,8.502-14.521,9.754-20.042h-49.785v-12h22.297v-11.986h12V864.5h21.055c1.986,0,3.902,0.831,5.258,2.28C977.986,868.199,978.697,870.155,978.58,872.129z"/><path d="M839.035,914.262l-4.45,11.258h-15.971l26.355-61.09h15.971l25.746,61.09h-16.583l-4.363-11.258H839.035z M852.475,879.876l-8.902,22.604h17.629L852.475,879.876z"/></svg>';
            const title = document.createElement("div");
            title.style.cssText = "font-weight:700; letter-spacing:.2px;";
            title.textContent = t("selectLanguageTitle");
            head.appendChild(emoji);
            head.appendChild(title);
            const body = document.createElement("div");
            body.style.cssText = `display:flex; flex-direction:column; gap:12px; padding:12px;`;
            const list = document.createElement("div");
            list.style.cssText = `display:flex; flex-wrap:wrap; gap:8px; justify-content:center;`;
            LANGS.forEach(lang => {
                const btn = document.createElement("button");
                btn.style.cssText = `
        flex:0 0 auto; height:32px; padding:0 12px; border-radius:8px;
        border:1px solid #3a3f47; background:#262a30; color:#e8edf3;
        display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-size:12px;`;
                btn.innerHTML = `${lang.flag} ${lang.name}`;
                btn.addEventListener("click", () => {
                    localStorage.setItem("overlay_tool_lang", lang.code);
                    currentLang = lang.code;
                    try {
                        document.body.removeChild(back);
                    } catch {}
                    resolve(lang.code);
                    try {
                        applyLanguage();
                    } catch (_) {}
                });
                list.appendChild(btn)
            });
            body.appendChild(list);
            modal.appendChild(head);
            modal.appendChild(body);
            back.appendChild(modal);
            document.body.appendChild(back)
        })
    }
    if (!currentLang) {
        await showLanguageSelector()
    }
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
.brush-cursor{position:fixed;z-index:2147483647;pointer-events:none;border:1px solid var(--accent);border-radius:9999px;transform:translate(-50%,-50%);box-shadow:0 0 0 1px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.2);display:none}
  .toolbar{position:fixed;left:50%;top:16px;transform:translateX(-50%);height:48px;max-width:calc(100vw - 150px);z-index:2147483647;background:var(--ui);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15);border:1px solid var(--stroke);border-radius:var(--radius);box-shadow:var(--shadow);display:flex;align-items:stretch;gap:0;user-select:none;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;font-size:12px;line-height:1;overflow:visible}
  
  .toolbar-scroll{position:relative;flex:1;overflow-x:auto;overflow-y:hidden;display:flex;justify-content:center;scrollbar-width:none;-ms-overflow-style:none}
.toolbar-scroll::-webkit-scrollbar{display:none}
  .toolbar-row{height:100%;display:inline-flex;align-items:center;gap:6px;padding:0 10px;min-width:0;max-width:100%;cursor:default}
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
/* Stop buttons hover to red */
.btn.stop:hover{background:#40272c;border-color:#7a3b43;color:#ffc9cf}
.rbtn.stop:hover{background:#40272c;border-color:#7a3b43;color:#ffc9cf}
.chip{height:28px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;border:1px solid #3a3f47;background:#1f2228;color:#dbe3ea}
.control{display:inline-flex;align-items:center;gap:6px;color:#dbe3ea}
.control label{opacity:.85}
 input[type=checkbox]{appearance:none;width:34px;height:20px;cursor:pointer;border-radius:999px;background:#2a2f38;border:1px solid #3a3f47;position:relative;transition:background .15s,border-color .15s}
  input[type=checkbox]::after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.5);transition:transform .15s}
  input[type=checkbox]:checked{background:rgba(125,208,255,.35);border-color:rgba(125,208,255,.7)}
  input[type=checkbox]:checked::after{transform:translateX(14px)}
  /* Larger toggle style for key switches */
  input[type=checkbox].toggle{width:44px;height:24px}
  input[type=checkbox].toggle::after{width:20px;height:20px}
  input[type=checkbox].toggle:checked::after{transform:translateX(20px)}
  input[type=range]{-webkit-appearance:none;appearance:none;width:150px;height:6px;cursor:pointer;background:linear-gradient(90deg,var(--accent) 0%, var(--accent) calc(var(--p,0)*1%), #3a3f47 calc(var(--p,0)*1%), #3a3f47 100%);border-radius:999px;border:0}
  input[type=range]::-webkit-slider-runnable-track{-webkit-appearance:none;appearance:none;height:6px;background:transparent;border-radius:999px;border:0}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:#1a1f27;border:2px solid var(--accent);margin-top:-3px;box-shadow:none}
  input[type=range]::-moz-range-track{height:6px;background:#3a3f47;border-radius:999px;border:0}
  input[type=range]::-moz-range-progress{height:6px;background:var(--accent);border-radius:999px}
  input[type=range]::-moz-range-thumb{width:12px;height:12px;border:2px solid var(--accent);border-radius:50%;background:#1a1f27;margin-top:-3px}
  .pixel-slider{height:6px}
 input[type=number]{width:76px;height:28px;padding:0 8px;background:#1a1e24;color:#e7eef6;border:1px solid #3a3f47;border-radius:8px;font-size:12px;outline:none;-moz-appearance:textfield}
 input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number]:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(125,208,255,.15)}
 input[type=color]{width:32px;height:28px;padding:0;border:1px solid #3a3f47;border-radius:8px;background:#1f2228;cursor:pointer}
.value{min-width:32px;text-align:right;opacity:.8;font-variant-numeric:tabular-nums}
.scale{min-width:36px;margin-left:4px;text-align:right;opacity:.9;font-weight:600;color:#d4ecff}
  .sidebar{position:fixed;right:8px;top:50%;transform:translateY(-50%);width:auto;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);z-index:2147483647;background:var(--ui);backdrop-filter:blur(10px) saturate(1.05);-webkit-backdrop-filter:blur(10px) saturate(1.05);border:1px solid var(--stroke);border-radius:12px;box-shadow:var(--shadow);color:#dbe3ea;display:flex;flex-direction:row;gap:0;overflow:visible;user-select:none}
.side-head{position:relative;height:44px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding:0 0;overflow:hidden}
.side-scroll{position:relative;flex:1;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.side-scroll::-webkit-scrollbar{display:none}
.side-row{height:auto;display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:10px}
.side-fade-left,.side-fade-right{position:absolute;top:0;bottom:0;width:22px;pointer-events:none;opacity:0;transition:opacity .2s}
.side-fade-left{left:0;background:linear-gradient(90deg,rgba(0,0,0,.35),transparent)}
.side-fade-right{right:0;background:linear-gradient(270deg,rgba(0,0,0,.35),transparent)}
.side-head.has-left .side-fade-left{opacity:1}
.side-head.has-right .side-fade-right{opacity:1}
.side-body{flex:1;overflow:auto;padding:10px}
  /* Panels that expand under rail actions */
  .panel-host{display:flex;flex-direction:column;gap:8px;overflow:visible}
  .panel{overflow:hidden;height:0;border:1px solid var(--stroke);border-radius:10px;background:#1a1f27;transition:height .2s ease}
  .panel.open{will-change:height}
  .panel-body{padding:8px;display:flex;align-items:center;gap:8px}
  .palette{display:grid;grid-template-columns:repeat(auto-fill, 24px);gap:6px;align-content:center;justify-content:center;overflow:auto;flex:1;min-height:0}
  .tool-col{display:none}
  .palette-col{flex:0 0 200px;min-width:200px;display:flex;flex-direction:column;overflow:visible;padding:8px;border-right:1px solid var(--stroke)}
  .rail-col{flex:0 0 64px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 2px;gap:12px}
  .rail{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
  .rbtn{appearance:none;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:none;transition:transform .06s ease, background .15s ease, border-color .15s ease}
  .rbtn:hover{transform:translateY(-1px);background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12)}
  .rbtn.active{background:rgba(125,208,255,.15);border-color:rgba(125,208,255,.35);color:#cfeeff}
  .rbtn.danger{background:#40272c;border-color:#5a2c32;color:#ffc9cf}
  .rbtn.success{background:#243a2b;border-color:#2d6a3a;color:#b8f6c7}
  /* Rail expanding panels under buttons */
  .rail-panel{width:44px;overflow:hidden;height:0;border:1px solid var(--stroke);border-radius:12px;background:#1a1f27;transition:height .2s ease}
  .rail-panel .panel-body{padding:8px;display:flex;flex-direction:column;align-items:center;gap:8px}
  .rail-input{width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:var(--text);text-align:center}
  .rail-input:focus{outline:none;border-color:rgba(125,208,255,.35);box-shadow:0 0 0 2px rgba(125,208,255,.15)}
.swatch{position:relative;width:24px;height:24px;padding:0;border:1px solid #39404a;border-radius:6px;background:#1f232a;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .05s ease, background .15s ease, border-color .15s}
.swatch:hover{border-color:#4a5260;transform:translateY(-1px)}
.swatch.active{box-shadow:inset 0 0 0 2px var(--accent);border-color:var(--accent)}
.swatch .box{width:100%;height:100%;border-radius:6px;border:1px solid rgba(255,255,255,.2)}
  .swatch .meta{display:none}
  .swatch::after{display:none}
  .hover-tip{position:fixed;z-index:2147483651;left:0;top:0;background:#0e1117;color:#dfe7f1;border:1px solid #2b313b;border-radius:8px;padding:4px 8px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.45);font-size:11px;display:none}
  /* Account stats tooltip */
  .acc-tip{position:fixed;z-index:2147483651;left:0;top:0;background:#0e1117;color:#dfe7f1;border:1px solid #2b313b;border-radius:10px;padding:10px 12px;box-shadow:0 12px 32px rgba(0,0,0,.5);font-size:12px;display:none;max-width:280px}
  .acc-tip .title{font-weight:700;margin-bottom:6px}
  .acc-tip .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .acc-tip .muted{opacity:.85;font-size:11px}
  .side-foot{border-top:1px solid rgba(255,255,255,.08);padding:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.side-foot .stat{margin-left:auto;opacity:.9;color:#cfe4ff;font-weight:600}
.range-wrap{position:relative;display:inline-block}
.range-wrap + .value{margin-left:4px}
.kbd{padding:0 6px;border:1px solid #444;border-bottom-width:2px;border-radius:6px;background:#222;font-weight:700}
.kbd{padding:0 6px;border:1px solid #444;border-bottom-width:2px;border-radius:6px;background:#222;font-weight:700}
  /* Vertical sidebar aesthetics */
  .sidebar{gap:0}
  .side-head{height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08)}
  .side-body{display:flex;flex-direction:column;gap:10px;padding:10px;overflow:auto}
  .side-section{border:none;border-radius:8px;background:transparent;padding:8px 0;display:flex;flex-direction:column;gap:8px}
  .side-title{display:none}
  .side-grid{display:flex;flex-direction:column;gap:8px}
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

/* Access/startup modal (separate from pixel editor) */
.access-backdrop{position:fixed;inset:0;z-index:2147483650;background:rgba(0,0,0,.45);display:grid;place-items:center}
.access-modal{width:auto;max-width:min(420px,96vw);height:auto;max-height:70vh;background:var(--ui-strong);border:1px solid var(--stroke);border-radius:12px;box-shadow:var(--shadow);display:flex;flex-direction:column;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif}
.access-head{height:48px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.access-title{font-weight:700;letter-spacing:.2px}
.access-body{flex:1;display:flex;flex-direction:column;gap:12px;min-height:0;padding:12px}
.access-controls{border-right:0;padding:0;display:flex;flex-direction:column;gap:12px;overflow:auto}
.access-foot{height:56px;display:flex;align-items:center;gap:8px;padding:0 12px;border-top:1px solid rgba(255,255,255,.08)}
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

    const historyCss = `
.history-pop{position:fixed;z-index:2147483651;min-width:300px;max-width:460px;background:rgba(16,19,25,.98);border:1px solid rgba(255,255,255,.08);border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.3);color:#e9eef5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:12px 12px}
.history-pop:after{content:"";position:absolute;top:-8px;left:var(--hx,24px);border:8px solid transparent;border-bottom-color:rgba(16,19,25,.98);filter:drop-shadow(0 -1px 0 rgba(255,255,255,.08))}
.history-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 2px 8px 2px}
.history-title{font-weight:700;font-size:14px;color:#f2f6fb}
.history-controls{display:flex;align-items:center;gap:6px}
.history-controls .btn.icon{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#242a33;color:#cfd6df;cursor:pointer}
.history-controls .btn.icon:hover{background:#2a303a}
.history-controls .btn.icon.danger{color:#ff8a8a;border-color:rgba(255,138,138,.35)}
.history-list{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}
.history-row{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;text-align:left;padding:8px 10px;border-radius:10px;background:transparent}
.history-row:hover{background:rgba(255,255,255,.06)}
.history-left{flex:1;white-space:normal;word-break:break-word}
.history-left .h-title{font-weight:700;color:#f2f6fb}
.history-left .h-sub{opacity:.75;font-size:12px;margin-top:2px}
.history-right{opacity:.8;white-space:nowrap}
.history-empty{opacity:.8;padding:6px 8px}
`;
    const histStyle = document.createElement("style");
    histStyle.textContent = historyCss;
    shadow.append(histStyle);

    const confirmCss = `
.confirm-back{position:fixed;inset:0;z-index:2147483652;background:rgba(12,14,18,.45);backdrop-filter:blur(2px);display:grid;place-items:center}
.confirm-pop{min-width:340px;max-width:520px;background:var(--ui-strong);border:1px solid var(--stroke);border-radius:12px;box-shadow:var(--shadow);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif}
.confirm-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.confirm-title{font-weight:700}
.confirm-body{padding:10px 12px 0 12px;line-height:1.45;opacity:.95}
.confirm-foot{padding:12px;display:flex;gap:8px}
.confirm-foot .spacer{flex:1}
`;
    const confirmStyle = document.createElement('style');
    confirmStyle.textContent = confirmCss;
    shadow.append(confirmStyle);

    function el(t, c, txt) {
        const n = document.createElement(t);
        if (c) n.className = c;
        if (txt != null) n.textContent = txt;
        return n
    }

    function autoPickColorOnPage(colorName) {
        try {

            const btnByAria = document.querySelector(`button[aria-label="${colorName}"]`);

            if (!btnByAria) {
                showHint(t('hintEditModeRequired'), 7000);
                return false;
            }

            if (btnByAria.querySelector('svg')) {
                return false;
            }

            btnByAria.click();
            return true;

        } catch (e) {
            return false;
        }
    }


    let __settingsModalBuilt = false;
    let __settingsBackdrop = null;
    let __settingsModal = null;
    let __settingsInputs = null;

    function buildSettingsModal() {
        if (__settingsModalBuilt) return;
        __settingsModalBuilt = true;
        __settingsInputs = {};
        try {

            __settingsBackdrop = document.createElement('div');
            __settingsBackdrop.style.position = 'fixed';
            __settingsBackdrop.style.inset = '0';
            __settingsBackdrop.style.background = 'rgba(0,0,0,0.35)';
            __settingsBackdrop.style.display = 'none';
            __settingsBackdrop.style.zIndex = '10000';


            __settingsModal = document.createElement('div');
            __settingsModal.style.position = 'fixed';
            __settingsModal.style.top = '64px';
            __settingsModal.style.left = '50%';
            __settingsModal.style.transform = 'translateX(-50%)';
            __settingsModal.style.minWidth = '380px';
            __settingsModal.style.maxWidth = '92vw';
            __settingsModal.style.background = '#1e1e1e';
            __settingsModal.style.color = '#fff';
            __settingsModal.style.border = '1px solid rgba(255,255,255,0.12)';
            __settingsModal.style.borderRadius = '10px';
            __settingsModal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
            __settingsModal.style.display = 'none';
            __settingsModal.style.zIndex = '10001';
            __settingsModal.style.padding = '14px 16px';


            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.justifyContent = 'space-between';
            const titleEl = document.createElement('div');
            titleEl.textContent = (typeof t === 'function' && t('settings')) ? t('settings') : 'Настройки сканера';
            titleEl.style.fontWeight = '600';
            titleEl.style.fontSize = '15px';
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn icon';
            closeBtn.innerHTML = '&#10005;';
            closeBtn.style.minWidth = '32px';
            closeBtn.style.height = '32px';
            closeBtn.addEventListener('click', () => {
                try {
                    closeSettingsModal();
                } catch (_) {}
            });
            header.append(titleEl, closeBtn);


            const body = document.createElement('div');
            body.style.marginTop = '8px';
            body.style.display = 'grid';
            body.style.gridTemplateColumns = '1fr';
            body.style.gap = '12px';


            function infoIcon(text) {
                const wrap = document.createElement('span');
                wrap.style.marginLeft = '6px';
                wrap.style.opacity = '0.8';
                wrap.style.cursor = 'help';
                wrap.title = text || '';
                wrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 17v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>';
                return wrap;
            }

            function card(title) {
                const c = document.createElement('div');
                c.style.border = '1px solid rgba(255,255,255,0.12)';
                c.style.borderRadius = '10px';
                c.style.background = '#222';
                c.style.padding = '10px 12px';
                c.style.display = 'flex';
                c.style.flexDirection = 'column';
                c.style.gap = '10px';
                const head = document.createElement('div');
                head.style.fontWeight = '700';
                head.style.fontSize = '14px';
                head.style.opacity = '0.95';
                head.textContent = title;
                const content = document.createElement('div');
                content.style.display = 'flex';
                content.style.flexDirection = 'column';
                content.style.gap = '10px';
                c.append(head, content);
                return {
                    wrap: c,
                    head,
                    content
                };
            }

            function sliderRow(label, min, max, step, getVal, setVal, helpText, onApply) {
                const wrap = document.createElement('div');
                wrap.style.display = 'grid';
                wrap.style.gridTemplateColumns = '1fr auto';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '8px';

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                const lbl = document.createElement('div');
                lbl.textContent = label;
                lbl.style.fontSize = '13px';
                lbl.style.opacity = '0.9';
                if (helpText) lbl.appendChild(infoIcon(helpText));

                const range = document.createElement('input');
                range.type = 'range';
                range.min = String(min);
                range.max = String(max);
                range.step = String(step);
                range.value = String(getVal());
                range.style.width = '180px';

                const num = document.createElement('input');
                num.type = 'number';
                num.min = String(min);
                num.max = String(max);
                num.step = String(step);
                num.value = String(getVal());
                num.style.width = '90px';
                num.style.background = '#111';
                num.style.border = '1px solid rgba(255,255,255,0.15)';
                num.style.color = '#fff';
                num.style.padding = '4px 6px';
                num.style.borderRadius = '6px';

                function apply(v) {
                    try {
                        setVal(v);
                    } catch (_) {}
                    try {
                        if (typeof onApply === 'function') onApply(v);
                    } catch (_) {}
                }

                range.addEventListener('input', () => {
                    const v = Math.max(min, Math.min(max, Math.floor(Number(range.value))));
                    num.value = String(v);
                    apply(v);
                });
                num.addEventListener('input', () => {
                    const v = Math.max(min, Math.min(max, Math.floor(Number(num.value))));
                    range.value = String(v);
                    apply(v);
                });

                left.append(lbl);
                wrap.append(left, range);
                wrap.append(document.createElement('div'), num);
                return {
                    wrap,
                    range,
                    num
                };
            }

            function switchRow(label, getOn, onChange, helpText) {
                const wrap = document.createElement('div');
                wrap.style.display = 'flex';
                wrap.style.alignItems = 'center';
                wrap.style.justifyContent = 'space-between';
                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                const lbl = document.createElement('div');
                lbl.textContent = label;
                lbl.style.fontSize = '13px';
                lbl.style.opacity = '0.9';
                if (helpText) lbl.appendChild(infoIcon(helpText));
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                try {
                    chk.checked = !!getOn();
                } catch (_) {
                    chk.checked = false;
                }
                chk.addEventListener('change', () => {
                    try {
                        onChange(!!chk.checked);
                    } catch (_) {}
                });
                left.append(lbl);
                wrap.append(left, chk);
                return {
                    wrap,
                    chk
                };
            }

            const cardScan = card('Сканирование цветов');
            const tol = sliderRow(
                'Допуск RGB',
                0, 96, 1,
                () => (Number.isFinite(Number(state.scanTolerance)) ? Number(state.scanTolerance) : 22),
                (v) => {
                    state.scanTolerance = v;
                },
                'Определяет чувствительность сравнения каналов R,G,B. Больше — проще находить похожие цвета, но выше риск ложных совпадений. Диапазон 0–96.',
                () => {
                    applyScanParamsFromState();
                    try {
                        persistSave();
                    } catch (_) {}
                }
            );
            __settingsInputs.tolRange = tol.range;
            __settingsInputs.tolNum = tol.num;
            const smin = sliderRow(
                'Шаг (мин)',
                1, 64, 1,
                () => (Number.isFinite(Number(state.scanStrideMin)) ? Number(state.scanStrideMin) : 3),
                (v) => {
                    state.scanStrideMin = v;
                },
                'Минимальный шаг выборки пикселей при сканировании. Меньше — плотнее и точнее, но медленнее.',
                () => {
                    applyScanParamsFromState();
                    try {
                        persistSave();
                    } catch (_) {}
                }
            );
            __settingsInputs.sminRange = smin.range;
            __settingsInputs.sminNum = smin.num;
            const smax = sliderRow(
                'Шаг (макс)',
                1, 64, 1,
                () => (Number.isFinite(Number(state.scanStrideMax)) ? Number(state.scanStrideMax) : 14),
                (v) => {
                    state.scanStrideMax = v;
                },
                'Максимальный шаг выборки. Ограничивает, насколько разрежённой может быть выборка на больших снимках.',
                () => {
                    applyScanParamsFromState();
                    try {
                        persistSave();
                    } catch (_) {}
                }
            );
            __settingsInputs.smaxRange = smax.range;
            __settingsInputs.smaxNum = smax.num;
            cardScan.content.append(tol.wrap, smin.wrap, smax.wrap);


            const cardAuto = card('АвтоРежим');
            const ahk = switchRow(
                'Режим по фокусу окна',
                () => {
                    try {
                        return !!state.ahkEnabled;
                    } catch (_) {
                        return false;
                    }
                },
                (on) => {
                    try {
                        const prev = !!state.ahkEnabled;
                        state.ahkEnabled = !!on;
                        try {
                            persistSave();
                        } catch (_) {}
                        if (state.autoModeEnabled && prev !== state.ahkEnabled) {

                            try {
                                stopAutoModeTimer();
                            } catch (_) {}
                            if (state.ahkEnabled) {
                                const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
                                if (focused) startAutoModeTimer();
                            } else {
                                startAutoModePlainTimer();
                            }
                        }
                    } catch (_) {}
                },
                'Если включено — запуск по фокусу окна; если выключено — периодический таймер независимо от фокуса.'
            );
            __settingsInputs.ahkChk = ahk.chk;
            const plainInt = sliderRow(
                'Интервал автозапуска (плоский таймер), мс',
                3000, 120000, 500,
                () => {
                    try {
                        return Number(AUTO_MODE_INTERVAL_MS) || 31000;
                    } catch (_) {
                        return 31000;
                    }
                },
                (v) => {
                    try {
                        AUTO_MODE_INTERVAL_MS = Math.max(1000, Math.floor(v));
                    } catch (_) {}
                },
                'Как часто запускать «Все цвета» в режиме без AHK.',
                () => {
                    try {
                        persistSave();
                        if (autoModePlainTimer) startAutoModePlainTimer();
                    } catch (_) {}
                }
            );
            __settingsInputs.plainIntRange = plainInt.range;
            __settingsInputs.plainIntNum = plainInt.num;
            const focusDelay = sliderRow(
                'Задержка старта при фокусе, мс',
                100, 5000, 50,
                () => {
                    try {
                        return Number(AUTO_MODE_FOCUS_DELAY_MS) || 1500;
                    } catch (_) {
                        return 1500;
                    }
                },
                (v) => {
                    try {
                        AUTO_MODE_FOCUS_DELAY_MS = Math.max(0, Math.floor(v));
                    } catch (_) {}
                },
                'Пауза перед запуском при получении фокуса окна (режим AHK).',
                () => {
                    try {
                        persistSave();
                    } catch (_) {}
                }
            );
            __settingsInputs.focusDelayRange = focusDelay.range;
            __settingsInputs.focusDelayNum = focusDelay.num;
            const onFocusAlways = switchRow(
                'Всегда запускать при фокусе (без проверки экрана)',
                () => {
                    try {
                        return !!AUTO_MODE_ON_FOCUS_ALWAYS;
                    } catch (_) {
                        return false;
                    }
                },
                (on) => {
                    try {
                        AUTO_MODE_ON_FOCUS_ALWAYS = !!on;
                        try {
                            persistSave();
                        } catch (_) {}
                    } catch (_) {}
                },
                'Если включено — в фокусе окна запускает сразу без проверки наличия улучшенных цветов.'
            );
            __settingsInputs.onFocusAlwaysChk = onFocusAlways.chk;
            const scanWindow = sliderRow(
                'Окно сканирования (AHK), мс',
                1000, 30000, 250,
                () => {
                    try {
                        return Number(AUTO_MODE_SCAN_WINDOW_MS) || 8000;
                    } catch (_) {
                        return 8000;
                    }
                },
                (v) => {
                    try {
                        AUTO_MODE_SCAN_WINDOW_MS = Math.max(250, Math.floor(v));
                    } catch (_) {}
                },
                'Максимальная длительность окна, в течение которого ведётся сканирование при фокусе.',
                () => {
                    try {
                        persistSave();
                    } catch (_) {}
                }
            );
            __settingsInputs.scanWindowRange = scanWindow.range;
            __settingsInputs.scanWindowNum = scanWindow.num;
            const scanInterval = sliderRow(
                'Интервал сканирования (AHK), мс',
                50, 1000, 10,
                () => {
                    try {
                        return Number(AUTO_MODE_SCAN_INTERVAL_MS) || 250;
                    } catch (_) {
                        return 250;
                    }
                },
                (v) => {
                    try {
                        AUTO_MODE_SCAN_INTERVAL_MS = Math.max(25, Math.floor(v));
                    } catch (_) {}
                },
                'Периодичность проверки экрана при сканировании в режиме фокуса.',
                () => {
                    try {
                        persistSave();
                    } catch (_) {}
                }
            );
            __settingsInputs.scanIntervalRange = scanInterval.range;
            __settingsInputs.scanIntervalNum = scanInterval.num;
            cardAuto.content.append(ahk.wrap, plainInt.wrap, focusDelay.wrap, onFocusAlways.wrap, scanWindow.wrap, scanInterval.wrap);

            body.append(cardScan.wrap, cardAuto.wrap);

            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';
            footer.style.gap = '8px';
            footer.style.marginTop = '6px';
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn';
            resetBtn.textContent = 'Сбросить';
            resetBtn.addEventListener('click', () => {
                try {

                    state.scanTolerance = 22;
                    state.scanStrideMin = 3;
                    state.scanStrideMax = 14;
                    applyScanParamsFromState();

                    state.ahkEnabled = false;
                    AUTO_MODE_INTERVAL_MS = 31000;
                    AUTO_MODE_FOCUS_DELAY_MS = 1500;
                    AUTO_MODE_ON_FOCUS_ALWAYS = true;
                    AUTO_MODE_SCAN_WINDOW_MS = 8000;
                    AUTO_MODE_SCAN_INTERVAL_MS = 250;


                    try {
                        persistSave();
                    } catch (_) {}
                    syncSettingsUIFromState();

                    if (state.autoModeEnabled) {
                        try {
                            stopAutoModeTimer();
                        } catch (_) {}
                        startAutoModePlainTimer();
                    }
                } catch (_) {}
            });
            footer.append(resetBtn);

            __settingsModal.append(header, body, footer);
            document.body.appendChild(__settingsBackdrop);
            document.body.appendChild(__settingsModal);

            __settingsBackdrop.addEventListener('click', () => {
                try {
                    closeSettingsModal();
                } catch (_) {}
            });
        } catch (_) {}
    }

    function syncSettingsUIFromState() {
        try {
            if (!__settingsInputs) return;
            const tol = (Number.isFinite(Number(state.scanTolerance)) ? Number(state.scanTolerance) : 22);
            const smin = (Number.isFinite(Number(state.scanStrideMin)) ? Number(state.scanStrideMin) : 3);
            const smax = (Number.isFinite(Number(state.scanStrideMax)) ? Number(state.scanStrideMax) : 14);
            __settingsInputs.tolRange.value = String(tol);
            __settingsInputs.tolNum.value = String(tol);
            __settingsInputs.sminRange.value = String(smin);
            __settingsInputs.sminNum.value = String(smin);
            __settingsInputs.smaxRange.value = String(smax);
            __settingsInputs.smaxNum.value = String(smax);


            try {
                if (__settingsInputs.ahkChk) __settingsInputs.ahkChk.checked = !!state.ahkEnabled;
            } catch (_) {}
            try {
                const pInt = (typeof AUTO_MODE_INTERVAL_MS !== 'undefined') ? Number(AUTO_MODE_INTERVAL_MS) : 31000;
                if (__settingsInputs.plainIntRange) __settingsInputs.plainIntRange.value = String(pInt);
                if (__settingsInputs.plainIntNum) __settingsInputs.plainIntNum.value = String(pInt);
            } catch (_) {}
            try {
                const fDel = (typeof AUTO_MODE_FOCUS_DELAY_MS !== 'undefined') ? Number(AUTO_MODE_FOCUS_DELAY_MS) : 1500;
                if (__settingsInputs.focusDelayRange) __settingsInputs.focusDelayRange.value = String(fDel);
                if (__settingsInputs.focusDelayNum) __settingsInputs.focusDelayNum.value = String(fDel);
            } catch (_) {}
            try {
                if (__settingsInputs.onFocusAlwaysChk) __settingsInputs.onFocusAlwaysChk.checked = !!AUTO_MODE_ON_FOCUS_ALWAYS;
            } catch (_) {}
            try {
                const winMs = (typeof AUTO_MODE_SCAN_WINDOW_MS !== 'undefined') ? Number(AUTO_MODE_SCAN_WINDOW_MS) : 8000;
                if (__settingsInputs.scanWindowRange) __settingsInputs.scanWindowRange.value = String(winMs);
                if (__settingsInputs.scanWindowNum) __settingsInputs.scanWindowNum.value = String(winMs);
            } catch (_) {}
            try {
                const intMs = (typeof AUTO_MODE_SCAN_INTERVAL_MS !== 'undefined') ? Number(AUTO_MODE_SCAN_INTERVAL_MS) : 250;
                if (__settingsInputs.scanIntervalRange) __settingsInputs.scanIntervalRange.value = String(intMs);
                if (__settingsInputs.scanIntervalNum) __settingsInputs.scanIntervalNum.value = String(intMs);
            } catch (_) {}
        } catch (_) {}
    }

    function openSettingsModal() {
        try {
            buildSettingsModal();
            syncSettingsUIFromState();
            __settingsBackdrop.style.display = 'block';
            __settingsModal.style.display = 'block';
        } catch (_) {}
    }

    function closeSettingsModal() {
        try {
            __settingsBackdrop.style.display = 'none';
            __settingsModal.style.display = 'none';
        } catch (_) {}
    }

    function numberInput(v) {
        const i = document.createElement("input");
        i.type = "number";
        i.min = "0";
        i.step = "1";
        i.value = v || "0";
        return i
    }

    function checkbox(ch = !1) {
        const c = document.createElement("input");
        c.type = "checkbox";
        c.checked = ch;
        return c
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

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
    }

    const CV_FIXED_COLORS = [
        [179, 45, 45],
        [179, 85, 45],
        [179, 125, 45],
        [179, 165, 45],
        [155, 179, 45],
        [115, 179, 45],
        [75, 179, 45],
        [45, 179, 55],
        [45, 179, 95],
        [45, 179, 135],
        [45, 179, 175],
        [45, 165, 179],
        [45, 125, 179],
        [45, 85, 179],
        [55, 45, 179],
        [95, 45, 179],
        [255, 0, 0],
        [255, 64, 0],
        [255, 128, 0],
        [255, 191, 0],
        [223, 255, 0],
        [160, 255, 0],
        [96, 255, 0],
        [32, 255, 0],
        [0, 255, 32],
        [0, 255, 96],
        [0, 255, 160],
        [0, 255, 223],
        [0, 191, 255],
        [0, 128, 255],
        [0, 64, 255],
        [32, 0, 255],
        [222, 59, 59],
        [222, 106, 59],
        [222, 153, 59],
        [222, 200, 59],
        [193, 222, 59],
        [146, 222, 59],
        [99, 222, 59],
        [59, 222, 73],
        [59, 222, 120],
        [59, 222, 166],
        [59, 222, 213],
        [59, 200, 222],
        [59, 153, 222],
        [59, 106, 222],
        [73, 59, 222],
        [120, 59, 222],
        [255, 82, 82],
        [255, 133, 82],
        [255, 184, 82],
        [255, 235, 82],
        [215, 255, 82],
        [165, 255, 82],
        [115, 255, 82],
        [82, 255, 98],
        [82, 255, 149],
        [82, 255, 200],
        [82, 255, 251],
        [82, 235, 255],
        [82, 184, 255],
        [82, 133, 255],
        [98, 82, 255]
    ];

    function cvColorFor(index) {
        const list = CV_FIXED_COLORS;
        if (Number.isInteger(index) && index >= 0 && index < list.length) {
            return list[index];
        }

        let x = (index | 0) >>> 0;

        x ^= x >>> 16;
        x = Math.imul(x, 0x7feb352d);
        x ^= x >>> 15;
        x = Math.imul(x, 0x846ca68b);
        x ^= x >>> 16;
        const r = (x & 0xFF);
        const g = (x >>> 8) & 0xFF;
        const b = (x >>> 16) & 0xFF;
        const adj = v => 40 + Math.floor((v / 255) * 175);
        let c = [adj(r), adj(g), adj(b)];

        for (let i = 0; i < list.length; i++) {
            const l = list[i];
            if (l && l[0] === c[0] && l[1] === c[1] && l[2] === c[2]) {
                c = [Math.min(215, c[0] + 1), c[1], c[2]];
                break;
            }
        }
        return c;
    }

    function rgb24Index(r, g, b) {
        return ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
    }
    const overlay = el("div", "overlay");
    const content = el("div", "content");
    const img = el("img", "the-image");
    const dropHint = el("div", "drop-hint");
    dropHint.innerHTML = '<div class="box">' + t("dropHint") + '</div>';
    content.append(img, dropHint);

    const hint = document.createElement('div');
    hint.id = 'HINT_ID';
    hint.style.position = 'fixed';
    hint.style.left = '50%';
    hint.style.transform = 'translateX(-50%)';
    hint.style.zIndex = '2147483647';
    hint.style.padding = '8px 12px';
    hint.style.borderRadius = '10px';
    hint.style.background = 'var(--ui, rgba(26,28,34,0.75))';
    hint.style.border = '1px solid var(--stroke, rgba(255,255,255,0.08))';
    hint.style.color = 'var(--text, #e9eef3)';
    hint.style.fontSize = '12px';
    hint.style.boxShadow = 'var(--shadow, 0 16px 40px rgba(0,0,0,.45))';
    hint.style.backdropFilter = 'blur(6px)';
    hint.style.display = 'none';
    document.body.appendChild(hint);

    function positionHint(offset = 8) {
        try {
            const rect = toolbar.getBoundingClientRect();
            hint.style.top = `${Math.max(0, rect.bottom + offset)}px`;
        } catch (_) {}
    }
    let __accStats = null;
    let __accPrevStats = null;
    let __accPerPixelLevel = null;
    let __accRemainEst = null;
    let __accLastRemainInt = null;
    let __accLastPxCount = null;
    let __accHooked = false;

    function hookNetworkForAccountStats() {
        if (__accHooked) return;
        __accHooked = true;
        try {
            const ORIG_FETCH = window.fetch?.bind(window);
            if (ORIG_FETCH) {
                window.fetch = async function(...args) {
                    const res = await ORIG_FETCH(...args);
                    try {
                        const url = (args && args[0] && (typeof args[0] === 'string' ? args[0] : args[0]?.url)) || '';
                        if (typeof url === 'string' && url.includes('/me')) {
                            const clone = res.clone();
                            clone.json().then(j => {
                                try {
                                    __accPrevStats = __accStats;
                                    __accStats = j;
                                    const lvlNowRaw = readNum(deepFindKey(j, 'level'));
                                    const pxNow = deepPickNumberFlex(j, ['pixelsPainted', 'pixels', 'totalPixels', 'paintedPixels']);
                                    if (__accPrevStats) {
                                        const lvlPrevRaw = readNum(deepFindKey(__accPrevStats, 'level'));
                                        const pxPrev = deepPickNumberFlex(__accPrevStats, ['pixelsPainted', 'pixels', 'totalPixels', 'paintedPixels']);
                                        const dPct = (lvlNowRaw != null && lvlPrevRaw != null) ? ((lvlNowRaw - lvlPrevRaw) * 100) : null;
                                        const dPx = (pxNow != null && pxPrev != null) ? (pxNow - pxPrev) : null;
                                        if (dPct != null && dPx != null && dPx > 0 && isFinite(dPct) && dPct > 0) {
                                            const candidate = dPct / dPx;
                                            __accPerPixelLevel = (__accPerPixelLevel == null) ? candidate : Math.max(__accPerPixelLevel, candidate);
                                        }
                                        if (__accPerPixelLevel != null && lvlNowRaw != null) {
                                            const pct = levelValueToPercent(lvlNowRaw);
                                            if (pct != null) {
                                                let newEst = (100 - pct) / __accPerPixelLevel;
                                                if (__accRemainEst != null && isFinite(newEst)) {
                                                    newEst = Math.min(newEst, __accRemainEst - Math.max(0, dPx || 0));
                                                }
                                                if (isFinite(newEst)) __accRemainEst = Math.max(0, newEst);
                                            }
                                        }
                                    }
                                    try {
                                        console.debug('[acc] /me captured (fetch)', j, {
                                            perPixelLevel: __accPerPixelLevel,
                                            remainEst: __accRemainEst
                                        });
                                    } catch (_) {}
                                } catch (_) {}
                            }).catch(() => {});
                        }
                    } catch (_) {}
                    return res;
                };
            }
        } catch (_) {}
        try {
            const ORIG_XHR_OPEN = XMLHttpRequest.prototype.open;
            const ORIG_XHR_SEND = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this.__acc_url = url;
                return ORIG_XHR_OPEN.call(this, method, url, ...rest);
            };
            XMLHttpRequest.prototype.send = function(...args) {
                try {
                    this.addEventListener('loadend', () => {
                        try {
                            const url = this.__acc_url || this.responseURL || '';
                            if (this.status === 200 && typeof url === 'string' && url.includes('/me')) {
                                try {
                                    const j = JSON.parse(this.responseText);
                                    __accPrevStats = __accStats;
                                    __accStats = j;
                                    const lvlNowRaw = readNum(deepFindKey(j, 'level'));
                                    const pxNow = deepPickNumberFlex(j, ['pixelsPainted', 'pixels', 'totalPixels', 'paintedPixels']);
                                    if (__accPrevStats) {
                                        const lvlPrevRaw = readNum(deepFindKey(__accPrevStats, 'level'));
                                        const pxPrev = deepPickNumberFlex(__accPrevStats, ['pixelsPainted', 'pixels', 'totalPixels', 'paintedPixels']);
                                        const dPct = (lvlNowRaw != null && lvlPrevRaw != null) ? ((lvlNowRaw - lvlPrevRaw) * 100) : null;
                                        const dPx = (pxNow != null && pxPrev != null) ? (pxNow - pxPrev) : null;
                                        if (dPct != null && dPx != null && dPx > 0 && isFinite(dPct) && dPct > 0) {
                                            const candidate = dPct / dPx;
                                            __accPerPixelLevel = (__accPerPixelLevel == null) ? candidate : Math.max(__accPerPixelLevel, candidate);
                                        }
                                        if (__accPerPixelLevel != null && lvlNowRaw != null) {
                                            const pct = levelValueToPercent(lvlNowRaw);
                                            if (pct != null) {
                                                let newEst = (100 - pct) / __accPerPixelLevel;
                                                if (__accRemainEst != null && isFinite(newEst)) {
                                                    newEst = Math.min(newEst, __accRemainEst - Math.max(0, dPx || 0));
                                                }
                                                if (isFinite(newEst)) __accRemainEst = Math.max(0, newEst);
                                            }
                                        }
                                    }
                                    try {
                                        console.debug('[acc] /me captured (xhr)', j, {
                                            perPixelLevel: __accPerPixelLevel,
                                            remainEst: __accRemainEst
                                        });
                                    } catch (_) {}
                                } catch {}
                            }
                        } catch {}
                    });
                } catch {}
                return ORIG_XHR_SEND.call(this, ...args);
            };
        } catch (_) {}
    }




    function updateViewBaseFromPerformance() {
        try {
            const entries = (performance && typeof performance.getEntriesByType === 'function') ? performance.getEntriesByType('resource') : [];
            let minX, minY, baseOrigin;
            const re = /\/tiles\/(\d+)\/(\d+)\.png(?:$|\b)/;
            for (const e of entries) {
                const name = e && e.name ? String(e.name) : '';
                const m = re.exec(name);
                if (!m) continue;
                const x = Number(m[1]);
                const y = Number(m[2]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                minX = (minX === undefined) ? x : Math.min(minX, x);
                minY = (minY === undefined) ? y : Math.min(minY, y);
                try {
                    baseOrigin = baseOrigin || new URL(name).origin;
                } catch {}
            }
            if (minX !== undefined && minY !== undefined) {
                const prevBX = Number.isFinite(state.viewTileBaseX) ? state.viewTileBaseX : undefined;
                const prevBY = Number.isFinite(state.viewTileBaseY) ? state.viewTileBaseY : undefined;
                state.viewTileBaseX = Number.isFinite(state.viewTileBaseX) ? Math.min(state.viewTileBaseX, minX) : minX;
                state.viewTileBaseY = Number.isFinite(state.viewTileBaseY) ? Math.min(state.viewTileBaseY, minY) : minY;
                if (state.viewTileBaseX !== prevBX || state.viewTileBaseY !== prevBY) {
                    try {
                        dbg('perf: view base updated', {
                            baseX: state.viewTileBaseX,
                            baseY: state.viewTileBaseY
                        });
                    } catch (_) {}
                    tryAdjustAnchorWithViewBase();
                }
                if (baseOrigin && !state.tileBaseOrigin) {
                    state.tileBaseOrigin = baseOrigin;
                    try {
                        dbg('perf: tile base origin', {
                            origin: state.tileBaseOrigin
                        });
                    } catch {}
                }
            }
        } catch (_) {}
    }


    function nudgeTileReloadOnce() {
        try {
            if (state.__tilesReloadNudged) return;
            const imgs = Array.from(document.querySelectorAll('img'));
            const re = /\/tiles\/\d+\/\d+\.png(?:$|\b)/;
            let count = 0;
            for (const im of imgs) {
                const src = im.currentSrc || im.src || '';
                if (!re.test(src)) continue;
                const u = new URL(src, location.href);
                u.searchParams.set('ovr', String(Date.now()));
                im.src = u.toString();
                count++;
            }
            state.__tilesReloadNudged = true;
            try {
                dbg('dom: tiles reload nudged', {
                    count
                });
            } catch (_) {}
        } catch (_) {}
    }

    let hintTimer = null;

    function showHint(message, duration = 6000) {
        try {
            positionHint(10);
            hint.textContent = String(message || '');
            hint.style.display = 'block';
            hint.style.opacity = '1';
            if (hintTimer) clearTimeout(hintTimer);
            hintTimer = setTimeout(() => {
                hint.style.opacity = '0';

                setTimeout(() => {
                    hint.style.display = 'none';
                }, 200);
            }, Math.max(1500, duration | 0));
        } catch (_) {}
    }
    overlay.append(content);
    const dragMarker = el('div', null);
    dragMarker.style.cssText = [
        'position:fixed',
        'width:30px',
        'height:30px',
        'border-radius:50% 50% 50% 50%',
        'background:rgba(255,0,0,.5)',
        'border:2px solid #fff',
        'box-shadow:0 2px 8px rgba(0,0,0,.35)',
        'cursor:grab',
        'display:none',
        'z-index:2147483647'
    ].join(';');

    function updateMarkerPos() {
        try {
            const x = Math.round(state.markerX);
            const y = Math.round(state.markerY);
            const r = Math.round((dragMarker.offsetWidth || 20) / 2);
            dragMarker.style.left = (x - r) + 'px';
            dragMarker.style.top = (y - r) + 'px';
        } catch (_) {}
    }

    function ensureMarkerInBounds() {
        try {
            const r = Math.round((dragMarker.offsetWidth || 20) / 2);
            const minX = r,
                maxX = Math.max(r, window.innerWidth - r);
            const minY = r,
                maxY = Math.max(r, window.innerHeight - r);
            const x = state.markerX,
                y = state.markerY;
            const outside = !(x >= minX && x <= maxX && y >= minY && y <= maxY);
            if (outside || !isFinite(x) || !isFinite(y)) {
                state.markerX = Math.round(window.innerWidth / 2);
                state.markerY = Math.round(window.innerHeight / 2);
            } else {
                state.markerX = Math.min(maxX, Math.max(minX, x));
                state.markerY = Math.min(maxY, Math.max(minY, y));
            }
        } catch (_) {}
    }

    function clickRandomInsideMarker() {
        try {
            const r = Math.max(2, Math.round((dragMarker.offsetWidth || 20) / 2));

            const theta = Math.random() * Math.PI * 2;
            const rr = Math.sqrt(Math.random()) * (r - 2);
            const x = Math.round(state.markerX + rr * Math.cos(theta));
            const y = Math.round(state.markerY + rr * Math.sin(theta));
            simulateClickAt(x, y);
        } catch (_) {}
    }
    document.body.append(dragMarker);


    const markerDrag = {
        active: false,
        pointerId: null,
        dx: 0,
        dy: 0
    };

    function onMarkerMove(e) {
        if (!markerDrag.active) return;
        try {
            state.markerX = e.clientX - markerDrag.dx;
            state.markerY = e.clientY - markerDrag.dy;

            const r = Math.round((dragMarker.offsetWidth || 20) / 2);
            const maxX = window.innerWidth - r,
                maxY = window.innerHeight - r;
            const minX = r,
                minY = r;
            state.markerX = Math.min(maxX, Math.max(minX, state.markerX));
            state.markerY = Math.min(maxY, Math.max(minY, state.markerY));
            updateMarkerPos();
        } catch (_) {}
    }

    function onMarkerUp(e) {
        if (!markerDrag.active) return;
        markerDrag.active = false;
        try {
            dragMarker.releasePointerCapture(markerDrag.pointerId);
        } catch (_) {}
        try {
            dragMarker.style.cursor = 'grab';
        } catch (_) {}
        window.removeEventListener('pointermove', onMarkerMove, true);
        window.removeEventListener('pointerup', onMarkerUp, true);
        try {
            markerPersistSave();
        } catch (_) {}
    }
    dragMarker.addEventListener('pointerdown', (e) => {
        try {
            const rect = overlay.getBoundingClientRect();
            markerDrag.active = true;
            markerDrag.pointerId = e.pointerId;
            markerDrag.dx = e.clientX - state.markerX;
            markerDrag.dy = e.clientY - state.markerY;
            try {
                dragMarker.setPointerCapture(e.pointerId);
            } catch (_) {}
            dragMarker.style.cursor = 'grabbing';
            window.addEventListener('pointermove', onMarkerMove, true);
            window.addEventListener('pointerup', onMarkerUp, true);
            e.preventDefault();
        } catch (_) {}
    });

    const brushCursor = el("div", "brush-cursor");
    const toolbar = el("div", "toolbar");
    const toolbarScroll = el("div", "toolbar-scroll");
    const toolbarRow = el("div", "toolbar-row");
    const title = el("div", "title");
    title.style.display = "none";
    title.innerHTML = '';
    const btnOpen = el("button", "btn icon");
    btnOpen.title = t("open");
    btnOpen.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H3V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    const btnClear = el("button", "btn icon");
    btnClear.title = t("clear");
    btnClear.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    btnClear.style.display = 'none';
    const btnCopyArt = el("button", "btn icon");
    btnCopyArt.title = t("copyArt");
    btnCopyArt.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.15179 15.85L21 4M12.3249 12L8.15 8.15M21 20L15 14.4669M9 6C9 7.65685 7.65685 9 6 9C4.34315 9 3 7.65685 3 6C3 4.34315 4.34315 3 6 3C7.65685 3 9 4.34315 9 6ZM9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const btnMove = el("button", "btn icon");
    btnMove.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3V9M12 3L9 6M12 3L15 6M12 15V21M12 21L15 18M12 21L9 18M3 12H9M3 12L6 15M3 12L6 9M15 12H21M21 12L18 9M21 12L18 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btnMove.title = t("moveModeTitle");
    const btnAcid = el("button", "btn icon");
    const eyeOpenSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const eyeOffSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.8 21.8 0 0 1 5.06-5.94m3.38-1.57A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.83 21.83 0 0 1-3.06 4.2M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btnAcid.title = t("acidToggleTitle");
    btnAcid.innerHTML = eyeOpenSvg;

    const btnMarker = el('button', 'btn icon');
    btnMarker.title = 'Поместите под кнопку paint';
    btnMarker.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>';
    btnMarker.style.color = '#ff3b30';
    btnMarker.addEventListener('click', () => {
        try {
            state.markerVisible = !state.markerVisible;
            if (state.markerVisible) {
                ensureMarkerInBounds();
                dragMarker.style.display = 'block';
            } else {
                dragMarker.style.display = 'none';
            }
            btnMarker.classList.toggle('active', state.markerVisible);
            updateMarkerPos();
            try {
                markerPersistSave();
            } catch (_) {}
        } catch (_) {}
    });



    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    const snapWrap = el("div", "control");
    const snapCheck = checkbox(!0);
    const snapLabel = el("label", null, t("snap"));
    snapWrap.append(snapCheck, snapLabel);

    const btnClose = el("button", "btn danger icon");
    btnClose.title = t("close");
    btnClose.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    btnClose.style.marginLeft = '40px';
    const fileChip = chip("");
    fileChip.textContent = "";
    fileChip.style.display = "none";
    fileChip.style.maxWidth = "220px";
    fileChip.style.whiteSpace = "nowrap";
    fileChip.style.textOverflow = "ellipsis";
    fileChip.style.overflow = "hidden";


    const progressChip = chip("0%");
    progressChip.title = "ETA: —";
    progressChip.style.minWidth = "46px";
    progressChip.style.textAlign = "center";


    function etaFormat(seconds) {
        try {
            let s = Math.max(0, Math.round(seconds | 0));
            const days = Math.floor(s / 86400);
            s -= days * 86400;
            const hours = Math.floor(s / 3600);
            s -= hours * 3600;
            const minutes = Math.floor(s / 60);
            if (days > 0) return `${days}d ${hours}h ${minutes}m`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        } catch (_) {
            return "—";
        }
    }


    let etaAccounts = 1;
    try {
        const saved = Number(localStorage.getItem('eta.accounts') || '1');
        if (Number.isFinite(saved)) etaAccounts = Math.min(64, Math.max(1, Math.floor(saved)));
    } catch (_) {}

    function setEtaAccounts(n) {
        try {
            const v = Math.min(64, Math.max(1, n | 0));
            etaAccounts = v;
            try {
                localStorage.setItem('eta.accounts', String(v));
            } catch (_) {}
            try {
                if (etaValue) etaValue.textContent = `Аккаунты: ${v}`;
            } catch (_) {}
            updateToolbarProgressChip();
        } catch (_) {}
    }

    const etaPopover = document.createElement('div');
    etaPopover.style.position = 'fixed';
    etaPopover.style.zIndex = '9999';
    etaPopover.style.padding = '10px';
    etaPopover.style.border = '1px solid rgba(0,0,0,0.2)';
    etaPopover.style.borderRadius = '8px';
    etaPopover.style.background = '#222';
    etaPopover.style.color = '#fff';
    etaPopover.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
    etaPopover.style.display = 'none';
    const etaValue = document.createElement('div');
    etaValue.style.marginBottom = '6px';
    etaValue.style.fontSize = '12px';
    etaValue.textContent = `Аккаунты: ${etaAccounts}`;
    const etaSlider = document.createElement('input');
    etaSlider.type = 'range';
    etaSlider.min = '1';
    etaSlider.max = '64';
    etaSlider.step = '1';
    etaSlider.value = String(etaAccounts);
    etaSlider.style.width = '220px';
    etaSlider.addEventListener('input', () => setEtaAccounts(Number(etaSlider.value)));
    etaPopover.append(etaValue, etaSlider);
    document.body.appendChild(etaPopover);
    let etaCloseHandler = null;

    function hideEtaPopover() {
        etaPopover.style.display = 'none';
        if (etaCloseHandler) {
            document.removeEventListener('pointerdown', etaCloseHandler, true);
            etaCloseHandler = null;
        }
    }

    function showEtaPopoverNear(elm) {
        try {
            const rect = elm.getBoundingClientRect();
            etaSlider.value = String(etaAccounts);
            etaValue.textContent = `Аккаунты: ${etaAccounts}`;
            etaPopover.style.left = Math.round(rect.left) + 'px';
            etaPopover.style.top = Math.round(rect.bottom + 6) + 'px';
            etaPopover.style.display = 'block';
            etaCloseHandler = (ev) => {
                if (!etaPopover.contains(ev.target) && ev.target !== elm) hideEtaPopover();
            };
            document.addEventListener('pointerdown', etaCloseHandler, true);
        } catch (_) {}
    }
    progressChip.addEventListener('contextmenu', (e) => {
        try {
            e.preventDefault();
            e.stopPropagation();
        } catch (_) {}
        showEtaPopoverNear(progressChip);
    });

    let progressTotal = 0;
    let progressRemain = 0;
    let lastOverlaySig = "";

    function getOverlaySig() {
        try {
            return `${(state.x|0)},${(state.y|0)},${(state.w|0)},${(state.h|0)},${(state.iw|0)},${(state.ih|0)},dm=${getDrawMult()|0}`;
        } catch (_) {
            return "";
        }
    }

    function resetProgressIfOverlayChanged() {
        const sig = getOverlaySig();
        if (sig && sig !== lastOverlaySig) {
            lastOverlaySig = sig;
            progressTotal = 0;
            progressRemain = 0;
            try {
                progressTiles.clear();
            } catch (_) {}
        }
    }

    function updateToolbarProgressChip() {
        if (!progressChip) return;
        if (!progressTotal || progressTotal <= 0) {
            progressChip.textContent = "0%";
            progressChip.title = "ETA: —";
            return;
        }
        const painted = Math.max(0, progressTotal - progressRemain);
        const pct = Math.round((painted / progressTotal) * 100);
        progressChip.textContent = `${pct}%`;
        let secs = 0;
        try {
            secs = (progressRemain | 0) * (TIME_PER_PIXEL_SECONDS | 0);
        } catch (_) {
            secs = (progressRemain | 0) * 30;
        }
        const div = Math.max(1, (etaAccounts | 0));
        secs = Math.floor(secs / div);
        try {
            progressChip.title = `ETA: ${etaFormat(secs)}`;
        } catch (_) {
            progressChip.title = `ETA: ~${Math.max(1, Math.ceil(secs / 60))}m`;
        }
    }

    function countAlphaOnCanvas(cnv, threshold = 8) {
        try {
            const ctx = cnv.getContext('2d', {
                willReadFrequently: true
            });
            if (!ctx) return 0;
            const w = cnv.width | 0,
                h = cnv.height | 0;
            if (w <= 0 || h <= 0) return 0;
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            let c = 0;
            for (let i = 3; i < d.length; i += 4)
                if (d[i] >= threshold) c++;
            return c;
        } catch (_) {
            return 0;
        }
    }


    const progressTiles = new Map();
    const PROGRESS_TTL_MS = 10000;

    function updateProgressFromTiles() {
        const now = Date.now();
        let tot = 0,
            rem = 0;
        for (const [k, v] of progressTiles) {
            if (!v || typeof v.tot !== 'number' || typeof v.rem !== 'number' || typeof v.ts !== 'number') {
                progressTiles.delete(k);
                continue;
            }
            if (now - v.ts > PROGRESS_TTL_MS) {
                progressTiles.delete(k);
                continue;
            }
            tot += v.tot;
            rem += v.rem;
        }
        progressTotal = tot;
        progressRemain = rem;
        updateToolbarProgressChip();
    }

    const btnHistory = el("button", "btn icon");
    btnHistory.title = t("history");
    btnHistory.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12a9 9 0 1 0 3-6.708" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const spacer = el('div');
    spacer.style.flex = '1';
    const btnAcc = el("button", "btn icon");
    btnAcc.title = t("accountStatsTitle");
    btnAcc.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    const btnLang = el("button", "btn icon");
    btnLang.title = t("selectLanguageTitle");
    btnLang.innerHTML = '<svg width="18" height="18" viewBox="796 796 200 200" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M973.166,818.5H818.833c-12.591,0-22.833,10.243-22.833,22.833v109.333c0,12.59,10.243,22.833,22.833,22.833h154.333c12.59,0,22.834-10.243,22.834-22.833V841.333C996,828.743,985.756,818.5,973.166,818.5z M896,961.5h-77.167c-5.973,0-10.833-4.859-10.833-10.833V841.333c0-5.974,4.86-10.833,10.833-10.833H896V961.5z M978.58,872.129c-0.547,9.145-5.668,27.261-20.869,39.845c4.615,1.022,9.629,1.573,14.92,1.573v12c-10.551,0-20.238-1.919-28.469-5.325c-7.689,3.301-16.969,5.325-28.125,5.325v-12c5.132,0,9.924-0.501,14.366-1.498c-8.412-7.016-13.382-16.311-13.382-26.78h11.999c0,8.857,5.66,16.517,14.884,21.623c4.641-2.66,8.702-6.112,12.164-10.351c5.628-6.886,8.502-14.521,9.754-20.042h-49.785v-12h22.297v-11.986h12V864.5h21.055c1.986,0,3.902,0.831,5.258,2.28C977.986,868.199,978.697,870.155,978.58,872.129z"/><path d="M839.035,914.262l-4.45,11.258h-15.971l26.355-61.09h15.971l25.746,61.09h-16.583l-4.363-11.258H839.035z M852.475,879.876l-8.902,22.604h17.629L852.475,879.876z"/></svg>';
    btnLang.addEventListener('click', () => {
        try {
            showLanguageSelector();
        } catch (_) {}
    });


    const btnTopToggle = el('button', 'btn icon');
    btnTopToggle.title = 'АвтоРежим';
    btnTopToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M9 15C8.44771 15 8 15.4477 8 16C8 16.5523 8.44771 17 9 17C9.55229 17 10 16.5523 10 16C10 15.4477 9.55229 15 9 15Z" fill="currentColor"/>\
<path d="M14 16C14 15.4477 14.4477 15 15 15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17C14.4477 17 14 16.5523 14 16Z" fill="currentColor"/>\
<path fill-rule="evenodd" clip-rule="evenodd" d="M12 1C10.8954 1 10 1.89543 10 3C10 3.74028 10.4022 4.38663 11 4.73244V7H6C4.34315 7 3 8.34315 3 10V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V10C21 8.34315 19.6569 7 18 7H13V4.73244C13.5978 4.38663 14 3.74028 14 3C14 1.89543 13.1046 1 12 1ZM5 10C5 9.44772 5.44772 9 6 9H7.38197L8.82918 11.8944C9.16796 12.572 9.86049 13 10.618 13H13.382C14.1395 13 14.832 12.572 15.1708 11.8944L16.618 9H18C18.5523 9 19 9.44772 19 10V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V10ZM13.382 11L14.382 9H9.61803L10.618 11H13.382Z" fill="currentColor"/>\
<path d="M1 14C0.447715 14 0 14.4477 0 15V17C0 17.5523 0.447715 18 1 18C1.55228 18 2 17.5523 2 17V15C2 14.4477 1.55228 14 1 14Z" fill="currentColor"/>\
<path d="M22 15C22 14.4477 22.4477 14 23 14C23.5523 14 24 14.4477 24 15V17C24 17.5523 23.5523 18 23 18C22.4477 18 22 17.5523 22 17V15Z" fill="currentColor"/>\
 </svg>';
    btnTopToggle.style.background = '#e53935';
    btnTopToggle.style.color = '#fff';

    const btnSettings = el('button', 'btn icon');
    try {
        btnSettings.title = (t('settings') || 'Настройки');
    } catch (_) {
        btnSettings.title = 'Настройки';
    }
    btnSettings.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="#ffffff" stroke-width="1.5"/><path d="M3.66122 10.6392C4.13377 10.9361 4.43782 11.4419 4.43782 11.9999C4.43781 12.558 4.13376 13.0638 3.66122 13.3607C3.33966 13.5627 3.13248 13.7242 2.98508 13.9163C2.66217 14.3372 2.51966 14.869 2.5889 15.3949C2.64082 15.7893 2.87379 16.1928 3.33973 16.9999C3.80568 17.8069 4.03865 18.2104 4.35426 18.4526C4.77508 18.7755 5.30694 18.918 5.83284 18.8488C6.07287 18.8172 6.31628 18.7185 6.65196 18.5411C7.14544 18.2803 7.73558 18.2699 8.21895 18.549C8.70227 18.8281 8.98827 19.3443 9.00912 19.902C9.02332 20.2815 9.05958 20.5417 9.15224 20.7654C9.35523 21.2554 9.74458 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2977 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9182 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C20.8677 16.6407 21.029 16.3614 21.1486 16.1272M20.3387 13.3608C19.8662 13.0639 19.5622 12.5581 19.5621 12.0001C19.5621 11.442 19.8662 10.9361 20.3387 10.6392C20.6603 10.4372 20.8674 10.2757 21.0148 10.0836C21.3377 9.66278 21.4802 9.13092 21.411 8.60502C21.3591 8.2106 21.1261 7.80708 20.6601 7.00005C20.1942 6.19301 19.9612 5.7895 19.6456 5.54732C19.2248 5.22441 18.6929 5.0819 18.167 5.15113C17.927 5.18274 17.6836 5.2814 17.3479 5.45883C16.8544 5.71964 16.2643 5.73004 15.781 5.45096C15.2977 5.1719 15.0117 4.6557 14.9909 4.09803C14.9767 3.71852 14.9404 3.45835 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74458 2.35523 9.35523 2.74458 9.15224 3.23463C9.05958 3.45833 9.02332 3.71848 9.00912 4.09794C8.98826 4.65566 8.70225 5.17191 8.21891 5.45096C7.73557 5.73002 7.14548 5.71959 6.65205 5.4588C6.31633 5.28136 6.0729 5.18269 5.83285 5.15108C5.30695 5.08185 4.77509 5.22436 4.35427 5.54727C4.03866 5.78945 3.80569 6.19297 3.33974 7C3.13231 7.35929 2.97105 7.63859 2.85138 7.87273" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>';
    btnSettings.addEventListener('click', () => {
        try {
            openSettingsModal();
        } catch (_) {}
    });

    let AUTO_MODE_INTERVAL_MS = 31000;
    let autoModeTimer = null;

    let autoModePlainTimer = null;

    let autoModeHoldCheckTimer = null;

    let AUTO_MODE_FOCUS_DELAY_MS = 1500;

    let autoModeFocusSession = false;

    let AUTO_MODE_ON_FOCUS_ALWAYS = true;

    let AUTO_MODE_SCAN_WINDOW_MS = 8000;
    let AUTO_MODE_SCAN_INTERVAL_MS = 250;
    let autoModeScanTimer = null;
    let autoModeScanDeadline = 0;
    btnTopToggle.addEventListener('click', () => {
        const isOn = btnTopToggle.classList.toggle('active');
        try {
            console.log('[AutoMode] toggle ->', isOn ? 'ON' : 'OFF');
        } catch (_) {}
        if (isOn) {
            btnTopToggle.style.background = '#2e7d32';

            if (!state.acidModeEnabled) {
                state.acidModeEnabled = true;
                try {
                    updateAcidBtn();
                } catch (_) {}
                try {
                    persistSave();
                } catch (_) {}
                try {
                    window.dispatchEvent(new Event('resize'));
                } catch (_) {}
                try {
                    console.log('[AutoMode] eye mode forced ON');
                } catch (_) {}
            }

            try {
                btnAcid.disabled = true;
                btnAcid.style.opacity = '0.6';
                btnAcid.style.cursor = 'not-allowed';
                btnAcid.title = (t('acidBlockedByAuto') || 'Режим глаз заблокирован АвтоРежимом');
            } catch (_) {}
            try {
                state.autoModeEnabled = true;
            } catch (_) {}
            try {
                persistSave();
            } catch (_) {}
            try {
                console.log('[AutoMode] starting timer');
            } catch (_) {}
            try {
                if (state.ahkEnabled) {
                    const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
                    if (focused) startAutoModeTimer();
                    else try {
                        console.log('[AutoMode] window not focused; timer will start on focus');
                    } catch (_) {}
                } else {

                    startAutoModePlainTimer();
                }
            } catch (_) {}
        } else {
            btnTopToggle.style.background = '#e53935';

            if (state.acidModeEnabled) {
                state.acidModeEnabled = false;
                try {
                    updateAcidBtn();
                } catch (_) {}
                try {
                    persistSave();
                } catch (_) {}
                try {
                    window.dispatchEvent(new Event('resize'));
                } catch (_) {}
                try {
                    console.log('[AutoMode] eye mode forced OFF');
                } catch (_) {}
            }

            try {
                btnAcid.disabled = false;
                btnAcid.style.opacity = '';
                btnAcid.style.cursor = '';
                btnAcid.title = t('acidToggleTitle');
            } catch (_) {}
            try {
                state.autoModeEnabled = false;
            } catch (_) {}
            try {
                persistSave();
            } catch (_) {}
            try {
                console.log('[AutoMode] stopping timer');
            } catch (_) {}
            try {
                stopAutoModeTimer();
            } catch (_) {}
        }

        try {
            btnTopToggle.title = 'АвтоРежим';
        } catch (_) {}
    });

    function startAutoModeTimer() {
        try {
            stopAutoModeTimer();
        } catch (_) {}

        try {
            const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
            if (!focused) {
                try {
                    console.log('[AutoMode] skip schedule: window not focused');
                } catch (_) {}
                return;
            }
            if (autoModeFocusSession) {
                try {
                    console.log('[AutoMode] skip schedule: session already fired');
                } catch (_) {}
                return;
            }
        } catch (_) {}
        try {
            console.log('[AutoMode] one-shot SCHEDULE');
        } catch (_) {}
        autoModeTimer = setTimeout(() => {
            autoModeTimer = null;
            try {
                runAutoModeOneShot();
            } catch (_) {}
        }, AUTO_MODE_FOCUS_DELAY_MS);

        try {
            autoModeHoldCheckTimer = setInterval(() => {
                try {
                    const stillFocused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
                    if (!stillFocused) {
                        stopAutoModeTimer();
                    }
                } catch (_) {}
            }, 120);
        } catch (_) {}
    }

    function runAutoModeOneShot() {
        try {
            if (!state?.autoModeEnabled) {
                try {
                    console.log('[AutoMode] one-shot: disabled');
                } catch (_) {}
                return;
            }
            const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
            if (!focused) {
                try {
                    console.log('[AutoMode] one-shot: window lost focus');
                } catch (_) {}
                return;
            }
            if (autoModeFocusSession) {
                try {
                    console.log('[AutoMode] one-shot: already fired this focus');
                } catch (_) {}
                return;
            }

            autoModeFocusSession = true;
            try {
                console.log('[AutoMode] one-shot action: trigger All Colors');
            } catch (_) {}
            try {
                if (btnAllColors) btnAllColors.click();
            } catch (_) {}
        } catch (_) {}
    }


    function startAutoModePlainTimer() {
        try {
            if (autoModePlainTimer) {
                clearInterval(autoModePlainTimer);
                autoModePlainTimer = null;
            }
            autoModePlainTimer = setInterval(() => {
                try {
                    if (!state?.autoModeEnabled) return;

                    try {
                        console.log('[AutoModePlain] action: trigger All Colors');
                    } catch (_) {}
                    try {
                        if (btnAllColors) btnAllColors.click();
                    } catch (_) {}
                } catch (_) {}
            }, AUTO_MODE_INTERVAL_MS);
            try {
                console.log('[AutoModePlain] timer START interval=', AUTO_MODE_INTERVAL_MS);
            } catch (_) {}
        } catch (_) {
            autoModePlainTimer = null;
        }
    }

    function startAutoModeScanLoop() {
        try {
            stopAutoModeTimer();
        } catch (_) {}
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        autoModeScanDeadline = now + AUTO_MODE_SCAN_WINDOW_MS;
        try {
            console.log('[AutoMode] scan-loop START', {
                windowMs: AUTO_MODE_SCAN_WINDOW_MS,
                intervalMs: AUTO_MODE_SCAN_INTERVAL_MS
            });
        } catch (_) {}
        autoModeScanTimer = setInterval(() => {
            try {
                const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
                if (!state?.autoModeEnabled || !focused) {
                    stopAutoModeScanLoop();
                    return;
                }

                const running = !!state?.running;
                const bulk = !!state?.bulkInProgress || !!(btnAllColors && btnAllColors.disabled);
                if (running || bulk) {
                    autoModeFocusSession = true;
                    stopAutoModeScanLoop();
                    return;
                }
                if (isNoPaintPopupVisible()) {
                    autoModeFocusSession = true;
                    stopAutoModeScanLoop();
                    return;
                }

                const ready = !!isScreenCaptureReady();
                if (ready) {
                    if (AUTO_MODE_ON_FOCUS_ALWAYS) {
                        autoModeFocusSession = true;
                        const canClick = !!(btnAllColors && !btnAllColors.disabled);
                        try {
                            console.log('[AutoMode] scan-loop (always): trigger All Colors =>', canClick);
                        } catch (_) {}
                        if (canClick) {
                            try {
                                btnAllColors.click();
                            } catch (_) {}
                        }
                        stopAutoModeScanLoop();
                        return;
                    }

                    const found = !!hasAcidOnScreenFast();
                    try {
                        console.log('[AutoMode] scan-loop detection:', found ? 'FOUND' : 'NONE');
                    } catch (_) {}
                    if (found) {
                        autoModeFocusSession = true;
                        const canClick = !!(btnAllColors && !btnAllColors.disabled);
                        try {
                            console.log('[AutoMode] scan-loop action: trigger All Colors =>', canClick);
                        } catch (_) {}
                        if (canClick) {
                            try {
                                btnAllColors.click();
                            } catch (_) {}
                        }
                        stopAutoModeScanLoop();
                        return;
                    }
                }

                const now2 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                if (now2 >= autoModeScanDeadline) {
                    try {
                        console.log('[AutoMode] scan-loop TIMEOUT');
                    } catch (_) {}
                    autoModeFocusSession = true;
                    stopAutoModeScanLoop();
                    return;
                }
            } catch (__) {
                autoModeFocusSession = true;
                stopAutoModeScanLoop();
            }
        }, AUTO_MODE_SCAN_INTERVAL_MS);
    }

    function stopAutoModeScanLoop() {
        try {
            if (autoModeScanTimer) {
                clearInterval(autoModeScanTimer);
                autoModeScanTimer = null;
            }
            autoModeScanDeadline = 0;

        } catch (_) {
            autoModeScanTimer = null;
            autoModeScanDeadline = 0;
        }
    }

    function stopAutoModeTimer() {
        try {
            if (autoModeTimer) {
                clearTimeout(autoModeTimer);
                autoModeTimer = null;
            }
            if (autoModeHoldCheckTimer) {
                clearInterval(autoModeHoldCheckTimer);
                autoModeHoldCheckTimer = null;
            }
            if (autoModeScanTimer) {
                clearInterval(autoModeScanTimer);
                autoModeScanTimer = null;
                autoModeScanDeadline = 0;
            }
            if (autoModePlainTimer) {
                clearInterval(autoModePlainTimer);
                autoModePlainTimer = null;
            }

        } catch (_) {
            autoModeTimer = null;
        }
    }


    try {
        window.addEventListener('focus', () => {
            try {
                if (!state?.ahkEnabled) return;
                autoModeFocusSession = false;
                if (state?.autoModeEnabled) startAutoModeTimer();
            } catch (_) {}
        });
        window.addEventListener('blur', () => {
            try {
                if (!state?.ahkEnabled) return;
                stopAutoModeTimer();
                autoModeFocusSession = false;
            } catch (_) {}
        });
    } catch (_) {}


    try {
        document.addEventListener('visibilitychange', () => {
            try {
                if (!state?.ahkEnabled) return;
                if (document.visibilityState !== 'visible') {
                    stopAutoModeTimer();
                    autoModeFocusSession = false;
                } else {
                    const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : true;
                    if (focused && state?.autoModeEnabled && !autoModeFocusSession) startAutoModeTimer();
                }
            } catch (_) {}
        });
    } catch (_) {}


    try {
        document.addEventListener('focusin', () => {
            try {
                if (!state?.ahkEnabled) return;
                autoModeFocusSession = false;
                if (state?.autoModeEnabled) startAutoModeTimer();
            } catch (_) {}
        });
        document.addEventListener('focusout', () => {
            try {
                if (!state?.ahkEnabled) return;
                stopAutoModeTimer();
                autoModeFocusSession = false;
            } catch (_) {}
        });
    } catch (_) {}

    let __acidRGBSet = null;
    let __lastAcidScanInfo = null;

    let __acidDynRGBSet = new Set();
    let __acidDynLastUpdate = 0;

    let ACID_RGB_TOLERANCE = 22;
    let ACID_STRIDE_MIN = 3;
    let ACID_STRIDE_MAX = 14;


    try {
        if (typeof state.scanTolerance !== 'number') state.scanTolerance = ACID_RGB_TOLERANCE | 0;
        if (typeof state.scanStrideMin !== 'number') state.scanStrideMin = ACID_STRIDE_MIN | 0;
        if (typeof state.scanStrideMax !== 'number') state.scanStrideMax = ACID_STRIDE_MAX | 0;
    } catch (_) {}

    function applyScanParamsFromState(silent) {
        try {
            let tol = Number(state.scanTolerance);
            let smin = Number(state.scanStrideMin);
            let smax = Number(state.scanStrideMax);
            if (!Number.isFinite(tol)) tol = 22;
            if (!Number.isFinite(smin)) smin = 3;
            if (!Number.isFinite(smax)) smax = 14;

            tol = Math.max(0, Math.min(96, Math.floor(tol)));
            smin = Math.max(1, Math.min(64, Math.floor(smin)));
            smax = Math.max(1, Math.min(64, Math.floor(smax)));
            if (smin > smax) {
                const tmp = smin;
                smin = smax;
                smax = tmp;
            }
            ACID_RGB_TOLERANCE = tol;
            ACID_STRIDE_MIN = smin;
            ACID_STRIDE_MAX = smax;
            try {
                if (!silent) console.log('[Settings] apply scan params', {
                    tol,
                    smin,
                    smax
                });
            } catch (_) {}
        } catch (_) {}
    }
    try {
        applyScanParamsFromState(true);
    } catch (_) {}

    function ensureAcidColorSet() {
        if (!__acidRGBSet) {
            try {
                __acidRGBSet = new Set((CV_FIXED_COLORS || []).map(c => `${c[0]},${c[1]},${c[2]}`));
            } catch (_) {
                __acidRGBSet = new Set();
            }
        }
    }

    function __acidDynAdd(r, g, b) {
        try {
            if (!__acidDynRGBSet) __acidDynRGBSet = new Set();

            if (__acidDynRGBSet.size > 4096) __acidDynRGBSet.clear();
            __acidDynRGBSet.add(`${r},${g},${b}`);
            __acidDynLastUpdate = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        } catch (_) {}
    }

    function __getActiveAcidSet() {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        if (__acidDynRGBSet && __acidDynRGBSet.size && (__acidDynLastUpdate && (now - __acidDynLastUpdate) <= 8000)) {
            return {
                set: __acidDynRGBSet,
                kind: 'dynamic'
            };
        }
        ensureAcidColorSet();
        return {
            set: __acidRGBSet || new Set(),
            kind: 'fixed'
        };
    }

    function hasAcidOnScreenFast() {
        try {
            const active = __getActiveAcidSet();
            const activeSet = active.set;
            if (!activeSet || activeSet.size === 0) return false;
            try {
                console.log('[AutoMode] scan: capturing screen…');
            } catch (_) {}
            const snap = captureScreenSnapshot();
            if (!snap) {
                try {
                    console.warn('[AutoMode] scan: snapshot unavailable');
                } catch (_) {}
                return false;
            }
            const data = snap.data.data;
            const w = snap.width | 0;
            const h = snap.height | 0;
            if (w <= 0 || h <= 0) return false;


            const toArray = (set) => {
                const arr = [];
                try {
                    for (const k of set) {
                        const [r, g, b] = k.split(',').map(n => (n | 0));
                        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) arr.push([r, g, b]);
                    }
                } catch (_) {}
                return arr;
            };

            let targetArray = toArray(activeSet);

            if (active.kind === 'dynamic' && targetArray.length <= 2) {
                ensureAcidColorSet();
                try {
                    targetArray = targetArray.concat(toArray(__acidRGBSet || new Set()));
                } catch (_) {}
            }
            if (targetArray.length === 0) return false;


            let s = Math.floor(Math.sqrt((w * h) / 40000));
            s = Math.max(ACID_STRIDE_MIN, Math.min(ACID_STRIDE_MAX, s));
            if (active.kind === 'dynamic') {

                s = Math.max(ACID_STRIDE_MIN, Math.floor(s * 0.75));
            }
            const approxSamples = Math.ceil((w / s)) * Math.ceil((h / s));
            __lastAcidScanInfo = {
                w,
                h,
                stride: s,
                approxSamples
            };
            try {
                console.log('[AutoMode] scan: size=', w, 'x', h, 'stride=', s, 'samples≈', approxSamples, 'set=', active.kind, 'setSize=', activeSet.size, 'tol=', ACID_RGB_TOLERANCE);
            } catch (_) {}


            const tol = ACID_RGB_TOLERANCE | 0;
            const matches = (r, g, b) => {
                for (let k = 0; k < targetArray.length; k++) {
                    const t = targetArray[k];
                    if (Math.abs(r - t[0]) <= tol && Math.abs(g - t[1]) <= tol && Math.abs(b - t[2]) <= tol) return true;
                }
                return false;
            };

            for (let y = 0; y < h; y += s) {
                const row = y * w * 4;
                for (let x = 0; x < w; x += s) {
                    const i = row + x * 4;
                    const r = data[i],
                        g = data[i + 1],
                        b = data[i + 2];
                    if (matches(r, g, b)) {
                        try {
                            console.log('[AutoMode] scan: match at', {
                                x,
                                y,
                                rgb: [r, g, b]
                            });
                        } catch (_) {}
                        return true;
                    }
                }
            }
            try {
                console.log('[AutoMode] scan: no improved colors found');
            } catch (_) {}
            return false;
        } catch (_) {
            return false;
        }
    }

    toolbarRow.append(btnAcc, btnLang, btnOpen, btnHistory, btnAcid, btnMarker, btnTopToggle, btnSettings, fileChip, progressChip, spacer, btnClear, btnClose);
    toolbarScroll.append(toolbarRow);
    const fadeL = el("div", "fade-edge fade-left");
    const fadeR = el("div", "fade-edge fade-right");
    toolbar.append(toolbarScroll, fadeL, fadeR);
    const sidebar = el("div", "sidebar");
    const sideHead = el("div", "side-head");
    const sideScroll = el("div", "side-scroll");
    const toolCol = el("div", "tool-col");
    const controlsSection = el("div", "side-section");
    const controlsTitle = el("div", "side-title", "Настройки");
    const controlsGrid = el("div", "side-grid");

    const delayWrap = el("div");
    const delayLbl = el("label", null, t("delay") + ":");
    const delayInp = numberInput("5");
    delayInp.style.width = "100%";
    const ms = el("span", null, "мс");
    ms.style.opacity = ".85";
    const btnStop = el("button", "btn icon stop");
    btnStop.title = t("stop");
    btnStop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>';
    delayWrap.append(delayLbl, delayInp, ms, btnStop);

    const autoColorChk = checkbox(true);
    autoColorChk.style.display = "none";

    try {
        rAuto.classList.toggle("active", true)
    } catch (_) {}

    const brushWrap = el("div");
    const brushChk = checkbox(!1);
    brushChk.style.display = "none";
    const sizeLbl = el("span", null, t("sizeLabel"));
    const brushSizeInp = numberInput("1");
    brushSizeInp.style.width = "80px";
    const activeChip = el("div", "chip", t("brushPrefix") + "—");
    brushWrap.append(sizeLbl, brushSizeInp, activeChip);
    try {
        brushWrap.style.display = "none";
    } catch (_) {}

    const palStat = chip("— " + t("colorsSuffix"));
    controlsGrid.append(delayWrap, brushWrap, palStat, autoColorChk, brushChk);

    const sfadeL = el("div", "side-fade-left");
    const sfadeR = el("div", "side-fade-right");
    sideHead.append(sideScroll, sfadeL, sfadeR);
    const sideBody = el("div", "palette-col");
    const panelHost = el("div", "panel-host");
    const railCol = el("div", "rail-col");
    const rail = el("div", "rail");

    const rClock = el("button", "rbtn");
    rClock.title = t("delay");
    rClock.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const rMove = el("button", "rbtn");
    rMove.title = t("moveModeTitle");
    rMove.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3V9M12 3L9 6M12 3L15 6M12 15V21M12 21L15 18M12 21L9 18M3 12H9M3 12L6 15M3 12L6 9M15 12H21M21 12L18 9M21 12L18 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const rBrush = el("button", "rbtn");
    rBrush.title = t("brush");
    rBrush.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 3L14 9M14 9L11 6M14 9L17 12M4 20c1.5 0 3-1 3.5-2.5S9 15 10.5 15 13 16.5 13 18 11.5 21 10 21 4 21 4 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    try {
        rBrush.style.display = "none";
    } catch (_) {}
    const rAuto = el("button", "rbtn");
    rAuto.title = t("autoSelectTitle");
    rAuto.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const rAccess = el("button", "rbtn danger");
    rAccess.title = t("giveAccess");
    rAccess.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const rStop = el("button", "rbtn stop");
    rStop.title = t("stop");
    rStop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>';
    const rCopy = el("button", "rbtn");
    rCopy.title = t("copyArt");
    rCopy.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.15179 15.85L21 4M12.3249 12L8.15 8.15M21 20L15 14.4669M9 6C9 7.65685 7.65685 9 6 9C4.34315 9 3 7.65685 3 6C3 4.34315 4.34315 3 6 3C7.65685 3 9 4.34315 9 6ZM9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    rail.append(rClock, rMove, rBrush, rAuto, rAccess, rStop, rCopy);
    railCol.append(rail);
    const palTitle = el("div", "side-title", t("palette"));
    const paletteEl = el("div", "palette");


    const btnAllColors = el("button", "btn");
    btnAllColors.textContent = "Все цвета";
    btnAllColors.title = "Автоматически выбрать и кликнуть все цвета";
    btnAllColors.style.margin = "6px 0 8px";
    btnAllColors.addEventListener("click", async () => {
        try {
            console.log('[AllColors] click: disabled=', btnAllColors.disabled, 'paletteSize=', state?.palette?.length ?? null);
        } catch (_) {}
        if (!state || !Array.isArray(state.palette) || !state.palette.length) {
            try {
                console.warn('[AllColors] guard: empty palette');
            } catch (_) {}
            return;
        }
        if (!isScreenCaptureReady()) {
            try {
                console.warn('[AllColors] guard: screen capture not ready');
            } catch (_) {}
            showHint(t('hintAccessRequired'), 2400);
            return;
        }
        if (btnAllColors.disabled) {
            try {
                console.log('[AllColors] guard: already disabled');
            } catch (_) {}
            return;
        }

        const prevAuto = !!autoColorChk?.checked;
        try {
            if (autoColorChk) autoColorChk.checked = true;
            try {
                if (rAuto) rAuto.classList.add("active");
            } catch (_) {}
        } catch (_) {}

        btnAllColors.disabled = true;
        try {
            state.bulkInProgress = true;
            console.log('[AllColors] bulkInProgress = true');
        } catch (_) {}
        try {
            console.log('[AllColors] start: items=', state.palette.length);
        } catch (_) {}
        state.bulkAbort = false;


        try {
            if (!isEditModeOpen()) {
                await clickUnderRedWhenReady(3000);
                await new Promise(r => setTimeout(r, 500));
            }
        } catch (_) {}

        const __palShuffled = Array.isArray(state.palette) ? state.palette.slice() : [];
        try {
            for (let i = __palShuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = __palShuffled[i];
                __palShuffled[i] = __palShuffled[j];
                __palShuffled[j] = tmp;
            }
        } catch (_) {}
        for (const c of __palShuffled) {
            if (state.bulkAbort) {
                try {
                    console.warn('[AllColors] abort requested (pre-iteration)');
                } catch (_) {}
                break;
            }

            try {
                if (isNoPaintPopupVisible()) {
                    try {
                        console.warn('[AllColors] abort: no-paint popup visible');
                    } catch (_) {}
                    state.bulkAbort = true;
                    break;
                }
            } catch (_) {}
            if (state.running) {
                try {
                    console.log('[AllColors] wait: run in progress, pausing before next color');
                } catch (_) {}
            }
            while (state.running && !state.bulkAbort) {
                await new Promise(r => setTimeout(r, 150));
            }
            if (state.bulkAbort) {
                try {
                    console.warn('[AllColors] abort requested (post-wait)');
                } catch (_) {}
                break;
            }

            try {
                if (isNoPaintPopupVisible()) {
                    try {
                        console.warn('[AllColors] abort: no-paint popup visible (post-wait)');
                    } catch (_) {}
                    state.bulkAbort = true;
                    break;
                }
            } catch (_) {}
            try {
                console.log('[AllColors] color:', c?.key ?? c?.name ?? c);
            } catch (_) {}


            let started = false;
            try {
                const sw = [...paletteEl.children].find(x => x?.dataset?.key === c.key);
                if (sw) {
                    try {
                        console.log('[AllColors] click swatch:', c?.key);
                    } catch (_) {}
                    sw.click();

                    for (let i = 0; i < 12 && !state.bulkAbort; i++) {
                        if (state.running) {
                            started = true;
                            break;
                        }
                        await new Promise(r => setTimeout(r, 80));
                    }
                }
            } catch (_) {}

            if (!started) {

                let picked = false;
                let selText = '';
                try {
                    selText = COLOR_NAME_MAP.get(c.key) || (c.hex || '').toUpperCase();
                    picked = await ensureEditModeAndPick(selText);
                } catch (_) {
                    picked = false;
                }
                if (!picked) {
                    try {
                        console.warn('[AllColors] fallback pick failed for', c?.key);
                    } catch (_) {}
                    continue;
                }

                let confirmed = false;
                for (let i = 0; i < 12 && !state.bulkAbort; i++) {
                    try {
                        const b = document.querySelector(`button[aria-label="${selText}"]`);
                        if (b && b.querySelector('svg')) {
                            confirmed = true;
                            break;
                        }
                    } catch (_) {}
                    await new Promise(r => setTimeout(r, 80));
                }
                if (!confirmed && !state.bulkAbort) {
                    try {
                        await ensureEditModeAndPick(selText);
                    } catch (_) {}
                    await new Promise(r => setTimeout(r, 160));
                }

                if (state.bulkAbort) break;
                if (!isScreenCaptureReady()) {
                    try {
                        console.warn('[AllColors] guard during run: screen capture not ready');
                    } catch (_) {}
                    try {
                        showHint(t('hintAccessRequired'), 2400);
                    } catch (_) {}
                    break;
                }
                try {
                    await startPreciseCalibration();
                } catch (_) {}

                while (state.running && !state.bulkAbort) {
                    await new Promise(r => setTimeout(r, 100));
                }
                if (state.bulkAbort) break;

                try {
                    console.log('[AllColors] startAutoClick for', c?.key);
                } catch (_) {}
                startAutoClick(c);
            }


            while (state.running && !state.bulkAbort) {
                await new Promise(r => setTimeout(r, 150));
            }

            if (state.bulkAbort) break;


            try {
                const d = Math.max(0, Math.round(Number(delayInp?.value) || 0));
                if (d > 0) await new Promise(r => setTimeout(r, d));
            } catch (_) {}
        }

        try {
            console.log('[AllColors] finish');
        } catch (_) {}

        try {
            if (!prevAuto && autoColorChk) autoColorChk.checked = false;
            try {
                if (!prevAuto && rAuto) rAuto.classList.remove("active");
            } catch (_) {}
        } catch (_) {}

        try {
            if (state.bulkAbort) {
                try {
                    console.log('[AllColors] abort: clicking under red marker (fast)');
                } catch (_) {}
                await clickUnderRedWhenReady(2000);
            } else {
                await clickUnderRedWhenReady(2000);
            }
        } catch (_) {}

        try {
            clickCloseEditIfPresent();
        } catch (_) {}
        try {
            state.bulkInProgress = false;
            console.log('[AllColors] bulkInProgress = false');
        } catch (_) {}
        state.bulkAbort = false;
        btnAllColors.disabled = false;
        try {
            console.log('[AllColors] done: button re-enabled');
        } catch (_) {}
    });

    sideBody.append(panelHost, btnAllColors, paletteEl);

    const railBrushPanel = el("div", "rail-panel");
    const railBrushBody = el("div", "panel-body");
    const railBrushSize = numberInput(String(1));
    railBrushSize.className = "rail-input";
    railBrushBody.append(railBrushSize);
    railBrushPanel.append(railBrushBody);
    rBrush.insertAdjacentElement('afterend', railBrushPanel);
    try {
        railBrushPanel.style.display = "none";
    } catch (_) {}

    const railDelayPanel = el("div", "rail-panel");
    const railDelayBody = el("div", "panel-body");
    const railDelayInp = numberInput("5");
    railDelayInp.className = "rail-input";
    railDelayBody.append(railDelayInp);
    railDelayPanel.append(railDelayBody);
    rClock.insertAdjacentElement('afterend', railDelayPanel);
    const sideFoot = el("div", "side-foot");
    const footSection = el("div", "side-section");
    const runStat = el("div", "stat", "—/—");
    footSection.append(runStat);
    toolCol.append(footSection);
    sidebar.append(sideBody, railCol);

    shadow.append(toolbar, sidebar, fileInput, brushCursor);
    const hoverTip = el("div", "hover-tip");
    shadow.append(hoverTip);
    const accTip = el("div", "acc-tip");
    shadow.append(accTip);

    function deepFindKey(obj, key) {
        try {
            if (!obj || typeof obj !== 'object') return null;
            if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (v && typeof v === 'object') {
                    const found = deepFindKey(v, key);
                    if (found != null) return found;
                }
            }
        } catch (_) {}
        return null;
    }

    function readNum(val) {
        return (val == null) ? null : (typeof val === 'number' && !Number.isNaN(val)) ? val : (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(+val)) ? (+val) : null;
    }

    function normalizeKeyName(k) {
        try {
            return String(k).replace(/[^a-z0-9]+/gi, '').toLowerCase();
        } catch (_) {
            return String(k || '');
        }
    }

    function deepPickNumberFlex(obj, names) {
        const wanted = names.map(normalizeKeyName);
        const visit = (node) => {
            if (!node || typeof node !== 'object') return null;
            for (const [k, v] of Object.entries(node)) {
                const nk = normalizeKeyName(k);
                if (wanted.includes(nk)) {
                    const num = readNum(v);
                    if (num != null) return num;
                }
                if (v && typeof v === 'object') {
                    const found = visit(v);
                    if (found != null) return found;
                }
            }
            return null;
        };
        return visit(obj);
    }

    function levelValueToPercent(val) {
        const n = readNum(val);
        if (n == null) return null;
        const base = Math.floor(n);
        const frac = n - base;
        return Math.max(0, Math.min(100, frac * 100));
    }

    function computePixelsToNextLevel(s) {
        try {
            const current = deepPickNumberFlex(s, [
                'pixelsPainted', 'pixels', 'totalPixels', 'paintedPixels',
                'pixels_painted', 'total_pixels', 'painted_pixels', 'total_placed', 'pixel_count', 'placed'
            ]);
            const directRemain = deepPickNumberFlex(s, [
                'pixelsToNextLevel', 'pixelsRemaining', 'remainingPixels', 'toNextPixels',
                'pixels_to_next_level', 'pixels_remaining', 'remaining_pixels', 'to_next_pixels', 'pixels_until_next_level', 'remaining_to_next_level'
            ]);
            const target = deepPickNumberFlex(s, [
                'nextLevelPixels', 'nextLevelAt', 'nextLevelThreshold', 'nextLevelGoal', 'levelGoal', 'levelNextRequirement', 'nextLevelRequiredPixels',
                'next_level_pixels', 'next_level_at', 'next_level_threshold', 'next_level_goal', 'level_goal', 'level_next_requirement', 'next_level_required_pixels', 'pixels_total_for_next_level'
            ]);

            let remainFloat = null;
            if (directRemain != null) {
                remainFloat = directRemain;
            } else if (__accRemainEst != null) {
                remainFloat = __accRemainEst;
            } else {

                const lvlRaw = readNum(deepFindKey(s, 'level'));
                if (__accPerPixelLevel != null && __accPerPixelLevel > 0 && lvlRaw != null) {
                    const pct = levelValueToPercent(lvlRaw);
                    const remPct = 100 - pct;
                    const est = remPct / __accPerPixelLevel;
                    if (isFinite(est) && est >= 0) remainFloat = est;
                } else if (current != null && target != null) {
                    remainFloat = target - current;
                }
            }


            let remainInt = (remainFloat != null) ? Math.max(0, Math.ceil(remainFloat)) : null;


            const pxNow = current;
            if (__accLastRemainInt != null && __accLastPxCount != null && pxNow != null) {
                const dPx = pxNow - __accLastPxCount;
                if (remainInt != null) {
                    if (dPx > 0) remainInt = Math.max(0, Math.min(remainInt, __accLastRemainInt - dPx));
                } else {

                    if (dPx > 0) remainInt = Math.max(0, __accLastRemainInt - dPx);
                }
            }
            if (pxNow != null) __accLastPxCount = pxNow;
            if (remainInt != null) __accLastRemainInt = remainInt;
            return remainInt;
        } catch (_) {
            return null;
        }
    }

    function renderAccTip() {
        accTip.innerHTML = '';
        const title = el('div', 'title', t('accountStatsTitle'));
        accTip.appendChild(title);
        if (!__accStats) {
            const msg = el('div', 'muted', t('accountStatsSendPixelPrompt'));
            accTip.appendChild(msg);
            return;
        }
        const s = __accStats;
        const nameVal = deepFindKey(s, 'name') ?? '—';
        const chargesObj = deepFindKey(s, 'charges');
        const chargesMax = (chargesObj && typeof chargesObj === 'object') ? deepFindKey(chargesObj, 'max') : null;
        const dropletsVal = deepFindKey(s, 'droplets');
        const pixelsPaintedVal = deepFindKey(s, 'pixelsPainted');
        const levelRaw = readNum(deepFindKey(s, 'level'));
        const levelInt = (levelRaw != null) ? Math.floor(Number(levelRaw)) : null;
        const levelPct = (levelRaw != null) ? levelValueToPercent(levelRaw) : null;
        const rows = [
            [t('accName'), String(nameVal ?? '—')],
            [t('accChargesMax'), (chargesMax != null) ? String(chargesMax) : '—'],
            [t('accDroplets'), (dropletsVal != null) ? String(dropletsVal) : '—'],
            [t('accPixels'), (pixelsPaintedVal != null) ? String(pixelsPaintedVal) : '—'],
            [t('accLevel'), (levelInt != null && levelPct != null) ? (`${levelInt} (${levelPct.toFixed(1)}%)`) : (levelInt != null ? String(levelInt) : '—')]
        ];
        for (const [k, v] of rows) {
            const row = el('div', 'row');
            row.append(el('div', null, k), el('div', null, v));
            accTip.appendChild(row);
        }
        const needed = computePixelsToNextLevel(s);
        const msg = (needed != null) ?
            `${t('accPixelsToNext')}: ${needed}` :
            t('accPixelsToNextUnknown');
        accTip.appendChild(el('div', 'muted', msg));
    }

    function positionAccTip(btn) {
        try {
            const r = btn.getBoundingClientRect();
            const pad = 8;
            accTip.style.left = Math.max(8, Math.min(window.innerWidth - 300, r.left)) + 'px';
            accTip.style.top = Math.max(8, r.bottom + pad) + 'px';
        } catch {}
    }
    let accTipTimer = null;

    function showAccTip() {
        renderAccTip();
        positionAccTip(btnAcc);
        accTip.style.display = 'block';
    }

    function hideAccTip() {
        accTip.style.display = 'none';
    }
    btnAcc.addEventListener('mouseenter', () => {
        if (accTipTimer) clearTimeout(accTipTimer);
        showAccTip();
    });
    btnAcc.addEventListener('mouseleave', () => {
        accTipTimer = setTimeout(hideAccTip, 120);
    });
    accTip.addEventListener('mouseenter', () => {
        if (accTipTimer) clearTimeout(accTipTimer);
    });
    accTip.addEventListener('mouseleave', () => {
        hideAccTip();
    });
    hookNetworkForAccountStats();

    function applyLanguage() {
        try {
            btnOpen.title = t("open");
        } catch {}
        try {
            btnCopyArt.title = t("copyArt");
        } catch {}
        try {
            btnMove.title = t("moveModeTitle");
        } catch {}
        try {
            btnAcid.title = t("acidToggleTitle");
        } catch {}
        try {
            snapLabel.textContent = t("snap");
        } catch {}
        try {
            btnClose.title = t("close");
        } catch {}
        try {
            btnHistory.title = t("history");
        } catch {}
        try {
            btnAcc.title = t("accountStatsTitle");
        } catch {}
        try {
            btnLang.title = t("selectLanguageTitle");
        } catch {}
        try {
            delayLbl.textContent = t("delay") + ":";
        } catch {}
        try {
            btnStop.title = t("stop");
        } catch {}
        try {
            sizeLbl.textContent = t("sizeLabel");
        } catch {}
        try {
            activeChip.textContent = t("brushPrefix") + "—";
        } catch {}
        try {
            palStat.textContent = "— " + t("colorsSuffix");
        } catch {}
        try {
            rClock.title = t("delay");
        } catch {}
        try {
            rMove.title = t("moveModeTitle");
        } catch {}
        try {
            rBrush.title = t("brush");
        } catch {}
        try {
            rAuto.title = t("autoSelectTitle");
        } catch {}
        try {
            rAccess.title = t("giveAccess");
        } catch {}
        try {
            rStop.title = t("stop");
        } catch {}
        try {
            rCopy.title = t("copyArt");
        } catch {}
        try {
            palTitle.textContent = t("palette");
        } catch {}
        try {
            if (accTip && accTip.style.display !== 'none') renderAccTip();
        } catch {}
    }

    function showStartupModal() {
        try {
            const back = el("div", "access-backdrop");
            const modal = el("div", "access-modal");
            const head = el("div", "access-head");
            const title = el("div", "access-title", t("startupTitle"));
            head.append(title);
            const body = el("div", "access-body");
            const controls = el("div", "access-controls");
            const msg = document.createElement("div");
            msg.style.opacity = ".95";
            msg.style.lineHeight = "1.4";
            msg.textContent = t("startupBody");
            controls.append(msg);
            body.append(controls);
            const foot = el("div", "access-foot");
            const spacer = el("div", "spacer");
            const btnOk = el("button", "btn primary", t("giveAccess"));
            btnOk.addEventListener("click", async () => {
                btnOk.disabled = true;
                let ok = false;
                try {
                    ok = await ensureScreenCapture();
                } catch (_) {}
                if (ok) {
                    try {
                        shadow.removeChild(back);
                    } catch (_) {}
                } else {
                    btnOk.disabled = false;
                }
            });
            foot.append(spacer, btnOk);
            modal.append(head, body, foot);
            back.append(modal);
            shadow.append(back);
        } catch (_) {}
    }

    try {
        window.__OVERLAY_STARTUP_TIMER__ = setTimeout(() => {
            try {
                if (!isScreenCaptureReady()) showStartupModal();
            } catch (_) {
                showStartupModal();
            }
        }, 0);
    } catch (_) {}
    const state = {
        x: 80,
        y: 140,
        w: 320,
        h: 240,
        barH: 48,
        barGap: 8,
        opacity: .85,
        transparencyOn: !0,
        moveMode: !1,
        dragging: !1,
        start: {
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            w: 0,
            h: 0,
            pointerId: null
        },
        captureEl: null,
        iw: 0,
        ih: 0,
        imageData: null,
        palette: [],
        positionsCache: new Map(),
        posSetCache: new Map(),
        paintedByColor: new Map(),
        running: null,

        bulkInProgress: false,
        brushMode: !1,
        brushSize: 1,
        isBrushing: !1,
        activeColor: null,
        activeSwatch: null,
        currentURL: null,
        currentFileName: null,
        lastTileURL: null,

        selectedImageBitmap: null,
        selectedImageSize: {
            w: 0,
            h: 0
        },
        refSet: false,
        refX: 0,
        refY: 0,
        anchorSet: false,
        anchorTx: 0,
        anchorTy: 0,
        anchorPx: 0,
        anchorPy: 0,
        delayPanelOpen: !1,
        snapGrid: null,

        gridOffsetXSteps: 0,
        gridOffsetYSteps: 0,

        mapPan: {
            active: false,
            pointerId: null,
            lastX: 0,
            lastY: 0
        },

        markerVisible: false,
        markerX: 200,
        markerY: 200,

        acidModeEnabled: false,
        ahkEnabled: false,
        suppressAutoMoveOnce: false,
        history: [],
        historyPopupEl: null,
        bulkAbort: false,
        _rafMove: null
    };
    const HISTORY_KEY = 'bm_history';
    const PERSIST_KEY = 'bm_persist';
    const MARKER_KEY = 'bm_marker';
    const LAST_IMG_KEY = 'bm_last_image_v1';

    function markerPersistSave() {
        try {
            const data = {
                x: Number(state.markerX) || 0,
                y: Number(state.markerY) || 0,
                visible: !!state.markerVisible
            };
            localStorage.setItem(MARKER_KEY, JSON.stringify(data));
        } catch (_) {}
    }

    function markerPersistLoad() {
        try {
            const raw = localStorage.getItem(MARKER_KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            return (obj && typeof obj === 'object') ? obj : null;
        } catch (_) {
            return null;
        }
    }

    try {
        const mp = markerPersistLoad();
        if (mp) {
            if (Number.isFinite(mp.x)) state.markerX = Number(mp.x);
            if (Number.isFinite(mp.y)) state.markerY = Number(mp.y);
            if (typeof mp.visible === 'boolean') state.markerVisible = !!mp.visible;
        }
        try {
            ensureMarkerInBounds();
        } catch (_) {}
        try {
            updateMarkerPos();
        } catch (_) {}
        try {
            dragMarker.style.display = state.markerVisible ? 'block' : 'none';
        } catch (_) {}
        try {
            btnMarker.classList.toggle('active', state.markerVisible);
        } catch (_) {}
    } catch (_) {}

    try {
        window.__OVERLAY_BEFOREUNLOAD__ = () => {
            try {
                markerPersistSave();
            } catch (_) {}
            try {
                persistSave();
            } catch (_) {}
        };
        window.addEventListener('beforeunload', window.__OVERLAY_BEFOREUNLOAD__);
    } catch (_) {}

    function historyIdOf(fileName, w, h) {
        return `${fileName}__${w}x${h}`
    }

    function historyLoad() {
        try {
            const out = [];
            const pushMany = (arr) => {
                if (!Array.isArray(arr)) return;
                for (const e of arr)
                    if (e && typeof e === 'object') out.push(e);
            };
            const tryParse = (s) => {
                try {
                    return JSON.parse(s);
                } catch {
                    return null;
                }
            };

            let raw = localStorage.getItem(HISTORY_KEY);
            if (raw) {
                const parsed = tryParse(raw);
                if (Array.isArray(parsed)) pushMany(parsed);
                else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.history)) pushMany(parsed.history);
                    if (Array.isArray(parsed.items)) pushMany(parsed.items);
                    else pushMany(Object.values(parsed));
                }
            }


            if (out.length === 0) {
                try {
                    const len = Number(localStorage.length) || 0;
                    for (let i = 0; i < len; i++) {
                        const k = localStorage.key(i);
                        if (!k || !/history/i.test(k)) continue;
                        const cand = localStorage.getItem(k);
                        if (!cand) continue;
                        const parsed = tryParse(cand);
                        if (!parsed) continue;
                        if (Array.isArray(parsed)) pushMany(parsed);
                        else if (parsed && typeof parsed === 'object') {
                            if (Array.isArray(parsed.history)) pushMany(parsed.history);
                            if (Array.isArray(parsed.items)) pushMany(parsed.items);
                            else pushMany(Object.values(parsed));
                        }
                    }
                } catch (_) {}
            }


            const map = new Map();
            for (const e of out) {
                const id = e && e.id ? String(e.id) : (e && e.fileName && e.w && e.h ? historyIdOf(e.fileName, e.w, e.h) : null);
                if (!id) continue;
                const rec = {
                    id,
                    fileName: e.fileName,
                    w: Number(e.w) || 0,
                    h: Number(e.h) || 0,
                    x: Number.isFinite(e.x) ? e.x : undefined,
                    y: Number.isFinite(e.y) ? e.y : undefined,
                    tx: Number.isFinite(e.tx) ? e.tx : undefined,
                    ty: Number.isFinite(e.ty) ? e.ty : undefined,
                    px: Number.isFinite(e.px) ? e.px : undefined,
                    py: Number.isFinite(e.py) ? e.py : undefined,

                    markerX: Number.isFinite(e.markerX) ? e.markerX : undefined,
                    markerY: Number.isFinite(e.markerY) ? e.markerY : undefined,
                    markerVisible: (typeof e.markerVisible === 'boolean') ? !!e.markerVisible : undefined,
                    ts: Number(e.ts) || 0
                };
                map.set(id, rec);
            }
            const list = Array.from(map.values())
                .filter(e => e.fileName && e.w && e.h)
                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                .slice(0, 10);
            state.history = list;
        } catch (_) {
            state.history = [];
        }
    }

    function historySave() {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify((state.history || []).slice(0, 10)))
        } catch (_) {}
    }

    function historyAddOrUpdate(entry) {
        try {
            if (!entry || !entry.fileName) return;
            const w = entry.w || state.iw || 0;
            const h = entry.h || state.ih || 0;
            if (!w || !h) return;
            const id = historyIdOf(entry.fileName, w, h);
            const list = Array.isArray(state.history) ? state.history.slice() : [];
            const idx = list.findIndex(e => e && e.id === id);
            const existing = idx >= 0 ? list[idx] : null;
            const rec = {
                id,
                fileName: entry.fileName,
                w,
                h,

                x: (entry.x != null) ? entry.x : (existing && existing.x != null ? existing.x : state.x),
                y: (entry.y != null) ? entry.y : (existing && existing.y != null ? existing.y : state.y),

                tx: Number.isFinite(entry.tx) ? entry.tx : (
                    (state.anchorSet && Number.isFinite(state.anchorTx)) ? state.anchorTx : (existing && Number.isFinite(existing.tx) ? existing.tx : undefined)
                ),
                ty: Number.isFinite(entry.ty) ? entry.ty : (
                    (state.anchorSet && Number.isFinite(state.anchorTy)) ? state.anchorTy : (existing && Number.isFinite(existing.ty) ? existing.ty : undefined)
                ),
                px: Number.isFinite(entry.px) ? entry.px : (
                    (state.anchorSet && Number.isFinite(state.anchorPx)) ? state.anchorPx : (existing && Number.isFinite(existing.px) ? existing.px : undefined)
                ),
                py: Number.isFinite(entry.py) ? entry.py : (
                    (state.anchorSet && Number.isFinite(state.anchorPy)) ? state.anchorPy : (existing && Number.isFinite(existing.py) ? existing.py : undefined)
                ),

                markerX: Number.isFinite(entry.markerX) ? entry.markerX : (existing && Number.isFinite(existing.markerX) ? existing.markerX : (Number.isFinite(state.markerX) ? state.markerX : undefined)),
                markerY: Number.isFinite(entry.markerY) ? entry.markerY : (existing && Number.isFinite(existing.markerY) ? existing.markerY : (Number.isFinite(state.markerY) ? state.markerY : undefined)),
                markerVisible: (typeof entry.markerVisible === 'boolean') ? !!entry.markerVisible : (existing && typeof existing.markerVisible === 'boolean' ? !!existing.markerVisible : (typeof state.markerVisible === 'boolean' ? !!state.markerVisible : undefined)),

                ts: Date.now()
            };
            if (idx >= 0) list.splice(idx, 1);
            list.unshift(rec);
            state.history = list.slice(0, 10);
            historySave();
        } catch (_) {}
    }

    function confirmModal(title, body, okLabel, cancelLabel) {
        return new Promise((resolve) => {
            try {
                const back = el('div', 'confirm-back');
                const pop = el('div', 'confirm-pop');
                const head = el('div', 'confirm-head');
                const ttl = el('div', 'confirm-title', String(title || ''));
                const btnX = el('button', 'btn icon', '✕');
                btnX.title = t('close') || 'Close';
                btnX.addEventListener('click', () => cleanup(false));
                head.append(ttl, btnX);
                const b = el('div', 'confirm-body', String(body || ''));
                const foot = el('div', 'confirm-foot');
                const spacer = el('div', 'spacer');
                const btnCancel = el('button', 'btn', cancelLabel || t('cancel'));
                const btnOk = el('button', 'btn primary', okLabel || t('ok'));
                btnCancel.addEventListener('click', () => cleanup(false));
                btnOk.addEventListener('click', () => cleanup(true));
                foot.append(spacer, btnCancel, btnOk);
                pop.append(head, b, foot);
                back.append(pop);
                shadow.append(back);

                function onKey(e) {
                    if (e.key === 'Escape') cleanup(false);
                }

                function onDown(e) {
                    try {
                        const path = e.composedPath ? e.composedPath() : [];
                        if (path.includes(pop)) return;
                    } catch (_) {
                        if (e.target && pop.contains(e.target)) return;
                    }
                    cleanup(false);
                }
                window.addEventListener('keydown', onKey, true);
                window.addEventListener('pointerdown', onDown, true);

                try {
                    btnOk.focus();
                } catch (_) {}

                function cleanup(v) {
                    window.removeEventListener('keydown', onKey, true);
                    window.removeEventListener('pointerdown', onDown, true);
                    try {
                        back.remove();
                    } catch (_) {}
                    resolve(!!v);
                }
            } catch (_) {
                resolve(false);
            }
        });
    }


    function choiceModal(title, body, buttons) {
        return new Promise((resolve) => {
            try {
                const back = el('div', 'confirm-back');
                const pop = el('div', 'confirm-pop');
                const head = el('div', 'confirm-head');
                const ttl = el('div', 'confirm-title', String(title || ''));
                const btnX = el('button', 'btn icon', '✕');
                btnX.title = (t('close') || 'Close');
                btnX.addEventListener('click', () => cleanup(null));
                head.append(ttl, btnX);
                const b = el('div', 'confirm-body', String(body || ''));
                const foot = el('div', 'confirm-foot');
                const spacer = el('div', 'spacer');
                foot.append(spacer);
                const btns = Array.isArray(buttons) ? buttons : [];
                btns.forEach((def) => {
                    const cls = (def && def.className) ? ('btn ' + def.className) : 'btn';
                    const label = (def && def.label) || 'OK';
                    const val = def && (def.value !== undefined ? def.value : label);
                    const bEl = el('button', cls, label);
                    bEl.addEventListener('click', () => cleanup(val));
                    foot.append(bEl);
                });
                pop.append(head, b, foot);
                back.append(pop);
                shadow.append(back);

                function onKey(e) {
                    if (e.key === 'Escape') cleanup(null);
                }

                function onDown(e) {
                    try {
                        const path = e.composedPath ? e.composedPath() : [];
                        if (path.includes(pop)) return;
                    } catch (_) {
                        if (e.target && pop.contains(e.target)) return;
                    }
                    cleanup(null);
                }
                window.addEventListener('keydown', onKey, true);
                window.addEventListener('pointerdown', onDown, true);

                function cleanup(v) {
                    window.removeEventListener('keydown', onKey, true);
                    window.removeEventListener('pointerdown', onDown, true);
                    try {
                        back.remove();
                    } catch (_) {}
                    resolve(v);
                }
            } catch (_) {
                resolve(null);
            }
        });
    }


    function applyHistoryPlacement(it) {
        const hasT = Number.isFinite(it.tx) && Number.isFinite(it.ty) && Number.isFinite(it.px) && Number.isFinite(it.py);
        try {
            dbg('applyHistoryPlacement', {
                hasT,
                it
            });
        } catch (_) {}
        if (hasT) {
            state.anchorTx = it.tx;
            state.anchorTy = it.ty;
            state.anchorPx = it.px;
            state.anchorPy = it.py;
            state.anchorSet = true;

            state.anchorProvisional = false;
            state.localAnchorTx = undefined;
            state.localAnchorTy = undefined;
            state.localAnchorPx = undefined;
            state.localAnchorPy = undefined;
            state.__anchorAdjusted = true;
            const g = computeSnapGrid();
            if (g) {
                const globalX = it.tx * TILE_SIZE + it.px;
                const globalY = it.ty * TILE_SIZE + it.py;
                state.x = Math.round(g.baseX + globalX * g.stepX);
                state.y = Math.round(g.baseY + globalY * g.stepY);
                computeGridOffsetsFromXY();
            }
        } else {
            state.x = it.x;
            state.y = it.y;
            computeGridOffsetsFromXY();

            try {
                deriveAnchorFromCurrentXY();
            } catch (_) {}
        }

        try {
            if (Number.isFinite(it.markerX)) state.markerX = Number(it.markerX);
            if (Number.isFinite(it.markerY)) state.markerY = Number(it.markerY);
            if (typeof it.markerVisible === 'boolean') state.markerVisible = !!it.markerVisible;
            try {
                ensureMarkerInBounds();
            } catch (_) {}
            try {
                dragMarker.style.display = state.markerVisible ? 'block' : 'none';
            } catch (_) {}
            try {
                btnMarker.classList.toggle('active', state.markerVisible);
            } catch (_) {}
            try {
                updateMarkerPos();
            } catch (_) {}
            try {
                markerPersistSave();
            } catch (_) {}
        } catch (_) {}
        try {
            syncUI();
        } catch (_) {}
        try {
            persistSave();
        } catch (_) {}

        try {
            if (state.currentFileName && state.iw && state.ih) {
                historyAddOrUpdate({
                    fileName: state.currentFileName,
                    w: state.iw,
                    h: state.ih,
                    x: state.x,
                    y: state.y,
                    tx: state.anchorTx,
                    ty: state.anchorTy,
                    px: state.anchorPx,
                    py: state.anchorPy
                });
            }
        } catch (_) {}
        try {
            if (typeof hint !== 'undefined' && hint) hint.style.display = 'none';
            if (typeof placeState !== 'undefined' && placeState && placeState.active) {
                placeState.active = false;
                if (placeState.onDocClick) {
                    document.removeEventListener('mousedown', placeState.onDocClick, true);
                    placeState.onDocClick = null;
                }
                if (placeState.onImageClick) {
                    try {
                        img.removeEventListener('click', placeState.onImageClick);
                    } catch (_) {}
                    placeState.onImageClick = null;
                }
            }
            try {
                content.style.pointerEvents = 'auto';
            } catch (_) {}
            try {
                setMoveMode(false);
            } catch (_) {}
        } catch (_) {}
        try {
            if (state.currentFileName && state.iw && state.ih) {
                historyAddOrUpdate({
                    fileName: state.currentFileName,
                    w: state.iw,
                    h: state.ih,
                    x: state.x,
                    y: state.y,
                    tx: state.anchorTx,
                    ty: state.anchorTy,
                    px: state.anchorPx,
                    py: state.anchorPy
                });
            }
        } catch (_) {}
    }


    function selectFileAndLoad(expectedName) {
        return new Promise((resolve) => {
            try {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = 'image/*';
                inp.style.display = 'none';
                shadow.append(inp);
                inp.addEventListener('change', async (e) => {
                    const f = e.target.files && e.target.files[0];
                    try {
                        inp.remove();
                    } catch (_) {}
                    if (!f) {
                        resolve(false);
                        return;
                    }

                    if (expectedName && f.name && f.name !== expectedName) {
                        const msg = (t('selectedFileDiffers') || 'Selected file “{file}” differs from “{expected}”.')
                            .replace('{file}', String(f.name || ''))
                            .replace('{expected}', String(expectedName || ''));
                        const cont = await confirmModal((t('history') || 'History'), msg, (t('continue') || 'Continue'), (t('cancel') || 'Cancel'));
                        if (!cont) {
                            resolve(false);
                            return;
                        }
                    }
                    try {
                        state.suppressAutoMoveOnce = true;
                        const res = await openPixelArtDialog(f);
                        const ok = !!(res && res.action && res.action !== 'cancel');
                        if (!ok) {
                            state.suppressAutoMoveOnce = false;
                        }
                        resolve(ok);
                    } catch (_) {
                        state.suppressAutoMoveOnce = false;
                        resolve(false);
                    }
                }, {
                    once: true
                });
                inp.click();
            } catch (_) {
                resolve(false);
            }
        });
    }

    function openHistoryModal() {
        try {
            if (state.historyPopupEl) {
                closeHistoryModal();
                return;
            }
            const pop = el('div', 'history-pop');
            const ttl = el('div', 'history-title', t('history'));
            const controls = el('div', 'history-controls');
            const btnClear = el('button', 'btn icon danger');
            btnClear.title = (t('clear') || 'Clear') + ' history';
            btnClear.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
            btnClear.addEventListener('click', async () => {
                const ok = await confirmModal(t('history'), 'Clear saved history?', t('clear'), t('cancel'));
                if (!ok) return;
                try {
                    state.history = [];
                    historySave();
                } catch (_) {}
                try {
                    closeHistoryModal();
                } catch (_) {}
                try {
                    openHistoryModal();
                } catch (_) {}
            });
            controls.append(btnClear);
            const list = el('div', 'history-list');
            const items = Array.isArray(state.history) ? state.history : [];
            if (!items.length) {
                list.append(el('div', 'history-empty', t('historyEmpty')));
            } else {
                items.forEach((it) => {
                    const row = el('div', 'history-row');
                    const hasT = Number.isFinite(it.tx) && Number.isFinite(it.ty) && Number.isFinite(it.px) && Number.isFinite(it.py);
                    const coordStr = hasT ? `t${it.tx}/${it.ty} @ (${it.px}, ${it.py})` : `(${it.x}, ${it.y})`;
                    row.title = `${it.fileName} — ${it.w}×${it.h} • ${coordStr}`;
                    const left = el('div', 'history-left');
                    const titleLine = el('div', 'h-title', it.fileName);
                    const subLine = el('div', 'h-sub', `${it.w}×${it.h} • ${coordStr}`);
                    left.append(titleLine, subLine);
                    row.append(left);
                    row.addEventListener('click', async () => {
                        const hasImg = !!state.currentFileName;
                        if (!hasImg) {

                            const ok = await selectFileAndLoad(it.fileName);
                            if (ok) {
                                try {
                                    applyHistoryPlacement(it);
                                } catch (_) {}
                                closeHistoryModal();
                            }
                            return;
                        }
                        const sameFile = (state.currentFileName === it.fileName && state.iw === it.w && state.ih === it.h);
                        if (sameFile) {
                            try {
                                applyHistoryPlacement(it);
                            } catch (_) {}
                            closeHistoryModal();
                            return;
                        }

                        const choice = await choiceModal(
                            (t('mismatchTitle') || 'Different image detected'),
                            (t('mismatchBody') || 'The currently loaded image is different from this history entry.'),
                            [{
                                    label: (t('useCurrentFile') || 'Use Current File'),
                                    className: '',
                                    value: 'use'
                                },
                                {
                                    label: (t('loadOriginalFile') || 'Load Original File'),
                                    className: 'primary',
                                    value: 'load'
                                },
                                {
                                    label: (t('cancel') || 'Cancel'),
                                    className: 'danger',
                                    value: 'cancel'
                                }
                            ]
                        );
                        if (choice === 'use') {
                            try {
                                applyHistoryPlacement(it);
                            } catch (_) {}
                            closeHistoryModal();
                        } else if (choice === 'load') {
                            const ok = await selectFileAndLoad(it.fileName);
                            if (ok) {
                                try {
                                    applyHistoryPlacement(it);
                                } catch (_) {}
                                closeHistoryModal();
                            }
                        } else {

                            return;
                        }
                    });
                    list.append(row);
                });
            }
            const head = el('div', 'history-head');
            head.append(ttl, controls);
            pop.append(head, list);
            shadow.append(pop);


            try {
                const r = btnHistory.getBoundingClientRect();
                const vw = window.innerWidth || document.documentElement.clientWidth || 1920;
                const vh = window.innerHeight || document.documentElement.clientHeight || 1080;
                const pb = pop.getBoundingClientRect();
                const margin = 8;
                let left = Math.max(margin, Math.min(vw - pb.width - margin, r.left));
                let top = Math.min(vh - pb.height - margin, r.bottom + 10);
                pop.style.left = left + 'px';
                pop.style.top = top + 'px';
                const hx = Math.max(24, Math.min(pb.width - 24, r.left + r.width / 2 - left));
                pop.style.setProperty('--hx', hx + 'px');
            } catch (_) {}

            state.historyPopupEl = pop;

            function onDocDown(e) {
                try {
                    const path = e.composedPath ? e.composedPath() : [];
                    if (path.includes(pop) || path.includes(btnHistory)) return;
                } catch (_) {
                    if (e.target && (pop.contains(e.target) || btnHistory.contains(e.target))) return;
                }
                closeHistoryModal();
            }

            function onKey(e) {
                if (e.key === 'Escape') closeHistoryModal();
            }

            function onRelayout() {
                try {
                    if (state.historyPopupEl) {
                        closeHistoryModal();
                    }
                } catch (_) {}
            }
            window.addEventListener('pointerdown', onDocDown, true);
            window.addEventListener('keydown', onKey, true);
            window.addEventListener('resize', onRelayout);
            window.addEventListener('scroll', onRelayout, true);
            pop.__cleanup = () => {
                window.removeEventListener('pointerdown', onDocDown, true);
                window.removeEventListener('keydown', onKey, true);
                window.removeEventListener('resize', onRelayout);
                window.removeEventListener('scroll', onRelayout, true);
            };
        } catch (_) {}
    }

    function closeHistoryModal() {
        try {
            const elp = state.historyPopupEl;
            state.historyPopupEl = null;
            if (!elp) return;
            try {
                elp.__cleanup && elp.__cleanup();
            } catch (_) {}
            elp.remove();
        } catch (_) {}
    }

    historyLoad();

    function persistSave() {
        try {
            const data = {
                w: state.w,
                h: state.h,
                gridOffsetXSteps: state.gridOffsetXSteps,
                gridOffsetYSteps: state.gridOffsetYSteps,
                x: Number(state.x) || 0,
                y: Number(state.y) || 0,
                imgURLTag: state.currentFileName || null,

                scanTolerance: Number(state.scanTolerance),
                scanStrideMin: Number(state.scanStrideMin),
                scanStrideMax: Number(state.scanStrideMax),

                ahkEnabled: !!state.ahkEnabled,
                autoModeEnabled: !!state.autoModeEnabled,
                acidModeEnabled: !!state.acidModeEnabled,
                autoIntervalMs: Number(AUTO_MODE_INTERVAL_MS),
                focusDelayMs: Number(AUTO_MODE_FOCUS_DELAY_MS),
                onFocusAlways: !!AUTO_MODE_ON_FOCUS_ALWAYS,
                scanWindowMs: Number(AUTO_MODE_SCAN_WINDOW_MS),
                scanIntervalMs: Number(AUTO_MODE_SCAN_INTERVAL_MS)
            };
            localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
        } catch (_) {}
    }

    function persistLoad() {
        try {
            const raw = localStorage.getItem(PERSIST_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }


    function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            try {
                const fr = new FileReader();
                fr.onload = () => resolve(String(fr.result || ''));
                fr.onerror = reject;
                fr.readAsDataURL(blob);
            } catch (e) {
                reject(e);
            }
        });
    }

    async function saveLastImageFromURL(url, fileName) {
        try {
            if (!url) return;
            const resp = await fetch(url);
            const blob = await resp.blob();
            const dataUrl = await blobToDataURL(blob);
            const rec = {
                fileName: fileName || null,
                dataUrl,
                ts: Date.now()
            };
            try {
                localStorage.setItem(LAST_IMG_KEY, JSON.stringify(rec));
            } catch (_) {}
        } catch (_) {}
    }

    async function loadLastImageIfAny() {
        try {
            dbg('loadLastImageIfAny: start');
            const raw = localStorage.getItem(LAST_IMG_KEY);
            if (!raw) return false;
            let rec;
            try {
                rec = JSON.parse(raw);
            } catch {
                rec = null;
            }
            if (!rec || !rec.dataUrl) return false;

            const resp = await fetch(rec.dataUrl);
            const blob = await resp.blob();
            const u = URL.createObjectURL(blob);
            dbg('loadLastImageIfAny: blob URL created', {
                file: rec.fileName,
                size: blob?.size
            });
            try {
                state.suppressAutoMoveOnce = true;
            } catch (_) {}
            setImageURL(u, rec.fileName || 'image');
            dbg('loadLastImageIfAny: setImageURL called', {
                anchorSet: !!state.anchorSet,
                x: state.x,
                y: state.y
            });

            try {
                if (!state.anchorSet) deriveAnchorFromCurrentXY();
            } catch (_) {}
            dbg('loadLastImageIfAny: after deriveAnchor', {
                anchorSet: !!state.anchorSet,
                tx: state.anchorTx,
                ty: state.anchorTy,
                px: state.anchorPx,
                py: state.anchorPy
            });

            try {
                window.dispatchEvent(new Event('resize'));
            } catch (_) {}
            try {
                setTimeout(() => {
                    try {
                        window.dispatchEvent(new Event('resize'));
                    } catch (_) {}
                }, 250);
            } catch (_) {}
            dbg('loadLastImageIfAny: resize nudged');
            return true;
        } catch (_) {
            return false;
        }
    }

    function applyPersistedPlacementOnStartup() {
        try {
            const p = persistLoad();
            if (!p) return;
            dbg('applyPersistedPlacementOnStartup: loaded', p);
            if (Number.isFinite(p.x)) state.x = Number(p.x);
            if (Number.isFinite(p.y)) state.y = Number(p.y);
            if (Number.isFinite(p.gridOffsetXSteps)) state.gridOffsetXSteps = Number(p.gridOffsetXSteps);
            if (Number.isFinite(p.gridOffsetYSteps)) state.gridOffsetYSteps = Number(p.gridOffsetYSteps);

            try {
                if (Number.isFinite(p.scanTolerance)) state.scanTolerance = Math.floor(p.scanTolerance);
                if (Number.isFinite(p.scanStrideMin)) state.scanStrideMin = Math.floor(p.scanStrideMin);
                if (Number.isFinite(p.scanStrideMax)) state.scanStrideMax = Math.floor(p.scanStrideMax);
                applyScanParamsFromState(true);
            } catch (_) {}

            try {
                if (typeof p.ahkEnabled === 'boolean') state.ahkEnabled = !!p.ahkEnabled;
                if (Number.isFinite(p.autoIntervalMs)) AUTO_MODE_INTERVAL_MS = Math.max(1000, Math.floor(p.autoIntervalMs));
                if (Number.isFinite(p.focusDelayMs)) AUTO_MODE_FOCUS_DELAY_MS = Math.max(0, Math.floor(p.focusDelayMs));
                if (typeof p.onFocusAlways === 'boolean') AUTO_MODE_ON_FOCUS_ALWAYS = !!p.onFocusAlways;
                if (Number.isFinite(p.scanWindowMs)) AUTO_MODE_SCAN_WINDOW_MS = Math.max(250, Math.floor(p.scanWindowMs));
                if (Number.isFinite(p.scanIntervalMs)) AUTO_MODE_SCAN_INTERVAL_MS = Math.max(25, Math.floor(p.scanIntervalMs));
            } catch (_) {}

            try {
                if (typeof p.acidModeEnabled === 'boolean') {
                    state.acidModeEnabled = !!p.acidModeEnabled;
                    try {
                        updateAcidBtn();
                    } catch (_) {}
                }
            } catch (_) {}

            try {
                if (typeof p.autoModeEnabled === 'boolean') {
                    state.autoModeEnabled = !!p.autoModeEnabled;
                    if (state.autoModeEnabled) {
                        try {
                            btnTopToggle.classList.add('active');
                            btnTopToggle.style.background = '#2e7d32';
                        } catch (_) {}
                        try {
                            btnAcid.disabled = true;
                            btnAcid.style.opacity = '0.6';
                            btnAcid.style.cursor = 'not-allowed';
                            btnAcid.title = (t('acidBlockedByAuto') || 'Режим глаз заблокирован АвтоРежимом');
                        } catch (_) {}
                        if (!state.acidModeEnabled) {
                            state.acidModeEnabled = true;
                            try {
                                updateAcidBtn();
                            } catch (_) {}
                        }
                        try {
                            if (state.ahkEnabled) {
                                const focused = (typeof document.hasFocus === 'function') ? document.hasFocus() : (document.visibilityState === 'visible');
                                if (focused) startAutoModeTimer();
                            } else {
                                startAutoModePlainTimer();
                            }
                        } catch (_) {}
                    } else {
                        try {
                            btnTopToggle.classList.remove('active');
                            btnTopToggle.style.background = '#e53935';
                        } catch (_) {}
                        try {
                            btnAcid.disabled = false;
                            btnAcid.style.opacity = '';
                            btnAcid.style.cursor = '';
                            btnAcid.title = t('acidToggleTitle');
                        } catch (_) {}
                        try {
                            stopAutoModeTimer();
                        } catch (_) {}
                    }
                }
            } catch (_) {}
            try {
                syncUI();
            } catch (_) {}

            try {
                deriveAnchorFromCurrentXY();
            } catch (_) {}
            dbg('applyPersistedPlacementOnStartup: after derive', {
                x: state.x,
                y: state.y,
                anchorSet: !!state.anchorSet,
                tx: state.anchorTx,
                ty: state.anchorTy,
                px: state.anchorPx,
                py: state.anchorPy
            });
            try {
                syncSettingsUIFromState();
            } catch (_) {}
        } catch (_) {}
    }



    function computeGridOffsetsFromXY() {
        const g = computeSnapGrid();
        if (!g) return;
        const ox = Math.round((state.x - g.baseX) / g.stepX);
        const oy = Math.round((state.y - g.baseY) / g.stepY);
        state.gridOffsetXSteps = ox;
        state.gridOffsetYSteps = oy;
    }

    function applyAnchoredPositionFromOffsets() {
        const g = computeSnapGrid();
        if (!g) return;
        state.x = g.baseX + state.gridOffsetXSteps * g.stepX;
        state.y = g.baseY + state.gridOffsetYSteps * g.stepY;
        syncUI();
        try {
            if (state.currentFileName && state.iw && state.ih) historyAddOrUpdate({
                fileName: state.currentFileName,
                w: state.iw,
                h: state.ih,
                x: state.x,
                y: state.y
            });
        } catch (_) {}
    }

    function deriveAnchorFromCurrentXY() {
        dbg('deriveAnchorFromCurrentXY: start', {
            x: state.x,
            y: state.y,
            anchorSet: !!state.anchorSet,
            adjusted: !!state.__anchorAdjusted
        });

        if (state.anchorSet && state.__anchorAdjusted) {
            dbg('deriveAnchorFromCurrentXY: already finalized, skipping');
            return true;
        }
        const g = computeSnapGrid();
        if (!g) {
            dbg('deriveAnchorFromCurrentXY: no grid');
            return false;
        }
        const localX = Math.round((state.x - g.baseX) / g.stepX);
        const localY = Math.round((state.y - g.baseY) / g.stepY);
        const locTx = Math.floor(localX / TILE_SIZE);
        const locTy = Math.floor(localY / TILE_SIZE);
        const locPx = ((localX % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
        const locPy = ((localY % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;

        if (Number.isFinite(state.viewTileBaseX) && Number.isFinite(state.viewTileBaseY)) {
            const gLeft = locTx * TILE_SIZE + locPx + state.viewTileBaseX * TILE_SIZE;
            const gTop = locTy * TILE_SIZE + locPy + state.viewTileBaseY * TILE_SIZE;
            state.anchorTx = Math.floor(gLeft / TILE_SIZE);
            state.anchorTy = Math.floor(gTop / TILE_SIZE);
            state.anchorPx = ((gLeft % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
            state.anchorPy = ((gTop % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
            state.anchorSet = true;
            state.anchorProvisional = false;
            state.__anchorAdjusted = true;
            dbg('deriveAnchorFromCurrentXY: world anchor', {
                tx: state.anchorTx,
                ty: state.anchorTy,
                px: state.anchorPx,
                py: state.anchorPy
            });
            try {
                if (state.currentFileName && state.iw && state.ih) {
                    historyAddOrUpdate({
                        fileName: state.currentFileName,
                        w: state.iw,
                        h: state.ih,
                        tx: state.anchorTx,
                        ty: state.anchorTy,
                        px: state.anchorPx,
                        py: state.anchorPy
                    });
                }
            } catch (_) {}
            return true;
        }


        state.localAnchorTx = locTx;
        state.localAnchorTy = locTy;
        state.localAnchorPx = locPx;
        state.localAnchorPy = locPy;
        state.anchorProvisional = true;
        dbg('deriveAnchorFromCurrentXY: provisional (local)', {
            tx: locTx,
            ty: locTy,
            px: locPx,
            py: locPy
        });
        return false;
    }


    function measureRailMinHeight() {
        try {
            const btns = rail?.querySelectorAll('.rbtn') || [];
            if (!btns.length) return 0;
            const btnRectH = btns[0].getBoundingClientRect().height || 44;
            const gap = parseInt(getComputedStyle(rail).gap || '14', 10) || 0;
            const cs = getComputedStyle(railCol);
            const pt = parseInt(cs.paddingTop || '0', 10) || 0;
            const pb = parseInt(cs.paddingBottom || '0', 10) || 0;
            return pt + pb + btnRectH * btns.length + gap * Math.max(0, btns.length - 1);
        } catch (_) {
            return 0;
        }
    }



    function recalcSidebarHeight() {
        try {

            const minIcons = measureRailMinHeight();

            const contentH = Math.max(0, sideBody.scrollHeight || 0) + 2;

            const railH = Math.max(0, railCol.scrollHeight || 0) + 2;
            const desired = Math.max(minIcons, contentH, railH);

            const maxAvail = Math.max(120, window.innerHeight - 16);
            sidebar.style.height = Math.min(desired, maxAvail) + 'px';
        } catch (_) {}
    }



    function syncUI() {

        overlay.style.left = state.x + "px";
        overlay.style.top = state.y + "px";
        overlay.style.width = state.w + "px";
        overlay.style.height = state.h + "px";

        try {
            updateMarkerPos();
        } catch (_) {}

    }

    function updateAcidBtn() {
        try {
            btnAcid.classList.toggle('active', !!state.acidModeEnabled);
            btnAcid.innerHTML = state.acidModeEnabled ? eyeOpenSvg : eyeOffSvg;
            if (state.autoModeEnabled) {
                btnAcid.disabled = true;
                btnAcid.style.opacity = '0.6';
                btnAcid.style.cursor = 'not-allowed';
                btnAcid.title = (t('acidBlockedByAuto') || 'Режим глаз заблокирован АвтоРежимом');
            } else {
                btnAcid.disabled = false;
                btnAcid.style.opacity = '';
                btnAcid.style.cursor = '';
                btnAcid.title = t("acidToggleTitle");
            }
        } catch (_) {}
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
            passive: !1
        });
        scroller.addEventListener("scroll", update);
        new ResizeObserver(update).observe(scroller);
        update()
    }

    function getCanvasStep() {
        try {

            const cnv = document.getElementById('img-overlay-snap-canvas') ||
                document.querySelector('div#map canvas.maplibregl-canvas') ||
                document.querySelector('.maplibregl-canvas');
            if (!cnv) return null;
            const rect = cnv.getBoundingClientRect();
            const cw = Number(cnv.width || 0) || 0;
            const ch = Number(cnv.height || 0) || 0;
            if (!rect || rect.width <= 0 || rect.height <= 0 || !cw || !ch) return null;
            return {
                stepX: rect.width / cw,
                stepY: rect.height / ch,
                rectLeft: rect.left,
                rectTop: rect.top
            };
        } catch (_) {
            return null;
        }
    }

    function getMainCanvas() {
        return document.querySelector('div#map canvas.maplibregl-canvas') ||
            document.querySelector('.maplibregl-canvas');
    }

    function ensureSnapCanvas() {
        try {
            const main = getMainCanvas();
            if (!main) return null;
            const dpr = window.devicePixelRatio || 1;
            const parent = main.parentElement || main;
            let snap = document.getElementById('img-overlay-snap-canvas');
            const cssW = Math.round(main.clientWidth || 0);
            const cssH = Math.round(main.clientHeight || 0);
            const devW = Math.round(cssW * dpr);
            const devH = Math.round(cssH * dpr);
            if (!snap) {
                snap = document.createElement('canvas');
                snap.id = 'img-overlay-snap-canvas';
                snap.className = 'maplibregl-canvas';
                snap.style.position = 'absolute';
                snap.style.top = '0';
                snap.style.left = '0';
                snap.style.pointerEvents = 'none';
                snap.style.zIndex = '8999';
                parent.appendChild(snap);
            }

            if ((snap.width !== devW) || (snap.height !== devH)) {
                snap.width = devW;
                snap.height = devH;
            }
            snap.style.width = cssW + 'px';
            snap.style.height = cssH + 'px';
            return snap;
        } catch (_) {
            return null;
        }
    }

    function enforcePixelScaleIfSnap() {
        if (!snapCheck.checked) return;
        if (!state.iw || !state.ih) return;
        const m = getCanvasStep();
        if (!m) return;
        const imgStepX = state.w / state.iw;
        const imgStepY = state.h / state.ih;
        const nRawX = imgStepX / m.stepX;
        const nRawY = imgStepY / m.stepY;
        const n = Math.max(1, Math.round((nRawX + nRawY) / 2));
        const newW = state.iw * (n * m.stepX);
        const newH = state.ih * (n * m.stepY);
        state.w = newW;
        state.h = newH;
        syncUI();
    }

    function computeSnapGrid() {
        try {
            dbg('computeSnapGrid: start', {
                iw: state.iw,
                ih: state.ih,
                w: state.w,
                h: state.h
            });
            const snap = ensureSnapCanvas();
            const cnv = snap || getMainCanvas();
            const rect = cnv?.getBoundingClientRect?.();
            if (!state.iw || !state.ih) {
                dbg('computeSnapGrid: missing image size');
                return null;
            }
            const imgStepX = state.w / state.iw;
            const imgStepY = state.h / state.ih;
            const m = getCanvasStep();
            if (!m) {
                const baseX = 0.5 * imgStepX;
                const baseY = 0.5 * imgStepY;
                dbg('computeSnapGrid: no snap grid, using image step', {
                    baseX,
                    baseY,
                    stepX: imgStepX,
                    stepY: imgStepY
                });
                return {
                    baseX,
                    baseY,
                    stepX: imgStepX,
                    stepY: imgStepY
                };
            }

            const host = /** @type {HTMLElement|null} */ (overlay?.offsetParent || overlay?.parentElement || document.body);
            const hostRect = host?.getBoundingClientRect?.();
            const hostLeft = hostRect?.left || 0;
            const hostTop = hostRect?.top || 0;

            const baseX = (m.rectLeft - hostLeft) + 0.5 * m.stepX - 0.5 * imgStepX;
            const baseY = (m.rectTop - hostTop) + 0.5 * m.stepY - 0.5 * imgStepY;

            dbg('computeSnapGrid: snap grid present', {
                baseX,
                baseY,
                stepX: m.stepX,
                stepY: m.stepY,
                hostLeft,
                hostTop,
                rectLeft: m.rectLeft,
                rectTop: m.rectTop
            });
            return {
                baseX,
                baseY,
                stepX: m.stepX,
                stepY: m.stepY
            };
        } catch (_) {
            try {
                dbg('computeSnapGrid: error');
            } catch (_) {}
            return null;
        }
    }


    function endDrag(e) {
        state.dragging = !1;
        state.snapGrid = null;
        try {
            const pid = e?.pointerId ?? state.start.pointerId;
            state.captureEl?.releasePointerCapture?.(pid);
        } catch (_) {}
        state.start.pointerId = null;
        state.captureEl = null;

        try {
            computeGridOffsetsFromXY();
            persistSave();
        } catch (_) {}
        try {
            if (state.currentFileName && state.iw && state.ih) historyAddOrUpdate({
                fileName: state.currentFileName,
                w: state.iw,
                h: state.ih,
                x: state.x,
                y: state.y
            });
        } catch (_) {}
    }


    try {
        snapCheck.addEventListener('change', () => {
            if (snapCheck.checked) enforcePixelScaleIfSnap();
        });
    } catch (_) {}

    try {
        window.addEventListener('resize', () => {
            ensureSnapCanvas();
            try {
                ensureMarkerInBounds();
                updateMarkerPos();
            } catch (_) {}
        });
    } catch (_) {}

    async function extractPalette() {
        if (!state.iw || !state.ih) return;
        const cnv = document.createElement("canvas");
        cnv.width = state.iw;
        cnv.height = state.ih;
        const ctx = cnv.getContext("2d", {
            willReadFrequently: !0
        });
        ctx.imageSmoothingEnabled = !1;

        if (state.selectedImageBitmap) {
            ctx.drawImage(state.selectedImageBitmap, 0, 0, state.iw, state.ih);
        }
        const imageData = ctx.getImageData(0, 0, state.iw, state.ih);
        state.imageData = imageData;
        const data = imageData.data,
            map = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 8) continue;
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
        palStat.textContent = state.palette.length ? state.palette.length + " " + t("colorsSuffix") : "— " + t("colorsSuffix");

        for (const c of state.palette) {
            const sw = el("div", "swatch");
            sw.dataset.key = c.key;
            const box = el("div", "box");
            box.style.background = c.hex;
            const nameText = COLOR_NAME_MAP.get(c.key) || c.hex.toUpperCase();
            sw.setAttribute("data-tip", `${nameText} • ${c.count} px`);
            sw.append(box);

            sw.addEventListener("click", async () => {
                if (state.brushMode) {
                    setActiveColor(c, sw, false, true);

                    if (autoColorChk.checked) {
                        const colorFound = autoPickColorOnPage(COLOR_NAME_MAP.get(c.key) || c.hex.toUpperCase());
                        if (!colorFound) return;
                    }
                } else {
                    if (!state.acidModeEnabled) {
                        try {
                            showHint(t('hintAcidRequired'), 2400);
                        } catch (_) {}
                        return;
                    }
                    if (autoColorChk.checked) {
                        const colorFound = autoPickColorOnPage(COLOR_NAME_MAP.get(c.key) || c.hex.toUpperCase());
                        if (!colorFound) return;
                    }
                    if (!isScreenCaptureReady()) {
                        try {
                            showHint(t('hintAccessRequired'), 2400);
                        } catch (_) {}
                        return;
                    }
                    try {
                        await startPreciseCalibration();
                    } catch (_) {}
                    startAutoClick(c);
                }
            });
            sw.addEventListener("pointerenter", (e) => {
                const text = sw.getAttribute("data-tip") || "";
                hoverTip.textContent = text;
                hoverTip.style.display = text ? "block" : "none";
                const r = sw.getBoundingClientRect();
                const x = Math.min(window.innerWidth - 12, Math.max(12, r.left + r.width / 2));
                const y = Math.max(12, r.top - 10);
                hoverTip.style.left = (x) + "px";
                hoverTip.style.top = (y) + "px";
                hoverTip.style.transform = "translate(-50%, -100%)";
            });
            sw.addEventListener("pointerleave", () => {
                hoverTip.style.display = "none";
            });

            paletteEl.append(sw);
        }

        if (state.activeColor) {
            const sw = [...paletteEl.children].find(x => x.dataset.key === state.activeColor.key);
            if (sw) setActiveColor(state.activeColor, sw, !0, !1);
        }
    }


    recalcSidebarHeight();

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
        const prevToolbarPE = toolbar.style.pointerEvents;
        const prevSidebarPE = sidebar.style.pointerEvents;
        let prevContentPE = '';
        try {
            prevContentPE = content.style.pointerEvents;
            content.style.pointerEvents = 'none';
        } catch (_) {}
        let prevOverlayPE = '';
        try {
            prevOverlayPE = overlay.style.pointerEvents;
            overlay.style.pointerEvents = 'none';
        } catch (_) {}
        let prevMarkerPE = '';
        try {
            prevMarkerPE = dragMarker.style.pointerEvents;
            dragMarker.style.pointerEvents = 'none';
        } catch (_) {}

        toolbar.style.pointerEvents = "none";
        sidebar.style.pointerEvents = "none";
        const target = document.elementFromPoint(x, y);
        const build = (extra = {}) => ({
            bubbles: !0,
            cancelable: !0,
            composed: !0,
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
                        isPrimary: !0,
                        pressure: 0
                    }));
                    target.dispatchEvent(new PointerEvent("pointerdown", {
                        ...build({
                            buttons: 1
                        }),
                        pointerId: 1,
                        pointerType: "mouse",
                        isPrimary: !0,
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
                        isPrimary: !0,
                        pressure: 0
                    }))
                }
                target.dispatchEvent(new MouseEvent("mouseup", build()));
                target.dispatchEvent(new MouseEvent("click", build()))
            }
        } finally {
            toolbar.style.pointerEvents = prevToolbarPE;
            sidebar.style.pointerEvents = prevSidebarPE;
            try {
                content.style.pointerEvents = prevContentPE;
            } catch (_) {}
            try {
                overlay.style.pointerEvents = prevOverlayPE;
            } catch (_) {}
            try {
                dragMarker.style.pointerEvents = prevMarkerPE;
            } catch (_) {}
        }
    }

    function isNoPaintPopupVisible() {
        try {

            if (document.querySelector('body > div:nth-child(1) > section > ol')) return true;
        } catch (_) {}
        return false;
    }


    const PAINT_BTN_WRAP_SEL = 'body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-6wmtgk > div.absolute.bottom-0.left-0.z-50.w-full > div > div > div.relative.h-12.sm\\:h-14 > div.absolute.bottom-0.left-1\\/2.-translate-x-1\\/2';

    function __findPaintBtnContainer() {
        try {
            return document.querySelector(PAINT_BTN_WRAP_SEL) ||
                document.querySelector('div.absolute.bottom-0.left-1\\/2.-translate-x-1\\/2') ||
                null;
        } catch (_) {
            return null;
        }
    }

    function isBottomPaintLoadingActive() {
        try {
            const cont = __findPaintBtnContainer();
            if (!cont) return false;
            if (cont.querySelector('.loading.loading-spinner')) return true;

            const btn = cont.querySelector('button');
            if (btn && (btn.disabled || btn.getAttribute('disabled') != null)) {

                return true;
            }
        } catch (_) {}
        return false;
    }
    async function clickUnderRedWhenReady(maxWaitMs = 120000) {
        const start = Date.now();
        try {
            while (isBottomPaintLoadingActive()) {
                if ((Date.now() - start) > maxWaitMs) break;
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (_) {}
        try {
            clickRandomInsideMarker();
        } catch (_) {}
    }

    function clickUnderRedFast() {
        try {
            clickRandomInsideMarker();
        } catch (_) {}
    }

    const CLOSE_EDIT_SVG_SEL = 'body > div:nth-child(1) > div.disable-pinch-zoom.relative.h-full.overflow-hidden.svelte-6wmtgk > div.absolute.bottom-0.left-0.z-50.w-full > div > div > div.flex.items-center.gap-1\\.5 > button:nth-child(3) > svg';

    function clickCloseEditIfPresent() {
        try {
            const el = document.querySelector(CLOSE_EDIT_SVG_SEL);
            if (!el) return false;
            const btn = el.closest('button');
            (btn || el).click();
            return true;
        } catch (_) {
            return false;
        }
    }

    function isEditModeOpen() {
        try {
            return !!document.querySelector(CLOSE_EDIT_SVG_SEL);
        } catch (_) {
            return false;
        }
    }

    function openEditModeIfClosedFast() {
        try {
            if (!isEditModeOpen()) clickUnderRedFast();
        } catch (_) {}
    }

    function isEditModeActiveForColorName(colorName) {
        if (!colorName) return false;
        try {
            const btn = document.querySelector(`button[aria-label="${colorName}"]`);
            return !!btn;
        } catch (_) {
            return false;
        }
    }

    async function ensureEditModeAndPick(colorName) {
        try {

            if (!isEditModeOpen()) {
                try {
                    await clickUnderRedWhenReady(4000);
                } catch (_) {}
                await new Promise(r => setTimeout(r, 800));
            }
            let ok = !!autoPickColorOnPage(colorName);
            if (!ok) {
                await new Promise(r => setTimeout(r, 200));
                ok = !!autoPickColorOnPage(colorName);
            }
            return ok;
        } catch (_) {
            return false;
        }
    }

    async function startAutoClick(color) {
        if (!state.acidModeEnabled) {
            try {
                showHint(t('hintAcidRequired'), 2400);
            } catch (_) {}
            return;
        }
        const delay = Math.max(0, Math.round(Number(delayInp.value) || 0));
        if (state.running) {
            const currentKey = state.running.colorKey || (state.activeColor && state.activeColor.key) || null;
            if (currentKey && color && color.key === currentKey) {
                return;
            }
            stopAutoClick();
        }
        if (!isScreenCaptureReady()) {
            try {
                showHint(t('hintAccessRequired'), 2400);
            } catch (_) {}
            return;
        }

        let snap = null;
        try {
            await new Promise(r => setTimeout(r, 120));
            snap = captureScreenSnapshot();
        } catch {}
        if (!snap) return;

        const runner = {
            points: [],
            idx: 0,
            total: 0,
            timer: null,
            running: true,
            delay,
            building: true,
            colorKey: color && color.key ? color.key : null,

            __shuffled: false,

            buildStartAt: performance.now(),
            lastBuildProgressAt: performance.now()
        };
        state.running = runner;
        let statTick = 0;
        const updateStat = (force = false) => {
            const now = performance.now();
            if (force || now - statTick > 120) {
                statTick = now;
                updateRunStat();
            }
        };
        updateStat(true);
        const exclude = new Set();


        (function buildPointsFromSnapshot() {
            const [tr, tg, tb] = String(color.key || '').split(',').map(n => Number(n) || 0);
            const tolBase = 3;
            const SHIFT = 20;
            const rr = Math.min(255, tr + SHIFT);
            const gg = Math.min(255, tg + SHIFT);
            const bb = Math.min(255, tb + SHIFT);
            const tolShift = 6;
            const isClose = (r, g, b, R, G, B, tol) => (Math.abs(r - R) <= tol && Math.abs(g - G) <= tol && Math.abs(b - B) <= tol);
            const baseMatch = (r, g, b) => isClose(r, g, b, tr, tg, tb, tolBase);
            const looksMarked = (r, g, b) => isClose(r, g, b, rr, gg, bb, tolShift) && !baseMatch(r, g, b);


            let acidR = tr,
                acidG = tg,
                acidB = tb;
            let acidTol = tolBase;
            if (state.acidModeEnabled) {
                try {
                    const pr = Math.min(255, tr + SHIFT);
                    const pg = Math.min(255, tg + SHIFT);
                    const pb = Math.min(255, tb + SHIFT);
                    const idx = rgb24Index(pr, pg, pb);
                    const acid = cvColorFor(idx);
                    acidR = acid[0];
                    acidG = acid[1];
                    acidB = acid[2];
                    acidTol = 3;
                } catch (_) {}
            }
            const isAcidTarget = (r, g, b) => isClose(r, g, b, acidR, acidG, acidB, acidTol);
            const data = snap.data.data;
            const w = snap.width;
            const h = snap.height;
            const mapCanvas = getMainCanvas();
            const mapRect = mapCanvas ? mapCanvas.getBoundingClientRect() : null;
            const taken = new Set();
            const batch = [];


            const matchesPixel = state.acidModeEnabled ? isAcidTarget : looksMarked;
            const getRGBat = (x, y) => {
                const idx = (y * w + x) * 4;
                return [data[idx], data[idx + 1], data[idx + 2]];
            };
            const block2x2Matches = (cx, cy) => {

                if (cx + 1 >= w || cy + 1 >= h) return false;
                const p00 = getRGBat(cx, cy);
                const p10 = getRGBat(cx + 1, cy);
                const p01 = getRGBat(cx, cy + 1);
                const p11 = getRGBat(cx + 1, cy + 1);
                return matchesPixel(p00[0], p00[1], p00[2]) &&
                    matchesPixel(p10[0], p10[1], p10[2]) &&
                    matchesPixel(p01[0], p01[1], p01[2]) &&
                    matchesPixel(p11[0], p11[1], p11[2]);
            };

            let rowsPerChunk = 60;
            let sy = 0;
            const scheduleBuildStep = () => {
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(() => step());
                } else {
                    setTimeout(step, 16);
                }
            };
            const step = () => {
                const stepStart = performance.now();
                if (!runner.running) {
                    runner.building = false;
                    return;
                }
                const end = Math.min(h, sy + rowsPerChunk);
                for (; sy < end; sy++) {
                    const row = sy * w * 4;
                    for (let sx = 0; sx < w; sx++) {
                        const i = row + sx * 4;
                        const r = data[i],
                            g = data[i + 1],
                            b = data[i + 2];
                        if (state.acidModeEnabled) {
                            if (!isAcidTarget(r, g, b)) continue;
                            if (!block2x2Matches(sx, sy)) continue;
                        } else {
                            if (!looksMarked(r, g, b)) continue;
                            if (!block2x2Matches(sx, sy)) continue;
                        }
                        const mapped = snapshotToClient(snap, sx, sy);
                        if (!mapped) continue;
                        const cx = mapped[0],
                            cy = mapped[1];
                        if (isPointInUI(cx, cy)) continue;
                        if (mapRect && (cx < mapRect.left || cy < mapRect.top || cx >= mapRect.right || cy >= mapRect.bottom)) continue;
                        const key = cx + ',' + cy;
                        if (!taken.has(key) && !exclude.has(key)) {
                            taken.add(key);
                            batch.push([cx, cy]);
                        }
                    }
                }
                if (batch.length) {
                    const startIdx = runner.points.length;
                    runner.points.push(...batch);

                    for (let k = startIdx; k < runner.points.length; k++) {
                        const r = Math.floor(Math.random() * (k + 1));
                        const t = runner.points[k];
                        runner.points[k] = runner.points[r];
                        runner.points[r] = t;
                    }
                    runner.total = runner.points.length;
                    updateStat();

                    runner.lastBuildProgressAt = performance.now();
                    batch.length = 0;
                }
                if (sy < h) {
                    const dur = performance.now() - stepStart;
                    if (dur > 12 && rowsPerChunk > 20) rowsPerChunk = Math.max(20, Math.floor(rowsPerChunk * 0.8));
                    else if (dur < 4 && rowsPerChunk < 160) rowsPerChunk = Math.min(160, Math.floor(rowsPerChunk * 1.25));
                    scheduleBuildStep();
                } else {
                    runner.building = false;
                    runner.lastBuildProgressAt = performance.now();
                }
            };
            step();
        })();

        const tick = () => {

            try {
                if (isNoPaintPopupVisible()) {
                    try {
                        console.warn('[Runner] stopping due to no-paint popup');
                    } catch (_) {}
                    stopAutoClick();
                    return;
                }
            } catch (_) {}

            if (!runner.running) return;

            if (runner.idx >= runner.total) {

                if (runner.building) {
                    const now = performance.now();
                    const last = runner.lastBuildProgressAt || runner.buildStartAt || now;

                    if (now - last > 4000) {
                        runner.building = false;
                    }
                }

                if (runner.building) {
                    const latestDelay = Math.max(0, Math.round(Number(delayInp?.value) || 0));
                    runner.timer = latestDelay <= 0 ? requestAnimationFrame(tick) : setTimeout(tick, latestDelay);
                    return;
                }

                try {
                    if (!runner.total && !state.bulkInProgress) {
                        clickUnderRedFast();
                        clickCloseEditIfPresent();
                    }
                } catch (_) {}
                stopAutoClick();
                return;
            }


            if (state.autoModeEnabled && !runner.__shuffled && runner.points && runner.points.length > 1) {
                try {
                    const a = runner.points;
                    for (let i = a.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        const t = a[i];
                        a[i] = a[j];
                        a[j] = t;
                    }
                    runner.__shuffled = true;
                } catch (_) {}
            }
            const [x, y] = runner.points[runner.idx];
            const k = x + "," + y;


            try {
                const colorName = (runner.colorKey && COLOR_NAME_MAP.get(runner.colorKey)) ||
                    (state.activeColor && (COLOR_NAME_MAP.get(state.activeColor.key) || (state.activeColor.hex || '').toUpperCase())) ||
                    null;
                if (colorName && !isEditModeActiveForColorName(colorName)) {

                    if (!isEditModeOpen()) {
                        if (isBottomPaintLoadingActive()) {
                            runner.timer = setTimeout(tick, 500);
                            return;
                        }
                        openEditModeIfClosedFast();
                        runner.timer = setTimeout(tick, 600);
                        return;
                    }
                    try {
                        autoPickColorOnPage(colorName);
                    } catch (_) {}
                    runner.timer = setTimeout(tick, 200);
                    return;
                }
            } catch (_) {}

            if (!isPointInUI(x, y) && !exclude.has(k)) {
                exclude.add(k);
                simulateClickAt(x, y);
            }
            runner.idx++;
            updateStat();

            if (!runner.running) return;


            const latestDelay = Math.max(0, Math.round(Number(delayInp?.value) || 0));
            runner.delay = latestDelay;
            if (latestDelay <= 0) {
                runner.timer = requestAnimationFrame(tick);
            } else {
                runner.timer = setTimeout(tick, latestDelay);
            }
        };

        tick();
    }

    function stopAutoClick() {
        const r = state.running;
        if (!r) return;
        r.running = false;
        if (r.timer != null) {
            if (typeof r.timer === "number") clearTimeout(r.timer);
            else cancelAnimationFrame(r.timer);
        }
        state.running = null;
        updateRunStat();
    }

    function updateRunStat() {
        runStat.textContent = state.running ? `${state.running.idx}/${state.running.total}` : "—/—"
    }

    function setActiveColor(color, swatch, silent, reset) {
        state.activeColor = color;
        activeChip.textContent = t("brushPrefix") + (COLOR_NAME_MAP.get(color.key) || color.hex.toUpperCase());
        activeChip.style.borderColor = color.hex;
        brushCursor.style.borderColor = color.hex;

        if (reset) state.paintedByColor.delete(color.key);

        if (state.activeSwatch) state.activeSwatch.classList.remove("active");
        if (swatch) {
            state.activeSwatch = swatch;
            swatch.classList.add("active");
        }

        if (state.brushMode && !silent) {
            brushCursor.style.display = "block";
        }
    }

    function setBrushMode(on) {
        state.brushMode = false;
        brushChk.checked = false;
        try {
            rBrush.classList.remove("active");
            rBrush.style.display = "none";
        } catch (_) {}
        try {
            closeBrushPanel && closeBrushPanel();
        } catch (_) {}
        return;
    }


    const placeState = {
        active: false,
        refSet: false,
        refX: 0,
        refY: 0,
        onImageClick: null,
        onDocClick: null
    };


    let screenVideo = null;
    let screenCanvas = null;
    let screenCtx = null;
    let calibScaleX = 0,
        calibScaleY = 0,
        calibOffsetX = 0,
        calibOffsetY = 0;
    const CAL_MARK_A_ID = 'bm-cal-mark-a';
    const CAL_MARK_B_ID = 'bm-cal-mark-b';

    function isPointInUI(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return false;
        const inTree = (root) => {
            if (!root) return false;
            let cur = el;
            while (cur && cur !== document.body) {
                if (cur === root) return true;
                cur = cur.parentElement;
            }
            return false;
        };
        return inTree(toolbar) || inTree(sidebar);
    }



    async function ensureScreenCapture() {
        if (screenVideo && screenCtx && screenCanvas) return true;
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'never'
                },
                audio: false
            });
            const v = document.createElement('video');
            v.playsInline = true;
            v.muted = true;
            v.srcObject = stream;
            await v.play();
            screenVideo = v;
            try {
                screenCanvas = new OffscreenCanvas(v.videoWidth || 1, v.videoHeight || 1);
            } catch {
                const c = document.createElement('canvas');
                c.width = v.videoWidth || 1;
                c.height = v.videoHeight || 1;
                screenCanvas = c;
            }

            screenCtx = screenCanvas.getContext('2d', {
                willReadFrequently: true
            });
            try {
                const tracks = (stream && stream.getVideoTracks) ? stream.getVideoTracks() : [];
                for (const tr of tracks) {
                    tr.onended = () => {
                        try {
                            const so = screenVideo && screenVideo.srcObject;
                            if (so && so.getTracks) so.getTracks().forEach(t => {
                                try {
                                    t.stop();
                                } catch (_) {}
                            });
                        } catch (_) {}
                        screenVideo = null;
                        screenCtx = null;
                        screenCanvas = null;
                        try {
                            updateAccessButtonUI();
                        } catch (_) {}
                    };
                }
            } catch (_) {}
            try {
                updateAccessButtonUI();
            } catch (_) {}
            return !!screenCtx;
        } catch {
            return false;
        }
    }

    function isScreenCaptureReady() {
        return !!(screenVideo && screenCtx && screenCanvas);
    }

    function updateAccessButtonUI() {
        try {
            const ready = isScreenCaptureReady();
            if (rAccess) {
                rAccess.classList.toggle('success', !!ready);
                rAccess.classList.toggle('danger', !ready);
                rAccess.title = ready ? t('accessActive') : t('giveAccess');
            }
        } catch (_) {}
    }

    function captureScreenSnapshot() {
        if (!screenVideo || !screenCtx || !screenCanvas) return null;
        const vw = screenVideo.videoWidth || 0,
            vh = screenVideo.videoHeight || 0;
        if (!vw || !vh) return null;
        if ((screenCanvas.width !== vw) || (screenCanvas.height !== vh)) {
            screenCanvas.width = vw;
            screenCanvas.height = vh;
        }
        try {

            screenCtx.drawImage(screenVideo, 0, 0, vw, vh);
            const data = screenCtx.getImageData(0, 0, vw, vh);
            return {
                data,
                width: vw,
                height: vh
            };
        } catch {
            return null;
        }
    }

    function snapshotToClient(snapshot, sx, sy) {
        const vw = snapshot.width,
            vh = snapshot.height;
        if (vw <= 0 || vh <= 0) return null;
        if (calibScaleX && calibScaleY) {
            const cx = Math.round((sx - calibOffsetX) / Math.max(1e-6, calibScaleX));
            const cy = Math.round((sy - calibOffsetY) / Math.max(1e-6, calibScaleY));
            if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return null;
            return [cx, cy];
        }
        const scaleX = vw / Math.max(1, window.innerWidth);
        const scaleY = vh / Math.max(1, window.innerHeight);
        const cx = Math.round(sx / Math.max(1e-6, scaleX));
        const cy = Math.round(sy / Math.max(1e-6, scaleY));
        if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return null;
        return [cx, cy];
    }

    function drawCalMark(id, cx, cy, color) {
        let mark = document.getElementById(id);
        if (!mark) {
            mark = document.createElement('div');
            mark.id = id;
            mark.style.position = 'fixed';
            mark.style.zIndex = '2147483647';
            mark.style.pointerEvents = 'none';
            mark.style.width = '5px';
            mark.style.height = '5px';
            mark.style.margin = '-2px 0 0 -2px';
            document.body.appendChild(mark);
        }
        mark.style.left = cx + 'px';
        mark.style.top = cy + 'px';
        mark.style.background = color || '#ff00ff';
        mark.style.boxShadow = '0 0 0 1px #000';
    }

    function removeCalMarks() {
        document.getElementById(CAL_MARK_A_ID)?.remove();
        document.getElementById(CAL_MARK_B_ID)?.remove();
    }

    async function startPreciseCalibration() {

        if (hint) {
            hint.style.display = '';
            hint.textContent = 'Автокалибровка: готовим маркеры…';
        }
        const margin = 8;
        const ax = margin,
            ay = margin;
        const bx = Math.max(1, window.innerWidth - margin - 1);
        const by = Math.max(1, window.innerHeight - margin - 1);
        drawCalMark(CAL_MARK_A_ID, ax, ay, '#ff00ff');
        drawCalMark(CAL_MARK_B_ID, bx, by, '#ff00ff');
        const ok = isScreenCaptureReady();
        if (!ok) {
            if (hint) {
                try {
                    hint.textContent = t('hintAccessRequired');
                } catch (_) {
                    hint.textContent = 'Нужно дать доступ к экрану';
                }
            }
            removeCalMarks();
            return;
        }
        await new Promise(r => setTimeout(r, 120));
        const snap = ok ? captureScreenSnapshot() : null;
        removeCalMarks();
        if (!snap) {
            if (hint) {
                hint.textContent = 'Не удалось получить кадр экрана';
            }
            return;
        }
        const data = snap.data.data;
        const w = snap.width;
        const h = snap.height;
        const tol = 12;
        let minS = Infinity,
            minX = 0,
            minY = 0;
        let maxS = -Infinity,
            maxX = 0,
            maxY = 0;
        for (let sy = 0; sy < h; sy++) {
            const row = sy * w * 4;
            for (let sx = 0; sx < w; sx++) {
                const i = row + sx * 4;
                const r = data[i],
                    g = data[i + 1],
                    b = data[i + 2];
                if (Math.abs(r - 255) <= tol && Math.abs(g - 0) <= tol && Math.abs(b - 255) <= tol) {
                    const s = sx + sy;
                    if (s < minS) {
                        minS = s;
                        minX = sx;
                        minY = sy;
                    }
                    if (s > maxS) {
                        maxS = s;
                        maxX = sx;
                        maxY = sy;
                    }
                }
            }
        }
        if (!Number.isFinite(minS) || !Number.isFinite(maxS) || maxS === -Infinity) {
            if (hint) {
                hint.textContent = 'Маркеры не найдены на снимке экрана';
            }
            return;
        }
        calibScaleX = (maxX - minX) / Math.max(1e-6, (bx - ax));
        calibScaleY = (maxY - minY) / Math.max(1e-6, (by - ay));
        calibOffsetX = minX - calibScaleX * ax;
        calibOffsetY = minY - calibScaleY * ay;
        if (hint) {
            hint.style.display = 'none';
        }
    }

    function beginClickToPlace() {
        if (placeState.active) return;
        placeState.active = true;
        placeState.refSet = false;

        placeState.onImageClick = (e) => {
            try {
                const rect = img.getBoundingClientRect();
                const sx = rect.width / Math.max(1, state.iw || 1);
                const sy = rect.height / Math.max(1, state.ih || 1);
                const ix = Math.floor((e.clientX - rect.left) / Math.max(1e-6, sx));
                const iy = Math.floor((e.clientY - rect.top) / Math.max(1e-6, sy));
                placeState.refX = Math.max(0, Math.min((state.iw || 1) - 1, ix));
                placeState.refY = Math.max(0, Math.min((state.ih || 1) - 1, iy));
                placeState.refSet = true;
            } catch (_) {}
        };
        img.addEventListener('click', placeState.onImageClick, {
            once: true
        });


        placeState.onDocClick = (e) => {
            if (!placeState.active) return;

            const path = e.composedPath ? e.composedPath() : [];
            if (path.includes(toolbar) || path.includes(sidebar)) {
                return;
            }

            if (!placeState.refSet) {
                placeState.refX = 0;
                placeState.refY = 0;
            }
            const pxStepX = Math.max(1e-6, (state.w || 1) / Math.max(1, state.iw || 1));
            const pxStepY = Math.max(1e-6, (state.h || 1) / Math.max(1, state.ih || 1));
            const targetX = e.clientX;
            const targetY = e.clientY;
            state.x = Math.round(targetX - (placeState.refX) * pxStepX);
            state.y = Math.round(targetY - (placeState.refY) * pxStepY);
            syncUI();

            placeState.active = false;
            document.removeEventListener('mousedown', placeState.onDocClick, true);
        };
        document.addEventListener('mousedown', placeState.onDocClick, true);
    }

    function setMoveMode(on) {
        state.moveMode = !!on;
        overlay.classList.toggle("move", state.moveMode);
        btnMove.classList.toggle("primary", state.moveMode);
        btnMove.title = state.moveMode ? "Режим перемещения: ВКЛ (M)" : "Режим перемещения: ВЫКЛ (M)";
        try {
            rMove.classList.toggle("active", state.moveMode)
        } catch (_) {}
        if (state.moveMode) {

            if (state.brushMode) setBrushMode(!1);

            try {
                content.style.pointerEvents = 'none';
            } catch (_) {}

            if (state.selectedImageSize && state.selectedImageSize.w && state.selectedImageSize.h) {
                state.refX = 0;
                state.refY = 0;
                state.refSet = true;
            }
            hint.textContent = 'Кликните по карте, чтобы разместить левый верхний угол изображения.';
            positionHint(8);
            hint.style.display = '';

            beginClickToPlace();
        } else {

            if (hint) hint.style.display = 'none';
            try {
                content.style.pointerEvents = 'auto';
            } catch (_) {}
            try {

                placeState.active = false;
                if (placeState.onDocClick) {
                    document.removeEventListener('mousedown', placeState.onDocClick, true);
                    placeState.onDocClick = null;
                }
                if (placeState.onImageClick) {
                    img.removeEventListener('click', placeState.onImageClick);
                    placeState.onImageClick = null;
                }
            } catch (_) {}

            state.refSet = false;
        }
    }



    function setPanelOpen(panel, open) {
        const body = panel.querySelector('.panel-body');
        if (!body) return;
        if (open) {
            const h = body.getBoundingClientRect().height;
            panel.classList.add('open');
            panel.style.height = h + 'px';
        } else {
            panel.style.height = '0px';
            panel.classList.remove('open');
        }

        recalcSidebarHeight();
    }



    function closeBrushPanel() {
        setPanelOpen(railBrushPanel, false);
    }

    function toggleDelayPanel() {
        state.delayPanelOpen = !state.delayPanelOpen;
        setPanelOpen(railDelayPanel, state.delayPanelOpen);
    }



    function setImageURL(url, fileName) {

        try {
            if (state.selectedImageBitmap && typeof state.selectedImageBitmap.close === 'function') {
                state.selectedImageBitmap.close();
            }
        } catch (_) {}
        state.selectedImageBitmap = null;
        state.selectedImageSize = null;
        state.__autoSniffDone = false;
        try {
            dbg('setImageURL: start', {
                fileName
            });
        } catch (_) {}

        if (state.currentURL && state.currentURL !== url) {
            try {
                URL.revokeObjectURL(state.currentURL)
            } catch (e) {}
        }
        state.currentURL = url;
        state.currentFileName = fileName || null;
        fileChip.textContent = t("filePrefix") + (fileName || "—");
        fileChip.title = fileName || "";
        fileChip.style.display = fileName ? '' : 'none';

        const im = new Image();
        im.decoding = "async";
        im.onload = async () => {
            try {
                dbg('setImageURL: onload', {
                    naturalW: im.naturalWidth,
                    naturalH: im.naturalHeight
                });
            } catch (_) {}
            try {
                state.selectedImageBitmap = await createImageBitmap(im);
                state.selectedImageSize = {
                    w: state.selectedImageBitmap.width,
                    h: state.selectedImageBitmap.height
                };
            } catch {
                state.selectedImageBitmap = null;
                state.selectedImageSize = {
                    w: im.naturalWidth || im.width || 0,
                    h: im.naturalHeight || im.height || 0
                };
            }
            state.iw = state.selectedImageSize.w;
            state.ih = state.selectedImageSize.h;
            try {
                dbg('setImageURL: size set', {
                    iw: state.iw,
                    ih: state.ih
                });
            } catch (_) {}
            try {
                await extractPalette();
            } catch {}
            try {
                renderPalette();
            } catch {}

            try {

                state.__dbgMinTileX = Infinity;
                state.__dbgMinTileY = Infinity;
                state.__dbgNoIntersectCount = 0;
                state.__dbgAutoAdjustedAnchor = false;

                state.viewTileBaseX = undefined;
                state.viewTileBaseY = undefined;
                state.__anchorAdjusted = false;

                state.anchorProvisional = false;
                state.localAnchorTx = undefined;
                state.localAnchorTy = undefined;
                state.localAnchorPx = undefined;
                state.localAnchorPy = undefined;
            } catch (_) {}

            try {
                if (state.suppressAutoMoveOnce) {
                    try {
                        dbg('setImageURL: auto move suppressed once');
                    } catch (_) {}
                    state.suppressAutoMoveOnce = false;
                } else {
                    try {
                        dbg('setImageURL: enabling move mode');
                    } catch (_) {}
                    setMoveMode(true);
                }
            } catch {}

            try {
                btnClear.style.display = '';
            } catch (_) {}


            try {
                await saveLastImageFromURL(url, state.currentFileName);
            } catch (_) {}


            try {
                const fname = state.currentFileName;
                const iw = state.iw,
                    ih = state.ih;
                if (fname && iw && ih && Array.isArray(state.history) && state.history.length) {
                    const id = historyIdOf(fname, iw, ih);
                    const hit = state.history.find(e => e && e.id === id);
                    const hasT = hit && Number.isFinite(hit.tx) && Number.isFinite(hit.ty) && Number.isFinite(hit.px) && Number.isFinite(hit.py);
                    if (hasT) {
                        try {
                            dbg('setImageURL: restoring from history entry', {
                                tx: hit.tx,
                                ty: hit.ty,
                                px: hit.px,
                                py: hit.py
                            });
                        } catch (_) {}
                        applyHistoryPlacement(hit);
                    }
                }
            } catch (_) {}


            try {
                if (!state.anchorSet) deriveAnchorFromCurrentXY();
            } catch (_) {}
            try {
                dbg('setImageURL: after ensure anchor', {
                    anchorSet: !!state.anchorSet,
                    tx: state.anchorTx,
                    ty: state.anchorTy,
                    px: state.anchorPx,
                    py: state.anchorPy
                });
            } catch (_) {}

            try {
                updateViewBaseFromDOM();
            } catch (_) {}
            try {
                updateViewBaseFromPerformance();
            } catch (_) {}
            try {
                setTimeout(updateViewBaseFromDOM, 50);
            } catch (_) {}
            try {
                setTimeout(updateViewBaseFromDOM, 200);
            } catch (_) {}
            try {
                setTimeout(updateViewBaseFromPerformance, 50);
            } catch (_) {}
            try {
                setTimeout(updateViewBaseFromPerformance, 200);
            } catch (_) {}
            try {
                tryAdjustAnchorWithViewBase();
            } catch (_) {}
            try {
                nudgeTileReloadOnce();
            } catch (_) {}
            try {
                setTimeout(nudgeTileReloadOnce, 50);
            } catch (_) {}
            try {
                setTimeout(nudgeTileReloadOnce, 200);
            } catch (_) {}
            try {
                window.dispatchEvent(new Event('resize'));
            } catch (_) {}
            try {
                setTimeout(() => {
                    try {
                        window.dispatchEvent(new Event('resize'));
                    } catch (_) {}
                }, 200);
            } catch (_) {}
            try {
                dbg('setImageURL: resize nudged, onload end');
            } catch (_) {}
        };
        im.onerror = () => {

        };
        im.src = url;
    }

    function createImageElementFromURL(url) {
        return new Promise((resolve, reject) => {
            const im = new Image();
            im.decoding = "async";
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = url
        })
    }

    function downloadBlob(blob, filename) {
        const a = document.createElement("a");
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.download = filename || "image.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 1000)
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
        return [0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_, 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_, 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_]
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
        paid: !1
    }, {
        rgb: [60, 60, 60],
        name: "Dark Gray",
        paid: !1
    }, {
        rgb: [120, 120, 120],
        name: "Gray",
        paid: !1
    }, {
        rgb: [170, 170, 170],
        name: "Medium Gray",
        paid: !0
    }, {
        rgb: [210, 210, 210],
        name: "Light Gray",
        paid: !1
    }, {
        rgb: [255, 255, 255],
        name: "White",
        paid: !1
    }, {
        rgb: [96, 0, 24],
        name: "Deep Red",
        paid: !1
    }, {
        rgb: [165, 14, 30],
        name: "Dark Red",
        paid: !1
    }, {
        rgb: [237, 28, 36],
        name: "Red",
        paid: !1
    }, {
        rgb: [250, 128, 114],
        name: "Light Red",
        paid: !0
    }, {
        rgb: [228, 92, 26],
        name: "Dark Orange",
        paid: !0
    }, {
        rgb: [255, 127, 39],
        name: "Orange",
        paid: !1
    }, {
        rgb: [246, 170, 9],
        name: "Gold",
        paid: !1
    }, {
        rgb: [249, 221, 59],
        name: "Yellow",
        paid: !1
    }, {
        rgb: [255, 250, 188],
        name: "Light Yellow",
        paid: !1
    }, {
        rgb: [156, 132, 49],
        name: "Dark Goldenrod",
        paid: !0
    }, {
        rgb: [197, 173, 49],
        name: "Goldenrod",
        paid: !0
    }, {
        rgb: [232, 212, 95],
        name: "Light Goldenrod",
        paid: !0
    }, {
        rgb: [74, 107, 58],
        name: "Dark Olive",
        paid: !0
    }, {
        rgb: [90, 148, 74],
        name: "Olive",
        paid: !0
    }, {
        rgb: [132, 197, 115],
        name: "Light Olive",
        paid: !0
    }, {
        rgb: [14, 185, 104],
        name: "Dark Green",
        paid: !1
    }, {
        rgb: [19, 230, 123],
        name: "Green",
        paid: !1
    }, {
        rgb: [135, 255, 94],
        name: "Light Green",
        paid: !1
    }, {
        rgb: [12, 129, 110],
        name: "Dark Teal",
        paid: !1
    }, {
        rgb: [16, 174, 166],
        name: "Teal",
        paid: !1
    }, {
        rgb: [19, 225, 190],
        name: "Light Teal",
        paid: !1
    }, {
        rgb: [15, 121, 159],
        name: "Dark Cyan",
        paid: !0
    }, {
        rgb: [96, 247, 242],
        name: "Cyan",
        paid: !1
    }, {
        rgb: [187, 250, 242],
        name: "Light Cyan",
        paid: !0
    }, {
        rgb: [40, 80, 158],
        name: "Dark Blue",
        paid: !1
    }, {
        rgb: [64, 147, 228],
        name: "Blue",
        paid: !1
    }, {
        rgb: [125, 199, 255],
        name: "Light Blue",
        paid: !0
    }, {
        rgb: [77, 49, 184],
        name: "Dark Indigo",
        paid: !0
    }, {
        rgb: [107, 80, 246],
        name: "Indigo",
        paid: !1
    }, {
        rgb: [153, 177, 251],
        name: "Light Indigo",
        paid: !1
    }, {
        rgb: [74, 66, 132],
        name: "Dark Slate Blue",
        paid: !0
    }, {
        rgb: [122, 113, 196],
        name: "Slate Blue",
        paid: !0
    }, {
        rgb: [181, 174, 241],
        name: "Light Slate Blue",
        paid: !0
    }, {
        rgb: [120, 12, 153],
        name: "Dark Purple",
        paid: !1
    }, {
        rgb: [170, 56, 185],
        name: "Purple",
        paid: !1
    }, {
        rgb: [224, 159, 249],
        name: "Light Purple",
        paid: !1
    }, {
        rgb: [203, 0, 122],
        name: "Dark Pink",
        paid: !1
    }, {
        rgb: [236, 31, 128],
        name: "Pink",
        paid: !1
    }, {
        rgb: [243, 141, 169],
        name: "Light Pink",
        paid: !1
    }, {
        rgb: [155, 82, 73],
        name: "Dark Peach",
        paid: !0
    }, {
        rgb: [209, 128, 120],
        name: "Peach",
        paid: !0
    }, {
        rgb: [250, 182, 164],
        name: "Light Peach",
        paid: !0
    }, {
        rgb: [104, 70, 52],
        name: "Dark Brown",
        paid: !1
    }, {
        rgb: [149, 104, 42],
        name: "Brown",
        paid: !1
    }, {
        rgb: [219, 164, 99],
        name: "Light Brown",
        paid: !0
    }, {
        rgb: [123, 99, 82],
        name: "Dark Tan",
        paid: !0
    }, {
        rgb: [156, 132, 107],
        name: "Tan",
        paid: !0
    }, {
        rgb: [214, 181, 148],
        name: "Light Tan",
        paid: !0
    }, {
        rgb: [209, 128, 81],
        name: "Dark Beige",
        paid: !0
    }, {
        rgb: [248, 178, 119],
        name: "Beige",
        paid: !1
    }, {
        rgb: [255, 197, 165],
        name: "Light Beige",
        paid: !0
    }, {
        rgb: [109, 100, 63],
        name: "Dark Stone",
        paid: !0
    }, {
        rgb: [148, 140, 107],
        name: "Stone",
        paid: !0
    }, {
        rgb: [205, 197, 158],
        name: "Light Stone",
        paid: !0
    }, {
        rgb: [51, 57, 65],
        name: "Dark Slate",
        paid: !0
    }, {
        rgb: [109, 117, 141],
        name: "Slate",
        paid: !0
    }, {
        rgb: [179, 185, 209],
        name: "Light Slate",
        paid: !0
    }];
    const COLOR_NAME_MAP = new Map(MASTER_COLORS.map(c => [rgbKey(c.rgb[0], c.rgb[1], c.rgb[2]), c.name]));
    const MASTER_INDEX_MAP = new Map(MASTER_COLORS.map((c, i) => [rgbKey(c.rgb[0], c.rgb[1], c.rgb[2]), i]));

    function quantizeAndDitherSmall(sctx, w, h, options) {
        const {
            palette,
            distanceSpace,
            dither,
            ditherStrength,
            displaySurrogate
        } = options;

        const dispColors = palette.map((rgb, i) => {
            const key = rgbKey(rgb[0], rgb[1], rgb[2]);
            const mi = MASTER_INDEX_MAP.get(key);
            const idx = (mi != null) ? mi : (i + 500);
            return cvColorFor(idx);
        });
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

                        const qi = nearestColorIndex(src[p], src[p + 1], src[p + 2], pal, palLab, distanceSpace === "oklab");
                        const col = displaySurrogate ? dispColors[qi] : pal[qi];
                        out[p] = col[0];
                        out[p + 1] = col[1];
                        out[p + 2] = col[2];
                        out[p + 3] = 0;
                        usedIdx.add(qi);
                        continue
                    }
                    const t = (M[y % M.length][x % M[0].length] + 0.5) / div - 0.5;
                    const r = clamp255(src[p] + t * amp);
                    const g = clamp255(src[p + 1] + t * amp);
                    const b = clamp255(src[p + 2] + t * amp);
                    const qi = nearestColorIndex(r, g, b, pal, palLab, distanceSpace === "oklab");
                    const col = displaySurrogate ? dispColors[qi] : pal[qi];
                    out[p] = col[0];
                    out[p + 1] = col[1];
                    out[p + 2] = col[2];
                    out[p + 3] = 255;
                    usedIdx.add(qi)
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
                    wa[i] = src[p + 3]
                }
            }
            const serp = !0;
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

                        const qi0 = nearestColorIndex(wr[i], wg[i], wb[i], pal, palLab, distanceSpace === "oklab");
                        const col0 = displaySurrogate ? dispColors[qi0] : pal[qi0];
                        out[p] = col0[0];
                        out[p + 1] = col0[1];
                        out[p + 2] = col0[2];
                        out[p + 3] = 0;
                        usedIdx.add(qi0);
                        continue
                    }
                    const r = wr[i],
                        g = wg[i],
                        b = wb[i];
                    const qi = nearestColorIndex(r, g, b, pal, palLab, distanceSpace === "oklab");
                    const q = pal[qi];
                    const col = displaySurrogate ? dispColors[qi] : q;
                    out[p] = col[0];
                    out[p + 1] = col[1];
                    out[p + 2] = col[2];
                    out[p + 3] = 255;
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
                        add(x, y + 2, w8)
                    }
                }
            }
        } else {
            for (let i = 0; i < src.length; i += 4) {
                const a = src[i + 3];

                const qi = nearestColorIndex(src[i], src[i + 1], src[i + 2], pal, palLab, distanceSpace === "oklab");
                const col = displaySurrogate ? dispColors[qi] : pal[qi];
                out[i] = col[0];
                out[i + 1] = col[1];
                out[i + 2] = col[2];
                out[i + 3] = (a < 8) ? 0 : 255;
                usedIdx.add(qi)
            }
        }
        img.data.set(out);
        sctx.putImageData(img, 0, 0);
        return {
            used: usedIdx.size,
            total: pal.length
        }
    }


    function binarizeAlphaImageData(img, threshold = 8) {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i + 3] = (d[i + 3] < threshold) ? 0 : 255;
        }
    }

    function binarizeAlphaOnCanvas(canvas, threshold = 8) {
        try {
            const ctx = canvas.getContext('2d', {
                willReadFrequently: true
            });
            if (!ctx) return;
            const w = canvas.width | 0,
                h = canvas.height | 0;
            if (w <= 0 || h <= 0) return;
            const img = ctx.getImageData(0, 0, w, h);
            binarizeAlphaImageData(img, threshold);
            ctx.putImageData(img, 0, 0);
        } catch {}
    }

    function erodeAlphaImageData(img, steps = 0) {
        if (!steps) return;
        const w = img.width,
            h = img.height,
            d = img.data;
        let aCur = new Uint8Array(w * h);
        for (let i = 0, p = 3; i < aCur.length; i++, p += 4) aCur[i] = d[p];
        let aNew = new Uint8Array(aCur.length);
        for (let s = 0; s < steps; s++) {
            for (let y = 0; y < h; y++) {
                const yOff = y * w;
                for (let x = 0; x < w; x++) {
                    const i = yOff + x;
                    if (aCur[i] === 0) {
                        aNew[i] = 0;
                        continue;
                    }
                    let keep = 255;
                    for (let ny = y - 1; ny <= y + 1 && keep; ny++) {
                        for (let nx = x - 1; nx <= x + 1 && keep; nx++) {
                            if (nx === x && ny === y) continue;
                            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                            if (aCur[ny * w + nx] === 0) keep = 0;
                        }
                    }
                    aNew[i] = keep;
                }
            }
            const tmp = aCur;
            aCur = aNew;
            aNew = tmp;
        }

        for (let i = 0, p = 0; i < aCur.length; i++, p += 4) {
            if (aCur[i] === 0) {
                d[p] = 0;
                d[p + 1] = 0;
                d[p + 2] = 0;
                d[p + 3] = 0;
            } else {
                d[p + 3] = 255;
            }
        }
    }

    function dilateAlphaWithBlackImageData(img, steps = 0) {
        if (!steps) return;
        const w = img.width,
            h = img.height,
            d = img.data;
        let aBase = new Uint8Array(w * h);
        for (let i = 0, p = 3; i < aBase.length; i++, p += 4) aBase[i] = d[p] ? 255 : 0;
        let aCur = new Uint8Array(aBase);
        let work = new Uint8Array(aBase.length);
        for (let s = 0; s < steps; s++) {
            for (let y = 0; y < h; y++) {
                const yOff = y * w;
                for (let x = 0; x < w; x++) {
                    const i = yOff + x;
                    if (aCur[i] === 255) {
                        work[i] = 255;
                        continue;
                    }
                    let on = 0;
                    for (let ny = y - 1; ny <= y + 1 && !on; ny++) {
                        for (let nx = x - 1; nx <= x + 1 && !on; nx++) {
                            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                            if (aCur[ny * w + nx] === 255) on = 1;
                        }
                    }
                    work[i] = on ? 255 : 0;
                }
            }
            const tmp = aCur;
            aCur = work;
            work = tmp;
        }

        for (let i = 0, p = 0; i < aCur.length; i++, p += 4) {
            if (aCur[i] === 255) {
                if (aBase[i] === 0) {
                    d[p] = 0;
                    d[p + 1] = 0;
                    d[p + 2] = 0;
                }
                d[p + 3] = 255;
            } else {
                d[p] = 0;
                d[p + 1] = 0;
                d[p + 2] = 0;
                d[p + 3] = 0;
            }
        }
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


    function pixelRequestRegex(url) {
        const u = String(url || "");
        return /\/pixel\//i.test(u) && /[?&]x=\d+/i.test(u) && /[?&]y=\d+/i.test(u);
    }

    function parsePixelRequest(url) {
        try {
            const u = new URL(url);
            const m = u.pathname.match(/\/pixel\/(\d+)\/(\d+)/i);
            if (!m) return null;
            const tx = parseInt(m[1], 10);
            const ty = parseInt(m[2], 10);
            const px = parseInt(u.searchParams.get('x'), 10);
            const py = parseInt(u.searchParams.get('y'), 10);
            if ([tx, ty, px, py].every(Number.isFinite)) return {
                tx,
                ty,
                px,
                py
            };
        } catch (_) {}
        return null;
    }

    function onPixelRequest(url) {
        try {
            if (!(state && (state.moveMode || (typeof placeState !== 'undefined' && placeState.active)))) return;
            if (!state.currentFileName || !state.iw || !state.ih) return;
            const p = parsePixelRequest(url);
            if (!p) return;

            let sx = undefined,
                sy = undefined;
            const g = computeSnapGrid();
            if (g) {
                const globalX = p.tx * TILE_SIZE + p.px;
                const globalY = p.ty * TILE_SIZE + p.py;
                sx = Math.round(g.baseX + globalX * g.stepX);
                sy = Math.round(g.baseY + globalY * g.stepY);
            }
            historyAddOrUpdate({
                fileName: state.currentFileName,
                w: state.iw,
                h: state.ih,
                x: sx,
                y: sy,
                tx: p.tx,
                ty: p.ty,
                px: p.px,
                py: p.py
            });
        } catch (_) {}
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
                            if (res && res.ok) {
                                if (tileRegex(u)) state.lastTileURL = u;
                                if (pixelRequestRegex(u)) onPixelRequest(u);
                            }
                        } catch (_) {}
                        return res
                    })
                };
                wf.__twrapped = !0;
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
                            if (this.status >= 200 && this.status < 300) {
                                if (tileRegex(this.__turl)) state.lastTileURL = this.__turl;
                                if (pixelRequestRegex(this.__turl)) onPixelRequest(this.__turl);
                            }
                        } catch (_) {}
                    })
                    return send.apply(this, args)
                };
                XHR.prototype.__twrapped = !0
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
            const title = el("div", "crop-title", t("copyArtTitle"));
            const btnCloseX = el("button", "btn icon");
            btnCloseX.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
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
            const lblDelay = el("label", null, t("delaySec"));
            const delay = document.createElement("input");
            delay.type = "range";
            delay.min = "0.2";
            delay.max = "5";
            delay.step = "0.1";
            delay.value = "0.5";
            delay.className = "pixel-slider";
            const delayWrap = el("span", "range-wrap");
            const delayVal = el("span", "value", "0.5s");
            delayWrap.append(delay);
            rowDelay.append(lblDelay, delayWrap, delayVal);
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
                alpha: !0
            });
            const sel = el("div", "sel");
            preview.append(canvas, sel);
            const foot = el("div", "crop-foot");
            const zoomLbl = el("div", "crop-zoom", "Zoom: 1×");
            const btnCenter = el("button", "btn icon");
            btnCenter.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
            btnCenter.title = t("center");
            const spacer = el("div", "spacer");
            const btnSave = el("button", "btn icon");
            btnSave.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3h10l4 4v14H3V3h4Z" stroke="currentColor" stroke-width="2"/><path d="M7 3h10v6H7V3Z" stroke="currentColor" stroke-width="2"/></svg>';
            btnSave.title = t("save");
            const btnCancel = el("button", "btn danger");
            btnCancel.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
            btnCancel.title = t("cancel");
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
            let dragging = !1,
                panMode = !1,
                sx = 0,
                sy = 0,
                sox = 0,
                soy = 0;
            let selActive = !1,
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
            let abortLoad = !1;

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
                    ctx.imageSmoothingEnabled = !1;
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
                        sel.style.height = rh + "px"
                    } else sel.style.display = "none"
                } else sel.style.display = "none";
                zoomLbl.textContent = `Zoom: ${zoom.toFixed(2)}×`
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
                        offY = 0
                    }
                }
                draw()
            }

            function zoomAt(mx, my, nz) {
                if (!mosaic) return;
                const idx = zoomLevels.reduce((best, i, cur) => Math.abs(zoomLevels[cur] - nz) < Math.abs(zoomLevels[best] - nz) ? cur : best, 0);
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
                draw()
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
            const roPrev = new ResizeObserver(() => fit(!1));
            roPrev.observe(preview);
            preview.addEventListener("pointerdown", (e) => {
                if (!mosaic) return;
                const rect = preview.getBoundingClientRect();
                if (e.button === 2) {
                    panMode = !0;
                    dragging = !0;
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
                        selActive = !0;
                        dragging = !0;
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
                        e.preventDefault()
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
                    draw()
                }
            });
            preview.addEventListener("pointerup", () => {
                dragging = !1;
                selActive = !1;
                panMode = !1
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
                zoomAt(mx, my, nz)
            }, {
                passive: !1
            });

            preview.addEventListener("pointerleave", () => {
                if (editMode) {
                    hoverPos = null;
                    render();
                }
            });
            btnCenter.addEventListener("click", () => {
                if (!mosaic) return;
                zoom = 1;
                offX = 0;
                offY = 0;
                draw()
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
                    im.src = URL.createObjectURL(blob)
                })
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
                abortLoad = !1;
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
                                mctx = mosaic.getContext("2d", {
                                    alpha: !0
                                });
                                mctx.imageSmoothingEnabled = !1;
                                mctx.clearRect(0, 0, iw, ih);
                                stSrc.textContent = `Source: ${iw} × ${ih}`;
                                stTile.textContent = `Tile: ${tileW} × ${tileH}`;
                                fit(!0)
                            }
                            mctx.drawImage(im, c * tileW, r * tileH);
                            URL.revokeObjectURL(im.src);
                            success++
                        } catch (e) {
                            fail++;
                            if (mctx && tileW && tileH) {
                                mctx.fillStyle = "rgba(255,255,255,0.06)";
                                mctx.fillRect(c * tileW, r * tileH, tileW, tileH);
                                mctx.strokeStyle = "rgba(255,255,255,0.12)";
                                mctx.strokeRect(c * tileW + 0.5, r * tileH + 0.5, tileW - 1, tileH - 1)
                            }
                        }
                        stProg.textContent = `Progress: ${success+fail}/${total} (fail ${fail})`;
                        draw();
                        await sleep(delaySec * 1000)
                    }
                }
            }
            delay.addEventListener("input", () => {
                const v = `${parseFloat(delay.value).toFixed(1)}s`;
                delayVal.textContent = v;
            });

            [btn2, btn3, btn4, btn5, btn10].forEach(b => {
                b.addEventListener("click", async () => {
                    const cx = Math.max(0, Math.round(+inX.value || 0));
                    const cy = Math.max(0, Math.round(+inY.value || 0));
                    nSize = parseInt(b.dataset.n, 10);
                    await loadMosaic(cx, cy, nSize)
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
                const octx = out.getContext("2d", {
                    alpha: !0,
                    willReadFrequently: !0
                });
                octx.imageSmoothingEnabled = !1;
                octx.clearRect(0, 0, out.width, out.height);
                octx.drawImage(mosaic, selBox.x, selBox.y, selBox.w, selBox.h, 0, 0, out.width, out.height);

                binarizeAlphaOnCanvas(out, 8);
                const blob = await new Promise(res => out.toBlob(b => res(b), "image/png", 1));
                if (blob) downloadBlob(blob, `art_${selBox.w}x${selBox.h}.png`);
            });
            const close = () => {
                abortLoad = !0;
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
            fit(!0)
        })
    }
    async function openPixelArtDialog(file) {
        return new Promise(async (resolve) => {

            let sourceBlob = null;
            let sourceURL = null;
            try {
                const buf = await file.arrayBuffer();
                sourceBlob = new Blob([buf], {
                    type: file.type || 'application/octet-stream'
                });
                sourceURL = URL.createObjectURL(sourceBlob);
            } catch (_) {

                try {
                    sourceURL = URL.createObjectURL(file);
                } catch (_) {}
            }

            let bitmap = null,
                imEl = null,
                ow = 0,
                oh = 0;
            async function loadDims() {
                try {
                    bitmap = await createImageBitmap(sourceBlob || file);
                    ow = bitmap.width;
                    oh = bitmap.height
                } catch (e) {
                    try {
                        imEl = await createImageElementFromURL(sourceURL);
                        ow = imEl.naturalWidth;
                        oh = imEl.naturalHeight
                    } catch (err) {}
                }
            }
            await loadDims();
            if (!ow || !oh) {
                try {
                    if (sourceURL) URL.revokeObjectURL(sourceURL)
                } catch (e) {}
                return resolve({
                    action: "cancel"
                })
            }
            const back = el("div", "pixel-backdrop");
            const modal = el("div", "pixel-modal");
            const head = el("div", "pixel-head");
            const pixelTitle = el("div", "pixel-title", t("pixelizationTitle"));
            const fname = el("div", "pixel-filename", file.name || t("image"));
            const btnX = el("button", "btn icon", "✕");
            btnX.title = t("closeTitle");
            head.append(pixelTitle, fname, btnX);
            const body = el("div", "pixel-body");
            const controls = el("div", "pixel-controls");
            const rowScale = el("div", "pixel-row");
            const lblScale = el("label", null, t("scalingMethod"));
            const method = document.createElement("select");
            method.className = "pixel-select";
            method.innerHTML = `
      <option value="nearest">${t("nearestNeighbor")}</option>
      <option value="bilinear">${t("bilinear")}</option>
      <option value="lanczos">${t("lanczos")}</option>
    `;
            rowScale.append(lblScale, method);
            const rowPx = el("div", "pixel-row");
            const lblPx = el("label", null, t("pixelSize"));
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "1";
            slider.max = String(Math.min(128, Math.ceil(Math.min(ow, oh) / 2)));
            slider.value = "1";
            slider.className = "pixel-slider";
            const pxWrap = el("span", "range-wrap");
            const pxVal = el("span", "value", "1");
            pxWrap.append(slider);
            rowPx.append(lblPx, pxWrap, pxVal);
            const rowQuant = el("div", "pixel-row");
            const lblQuant = el("label", null, t("palette"));
            const quant = document.createElement("select");
            quant.className = "pixel-select";
            quant.innerHTML = `
      <option value="full">${t("fullPalette")}</option>
      <option value="free">${t("freeOnly")}</option>
      <option value="custom">${t("custom")}</option>
      <option value="owned">${t("ownedDetected")}</option>
    `;
            rowQuant.append(lblQuant, quant);
            const rowSpace = el("div", "pixel-row");
            const lblSpace = el("label", null, t("distance"));
            const space = document.createElement("select");
            space.className = "pixel-select";
            space.innerHTML = `<option value="srgb">${t("srgb")}</option><option value="oklab">${t("oklab")}</option>`;
            rowSpace.append(lblSpace, space);
            const rowDith = el("div", "pixel-row");
            const lblDith = el("label", null, t("dithering"));
            const dith = document.createElement("select");
            dith.className = "pixel-select";
            dith.innerHTML = `
      <option value="none">${t("none")}</option>
      <option value="ordered4">${t("ordered4")}</option>
      <option value="ordered8">${t("ordered8")}</option>
      <option value="fs">${t("fs")}</option>
      <option value="atkinson">${t("atkinson")}</option>
    `;
            rowDith.append(lblDith, dith);
            const rowDithStr = el("div", "pixel-row");
            const lblDithStr = el("label", null, t("ditherStrength"));
            const dithStr = document.createElement("input");
            dithStr.type = "range";
            dithStr.min = "0";
            dithStr.max = "100";
            dithStr.value = "70";
            dithStr.className = "pixel-slider";
            const dithWrap = el("span", "range-wrap");
            const dithVal = el("span", "value", "70");
            dithWrap.append(dithStr);
            rowDithStr.append(lblDithStr, dithWrap, dithVal);
            const customPanel = el("div", "custom-panel hidden");
            const actions = el("div", "custom-actions");
            const btnClear = el("button", "btn", t("clear"));
            const btnAddFree = el("button", "btn", t("addFree"));
            const btnSelectAll = el("button", "btn", t("selectAll"));
            const btnImportOwned = el("button", "btn", t("importOwned"));
            const selInfo = el("div", "note", t("selectedCount") + "0");
            actions.append(btnClear, btnAddFree, btnSelectAll, btnImportOwned, selInfo);
            const legend = el("div", "custom-legend");
            const lockIcon = el("span", "icon");
            lockIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"></path></svg>';
            legend.append(lockIcon, el("span", null, t("paidColor")));
            const grid = el("div", "color-grid");
            customPanel.append(actions, legend, grid);

            const rowGrow = el("div", "pixel-row");
            const lblGrow = el("label", null, t("outlineGrowBlack"));
            const sliderGrow = document.createElement("input");
            sliderGrow.type = "range";
            sliderGrow.min = "0";
            sliderGrow.max = "20";
            sliderGrow.step = "1";
            sliderGrow.value = "0";
            const growVal = el("span", "pixel-val", "0");
            sliderGrow.addEventListener("input", () => {
                growVal.textContent = sliderGrow.value;
                outlineGrow = Math.max(0, Math.min(20, Number(sliderGrow.value) || 0));
                fullRecalc();
            });
            rowGrow.append(lblGrow, sliderGrow, growVal);

            const rowShrink = el("div", "pixel-row");
            const lblShrink = el("label", null, t("shrinkEdgesInward"));
            const sliderShrink = document.createElement("input");
            sliderShrink.type = "range";
            sliderShrink.min = "0";
            sliderShrink.max = "20";
            sliderShrink.step = "1";
            sliderShrink.value = "0";
            const shrinkVal = el("span", "pixel-val", "0");
            sliderShrink.addEventListener("input", () => {
                shrinkVal.textContent = sliderShrink.value;
                outlineShrink = Math.max(0, Math.min(20, Number(sliderShrink.value) || 0));
                fullRecalc();
            });
            rowShrink.append(lblShrink, sliderShrink, shrinkVal);

            const TIME_PER_PIXEL_SECONDS = 30;

            function formatDuration(seconds) {
                let s = Math.max(0, Math.round(seconds));
                if (s < 60) return `${s} ${t("secondShort")}`;
                const days = Math.floor(s / 86400);
                s -= days * 86400;
                const hours = Math.floor(s / 3600);
                s -= hours * 3600;
                const minutes = Math.ceil(s / 60);
                if (days > 0) return `${days} ${t("dayShort")} ${hours} ${t("hourShort")}`;
                if (hours > 0) return `${hours} ${t("hourShort")} ${minutes} ${t("minuteShort")}`;
                return `${minutes} ${t("minuteShort")}`;
            }

            const stats = el("div", "pixel-stats");
            const stH = el("div", null, t("horizontal") + ": —");
            const s1 = el("div", null, "|");
            s1.style.opacity = ".6";
            s1.style.margin = "0 6px";
            const stV = el("div", null, t("vertical") + ": —");
            const s2 = el("div", null, "|");
            s2.style.opacity = ".6";
            s2.style.margin = "0 6px";
            const stT = el("div", null, t("total") + ": —");
            const s3 = el("div", null, "|");
            s3.style.opacity = ".6";
            s3.style.margin = "0 6px";
            const stExport = el("div", null, t("export") + ": — × —");
            const s4 = el("div", null, "|");
            s4.style.opacity = ".6";
            s4.style.margin = "0 6px";
            const stC = el("div", null, t("colorsUsed") + ": —");
            const s5 = el("div", null, "|");
            s5.style.opacity = ".6";
            s5.style.margin = "0 6px";
            const stTime = el("div", null, t("timeSpend") + ": —");
            stats.append(stH, s1, stV, s2, stT, s3, stExport, s4, stC, s5, stTime);
            controls.append(rowScale, rowPx, rowQuant, rowSpace, rowDith, rowDithStr, rowGrow, rowShrink, customPanel, stats);
            const preview = el("div", "pixel-preview");
            const canvas = document.createElement("canvas");
            canvas.className = "pixel-canvas";
            const ctx = canvas.getContext("2d", {
                alpha: !0
            });
            preview.append(canvas);
            body.append(controls, preview);
            const foot = el("div", "pixel-foot");
            const zoomLbl = el("div", "pixel-zoom", t("zoom") + ": 1×");
            const spacer = el("div", "spacer");
            const btnSave = el("button", "btn");
            btnSave.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3h10l4 4v14H3V3h4Z" stroke="currentColor" stroke-width="2"/><path d="M7 3h10v6H7V3Z" stroke="currentColor" stroke-width="2"/><path d="M12 13v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> ' + t("saveAsFile");
            const btnApply = el("button", "btn primary");
            btnApply.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + t("apply");
            const btnSkip = el("button", "btn");
            btnSkip.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + t("skip");
            const btnCancel = el("button", "btn danger");
            btnCancel.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> ' + t("cancel");
            const btnCV = el("button", "btn icon");
            btnCV.title = t("pcPreviewTitle");
            btnCV.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>';
            const btnEdit = el("button", "btn");
            btnEdit.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + t("brush");
            btnEdit.title = t("editPixelsTitle");
            foot.append(zoomLbl, btnCV, spacer, btnEdit, btnSave, btnApply, btnSkip, btnCancel);
            modal.append(head, body, foot);
            back.append(modal);
            shadow.append(back);
            const small = document.createElement("canvas");
            const sctx = small.getContext("2d", {
                willReadFrequently: !0,
                alpha: !0
            });

            let editMode = false;
            let lockedForEdit = false;
            let eraser = false;
            let eyedropper = false;
            let brushSizeEdit = 1;
            let editImageData = null;

            let selectMode = false;
            let selectionMask = null;
            let selectionCount = 0;
            let selCanvas = null,
                selCtx = null;
            let magicSelectMode = false;
            let magicTolerance = 32;

            let antsCanvas = null,
                antsCtx = null;
            let antsMaskCanvas = null,
                antsMaskCtx = null;
            let antsPatternCanvas = null;
            let antsOffset = 0;
            let antsAnimating = false,
                antsAnimRAF = 0;

            let antsSpeed = 1;
            let antsTileSize = 4;
            let antsBandWidth = 2;
            let antsOutlineThicknessPx = 1;

            let antsPatternSizeCache = 0;
            let antsPatternBandCache = 0;

            let antsScreenSpace = true;
            let antsSegH = [];
            let antsSegV = [];
            let editPalette = [];
            let editColor = [0, 0, 0];
            let activeColorIdx = 0;
            let hoverPos = null;

            const UNDO_LIMIT = 100;
            let undoStack = [];
            let redoStack = [];
            let strokeRec = null;

            let selStrokeRec = null;
            let selOp = 'add';

            let deferAntsWhileStroke = false;
            let renderScheduled = false;

            let useEditedSource = false;
            let editedSource = null;
            let editedSourceW = 0,
                editedSourceH = 0;
            let pixelSize = 1;
            slider.value = String(pixelSize);
            pxVal.textContent = String(pixelSize);
            let dwnW = 0,
                dwnH = 0;
            let selectedCustom = new Set();
            let customInit = !1;

            let outlineGrow = 0;
            let outlineShrink = 0;

            const CV_COLORS = MASTER_COLORS.map((_, idx) => cvColorFor(idx));

            let cvPreview = false;

            let baseSmallData = null;
            let currentPalette = [];

            let totalPaintablePxForProgress = 0;
            let remainingPxForProgress = 0;

            function updateSelInfo() {
                selInfo.textContent = t("selectedCount") + selectedCustom.size
            }

            function renderColorGrid() {
                grid.innerHTML = "";
                MASTER_COLORS.forEach((c, idx) => {
                    const btn = document.createElement("button");
                    btn.className = "color-btn";

                    const [r, g, b] = c.rgb;
                    btn.style.background = `rgb(${r}, ${g}, ${b})`;
                    btn.setAttribute("aria-label", c.name);
                    btn.title = c.name + (c.paid ? " " + t("paidColor") : "");
                    if (selectedCustom.has(idx)) btn.classList.add("selected");
                    const tip = el("div", "tip", c.name);
                    btn.append(tip);
                    if (c.paid) {
                        const lock = document.createElement("span");
                        lock.className = "lock";
                        lock.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"></path></svg>';
                        btn.append(lock)
                    }
                    btn.addEventListener("click", () => {
                        if (selectedCustom.has(idx)) selectedCustom.delete(idx);
                        else selectedCustom.add(idx);
                        btn.classList.toggle("selected");
                        updateSelInfo();
                        fullRecalc()
                    });
                    grid.append(btn)
                });
                updateSelInfo()
            }

            function selectFree() {
                selectedCustom.clear();
                MASTER_COLORS.forEach((c, idx) => {
                    if (!c.paid) selectedCustom.add(idx)
                });
                updateSelInfo();
                renderColorGrid()
            }

            function selectAllColors() {
                selectedCustom.clear();
                MASTER_COLORS.forEach((c, idx) => selectedCustom.add(idx));
                updateSelInfo();
                renderColorGrid()
            }

            function clearCustom() {
                selectedCustom.clear();
                updateSelInfo();
                renderColorGrid()
            }

            function importOwnedToCustom() {
                const owned = null;
                selectedCustom.clear();
                MASTER_COLORS.forEach((c, idx) => {
                    if (!c.paid) selectedCustom.add(idx)
                });
                updateSelInfo();
                renderColorGrid()
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


            function setCvPreview(v) {
                if (cvPreview === v) return;
                cvPreview = v;
                processQuantAndDither();
                render();
            }

            function doQuickSelectAt(clientX, clientY, opts) {
                if (!editImageData) return;
                opts = opts || {};
                const mode = opts.mode || 'replace';
                const tol = clamp(typeof opts.tolerance === 'number' ? opts.tolerance : magicTolerance, 0, 255) | 0;
                ensureSelectionBuffer();
                ensureSelCanvas();
                const pos = mapClientToPixel(clientX, clientY);
                if (!pos) return;
                const [sx, sy] = pos;
                const data = editImageData.data;
                const seedIdx = (sy * dwnW + sx) * 4;
                const tr = data[seedIdx],
                    tg = data[seedIdx + 1],
                    tb = data[seedIdx + 2];

                const total = dwnW * dwnH;
                const visited = new Uint8Array(total);
                const q = new Uint32Array(total);
                let h = 0,
                    t = 0;
                const seed = sy * dwnW + sx;
                visited[seed] = 1;
                q[t++] = seed;
                while (h < t) {
                    const i = q[h++];
                    const y = (i / dwnW) | 0;
                    const x = i - y * dwnW;

                    if (x > 0) {
                        const ni = i - 1;
                        if (!visited[ni]) {
                            const di = ni * 4;
                            const r = data[di],
                                g = data[di + 1],
                                b = data[di + 2];
                            if (Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol) {
                                visited[ni] = 1;
                                q[t++] = ni;
                            }
                        }
                    }

                    if (x + 1 < dwnW) {
                        const ni = i + 1;
                        if (!visited[ni]) {
                            const di = ni * 4;
                            const r = data[di],
                                g = data[di + 1],
                                b = data[di + 2];
                            if (Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol) {
                                visited[ni] = 1;
                                q[t++] = ni;
                            }
                        }
                    }

                    if (y > 0) {
                        const ni = i - dwnW;
                        if (!visited[ni]) {
                            const di = ni * 4;
                            const r = data[di],
                                g = data[di + 1],
                                b = data[di + 2];
                            if (Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol) {
                                visited[ni] = 1;
                                q[t++] = ni;
                            }
                        }
                    }

                    if (y + 1 < dwnH) {
                        const ni = i + dwnW;
                        if (!visited[ni]) {
                            const di = ni * 4;
                            const r = data[di],
                                g = data[di + 1],
                                b = data[di + 2];
                            if (Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol) {
                                visited[ni] = 1;
                                q[t++] = ni;
                            }
                        }
                    }
                }

                const newMask = new Uint8Array(total);
                let newSelCount = 0;
                if (mode === 'replace') {
                    for (let i = 0; i < total; i++) {
                        const v = visited[i] | 0;
                        newMask[i] = v;
                        newSelCount += v;
                    }
                } else if (mode === 'add') {
                    for (let i = 0; i < total; i++) {
                        const v = ((selectionMask[i] | 0) | (visited[i] | 0)) | 0;
                        newMask[i] = v;
                        newSelCount += v;
                    }
                } else if (mode === 'subtract') {
                    for (let i = 0; i < total; i++) {
                        const v = ((selectionMask[i] | 0) & ((visited[i] ^ 1) | 0)) | 0;
                        newMask[i] = v;
                        newSelCount += v;
                    }
                } else {

                    for (let i = 0; i < total; i++) {
                        const v = visited[i] | 0;
                        newMask[i] = v;
                        newSelCount += v;
                    }
                }

                let changedCount = 0;
                for (let i = 0; i < total; i++) {
                    if ((selectionMask[i] | 0) !== (newMask[i] | 0)) changedCount++;
                }
                if (!changedCount) {
                    render();
                    return;
                }
                const idxs = new Uint32Array(changedCount);
                const oldArr = new Uint8Array(changedCount);
                const neuArr = new Uint8Array(changedCount);
                let w = 0;
                for (let i = 0; i < total; i++) {
                    const o = selectionMask[i] | 0;
                    const n = newMask[i] | 0;
                    if (o !== n) {
                        idxs[w] = i;
                        oldArr[w] = o;
                        neuArr[w] = n;
                        w++;
                    }
                }

                selectionMask = newMask;
                selectionCount = newSelCount;
                rebuildSelOverlayFromMask();

                const act = {
                    kind: 'selection',
                    indices: idxs,
                    old: oldArr,
                    neu: neuArr
                };
                undoStack.push(act);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                redoStack = [];
                updateUndoRedoButtons();
                render();
            }

            btnCV.addEventListener("pointerenter", () => setCvPreview(true));
            btnCV.addEventListener("pointerleave", () => setCvPreview(false));

            foot.addEventListener("mouseleave", () => setCvPreview(false));

            btnCV.addEventListener("blur", () => setCvPreview(false));

            function applyUIState() {
                const isCustom = quant.value === "custom";
                customPanel.classList.toggle("hidden", !isCustom);
                dithStr.disabled = dith.value === "none";
                if (isCustom && !customInit) {
                    selectFree();
                    renderColorGrid();
                    customInit = !0
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
                if (useEditedSource && editedSource) {

                    sctx.drawImage(editedSource, 0, 0, editedSourceW, editedSourceH, 0, 0, dwnW, dwnH);
                } else if (bitmap) {
                    sctx.drawImage(bitmap, 0, 0, ow, oh, 0, 0, dwnW, dwnH)
                } else {
                    sctx.drawImage(imEl, 0, 0, ow, oh, 0, 0, dwnW, dwnH)
                }

                try {
                    const img0 = sctx.getImageData(0, 0, dwnW, dwnH);
                    baseSmallData = new Uint8ClampedArray(img0.data);
                } catch (_) {
                    baseSmallData = null;
                }

                let paintablePx = dwnW * dwnH;
                if (baseSmallData && baseSmallData.length === (dwnW * dwnH * 4)) {
                    let count = 0;
                    for (let i = 3; i < baseSmallData.length; i += 4) {
                        if (baseSmallData[i] >= 8) count++;
                    }
                    paintablePx = count;
                }
                stH.textContent = t("horizontal") + ": " + dwnW;
                stV.textContent = t("vertical") + ": " + dwnH;
                stT.textContent = t("total") + ": " + paintablePx.toLocaleString("ru-RU");
                stExport.textContent = `${t("export")}: ${dwnW} × ${dwnH}`
                stTime.textContent = `${t("timeSpend")}: ${formatDuration(paintablePx * TIME_PER_PIXEL_SECONDS)}`;
                totalPaintablePxForProgress = paintablePx | 0;
                remainingPxForProgress = totalPaintablePxForProgress;
                try {
                    if (progressChip && totalPaintablePxForProgress > 0) {
                        const painted = Math.max(0, totalPaintablePxForProgress - remainingPxForProgress);
                        const pct = Math.round((painted / totalPaintablePxForProgress) * 100);
                        progressChip.textContent = `${pct}%`;
                        let secs = 0;
                        try {
                            secs = (remainingPxForProgress | 0) * (TIME_PER_PIXEL_SECONDS | 0);
                        } catch (_) {
                            secs = (remainingPxForProgress | 0) * 30;
                        } {
                            const div = Math.max(1, (etaAccounts | 0));
                            secs = Math.floor(secs / div);
                        }
                        progressChip.title = `ETA: ${etaFormat(secs)}`;
                    }
                } catch (_) {}
            }

            function getPaletteForMode() {
                if (quant.value === "full") {
                    return MASTER_COLORS.map(c => c.rgb)
                } else if (quant.value === "free") {
                    return MASTER_COLORS.filter(c => !c.paid).map(c => c.rgb)
                } else if (quant.value === "custom") {
                    const arr = [];
                    selectedCustom.forEach(idx => {
                        const c = MASTER_COLORS[idx];
                        if (c) arr.push(c.rgb)
                    });
                    return arr
                } else if (quant.value === "owned") {
                    return MASTER_COLORS.filter(c => !c.paid).map(c => c.rgb)
                }
                return MASTER_COLORS.map(c => c.rgb)
            }

            function processQuantAndDither() {
                const pal = getPaletteForMode();
                currentPalette = pal.slice();
                if (!pal || pal.length === 0) {
                    stC.textContent = t("colorsUsed") + ": 0/0";
                    return
                }

                if (baseSmallData && baseSmallData.length === (dwnW * dwnH * 4)) {
                    const img0 = new ImageData(new Uint8ClampedArray(baseSmallData), dwnW, dwnH);
                    sctx.putImageData(img0, 0, 0);
                }
                const {
                    used,
                    total
                } = quantizeAndDitherSmall(sctx, dwnW, dwnH, {
                    palette: pal,
                    distanceSpace: space.value,
                    dither: dith.value,
                    ditherStrength: (Math.max(0, Math.min(100, Number(dithStr.value) || 70))) / 100,
                    displaySurrogate: cvPreview
                });

                try {
                    const post = sctx.getImageData(0, 0, dwnW, dwnH);
                    binarizeAlphaImageData(post, 8);

                    if (outlineShrink > 0) erodeAlphaImageData(post, outlineShrink);

                    if (outlineGrow > 0) dilateAlphaWithBlackImageData(post, outlineGrow);
                    sctx.putImageData(post, 0, 0);
                } catch {}

                try {
                    const cur = sctx.getImageData(0, 0, dwnW, dwnH);
                    let count = 0;
                    for (let i = 3; i < cur.data.length; i += 4)
                        if (cur.data[i] >= 8) count++;
                    stT.textContent = t("total") + ": " + count.toLocaleString("ru-RU");
                    stTime.textContent = `${t("timeSpend")}: ${formatDuration(count * TIME_PER_PIXEL_SECONDS)}`;
                    remainingPxForProgress = count | 0;
                    try {
                        if (progressChip && totalPaintablePxForProgress > 0) {
                            const painted = Math.max(0, totalPaintablePxForProgress - remainingPxForProgress);
                            const pct = Math.round((painted / totalPaintablePxForProgress) * 100);
                            progressChip.textContent = `${pct}%`;
                            let secs = 0;
                            try {
                                secs = (remainingPxForProgress | 0) * (TIME_PER_PIXEL_SECONDS | 0);
                            } catch (_) {
                                secs = (remainingPxForProgress | 0) * 30;
                            } {
                                const div = Math.max(1, (etaAccounts | 0));
                                secs = Math.floor(secs / div);
                            }
                            progressChip.title = `ETA: ${etaFormat(secs)}`;
                        }
                    } catch (_) {}
                } catch {}

                stC.textContent = `Colors used: ${used}/${total}`
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
                render()
            }

            function render() {
                const vw = canvas.width,
                    vh = canvas.height;
                ctx.clearRect(0, 0, vw, vh);
                const drawW = dwnW * zoom2,
                    drawH = dwnH * zoom2;

                {
                    const halfSpanX = (vw - drawW) / 2;
                    const halfSpanY = (vh - drawH) / 2;
                    const minX = Math.min(halfSpanX, -halfSpanX);
                    const maxX = Math.max(halfSpanX, -halfSpanX);
                    const minY = Math.min(halfSpanY, -halfSpanY);
                    const maxY = Math.max(halfSpanY, -halfSpanY);

                    const panMargin = Math.max(24, Math.round(0.25 * Math.min(vw, vh)));
                    offX2 = clamp(offX2, minX - panMargin, maxX + panMargin);
                    offY2 = clamp(offY2, minY - panMargin, maxY + panMargin);
                }
                const cx = (vw - drawW) / 2 + offX2,
                    cy = (vh - drawH) / 2 + offY2;
                ctx.imageSmoothingEnabled = !1;
                ctx.drawImage(small, 0, 0, dwnW, dwnH, Math.round(cx), Math.round(cy), Math.round(drawW), Math.round(drawH));

                try {
                    if (selectionCount > 0 && selectionMask && selectionMask.length === dwnW * dwnH) {
                        if (!selCanvas || selCanvas.width !== dwnW || selCanvas.height !== dwnH) {
                            selCanvas = document.createElement('canvas');
                            selCanvas.width = dwnW;
                            selCanvas.height = dwnH;
                            selCtx = selCanvas.getContext('2d', {
                                willReadFrequently: true,
                                alpha: true
                            });

                            const img = selCtx.createImageData(dwnW, dwnH);
                            const dd = img.data;
                            for (let i = 0; i < selectionMask.length; i++) {
                                if (selectionMask[i]) {
                                    dd[i * 4 + 0] = 0;
                                    dd[i * 4 + 1] = 200;
                                    dd[i * 4 + 2] = 255;
                                    dd[i * 4 + 3] = 255;
                                }
                            }
                            selCtx.putImageData(img, 0, 0);
                        }
                        ctx.save();
                        ctx.globalAlpha = 0.18;
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(selCanvas, 0, 0, dwnW, dwnH, Math.round(cx), Math.round(cy), Math.round(drawW), Math.round(drawH));
                        ctx.restore();
                    }
                } catch (_) {}

                try {
                    if (selectionCount > 0 && antsScreenSpace && (antsSegH.length || antsSegV.length)) {
                        const on = Math.max(0.5, Number(antsBandWidth) || 2);
                        const period = Math.max(on * 2, Number(antsTileSize) || on * 2);
                        const off = Math.max(0, period - on);
                        const thick = Math.max(0, Number(antsOutlineThicknessPx) || 0);
                        const lw = thick >= 1 ? Math.floor(thick) : 1;
                        const alpha = thick >= 1 ? 1 : Math.max(0, thick);
                        ctx.save();
                        ctx.imageSmoothingEnabled = false;
                        ctx.lineCap = 'butt';
                        ctx.lineJoin = 'miter';
                        ctx.setLineDash([on, off]);

                        const strokeAll = (color, dashOffset) => {
                            ctx.strokeStyle = color;
                            ctx.lineDashOffset = -dashOffset;
                            ctx.lineWidth = lw;
                            ctx.globalAlpha = alpha;
                            ctx.beginPath();

                            for (let k = 0; k < antsSegH.length; k++) {
                                const seg = antsSegH[k];
                                const yS = Math.round(cy + seg.y * zoom2) + 0.5;
                                const x0S = Math.round(cx + seg.x0 * zoom2);
                                const x1S = Math.round(cx + (seg.x1 + 1) * zoom2);
                                ctx.moveTo(x0S, yS);
                                ctx.lineTo(x1S, yS);
                            }

                            for (let k = 0; k < antsSegV.length; k++) {
                                const seg = antsSegV[k];
                                const xS = Math.round(cx + seg.x * zoom2) + 0.5;
                                const y0S = Math.round(cy + seg.y0 * zoom2);
                                const y1S = Math.round(cy + (seg.y1 + 1) * zoom2);
                                ctx.moveTo(xS, y0S);
                                ctx.lineTo(xS, y1S);
                            }
                            ctx.stroke();
                        };

                        strokeAll('#000', antsOffset % period);
                        strokeAll('#fff', (antsOffset + on) % period);
                        ctx.restore();
                    } else if (selectionCount > 0 && antsCanvas && antsCanvas.width === dwnW && antsCanvas.height === dwnH) {

                        ctx.save();
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(antsCanvas, 0, 0, dwnW, dwnH, Math.round(cx), Math.round(cy), Math.round(drawW), Math.round(drawH));
                        ctx.restore();
                    }
                } catch (_) {}

                if (editMode && hoverPos) {
                    const [ix, iy] = hoverPos;
                    const size = Math.max(1, Math.round(brushSizeEdit));
                    const half = Math.floor((size - 1) / 2);
                    let x0 = clamp(ix - half, 0, dwnW - 1);
                    let y0 = clamp(iy - half, 0, dwnH - 1);
                    let x1 = clamp(ix + size - half - 1, 0, dwnW - 1);
                    let y1 = clamp(iy + size - half - 1, 0, dwnH - 1);
                    const rx = Math.round(cx + x0 * zoom2);
                    const ry = Math.round(cy + y0 * zoom2);
                    const rw = Math.round((x1 - x0 + 1) * zoom2);
                    const rh = Math.round((y1 - y0 + 1) * zoom2);
                    ctx.save();
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = 'rgba(0,0,0,.85)';
                    ctx.strokeRect(rx, ry, rw, rh);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(255,255,255,.95)';
                    ctx.strokeRect(rx, ry, rw, rh);
                    ctx.restore();
                }
                zoomLbl.textContent = `Zoom: ${zoom2}×`
            }
            const roPrev = new ResizeObserver(() => fitAndRender());
            roPrev.observe(preview);
            let dragging2 = !1,
                sx2 = 0,
                sy2 = 0,
                sox2 = 0,
                soy2 = 0;

            let painting = false;
            let panningWhileEdit = false;

            function beginStroke() {
                strokeRec = {
                    indices: [],
                    old: [],
                    seen: new Set()
                };
            }

            function recordBeforeChange(idx4, data) {
                if (!strokeRec) return;
                if (strokeRec.seen.has(idx4)) return;
                strokeRec.seen.add(idx4);
                strokeRec.indices.push(idx4);
                strokeRec.old.push(data[idx4], data[idx4 + 1], data[idx4 + 2], data[idx4 + 3]);
            }

            function finishStroke() {
                if (!strokeRec || strokeRec.indices.length === 0) {
                    strokeRec = null;
                    return;
                }

                const data = editImageData?.data;
                if (!data) {
                    strokeRec = null;
                    return;
                }
                const newArr = new Uint8ClampedArray(strokeRec.indices.length * 4);
                for (let i = 0; i < strokeRec.indices.length; i++) {
                    const base = strokeRec.indices[i];
                    const di = i * 4;
                    newArr[di] = data[base];
                    newArr[di + 1] = data[base + 1];
                    newArr[di + 2] = data[base + 2];
                    newArr[di + 3] = data[base + 3];
                }
                const act = {
                    indices: new Uint32Array(strokeRec.indices),
                    old: new Uint8ClampedArray(strokeRec.old),
                    neu: newArr
                };
                undoStack.push(act);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                redoStack = [];
                strokeRec = null;
                updateUndoRedoButtons();
            }

            function applyAction(act, useOld) {
                if (!act) return;
                if (act.kind === 'selection') {
                    ensureSelectionBuffer();
                    ensureSelCanvas();
                    const src = useOld ? act.old : act.neu;
                    for (let i = 0; i < act.indices.length; i++) {
                        const si = act.indices[i];
                        const prev = selectionMask[si] | 0;
                        const next = src[i] | 0;
                        if (prev === next) continue;
                        selectionMask[si] = next;
                        selectionCount += (next - prev);
                        const x = si % dwnW,
                            y = (si / dwnW) | 0;
                        if (next) {
                            selCtx.fillStyle = '#00c8ff';
                            selCtx.fillRect(x, y, 1, 1);
                        } else {
                            selCtx.clearRect(x, y, 1, 1);
                        }
                    }
                    rebuildAntsMaskFromSelection();
                    render();
                } else {
                    if (!editImageData) return;
                    const data = editImageData.data;
                    const src = useOld ? act.old : act.neu;
                    for (let i = 0; i < act.indices.length; i++) {
                        const base = act.indices[i];
                        const di = i * 4;
                        data[base] = src[di];
                        data[base + 1] = src[di + 1];
                        data[base + 2] = src[di + 2];
                        data[base + 3] = src[di + 3];
                    }
                    try {
                        sctx.putImageData(editImageData, 0, 0);
                    } catch {}
                    render();
                }
            }

            function doUndo() {
                if (!undoStack.length) return;
                const act = undoStack.pop();
                applyAction(act, true);
                redoStack.push(act);
                if (redoStack.length > UNDO_LIMIT) redoStack.shift();
                updateUndoRedoButtons();
            }

            function doRedo() {
                if (!redoStack.length) return;
                const act = redoStack.pop();
                applyAction(act, false);
                undoStack.push(act);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                updateUndoRedoButtons();
            }

            function updateUndoRedoButtons() {
                try {
                    btnUndo.disabled = !undoStack.length;
                    btnRedo.disabled = !redoStack.length;
                } catch (_) {}
            }

            function onKeyDownEdit(e) {
                if (!editMode) return;
                const tag = (e.target && (e.target.tagName || '')).toLowerCase();
                const key = (e.key || '').toLowerCase();
                if (key === 'alt') {
                    try {
                        btnToolEyedropper.classList.add('primary');
                    } catch {}
                    return;
                }
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
                const mod = e.ctrlKey || e.metaKey;
                if (!e.altKey && !mod) {
                    if (key === 'b') {
                        e.preventDefault();
                        eraser = false;
                        eyedropper = false;
                        try {
                            btnToolBrush.classList.add('primary');
                        } catch {}
                        try {
                            btnToolEraser.classList.remove('primary');
                        } catch {}
                        try {
                            btnToolEyedropper.classList.remove('primary');
                        } catch {}
                        return;
                    }
                    if (key === 'e') {
                        e.preventDefault();
                        eraser = true;
                        eyedropper = false;
                        try {
                            btnToolEraser.classList.add('primary');
                        } catch {}
                        try {
                            btnToolBrush.classList.remove('primary');
                        } catch {}
                        try {
                            btnToolEyedropper.classList.remove('primary');
                        } catch {}
                        return;
                    }
                    if (key === 's') {
                        e.preventDefault();
                        selectMode = !selectMode;
                        try {
                            btnToolSelect.classList.toggle('primary', selectMode);
                        } catch {}

                        eyedropper = false;
                        try {
                            btnToolEyedropper.classList.remove('primary');
                        } catch {}
                        render();
                        return;
                    }
                }
                if (mod && !e.shiftKey && key === 'z') {
                    e.preventDefault();
                    doUndo();
                } else if (mod && (key === 'y' || (e.shiftKey && key === 'z'))) {
                    e.preventDefault();
                    doRedo();
                }
            }

            function onKeyUpEdit(e) {
                if (!editMode) return;
                const key = (e.key || '').toLowerCase();
                if (key === 'alt') {
                    try {
                        if (!eyedropper) btnToolEyedropper.classList.remove('primary');
                    } catch {}
                }
            }

            function mapClientToPixel(clientX, clientY) {
                const rect = canvas.getBoundingClientRect();
                const vw = canvas.width,
                    vh = canvas.height;
                const drawW = dwnW * zoom2,
                    drawH = dwnH * zoom2;
                const cx = (vw - drawW) / 2 + offX2;
                const cy = (vh - drawH) / 2 + offY2;
                const x = Math.floor((clientX - rect.left - cx) / Math.max(1e-6, zoom2));
                const y = Math.floor((clientY - rect.top - cy) / Math.max(1e-6, zoom2));
                if (x < 0 || y < 0 || x >= dwnW || y >= dwnH) return null;
                return [x, y];
            }

            function pickColorAt(clientX, clientY) {
                if (!editImageData) return;
                const pos = mapClientToPixel(clientX, clientY);
                if (!pos) return;
                const [ix, iy] = pos;
                const idx = (iy * dwnW + ix) * 4;
                const data = editImageData.data;
                const r = data[idx + 0] | 0;
                const g = data[idx + 1] | 0;
                const b = data[idx + 2] | 0;
                editColor = [r, g, b];
                const pi = findPaletteIndex(editColor);
                if (pi >= 0) {
                    activeColorIdx = pi;
                } else {
                    activeColorIdx = -1;
                }
                updateActivePaletteUI();
                render();
            }

            function ensureSelectionBuffer() {
                if (!selectionMask || selectionMask.length !== dwnW * dwnH) {
                    selectionMask = new Uint8Array(dwnW * dwnH);
                    selectionCount = 0;
                }
            }

            function ensureSelCanvas() {
                if (!selCanvas || selCanvas.width !== dwnW || selCanvas.height !== dwnH) {
                    selCanvas = document.createElement('canvas');
                    selCanvas.width = dwnW;
                    selCanvas.height = dwnH;
                    selCtx = selCanvas.getContext('2d', {
                        willReadFrequently: true,
                        alpha: true
                    });
                }
            }

            function rebuildSelOverlayFromMask() {
                ensureSelCanvas();
                const img = selCtx.createImageData(dwnW, dwnH);
                const dd = img.data;
                for (let i = 0; i < selectionMask.length; i++) {
                    if (selectionMask[i]) {
                        dd[i * 4 + 0] = 0;
                        dd[i * 4 + 1] = 200;
                        dd[i * 4 + 2] = 255;
                        dd[i * 4 + 3] = 255;
                    }
                }
                selCtx.putImageData(img, 0, 0);
                rebuildAntsMaskFromSelection();
            }

            function ensureAntsCanvases() {
                if (!antsCanvas || antsCanvas.width !== dwnW || antsCanvas.height !== dwnH) {
                    antsCanvas = document.createElement('canvas');
                    antsCanvas.width = dwnW;
                    antsCanvas.height = dwnH;
                    antsCtx = antsCanvas.getContext('2d', {
                        willReadFrequently: true,
                        alpha: true
                    });
                }
                if (!antsMaskCanvas || antsMaskCanvas.width !== dwnW || antsMaskCanvas.height !== dwnH) {
                    antsMaskCanvas = document.createElement('canvas');
                    antsMaskCanvas.width = dwnW;
                    antsMaskCanvas.height = dwnH;
                    antsMaskCtx = antsMaskCanvas.getContext('2d', {
                        willReadFrequently: true,
                        alpha: true
                    });
                }

                const ts = Math.max(2, Math.floor(antsTileSize) || 8);
                const bw = Math.max(0, Math.min(ts, Math.floor(antsBandWidth) || 0));
                if (!antsPatternCanvas || antsPatternSizeCache !== ts || antsPatternBandCache !== bw) {
                    antsPatternSizeCache = ts;
                    antsPatternBandCache = bw;
                    const tile = document.createElement('canvas');
                    tile.width = ts;
                    tile.height = ts;
                    const tctx = tile.getContext('2d', {
                        alpha: true
                    });
                    const img = tctx.createImageData(ts, ts);
                    const d = img.data;
                    for (let y = 0; y < ts; y++) {
                        for (let x = 0; x < ts; x++) {
                            const band = (((x + y) % ts) < bw);
                            const c = band ? 0 : 255;
                            const i = (y * ts + x) * 4;
                            d[i] = c;
                            d[i + 1] = c;
                            d[i + 2] = c;
                            d[i + 3] = 255;
                        }
                    }
                    tctx.putImageData(img, 0, 0);
                    antsPatternCanvas = tile;

                    antsOffset = ((antsOffset % ts) + ts) % ts;
                }
            }

            function rebuildAntsMaskFromSelection() {
                ensureAntsCanvases();
                antsMaskCtx.clearRect(0, 0, dwnW, dwnH);
                if (!selectionMask || selectionCount <= 0) {
                    stopAntsAnimation();
                    if (antsCtx) antsCtx.clearRect(0, 0, dwnW, dwnH);
                    antsSegH = [];
                    antsSegV = [];
                    return;
                }
                const img = antsMaskCtx.createImageData(dwnW, dwnH);
                const dd = img.data;

                const thick = Math.max(0, Number(antsOutlineThicknessPx) || 0);
                const full = Math.floor(thick);
                const frac = thick - full;
                const innerRad = Math.max(0, full - 1);
                for (let y = 0; y < dwnH; y++) {
                    const row = y * dwnW;
                    for (let x = 0; x < dwnW; x++) {
                        const i = row + x;
                        if (!selectionMask[i]) continue;
                        let isEdge = false;

                        if (x === 0 || !selectionMask[i - 1]) isEdge = true;
                        else if (x === dwnW - 1 || !selectionMask[i + 1]) isEdge = true;
                        else if (y === 0 || !selectionMask[i - dwnW]) isEdge = true;
                        else if (y === dwnH - 1 || !selectionMask[i + dwnW]) isEdge = true;
                        if (isEdge) {
                            if (thick < 1) {

                                const a = Math.round(255 * thick);
                                dd[i * 4 + 3] = Math.max(dd[i * 4 + 3], a);
                            } else {

                                if (innerRad === 0) {
                                    dd[i * 4 + 3] = 255;
                                } else {
                                    for (let dy = -innerRad; dy <= innerRad; dy++) {
                                        const yy = y + dy;
                                        if (yy < 0 || yy >= dwnH) continue;
                                        const mdx = innerRad - Math.abs(dy);
                                        const base = yy * dwnW;
                                        for (let dx = -mdx; dx <= mdx; dx++) {
                                            const xx = x + dx;
                                            if (xx < 0 || xx >= dwnW) continue;
                                            const j = base + xx;
                                            dd[j * 4 + 3] = 255;
                                        }
                                    }
                                }

                                if (frac > 0) {
                                    const r2 = innerRad + 1;
                                    const a2 = Math.round(255 * frac);
                                    for (let dy = -r2; dy <= r2; dy++) {
                                        const yy = y + dy;
                                        if (yy < 0 || yy >= dwnH) continue;
                                        const mdx = r2 - Math.abs(dy);
                                        const base = yy * dwnW;
                                        for (let dx = -mdx; dx <= mdx; dx++) {
                                            const xx = x + dx;
                                            if (xx < 0 || xx >= dwnW) continue;
                                            const j = base + xx;

                                            dd[j * 4 + 3] = Math.max(dd[j * 4 + 3], a2);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                antsMaskCtx.putImageData(img, 0, 0);

                antsSegH = [];
                antsSegV = [];

                for (let y = 0; y < dwnH; y++) {
                    const row = y * dwnW;

                    let x = 0;
                    while (x < dwnW) {

                        if (selectionMask[row + x] && (y === 0 || !selectionMask[row + x - dwnW])) {
                            let x0 = x;
                            x++;
                            while (x < dwnW && selectionMask[row + x] && (y === 0 || !selectionMask[row + x - dwnW])) x++;
                            antsSegH.push({
                                y: y,
                                x0,
                                x1: x - 1
                            });
                        } else {
                            x++;
                        }
                    }

                    x = 0;
                    while (x < dwnW) {
                        if (selectionMask[row + x] && (y === dwnH - 1 || !selectionMask[row + x + dwnW])) {
                            let x0 = x;
                            x++;
                            while (x < dwnW && selectionMask[row + x] && (y === dwnH - 1 || !selectionMask[row + x + dwnW])) x++;
                            antsSegH.push({
                                y: y + 1,
                                x0,
                                x1: x - 1
                            });
                        } else {
                            x++;
                        }
                    }
                }

                for (let x = 0; x < dwnW; x++) {

                    let y = 0;
                    while (y < dwnH) {
                        const i = y * dwnW + x;
                        if (selectionMask[i] && (x === 0 || !selectionMask[i - 1])) {
                            let y0 = y;
                            y++;
                            while (y < dwnH) {
                                const j = y * dwnW + x;
                                if (selectionMask[j] && (x === 0 || !selectionMask[j - 1])) y++;
                                else break;
                            }
                            antsSegV.push({
                                x: x,
                                y0,
                                y1: y - 1
                            });
                        } else {
                            y++;
                        }
                    }

                    y = 0;
                    while (y < dwnH) {
                        const i2 = y * dwnW + x;
                        if (selectionMask[i2] && (x === dwnW - 1 || !selectionMask[i2 + 1])) {
                            let y0 = y;
                            y++;
                            while (y < dwnH) {
                                const j2 = y * dwnW + x;
                                if (selectionMask[j2] && (x === dwnW - 1 || !selectionMask[j2 + 1])) y++;
                                else break;
                            }
                            antsSegV.push({
                                x: x + 1,
                                y0,
                                y1: y - 1
                            });
                        } else {
                            y++;
                        }
                    }
                }
                redrawAnts();
                startAntsAnimation();
            }

            function redrawAnts() {
                ensureAntsCanvases();
                antsCtx.setTransform(1, 0, 0, 1, 0, 0);
                antsCtx.clearRect(0, 0, dwnW, dwnH);
                if (!selectionMask || selectionCount <= 0) return;
                const pat = antsCtx.createPattern(antsPatternCanvas, 'repeat');
                if (!pat) return;
                antsCtx.save();

                antsCtx.setTransform(1, 0, 0, 1, antsOffset, antsOffset);
                antsCtx.fillStyle = pat;

                const ts = antsPatternSizeCache || 8;
                antsCtx.fillRect(-antsOffset - ts, -antsOffset - ts, dwnW + ts * 2, dwnH + ts * 2);
                antsCtx.restore();
                antsCtx.globalCompositeOperation = 'destination-in';
                antsCtx.drawImage(antsMaskCanvas, 0, 0);
                antsCtx.globalCompositeOperation = 'source-over';
            }

            function startAntsAnimation() {
                if (antsAnimating) return;
                if (!selectionMask || selectionCount <= 0) return;
                antsAnimating = true;
                let lastT = 0;
                const step = (t) => {
                    if (!antsAnimating) return;
                    if (!lastT) lastT = t;

                    const dt = Math.max(0, Math.min(0.1, (t - lastT) / 1000));
                    lastT = t;
                    const ts = Math.max(2, Math.floor(antsPatternSizeCache || antsTileSize) || 8);
                    const sp = Math.max(0, Number(antsSpeed) || 0);
                    antsOffset = ((antsOffset + sp * dt) % ts + ts) % ts;
                    redrawAnts();
                    render();
                    antsAnimRAF = requestAnimationFrame(step);
                };
                antsAnimRAF = requestAnimationFrame(step);
            }

            function stopAntsAnimation() {
                antsAnimating = false;
                cancelAnimationFrame(antsAnimRAF);
                requestRender();
            }

            function requestRender() {
                if (renderScheduled) return;
                renderScheduled = true;
                requestAnimationFrame(() => {
                    renderScheduled = false;
                    render();
                });
            }

            function beginSelStroke() {
                selStrokeRec = {
                    indices: [],
                    old: [],
                    seen: new Set()
                };
            }

            function recordSelBeforeChange(si) {
                if (!selStrokeRec) return;
                if (selStrokeRec.seen.has(si)) return;
                selStrokeRec.seen.add(si);
                selStrokeRec.indices.push(si);
                selStrokeRec.old.push(selectionMask ? (selectionMask[si] | 0) : 0);
            }

            function finishSelStroke() {
                if (!selStrokeRec || selStrokeRec.indices.length === 0) {
                    selStrokeRec = null;
                    return;
                }
                ensureSelectionBuffer();
                const neu = new Uint8Array(selStrokeRec.indices.length);
                for (let i = 0; i < selStrokeRec.indices.length; i++) {
                    neu[i] = selectionMask[selStrokeRec.indices[i]] | 0;
                }
                const act = {
                    kind: 'selection',
                    indices: new Uint32Array(selStrokeRec.indices),
                    old: new Uint8Array(selStrokeRec.old),
                    neu
                };
                undoStack.push(act);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                redoStack = [];
                selStrokeRec = null;
                updateUndoRedoButtons();
            }

            function modifySelectionAt(clientX, clientY) {
                ensureSelectionBuffer();
                ensureSelCanvas();
                const pos = mapClientToPixel(clientX, clientY);
                if (!pos) return;
                const [ix, iy] = pos;
                const size = Math.max(1, Math.round(brushSizeEdit));
                const half = Math.floor((size - 1) / 2);
                let x0 = clamp(ix - half, 0, dwnW - 1);
                let y0 = clamp(iy - half, 0, dwnH - 1);
                let x1 = clamp(ix + size - half - 1, 0, dwnW - 1);
                let y1 = clamp(iy + size - half - 1, 0, dwnH - 1);
                const op = selOp;
                let toggledAny = false;
                for (let y = y0; y <= y1; y++) {
                    const row = y * dwnW;
                    for (let x = x0; x <= x1; x++) {
                        const si = row + x;
                        const prev = selectionMask[si] | 0;
                        let next = prev;
                        if (op === 'add') next = 1;
                        else if (op === 'subtract') next = 0;
                        else next = prev ^ 1;
                        if (prev !== next) {
                            recordSelBeforeChange(si);
                            selectionMask[si] = next;
                            selectionCount += (next ? 1 : -1);
                            if (op === 'toggle') toggledAny = true;
                        }
                    }
                }
                if (selectionCount < 0) selectionCount = 0;
                const ww = x1 - x0 + 1,
                    hh = y1 - y0 + 1;
                if (op === 'add') {
                    selCtx.fillStyle = '#00c8ff';
                    selCtx.fillRect(x0, y0, ww, hh);
                } else if (op === 'subtract') {
                    selCtx.clearRect(x0, y0, ww, hh);
                } else {

                    if (toggledAny) rebuildSelOverlayFromMask();
                }
                if (!deferAntsWhileStroke) rebuildAntsMaskFromSelection();
                requestRender();
            }

            function paintAt(clientX, clientY) {
                if (!editMode || !editImageData) return;
                const pos = mapClientToPixel(clientX, clientY);
                if (!pos) return;
                const [ix, iy] = pos;
                const size = Math.max(1, Math.round(brushSizeEdit));
                const half = Math.floor((size - 1) / 2);
                let x0 = clamp(ix - half, 0, dwnW - 1);
                let y0 = clamp(iy - half, 0, dwnH - 1);
                let x1 = clamp(ix + size - half - 1, 0, dwnW - 1);
                let y1 = clamp(iy + size - half - 1, 0, dwnH - 1);
                const data = editImageData.data;
                for (let y = y0; y <= y1; y++) {
                    const row = y * dwnW;
                    for (let x = x0; x <= x1; x++) {
                        const idx = (row + x) * 4;
                        if (selectionCount > 0 && selectionMask && selectionMask.length === dwnW * dwnH) {
                            if (!selectionMask[row + x]) continue;
                        }
                        recordBeforeChange(idx, data);
                        if (eraser) {
                            data[idx + 3] = 0;
                        } else {
                            data[idx + 0] = editColor[0] | 0;
                            data[idx + 1] = editColor[1] | 0;
                            data[idx + 2] = editColor[2] | 0;
                            data[idx + 3] = 255;
                        }
                    }
                }
                try {
                    sctx.putImageData(editImageData, 0, 0);
                } catch {}
                render();
            }
            preview.addEventListener("pointerdown", (e) => {
                if (editMode) {

                    if (e.button === 0) {
                        const tempPick = !!e.altKey;
                        if (eyedropper || tempPick) {
                            pickColorAt(e.clientX, e.clientY);

                            if (eyedropper) {
                                eyedropper = false;
                                try {
                                    btnToolEyedropper.classList.remove("primary");
                                } catch {}
                                eraser = false;
                                try {
                                    btnToolBrush.classList.add("primary");
                                } catch {}
                            }
                            return;
                        }
                        if (magicSelectMode) {

                            preview.setPointerCapture?.(e.pointerId);
                            let mode = 'replace';
                            if (e.shiftKey) {
                                let under = 0;
                                const pos = mapClientToPixel(e.clientX, e.clientY);
                                if (pos && selectionMask && selectionMask.length === dwnW * dwnH) {
                                    const [sx, sy] = pos;
                                    under = selectionMask[sy * dwnW + sx] | 0;
                                }
                                mode = under ? 'subtract' : 'add';
                            }
                            doQuickSelectAt(e.clientX, e.clientY, {
                                mode,
                                tolerance: magicTolerance
                            });
                            return;
                        }
                        if (selectMode) {
                            painting = true;
                            preview.setPointerCapture?.(e.pointerId);
                            selOp = e.shiftKey ? 'subtract' : 'add';
                            deferAntsWhileStroke = true;
                            beginSelStroke();
                            modifySelectionAt(e.clientX, e.clientY);
                            return;
                        }
                        painting = true;
                        preview.setPointerCapture?.(e.pointerId);
                        beginStroke();
                        paintAt(e.clientX, e.clientY);
                    } else if (e.button === 1 || e.button === 2) {

                        e.preventDefault();
                        panningWhileEdit = true;
                        preview.setPointerCapture?.(e.pointerId);
                        sx2 = e.clientX;
                        sy2 = e.clientY;
                        sox2 = offX2;
                        soy2 = offY2;
                    }
                    return;
                }
                dragging2 = !0;
                preview.setPointerCapture?.(e.pointerId);
                sx2 = e.clientX;
                sy2 = e.clientY;
                sox2 = offX2;
                soy2 = offY2
            });
            preview.addEventListener("pointermove", (e) => {
                if (editMode) {
                    hoverPos = mapClientToPixel(e.clientX, e.clientY);
                    if (panningWhileEdit) {
                        offX2 = sox2 + (e.clientX - sx2);
                        offY2 = soy2 + (e.clientY - sy2);
                        render();
                        return;
                    }
                    if (painting) {
                        if (selectMode) modifySelectionAt(e.clientX, e.clientY);
                        else paintAt(e.clientX, e.clientY);
                        return;
                    }

                    render();
                    return;
                }
                if (!dragging2) return;
                offX2 = sox2 + (e.clientX - sx2);
                offY2 = soy2 + (e.clientY - sy2);
                render()
            });
            preview.addEventListener("pointerup", () => {
                if (editMode) {
                    painting = false;
                    panningWhileEdit = false;
                    if (selectMode) {
                        finishSelStroke();
                        deferAntsWhileStroke = false;
                        rebuildAntsMaskFromSelection();
                        requestRender();
                    } else {
                        finishStroke();
                    }
                    return;
                }
                dragging2 = !1
            });
            preview.addEventListener("wheel", (e) => {
                e.preventDefault();

                if (editMode && (e.ctrlKey || e.metaKey)) {
                    const dir = e.deltaY > 0 ? -1 : 1;
                    brushSizeEdit = clamp(brushSizeEdit + dir, 1, 64);
                    try {
                        sizeInp.value = String(brushSizeEdit);
                    } catch {}
                    render();
                    return;
                }
                const dir = e.deltaY > 0 ? -1 : 1;
                const nz = clamp(zoom2 + dir, minZoom2, maxZoom2);
                if (nz !== zoom2) {
                    const rect = preview.getBoundingClientRect();
                    const mx = e.clientX - rect.left,
                        my = e.clientY - rect.top;
                    const vx = (mx - (preview.clientWidth - canvas.width) / 2 - offX2) / zoom2;
                    const vy = (my - (preview.clientHeight - canvas.height) / 2 - offY2) / zoom2;
                    zoom2 = nz;
                    const nx = vx * zoom2 + (preview.clientWidth - canvas.width) / 2 + offX2;
                    const ny = vy * zoom2 + (preview.clientHeight - canvas.height) / 2 + offY2;
                    offX2 += mx - nx;
                    offY2 += my - ny;
                    render()
                }
            }, {
                passive: !1
            });

            preview.addEventListener("contextmenu", (e) => {
                if (editMode) e.preventDefault();
            });

            const editToolbar = el("div", null);
            editToolbar.style.position = "absolute";
            editToolbar.style.top = "8px";
            editToolbar.style.left = "8px";
            editToolbar.style.background = "rgba(0,0,0,.35)";
            editToolbar.style.backdropFilter = "blur(6px) saturate(1.05)";
            editToolbar.style.webkitBackdropFilter = "blur(6px) saturate(1.05)";
            editToolbar.style.border = "1px solid rgba(255,255,255,.12)";
            editToolbar.style.borderRadius = "8px";
            editToolbar.style.padding = "8px";
            editToolbar.style.display = "none";
            editToolbar.style.color = "#dbe3ea";
            editToolbar.style.zIndex = "10";
            const toolRow = el("div", null);
            toolRow.style.display = "flex";
            toolRow.style.gap = "8px";
            const btnUndo = el("button", "btn icon");
            btnUndo.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5L3 11l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 19a8 8 0 0 0-8-8H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
            btnUndo.title = t("undoTitle");
            btnUndo.disabled = true;
            const btnRedo = el("button", "btn icon");
            btnRedo.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 5l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 19a8 8 0 0 1 8-8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
            btnRedo.title = t("redoTitle");
            btnRedo.disabled = true;
            btnUndo.addEventListener('click', () => {
                if (editMode) doUndo();
            });
            btnRedo.addEventListener('click', () => {
                if (editMode) doRedo();
            });
            const btnToolBrush = el("button", "btn icon primary");
            btnToolBrush.title = t("brushTitle");
            btnToolBrush.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 17C4 15.3431 5.34315 14 7 14V14C8.65685 14 10 15.3431 10 17V17C10 18.6569 8.65685 20 7 20H4.54545C4.24421 20 4 19.7558 4 19.4545V18.5V17V17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13.7542L15.5898 5.32104C16.3563 4.46932 17.6804 4.4345 18.4906 5.24475L18.6229 5.37708L18.7552 5.5094C19.5655 6.31965 19.5307 7.64365 18.679 8.4102L10.2458 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            const btnToolEraser = el("button", "btn icon");
            btnToolEraser.title = t("eraserTitle");
            btnToolEraser.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.9995 13L10.9995 6.00004M20.9995 21H7.99955M10.9368 20.0628L19.6054 11.3941C20.7935 10.2061 21.3875 9.61207 21.6101 8.92709C21.8058 8.32456 21.8058 7.67551 21.6101 7.07298C21.3875 6.388 20.7935 5.79397 19.6054 4.60592L19.3937 4.39415C18.2056 3.2061 17.6116 2.61207 16.9266 2.38951C16.3241 2.19373 15.675 2.19373 15.0725 2.38951C14.3875 2.61207 13.7935 3.2061 12.6054 4.39415L4.39366 12.6059C3.20561 13.794 2.61158 14.388 2.38902 15.073C2.19324 15.6755 2.19324 16.3246 2.38902 16.9271C2.61158 17.6121 3.20561 18.2061 4.39366 19.3941L5.06229 20.0628C5.40819 20.4087 5.58114 20.5816 5.78298 20.7053C5.96192 20.815 6.15701 20.8958 6.36108 20.9448C6.59126 21 6.83585 21 7.32503 21H8.67406C9.16324 21 9.40784 21 9.63801 20.9448C9.84208 20.8958 10.0372 20.815 10.2161 20.7053C10.418 20.5816 10.5909 20.4087 10.9368 20.0628Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            const btnToolSelect = el("button", "btn icon");
            btnToolSelect.title = "Выделение (S)";
            btnToolSelect.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 6C5.55228 6 6 5.55228 6 5C6 4.44772 5.55228 4 5 4C4.44772 4 4 4.44772 4 5C4 5.55228 4.44772 6 5 6ZM18 13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13V16H13C12.4477 16 12 16.4477 12 17C12 17.5523 12.4477 18 13 18H16V21C16 21.5523 16.4477 22 17 22C17.5523 22 18 21.5523 18 21V18H21C21.5523 18 22 17.5523 22 17C22 16.4477 21.5523 16 21 16H18V13ZM10 5C10 5.55228 9.55228 6 9 6C8.44771 6 8 5.55228 8 5C8 4.44772 8.44771 4 9 4C9.55228 4 10 4.44772 10 5ZM13 6C13.5523 6 14 5.55228 14 5C14 4.44772 13.5523 4 13 4C12.4477 4 12 4.44772 12 5C12 5.55228 12.4477 6 13 6ZM18 5C18 5.55228 17.5523 6 17 6C16.4477 6 16 5.55228 16 5C16 4.44772 16.4477 4 17 4C17.5523 4 18 4.44772 18 5ZM17 10C17.5523 10 18 9.55228 18 9C18 8.44771 17.5523 8 17 8C16.4477 8 16 8.44771 16 9C16 9.55228 16.4477 10 17 10ZM10 17C10 17.5523 9.55228 18 9 18C8.44771 18 8 17.5523 8 17C8 16.4477 8.44771 16 9 16C9.55228 16 10 16.4477 10 17ZM5 18C5.55228 18 6 17.5523 6 17C6 16.4477 5.55228 16 5 16C4.44772 16 4 16.4477 4 17C4 17.5523 4.44772 18 5 18ZM6 13C6 13.5523 5.55228 14 5 14C4.44772 14 4 13.5523 4 13C4 12.4477 4.44772 12 5 12C5.55228 12 6 12.4477 6 13ZM5 10C5.55228 10 6 9.55228 6 9C6 8.44771 5.55228 8 5 8C4.44772 8 4 8.44771 4 9C4 9.55228 4.44772 10 5 10Z" fill="currentColor"/></svg>';
            const btnToolMagic = el("button", "btn icon");
            btnToolMagic.title = "Быстрое выделение (Magic Wand)";
            btnToolMagic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.9998 14L9.99985 11M15.0102 3.5V2M18.9495 5.06066L20.0102 4M18.9495 13L20.0102 14.0607M11.0102 5.06066L9.94954 4M20.5102 9H22.0102M6.13122 20.8686L15.3685 11.6314C15.7645 11.2354 15.9625 11.0373 16.0367 10.809C16.1019 10.6082 16.1019 10.3918 16.0367 10.191C15.9625 9.96265 15.7645 9.76465 15.3685 9.36863L14.6312 8.63137C14.2352 8.23535 14.0372 8.03735 13.8089 7.96316C13.608 7.8979 13.3917 7.8979 13.1908 7.96316C12.9625 8.03735 12.7645 8.23535 12.3685 8.63137L3.13122 17.8686C2.7352 18.2646 2.53719 18.4627 2.46301 18.691C2.39775 18.8918 2.39775 19.1082 2.46301 19.309C2.53719 19.5373 2.7352 19.7354 3.13122 20.1314L3.86848 20.8686C4.2645 21.2646 4.4625 21.4627 4.69083 21.5368C4.89168 21.6021 5.10802 21.6021 5.30887 21.5368C5.53719 21.4627 5.7352 21.2646 6.13122 20.8686Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            const btnClearSel = el("button", "btn");
            btnClearSel.textContent = "Очистить выделение";
            const sizeInp = document.createElement("input");
            sizeInp.type = "number";
            sizeInp.min = "1";
            sizeInp.max = "64";
            sizeInp.value = String(brushSizeEdit);
            sizeInp.style.width = "64px";
            const paletteWrap = el("div", null);
            paletteWrap.style.marginTop = "8px";
            paletteWrap.style.display = "flex";
            paletteWrap.style.flexWrap = "wrap";
            paletteWrap.style.gap = "6px";

            function getColorNameForRgb(rgb) {
                try {
                    const m = MASTER_COLORS.find(c => c.rgb && c.rgb[0] === rgb[0] && c.rgb[1] === rgb[1] && c.rgb[2] === rgb[2]);
                    if (m && m.name) return m.name;
                } catch {}
                const toHex = (n) => n.toString(16).padStart(2, '0');
                return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
            }

            function findPaletteIndex(rgb) {
                try {
                    for (let i = 0; i < editPalette.length; i++) {
                        const c = editPalette[i].rgb;
                        if (c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2]) return i;
                    }
                } catch {}
                return -1;
            }

            function updateActivePaletteUI() {
                const children = Array.from(paletteWrap.children);
                children.forEach((node, idx) => {
                    if (!(node instanceof HTMLElement)) return;
                    if (idx === activeColorIdx) {
                        node.style.outline = "2px solid #fff";
                        node.style.outlineOffset = "1px";
                    } else {
                        node.style.outline = "none";
                    }
                });
            }

            function rebuildPaletteUI() {
                paletteWrap.innerHTML = "";
                editPalette.forEach((item, idx) => {
                    const rgb = item.rgb;
                    const b = document.createElement("button");
                    b.className = "btn";
                    b.style.width = "22px";
                    b.style.height = "22px";
                    b.style.padding = "0";
                    b.style.border = "1px solid rgba(255,255,255,.4)";
                    b.style.borderRadius = "4px";
                    b.style.background = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
                    b.title = item.name || getColorNameForRgb(rgb);
                    b.setAttribute("aria-label", b.title);

                    b.addEventListener("pointerdown", (e) => {
                        e.stopPropagation();
                    });
                    b.addEventListener("click", () => {
                        eraser = false;
                        btnToolBrush.classList.add("primary");
                        btnToolEraser.classList.remove("primary");
                        try {
                            btnToolEyedropper.classList.remove("primary");
                        } catch {}
                        eyedropper = false;
                        editColor = rgb.slice();
                        activeColorIdx = idx;
                        updateActivePaletteUI();
                    });
                    paletteWrap.append(b);
                });
                updateActivePaletteUI();
            }
            btnUndo.addEventListener("pointerdown", (e) => e.stopPropagation());
            btnRedo.addEventListener("pointerdown", (e) => e.stopPropagation());
            btnToolBrush.addEventListener("click", () => {
                eraser = false;
                btnToolBrush.classList.add("primary");
                btnToolEraser.classList.remove("primary");
                try {
                    btnToolEyedropper.classList.remove("primary");
                } catch {}
                eyedropper = false;

                selectMode = false;
                try {
                    btnToolSelect.classList.remove("primary");
                } catch {}
                magicSelectMode = false;
                try {
                    btnToolMagic.classList.remove("primary");
                } catch {}
            });
            btnToolEraser.addEventListener("click", () => {
                eraser = true;
                btnToolEraser.classList.add("primary");
                btnToolBrush.classList.remove("primary");
                try {
                    btnToolEyedropper.classList.remove("primary");
                } catch {}
                eyedropper = false;
                selectMode = false;
                try {
                    btnToolSelect.classList.remove("primary");
                } catch {}
                magicSelectMode = false;
                try {
                    btnToolMagic.classList.remove("primary");
                } catch {}
            });

            btnToolBrush.addEventListener("pointerdown", (e) => e.stopPropagation());
            btnToolEraser.addEventListener("pointerdown", (e) => e.stopPropagation());
            sizeInp.addEventListener("change", () => {
                const v = Math.max(1, Math.round(Number(sizeInp.value) || 1));
                brushSizeEdit = v;
                sizeInp.value = String(v);
                if (editMode) render();
            });
            sizeInp.addEventListener("pointerdown", (e) => e.stopPropagation());
            const btnToolEyedropper = el("button", "btn icon");
            btnToolEyedropper.title = t("eyedropperTitle");
            btnToolEyedropper.innerHTML = '<svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><g><g><path d="M42.765,423.593c-10.944-0.006-21.894,4.166-30.245,12.516c-16.693,16.693-16.693,43.757-0.001,60.448 c16.691,16.69,43.754,16.692,60.447,0c8.344-8.347,12.516-19.284,12.516-30.225l0.002-42.742L42.765,423.593z"/></g></g><g><g><path d="M419.151,192.658L512,99.809L415.115,2.924l-92.849,92.847l-12.11-12.109c-16.175-16.175-37.68-25.083-60.553-25.083 s-44.38,8.908-60.553,25.083l-28.26,28.256l72.664,72.664L112.348,305.688c-12.94,12.94-20.066,30.144-20.066,48.445 c0,18.3,7.127,35.504,20.067,48.442c12.939,12.94,30.144,20.066,48.443,20.066c0.001,0,0,0,0.001,0 c18.297,0,35.502-7.127,48.44-20.066L330.34,281.469l72.663,72.663l28.258-28.259c16.174-16.174,25.082-37.678,25.082-60.552 c0-22.873-8.907-44.378-25.082-60.552L419.151,192.658z M185.012,378.354c-6.469,6.471-15.071,10.033-24.22,10.033 c-9.15,0-17.753-3.564-24.223-10.034c-6.469-6.468-10.033-15.071-10.033-24.221c0-9.15,3.564-17.753,10.033-24.221 l121.107-121.107l48.443,48.443L185.012,378.354z M407.04,301.653l-4.036,4.035l-193.771-193.77l4.037-4.036 c9.704-9.704,22.607-15.049,36.331-15.049c13.724,0,26.628,5.345,36.332,15.049l36.331,36.331l92.849-92.847l48.443,48.443 l-92.848,92.848l36.331,36.331c9.704,9.705,15.049,22.608,15.049,36.331C422.089,279.044,416.744,291.948,407.04,301.653z"/></g></g></svg>';
            btnToolEyedropper.addEventListener("click", () => {
                eyedropper = !eyedropper;
                if (eyedropper) {
                    eraser = false;
                    btnToolEyedropper.classList.add("primary");
                    btnToolBrush.classList.remove("primary");
                    btnToolEraser.classList.remove("primary");
                    selectMode = false;
                    try {
                        btnToolSelect.classList.remove("primary");
                    } catch {}
                    magicSelectMode = false;
                    try {
                        btnToolMagic.classList.remove("primary");
                    } catch {}
                } else {
                    btnToolEyedropper.classList.remove("primary");
                }
            });
            btnToolEyedropper.addEventListener("pointerdown", (e) => e.stopPropagation());

            let tolPopover = null;

            function closeTolPopover() {
                if (!tolPopover) return;
                try {
                    tolPopover.remove();
                } catch {}
                tolPopover = null;
                document.removeEventListener('pointerdown', onOutsideClick, true);
                window.removeEventListener('resize', closeTolPopover);
                window.removeEventListener('scroll', closeTolPopover, true);
                document.removeEventListener('keydown', onTolKeyDown, true);
            }

            function onOutsideClick(ev) {
                if (!tolPopover) return;
                const t = ev.target;
                if (tolPopover.contains(t) || btnToolMagic.contains(t)) return;
                closeTolPopover();
            }

            function openTolPopover(anchorRect) {
                closeTolPopover();
                const wrap = document.createElement('div');
                wrap.style.position = 'fixed';
                wrap.style.padding = '8px 10px';
                wrap.style.background = 'rgba(15, 20, 28, 0.98)';
                wrap.style.border = '1px solid rgba(255,255,255,0.12)';
                wrap.style.borderRadius = '8px';
                wrap.style.boxShadow = '0 6px 18px rgba(0,0,0,0.45)';
                wrap.style.backdropFilter = 'blur(6px)';
                wrap.style.color = 'inherit';
                wrap.style.zIndex = '2147483647';
                wrap.style.lineHeight = '1';
                wrap.addEventListener('pointerdown', (e) => e.stopPropagation());

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';

                const lbl = document.createElement('span');
                lbl.textContent = 'Порог';
                lbl.className = 'muted';

                const inp = document.createElement('input');
                inp.type = 'range';
                inp.min = '0';
                inp.max = '255';
                inp.value = String(magicTolerance);
                inp.style.width = '160px';

                const val = document.createElement('span');
                val.className = 'muted';
                val.style.minWidth = '28px';
                val.style.textAlign = 'right';
                val.textContent = String(magicTolerance);

                inp.addEventListener('input', () => {
                    const v = Math.max(0, Math.min(255, Number(inp.value) || 0)) | 0;
                    magicTolerance = v;
                    val.textContent = String(v);
                });

                row.append(lbl, inp, val);
                wrap.append(row);

                document.body.append(wrap);


                const rect = anchorRect || btnToolMagic.getBoundingClientRect();
                const margin = 8;
                const position = () => {
                    const vw = window.innerWidth,
                        vh = window.innerHeight;
                    const pw = wrap.offsetWidth,
                        ph = wrap.offsetHeight;

                    let left = rect.left + (rect.width / 2) - (pw / 2);
                    let top = rect.top - ph - margin;

                    if (top < margin) top = rect.bottom + margin;

                    const maxLeft = Math.max(vw - pw - margin, margin);
                    const maxTop = Math.max(vh - ph - margin, margin);
                    left = Math.min(Math.max(left, margin), maxLeft);
                    top = Math.min(Math.max(top, margin), maxTop);
                    wrap.style.left = left + 'px';
                    wrap.style.top = top + 'px';
                };

                requestAnimationFrame(position);

                tolPopover = wrap;
                document.addEventListener('pointerdown', onOutsideClick, true);
                window.addEventListener('resize', closeTolPopover);
                window.addEventListener('scroll', closeTolPopover, true);
                document.addEventListener('keydown', onTolKeyDown, true);
            }

            function onTolKeyDown(e) {
                if ((e.key || '').toLowerCase() === 'escape') closeTolPopover();
            }
            btnToolMagic.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (tolPopover) {
                    closeTolPopover();
                } else {
                    const x = e.clientX,
                        y = e.clientY;
                    const r = {
                        left: x,
                        top: y,
                        right: x,
                        bottom: y,
                        width: 0,
                        height: 0
                    };
                    openTolPopover(r);
                }
            });

            btnToolSelect.addEventListener("click", () => {
                selectMode = !selectMode;
                btnToolSelect.classList.toggle("primary", selectMode);

                if (selectMode) {
                    eyedropper = false;
                    try {
                        btnToolEyedropper.classList.remove("primary");
                    } catch {}
                    magicSelectMode = false;
                    try {
                        btnToolMagic.classList.remove("primary");
                    } catch {}
                }
                render();
            });
            btnToolSelect.addEventListener("pointerdown", (e) => e.stopPropagation());
            btnToolMagic.addEventListener("click", () => {
                magicSelectMode = !magicSelectMode;
                btnToolMagic.classList.toggle("primary", magicSelectMode);
                if (magicSelectMode) {

                    selectMode = false;
                    try {
                        btnToolSelect.classList.remove("primary");
                    } catch {}
                    eyedropper = false;
                    try {
                        btnToolEyedropper.classList.remove("primary");
                    } catch {}
                }
            });
            btnToolMagic.addEventListener("pointerdown", (e) => e.stopPropagation());
            btnClearSel.addEventListener("click", () => {
                ensureSelectionBuffer();
                ensureSelCanvas();

                const idxs = [];
                const olds = [];
                for (let i = 0; i < selectionMask.length; i++) {
                    if (selectionMask[i]) {
                        idxs.push(i);
                        olds.push(1);
                    }
                }
                const act = {
                    kind: 'selection',
                    indices: new Uint32Array(idxs),
                    old: new Uint8Array(olds),
                    neu: new Uint8Array(olds.length)
                };
                selectionMask.fill(0);
                selectionCount = 0;
                selCtx.clearRect(0, 0, dwnW, dwnH);

                try {
                    stopAntsAnimation();
                } catch {}
                try {
                    antsCtx && antsCtx.clearRect(0, 0, dwnW, dwnH);
                } catch {}
                undoStack.push(act);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                redoStack = [];
                updateUndoRedoButtons();
                render();
            });
            btnClearSel.addEventListener("pointerdown", (e) => e.stopPropagation());
            toolRow.append(btnUndo, btnRedo, btnToolBrush, btnToolEraser, btnToolSelect, btnToolMagic, btnToolEyedropper, sizeInp, btnClearSel);
            editToolbar.append(toolRow, paletteWrap);
            preview.style.position = "relative";
            preview.append(editToolbar);

            ["pointerdown", "pointermove", "pointerup"].forEach(ev => {
                editToolbar.addEventListener(ev, (e) => {
                    e.stopPropagation();
                });
            });

            document.addEventListener('keydown', onKeyDownEdit, true);
            document.addEventListener('keyup', onKeyUpEdit, true);

            function setControlsDisabled(dis) {
                [method, slider, quant, space, dith, dithStr, sliderGrow, sliderShrink, btnClearRef, btnAddFreeRef, btnSelectAllRef, btnImportOwnedRef].forEach(elm => {
                    try {
                        elm.disabled = !!dis;
                    } catch {}
                });

            }

            btnEdit.addEventListener("click", () => {
                if (!editMode) {
                    if (!lockedForEdit) {
                        lockedForEdit = true;
                    }
                    setControlsDisabled(true);

                    try {
                        editImageData = sctx.getImageData(0, 0, dwnW, dwnH);
                    } catch {
                        editImageData = null;
                    }
                    if (currentPalette && currentPalette.length) {
                        editPalette = currentPalette.map(rgb => ({
                            rgb,
                            name: getColorNameForRgb(rgb)
                        }));
                    } else {
                        editPalette = MASTER_COLORS.filter(c => !c.paid).map(c => ({
                            rgb: c.rgb,
                            name: c.name
                        }));
                    }
                    activeColorIdx = 0;
                    editColor = editPalette[0] ? editPalette[0].rgb.slice() : [0, 0, 0];
                    rebuildPaletteUI();
                    editMode = true;
                    btnEdit.textContent = t("done");
                    editToolbar.style.display = '';

                    undoStack = [];
                    redoStack = [];
                    updateUndoRedoButtons();
                } else {

                    try {
                        sctx.putImageData(editImageData, 0, 0);
                    } catch {}

                    try {
                        const off = document.createElement('canvas');
                        off.width = dwnW;
                        off.height = dwnH;
                        off.getContext('2d').drawImage(small, 0, 0);
                        editedSource = off;
                        editedSourceW = dwnW;
                        editedSourceH = dwnH;
                        useEditedSource = true;

                        const post = sctx.getImageData(0, 0, dwnW, dwnH);
                        baseSmallData = new Uint8ClampedArray(post.data);
                        processQuantAndDither();
                    } catch {}
                    render();
                    editMode = false;
                    btnEdit.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + t("brush");
                    editToolbar.style.display = 'none';

                    lockedForEdit = false;
                    setControlsDisabled(false);

                    try {
                        applyUIState();
                    } catch {}
                }
            });

            function fullRecalc() {
                resizeSmall();
                processQuantAndDither();
                fitAndRender()
            }
            quant.value = "full";
            applyUIState();
            slider.addEventListener("input", () => {
                pixelSize = Math.max(1, Math.round(Number(slider.value) || 1));
                slider.value = String(pixelSize);
                pxVal.textContent = String(pixelSize);
                fullRecalc();

                offX2 = 0;
                offY2 = 0;
                zoom2 = minZoom2;
                render();
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

                try {
                    binarizeAlphaOnCanvas(small, 8);
                } catch {}
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
                            if (sourceURL) URL.revokeObjectURL(sourceURL)
                        } catch (e) {}
                    }
                }
                cleanup();
                resolve({
                    action: "apply"
                })
            });
            btnSkip.addEventListener("click", () => {
                setImageURL(sourceURL, file.name || "image");
                cleanup(!1);
                resolve({
                    action: "skip"
                })
            });
            const close = () => {
                cleanup();
                resolve({
                    action: "cancel"
                })
            };
            btnCancel.addEventListener("click", close);
            btnX.addEventListener("click", close);

            function cleanup(revoke = !0) {
                try {
                    roPrev.disconnect()
                } catch (e) {}
                try {
                    document.removeEventListener('keydown', onKeyDownEdit, true);
                } catch (e) {}
                try {
                    document.removeEventListener('keyup', onKeyUpEdit, true);
                } catch (e) {}
                try {
                    back.remove()
                } catch (e) {}
                try {
                    if (bitmap?.close) bitmap.close()
                } catch (e) {}
                if (revoke) {
                    try {
                        if (sourceURL) URL.revokeObjectURL(sourceURL)
                    } catch (e) {}
                }
            }
            fullRecalc()
        })
    }

    syncUI();
    try {
        updateAcidBtn();
    } catch (_) {}

    window.addEventListener('resize', () => {
        if (hint && hint.style.display !== 'none') positionHint(8);
    });
    makeHScroll(toolbar, toolbarScroll, fadeL, fadeR);
    makeHScroll(sideHead, sideScroll, sfadeL, sfadeR);

    document.addEventListener("pointerup", (e) => {
        if (state.dragging) endDrag(e);
    }, true);
    document.addEventListener("mouseup", (e) => {
        if (state.dragging) endDrag(e);
    }, true);
    window.addEventListener("blur", () => {
        if (state.dragging) endDrag();
    });

    btnOpen.addEventListener("click", () => fileInput.click());
    btnHistory.addEventListener("click", () => {
        try {
            if (!state.history || !state.history.length) {
                showHint(t('historyEmpty'));
            }
        } catch (_) {}
        openHistoryModal();
    });
    btnAcid.addEventListener('click', () => {

        try {
            if (state.autoModeEnabled) {

                if (state.acidModeEnabled) {
                    try {
                        showHint(t('acidBlockedByAuto') || 'Нельзя выключить глаз при включенном АвтоРежиме', 1800);
                    } catch (_) {}
                    return;
                }
            }
        } catch (_) {}
        state.acidModeEnabled = !state.acidModeEnabled;
        updateAcidBtn();
        try {
            persistSave();
        } catch (_) {}
        try {
            showHint(state.acidModeEnabled ? t('acidOn') : t('acidOff'), 1800);
        } catch (_) {}

        try {
            window.dispatchEvent(new Event('resize'));
        } catch (_) {}
    });
    btnClear.addEventListener("click", () => {

        if (state.currentURL) {
            try {
                URL.revokeObjectURL(state.currentURL)
            } catch (_) {}
            state.currentURL = null;
        }
        state.currentFileName = null;
        try {
            if (state.selectedImageBitmap && typeof state.selectedImageBitmap.close === 'function') {
                state.selectedImageBitmap.close();
            }
        } catch (_) {}
        state.selectedImageBitmap = null;
        state.selectedImageSize = null;
        fileChip.style.display = 'none';


        try {
            localStorage.removeItem(LAST_IMG_KEY);
        } catch (_) {}

        try {
            btnClear.style.display = 'none';
        } catch (_) {}
        state.iw = 0;
        state.ih = 0;
        state.palette = [];
        renderPalette();


        document.getElementById('WRAP_ID')?.remove();
        if (hint) hint.style.display = 'none';
        state.selectedImageBitmap = null;
        state.selectedImageSize = {
            w: 0,
            h: 0
        };
        state.refSet = false;
        state.anchorSet = false;
    });
    fileInput.addEventListener("change", async (e) => {
        const f = e.target.files && e.target.files[0];
        fileInput.value = "";
        if (!f) {
            return;
        }

        try {
            await openPixelArtDialog(f);
        } catch (_) {}
    });
    toolbar.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy"
    });
    toolbar.addEventListener("drop", async (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f || !f.type.startsWith("image/")) return;

        try {
            await openPixelArtDialog(f);
        } catch (_) {}
    });

    btnCopyArt.addEventListener("click", async () => {
        await openTileCropDialog()
    });

    window.addEventListener('resize', () => recalcSidebarHeight());

    window.addEventListener('resize', () => {
        try {
            enforcePixelScaleIfSnap();
            applyAnchoredPositionFromOffsets();
            persistSave();
        } catch (_) {}
    });

    btnStop.addEventListener("click", () => {
        state.bulkAbort = true;
        stopAutoClick();
    });
    rStop.addEventListener("click", () => {
        state.bulkAbort = true;
        stopAutoClick();
    });
    rCopy.addEventListener("click", async () => {
        await openTileCropDialog();
    });
    rMove.addEventListener("click", () => setMoveMode(!state.moveMode));
    rAuto.addEventListener("click", () => {
        autoColorChk.checked = !autoColorChk.checked;
        rAuto.classList.toggle("active", autoColorChk.checked);
    });
    rAccess.addEventListener("click", async () => {
        try {
            rAccess.disabled = true;
            const ok = await ensureScreenCapture();
            if (!ok) {
                try {
                    showHint(t('hintAccessRequired'), 2000);
                } catch (_) {}
            }
        } catch (_) {} finally {
            rAccess.disabled = false;
            try {
                updateAccessButtonUI();
            } catch (_) {}
        }
    });

    rClock.addEventListener("click", () => {
        if (state.brushMode) setBrushMode(false);
        toggleDelayPanel();
    });

    const onGlobalPointerDown = (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        const insideClock = path.includes(rClock) || path.includes(railDelayPanel);
        const insideBrush = path.includes(rBrush) || path.includes(railBrushPanel);
        if (!insideClock && state.delayPanelOpen) {
            state.delayPanelOpen = false;
            setPanelOpen(railDelayPanel, false);
        }
        if (!insideBrush && state.brushMode) {

        }
    };
    document.addEventListener('pointerdown', onGlobalPointerDown, true);

    setTimeout(() => {
        if (autoColorChk.checked) rAuto.classList.add("active");
        try {
            updateAccessButtonUI();
        } catch (_) {}
    }, 0);
    btnClose.addEventListener("click", () => api.destroy());
    btnMove.addEventListener("click", () => setMoveMode(!state.moveMode));
    brushChk.addEventListener("change", () => {
        setBrushMode(brushChk.checked)
    });
    brushSizeInp.addEventListener("change", () => {
        const v = Math.max(1, Math.round(Number(brushSizeInp.value) || 1));
        state.brushSize = v;
        brushSizeInp.value = String(v);
        railBrushSize.value = String(v);
    });
    railBrushSize.addEventListener("change", () => {
        const v = Math.max(1, Math.round(Number(railBrushSize.value) || 1));
        state.brushSize = v;
        railBrushSize.value = String(v);
        brushSizeInp.value = String(v);
    });
    railDelayInp.addEventListener('change', () => {
        const v = Math.max(0, Math.round(Number(railDelayInp.value) || 0));
        delayInp.value = String(v);
    });
    delayInp.addEventListener('change', () => {
        const v = Math.max(0, Math.round(Number(delayInp.value) || 0));
        railDelayInp.value = String(v);
    });

    const onKey = (e) => {
        const tag = (e.target && e.target.tagName) || "";
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;

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
        if (e.key.toLowerCase() === "m") {
            setMoveMode(!state.moveMode)
        }
    };
    document.addEventListener("keydown", onKey, !0);
    api.destroy = () => {

        try {
            document.removeEventListener("keydown", onKey, !0);
        } catch (_) {}
        try {
            document.removeEventListener('pointerdown', onGlobalPointerDown, true);
        } catch (_) {}
        try {
            window.removeEventListener('pointermove', onMarkerMove, true);
        } catch (_) {}
        try {
            window.removeEventListener('pointerup', onMarkerUp, true);
        } catch (_) {}


        try {
            if (window.__OVERLAY_STARTUP_TIMER__) {
                clearTimeout(window.__OVERLAY_STARTUP_TIMER__);
                delete window.__OVERLAY_STARTUP_TIMER__;
            }
        } catch (_) {}
        try {
            stopAutoModeTimer();
        } catch (_) {}
        try {
            stopAutoClick();
        } catch (_) {}
        try {
            if (typeof hintTimer !== 'undefined' && hintTimer) {
                clearTimeout(hintTimer);
                hintTimer = null;
            }
        } catch (_) {}
        try {
            if (typeof accTipTimer !== 'undefined' && accTipTimer) {
                clearTimeout(accTipTimer);
                accTipTimer = null;
            }
        } catch (_) {}

        try {
            state.bulkAbort = true;
        } catch (_) {}
        try {
            state.autoModeEnabled = false;
        } catch (_) {}

        try {
            const cnv = state.__panCanvas;
            const h = state.__panHandlers;
            if (cnv && h) {
                cnv.removeEventListener('pointerdown', h.onCnvDown, true);
                cnv.removeEventListener('pointermove', h.onCnvMove, true);
                cnv.removeEventListener('pointerup', h.endPan, true);
                cnv.removeEventListener('pointercancel', h.endPan, true);
                window.removeEventListener('blur', h.endPan);
            }
        } catch (_) {}

        try {
            closeHistoryModal();
        } catch (_) {}

        try {
            state.selectedImageBitmap = null;
        } catch (_) {}
        try {
            state.anchorSet = false;
        } catch (_) {}
        try {
            state.selectedImageSize = null;
        } catch (_) {}

        try {
            if (window.__OVERLAY_ORIGINAL_FETCH__) {
                window.fetch = window.__OVERLAY_ORIGINAL_FETCH__;
                try {
                    delete window.__OVERLAY_ORIGINAL_FETCH__;
                } catch (_) {}
            }
        } catch (_) {}

        try {
            if (window.__OVERLAY_BEFOREUNLOAD__) {
                window.removeEventListener('beforeunload', window.__OVERLAY_BEFOREUNLOAD__);
                delete window.__OVERLAY_BEFOREUNLOAD__;
            }
        } catch (_) {}

        try {
            if (state.currentURL) URL.revokeObjectURL(state.currentURL);
        } catch (_) {}
        try {
            root.remove();
        } catch (_) {}
        try {
            delete window.__IMG_OVERLAY_TOOL__;
        } catch (_) {}
    };
    (() => {

        applyPersistedPlacementOnStartup();
        try {
            loadLastImageIfAny();
        } catch (_) {}
        state.x = clamp(state.x, 8, window.innerWidth - state.w - 8);
        state.y = clamp(state.y, 8, window.innerHeight - state.h - 8);
        syncUI();
        installTileSniffer();

        recalcSidebarHeight();

        try {
            ensureSnapCanvas();
        } catch (_) {}
        try {
            (function attachPanOnce() {
                const cnv = getMainCanvas();
                if (!cnv) {
                    setTimeout(attachPanOnce, 300);
                    return;
                }
                if (!cnv.__overlayPanHooked__) {
                    cnv.__overlayPanHooked__ = true;
                    const onCnvDown = (e) => {
                        if (e.button !== 0) return;
                        state.mapPan.active = true;
                        state.mapPan.pointerId = e.pointerId;
                        state.mapPan.lastX = e.clientX;
                        state.mapPan.lastY = e.clientY;
                    };
                    const onCnvMove = (e) => {
                        if (!state.mapPan.active || (state.mapPan.pointerId != null && e.pointerId !== state.mapPan.pointerId)) return;
                        const dx = e.clientX - state.mapPan.lastX;
                        const dy = e.clientY - state.mapPan.lastY;
                        if (dx === 0 && dy === 0) return;
                        state.mapPan.lastX = e.clientX;
                        state.mapPan.lastY = e.clientY;
                        state.x += dx;
                        state.y += dy;
                        computeGridOffsetsFromXY();
                        applyAnchoredPositionFromOffsets();
                    };
                    const endPan = () => {
                        if (!state.mapPan.active) return;
                        state.mapPan.active = false;
                        state.mapPan.pointerId = null;
                        persistSave();
                    };
                    state.__panCanvas = cnv;
                    state.__panHandlers = {
                        onCnvDown,
                        onCnvMove,
                        endPan
                    };
                    cnv.addEventListener('pointerdown', onCnvDown, true);
                    cnv.addEventListener('pointermove', onCnvMove, true);
                    cnv.addEventListener('pointerup', endPan, true);
                    cnv.addEventListener('pointercancel', endPan, true);
                    window.addEventListener('blur', endPan);
                }
            })();
        } catch (_) {}
    })();



    let __dotMaskCache = {
        size: 0,
        canvas: null
    };

    function getDotMaskCanvas(size) {
        if (__dotMaskCache.size === size && __dotMaskCache.canvas) return __dotMaskCache.canvas;
        let m;
        try {
            m = new OffscreenCanvas(size, size);
        } catch {
            const c = document.createElement('canvas');
            c.width = size;
            c.height = size;
            m = c;
        }
        const mctx = m.getContext('2d');
        if (!mctx) return null;
        mctx.clearRect(0, 0, size, size);
        mctx.fillStyle = '#fff';
        const step = getDrawMult();
        const center = Math.floor(step / 2);
        for (let y = center; y < size; y += step) {
            for (let x = center; x < size; x += step) {
                mctx.fillRect(x, y, 1, 1);
            }
        }
        __dotMaskCache = {
            size,
            canvas: m
        };
        return m;
    }


    function maskAlreadyPlacedPixels(baseCtx, overlayCanvas, rect) {
        try {
            const w = overlayCanvas.width | 0;
            const h = overlayCanvas.height | 0;
            if (w <= 0 || h <= 0) return;
            const octx = overlayCanvas.getContext('2d', {
                willReadFrequently: true
            });
            if (!octx) return;
            const base = baseCtx.getImageData(0, 0, w, h);
            const over = octx.getImageData(0, 0, w, h);
            const bd = base.data,
                od = over.data;
            const tol = 8;
            const alphaMin = 16;
            const x0 = Math.max(0, rect?.x | 0);
            const y0 = Math.max(0, rect?.y | 0);
            const rw = Math.max(0, rect?.w != null ? rect.w | 0 : w);
            const rh = Math.max(0, rect?.h != null ? rect.h | 0 : h);
            const x1 = Math.min(w, x0 + rw);
            const y1 = Math.min(h, y0 + rh);
            for (let y = y0; y < y1; y++) {
                let i = (y * w + x0) * 4;
                for (let x = x0; x < x1; x++, i += 4) {
                    const a = od[i + 3];
                    if (a === 0) continue;
                    const ba = bd[i + 3];
                    if (ba < alphaMin) continue;
                    const dr = Math.abs(od[i] - bd[i]);
                    const dg = Math.abs(od[i + 1] - bd[i + 1]);
                    const db = Math.abs(od[i + 2] - bd[i + 2]);
                    if (dr <= tol && dg <= tol && db <= tol) {
                        od[i + 3] = 0;
                    }
                }
            }
            octx.putImageData(over, 0, 0);
        } catch {}
    }

    function applySubtleColorPerturbation(canvas, seedX, seedY) {
        const ctx = canvas.getContext('2d', {
            willReadFrequently: true
        });
        if (!ctx) return;
        const {
            width,
            height
        } = canvas;
        try {
            const img = ctx.getImageData(0, 0, width, height);
            const data = img.data;

            for (let y = 0; y < height; y += 1) {
                let idx = y * width * 4;
                for (let x = 0; x < width; x += 1, idx += 4) {
                    if (data[idx + 3] === 0) continue;
                    data[idx + 0] = data[idx + 0] > 235 ? 255 : data[idx + 0] + 20;
                    data[idx + 1] = data[idx + 1] > 235 ? 255 : data[idx + 1] + 20;
                    data[idx + 2] = data[idx + 2] > 235 ? 255 : data[idx + 2] + 20;
                }
            }
            ctx.putImageData(img, 0, 0);
        } catch {

        }
    }

    function applyAcidSurrogateToCanvas(canvas) {
        const ctx = canvas.getContext('2d', {
            willReadFrequently: true
        });
        if (!ctx) return;
        const {
            width,
            height
        } = canvas;
        if (width <= 0 || height <= 0) return;
        try {
            const img = ctx.getImageData(0, 0, width, height);
            const data = img.data;
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a === 0) continue;
                const idx = rgb24Index(data[i], data[i + 1], data[i + 2]);
                const col = cvColorFor(idx);

                if ((i & 63) === 0) {
                    try {
                        __acidDynAdd(col[0], col[1], col[2]);
                    } catch (_) {}
                }
                data[i] = col[0];
                data[i + 1] = col[1];
                data[i + 2] = col[2];
            }
            ctx.putImageData(img, 0, 0);
        } catch {

        }
    }

    function computeIntersectionDrawOnTile(ctx, tileX, tileY) {
        if (!state.selectedImageBitmap || !state.anchorSet) return;
        const gLeft = state.anchorTx * TILE_SIZE + state.anchorPx;
        const gTop = state.anchorTy * TILE_SIZE + state.anchorPy;
        const gRight = gLeft + state.selectedImageSize.w;
        const gBottom = gTop + state.selectedImageSize.h;
        const tLeft = tileX * TILE_SIZE;
        const tTop = tileY * TILE_SIZE;
        const tRight = tLeft + TILE_SIZE;
        const tBottom = tTop + TILE_SIZE;
        const iLeft = Math.max(gLeft, tLeft);
        const iTop = Math.max(gTop, tTop);
        const iRight = Math.min(gRight, tRight);
        const iBottom = Math.min(gBottom, tBottom);
        const iW = iRight - iLeft;
        const iH = iBottom - iTop;
        if (iW <= 0 || iH <= 0) return;
        const srcX = iLeft - gLeft;
        const srcY = iTop - gTop;
        const dstX = (iLeft - tLeft) * getDrawMult();
        const dstY = (iTop - tTop) * getDrawMult();
        ctx.drawImage(
            state.selectedImageBitmap,
            srcX, srcY, iW, iH,
            dstX, dstY, iW * getDrawMult(), iH * getDrawMult()
        );
    }

    function getIntersectionRectForTile(tileX, tileY) {
        if (!state.selectedImageBitmap || !state.anchorSet) return null;
        const gLeft = state.anchorTx * TILE_SIZE + state.anchorPx;
        const gTop = state.anchorTy * TILE_SIZE + state.anchorPy;
        const gRight = gLeft + state.selectedImageSize.w;
        const gBottom = gTop + state.selectedImageSize.h;
        const tLeft = tileX * TILE_SIZE;
        const tTop = tileY * TILE_SIZE;
        const tRight = tLeft + TILE_SIZE;
        const tBottom = tTop + TILE_SIZE;
        const iLeft = Math.max(gLeft, tLeft);
        const iTop = Math.max(gTop, tTop);
        const iRight = Math.min(gRight, tRight);
        const iBottom = Math.min(gBottom, tBottom);
        const iW = iRight - iLeft;
        const iH = iBottom - iTop;
        if (iW <= 0 || iH <= 0) return null;
        const dstX = (iLeft - tLeft) * getDrawMult();
        const dstY = (iTop - tTop) * getDrawMult();
        return {
            x: dstX | 0,
            y: dstY | 0,
            w: (iW * getDrawMult()) | 0,
            h: (iH * getDrawMult()) | 0
        };
    }

    function prepareForMapClick() {

        if (!state.selectedImageSize || !state.selectedImageSize.w || !state.selectedImageSize.h) return;
        state.refX = 0;
        state.refY = 0;
        state.refSet = true;
    }


    function tryAdjustAnchorWithViewBase() {
        try {
            if (!Number.isFinite(state.viewTileBaseX) || !Number.isFinite(state.viewTileBaseY)) return;

            if (state.anchorProvisional && Number.isFinite(state.localAnchorTx) && Number.isFinite(state.localAnchorTy) && Number.isFinite(state.localAnchorPx) && Number.isFinite(state.localAnchorPy)) {
                const gLeft = state.localAnchorTx * TILE_SIZE + state.localAnchorPx + state.viewTileBaseX * TILE_SIZE;
                const gTop = state.localAnchorTy * TILE_SIZE + state.localAnchorPy + state.viewTileBaseY * TILE_SIZE;
                state.anchorTx = Math.floor(gLeft / TILE_SIZE);
                state.anchorTy = Math.floor(gTop / TILE_SIZE);
                state.anchorPx = ((gLeft % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
                state.anchorPy = ((gTop % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
                state.anchorSet = true;
                state.anchorProvisional = false;
                state.__anchorAdjusted = true;
                try {
                    dbg('dom: anchor adjusted using view base', {
                        tx: state.anchorTx,
                        ty: state.anchorTy,
                        px: state.anchorPx,
                        py: state.anchorPy
                    });
                } catch (_) {}

                try {
                    if (state.currentFileName && state.iw && state.ih) {
                        historyAddOrUpdate({
                            fileName: state.currentFileName,
                            w: state.iw,
                            h: state.ih,
                            tx: state.anchorTx,
                            ty: state.anchorTy,
                            px: state.anchorPx,
                            py: state.anchorPy
                        });
                    }
                } catch (_) {}
                return;
            }


            if (!state.anchorSet || state.__anchorAdjusted) return;
            const looksLocal = (Number(state.anchorTx) < 8) && (Number(state.anchorTy) < 8);
            const baseIsLarge = (Number(state.viewTileBaseX) >= 64) || (Number(state.viewTileBaseY) >= 64);
            if (!looksLocal || !baseIsLarge) return;
            const gLeft = state.anchorTx * TILE_SIZE + state.anchorPx + state.viewTileBaseX * TILE_SIZE;
            const gTop = state.anchorTy * TILE_SIZE + state.anchorPy + state.viewTileBaseY * TILE_SIZE;
            state.anchorTx = Math.floor(gLeft / TILE_SIZE);
            state.anchorTy = Math.floor(gTop / TILE_SIZE);
            state.anchorPx = ((gLeft % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
            state.anchorPy = ((gTop % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
            state.__anchorAdjusted = true;
            try {
                dbg('dom: anchor adjusted using view base', {
                    tx: state.anchorTx,
                    ty: state.anchorTy,
                    px: state.anchorPx,
                    py: state.anchorPy
                });
            } catch (_) {}

            try {
                if (state.currentFileName && state.iw && state.ih) {
                    historyAddOrUpdate({
                        fileName: state.currentFileName,
                        w: state.iw,
                        h: state.ih,
                        tx: state.anchorTx,
                        ty: state.anchorTy,
                        px: state.anchorPx,
                        py: state.anchorPy
                    });
                }
            } catch (_) {}
        } catch (_) {}
    }

    function updateViewBaseFromDOM() {
        try {
            let minX, minY, baseOrigin;
            const imgs = Array.from(document.querySelectorAll('img'));
            const re = /\/tiles\/(\d+)\/(\d+)\.png(?:$|\b)/;
            for (const im of imgs) {
                const src = im.currentSrc || im.src || '';
                const m = re.exec(src);
                if (!m) continue;
                const x = Number(m[1]);
                const y = Number(m[2]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                minX = (minX === undefined) ? x : Math.min(minX, x);
                minY = (minY === undefined) ? y : Math.min(minY, y);
                try {
                    baseOrigin = baseOrigin || new URL(src, window.location.href).origin;
                } catch {}
            }
            if (minX !== undefined && minY !== undefined) {
                const prevBX = Number.isFinite(state.viewTileBaseX) ? state.viewTileBaseX : undefined;
                const prevBY = Number.isFinite(state.viewTileBaseY) ? state.viewTileBaseY : undefined;
                state.viewTileBaseX = Number.isFinite(state.viewTileBaseX) ? Math.min(state.viewTileBaseX, minX) : minX;
                state.viewTileBaseY = Number.isFinite(state.viewTileBaseY) ? Math.min(state.viewTileBaseY, minY) : minY;
                if (state.viewTileBaseX !== prevBX || state.viewTileBaseY !== prevBY) {
                    try {
                        dbg('dom: view base updated', {
                            baseX: state.viewTileBaseX,
                            baseY: state.viewTileBaseY
                        });
                    } catch (_) {}
                    tryAdjustAnchorWithViewBase();
                }
                if (baseOrigin && !state.tileBaseOrigin) {
                    state.tileBaseOrigin = baseOrigin;
                    try {
                        dbg('dom: tile base origin', {
                            origin: state.tileBaseOrigin
                        });
                    } catch {}
                }
            }
        } catch (_) {}
    }


    (function setupFetchInterceptor() {
        const originalFetch = window.fetch;
        try {
            window.__OVERLAY_ORIGINAL_FETCH__ = originalFetch;
        } catch (_) {}
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            try {
                const cloned = response.clone();
                const endpoint = (args[0] instanceof Request) ? args[0]?.url : String(args[0] || '');

                if (endpoint.includes('tiles')) {
                    try {
                        const path = endpoint.split('?')[0];
                        const parts = path.split('/').filter(Boolean);
                        const numbers = parts.filter(p => /^\d+(?:\.png)?$/.test(p)).map(p => Number(p.replace('.png', '')));
                        const tY = numbers[numbers.length - 1];
                        const tX = numbers[numbers.length - 2];
                        if (Number.isFinite(tX) && Number.isFinite(tY)) {
                            const prevBX = Number.isFinite(state.viewTileBaseX) ? state.viewTileBaseX : undefined;
                            const prevBY = Number.isFinite(state.viewTileBaseY) ? state.viewTileBaseY : undefined;
                            state.viewTileBaseX = Number.isFinite(state.viewTileBaseX) ? Math.min(state.viewTileBaseX, tX) : tX;
                            state.viewTileBaseY = Number.isFinite(state.viewTileBaseY) ? Math.min(state.viewTileBaseY, tY) : tY;
                            if (state.viewTileBaseX !== prevBX || state.viewTileBaseY !== prevBY) {
                                try {
                                    dbg('fetch(pre): view base updated', {
                                        baseX: state.viewTileBaseX,
                                        baseY: state.viewTileBaseY
                                    });
                                } catch (_) {}
                                tryAdjustAnchorWithViewBase();
                            }

                            try {
                                const u = new URL(endpoint);
                                if (!state.tileBaseOrigin) {
                                    state.tileBaseOrigin = u.origin;
                                    try {
                                        dbg('fetch(pre): tile base origin', {
                                            origin: state.tileBaseOrigin
                                        });
                                    } catch {}
                                }
                            } catch {}
                        }
                    } catch (_) {}
                }


                if (endpoint.includes('pixel') && state.moveMode && state.refSet) {
                    try {
                        dbg('fetch: pixel sniff hit', {
                            endpoint,
                            moveMode: !!state.moveMode,
                            refSet: !!state.refSet
                        });
                    } catch (_) {}
                    cloned.json().catch(() => ({})).then(() => {
                        try {
                            const clean = endpoint.split('?');
                            const path = clean[0];
                            const query = clean[1] || '';
                            const parts = path.split('/').filter(Boolean);
                            const nums = parts.filter(p => /^\d+$/.test(p));
                            const ty = Number(nums[nums.length - 1]);
                            const tx = Number(nums[nums.length - 2]);
                            const params = new URLSearchParams(query);
                            const px = Number(params.get('x')) || 0;
                            const py = Number(params.get('y')) || 0;
                            try {
                                dbg('fetch: pixel coords', {
                                    tx,
                                    ty,
                                    px,
                                    py
                                });
                            } catch (_) {}
                            if (Number.isFinite(tx) && Number.isFinite(ty)) {
                                const adjX = px - (state.refSet ? state.refX : 0);
                                const adjY = py - (state.refSet ? state.refY : 0);
                                const gLeft = tx * TILE_SIZE + adjX;
                                const gTop = ty * TILE_SIZE + adjY;
                                state.anchorTx = Math.floor(gLeft / TILE_SIZE);
                                state.anchorTy = Math.floor(gTop / TILE_SIZE);
                                state.anchorPx = ((gLeft % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
                                state.anchorPy = ((gTop % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
                                state.anchorSet = true;
                                try {
                                    dbg('fetch: anchor set from pixel sniff', {
                                        tx: state.anchorTx,
                                        ty: state.anchorTy,
                                        px: state.anchorPx,
                                        py: state.anchorPy
                                    });
                                } catch (_) {}

                                document.getElementById('WRAP_ID')?.remove();
                                if (hint) hint.style.display = 'none';

                                try {
                                    setMoveMode(false);
                                } catch (_) {}
                            }
                        } catch {

                        }
                    });
                }

                if (endpoint.includes('tiles') && state.selectedImageBitmap && state.anchorSet) {
                    try {
                        dbg('fetch: tiles intercept', {
                            endpoint,
                            anchorSet: !!state.anchorSet,
                            hasBitmap: !!state.selectedImageBitmap
                        });
                    } catch (_) {}
                    const tileBlob = await cloned.blob();
                    return new Promise((resolve) => {
                        const path = endpoint.split('?')[0];
                        const parts = path.split('/').filter(Boolean);
                        const numbers = parts.filter(p => /^\d+(?:\.png)?$/.test(p)).map(p => Number(p.replace('.png', '')));
                        const tileY = numbers[numbers.length - 1];
                        const tileX = numbers[numbers.length - 2];
                        try {
                            dbg('fetch: tile coords', {
                                tileX,
                                tileY
                            });
                        } catch (_) {}
                        if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) {
                            resolve(response);
                            return;
                        }

                        try {
                            const prevBX = Number.isFinite(state.viewTileBaseX) ? state.viewTileBaseX : undefined;
                            const prevBY = Number.isFinite(state.viewTileBaseY) ? state.viewTileBaseY : undefined;
                            state.viewTileBaseX = Number.isFinite(state.viewTileBaseX) ? Math.min(state.viewTileBaseX, tileX) : tileX;
                            state.viewTileBaseY = Number.isFinite(state.viewTileBaseY) ? Math.min(state.viewTileBaseY, tileY) : tileY;
                            if (state.viewTileBaseX !== prevBX || state.viewTileBaseY !== prevBY) {
                                try {
                                    dbg('fetch: view base updated', {
                                        baseX: state.viewTileBaseX,
                                        baseY: state.viewTileBaseY
                                    });
                                } catch (_) {}
                            }
                        } catch (_) {}


                        try {
                            if (state.anchorSet && !state.__anchorAdjusted && Number.isFinite(state.viewTileBaseX) && Number.isFinite(state.viewTileBaseY)) {
                                const looksLocal = (Number(state.anchorTx) < 8) && (Number(state.anchorTy) < 8);
                                const baseIsLarge = (Number(state.viewTileBaseX) >= 64) || (Number(state.viewTileBaseY) >= 64);
                                if (looksLocal && baseIsLarge) {
                                    const gLeft = state.anchorTx * TILE_SIZE + state.anchorPx + state.viewTileBaseX * TILE_SIZE;
                                    const gTop = state.anchorTy * TILE_SIZE + state.anchorPy + state.viewTileBaseY * TILE_SIZE;
                                    state.anchorTx = Math.floor(gLeft / TILE_SIZE);
                                    state.anchorTy = Math.floor(gTop / TILE_SIZE);
                                    state.anchorPx = ((gLeft % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
                                    state.anchorPy = ((gTop % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
                                    state.__anchorAdjusted = true;
                                    try {
                                        dbg('fetch: anchor adjusted using view base', {
                                            tx: state.anchorTx,
                                            ty: state.anchorTy,
                                            px: state.anchorPx,
                                            py: state.anchorPy
                                        });
                                    } catch (_) {}
                                }
                            }
                        } catch (_) {}
                        (async () => {
                            try {
                                const isPanning = !!(state.mapPan && state.mapPan.active);
                                if (!isPanning) resetProgressIfOverlayChanged();

                                const fastRect = getIntersectionRectForTile(tileX, tileY);
                                if (!fastRect) {
                                    try {
                                        dbg('fetch: no intersection for tile', {
                                            tileX,
                                            tileY
                                        });
                                    } catch (_) {}
                                    resolve(response);
                                    return;
                                }

                                const drawSize = TILE_SIZE * getDrawMult();
                                const tileBitmap = await createImageBitmap(tileBlob);
                                const makeCanvas = () => {
                                    try {
                                        return new OffscreenCanvas(drawSize, drawSize);
                                    } catch {
                                        const c = document.createElement('canvas');
                                        c.width = drawSize;
                                        c.height = drawSize;
                                        return c;
                                    }
                                };
                                const canvas = makeCanvas();
                                const ctxCandidate = canvas.getContext('2d', {
                                    alpha: true,
                                    willReadFrequently: true
                                });
                                if (!ctxCandidate || !('drawImage' in ctxCandidate)) {
                                    resolve(response);
                                    return;
                                }
                                const ctx = /** @type {any} */ (ctxCandidate);
                                ctx.imageSmoothingEnabled = false;
                                ctx.clearRect(0, 0, drawSize, drawSize);
                                ctx.drawImage(tileBitmap, 0, 0, drawSize, drawSize);

                                const overlayCanvas = makeCanvas();
                                const octxCandidate = overlayCanvas.getContext('2d', {
                                    alpha: true,
                                    willReadFrequently: true
                                });
                                if (octxCandidate && ('drawImage' in octxCandidate)) {
                                    const octx = /** @type {any} */ (octxCandidate);
                                    octx.imageSmoothingEnabled = false;
                                    octx.clearRect(0, 0, drawSize, drawSize);

                                    computeIntersectionDrawOnTile(octx, tileX, tileY);
                                    try {
                                        dbg('fetch: overlay drawn on tile', {
                                            tileX,
                                            tileY
                                        });
                                    } catch (_) {}
                                    try {
                                        state.__dbgNoIntersectCount = 0;
                                    } catch (_) {}

                                    const mask = getDotMaskCanvas(drawSize);
                                    if (mask) {
                                        octx.globalCompositeOperation = 'destination-in';
                                        octx.drawImage(mask, 0, 0);
                                        octx.globalCompositeOperation = 'source-over';
                                    }
                                }


                                let tileTotal = 0,
                                    tileRemain = 0;
                                if (!isPanning) {
                                    try {
                                        tileTotal = countAlphaOnCanvas(overlayCanvas, 8) | 0;
                                    } catch {}

                                    maskAlreadyPlacedPixels(ctx, overlayCanvas, fastRect);
                                    try {
                                        tileRemain = countAlphaOnCanvas(overlayCanvas, 8) | 0;
                                    } catch {}

                                    try {
                                        const key = `${tileX},${tileY},${getDrawMult()}`;
                                        progressTiles.set(key, {
                                            tot: tileTotal,
                                            rem: tileRemain,
                                            ts: Date.now()
                                        });
                                        updateProgressFromTiles();
                                    } catch {}
                                }

                                if (state.acidModeEnabled && !isPanning) {
                                    applySubtleColorPerturbation(overlayCanvas, tileX, tileY);
                                    applyAcidSurrogateToCanvas(overlayCanvas);
                                }

                                if (!isPanning) {
                                    try {
                                        binarizeAlphaOnCanvas(overlayCanvas, 8);
                                    } catch {}
                                }
                                ctx.drawImage(overlayCanvas, 0, 0);

                                if (!isPanning) {
                                    try {
                                        binarizeAlphaOnCanvas(canvas, 8);
                                    } catch {}
                                }

                                let outBlob;
                                const anyCanvas = /** @type {any} */ (canvas);
                                if (typeof anyCanvas.convertToBlob === 'function') {
                                    outBlob = await anyCanvas.convertToBlob({
                                        type: 'image/png'
                                    });
                                } else if (typeof anyCanvas.toBlob === 'function') {
                                    outBlob = await new Promise((res) => {
                                        anyCanvas.toBlob(res, 'image/png');
                                    });
                                } else {
                                    resolve(response);
                                    return;
                                }

                                resolve(new Response(outBlob, {
                                    headers: cloned.headers,
                                    status: cloned.status,
                                    statusText: cloned.statusText
                                }));
                            } catch {
                                resolve(response);
                            }
                        })();
                    });
                }
            } catch {

            }
            return response;
        };
    })();

    makeHScroll(toolbar, toolbarScroll, fadeL, fadeR);
    makeHScroll(sideHead, sideScroll, sfadeL, sfadeR)
})()