import { icon } from "../partials/layout.mjs";

export default {
  path: "/404.html",
  file: "404.html",
  nav: null,
  noindex: true,
  title: "Página no encontrada · Los Tres Pacos",
  description: "La página que buscas no existe.",
  body() {
    return `<section class="lost on-saffron"><div class="wrap stack"><h1 class="display">No encontramos esa página</h1><p class="lead">Puede que el enlace haya cambiado. Prueba con la carta o reserva mesa.</p><div class="actions"><a class="btn" href="/carta/">Ver carta</a><a class="btn btn--ghost" href="/reservas/">${icon("calendar")}Reservar mesa</a><a class="phone-link" href="/">Ir al inicio</a></div></div></section>`;
  },
};
