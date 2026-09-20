import { esc } from "../partials/layout.mjs";

const pend = (v, label) => (v ? esc(v) : `<mark>[PENDIENTE: ${label}]</mark>`);

export default {
  path: "/aviso-legal/",
  nav: null,
  noindex: true,
  crumb: "Aviso legal",
  title: "Aviso legal y privacidad · Los Tres Pacos",
  description: "Aviso legal y política de privacidad de la web de Los Tres Pacos.",
  body({ n }) {
    const l = n.legal;
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">Aviso legal y privacidad</h1></div></div>
<section class="section"><div class="wrap prose">
  <h2 class="h3">Titular de la web</h2>
  <p>Nombre o razón social: ${pend(l.holderName, "titular")}<br>NIF/CIF: ${pend(l.taxId, "NIF/CIF")}<br>Domicilio: ${pend(l.registeredAddress, "domicilio del titular")}<br>Correo electrónico: ${pend(l.email, "correo de contacto")}<br>Teléfono: ${n.phone.display}</p>
  <h2 class="h3">Datos personales y cookies</h2>
  <p>Esta web no utiliza cookies ni herramientas de analítica, y no recoge datos personales. El formulario de reservas no envía ni guarda la información introducida: sirve para preparar la solicitud, que se confirma por teléfono.</p>
  <p>Este texto se actualizará cuando se incorporen nuevos servicios, como un sistema de reservas en línea.</p>
</div></section>`;
  },
};
