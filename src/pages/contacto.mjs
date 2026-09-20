import { icon, esc, ext, mapsUrls } from "../partials/layout.mjs";
import { breadcrumbs } from "../partials/schema.mjs";

export default {
  path: "/contacto/",
  nav: "/contacto/",
  crumb: "Contacto",
  title: "Cómo llegar y contacto · Los Tres Pacos, Portmán",
  description: "Los Tres Pacos: C/ Florencia Florenciano, 5, 30392 Portmán (La Unión, Murcia). Teléfono 968 54 84 98, ruta en Google Maps, Instagram y Facebook.",
  jsonld: (ctx, page) => [breadcrumbs(ctx, page)].filter(Boolean),
  body({ n }) {
    const a = n.address;
    const m = mapsUrls(n);
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">Cómo llegar y contacto</h1><p class="lead">Nos encuentras en Portmán, en el municipio de La Unión (Murcia).</p></div></div>
<section class="section"><div class="wrap split split--even">
  <div class="stack">
    <ul class="rows">
      <li><strong>Dirección</strong><address>${esc(a.street)}<br>${a.postalCode} ${a.locality}, ${a.municipality}</address></li>
      <li><strong>Teléfono</strong><span><a href="tel:${n.phone.tel}">${n.phone.display}</a></span></li>
      <li><strong>Reservas</strong><span class="num">${n.reservations.services.map((s) => `${s.name} ${s.from}–${s.to}`).join("<br>")}</span></li>
      <li><strong>Redes</strong><span><a href="${n.social.instagram}" ${ext}>Instagram</a> · <a href="${n.social.facebook}" ${ext}>Facebook</a></span></li>
    </ul>
    <div class="actions"><a class="btn" href="${m.directions}" ${ext}>${icon("pin")}Cómo llegar</a><a class="btn btn--ghost" href="tel:${n.phone.tel}">${icon("phone")}Llamar</a></div>
  </div>
  <figure class="figure"><img src="/assets/img/fachada.jpg" width="750" height="486" alt="Fachada amarilla de Los Tres Pacos: así reconocerás el local" loading="lazy"><figcaption>Así reconocerás el local.</figcaption></figure>
</div></section>`;
  },
};
