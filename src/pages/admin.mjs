import { icon } from "../partials/layout.mjs";

export default {
  path: "/admin/",
  nav: "/admin/",
  noindex: true,
  noBar: true,
  script: "/assets/js/admin.js",
  title: "Zona privada · Los Tres Pacos",
  description: "Panel de administración de Los Tres Pacos.",
  body() {
    return `
<div class="page-head on-saffron"><div class="wrap"><h1 class="display">Zona privada</h1></div></div>
<section class="section admin"><div class="wrap">
  <form class="form login" data-login hidden novalidate>
    <h2 class="h3">Acceso de administrador</h2>
    <div class="form__grid login__grid">
      <div class="field field--full"><label for="email">Correo</label><input id="email" name="email" type="email" autocomplete="username" required aria-describedby="login-err"></div>
      <div class="field field--full"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required aria-describedby="login-err"></div>
    </div>
    <p class="err" id="login-err" role="alert"></p>
    <button class="btn" type="submit">${icon("lock")}Entrar</button>
  </form>

  <div data-panel hidden>
    <div class="admin__bar">
      <p>Sesión: <strong data-email></strong></p>
      <button class="btn btn--ghost" type="button" data-logout>Cerrar sesión</button>
    </div>
    <div class="tabs" role="tablist" aria-label="Secciones del panel">
      <button role="tab" id="tab-reservas" aria-controls="view" data-tab="reservas">Reservas</button>
      <button role="tab" id="tab-horarios" aria-controls="view" data-tab="horarios">Horarios</button>
      <button role="tab" id="tab-carta" aria-controls="view" data-tab="carta">Carta y precios</button>
      <button role="tab" id="tab-config" aria-controls="view" data-tab="config">Configuración</button>
    </div>
    <p class="admin__status" data-status role="status" aria-live="polite"></p>
    <div id="view" role="tabpanel" tabindex="-1"></div>
  </div>
  <noscript><p class="lead">La zona privada necesita JavaScript.</p></noscript>
</div></section>`;
  },
};
