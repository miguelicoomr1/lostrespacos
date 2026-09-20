/* Zona privada: acceso y panel (reservas, horarios y aforo, carta y precios).
   Toda la verificación y validación real ocurre en el servidor (functions/api/admin). */
(() => {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const api = (path, options) => fetch(`/api/admin/${path}`, { credentials: "same-origin", ...options });
  const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]; // day 0 = lunes
  const STATUS = { pending: "Pendiente", confirmed: "Confirmada", cancelled: "Cancelada" };
  const pad = (n) => String(n).padStart(2, "0");
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const shiftDay = (iso, delta) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + delta); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const longDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "categoria";

  const loginForm = $("[data-login]");
  const panel = $("[data-panel]");
  const view = $("#view");
  const statusEl = $("[data-status]");
  const state = { docs: {}, dirty: {}, at: {}, tab: "reservas", date: todayISO(), filter: "all", showForm: false, google: null, calendars: null, pickCalendar: false };
  // Resultado de la vuelta de Google (?google=…): se lee una vez y se quita de la URL.
  let googleReturn = new URLSearchParams(location.search).get("google");
  if (googleReturn) history.replaceState(null, "", `${location.pathname}#config`);

  /* ---------- Acceso ---------- */
  const say = (msg, isError = false) => { statusEl.textContent = msg; statusEl.classList.toggle("is-error", isError); };

  function showPanel(email) {
    loginForm.hidden = !!email;
    panel.hidden = !email;
    if (email) { $("[data-email]", panel).textContent = email; openTab(location.hash.slice(1) || state.tab); }
    else loginForm.elements.email.focus({ preventScroll: true });
  }

  api("session").then((r) => (r.ok ? r.json() : null)).then((s) => showPanel(s && s.email), () => showPanel(null));

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const err = $("#login-err");
    err.textContent = "";
    const email = loginForm.elements.email.value.trim();
    const password = loginForm.elements.password.value;
    if (!email || !password) { err.textContent = "Escribe el correo y la contraseña."; return; }
    const button = $("button", loginForm);
    button.disabled = true;
    try {
      const r = await api("login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { err.textContent = data.error || "No se pudo iniciar sesión."; return; }
      loginForm.reset();
      showPanel(email.toLowerCase());
    } catch {
      err.textContent = "Sin conexión con el servidor. Inténtalo de nuevo.";
    } finally {
      button.disabled = false;
    }
  });

  $("[data-logout]", panel).addEventListener("click", async () => {
    if (Object.values(state.dirty).some(Boolean) && !confirm("Hay cambios sin guardar. ¿Cerrar sesión igualmente?")) return;
    await api("logout", { method: "POST" }).catch(() => {});
    state.docs = {}; state.dirty = {}; state.at = {}; state.google = null; state.calendars = null;
    showPanel(null);
  });

  /* ---------- Datos ---------- */
  async function load(doc, force = false) {
    if (state.docs[doc] && !force) return state.docs[doc];
    const r = await api(`data?doc=${doc}`);
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) { showPanel(null); throw new Error("La sesión ha caducado."); }
    if (!r.ok) throw new Error(body.error || "No se pudieron cargar los datos.");
    state.dirty[doc] = false;
    state.at[doc] = body.at;
    return (state.docs[doc] = body.data);
  }

  async function save(doc) {
    say("Guardando…");
    const r = await api(`data?doc=${doc}${state.at[doc] ? `&at=${encodeURIComponent(state.at[doc])}` : ""}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state.docs[doc]) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { say(body.error || "No se pudo guardar.", true); return false; }
    state.docs[doc] = body.data;
    state.dirty[doc] = false;
    say(`Guardado · ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`);
    return true;
  }

  const setPath = (obj, path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = value;
  };

  /* ---------- Pestañas ---------- */
  async function openTab(tab) {
    if (!["reservas", "horarios", "carta", "config"].includes(tab)) tab = "reservas";
    state.tab = tab;
    history.replaceState(null, "", `#${tab}`);
    panel.querySelectorAll("[data-tab]").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    view.setAttribute("aria-labelledby", `tab-${tab}`);
    view.innerHTML = '<p class="muted">Cargando…</p>';
    try {
      if (tab === "config") { await loadGoogle(); if (state.tab !== "config") return; }
      else await Promise.all(tab === "reservas" ? [load("reservas"), load("horarios")] : [load(tab)]);
      say("");
      render();
    } catch (e) {
      view.innerHTML = `<p class="err">${esc(e.message)}</p>`;
      say("");
    }
  }

  panel.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) openTab(b.dataset.tab);
  });
  panel.querySelector(".tabs").addEventListener("keydown", (e) => {
    const tabs = [...panel.querySelectorAll("[data-tab]")];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0 || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    openTab(next.dataset.tab);
  });

  let uid = 0;
  // Asocia cada etiqueta sin `for` con el control que la acompaña dentro de .field.
  const linkLabels = () => view.querySelectorAll(".field").forEach((f) => {
    const label = f.querySelector("label:not([for])"), control = f.querySelector("input,select");
    if (!label || !control) return;
    control.id = control.id || `c${++uid}`;
    label.htmlFor = control.id;
  });
  const render = () => { ({ reservas: renderReservas, horarios: renderHorarios, carta: renderCarta, config: renderConfig })[state.tab](); linkLabels(); };

  /* ---------- Reservas ---------- */
  const serviceOf = (h, t) => h.services.find((s) => t >= s.from && t <= s.to);
  const zoneName = (h, id) => h.zones.find((z) => z.id === id)?.name || id;

  function occupancy(h, list, date) {
    const live = list.filter((r) => r.date === date && r.status !== "cancelled");
    return h.services.map((s) => ({
      name: s.name,
      zones: h.zones.filter((z) => z.enabled).map((z) => ({
        name: z.name, capacity: z.capacity,
        used: live.filter((r) => r.zone === z.id && r.time >= s.from && r.time <= s.to).reduce((n, r) => n + r.people, 0),
      })),
    }));
  }

  function renderReservas() {
    const h = state.docs.horarios;
    const all = state.docs.reservas;
    const closed = h.closedDates.find((c) => c.date === state.date);
    const day = all.filter((r) => r.date === state.date && (state.filter === "all" || r.status === state.filter)).sort((a, b) => a.time.localeCompare(b.time));
    const pending = all.filter((r) => r.status === "pending" && r.date >= todayISO()).length;
    const occ = occupancy(h, all, state.date);
    const zoneOpts = h.zones.filter((z) => z.enabled).map((z) => `<option value="${esc(z.id)}">${esc(z.name)}</option>`).join("");
    const timeOpts = h.slots.map((t) => `<option>${t}</option>`).join("");

    view.innerHTML = `
      <div class="toolbar">
        <div class="toolbar__day">
          <button class="btn btn--ghost btn--sm" type="button" data-action="day" data-delta="-1" aria-label="Día anterior">‹</button>
          <label class="sr-only" for="f-date">Fecha</label><input id="f-date" type="date" value="${state.date}" data-filter="date">
          <button class="btn btn--ghost btn--sm" type="button" data-action="day" data-delta="1" aria-label="Día siguiente">›</button>
          <button class="btn btn--ghost btn--sm" type="button" data-action="today">Hoy</button>
        </div>
        <div class="toolbar__right">
          <label class="sr-only" for="f-status">Estado</label>
          <select id="f-status" data-filter="status"><option value="all">Todas</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${state.filter === k ? " selected" : ""}>${v}</option>`).join("")}</select>
          <button class="btn btn--sm" type="button" data-action="toggle-form" aria-expanded="${state.showForm}">Nueva reserva</button>
        </div>
      </div>
      <h2 class="h3 admin__date">${esc(longDate(state.date))}</h2>
      ${closed ? `<p class="notice">Día marcado como cerrado${closed.reason ? `: ${esc(closed.reason)}` : ""}.</p>` : ""}
      ${pending ? `<p class="muted">${pending} ${pending === 1 ? "reserva pendiente" : "reservas pendientes"} de confirmar (de hoy en adelante).</p>` : ""}
      <div class="occ">${occ.map((s) => `<div><h3>${esc(s.name)}</h3><ul class="rows">${s.zones.map((z) => `<li><strong>${esc(z.name)}</strong><span class="num${z.used > z.capacity ? " is-over" : ""}">${z.used} / ${z.capacity}</span></li>`).join("")}</ul></div>`).join("")}</div>
      <form class="form admin__form" data-new-reservation ${state.showForm ? "" : "hidden"} novalidate>
        <h3 class="h3">Nueva reserva</h3>
        <div class="form__grid">
          <div class="field"><label for="n-name">Nombre</label><input id="n-name" name="name" required maxlength="80" autocomplete="off"></div>
          <div class="field"><label for="n-phone">Teléfono</label><input id="n-phone" name="phone" type="tel" maxlength="30" autocomplete="off"></div>
          <div class="field"><label for="n-people">Personas</label><input id="n-people" name="people" type="number" min="1" max="300" value="2" required></div>
          <div class="field"><label for="n-date">Fecha</label><input id="n-date" name="date" type="date" value="${state.date}" required></div>
          <div class="field"><label for="n-time">Hora</label><select id="n-time" name="time">${timeOpts}</select></div>
          <div class="field"><label for="n-zone">Zona</label><select id="n-zone" name="zone">${zoneOpts}</select></div>
          <div class="field field--full"><label for="n-notes">Notas</label><input id="n-notes" name="notes" maxlength="500" autocomplete="off"></div>
        </div>
        <p class="err" data-form-err role="alert"></p>
        <button class="btn" type="submit">Guardar reserva</button>
      </form>
      ${day.length ? `<ul class="res-list">${day.map((r) => `
        <li class="res res--${r.status}" data-id="${esc(r.id)}">
          <p class="res__time num">${esc(r.time)}</p>
          <div class="res__main"><p><strong>${esc(r.name)}</strong> · ${r.people} ${r.people === 1 ? "persona" : "personas"} · ${esc(zoneName(h, r.zone))}</p>
            ${r.phone ? `<p><a href="tel:${esc(r.phone.replace(/[^\d+]/g, ""))}">${esc(r.phone)}</a></p>` : ""}
            ${r.notes ? `<p class="muted">${esc(r.notes)}</p>` : ""}</div>
          <div class="res__actions">
            <label class="sr-only" for="s-${esc(r.id)}">Estado de ${esc(r.name)}</label>
            <select id="s-${esc(r.id)}" data-action="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${r.status === k ? " selected" : ""}>${v}</option>`).join("")}</select>
            <button class="btn btn--ghost btn--sm" type="button" data-action="delete-res" aria-label="Eliminar reserva de ${esc(r.name)}">Eliminar</button>
          </div>
        </li>`).join("")}</ul>` : `<p class="empty">No hay reservas${state.filter === "all" ? "" : " con este estado"} para este día.</p>`}`;
  }

  async function addReservation(form) {
    const err = $("[data-form-err]", form);
    const h = state.docs.horarios;
    const f = form.elements;
    const r = {
      id: crypto.randomUUID(), name: f.name.value.trim(), phone: f.phone.value.trim(), people: Number(f.people.value),
      date: f.date.value, time: f.time.value, zone: f.zone.value, notes: f.notes.value.trim(), status: "confirmed", createdAt: new Date().toISOString(),
    };
    if (!r.name) { err.textContent = "Escribe el nombre."; f.name.focus(); return; }
    if (!Number.isInteger(r.people) || r.people < 1) { err.textContent = "Indica el número de personas."; f.people.focus(); return; }
    if (!r.date) { err.textContent = "Elige una fecha."; f.date.focus(); return; }
    const svc = serviceOf(h, r.time);
    if (svc) {
      const zone = h.zones.find((z) => z.id === r.zone);
      const used = occupancy(h, state.docs.reservas, r.date).find((s) => s.name === svc.name).zones.find((z) => z.name === zone.name).used;
      if (used + r.people > zone.capacity && !confirm(`${zone.name} tendría ${used + r.people} comensales (aforo ${zone.capacity}). ¿Guardar igualmente?`)) return;
    }
    err.textContent = "";
    state.docs.reservas.push(r);
    if (await save("reservas")) { state.date = r.date; state.showForm = false; render(); }
    else state.docs.reservas.pop();
  }

  /* ---------- Horarios y aforo ---------- */
  const inp = (doc, path, value, attrs = "") => `<input data-doc="${doc}" data-path="${path}" value="${esc(value)}" ${attrs}>`;

  function renderHorarios() {
    const h = state.docs.horarios;
    view.innerHTML = `
      <form data-save="horarios" class="editor" novalidate>
        <section><h2 class="h3">Servicios de reserva</h2>
          <div class="grid-rows">${h.services.map((s, i) => `
            <div class="grid-row"><div class="field"><label>Servicio</label>${inp("horarios", `services.${i}.name`, s.name, 'maxlength="30"')}</div>
              <div class="field"><label>Desde</label>${inp("horarios", `services.${i}.from`, s.from, 'type="time"')}</div>
              <div class="field"><label>Hasta</label>${inp("horarios", `services.${i}.to`, s.to, 'type="time"')}</div>
              <div class="field"><label>Última reserva</label>${inp("horarios", `services.${i}.lastBooking`, s.lastBooking, 'type="time"')}</div></div>`).join("")}</div>
          <div class="grid-row grid-row--2">
            <div class="field"><label for="h-dur">Duración de cada reserva (min)</label>${inp("horarios", "durationMinutes", h.durationMinutes, 'id="h-dur" type="number" min="15" max="480" data-type="int"')}</div>
            <div class="field"><label for="h-max">Máximo de personas por reserva web</label>${inp("horarios", "maxPartySize", h.maxPartySize, 'id="h-max" type="number" min="1" max="300" data-type="int"')}</div>
          </div>
          <div class="field"><label for="h-slots">Horas ofrecidas (separadas por comas)</label><input id="h-slots" data-slots value="${esc(h.slots.join(", "))}"></div>
        </section>
        <section><h2 class="h3">Zonas y aforo</h2>
          <div class="grid-rows">${h.zones.map((z, i) => `
            <div class="grid-row grid-row--zone"><div class="field"><label>Zona</label>${inp("horarios", `zones.${i}.name`, z.name, 'maxlength="40"')}</div>
              <div class="field"><label>Aforo</label>${inp("horarios", `zones.${i}.capacity`, z.capacity, 'type="number" min="0" max="1000" data-type="int"')}</div>
              <label class="check"><input type="checkbox" data-doc="horarios" data-path="zones.${i}.enabled" data-type="bool"${z.enabled ? " checked" : ""}> Activa</label></div>`).join("")}</div>
        </section>
        <section><h2 class="h3">Horario de apertura</h2>
          <p class="muted">Dejar vacío = sin definir. Se usará para mostrarlo en la web y en Google.</p>
          <div class="grid-rows">${h.openingHours.map((d, i) => `
            <div class="grid-row grid-row--day"><p class="day">${DAYS[d.day]}</p>
              <label class="check"><input type="checkbox" data-doc="horarios" data-path="openingHours.${i}.closed" data-type="bool"${d.closed ? " checked" : ""}> Cerrado</label>
              ${["open1", "close1", "open2", "close2"].map((k, j) => `<div class="field"><label class="sr-only">${["Apertura", "Cierre", "Apertura 2", "Cierre 2"][j]} ${DAYS[d.day]}</label>${inp("horarios", `openingHours.${i}.${k}`, d[k], `type="time" aria-label="${["Apertura", "Cierre", "Apertura 2", "Cierre 2"][j]} ${DAYS[d.day]}"`)}</div>`).join("")}</div>`).join("")}</div>
        </section>
        <section><h2 class="h3">Días cerrados</h2>
          <ul class="rows">${h.closedDates.map((c, i) => `<li><strong>${esc(c.date)}</strong><span>${esc(c.reason)} <button class="btn btn--ghost btn--sm" type="button" data-action="del-closed" data-i="${i}" aria-label="Quitar ${esc(c.date)}">Quitar</button></span></li>`).join("") || '<li><span class="muted">Ninguno.</span></li>'}</ul>
          <div class="grid-row grid-row--2"><div class="field"><label for="cd-date">Fecha</label><input id="cd-date" type="date"></div><div class="field"><label for="cd-reason">Motivo</label><input id="cd-reason" maxlength="120"></div></div>
          <button class="btn btn--ghost btn--sm" type="button" data-action="add-closed">Añadir día cerrado</button>
        </section>
        ${saveBar("horarios")}
      </form>`;
  }

  /* ---------- Carta y precios ---------- */
  function renderCarta() {
    const c = state.docs.carta;
    view.innerHTML = `
      <form data-save="carta" class="editor" novalidate>
        <p class="muted">Edita nombres, precios y descripciones. Los precios son texto libre (p. ej. «4,00€ / 5,00€»). Nada se guarda hasta pulsar «Guardar».</p>
        ${c.map((cat, ci) => `
          <section class="cat-edit" data-ci="${ci}">
            <div class="cat-edit__head">
              <div class="field"><label>Categoría</label>${inp("carta", `${ci}.name`, cat.name, 'maxlength="60"')}</div>
              <div class="cat-edit__tools">
                <button class="btn btn--ghost btn--sm" type="button" data-action="cat-up" data-ci="${ci}" aria-label="Subir categoría ${esc(cat.name)}"${ci === 0 ? " disabled" : ""}>↑</button>
                <button class="btn btn--ghost btn--sm" type="button" data-action="cat-down" data-ci="${ci}" aria-label="Bajar categoría ${esc(cat.name)}"${ci === c.length - 1 ? " disabled" : ""}>↓</button>
                <button class="btn btn--ghost btn--sm" type="button" data-action="cat-del" data-ci="${ci}">Eliminar categoría</button>
              </div>
            </div>
            <div class="pct"><label for="pct-${ci}">Ajustar precios de ${esc(cat.name)} (%)</label><input id="pct-${ci}" type="number" step="0.5" min="-90" max="200" value="0"><button class="btn btn--ghost btn--sm" type="button" data-action="cat-pct" data-ci="${ci}">Aplicar</button></div>
            <ul class="dish-edit">${cat.items.map((d, ii) => `
              <li class="dish-row"><div class="field"><label>Plato</label>${inp("carta", `${ci}.items.${ii}.name`, d.name, 'maxlength="100"')}</div>
                <div class="field"><label>Precio</label>${inp("carta", `${ci}.items.${ii}.price`, d.price, 'maxlength="40"')}</div>
                <div class="field field--wide"><label>Descripción (opcional)</label>${inp("carta", `${ci}.items.${ii}.description`, d.description || "", 'maxlength="300"')}</div>
                <div class="dish-row__tools">
                  <button class="btn btn--ghost btn--sm" type="button" data-action="item-up" data-ci="${ci}" data-ii="${ii}" aria-label="Subir ${esc(d.name)}"${ii === 0 ? " disabled" : ""}>↑</button>
                  <button class="btn btn--ghost btn--sm" type="button" data-action="item-down" data-ci="${ci}" data-ii="${ii}" aria-label="Bajar ${esc(d.name)}"${ii === cat.items.length - 1 ? " disabled" : ""}>↓</button>
                  <button class="btn btn--ghost btn--sm" type="button" data-action="item-del" data-ci="${ci}" data-ii="${ii}" aria-label="Eliminar ${esc(d.name)}">Eliminar</button></div></li>`).join("")}</ul>
            <button class="btn btn--ghost btn--sm" type="button" data-action="item-add" data-ci="${ci}">Añadir plato</button>
          </section>`).join("")}
        <button class="btn btn--ghost" type="button" data-action="cat-add">Añadir categoría</button>
        ${saveBar("carta")}
      </form>`;
  }

  /* ---------- Configuración · Google Calendar ----------
     La cuenta la elige el administrador con OAuth; aquí no hay ningún correo ni credencial. */
  const GOOGLE_MSG = {
    connected: ["Cuenta de Google vinculada correctamente.", false],
    denied: ["Has cancelado la autorización: no se ha vinculado ninguna cuenta.", true],
    missing_scope: ["Faltan permisos. Al autorizar, deja marcadas todas las casillas de Google Calendar.", true],
    missing_refresh: ["Google no ha concedido acceso permanente. Inténtalo de nuevo.", true],
    state: ["El enlace de autorización ha caducado o no es válido. Inténtalo de nuevo.", true],
    error: ["No se pudo completar la vinculación con Google. Inténtalo de nuevo.", true],
  };
  const gDate = (iso) => (iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "") : "—");

  async function gcall(path, method = "GET", body) {
    const r = await api(`google/${path}`, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && !data.reauth) { showPanel(null); throw new Error("La sesión ha caducado."); }
    return { ok: r.ok, data };
  }

  async function loadCalendars() {
    const { ok, data } = await gcall("calendars").catch((e) => ({ ok: false, data: { error: e.message } }));
    state.calendars = ok ? data : { error: data.error || "No se pudieron leer los calendarios." };
  }

  async function loadGoogle() {
    const r = await api("google/status");
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) { showPanel(null); throw new Error("La sesión ha caducado."); }
    if (!r.ok) throw new Error(body.error || "No se pudo cargar la configuración.");
    state.google = body;
    if (!body.connected) { state.calendars = null; state.pickCalendar = false; }
    else if (!body.calendarId && !body.needsReauth) state.pickCalendar = true;
    if (state.pickCalendar && body.connected && !state.calendars) await loadCalendars();
  }

  function renderConfig() {
    const g = state.google;
    const flash = googleReturn && GOOGLE_MSG[googleReturn];
    googleReturn = null;
    let head, body;
    if (!g.connected || g.needsReauth) {
      head = g.needsReauth ? ["warn", "Acceso revocado"] : ["off", "No conectado"];
      body = `
        ${g.needsReauth ? `<p class="notice">Google ha dejado de aceptar la cuenta ${esc(g.email)}. Vuelve a vincularla para seguir sincronizando.</p>` : "<p>Conecta una cuenta de Google para sincronizar automáticamente las reservas con Google Calendar.</p>"}
        ${g.configured ? "" : '<p class="notice">La integración aún no está preparada en el servidor (faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI). Contacta con quien gestiona la web.</p>'}
        <div class="gcal__actions">
          <button class="btn" type="button" data-action="g-connect"${g.configured ? "" : " disabled"}>Vincular cuenta de Google</button>
          ${g.needsReauth ? '<button class="btn btn--ghost" type="button" data-action="g-disconnect">Desvincular cuenta</button>' : ""}
        </div>`;
    } else {
      const ready = Boolean(g.calendarId);
      head = ready ? ["on", "Conectado"] : ["warn", "Conectado · falta elegir el calendario"];
      const cal = state.calendars;
      const picker = state.pickCalendar ? `
        <div class="gcal__picker">
          ${!cal ? '<p class="muted">Cargando calendarios…</p>' : cal.error ? `<p class="err" role="alert">${esc(cal.error)}</p>` : `
          <div class="field"><label for="g-cal">Calendario para las reservas</label>
            <select id="g-cal">${cal.calendars.map((c) => `<option value="${esc(c.id)}"${c.id === g.calendarId ? " selected" : ""}>${esc(c.name)}${c.primary ? " (principal)" : ""}</option>`).join("")}</select></div>
          <div class="gcal__actions">
            <button class="btn btn--sm" type="button" data-action="g-save-cal"${cal.calendars.length ? "" : " disabled"}>Guardar calendario</button>
            <button class="btn btn--ghost btn--sm" type="button" data-action="g-create-cal">Crear calendario «${esc(cal.newName)}»</button>
            ${ready ? '<button class="btn btn--ghost btn--sm" type="button" data-action="g-cancel-pick">Cancelar</button>' : ""}
          </div>`}
        </div>` : "";
      body = `
        <dl class="gcal__facts">
          <div><dt>Cuenta vinculada</dt><dd>${esc(g.email)}</dd></div>
          <div><dt>Calendario</dt><dd>${g.calendarName ? esc(g.calendarName) : "Sin elegir"}</dd></div>
          <div><dt>Última sincronización</dt><dd>${gDate(g.lastSyncAt)}</dd></div>
          ${ready && g.pending ? `<div><dt>Pendientes de enviar</dt><dd>${g.pending}</dd></div>` : ""}
        </dl>
        ${g.lastError ? `<p class="err" role="alert">Último error: ${esc(g.lastError)}</p>` : ""}
        ${picker}
        <div class="gcal__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-action="g-test">Probar conexión</button>
          <button class="btn btn--ghost btn--sm" type="button" data-action="g-change"${state.pickCalendar ? " disabled" : ""}>Cambiar calendario</button>
          ${ready ? '<button class="btn btn--ghost btn--sm" type="button" data-action="g-sync">Sincronizar ahora</button>' : ""}
          <button class="btn btn--ghost btn--sm" type="button" data-action="g-disconnect">Desvincular cuenta</button>
        </div>`;
    }
    view.innerHTML = `
      <section class="gcal" aria-labelledby="gcal-h">
        <h2 class="h3" id="gcal-h">Google Calendar</h2>
        ${flash ? `<p class="${flash[1] ? "err" : "notice"}" role="status">${esc(flash[0])}</p>` : ""}
        <p class="gcal__state"><span class="dot dot--${head[0]}" aria-hidden="true"></span><strong>${head[1]}</strong></p>
        ${body}
        <p class="muted gcal__help">La cuenta de Google puede ser distinta de la que usas para entrar aquí. Al desvincularla, las reservas guardadas no se borran.</p>
      </section>`;
  }

  async function googleAction(b, action) {
    b.disabled = true;
    try {
      switch (action) {
        case "g-connect": location.assign("/api/admin/google/connect"); return;
        case "g-test": {
          say("Probando la conexión…");
          const { ok, data } = await gcall("test", "POST");
          if (ok) say(`Conexión correcta${data.calendar ? ` · calendario «${data.calendar}»` : ""}.`);
          else { say(data.error || "La conexión ha fallado.", true); if (data.reauth) { await loadGoogle(); render(); } }
          break;
        }
        case "g-change": state.pickCalendar = true; state.calendars = null; render(); await loadCalendars(); render(); return;
        case "g-cancel-pick": state.pickCalendar = false; render(); return;
        case "g-save-cal":
        case "g-create-cal": {
          say("Guardando…");
          const id = $("#g-cal")?.value;
          const { ok, data } = await gcall("calendars", "POST", action === "g-create-cal" ? { create: true } : { calendarId: id });
          if (!ok) { say(data.error || "No se pudo guardar el calendario.", true); break; }
          state.pickCalendar = false;
          await loadGoogle();
          say(`Calendario «${data.calendar.name}» guardado. Las reservas futuras se envían a Google Calendar.`);
          render();
          return;
        }
        case "g-sync": {
          say("Sincronizando…");
          const { ok, data } = await gcall("sync", "POST");
          if (!ok) { say(data.error || "No se pudo sincronizar.", true); break; }
          await loadGoogle();
          const parts = [`${data.created} nuevas`, `${data.updated} actualizadas`, `${data.deleted} retiradas`];
          say(`Sincronizado: ${parts.join(", ")}${data.remaining ? `. Quedan ${data.remaining}: pulsa otra vez.` : ""}${data.failed ? `. ${data.failed} con error.` : ""}`, Boolean(data.failed));
          render();
          return;
        }
        case "g-disconnect": {
          if (!confirm("¿Desvincular la cuenta de Google? Las reservas guardadas no se borran, pero dejarán de enviarse a Google Calendar.")) break;
          say("Desvinculando…");
          const { ok, data } = await gcall("disconnect", "POST");
          if (!ok) { say(data.error || "No se pudo desvincular.", true); break; }
          await loadGoogle();
          say("Cuenta desvinculada.");
          render();
          return;
        }
      }
    } catch (e) {
      say(e.message || "No se pudo completar la operación.", true);
    }
    b.disabled = false;
  }

  const saveBar = (doc) => `<div class="savebar"><button class="btn" type="submit">Guardar cambios</button><button class="btn btn--ghost" type="button" data-action="discard" data-doc="${doc}">Descartar cambios</button></div>`;

  const adjustPrice = (text, pct) => text.replace(/\d+(?:,\d+)?/g, (m) => {
    const v = Math.max(0, parseFloat(m.replace(",", ".")) * (1 + pct / 100));
    return (Math.round(v * 20) / 20).toFixed(2).replace(".", ",");
  });

  function move(arr, i, delta) {
    const j = i + delta;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  /* ---------- Eventos del panel ---------- */
  const markDirty = (doc) => { state.dirty[doc] = true; say("Cambios sin guardar"); };

  view.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.slots !== undefined) {
      state.docs.horarios.slots = t.value.split(/[\s,;]+/).filter(Boolean);
      markDirty("horarios");
      return;
    }
    if (!t.dataset.doc) return;
    const v = t.dataset.type === "bool" ? t.checked : t.dataset.type === "int" ? Number(t.value) : t.value;
    setPath(state.docs[t.dataset.doc], t.dataset.path, v);
    markDirty(t.dataset.doc);
  });

  view.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset.filter === "date") { if (t.value) { state.date = t.value; render(); } }
    else if (t.dataset.filter === "status") { state.filter = t.value; render(); }
    else if (t.dataset.action === "status") {
      const r = state.docs.reservas.find((x) => x.id === t.closest("[data-id]").dataset.id);
      const prev = r.status;
      r.status = t.value;
      if (await save("reservas")) render(); else { r.status = prev; render(); }
    }
  });

  view.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.matches("[data-new-reservation]")) return addReservation(form);
    const doc = form.dataset.save;
    if (doc) { if (await save(doc)) render(); }
  });

  view.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-action]");
    if (!b || b.tagName === "SELECT") return;
    const { action } = b.dataset;
    if (action.startsWith("g-")) return googleAction(b, action);
    const ci = Number(b.dataset.ci), ii = Number(b.dataset.ii);
    const carta = state.docs.carta;

    switch (action) {
      case "day": state.date = shiftDay(state.date, Number(b.dataset.delta)); return render();
      case "today": state.date = todayISO(); return render();
      case "toggle-form": state.showForm = !state.showForm; render(); if (state.showForm) $("#n-name").focus(); return;
      case "delete-res": {
        const id = b.closest("[data-id]").dataset.id;
        const list = state.docs.reservas;
        const idx = list.findIndex((x) => x.id === id);
        if (!confirm(`¿Eliminar la reserva de ${list[idx].name}?`)) return;
        const [removed] = list.splice(idx, 1);
        if (await save("reservas")) render(); else { list.splice(idx, 0, removed); render(); }
        return;
      }
      case "add-closed": {
        const date = $("#cd-date").value, reason = $("#cd-reason").value.trim();
        if (!date) { say("Elige la fecha del día cerrado.", true); return; }
        state.docs.horarios.closedDates.push({ date, reason });
        state.docs.horarios.closedDates.sort((a, c) => a.date.localeCompare(c.date));
        markDirty("horarios"); return render();
      }
      case "del-closed": state.docs.horarios.closedDates.splice(Number(b.dataset.i), 1); markDirty("horarios"); return render();
      case "cat-add": carta.push({ id: `${slug("nueva")}-${Date.now().toString(36)}`, name: "Nueva categoría", items: [] }); markDirty("carta"); return render();
      case "cat-del":
        if (!confirm(`¿Eliminar la categoría «${carta[ci].name}» y sus ${carta[ci].items.length} platos?`)) return;
        carta.splice(ci, 1); markDirty("carta"); return render();
      case "cat-up": move(carta, ci, -1); markDirty("carta"); return render();
      case "cat-down": move(carta, ci, 1); markDirty("carta"); return render();
      case "cat-pct": {
        const pct = Number($(`#pct-${ci}`).value);
        if (!pct) return;
        carta[ci].items.forEach((d) => { d.price = adjustPrice(d.price, pct); });
        markDirty("carta"); say(`Precios ajustados un ${pct} % (sin guardar)`); return render();
      }
      case "item-add": carta[ci].items.push({ name: "Nuevo plato", price: "" }); markDirty("carta"); return render();
      case "item-del": carta[ci].items.splice(ii, 1); markDirty("carta"); return render();
      case "item-up": move(carta[ci].items, ii, -1); markDirty("carta"); return render();
      case "item-down": move(carta[ci].items, ii, 1); markDirty("carta"); return render();
      case "discard":
        if (!confirm("¿Descartar los cambios sin guardar?")) return;
        delete state.docs[b.dataset.doc]; state.dirty[b.dataset.doc] = false; say(""); return openTab(state.tab);
    }
  });

  window.addEventListener("beforeunload", (e) => { if (Object.values(state.dirty).some(Boolean)) { e.preventDefault(); e.returnValue = ""; } });
})();
