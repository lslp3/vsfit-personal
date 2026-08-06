import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || '';

  const runtimeCaching = [];

  if (supabaseUrl) {
    const host = supabaseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    runtimeCaching.push(
      {
        urlPattern: new RegExp(`^https://${host.replace(/\./g, '\\.')}/storage/v1/object/public/.*`, 'i'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'vsfit-public-images',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: new RegExp(`^https://${host.replace(/\./g, '\\.')}/rest/v1/.*`, 'i'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'vsfit-api',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60,
          },
        },
      }
    );
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'icons/vsfit-192.webp',
          'icons/vsfit-512.webp',
          'icons/vsfit-maskable-512.webp',
        ],
        manifest: {
          name: 'VSFit Personal',
          short_name: 'VSFit',
          description:
            'VSFit Personal — gestão completa para personal trainers: treinos, chat, evolução e captação de alunos.',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          lang: 'pt-BR',
          icons: [
            {
              src: 'icons/vsfit-192.webp',
              sizes: '192x192',
              type: 'image/webp',
              purpose: 'any',
            },
            {
              src: 'icons/vsfit-512.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'any',
            },
            {
              src: 'icons/vsfit-maskable-512.webp',
              sizes: '512x512',
              type: 'image/webp',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,webp,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
          navigateFallback: '/index.html',
          runtimeCaching,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/scheduler/')
            ) {
              return 'react';
            }

            if (id.includes('/@supabase/') || id.includes('supabase-js')) {
              return 'supabase';
            }

            if (id.includes('/framer-motion/') || id.includes('/motion-dom/')) {
              return 'motion';
            }

            if (id.includes('/lucide-react/')) {
              return 'icons';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
