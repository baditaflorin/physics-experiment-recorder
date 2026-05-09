import { readdirSync, rmSync } from "node:fs";

const generatedPaths = [
  "docs/assets",
  "docs/index.html",
  "docs/404.html",
  "docs/favicon.svg",
  "docs/icons.svg",
  "docs/manifest.webmanifest",
  "docs/registerSW.js",
  "docs/sw.js",
  "docs/sw.js.map",
];

for (const path of generatedPaths) {
  rmSync(path, { recursive: true, force: true });
}

for (const file of readdirSync("docs", { withFileTypes: true })) {
  if (file.isFile() && file.name.startsWith("workbox-")) {
    rmSync(`docs/${file.name}`, { force: true });
  }
}
