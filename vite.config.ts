import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';
import { readFileSync } from 'fs';

function readPackageVersion(): string {
  try {
    const raw = readFileSync(new URL('./package.json', import.meta.url), 'utf8');
    const parsed = JSON.parse(raw);
    const v = String(parsed?.version || '').trim();
    if (v) return v;
  } catch {}
  return '0.0.0';
}

function computeBuildTime(): string {
  try {
    const iso = new Date().toISOString();
    return iso.replace(/\.\d{3}Z$/, 'Z');
  } catch {
    return '';
  }
}

function computeBuildId(buildTime: string): string {
  try {
    const envId = String(process.env.WPH_BUILD_ID || '').trim();
    if (envId) return envId;
    const sha = String(process.env.GITHUB_SHA || '').trim();
    if (sha) return sha.slice(0, 8);
    const t = String(buildTime || '').replace(/[^0-9]/g, '');
    if (t) return t.slice(0, 14);
  } catch {}
  return 'dev';
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const version = readPackageVersion();
  const buildTime = computeBuildTime();
  const buildId = computeBuildId(buildTime);
  return {
    appType: isBuild ? 'custom' : 'spa',
    define: {
      __WPH_VERSION__: JSON.stringify(version),
      __WPH_BUILD_ID__: JSON.stringify(buildId),
      __WPH_BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
      svelte(),
      isBuild ? monkey({
        entry: 'src/main.ts',
        userscript: {
          name: 'Wplace Helper',
          namespace: 'https://github.com/MidTano/wplace_helper',
          version,
          author: 'MidTano',
          description: 'Overlay and tools for Wplace',
          match: [
            '*://wplace.live/*',
            '*://*.wplace.live/*',
            '*://wplace.*/*',
            '*://*.wplace.*/*',
          ],
          'run-at': 'document-start',
          noframes: true,
          grant: [
            'GM_xmlhttpRequest',
            'GM_download',
            'GM_setValue',
            'GM_getValue',
            'unsafeWindow'
          ],
          connect: [
            'catbox.moe',
            'files.catbox.moe',
            'uguu.se',
            'qu.ax',
            'clck.ru',
            'sba.yandex.ru',
            'youtu.be',
            'youtube.com',
            'www.youtube.com',
            'music.youtube.com',
            'tiktok.com',
            'www.tiktok.com',
            'vt.tiktok.com',
            'vm.tiktok.com',
            'soundcloud.com',
            'on.soundcloud.com',
            'w.soundcloud.com',
            'open.spotify.com',
            'spotify.link',
          ],
          updateURL: 'https://github.com/MidTano/wplace_helper/releases/latest/download/overlay.user.js',
          downloadURL: 'https://github.com/MidTano/wplace_helper/releases/latest/download/overlay.user.js',
        },
        build: {
          fileName: 'overlay.user.js',
          metaFileName: false,
          externalGlobals: {},
        },
      }) : undefined,
    ].filter(Boolean),
    build: {
      target: 'es2018',
    }
  };
});