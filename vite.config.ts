import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        // Tell vite-plugin-pwa which workbox modules the SW imports
        injectManifest: {
          injectionPoint: 'self.__WB_MANIFEST',
        },
        manifest: {
          name: 'Apni Dukan',
          short_name: 'Apni Dukan',
          description: 'Digital pre-order app for village retail',
          theme_color: '#06833E',
          background_color: '#F7F9FB',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              // maskable lets Android use adaptive icons
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    // ❌ REMOVED: define block that was leaking GEMINI_API_KEY into the bundle
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});