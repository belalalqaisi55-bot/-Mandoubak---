import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'app-logo.jpg',
          'app-logo.png',
          'icons/pwa-192x192.png',
          'icons/pwa-512x512.png',
          'icons/pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'مندوبك الطبي | Mandoubak Med',
          short_name: 'مندوبك الطبي',
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
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'طلب دواء جديد',
              short_name: 'طلب دواء',
              description: 'إنشاء طلبية أدوية جديدة للمندوب',
              url: '/?action=new-order',
              icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'كتالوج الأدوية',
              short_name: 'الكتالوج',
              description: 'استعراض قائمة الأدوية والأسعار والعروض',
              url: '/?action=catalog',
              icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'طلبياتي',
              short_name: 'الطلبيات',
              description: 'متابعة وتتبع حالة الطلبيات الحالية',
              url: '/?action=my-orders',
              icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
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
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'motion/react',
        'recharts',
        '@vis.gl/react-google-maps',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'firebase/remote-config',
        'firebase/app-check',
        'html5-qrcode',
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 1. Firebase SDK (all modular packages unified to prevent container/service cycle; size is ~634 kB, well below 800 kB)
              if (id.includes('firebase') || id.includes('node_modules/idb')) {
                return 'vendor-firebase';
              }

              // 2. Core React framework & runtime utilities:
              // Consolidated (react, react-dom, scheduler, use-sync-external-store, object-assign, loose-envify, react-is)
              // to eliminate circular chunk between vendor-libs and vendor-react
              if (
                /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store|object-assign|loose-envify|react-is)[\\/]/.test(
                  id
                )
              ) {
                return 'vendor-react';
              }

              // 3. UI Icons
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }

              // 4. Data Visualization & Charts (Recharts + D3)
              if (
                id.includes('recharts') ||
                id.includes('d3-') ||
                id.includes('/d3-') ||
                id.includes('victory') ||
                id.includes('decimal.js')
              ) {
                return 'vendor-charts';
              }

              // 5. Google Maps Platform SDK
              if (
                id.includes('@vis.gl') ||
                id.includes('google-maps') ||
                id.includes('@googlemaps')
              ) {
                return 'vendor-maps';
              }

              // 6. Animation Engine
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }

              // 7. QR Scanner
              if (id.includes('html5-qrcode')) {
                return 'vendor-qrcode';
              }

              // 8. Google GenAI
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }

              // 9. Supabase
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }

              // 10. Capacitor / Mobile native bridges
              if (id.includes('@capacitor')) {
                return 'vendor-capacitor';
              }

              // 11. Remaining third-party utilities - isolated without circular ties to vendor-react
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
