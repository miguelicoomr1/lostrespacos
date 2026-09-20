// Solicitud de reserva desde la web (pública). Toda la validación de negocio (horario, aforo, días cerrados,
// límites) ocurre en Postgres, dentro de una transacción (supabase/booking.sql: book_web).
// Llega como «pendiente»: la confirma el personal por teléfono desde el panel.
import { json } from "../_lib/session.js";
import { configured, rpc } from "../_lib/supabase.js";
import { reconcile, runInBackground } from "../_lib/gcal.js";

const MESSAGES = {
  past: "Esa fecha u hora ya ha pasado.",
  party: "Para ese número de personas, llámanos.",
  zone: "Esa zona no está disponible.",
  slot: "Esa hora no está disponible.",
  closed: "Ese día estamos cerrados.",
  limit: "Ya tienes varias solicitudes pendientes. Llámanos para gestionarlas.",
  full: "No queda sitio en esa zona a esa hora. Prueba otra hora o zona, o llámanos.",
};
const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  if (!configured(env)) return json({ error: "Las reservas online no están disponibles ahora. Llámanos." }, 503);
  const origin = request.headers.get("Origin");
  if (!origin || new URL(origin).host !== new URL(request.url).host) return json({ error: "Origen no permitido." }, 403);
  const raw = await request.text();
  if (raw.length > 4000) return json({ error: "Solicitud demasiado grande." }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: "Datos no válidos." }, 400); }
  if (!b || typeof b !== "object") return json({ error: "Datos no válidos." }, 400);

  // Anti-bot básico: campo trampa relleno o envío en menos de 1,5 s. Se responde «ok» sin guardar nada.
  if (clean(b.website, 100) || Number(b.elapsed) < 1500) return json({ ok: true });

  const name = clean(b.name, 80);
  const phone = clean(b.phone, 20).replace(/[\s.-]/g, "");
  const people = Number(b.people);
  const date = clean(b.date, 10);
  const time = clean(b.time, 5);
  const zone = clean(b.zone, 40);
  const notes = clean(b.notes, 300);
  if (!name) return json({ error: "Escribe tu nombre." }, 400);
  if (!/^\+?\d{9,15}$/.test(phone)) return json({ error: "Escribe un teléfono válido para confirmarte la reserva." }, 400);
  if (!Number.isInteger(people) || people < 1 || people > 300) return json({ error: "Número de personas no válido." }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return json({ error: "Fecha no válida." }, 400);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return json({ error: "Hora no válida." }, 400);
  if (!zone) return json({ error: "Elige una zona." }, 400);

  try {
    const res = await rpc(env, "book_web", { p_name: name, p_phone: phone, p_people: people, p_date: date, p_time: time, p_zone: zone, p_notes: notes });
    // Reserva guardada: se envía a Google Calendar (si el administrador lo ha vinculado) sin retrasar la respuesta.
    // Si Google falla, la reserva sigue válida y se reintenta en la siguiente sincronización.
    if (res?.ok) { if (res.id) runInBackground(ctx, reconcile(env, { id: res.id })); return json({ ok: true }); }
    return json({ error: MESSAGES[res?.code] || "No se pudo registrar la solicitud." }, 409);
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo registrar la solicitud. Llámanos." }, 502);
  }
}
