import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  return {
    appType: isBuild ? 'custom' : 'spa',
    plugins: [
      svelte(),
      isBuild ? monkey({
        entry: 'src/main.ts',
        userscript: {
          name: 'Wplace Helper',
          namespace: 'https://github.com/MidTano/wplace_helper',
          version: '2.6.1',
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