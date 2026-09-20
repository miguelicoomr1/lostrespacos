// Auditoría estática de dist/: enlaces, recursos, anclas, encabezados, alt, JSON-LD, metadatos. `node scripts/check.mjs`
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dist);
const htmls = files.filter((f) => f.endsWith(".html"));
const errors = [];
const warn = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);

const idsOf = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const pageHtml = new Map(htmls.map((f) => [f, readFileSync(f, "utf8")]));
const rel = (f) => f.slice(dist.length).replace(/\\/g, "/");

function resolveInternal(href) {
  let p = href.split("#")[0].split("?")[0];
  if (!p) return null;
  let f = join(dist, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  return existsSync(f) ? f : undefined;
}

for (const [file, html] of pageHtml) {
  const name = rel(file);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!title) err(name, "sin <title>");
  else if (title.length > 65) warn.push(`${name}: title largo (${title.length})`);
  if (!desc) err(name, "sin meta description");
  else if (desc.length > 170) warn.push(`${name}: description larga (${desc.length})`);
  if (!/<html lang="es"/.test(html)) err(name, "falta lang=es");

  const h = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (h.filter((x) => x === 1).length !== 1) err(name, `debe haber un solo h1 (hay ${h.filter((x) => x === 1).length})`);
  h.forEach((lvl, i) => i && lvl > h[i - 1] + 1 && err(name, `salto de encabezado h${h[i - 1]} → h${lvl}`));

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) err(name, `img sin alt: ${m[0].slice(0, 60)}`);
    if (!/\swidth="/.test(m[0]) || !/\sheight="/.test(m[0])) err(name, `img sin width/height: ${m[0].slice(0, 60)}`);
  }
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(m[0])) err(name, "target=_blank sin noopener");

  const ids = idsOf(html);
  if (new Set(ids).size !== ids.length) err(name, "ids duplicados");
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    if (url.startsWith("#")) { if (!ids.includes(url.slice(1))) err(name, `ancla rota ${url}`); continue; }
    const target = resolveInternal(url);
    if (!target) { err(name, `enlace/recurso roto ${url}`); continue; }
    const hash = url.split("#")[1];
    if (hash && target.endsWith(".html") && !idsOf(pageHtml.get(target)).includes(hash)) err(name, `ancla rota ${url}`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { err(name, `JSON-LD inválido: ${e.message}`); }
  }
  if (/\sstyle="/.test(html)) err(name, "style inline (bloqueado por la CSP)");
  if (/<script(?![^>]*(src=|application\/ld\+json))/.test(html)) err(name, "script inline (bloqueado por la CSP)");
  if (!/<link rel="canonical"/.test(html) && !/noindex/.test(html)) err(name, "página indexable sin canonical");
}

// CSS: fuentes y url() referenciados.
for (const f of files.filter((f) => f.endsWith(".css"))) {
  for (const m of readFileSync(f, "utf8").matchAll(/url\(([^)]+)\)/g)) {
    const u = m[1].replace(/["']/g, "");
    if (u.startsWith("data:") || u.startsWith("#")) continue;
    if (!resolveInternal(u)) err(rel(f), `url() roto ${u}`);
  }
}

console.log(`${htmls.length} páginas, ${files.length} archivos en dist/`);
warn.forEach((w) => console.log("aviso:", w));
if (errors.length) { console.error(errors.map((e) => "ERROR " + e).join("\n")); process.exit(1); }
console.log("check OK");
