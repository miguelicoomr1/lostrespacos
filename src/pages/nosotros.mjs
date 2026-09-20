import { icon } from "../partials/layout.mjs";
import { breadcrumbs } from "../partials/schema.mjs";

export default {
  path: "/nosotros/",
  nav: "/nosotros/",
  crumb: "Nosotros",
  title: "Nosotros · Los Tres Pacos, café-bar en Portmán",
  description: "Los Tres Pacos es un café-bar de Portmán, en La Unión (Murcia): cocina tradicional murciana, productos frescos y servicio cercano.",
  jsonld: (ctx, page) => [breadcrumbs(ctx, page)].filter(Boolean),
  body({ n }) {
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">Cocina de Portmán para compartir</h1><p class="lead">Los Tres Pacos es un café-bar de Portmán, en el municipio de La Unión. Su propuesta se apoya en cocina tradicional murciana, productos frescos y un servicio cercano.</p></div></div>
<section class="section"><div class="wrap split split--even">
  <figure class="figure"><img src="/assets/img/fachada.jpg" width="750" height="486" alt="Fachada amarilla de Los Tres Pacos en Portmán" loading="lazy"><figcaption>La fachada, en ${n.address.street}</figcaption></figure>
  <div class="stack"><h2 class="h2">La casa</h2>
    <ul class="rows">
      <li><strong>Arroces</strong><span>Entre ellos, el arroz con pulpo.</span></li>
      <li><strong>Pescados y mariscos</strong><span>Sabores de la costa y del Mar Menor.</span></li>
      <li><strong>Tapas murcianas</strong><span>Calamares, michirones y opciones para compartir.</span></li>
    </ul>
    <div class="actions"><a class="btn" href="/carta/">Ver carta</a><a class="btn btn--ghost" href="/reservas/">${icon("calendar")}Reservar mesa</a></div>
  </div>
</div></section>`;
  },
};
