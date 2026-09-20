import { icon, esc, ext } from "../partials/layout.mjs";
import { breadcrumbs } from "../partials/schema.mjs";

export default {
  path: "/galeria/",
  nav: "/galeria/",
  crumb: "Galería",
  title: "Galería · Los Tres Pacos, Portmán",
  description: "Fotografías del local de Los Tres Pacos en Portmán: la fachada y la terraza.",
  jsonld: (ctx, page) => [breadcrumbs(ctx, page)].filter(Boolean),
  body({ n, galeria }) {
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">El local</h1><p class="lead">Así es Los Tres Pacos por fuera. Más fotos y novedades en Instagram.</p></div></div>
<section class="section"><div class="wrap stack">
  ${galeria.map((g, i) => `<figure class="figure"><img src="${g.src}" width="${g.width}" height="${g.height}" alt="${esc(g.alt)}"${i ? ' loading="lazy"' : ""}><figcaption>${esc(g.caption)}</figcaption></figure>`).join("")}
  <p><a class="btn" href="${n.social.instagram}" ${ext}>${icon("instagram")}Ver más en Instagram</a></p>
</div></section>`;
  },
};
