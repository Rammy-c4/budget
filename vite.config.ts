import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

function pwaPrecachePlugin(): Plugin {
  return {
    name: 'pwa-precache-generator',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      const assetsDir = path.join(distDir, 'assets');
      const assetFiles: string[] = [];

      if (fs.existsSync(assetsDir)) {
        const scanDir = (dir: string, prefix = 'assets/') => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile()) {
              if (
                entry.name.endsWith('.js') ||
                entry.name.endsWith('.css') ||
                entry.name.endsWith('.svg') ||
                entry.name.endsWith('.png') ||
                entry.name.endsWith('.ico') ||
                entry.name.endsWith('.woff2') ||
                entry.name.endsWith('.woff')
              ) {
                assetFiles.push(`${prefix}${entry.name}`);
              }
            } else if (entry.isDirectory() && entry.name !== 'aistudio') {
              scanDir(path.join(dir, entry.name), `${prefix}${entry.name}/`);
            }
          }
        };
        scanDir(assetsDir);
      }

      // Ensure 404.html exists for GitHub Pages
      const indexHtmlPath = path.join(distDir, 'index.html');
      const notFoundHtmlPath = path.join(distDir, '404.html');
      if (fs.existsSync(indexHtmlPath) && !fs.existsSync(notFoundHtmlPath)) {
        fs.copyFileSync(indexHtmlPath, notFoundHtmlPath);
      }

      const publicAssets = [
        'index.html',
        '404.html',
        'manifest.json',
        'icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ].filter((f) => fs.existsSync(path.join(distDir, f)));

      const fullPrecacheList = Array.from(new Set(['', ...publicAssets, ...assetFiles]));

      // 1. Write precache-manifest.json to dist/
      const manifestPath = path.join(distDir, 'precache-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(fullPrecacheList, null, 2), 'utf-8');

      // 2. Inject into dist/sw.js
      const swDistPath = path.join(distDir, 'sw.js');
      if (fs.existsSync(swDistPath)) {
        let swContent = fs.readFileSync(swDistPath, 'utf-8');
        swContent = swContent.replace(
          /self\.__PRECACHE_MANIFEST__\s*=\s*\[[\s\S]*?\];?/,
          `self.__PRECACHE_MANIFEST__ = ${JSON.stringify(fullPrecacheList)};`
        );
        fs.writeFileSync(swDistPath, swContent, 'utf-8');
      }

      console.log(`[PWA Precache] Manifest generated with ${fullPrecacheList.length} assets:`, fullPrecacheList);
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/budget/',
    plugins: [react(), tailwindcss(), pwaPrecachePlugin()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'motion/react', 'lucide-react', 'canvas-confetti'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
