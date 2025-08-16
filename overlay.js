(async () => {
    "use strict";

    const TILE_SIZE = 1000;
    const DRAW_MULT = 3;
    const LANGS = [{
        code: "RU",
        flag: "🇷🇺",
        name: "Русский"
    }, {
        code: "EN",
        flag: "🇬🇧",
        name: "English"
    }, {
        code: "DE",
        flag: "🇩🇪",
        name: "Deutsch"
    }, {
        code: "FR",
        flag: "🇫🇷",
        name: "Français"
    }, {
        code: "ES",
        flag: "🇪🇸",
        name: "Español"
    }, {
        code: "CN",
        flag: "🇨🇳",
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
            hintAccessRequired: "Нужно дать доступ к экрану"
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
            hintAccessRequired: "You need to grant screen access"
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
            hintAccessRequired: "Bildschirmzugriff muss erteilt werden"
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
            hintAccessRequired: "Vous devez autoriser l’accès à l’écran"
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
            hintAccessRequired: "Debe otorgar acceso a la pantalla"
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
            hintAccessRequired: "需要授予屏幕访问权限"
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
      position:fixed; inset:0; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center; z-index:2147483660;`;
            const modal = document.createElement("div");
            modal.style.cssText = `
      background:#1a1f27; color:#fff; border-radius:12px; padding:20px 30px;
      display:flex; flex-direction:column; align-items:center; gap:14px;
      font-family:sans-serif; min-width:300px;`;
            const emoji = document.createElement("div");
            emoji.style.fontSize = "42px";
            emoji.textContent = "🌍";
            modal.appendChild(emoji);
            const title = document.createElement("div");
            title.style.fontSize = "18px";
            title.textContent = t("selectLanguageTitle");
            modal.appendChild(title);
            const list = document.createElement("div");
            list.style.display = "flex";
            list.style.flexWrap = "wrap";
            list.style.gap = "8px";
            list.style.justifyContent = "center";
            LANGS.forEach(lang => {
                const btn = document.createElement("button");
                btn.style.cssText = `
        flex:0 0 auto; padding:8px 12px; border-radius:8px; border:1px solid #444;
        display:flex; align-items:center; gap:6px; background:#262a30; color:#fff;
        cursor:pointer; font-size:14px;`;
                btn.innerHTML = `${lang.flag} ${lang.name}`;
                btn.addEventListener("click", () => {
                    localStorage.setItem("overlay_tool_lang", lang.code);
                    currentLang = lang.code;
                    document.body.removeChild(back);
                    resolve(lang.code)
                });
                list.appendChild(btn)
            });
            modal.appendChild(list);
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
.pixel-modal{width:auto;max-width:min(420px,96vw);height:auto;max-height:70vh;background:var(--ui-strong);border:1px solid var(--stroke);border-radius:12px;box-shadow:var(--shadow);display:flex;flex-direction:column;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif}
.pixel-head{height:48px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.pixel-title{font-weight:700;letter-spacing:.2px}
.pixel-filename{margin-left:auto;opacity:.9;background:#1f232a;border:1px solid #3a3f47;border-radius:999px;padding:6px 10px;max-width:45%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pixel-body{flex:1;display:flex;flex-direction:column;gap:12px;min-height:0;padding:12px}
.pixel-controls{border-right:0;padding:0;display:flex;flex-direction:column;gap:12px;overflow:auto}
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

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))]
    }


    function cvColorFor(index) {
        const golden = 137.508;
        const hue = (index * golden) % 360;

        const sat = 100;
        const light = 55;
        const [r, g, b] = hslToRgb(hue, sat, light);
        return [r, g, b]
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms))
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

    const spacer = el('div');
    spacer.style.flex = '1';
    const btnAcc = el("button", "btn icon");
    btnAcc.title = "Статистика аккаунта";
    btnAcc.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    toolbarRow.append(btnAcc, btnOpen, btnAcid, fileChip, spacer, btnClear, btnClose);
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
    sideBody.append(panelHost, paletteEl);

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
        const title = el('div', 'title', 'Статистика аккаунта');
        accTip.appendChild(title);
        if (!__accStats) {
            const msg = el('div', 'muted', 'Отправьте пиксель для получения статистики');
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
            ['Имя', String(nameVal ?? '—')],
            ['Заряды (макс)', (chargesMax != null) ? String(chargesMax) : '—'],
            ['Капли', (dropletsVal != null) ? String(dropletsVal) : '—'],
            ['Пикселей', (pixelsPaintedVal != null) ? String(pixelsPaintedVal) : '—'],
            ['Уровень', (levelInt != null && levelPct != null) ? (`${levelInt} (${levelPct.toFixed(1)}%)`) : (levelInt != null ? String(levelInt) : '—')]
        ];
        for (const [k, v] of rows) {
            const row = el('div', 'row');
            row.append(el('div', null, k), el('div', null, v));
            accTip.appendChild(row);
        }
        const needed = computePixelsToNextLevel(s);
        const msg = (needed != null) ?
            `Пикселей до нового уровня: ${needed}` :
            'Пикселей до нового уровня: — (нет данных от API)';
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

    function showStartupModal() {
        try {
            const back = el("div", "pixel-backdrop");
            const modal = el("div", "pixel-modal");
            const head = el("div", "pixel-head");
            const title = el("div", "pixel-title", t("startupTitle"));
            head.append(title);
            const body = el("div", "pixel-body");
            const controls = el("div", "pixel-controls");
            const msg = document.createElement("div");
            msg.style.opacity = ".95";
            msg.style.lineHeight = "1.4";
            msg.textContent = t("startupBody");
            controls.append(msg);
            body.append(controls);
            const foot = el("div", "pixel-foot");
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
        setTimeout(() => {
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
            active: !1,
            pointerId: null,
            lastX: 0,
            lastY: 0
        },

        acidModeEnabled: false
    };

    const PERSIST_KEY = "overlay_tool_persist_v2";

    function persistSave() {
        try {
            const data = {
                w: state.w,
                h: state.h,
                gridOffsetXSteps: state.gridOffsetXSteps,
                gridOffsetYSteps: state.gridOffsetYSteps,
                imgURLTag: state.currentFileName || null
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

    function measurePaletteNeededHeight() {
        try {
            const count = state.palette?.length || 0;
            if (count <= 0) return 0;
            const gridStyles = getComputedStyle(paletteEl);
            const gap = parseInt(gridStyles.gap || '6', 10) || 0;
            const cell = 24;
            const innerW = Math.max(1, paletteEl.clientWidth || 1);
            const cols = Math.max(1, Math.floor((innerW + gap) / (cell + gap)));
            const rows = Math.ceil(count / cols);
            const gridH = rows * cell + (rows - 1) * gap;
            const pcStyles = getComputedStyle(sideBody);
            const pt = parseInt(pcStyles.paddingTop || '0', 10) || 0;
            const pb = parseInt(pcStyles.paddingBottom || '0', 10) || 0;
            return gridH + pt + pb;
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

    }

    function updateAcidBtn() {
        try {
            btnAcid.classList.toggle('active', !!state.acidModeEnabled);
            btnAcid.title = t("acidToggleTitle");
            btnAcid.innerHTML = state.acidModeEnabled ? eyeOpenSvg : eyeOffSvg;
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

            const snap = ensureSnapCanvas();
            const cnv = snap || getMainCanvas();
            const rect = cnv?.getBoundingClientRect?.();
            if (!state.iw || !state.ih) return null;
            const imgStepX = state.w / state.iw;
            const imgStepY = state.h / state.ih;
            const m = getCanvasStep();
            if (!m) {

                const baseX = 0.5 * imgStepX;
                const baseY = 0.5 * imgStepY;
                return {
                    baseX,
                    baseY,
                    stepX: imgStepX,
                    stepY: imgStepY
                };
            }

            const baseX = m.rectLeft + 0.5 * m.stepX - 0.5 * imgStepX;
            const baseY = m.rectTop + 0.5 * m.stepY - 0.5 * imgStepY;

            return {
                baseX,
                baseY,
                stepX: m.stepX,
                stepY: m.stepY
            };
        } catch (_) {
            return null;
        }
    }

    function startDrag(e) {
        if (e.button !== 0) return;
        if (!state.moveMode) return;
        e.preventDefault();
        ensureSnapCanvas();

        enforcePixelScaleIfSnap();
        state.dragging = !0;
        state.start.x = e.clientX;
        state.start.y = e.clientY;
        state.start.left = state.x;
        state.start.top = state.y;
        state.start.pointerId = e.pointerId;
        state.captureEl = overlay;

        state.snapGrid = snapCheck.checked ? computeSnapGrid() : null;
        try {
            overlay.setPointerCapture?.(e.pointerId)
        } catch (_) {}
    }

    function moveDrag(e) {
        if (!state.dragging) return;
        const dx = e.clientX - state.start.x;
        const dy = e.clientY - state.start.y;
        let nx = state.start.left + dx;
        let ny = state.start.top + dy;
        if (snapCheck.checked) {
            const g = computeSnapGrid() || state.snapGrid;

            if (g) {
                nx = g.baseX + Math.round((nx - g.baseX) / g.stepX) * g.stepX;
                ny = g.baseY + Math.round((ny - g.baseY) / g.stepY) * g.stepY;
            }
        }
        state.x = nx;
        state.y = ny;

        if (!state._rafMove) {
            state._rafMove = requestAnimationFrame(() => {
                state._rafMove = null;
                syncUI();
            });
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
    }


    try {
        snapCheck.addEventListener('change', () => {
            if (snapCheck.checked) enforcePixelScaleIfSnap();
        });
    } catch (_) {}

    try {
        window.addEventListener('resize', () => ensureSnapCanvas());
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
            const tolBase = 5;
            const SHIFT = 20;
            const rr = Math.min(255, tr + SHIFT);
            const gg = Math.min(255, tg + SHIFT);
            const bb = Math.min(255, tb + SHIFT);
            const tolShift = 10;
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
                    const pal = MASTER_COLORS.map(c => c.rgb);
                    const palLab = pal.map(p => rgb8ToOKLab(p[0], p[1], p[2]));
                    const qi = nearestColorIndex(pr, pg, pb, pal, palLab, true);
                    const acid = cvColorFor(qi);
                    acidR = acid[0];
                    acidG = acid[1];
                    acidB = acid[2];
                    acidTol = 10;
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
                        } else {
                            if (!looksMarked(r, g, b)) continue;
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
                    batch.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
                    runner.points.push(...batch);
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
                if (document.querySelector('body > div:nth-child(1) > section > ol')) {

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
                stopAutoClick();
                return;
            }

            const [x, y] = runner.points[runner.idx++];
            const k = x + "," + y;


            if (!isPointInUI(x, y) && !exclude.has(k)) {
                exclude.add(k);
                simulateClickAt(x, y);
            }
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

    function captureViewportSnapshot() {
        try {
            const w = Math.max(1, Math.floor(window.innerWidth));
            const h = Math.max(1, Math.floor(window.innerHeight));
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            if (!ctx) return null;
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, w, h);
            const canvases = Array.from(document.querySelectorAll('canvas'));
            for (const cv of canvases) {
                try {
                    const r = cv.getBoundingClientRect();
                    if (r.width <= 0 || r.height <= 0) continue;
                    ctx.drawImage(cv, Math.max(0, Math.floor(r.left)), Math.max(0, Math.floor(r.top)), Math.floor(r.width), Math.floor(r.height));
                } catch {}
            }
            const imgs = Array.from(document.images);
            for (const img of imgs) {
                try {
                    const r = img.getBoundingClientRect();
                    if (r.width <= 0 || r.height <= 0) continue;
                    ctx.drawImage(img, Math.max(0, Math.floor(r.left)), Math.max(0, Math.floor(r.top)), Math.floor(r.width), Math.floor(r.height));
                } catch {}
            }
            const data = ctx.getImageData(0, 0, w, h);
            return {
                data,
                width: w,
                height: h
            };
        } catch {
            return null;
        }
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
                placeState.refX = Math.floor(Math.max(1, state.iw || 1) / 2);
                placeState.refY = Math.floor(Math.max(1, state.ih || 1) / 2);
            }
            const pxStepX = Math.max(1e-6, (state.w || 1) / Math.max(1, state.iw || 1));
            const pxStepY = Math.max(1e-6, (state.h || 1) / Math.max(1, state.ih || 1));
            const targetX = e.clientX;
            const targetY = e.clientY;
            state.x = Math.round(targetX - (placeState.refX + 0.5) * pxStepX);
            state.y = Math.round(targetY - (placeState.refY + 0.5) * pxStepY);
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
                state.refX = Math.floor(state.selectedImageSize.w / 2);
                state.refY = Math.floor(state.selectedImageSize.h / 2);
                state.refSet = true;
            }
            hint.textContent = 'Кликните по карте, чтобы разместить центр изображения.';
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

    function openBrushPanel() {
        setPanelOpen(railBrushPanel, true);
    }

    function closeBrushPanel() {
        setPanelOpen(railBrushPanel, false);
    }

    function toggleDelayPanel() {
        state.delayPanelOpen = !state.delayPanelOpen;
        setPanelOpen(railDelayPanel, state.delayPanelOpen);
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
        fileChip.textContent = t("filePrefix") + (fileName || "—");
        fileChip.title = fileName || "";
        fileChip.style.display = fileName ? '' : 'none';

        const im = new Image();
        im.decoding = "async";
        im.onload = async () => {
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
                await extractPalette();
            } catch {}
            try {
                renderPalette();
            } catch {}

            try {
                setMoveMode(true);
            } catch {}

            try {
                btnClear.style.display = '';
            } catch (_) {}
        };
        im.onerror = () => {
            /* ignore */
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
                            if (this.status >= 200 && this.status < 300 && tileRegex(this.__turl)) state.lastTileURL = this.__turl
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
                    alpha: !0
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
            const fileURL = URL.createObjectURL(file);
            let bitmap = null,
                imEl = null,
                ow = 0,
                oh = 0;
            async function loadDims() {
                try {
                    bitmap = await createImageBitmap(file);
                    ow = bitmap.width;
                    oh = bitmap.height
                } catch (e) {
                    try {
                        imEl = await createImageElementFromURL(fileURL);
                        ow = imEl.naturalWidth;
                        oh = imEl.naturalHeight
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
            slider.value = "14";
            slider.className = "pixel-slider";
            const pxWrap = el("span", "range-wrap");
            const pxVal = el("span", "value", "14");
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
            stats.append(stH, s1, stV, s2, stT, s3, stExport, s4, stC);
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
            foot.append(zoomLbl, btnCV, spacer, btnSave, btnApply, btnSkip, btnCancel);
            modal.append(head, body, foot);
            back.append(modal);
            shadow.append(back);
            const small = document.createElement("canvas");
            const sctx = small.getContext("2d", {
                willReadFrequently: !0,
                alpha: !0
            });
            let pixelSize = Math.max(1, Math.min(parseInt(slider.max, 10) || 14, 14));
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
                if (bitmap) {
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
                stH.textContent = t("horizontal") + ": " + dwnW;
                stV.textContent = t("vertical") + ": " + dwnH;
                stT.textContent = t("total") + ": " + (dwnW * dwnH).toLocaleString("ru-RU");
                stExport.textContent = `${t("export")}: ${dwnW} × ${dwnH}`
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
                const cx = (vw - drawW) / 2 + offX2,
                    cy = (vh - drawH) / 2 + offY2;
                ctx.imageSmoothingEnabled = !1;
                ctx.drawImage(small, 0, 0, dwnW, dwnH, Math.round(cx), Math.round(cy), Math.round(drawW), Math.round(drawH));
                zoomLbl.textContent = `Zoom: ${zoom2}×`
            }
            const roPrev = new ResizeObserver(() => fitAndRender());
            roPrev.observe(preview);
            let dragging2 = !1,
                sx2 = 0,
                sy2 = 0,
                sox2 = 0,
                soy2 = 0;
            preview.addEventListener("pointerdown", (e) => {
                dragging2 = !0;
                preview.setPointerCapture?.(e.pointerId);
                sx2 = e.clientX;
                sy2 = e.clientY;
                sox2 = offX2;
                soy2 = offY2
            });
            preview.addEventListener("pointermove", (e) => {
                if (!dragging2) return;
                offX2 = sox2 + (e.clientX - sx2);
                offY2 = soy2 + (e.clientY - sy2);
                render()
            });
            preview.addEventListener("pointerup", () => {
                dragging2 = !1
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
                    render()
                }
            }, {
                passive: !1
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
                fitAndRender()
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
                            URL.revokeObjectURL(fileURL)
                        } catch (e) {}
                    }
                }
                cleanup();
                resolve({
                    action: "apply"
                })
            });
            btnSkip.addEventListener("click", () => {
                setImageURL(fileURL, file.name || "image");
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
    btnAcid.addEventListener('click', () => {
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
        state.selectedImageBitmap = null;
        state.selectedImageSize = null;
        fileChip.style.display = 'none';

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

    btnStop.addEventListener("click", () => stopAutoClick());
    rStop.addEventListener("click", () => stopAutoClick());
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

    document.addEventListener('pointerdown', (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        const insideClock = path.includes(rClock) || path.includes(railDelayPanel);
        const insideBrush = path.includes(rBrush) || path.includes(railBrushPanel);
        if (!insideClock && state.delayPanelOpen) {
            state.delayPanelOpen = false;
            setPanelOpen(railDelayPanel, false);
        }
        if (!insideBrush && state.brushMode) {
            /* не сворачиваем при режиме кисти */
        }
    }, true);

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
        if (e.key === "Escape") {
            api.destroy()
        }
    };
    document.addEventListener("keydown", onKey, !0);
    api.destroy = () => {
        try {
            document.removeEventListener("keydown", onKey, !0)
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
                    cnv.addEventListener('pointerdown', (e) => {
                        if (e.button !== 0) return;
                        state.mapPan.active = true;
                        state.mapPan.pointerId = e.pointerId;
                        state.mapPan.lastX = e.clientX;
                        state.mapPan.lastY = e.clientY;
                    }, true);
                    cnv.addEventListener('pointermove', (e) => {
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
                    }, true);
                    const endPan = () => {
                        if (!state.mapPan.active) return;
                        state.mapPan.active = false;
                        state.mapPan.pointerId = null;
                        persistSave();
                    };
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
        const step = DRAW_MULT;
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


    function maskAlreadyPlacedPixels(baseCtx, overlayCanvas) {
        try {
            const w = overlayCanvas.width | 0;
            const h = overlayCanvas.height | 0;
            if (w <= 0 || h <= 0) return;
            const octx = overlayCanvas.getContext('2d');
            if (!octx) return;
            const base = baseCtx.getImageData(0, 0, w, h);
            const over = octx.getImageData(0, 0, w, h);
            const bd = base.data,
                od = over.data;
            const tol = 8;
            let i = 0;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++, i += 4) {
                    const a = od[i + 3];
                    if (a === 0) continue;
                    const dr = Math.abs(od[i] - bd[i]);
                    const dg = Math.abs(od[i + 1] - bd[i + 1]);
                    const db = Math.abs(od[i + 2] - bd[i + 2]);
                    if (dr <= tol && dg <= tol && db <= tol) {
                        od[i + 3] = 0;
                    }
                }
            }
            octx.putImageData(over, 0, 0);
        } catch {
            /* ignore */
        }
    }

    function applySubtleColorPerturbation(canvas, seedX, seedY) {
        const ctx = canvas.getContext('2d');
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
            /* ignore */
        }
    }

    function applyAcidSurrogateToCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const {
            width,
            height
        } = canvas;
        if (width <= 0 || height <= 0) return;
        try {
            const img = ctx.getImageData(0, 0, width, height);
            const data = img.data;
            const pal = MASTER_COLORS.map(c => c.rgb);
            const palLab = pal.map(p => rgb8ToOKLab(p[0], p[1], p[2]));
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a === 0) continue;
                const qi = nearestColorIndex(data[i], data[i + 1], data[i + 2], pal, palLab, true);
                const col = cvColorFor(qi);
                data[i] = col[0];
                data[i + 1] = col[1];
                data[i + 2] = col[2];

            }
            ctx.putImageData(img, 0, 0);
        } catch {
            /* ignore */
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
        const dstX = (iLeft - tLeft) * DRAW_MULT;
        const dstY = (iTop - tTop) * DRAW_MULT;
        ctx.drawImage(
            state.selectedImageBitmap,
            srcX, srcY, iW, iH,
            dstX, dstY, iW * DRAW_MULT, iH * DRAW_MULT
        );
    }

    function prepareForMapClick() {

        if (!state.selectedImageSize || !state.selectedImageSize.w || !state.selectedImageSize.h) return;
        state.refX = Math.floor(state.selectedImageSize.w / 2);
        state.refY = Math.floor(state.selectedImageSize.h / 2);
        state.refSet = true;
    }


    (function setupFetchInterceptor() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            try {
                const cloned = response.clone();
                const endpoint = (args[0] instanceof Request) ? args[0]?.url : String(args[0] || '');

                if (endpoint.includes('pixel') && state.moveMode && state.refSet) {
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

                                document.getElementById('WRAP_ID')?.remove();
                                if (hint) hint.style.display = 'none';

                                try {
                                    setMoveMode(false);
                                } catch (_) {}
                            }
                        } catch {
                            /* noop */
                        }
                    });
                }

                if (endpoint.includes('tiles') && state.selectedImageBitmap && state.anchorSet) {
                    const tileBlob = await cloned.blob();
                    return new Promise((resolve) => {
                        const path = endpoint.split('?')[0];
                        const parts = path.split('/').filter(Boolean);
                        const numbers = parts.filter(p => /^\d+(?:\.png)?$/.test(p)).map(p => Number(p.replace('.png', '')));
                        const tileY = numbers[numbers.length - 1];
                        const tileX = numbers[numbers.length - 2];
                        if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) {
                            resolve(response);
                            return;
                        }
                        (async () => {
                            try {
                                const drawSize = TILE_SIZE * DRAW_MULT;
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
                                    alpha: true
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
                                    alpha: true
                                });
                                if (octxCandidate && ('drawImage' in octxCandidate)) {
                                    const octx = /** @type {any} */ (octxCandidate);
                                    octx.imageSmoothingEnabled = false;
                                    octx.clearRect(0, 0, drawSize, drawSize);

                                    computeIntersectionDrawOnTile(octx, tileX, tileY);

                                    const mask = getDotMaskCanvas(drawSize);
                                    if (mask) {
                                        octx.globalCompositeOperation = 'destination-in';
                                        octx.drawImage(mask, 0, 0);
                                        octx.globalCompositeOperation = 'source-over';
                                    }
                                }

                                maskAlreadyPlacedPixels(ctx, overlayCanvas);

                                if (state.acidModeEnabled) {
                                    applySubtleColorPerturbation(overlayCanvas, tileX, tileY);
                                    applyAcidSurrogateToCanvas(overlayCanvas);
                                }

                                try {
                                    binarizeAlphaOnCanvas(overlayCanvas, 8);
                                } catch {}
                                ctx.drawImage(overlayCanvas, 0, 0);

                                try {
                                    binarizeAlphaOnCanvas(canvas, 8);
                                } catch {}

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
                /* ignore */
            }
            return response;
        };
    })();

    makeHScroll(toolbar, toolbarScroll, fadeL, fadeR);
    makeHScroll(sideHead, sideScroll, sfadeL, sfadeR)
})()