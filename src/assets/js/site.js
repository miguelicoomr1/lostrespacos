/* Los Tres Pacos — mejoras progresivas. La web funciona sin este archivo. */
(() => {
  "use strict";

  /* Menú móvil (<details>): cierra con Esc, al elegir un enlace y al pasar a escritorio. */
  const menu = document.querySelector("details.menu");
  if (menu) {
    const close = (returnFocus) => {
      if (!menu.open) return;
      menu.open = false;
      if (returnFocus) menu.querySelector("summary").focus();
    };
    menu.addEventListener("toggle", () => {
      document.documentElement.style.overflow = menu.open ? "hidden" : "";
    });
    menu.addEventListener("keydown", (e) => e.key === "Escape" && close(true));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => close(false)));
    window.matchMedia("(min-width:60rem)").addEventListener("change", (e) => e.matches && close(false));
  }

  /* Carta: resalta la categoría visible. */
  const chips = document.querySelectorAll(".chips a");
  if (chips.length && "IntersectionObserver" in window) {
    const byId = new Map([...chips].map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        chips.forEach((a) => a.removeAttribute("aria-current"));
        const chip = byId.get(entry.target.id);
        chip.setAttribute("aria-current", "true");
        const bar = chip.parentElement.parentElement;
        bar.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
      });
    }, { rootMargin: "-25% 0px -65% 0px" });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* Reservas: envía la solicitud a /api/reservas (queda pendiente hasta que la confirmamos por teléfono). */
  const form = document.querySelector("[data-reservation-form]");
  if (form) {
    form.hidden = false;
    const fallback = document.querySelector("[data-reservation-fallback]");
    if (fallback) fallback.hidden = true;

    const shownAt = Date.now();
    const dateInput = form.elements.date;
    const pad = (n) => String(n).padStart(2, "0");
    const now = new Date();
    dateInput.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const summary = form.querySelector("[data-summary]");
    const submit = form.querySelector('[type="submit"]');
    const setError = (field, message) => {
      const err = document.getElementById(`${field.id}-err`);
      if (err) err.textContent = message;
      field.setAttribute("aria-invalid", message ? "true" : "false");
    };
    const label = (select) => select.options[select.selectedIndex].text;
    const show = (title, text, note) => {
      summary.querySelector("[data-summary-title]").textContent = title;
      summary.querySelector("[data-summary-text]").textContent = text;
      summary.querySelector("[data-summary-note]").textContent = note;
      summary.hidden = false;
      summary.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      const phone = form.elements.phone.value.replace(/[\s.-]/g, "");
      const date = dateInput.value;
      setError(form.elements.name, name ? "" : "Escribe tu nombre.");
      setError(form.elements.phone, /^\+?\d{9,15}$/.test(phone) ? "" : "Escribe un teléfono válido para confirmarte.");
      setError(dateInput, !date ? "Elige una fecha." : date < dateInput.min ? "La fecha ya ha pasado." : "");
      const invalid = form.querySelector('[aria-invalid="true"]');
      if (invalid) { summary.hidden = true; invalid.focus(); return; }

      const day = new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      const people = form.elements.people.value;
      const text = `${name}: ${people} ${people === "1" ? "persona" : "personas"}, ${day}, ${form.elements.time.value} h, ${label(form.elements.zone)}.`;

      submit.disabled = true;
      submit.textContent = "Enviando…";
      try {
        const r = await fetch("/api/reservas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name, phone, people, date,
            time: form.elements.time.value,
            zone: form.elements.zone.value,
            notes: form.elements.notes.value,
            website: form.elements.website.value,
            elapsed: Date.now() - shownAt,
          }),
        });
        const body = await r.json().catch(() => ({}));
        if (r.ok && body.ok) {
          show("Solicitud enviada", text, "Todavía no está confirmada: te llamaremos para confirmarla. Si es urgente, llámanos.");
          form.reset();
          dateInput.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        } else {
          show("No se pudo enviar", body.error || "Inténtalo de nuevo o llámanos.", "Puedes reservar llamando por teléfono.");
        }
      } catch {
        show("Sin conexión", "No hemos podido enviar la solicitud.", "Inténtalo de nuevo o llámanos por teléfono.");
      } finally {
        submit.disabled = false;
        submit.textContent = "Enviar solicitud";
      }
    });
    form.addEventListener("input", (e) => e.target.hasAttribute("aria-invalid") && setError(e.target, ""));
  }
})();
