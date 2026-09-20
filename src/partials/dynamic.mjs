// Partes de página que salen de la base de datos en cada petición (funciones/carta y funciones/reservas)
// y, como respaldo, del JSON estático en el build. Las zonas dinámicas se marcan con comentarios.
// Sin dependencias de Node: lo importan también las Pages Functions.
import { esc } from "./layout.mjs";

export const mark = (name, html) => `<!--dyn:${name}-->${html}<!--/dyn:${name}-->`;
export const fill = (html, parts) =>
  html.replace(/<!--dyn:([\w-]+)-->[\s\S]*?<!--\/dyn:\1-->/g, (all, name) => (name in parts ? mark(name, parts[name]) : all));

/* Carta */
export const cartaChips = (carta) => carta.map((c) => `<li><a href="#${esc(c.id)}">${esc(c.name)}</a></li>`).join("");
export const cartaCats = (carta) =>
  carta
    .map(
      (c) =>
        `<section class="cat" id="${esc(c.id)}" aria-labelledby="${esc(c.id)}-h"><h2 id="${esc(c.id)}-h">${esc(c.name)}</h2><ul>${c.items
          .map(
            (d) =>
              `<li class="dish"><span class="dish__name">${esc(d.name)}</span><span class="dish__price">${esc(d.price)}</span>${d.description ? `<span class="dish__desc">${esc(d.description)}</span>` : ""}</li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("");
export const cartaParts = (carta) => ({ "carta-chips": cartaChips(carta), "carta-cats": cartaCats(carta) });

/* Reservas. h = { durationMinutes, maxPartySize, services[{name,from,to,lastBooking}], slots[], zones[{id,name,capacity,enabled}] } */
export const reservasParts = (h, phone) => {
  const zones = h.zones.filter((z) => z.enabled !== false);
  const slotsOf = (s) => h.slots.filter((t) => t >= s.from && t <= s.lastBooking);
  return {
    "reservas-info": `
    <h2 class="h2">Cómo funciona</h2>
    <ol class="steps">
      <li><p><strong>Elige</strong> personas, día, hora y zona.</p></li>
      <li><p><strong>Envía la solicitud.</strong> Te confirmamos por teléfono, o llámanos al <a href="tel:${esc(phone.tel)}">${esc(phone.display)}</a>.</p></li>
      <li><p><strong>Cuenta con ${h.durationMinutes} minutos</strong> de mesa, la duración prevista de cada reserva.</p></li>
    </ol>
    <ul class="rows">${h.services.map((s) => `<li><strong>${esc(s.name)}</strong><span class="num">${s.from}–${s.to} · última reserva ${s.lastBooking}</span></li>`).join("")}</ul>
    <ul class="rows">${zones.map((z) => `<li><strong>${esc(z.name)}</strong><span class="num">${z.capacity} comensales</span></li>`).join("")}</ul>
    <p class="muted">Para grupos de más de ${h.maxPartySize} personas, llama directamente.</p>`,
    "reservas-people": Array.from({ length: h.maxPartySize }, (_, i) => `<option>${i + 1}</option>`).join(""),
    "reservas-times": h.services
      .filter((s) => slotsOf(s).length)
      .map((s) => `<optgroup label="${esc(s.name)}">${slotsOf(s).map((t) => `<option>${t}</option>`).join("")}</optgroup>`)
      .join(""),
    "reservas-zones": zones.map((z) => `<option value="${esc(z.id)}">${esc(z.name)}</option>`).join(""),
  };
};
