// Plantilla común: <head>, cabecera, pie y barra de acción móvil.
// Cada página exporta { path, title, description, ... , body(ctx) } y build.mjs la envuelve aquí.

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const paths = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
  facebook: '<path d="M14 21v-8h3l.5-3.5H14V7.3c0-1 .4-1.8 1.9-1.8h1.7V2.4A20 20 0 0 0 15.1 2C12.5 2 10.5 3.6 10.5 6.6v2.9H7.5V13h3v8"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
export const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;

export const nav = [
  ["/carta/", "Carta"],
  ["/reservas/", "Reservar"],
  ["/nosotros/", "Nosotros"],
  ["/galeria/", "Galería"],
  ["/contacto/", "Contacto"],
];

export const adminNav = ["/admin/", "Zona privada"];

export function mapsUrls(n) {
  const q = encodeURIComponent(n.mapsQuery);
  return {
    view: `https://www.google.com/maps/search/?api=1&query=${q}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  };
}

const externalAttrs = 'target="_blank" rel="noopener noreferrer"';
export const ext = externalAttrs;

function head(ctx, page) {
  const { site, n } = ctx;
  const title = page.title;
  const abs = (p) => (site.url ? site.url + p : null);
  const canonical = page.noindex ? null : abs(page.path);
  const robots = page.noindex || !site.url ? '<meta name="robots" content="noindex,nofollow">' : "";
  const ogImage = abs("/assets/img/og.jpg");
  const og = site.url && !page.noindex
    ? `<meta property="og:type" content="website"><meta property="og:locale" content="es_ES"><meta property="og:site_name" content="${esc(n.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ogImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Fachada de Los Tres Pacos en Portmán"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(page.description)}"><meta name="twitter:image" content="${ogImage}">`
    : "";
  const ld = (page.jsonld || []).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("");
  return `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(page.description)}">${robots}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}<meta name="theme-color" content="#000000"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/assets/img/icon-192.png" sizes="192x192" type="image/png"><link rel="apple-touch-icon" href="/assets/img/icon-180.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="preload" href="/assets/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/barlow-400.woff2" as="font" type="font/woff2" crossorigin>${page.preload || ""}<link rel="stylesheet" href="/assets/css/site.css">${og}${ld}</head>`;
}

function header(ctx, page) {
  const { n } = ctx;
  const cur = (href) => (page.nav === href ? ' aria-current="page"' : "");
  const adminLi = `<li><a class="nav-admin" href="${adminNav[0]}"${cur(adminNav[0])}>${icon("lock")}${adminNav[1]}</a></li>`;
  const desktop = nav.map(([href, label]) => `<li><a href="${href}"${cur(href)}${href === "/reservas/" ? ' class="nav-cta"' : ""}>${label}</a></li>`).join("") + adminLi;
  const mobile = nav.map(([href, label]) => `<a href="${href}"${cur(href)}>${label === "Reservar" ? "Reservar mesa" : label}${icon("arrow")}</a>`).join("");
  const mobileAdmin = `<a href="${adminNav[0]}"${cur(adminNav[0])}>${adminNav[1]}${icon("lock")}</a>`;
  const m = mapsUrls(n);
  return `<header class="site-header"><div class="site-header__inner"><a class="brand" href="/" aria-label="${esc(n.name)}, ir al inicio"><img src="/assets/img/logo-112.jpg" width="112" height="112" alt="Los Tres Pacos, café-bar"></a>
<nav class="nav-main" aria-label="Principal"><ul class="nav-list">${desktop}</ul></nav>
<a class="header-phone" href="tel:${n.phone.tel}">${icon("phone")}<span>${n.phone.display}</span></a>
<details class="menu"><summary aria-label="Menú">Menú ${icon("menu", "icon-open")}${icon("close", "icon-close")}</summary><nav class="menu__panel" aria-label="Principal">${mobile}${mobileAdmin}<div class="menu__meta"><a href="tel:${n.phone.tel}">${icon("phone")}Llamar · ${n.phone.display}</a><a href="${m.directions}" ${ext}>${icon("pin")}${esc(n.address.street)}, ${n.address.locality}</a></div></nav></details></div></header>`;
}

function footer(ctx) {
  const { n } = ctx;
  const a = n.address;
  const m = mapsUrls(n);
  return `<footer class="site-footer"><div class="wrap"><div class="footer__grid">
<div class="footer__brand"><img src="/assets/img/logo-256.jpg" width="256" height="256" alt="" loading="lazy"><p>${esc(n.name)}<br><span class="muted on-dark">${esc(n.tagline)}</span></p></div>
<div><h2>Dónde</h2><address><a href="${m.view}" ${ext}>${esc(a.street)}<br>${a.postalCode} ${a.locality}, ${a.municipality}</a><br><a href="tel:${n.phone.tel}">${icon("phone")}${n.phone.display}</a></address></div>
<div><h2>Web</h2><ul>${nav.map(([h, l]) => `<li><a href="${h}">${l === "Reservar" ? "Reservas" : l}</a></li>`).join("")}</ul></div>
<div><h2>Redes</h2><ul><li><a href="${n.social.instagram}" ${ext}>${icon("instagram")}Instagram</a></li><li><a href="${n.social.facebook}" ${ext}>${icon("facebook")}Facebook</a></li></ul></div>
</div><div class="footer__legal"><span>© ${new Date().getFullYear()} ${esc(n.name)}</span><a href="/aviso-legal/">Aviso legal y privacidad</a><span>Diseño y desarrollo: <a href="${n.credit.url}" ${ext}>${esc(n.credit.name)}</a></span></div></div></footer>`;
}

function actionBar(ctx) {
  const { n } = ctx;
  return `<nav class="action-bar" aria-label="Acciones rápidas"><a href="tel:${n.phone.tel}">${icon("phone")}Llamar</a><a href="${mapsUrls(n).directions}" ${ext}>${icon("pin")}Cómo llegar</a><a href="/reservas/">${icon("calendar")}Reservar</a></nav>`;
}

export function layout(ctx, page, body) {
  const bar = page.noBar ? "" : actionBar(ctx);
  return `<!doctype html><html lang="es">${head(ctx, page)}<body class="${bar ? "has-bar" : ""}"><a class="skip" href="#contenido">Saltar al contenido</a>${header(ctx, page)}<main id="contenido">${body}</main>${footer(ctx)}${bar}<script src="/assets/js/site.js" defer></script>${page.script ? `<script src="${page.script}" defer></script>` : ""}</body></html>`;
}
