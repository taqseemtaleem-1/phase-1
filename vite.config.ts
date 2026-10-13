import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

// ══════════════════════════════════════════════════════════════
//  🔥 GITHUB PAGES BASE PATH
//  Repo: https://github.com/taqseemtaleem-1/phase-1
//  URL:  https://taqseemtaleem-1.github.io/phase-1/
//  👉 Isliye base "/phase-1/" hai
//
//  Custom domain laga do (e.g. taleem.org) → base "/" karo
// ══════════════════════════════════════════════════════════════
const BASE_PATH = "/phase-1/";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  // 🔥 Ye line TanStack Start / Vite dono ko base batati hai
  //    Iske bina GitHub Pages pe PWA nahi chalega
  base: BASE_PATH,

  vite: {
    plugins: [
      // basicSsl sirf dev server ke liye — production build pe skip
      basicSsl(),

      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        strategies: "generateSW",
        filename: "sw.js",

        // Custom manifest use kar rahe ho (public/manifest.webmanifest)
        // Isliye VitePWA ko manifest generate nahi karna
        manifest: false,

        // ─── Workbox (offline caching) ───────────────────────
        workbox: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,mp3,wav,mpeg,json,webmanifest}",
          ],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB

          // 🔥 BASE-AWARE — /phase-1/index.html pe fallback
          //    Pehle ye "/index.html" tha → GitHub Pages pe 404 deta
          navigateFallback: `${BASE_PATH}index.html`,
          navigateFallbackDenylist: [/^\/api/, /^\/_server/],

          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,

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
          enabled: false,
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