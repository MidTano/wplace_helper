import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    svelte(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Wplace Helper',
        namespace: 'https://github.com/MidTano/wplace_helper',
        version: '0.9.0',
        author: 'MidTano',
        description: 'Overlay and tools for Wplace',
        match: [
          '*://wplace.live/*',
          '*://*.wplace.live/*',
          '*://wplace.*/*',
          '*://*.wplace.*/*',
        ],
        'run-at': 'document-end',
        grant: [
          'GM_xmlhttpRequest',
          'GM_download',
          'GM_setValue', 
          'GM_getValue'
        ],
        connect: [
          'catbox.moe',
          'files.catbox.moe',
        ],
        updateURL: 'https://github.com/MidTano/wplace_helper/releases/latest/download/overlay.user.js',
        downloadURL: 'https://github.com/MidTano/wplace_helper/releases/latest/download/overlay.user.js',
      },
      build: {
        fileName: 'overlay.user.js',
        metaFileName: false,
        externalGlobals: {},
      },
    }),
  ],
  build: {
    target: 'es2018',
  }
});