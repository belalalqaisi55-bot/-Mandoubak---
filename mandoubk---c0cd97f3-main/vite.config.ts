import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'app-logo.jpg'],
        manifest: {
          name: 'مندوبك الطبي | Mandoubak Med',
          short_name: 'مندوبك',
          description: 'منظومة المندوب الطبي وإدارة طلبيات الأدوية والمخزون الصيدلاني',
          theme_color: '#0f766e',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'ar',
          dir: 'rtl',
          scope: '/',
          start_url: '/',
          categories: ['medical', 'business', 'shopping'],
          icons: [
            {
              src: '/app-logo.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: '/app-logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable',
            },
          ],
          shortcuts: [
            {
              name: 'طلب دواء جديد',
              short_name: 'طلب دواء',
              description: 'إنشاء طلبية أدوية جديدة للمندوب',
              url: '/?action=new-order',
              icons: [{ src: '/app-logo.jpg', sizes: '192x192' }],
            },
            {
              name: 'كتالوج الأدوية',
              short_name: 'الكتالوج',
              description: 'استعراض قائمة الأدوية والأسعار والعروض',
              url: '/?action=catalog',
              icons: [{ src: '/app-logo.jpg', sizes: '192x192' }],
            },
            {
              name: 'طلبياتي',
              short_name: 'الطلبيات',
              description: 'متابعة وتتبع حالة الطلبيات الحالية',
              url: '/?action=my-orders',
              icons: [{ src: '/app-logo.jpg', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('motion')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('html5-qrcode') || id.includes('qrcode')) {
                return 'vendor-qrcode';
              }
              if (id.includes('canvas-confetti')) {
                return 'vendor-effects';
              }
              return 'vendor-libs';
            }
          },
        },
      },
      chunkSizeWarningLimit: 800,
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
