import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev convenience: proxy API calls so the PWA + API share an origin.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'حفلاتي — تنظيم الحفلات والمناسبات',
        short_name: 'حفلاتي',
        description: 'صمّم حفلتك بكل سهولة — قاعة، تصوير، ديكور، تجميل والمزيد.',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#C9A227',
        background_color: '#FBF6F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/categories') ||
              url.pathname.startsWith('/api/v1/offerings'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'catalog-cache' },
          },
        ],
      },
    }),
  ],
});
