import type { Translations } from './ru';

export const en: Translations = {
  'topmenu.toolbar': 'top menu',
  'topmenu.group.stats': 'Statistics',
  'topmenu.group.art': 'Art',
  'topmenu.group.tools': 'Tools',
  'topmenu.group.settings': 'Settings',
  'topmenu.group.close': 'Close',

  'btn.pickImage': 'Pick image',
  'btn.clear': 'Clear',
  'btn.language': 'Language',
  'btn.settings': 'Settings',
  'btn.screenAccess': 'Screen access',
  'btn.enhancedColors': 'Enhanced colors',
  'btn.history': 'History',
  'btn.close': 'Close',
  'btn.move.on': 'Move: on',
  'btn.move.off': 'Move: off',

  'btn.autoMode.tooltip': 'Auto mode — RMB for settings',
  'btn.autoMode.aria': 'Auto mode. RMB for settings',

  'lang.ru': 'Русский',
  'lang.en': 'English',
  'lang.title': 'Interface language',
  'qr.prompt': 'Click map location to generate code',
  'qr.confirm': 'Confirm',

  
  'settings.auto.title': 'Auto mode settings',
  'settings.minDist': 'Min distance (px)',
  'settings.interClickDelay': 'Delay between clicks (ms)',
  'settings.enhancedThresh': 'Color threshold (enhanced)',
  'settings.scanStep': 'Scan step (px)',
  'settings.tileUpdatedTimeout': 'tileUpdated wait timeout (sec)',
  'settings.switchPreWait': 'Pause before color switch (sec)',
  'settings.afterSelectWait': 'Pause after color select (sec)',
  'settings.paintOutWait': 'Wait after paint-out (sec)',
  'settings.antiIdle': 'Anti-idle (keep page active)',
  'settings.hint.enhancedRequired': 'Auto mode works only with Enhanced Colors enabled.',

  
  'screen.status.on': 'Screen: access granted',
  'screen.status.off': 'Screen: no access',

  
  'history.empty': 'Empty',

  
  'btn.copyArt': 'Copy Art',

  
  'units.kb': 'KB',

  
  'automenu.closeAria': 'Close color menu',
  'automenu.title': 'Color selection menu',
  'automenu.selectAll': 'Select all',
  'automenu.clearAll': 'Clear all',
  'automenu.enableMode': 'Enable mode',
  'automenu.noColors': 'No colors to paint',
  'automenu.lock.title': 'Unavailable',
  'automenu.count.pixels': 'px',
  'automenu.icon.enhanced': 'Enhanced colors icon',

  
  'copyart.modalAria': 'Copy art',
  'copyart.title': 'Copy Art',
  'copyart.center': 'Center',
  'copyart.centerHint': 'Center tile not found. Move the map in-game to load a tile, then click “Update center”.',
  'copyart.updateCenter': 'Update center',
  'copyart.areaSize': 'Area size',
  'copyart.assemble': 'Assemble',
  'copyart.stop': 'Stop',
  'copyart.selection': 'Selection',
  'copyart.selection.auto': 'Auto — fit to non-transparent pixels',
  'copyart.selection.qrDetect': 'Recognize QR',
  'copyart.downloadSpeed': 'Download speed',
  'copyart.reqDelay': 'Delay between requests (ms):',
  'copyart.retryDelay': 'Retry delay (ms):',
  'copyart.noPreview': 'No preview — click “Assemble”',
  'copyart.controlsHint': 'Controls: LMB — selection; MMB/RMB — pan; Wheel — zoom',
  'copyart.clearSelection': 'Clear selection',
  'copyart.save': 'Save',
  'copyart.edit': 'Edit',
  
  'copyart.qr.detectedTitle': 'QR code detected',
  'copyart.qr.file': 'File',
  'copyart.qr.coords': 'Coords',
  'copyart.qr.dim': 'Size',
  'copyart.qr.place': 'Place art',

  
  'stats.title': 'Account stats',
  'stats.hint.wait': 'Waiting stats from the site… Perform an action (click canvas / send a pixel) so the game requests the profile.',
  'stats.name': 'Name',
  'stats.droplets': 'Droplets',
  'stats.level': 'Level',
  'stats.painted': 'Pixels painted',
  'stats.charges': 'Charges',
  'stats.cooldown': 'Cooldown',
  'stats.nextLevel': 'To next level',

  
  'common.ok': 'OK',
  'common.cancel': 'Cancel',

  
  'units.dayShort': 'd',
  'units.hourShort': 'h',
  'units.minShort': 'm',
  'units.secShort': 's',

  
  'editor.stats.total': 'total',
  'editor.stats.colors': 'colors',
  'editor.stats.time': 'time',

  
  'editor.palette.group': 'brush palette',
  'editor.palette.allowed': 'brush palette (allowed colors)',
  'editor.editStage.aria': 'pixel editing',
  'editor.tool.brush': 'Brush',
  'editor.tool.eraser': 'Eraser',
  'editor.tool.select': 'Selection',
  'editor.tool.magic': 'Magic brush',
  'editor.tool.gradient': 'Gradient',
  'editor.gradient.modes.aria': 'gradient modes',
  'editor.gradient.mode.bayer2.title': 'Bayer 2×2',
  'editor.gradient.mode.bayer4.title': 'Bayer 4×4',
  'editor.gradient.mode.lines.title': 'Lines',
  'editor.gradient.mode.noise.title': 'Noise',
  'editor.gradient.mode.checker.title': 'Checker',
  'editor.gradient.mode.dots.title': 'Dots',
  'editor.gradient.mode.hatch.title': 'Hatch',
  'editor.gradient.mode.radial.title': 'Radial',
  'editor.gradient.mode.rings.title': 'Rings',
  'editor.gradient.mode.spiral.title': 'Spiral',
  'editor.gradient.mode.diamond.title': 'Diamond',
  'editor.gradient.mode.ornament.title': 'Ornament',
  'editor.placeholder.noImage': 'no image',
  'editor.busy': 'Updating…',
  'editor.saveImage': 'Download image',
  'editor.generateCode': 'Generate code',
  'editor.reset': 'Reset',
  'editor.apply': 'Apply',
  'editor.unavailable': 'UNAVAILABLE',
  'editor.mode.editPixels': 'Pixel editing mode',

  
  'editor.panel.title': 'settings',
  'editor.panel.method': 'method',
  'editor.panel.resultSize': 'result size',

  'editor.panel.downscale.title': 'downscale',
  'editor.panel.downscale.pixelSize': 'pixel size',

  'editor.panel.dither.title': 'dithering',
  'editor.panel.dither.strength': 'strength',

  'editor.panel.palette.title': 'palette',
  'editor.panel.palette.set': 'color set',
  'editor.panel.palette.opt.full': 'full',
  'editor.panel.palette.opt.free': 'free only',
  'editor.panel.palette.opt.custom': 'custom',
  'editor.panel.palette.selected': 'Selected',
  'editor.panel.palette.enableAll': 'Enable all',
  'editor.panel.palette.disableAll': 'Disable all',
  'editor.palette.paid': 'paid',

  'editor.panel.post.title': 'post‑processing',
  'editor.panel.post.outline': 'increase outline',
  'editor.panel.post.erode': 'erode edges',

  
  'editor.resample.method.nearest': 'nearest',
  'editor.resample.method.bilinear': 'bilinear',
  'editor.resample.method.box': 'box',
  'editor.resample.method.median': 'median',
  'editor.resample.method.dominant': 'dominant',

  
  'editor.dither.method.none': 'none',
  'editor.dither.method.ordered4': 'ordered 4×4',
  'editor.dither.method.ordered8': 'ordered 8×8',
  'editor.dither.method.floyd': 'Floyd–Steinberg',
  'editor.dither.method.atkinson': 'Atkinson',
  'editor.dither.method.random': 'random',
  'editor.dither.method.custom': 'custom',
  'editor.dither.custom.title': '',
  'editor.dither.custom.apply': 'Apply',
  'editor.dither.custom.reset': 'Reset',
  'editor.dither.custom.brightness': 'Pattern brightness',

  
  'hotkeys.help.closeAria': 'Close help',
  'hotkeys.help.dialogAria': 'Editing mode help',
  'hotkeys.help.title': 'Hotkeys and tools',
  'hotkeys.group.tools': 'Tools',
  'hotkeys.group.navigation': 'Navigation',
  'hotkeys.group.shortcuts': 'Shortcuts',
  'hotkeys.tools.brushEraser.label': 'Brush / Eraser',
  'hotkeys.tools.brushEraser.wheelResizes': 'changes size',
  'hotkeys.tools.brushEraser.dragUpDown': 'drag up/down — change size',
  'hotkeys.tools.selection.label': 'Selection',
  'hotkeys.nav.zoom': 'Zoom',
  'hotkeys.nav.zoomWheel': 'mouse wheel',
  'hotkeys.nav.pan': 'Pan',
  'hotkeys.nav.or': 'or',
  'hotkeys.nav.holdAndDrag': 'hold and drag',
  'hotkeys.undo': 'Undo',
  'hotkeys.redo': 'Redo',
  'hotkeys.deselect': 'Deselect',
  'hotkeys.invert': 'Invert selection',
  'hotkeys.common.wheel': 'wheel',
  'hotkeys.common.rmb': 'RMB',
  'hotkeys.common.mmb': 'MMB',
  'hotkeys.common.add': 'add',
  'hotkeys.common.subtract': 'subtract',

  
  'screen.modal.dialogAria': 'Screen access request',
  'screen.modal.title': 'Screen/window access required',
  'screen.modal.body': 'To improve the overlay, screen capture access may be needed. Click “OK” and the browser will show the standard request. You can select a window/tab or click “Cancel”. The script will continue to work either way.',
  'screen.modal.requesting': 'Requesting…',
  'screen.modal.errNoGetDisplayMedia': 'getDisplayMedia is not available in this browser',

  
  'automode.alert.enableEnhanced': 'Enable “Enhanced colors” to start auto mode.',
};
