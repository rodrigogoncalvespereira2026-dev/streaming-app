import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const SW_SOURCE = readFileSync(fileURLToPath(new URL('./src/sw.js', import.meta.url)), 'utf8');

/**
 * Injects the built asset list into the service worker as a precache manifest.
 * The custom cache-first/SWR strategies live in src/sw.js; no Workbox runtime.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'pf-sw-precache',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Vite also emits index.html into the bundle, so dedupe before precaching.
      const assets = [...new Set(Object.keys(bundle))]
        .filter((n) => !n.endsWith('.map'))
        .map((n) => './' + n);
      const precache = [...new Set(['./', './index.html', './manifest.json', ...assets])];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: 'self.__PRECACHE__ = ' + JSON.stringify(precache) + ';\n' + SW_SOURCE,
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    reportCompressedSize: true,
  },
  plugins: [serviceWorkerPlugin()],
});
