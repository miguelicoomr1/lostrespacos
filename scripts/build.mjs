// Genera dist/ a partir de src/. Sin dependencias: `node scripts/build.mjs`.
// SITE_URL (p. ej. https://www.midominio.es) activa canonical, Open Graph, sitemap e indexación.
// Sin SITE_URL la web se marca noindex, para que un entorno de pruebas no acabe en Google.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { layout } from "../src/partials/layout.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");
const read = (p) => JSON.parse(readFileSync(join(src, "data", p), "utf8"));

const siteUrl = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
if (siteUrl && !/^https:\/\/[^/\s]+$/.test(siteUrl)) throw new Error(`SITE_URL no válido: ${siteUrl}`);
const ctx = { n: read("negocio.json"), carta: read("carta.json"), galeria: read("galeria.json"), site: { url: siteUrl } };

// Valores iniciales del panel (functions/_lib/defaults.gen.js), derivados de src/data. Se regenera en cada build.
{
  const n = ctx.n;
  const defaults = {
    reservas: [],
    carta: ctx.carta,
    horarios: {
      durationMinutes: n.reservations.durationMinutes,
      maxPartySize: n.reservations.maxPartySize,
      services: n.reservations.services,
      slots: n.reservations.slots,
      zones: n.zones.map((z) => ({ ...z, enabled: true })),
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, closed: false, open1: "", close1: "", open2: "", close2: "" })),
      closedDates: [],
    },
  };
  writeFileSync(join(root, "functions", "_lib", "defaults.gen.js"), `// Generado por scripts/build.mjs. No editar.\nexport default ${JSON.stringify(defaults, null, 1)};\n`);
}

// Datos públicos que necesitan las funciones (teléfono de contacto en /reservas/).
writeFileSync(join(root, "functions", "_lib", "negocio.gen.js"), `// Generado por scripts/build.mjs. No editar.
export default ${JSON.stringify({ name: ctx.n.name, phone: ctx.n.phone }, null, 1)};
`);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Activos: css y js con hash en el nombre (caché larga); fuentes e imágenes tal cual.
cpSync(join(src, "assets", "fonts"), join(dist, "assets", "fonts"), { recursive: true });
cpSync(join(src, "assets", "img"), join(dist, "assets", "img"), { recursive: true });
const hashed = {};
for (const [dir, file] of [["css", "site.css"], ...readdirSync(join(src, "assets", "js")).map((f) => ["js", f])]) {
  const body = readFileSync(join(src, "assets", dir, file));
  const name = file.replace(/\.(\w+)$/, `.${createHash("md5").update(body).digest("hex").slice(0, 8)}.$1`);
  mkdirSync(join(dist, "assets", dir), { recursive: true });
  writeFileSync(join(dist, "assets", dir, name), body);
  hashed[`/assets/${dir}/${file}`] = `/assets/${dir}/${name}`;
}
const rewrite = (html) => Object.entries(hashed).reduce((h, [from, to]) => h.replaceAll(from, to), html);

// Archivos estáticos de raíz (favicon, _headers, _redirects…).
cpSync(join(src, "static"), dist, { recursive: true });

// Páginas.
const pages = [];
for (const f of readdirSync(join(src, "pages")).filter((f) => f.endsWith(".mjs"))) {
  const page = (await import(pathToFileURL(join(src, "pages", f)).href)).default;
  page.jsonld = typeof page.jsonld === "function" ? page.jsonld(ctx, page) : page.jsonld;
  const html = rewrite(layout(ctx, page, page.body(ctx)));
  const out = page.file ? join(dist, page.file) : join(dist, page.path, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  pages.push(page);
}

// robots, sitemap, manifest.
const indexable = pages.filter((p) => !p.noindex);
writeFileSync(
  join(dist, "robots.txt"),
  siteUrl
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n",
);
if (siteUrl) {
  writeFileSync(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `  <url><loc>${siteUrl}${p.path}</loc></url>`).join("\n")}\n</urlset>\n`,
  );
}
writeFileSync(
  join(dist, "manifest.webmanifest"),
  JSON.stringify({
    name: ctx.n.name,
    short_name: "Los Tres Pacos",
    lang: "es",
    start_url: "/",
    display: "browser",
    theme_color: "#000000",
    background_color: "#000000",
    icons: [
      { src: "/assets/img/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/img/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }),
);

console.log(`dist/ listo: ${pages.length} páginas${siteUrl ? ` · SITE_URL=${siteUrl}` : ""}`);
if (!siteUrl) console.warn("AVISO: SITE_URL sin definir. Web en modo noindex, sin canonical, Open Graph ni sitemap.");
const l = ctx.n.legal;
if (Object.values(l).some((v) => !v)) console.warn("AVISO: faltan datos del titular en src/data/negocio.json (legal).");
if (!ctx.n.openingHours) console.warn("AVISO: sin horario de apertura (openingHours) en negocio.json; no se publica.");
if (!ctx.n.geo) console.warn("AVISO: sin coordenadas (geo) en negocio.json; no se publican.");
