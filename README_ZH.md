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
<p align="center"><em>用于图像叠加、像素化和按网格快速拷贝作品的叠加工具</em></p>
<p align="center">
  <img src="https://img.shields.io/github/stars/MidTano/wplace_helper?style=for-the-badge" alt="GitHub stars">
</p>

<p align="center">
  <img width="80%" alt="demo"src="https://github.com/user-attachments/assets/af0a1714-8a89-4374-851f-8bdacbba1129" />
</p>

<p align="center">
✅ 直接在浏览器中工作 &nbsp;|&nbsp; 
✅ <span style="color:orange">无需安装</span> &nbsp;|&nbsp; 
✅ 支持像素化与自动点击
</p>

## 快速开始
- 打开 wplace.live  
- 打开 DevTools → Console  
- 粘贴并运行：
```js
(async () => {
  const url = 'https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';
  const code = await (await fetch(url, { cache: 'no-store' })).text();
  new Function(code)();
})();
```

如果站点阻止 eval/new Function，请使用下面的方法。

## 书签脚本（可选）
创建一个书签，地址为：
```
javascript:(async()=>{const u='https://raw.githubusercontent.com/MidTano/wplace_helper/main/overlay.js';const c=await (await fetch(u,{cache:'no-store'})).text();new Function(c)();})()
```
点击该书签——工具会在当前页面加载。 在 CSP 严格的网站可能无效。

## 用户脚本（Tampermonkey）
适用于带有 CSP 的网站（避免在页面内使用 <code>eval</code>）：
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

## 快捷键
- <code>P</code> — 开启/关闭“穿透点击”（Pass-through），在画笔模式下禁用  
- <code>[</code> / <code>]</code> — 将叠加层不透明度减少/增加 5%  
- <code>Esc</code> — 关闭工具

## 叠加层与基础控件
- 移动：拖拽“⠿”把手或工具栏标题（对窗口按住 <code>Shift</code> + <code>左键</code> 也可）  
- 调整大小：拖动右下角  
- <code>W</code> / <code>H</code> — 数字输入窗口宽/高  
- 🔒 — 锁定纵横比  
- 整倍数 — 按原始尺寸的整倍数缩放  
- 透明度 — 叠加层透明度  
- 穿透 — 允许鼠标点击穿透窗口  
- 📁 打开 — 载入图像（或拖拽到工具栏/窗口），右侧显示文件名

## 调色板 / 自动点击 / 画笔
- 载入图像后，右侧会出现调色板（颜色名称）  
- 点击某个颜色 — 在页面上自动点击该颜色的所有像素：
  - 延迟（毫秒）— 点击间隔  
- 画笔：
  - 启用“画笔”并在调色板中选择颜色  
  - 尺寸 — 画笔的方形边长（以图像像素为单位）  
  - 悬停显示画笔光标；<code>左键</code> 会在画笔范围内点击所选颜色的像素  
- 说明：
  - 工具只会点击所选颜色的像素  
  - 重新选择颜色会重置该颜色的画笔进度

## 像素化
<img width="1233" height="809" alt="像素化示例" src="https://github.com/user-attachments/assets/f9767323-6c85-4cf9-ab3e-cee6361e1550" />

通过 📁 打开（或拖拽图像）——将弹出“像素化”窗口。

- Image Scaling Method：Nearest / Bilinear / Lanczos  
- Pixel Size：像素网格步长  
- Palette：
  - Full — 所有可用颜色
  - Free only — 仅免费颜色
  - Custom — 手动选择（网格上会在付费颜色显示锁图标）
  - Owned — 与 Free 类似（无第三方站点集成）
- Dithering：None / Ordered 4×4 / Ordered 8×8 / Floyd–Steinberg / Atkinson  
- Distance：sRGB / OKLab  
- 统计：Horizontal × Vertical（像素网格尺寸）、Total、Colors used  
- 预览：缩放、拖动  
- 保存为文件 — 导出像素网格 PNG（不乘以 Pixel Size）  
- 应用 — 将结果放入叠加层  
- 不做更改继续 — 使用原图  
- 取消 — 关闭窗口

## 复制作品
<img width="1221" height="797" alt="复制作品示例" src="https://github.com/user-attachments/assets/11f25a54-3b86-4b1d-b77a-f44a2aa029de" />

用于拼接瓦片并裁剪区域的工具。

- 输入 <code>X</code> 和 <code>Y</code> — 瓦片中心坐标  
- 网格尺寸：2×2、3×3、4×4、5×5、10×10  
- 延迟（秒）— 请求之间的间隔（0.2–5.0）  
- 选区：按住 <code>左键</code> — 拖动 — 松开（矩形选区）  
- 保存 PNG — 将选中区域保存为 .png  
- “🎯 中心” — 恢复到缩放 1 并居中  
- 说明：该工具不会复制到叠加层——只保存 PNG

## 提示
- 如果有大量瓦片未加载：增大延迟；服务器可能限制请求频率  
- 大型马赛克需要更长的组装时间

## 移除
- <code>Esc</code> 或工具栏中的 “✕ 关闭” 按钮  
- 重新运行脚本会替换当前实例