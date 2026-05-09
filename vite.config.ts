import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf8"),
) as { version: string };

function gitValue(command: string, fallback: string) {
  try {
    return execSync(command, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const commit = gitValue("git rev-parse --short HEAD", "dev");

export default defineConfig({
  base: "/physics-experiment-recorder/",
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_COMMIT__: JSON.stringify(commit),
  },
  build: {
    outDir: "docs",
    emptyOutDir: false,
    sourcemap: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Physics Experiment Recorder",
        short_name: "Physics Recorder",
        description:
          "Extract motion data from tagged experiment videos and fit physics models in the browser.",
        theme_color: "#f7faf7",
        background_color: "#f7faf7",
        display: "standalone",
        scope: "/physics-experiment-recorder/",
        start_url: "/physics-experiment-recorder/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/physics-experiment-recorder/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["**/tracker.worker-*.js", "**/*.map"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "science-cdn",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
});
