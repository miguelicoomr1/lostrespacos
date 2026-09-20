// Servidor local sobre dist/ con URLs limpias: `node scripts/dev.mjs [puerto]` (ejecuta antes el build).
// Emula Cloudflare Pages Functions: /api/admin/<x> -> functions/api/admin/<x>.js (onRequestGet/onRequestPost),
// con las variables de .dev.vars (archivo local, fuera de git).
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.argv[2]) || 4173;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };

const varsFile = join(root, ".dev.vars");
const vars = {};
if (existsSync(varsFile)) {
  for (const line of readFileSync(varsFile, "utf8").split("\n")) {
    const l = line.replace(/\r$/, "");
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#")) vars[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
}

// Emulación local del KV de Cloudflare (`env.STORE`): un archivo JSON por clave en .dev-data/ (fuera de git).
const dataDir = join(root, ".dev-data");
const fileOf = (key) => join(dataDir, `${encodeURIComponent(key)}.json`);
vars.STORE = {
  async get(key, type) {
    if (!existsSync(fileOf(key))) return null;
    const text = readFileSync(fileOf(key), "utf8");
    return type === "json" ? JSON.parse(text) : text;
  },
  async put(key, value) {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(fileOf(key), value);
  },
};

// Emulación local de env.ASSETS: sirve archivos de dist/ (con URLs limpias).
vars.ASSETS = {
  async fetch(input) {
    const p = new URL(typeof input === "string" ? input : input.url).pathname;
    let f = normalize(join(dist, decodeURIComponent(p)));
    if (f.startsWith(dist) && existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!f.startsWith(dist) || !existsSync(f)) return new Response("No encontrado", { status: 404 });
    return new Response(readFileSync(f), { headers: { "content-type": types[extname(f)] || "application/octet-stream" } });
  },
};

async function runFunction(req, res, url) {
  const base = url.pathname.replace(/\/+$/, "").slice(1);
  const file = [join(root, "functions", `${base}.js`), join(root, "functions", base, "index.js")].find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) return false;
  const mod = await import(pathToFileURL(file).href);
  const handler = mod[`onRequest${req.method[0]}${req.method.slice(1).toLowerCase()}`];
  if (!handler) { res.writeHead(405).end(); return true; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await handler({ request, env: vars });
  res.writeHead(out.status, Object.fromEntries(out.headers)).end(Buffer.from(await out.arrayBuffer()));
  return true;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if ((url.pathname.startsWith("/api/") || /^\/(carta|reservas)\/?$/.test(url.pathname)) && (await runFunction(req, res, url))) return;
    let file = normalize(join(dist, decodeURIComponent(url.pathname)));
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404, { "content-type": types[".html"] }).end(readFileSync(join(dist, "404.html"))); return; }
    const buf = readFileSync(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "content-length": buf.length }).end(buf);
  } catch (e) {
    console.error(e);
    res.writeHead(500).end("Error");
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
