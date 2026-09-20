// Lectura y escritura de los documentos del panel: reservas, horarios, carta.
// Almacenamiento: Supabase (Postgres). Las funciones SQL get_doc/save_doc (supabase/functions.sql)
// leen y guardan cada documento en una transacción. Solo se llaman desde aquí, con la secret key.
import { json, readSession } from "../../_lib/session.js";
import { configured, rpc } from "../../_lib/supabase.js";
import { Invalid, validators } from "../../_lib/validate.js";
import { reconcile, runInBackground } from "../../_lib/gcal.js";

const docOf = (request) => {
  const doc = new URL(request.url).searchParams.get("doc");
  return Object.hasOwn(validators, doc) ? doc : null;
};

const read = (env, doc) => rpc(env, "get_doc", { p_doc: doc });
// Reservas: solo se borran las que existían cuando se cargó el panel (`at`), para no perder reservas web recientes.
const write = (env, doc, value, at) =>
  doc === "reservas" ? rpc(env, "save_reservas", { p_data: value, p_loaded: at }) : rpc(env, "save_doc", { p_doc: doc, p_data: value });
const LOAD_SKEW_MS = 10_000;

async function guard({ request, env }, doc) {
  if (!(await readSession(env, request))) return json({ error: "Sesión no válida." }, 401);
  if (!doc) return json({ error: "Documento desconocido." }, 400);
  if (!configured(env)) return json({ error: "Base de datos no configurada (faltan SUPABASE_URL y SUPABASE_SECRET_KEY)." }, 503);
  return null;
}

export async function onRequestGet(ctx) {
  const doc = docOf(ctx.request);
  const denied = await guard(ctx, doc);
  if (denied) return denied;
  try {
    const at = new Date(Date.now() - LOAD_SKEW_MS).toISOString();
    return json({ doc, at, data: await read(ctx.env, doc) });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo leer de la base de datos." }, 502);
  }
}

export async function onRequestPut(ctx) {
  const { request, env } = ctx;
  const doc = docOf(request);
  const denied = await guard(ctx, doc);
  if (denied) return denied;
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Origen no permitido." }, 403);
  const raw = await request.text();
  if (raw.length > 1_000_000) return json({ error: "Documento demasiado grande." }, 413);
  let clean;
  try {
    clean = validators[doc](JSON.parse(raw));
  } catch (e) {
    return json({ error: e instanceof Invalid ? e.message : "Datos no válidos." }, 400);
  }
  try {
    const at = new URL(request.url).searchParams.get("at");
    await write(env, doc, clean, at && !Number.isNaN(Date.parse(at)) ? at : null);
    // Altas, cambios de estado y borrados de reservas -> Google Calendar (solo actúa si hay cuenta y calendario).
    // `horarios` también: la duración de la reserva cambia la hora de fin de los eventos.
    if (doc !== "carta") runInBackground(ctx, reconcile(env));
    return json({ ok: true, doc, data: clean });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo guardar en la base de datos." }, 502);
  }
}
