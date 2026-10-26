import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = JSON.parse(fs.readFileSync(path.join(root, "data/site.json"), "utf8"));
const basePath = new URL(site.url).pathname.replace(/\/$/, "");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFile(urlPath) {
  let pathname = decodeURIComponent(urlPath.split("?")[0]);
  if (basePath && pathname === basePath) pathname = `${basePath}/`;
  if (basePath && pathname !== `${basePath}/` && !pathname.startsWith(`${basePath}/`)) {
    return { redirect: `${basePath}/` };
  }
  let rel = basePath ? pathname.slice(basePath.length) : pathname;
  rel = rel.replace(/^\/+/, "");
  if (rel === "") rel = "index.html";
  else if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(dist, rel);
  const rootDir = path.resolve(dist);
  if (file !== rootDir && !file.startsWith(`${rootDir}${path.sep}`)) return { status: 400 };
  return { file };
}

const server = http.createServer((request, response) => {
  const target = resolveFile(request.url || "/");
  if (target.redirect) {
    response.writeHead(302, { Location: target.redirect });
    response.end();
    return;
  }
  let file = target.file;
  let status = target.status || 200;
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = path.join(dist, "404.html");
    status = target.status || 404;
  }
  const body = fs.readFileSync(file);
  response.writeHead(status, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  response.end(body);
});

server.listen(port, "127.0.0.1", () => {
  const host = basePath ? `http://127.0.0.1:${port}${basePath}/` : `http://127.0.0.1:${port}/`;
  console.log(host);
});
