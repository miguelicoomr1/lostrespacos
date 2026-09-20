import { icon, esc, ext, mapsUrls } from "../partials/layout.mjs";
import { business } from "../partials/schema.mjs";

export default {
  path: "/",
  nav: "/",
  title: "Los Tres Pacos · Café-bar en Portmán (La Unión, Murcia)",
  description: "Café-bar en Portmán, La Unión (Murcia). Tapas, croquetas, pescados, carnes y ensaladas. Consulta la carta y reserva mesa en el 968 54 84 98.",
  preload: '<link rel="preload" as="image" href="/assets/img/fachada.jpg" fetchpriority="high">',
  jsonld: (ctx) => [business(ctx)],
  body(ctx) {
    const { n, carta } = ctx;
    const m = mapsUrls(n);
    const total = carta.reduce((s, c) => s + c.items.length, 0);
    const a = n.address;
    const services = n.reservations.services.map((s) => `${s.name} ${s.from}–${s.to}`).join(" · ");
    return `
<section class="hero on-saffron" aria-labelledby="h1">
  <div class="hero__copy">
    <h1 id="h1" class="display">Tapas y cocina murciana en Portmán</h1>
    <p class="lead">Café-bar en la calle ${esc(a.street.replace("C/ ", ""))}. Tapas, croquetas, pescados, carnes y ensaladas, con terraza y dos salones.</p>
    <div class="actions">
      <a class="btn" href="/reservas/">${icon("calendar")}Reservar mesa</a>
      <a class="btn btn--ghost" href="/carta/">Ver carta</a>
    </div>
  </div>
  <div class="hero__media"><img src="/assets/img/fachada.jpg" width="750" height="486" alt="Fachada amarilla de Los Tres Pacos en Portmán, con la terraza a la izquierda" fetchpriority="high"></div>
</section>

<section class="facts on-dark" aria-label="Datos prácticos">
  <dl class="facts__grid">
    <div class="fact"><dt>Dónde</dt><dd>${esc(a.street)}<br>${a.postalCode} ${a.locality}, ${a.municipality}<br><a href="${m.directions}" ${ext}>${icon("pin")}Cómo llegar</a></dd></div>
    <div class="fact"><dt>Teléfono</dt><dd><a href="tel:${n.phone.tel}">${icon("phone")}${n.phone.display}</a></dd></div>
    <div class="fact"><dt>Reservas</dt><dd>${esc(services)}</dd></div>
    <div class="fact"><dt>Redes</dt><dd><a href="${n.social.instagram}" ${ext}>${icon("instagram")}Instagram</a> <a href="${n.social.facebook}" ${ext}>${icon("facebook")}Facebook</a></dd></div>
  </dl>
</section>

<section class="section section--sea on-sea" aria-labelledby="carta-h">
  <div class="wrap split">
    <div class="stack">
      <h2 id="carta-h" class="h2">La carta</h2>
      <p class="lead muted">${total} platos con precio, de la tapa al pescado. Todo se puede pedir para compartir.</p>
      <p><a class="btn" href="/carta/">Ver carta completa</a></p>
    </div>
    <ul class="index-list">
      ${carta.map((c) => `<li><a href="/carta/#${c.id}"><span class="h3">${esc(c.name)}</span><small>${c.items.length} platos</small>${icon("arrow")}</a></li>`).join("")}
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="res-h">
  <div class="wrap split">
    <div class="stack">
      <h2 id="res-h" class="h2">Reserva tu mesa</h2>
      <p class="lead">Reservamos por teléfono. Elige zona, día y hora y llámanos para confirmar.</p>
      <ul class="rows">${n.reservations.services.map((s) => `<li><strong>${esc(s.name)}</strong><span class="num">${s.from}–${s.to} · última reserva ${s.lastBooking}</span></li>`).join("")}</ul>
      <div class="actions"><a class="btn" href="/reservas/">Reservar mesa</a><a class="phone-link" href="tel:${n.phone.tel}">${icon("phone")}${n.phone.display}</a></div>
    </div>
    <div class="stack">
      <h3 class="h3">Zonas y aforo</h3>
      <ul class="rows">${n.zones.map((z) => `<li><strong>${esc(z.name)}</strong><span class="num">${z.capacity} comensales</span></li>`).join("")}</ul>
    </div>
  </div>
</section>

<section class="section section--saffron on-saffron" aria-labelledby="loc-h">
  <div class="wrap split split--even">
    <div class="stack">
      <h2 id="loc-h" class="h2">Cómo llegar</h2>
      <address class="lead">${esc(a.street)}<br>${a.postalCode} ${a.locality}, ${a.municipality} (${a.region.replace("Región de ", "")})</address>
    </div>
    <div class="stack">
      <p class="muted">Abre la ruta en Google Maps desde donde estés o llámanos si necesitas indicaciones.</p>
      <div class="actions"><a class="btn" href="${m.directions}" ${ext}>${icon("pin")}Cómo llegar</a><a class="btn btn--ghost" href="/contacto/">Contacto</a></div>
    </div>
  </div>
</section>`;
  },
};
