import { icon } from "../partials/layout.mjs";
import { breadcrumbs } from "../partials/schema.mjs";
import { mark, reservasParts } from "../partials/dynamic.mjs";

export default {
  path: "/reservas/",
  nav: "/reservas/",
  crumb: "Reservas",
  noBar: true,
  title: "Reservar mesa · Los Tres Pacos, Portmán",
  description: "Reserva mesa en Los Tres Pacos (Portmán): salón interior, exterior o terraza. Comidas 13:00–16:00, cenas 19:30–22:30. Confirmación por teléfono.",
  jsonld: (ctx, page) => [breadcrumbs(ctx, page)].filter(Boolean),
  body({ n }) {
    const r = n.reservations;
    const p = reservasParts({ ...r, zones: n.zones }, n.phone);
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">Reservar mesa</h1><p class="lead">Envía tu solicitud y te confirmamos por teléfono. También puedes llamarnos directamente.</p></div></div>
<section class="section"><div class="wrap split">
  <div class="stack">${mark("reservas-info", p["reservas-info"])}</div>
  <div>
    <div data-reservation-fallback class="form stack"><h2 class="h3">Reserva por teléfono</h2><p>Llámanos y te confirmamos mesa.</p><p><a class="btn" href="tel:${n.phone.tel}">${icon("phone")}${n.phone.display}</a></p></div>
    <form class="form" data-reservation-form hidden novalidate autocomplete="off">
      <h2 class="h3">Solicita tu mesa</h2>
      <div class="form__grid">
        <div class="field field--full"><label for="name">Nombre</label><input id="name" name="name" type="text" autocomplete="given-name" maxlength="80" required aria-describedby="name-err"><p class="err" id="name-err" aria-live="polite"></p></div>
        <div class="field field--full"><label for="phone">Teléfono</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" required aria-describedby="phone-err"><p class="err" id="phone-err" aria-live="polite"></p></div>
        <div class="field"><label for="people">Personas</label><select id="people" name="people">${mark("reservas-people", p["reservas-people"])}</select></div>
        <div class="field"><label for="date">Fecha</label><input id="date" name="date" type="date" required aria-describedby="date-err"><p class="err" id="date-err" aria-live="polite"></p></div>
        <div class="field"><label for="time">Hora</label><select id="time" name="time">${mark("reservas-times", p["reservas-times"])}</select></div>
        <div class="field"><label for="zone">Zona</label><select id="zone" name="zone">${mark("reservas-zones", p["reservas-zones"])}</select></div>
        <div class="field field--full"><label for="notes">Comentarios (opcional)</label><input id="notes" name="notes" type="text" maxlength="300"></div>
        <div class="sr-only" aria-hidden="true"><label for="website">No rellenar</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      </div>
      <button class="btn" type="submit">Enviar solicitud</button>
      <div class="summary" data-summary hidden role="status"><p data-summary-title></p><p data-summary-text></p><a class="btn" href="tel:${n.phone.tel}">${icon("phone")}Llamar · ${n.phone.display}</a><p class="note" data-summary-note></p></div>
    </form>
  </div>
</div></section>`;
  },
};
