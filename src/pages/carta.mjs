import { breadcrumbs } from "../partials/schema.mjs";
import { cartaChips, cartaCats, mark } from "../partials/dynamic.mjs";

export default {
  path: "/carta/",
  nav: "/carta/",
  crumb: "Carta",
  title: "Carta y precios · Los Tres Pacos, Portmán",
  description: "Carta de Los Tres Pacos en Portmán: tapas, croquetas, platos para picar, pescados, carnes y ensaladas, con precios.",
  jsonld: (ctx, page) => [breadcrumbs(ctx, page)].filter(Boolean),
  body({ carta }) {
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">Carta y precios</h1><p class="lead">Precios según la carta facilitada por el establecimiento. Consulta la disponibilidad en sala.</p></div></div>
<nav class="chips on-dark" aria-label="Categorías de la carta"><ul>${mark("carta-chips", cartaChips(carta))}</ul></nav>
<div class="board on-dark"><div class="wrap"><div class="board__grid">${mark("carta-cats", cartaCats(carta))}</div></div></div>`;
  },
};
