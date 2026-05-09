import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "docs");
const port = Number(process.argv[3] ?? 4175);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  let filePath = join(root, safePath);
  if (safePath === "/" || safePath === "/physics-experiment-recorder/") {
    filePath = join(root, "index.html");
  } else if (safePath.startsWith("/physics-experiment-recorder/")) {
    filePath = join(
      root,
      safePath.replace("/physics-experiment-recorder/", ""),
    );
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, "404.html");
  }
  response.setHeader(
    "Content-Type",
    types[extname(filePath)] ?? "application/octet-stream",
  );
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Static server listening on http://127.0.0.1:${port}\n`);
});
