import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      basicSsl(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        strategies: "generateSW",
        filename: "sw.js",

        // Manifest — hum apni custom manifest file use karenge
        manifest: false,

        // Offline caching
        workbox: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,mp3,wav,mpeg,json}",
          ],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/_server/],

          runtimeCaching: [
            {
              // Supabase Storage (student photos, tracing captures)
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "supabase-storage",
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase API (read-only GETs)
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api",
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google Fonts
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },

        devOptions: {
          enabled: false, // dev mein off (Vite HMR conflicts)
          type: "module",
        },
      }),
    ],
    server: {
      host: "0.0.0.0",
      port: 8080,
      https: {},
    },
  },
});