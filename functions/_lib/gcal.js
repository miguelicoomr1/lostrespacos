// Google Calendar: OAuth 2.0 dinámico + sincronización de reservas.
//
// La cuenta de Google NO está en el código ni en variables de entorno: la elige el administrador desde
// /admin/ → Configuración → «Vincular cuenta de Google». Las únicas variables son las de la APLICACIÓN OAuth
// (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI), que viven solo en el servidor.
// El refresh token se guarda cifrado (AES-GCM, clave derivada de SESSION_SECRET) en public.integrations.
import { hmac, json, readSession } from "./session.js";
import { configured, rest } from "./supabase.js";

export const TZ = "Europe/Madrid";
export const PROVIDER = "google_calendar";
export const AUTH_COOKIE = "l3p_gauth"; // nonce.verifier del flujo OAuth en curso (10 min)
// Mínimo necesario: listar calendarios, crear el calendario de reservas y gestionar eventos.
export const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.app.created",
  "https://www.googleapis.com/auth/calendar.events",
];
const REQUIRED_SCOPES = SCOPES.filter((s) => s.startsWith("https://"));
const CAL = "https://www.googleapis.com/calendar/v3";
const enc = new TextEncoder();
const dec = new TextDecoder();

export class GoogleError extends Error {
  constructor(message, { status = 0, code = "" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const oauthConfigured = (env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);

/* ---------- Utilidades ---------- */
export const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
export const randomToken = (bytes = 24) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256 = async (text) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

async function aesKey(env) {
  const base = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("l3p-integrations"), info: enc.encode("google_calendar refresh token") },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}
async function encrypt(env, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(env), enc.encode(text)));
  return `${b64url(iv)}.${b64url(ct)}`;
}
async function decrypt(env, blob) {
  const [iv, ct] = blob.split(".");
  return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64url(iv) }, await aesKey(env), unb64url(ct)));
}

/* ---------- Acceso de administrador a los endpoints ---------- */
// Devuelve una Response de error o null si todo está bien. `write` = comprobar además el origen (CSRF).
export async function guard({ request, env }, { write = false } = {}) {
  if (!(await readSession(env, request))) return json({ error: "Sesión no válida." }, 401);
  if (!configured(env)) return json({ error: "Base de datos no configurada." }, 503);
  if (write) {
    const origin = request.headers.get("Origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Origen no permitido." }, 403);
  }
  return null;
}

/* ---------- Estado de la integración (Supabase) ---------- */
export async function getIntegration(env) {
  const rows = await rest(env, "GET", `integrations?provider=eq.${PROVIDER}&select=*`);
  return rows?.[0] || null;
}

const patchIntegration = (env, fields) => rest(env, "PATCH", `integrations?provider=eq.${PROVIDER}`, fields);

async function clearReservationLinks(env) {
  await rest(env, "PATCH", "reservations?google_event_id=not.is.null", { google_event_id: null, google_calendar_id: null, google_sync_hash: null, google_synced_at: null });
  await rest(env, "DELETE", "gcal_deletions?id=gt.0");
}

/* ---------- OAuth ---------- */
export function authUrl(env, { state, challenge }) {
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // select_account: el administrador elige personalmente la cuenta. consent: fuerza un refresh token nuevo.
    prompt: "select_account consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export const pkceChallenge = async (verifier) => b64url(await sha256(verifier));

async function tokenRequest(env, params) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...params }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new GoogleError(body.error_description || body.error || "Google rechazó la autorización.", { status: r.status, code: body.error || "" });
  return body;
}

// Completa el flujo: canjea el código, lee la cuenta autorizada y guarda la vinculación.
// Devuelve { email }. Lanza GoogleError con `code` = missing_refresh | missing_scope | ...
export async function completeConnection(env, { code, verifier }) {
  const t = await tokenRequest(env, { grant_type: "authorization_code", code, redirect_uri: env.GOOGLE_REDIRECT_URI, code_verifier: verifier });
  const granted = String(t.scope || "").split(/\s+/);
  if (!REQUIRED_SCOPES.every((s) => granted.includes(s))) {
    await revokeToken(t.refresh_token || t.access_token);
    throw new GoogleError("Faltan permisos de Google Calendar.", { code: "missing_scope" });
  }
  if (!t.refresh_token) throw new GoogleError("Google no devolvió acceso permanente.", { code: "missing_refresh" });
  const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${t.access_token}` } });
  const info = await u.json().catch(() => ({}));
  if (!u.ok || !info.email) throw new GoogleError("No se pudo leer la cuenta de Google.", { code: "no_email" });
  const email = String(info.email).toLowerCase();

  const previous = await getIntegration(env);
  const sameAccount = previous && previous.account_email === email;
  if (previous && !sameAccount) {
    // Otra cuenta: se retira el acceso de la anterior y se sueltan los eventos que eran suyos.
    await revokeToken(await decrypt(env, previous.refresh_token_enc).catch(() => null));
    await clearReservationLinks(env);
  }
  await rest(env, "POST", "integrations?on_conflict=provider", {
    provider: PROVIDER,
    account_email: email,
    refresh_token_enc: await encrypt(env, t.refresh_token),
    calendar_id: sameAccount ? previous.calendar_id : null,
    calendar_name: sameAccount ? previous.calendar_name : null,
    connected_at: new Date().toISOString(),
    last_sync_at: sameAccount ? previous.last_sync_at : null,
    last_error: null,
  }, "resolution=merge-duplicates,return=minimal");
  tokenCache.clear();
  return { email };
}

async function revokeToken(token) {
  if (!token) return;
  try {
    await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) });
  } catch { /* si Google no responde, el acceso se borra igualmente en local */ }
}

// Desvincula: revoca el token en Google, borra la vinculación y suelta los eventos. Las reservas NO se tocan.
export async function disconnect(env) {
  const integ = await getIntegration(env);
  if (!integ) return;
  await revokeToken(await decrypt(env, integ.refresh_token_enc).catch(() => null));
  await rest(env, "DELETE", `integrations?provider=eq.${PROVIDER}`);
  await clearReservationLinks(env);
  tokenCache.clear();
}

/* ---------- Access token ---------- */
const tokenCache = new Map(); // refresh_token_enc -> { token, exp }

async function accessToken(env, integ) {
  const hit = tokenCache.get(integ.refresh_token_enc);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  let t;
  try {
    t = await tokenRequest(env, { grant_type: "refresh_token", refresh_token: await decrypt(env, integ.refresh_token_enc) });
  } catch (e) {
    if (e instanceof GoogleError && e.code === "invalid_grant") {
      await patchIntegration(env, { last_error: "REAUTH" }).catch(() => {});
      throw new GoogleError("Google ha revocado el acceso. Vincula la cuenta de nuevo.", { status: 401, code: "reauth" });
    }
    throw e;
  }
  tokenCache.set(integ.refresh_token_enc, { token: t.access_token, exp: Date.now() + (t.expires_in || 3600) * 1000 });
  return t.access_token;
}

async function api(env, integ, method, path, body) {
  const r = await fetch(`${CAL}${path}`, {
    method,
    headers: { authorization: `Bearer ${await accessToken(env, integ)}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new GoogleError(data.error?.message || `Google Calendar ${r.status}`, { status: r.status, code: data.error?.errors?.[0]?.reason || "" });
  return data;
}

/* ---------- Calendarios ---------- */
export async function listCalendars(env, integ) {
  const d = await api(env, integ, "GET", "/users/me/calendarList?minAccessRole=writer&maxResults=250&fields=items(id,summary,primary,accessRole)");
  return (d.items || []).map((c) => ({ id: c.id, name: c.summary, primary: Boolean(c.primary) }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name, "es"));
}

export async function createCalendar(env, integ, name) {
  const c = await api(env, integ, "POST", "/calendars", { summary: name, timeZone: TZ });
  return { id: c.id, name: c.summary };
}

export async function selectCalendar(env, integ, calendarId) {
  const list = await listCalendars(env, integ);
  const found = list.find((c) => c.id === calendarId);
  if (!found) throw new GoogleError("Ese calendario no está disponible en la cuenta vinculada.", { status: 400, code: "bad_calendar" });
  await setCalendar(env, found);
  return found;
}

export async function setCalendar(env, { id, name }) {
  await patchIntegration(env, { calendar_id: id, calendar_name: name, last_error: null });
}

export async function testConnection(env, integ) {
  await accessToken(env, integ);
  if (!integ.calendar_id) return { ok: true, calendar: null };
  const c = await api(env, integ, "GET", `/users/me/calendarList/${encodeURIComponent(integ.calendar_id)}?fields=id,summary,accessRole`);
  if (!["owner", "writer"].includes(c.accessRole)) throw new GoogleError("La cuenta no puede escribir en ese calendario.", { status: 403, code: "read_only" });
  return { ok: true, calendar: c.summary };
}

/* ---------- Sincronización de reservas ---------- */
const todayMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
const hhmm = (t) => String(t).slice(0, 5);
const eventId = (id) => { const h = String(id).replace(/-/g, "").toLowerCase(); return /^[0-9a-f]{32}$/.test(h) ? h : undefined; }; // id propio = alta idempotente
const isoLocal = (date, time, plusMinutes = 0) => {
  const d = new Date(`${date}T${hhmm(time)}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + plusMinutes);
  return d.toISOString().slice(0, 19);
};
const STATUS_ES = { pending: "Pendiente de confirmar", confirmed: "Confirmada", cancelled: "Cancelada" };

const hashOf = async (r, duration) => hex(await sha256(JSON.stringify([r.name, r.phone, r.people, r.date, hhmm(r.time), r.zone, r.notes, r.status, duration])));

function eventBody(r, duration) {
  const lines = [`Nombre: ${r.name}`, r.phone && `Teléfono: ${r.phone}`, `Personas: ${r.people}`, r.zone && `Zona: ${r.zone}`, r.notes && `Notas: ${r.notes}`, `Estado: ${STATUS_ES[r.status] || r.status}`];
  const id = eventId(r.id);
  return {
    ...(id ? { id } : {}),
    summary: `${r.status === "pending" ? "[Pendiente] " : ""}Reserva - ${r.name} (${r.people} pers.)`,
    description: lines.filter(Boolean).join("\n"),
    start: { dateTime: isoLocal(r.date, r.time), timeZone: TZ },
    end: { dateTime: isoLocal(r.date, r.time, duration), timeZone: TZ },
    status: "confirmed",
    colorId: r.status === "pending" ? "5" : "10",
    reminders: { useDefault: false },
    extendedProperties: { private: { reservationId: String(r.id) } },
  };
}

// Qué falta por enviar a Google: eventos que retirar y reservas nuevas/modificadas/canceladas.
async function plan(env, integ, onlyId) {
  const settings = await rest(env, "GET", "settings?select=duration_minutes");
  const duration = settings?.[0]?.duration_minutes || 90;
  const filter = onlyId ? `id=eq.${encodeURIComponent(onlyId)}` : `date=gte.${todayMadrid()}`;
  const rows = await rest(env, "GET", `reservations?${filter}&select=id,name,phone,people,date,time,zone,notes,status,google_event_id,google_calendar_id,google_sync_hash&order=date,time&limit=500`);
  const deletions = onlyId ? [] : (await rest(env, "GET", "gcal_deletions?select=id,calendar_id,event_id&order=id&limit=200")) || [];
  const work = [];
  for (const r of rows || []) {
    const hash = await hashOf(r, duration);
    if (r.status === "cancelled") { if (r.google_event_id) work.push({ kind: "cancel", r }); continue; }
    if (!r.google_event_id || r.google_sync_hash !== hash) work.push({ kind: r.google_event_id ? "update" : "create", r, hash });
  }
  return { duration, deletions, work };
}

export async function pendingCount(env, integ) {
  if (!integ?.calendar_id) return 0;
  const p = await plan(env, integ);
  return p.deletions.length + p.work.length;
}

const gone = (e) => e instanceof GoogleError && (e.status === 404 || e.status === 410);

async function pushReservation(env, integ, item, duration) {
  const { r, hash } = item;
  const body = eventBody(r, duration);
  const link = (calendarId, id) => rest(env, "PATCH", `reservations?id=eq.${encodeURIComponent(r.id)}`, {
    google_event_id: id, google_calendar_id: calendarId, google_sync_hash: id ? hash : null, google_synced_at: id ? new Date().toISOString() : null,
  });
  if (item.kind === "cancel") {
    try { await api(env, integ, "DELETE", `/calendars/${encodeURIComponent(r.google_calendar_id)}/events/${encodeURIComponent(r.google_event_id)}`); } catch (e) { if (!gone(e)) throw e; }
    return link(null, null);
  }
  if (item.kind === "update") {
    try {
      const ev = await api(env, integ, "PUT", `/calendars/${encodeURIComponent(r.google_calendar_id)}/events/${encodeURIComponent(r.google_event_id)}`, { ...body, id: r.google_event_id });
      return link(r.google_calendar_id, ev.id);
    } catch (e) { if (!gone(e)) throw e; }
  }
  const cal = integ.calendar_id;
  let ev;
  try {
    ev = await api(env, integ, "POST", `/calendars/${encodeURIComponent(cal)}/events`, body);
  } catch (e) {
    // 409: ese id ya existió (carrera entre dos sincronizaciones, o evento cancelado antes). Se reescribe.
    if (!(e instanceof GoogleError && e.status === 409 && body.id)) throw e;
    ev = await api(env, integ, "PUT", `/calendars/${encodeURIComponent(cal)}/events/${body.id}`, body);
  }
  return link(cal, ev.id);
}

// Envía a Google lo que falta. Nunca lanza: cualquier fallo queda anotado en `last_error` y se reintenta
// en la siguiente sincronización. `id` limita el trabajo a una reserva (alta desde la web).
// `limit` acota las llamadas por invocación (Workers limita las subpeticiones); si queda trabajo, `remaining` > 0.
export async function reconcile(env, { id, limit = 15 } = {}) {
  const out = { created: 0, updated: 0, deleted: 0, failed: 0, remaining: 0, skipped: false };
  let integ;
  try { integ = await getIntegration(env); } catch (e) { console.error(e); return { ...out, skipped: true }; }
  if (!integ || !integ.calendar_id) return { ...out, skipped: true };

  let firstError = null, reauth = false;
  const fail = (e) => {
    out.failed++;
    reauth ||= e instanceof GoogleError && e.code === "reauth";
    firstError ||= e instanceof GoogleError ? e.message : "Error al sincronizar.";
    console.error(e);
  };
  try {
    const p = await plan(env, integ, id);
    let budget = limit;
    for (const d of p.deletions) {
      if (budget-- <= 0) { out.remaining++; continue; }
      try {
        try { await api(env, integ, "DELETE", `/calendars/${encodeURIComponent(d.calendar_id)}/events/${encodeURIComponent(d.event_id)}`); } catch (e) { if (!gone(e)) throw e; }
        await rest(env, "DELETE", `gcal_deletions?id=eq.${d.id}`);
        out.deleted++;
      } catch (e) { fail(e); }
    }
    for (const item of p.work) {
      if (budget-- <= 0) { out.remaining++; continue; }
      try {
        await pushReservation(env, integ, item, p.duration);
        out[item.kind === "create" ? "created" : item.kind === "update" ? "updated" : "deleted"]++;
      } catch (e) {
        fail(e);
        if (e instanceof GoogleError && e.code === "reauth") break; // sin acceso: no insistir
      }
    }
  } catch (e) { fail(e); }
  try {
    await patchIntegration(env, firstError ? { last_error: reauth ? "REAUTH" : firstError } : { last_sync_at: new Date().toISOString(), last_error: null });
  } catch (e) { console.error(e); }
  return out;
}

// Lanza la sincronización en segundo plano si el runtime lo permite (Pages: waitUntil); si no, la espera.
export function runInBackground(ctx, promise) {
  const safe = promise.catch((e) => console.error(e));
  if (typeof ctx.waitUntil === "function") ctx.waitUntil(safe);
  return safe;
}

/* ---------- Vista pública del estado (nunca incluye tokens) ---------- */
export async function statusView(env, integ) {
  const base = { configured: oauthConfigured(env), connected: false };
  if (!integ) return base;
  let pending = null;
  try { pending = await pendingCount(env, integ); } catch (e) { console.error(e); }
  return {
    ...base,
    connected: true,
    email: integ.account_email,
    calendarId: integ.calendar_id,
    calendarName: integ.calendar_name,
    lastSyncAt: integ.last_sync_at,
    needsReauth: integ.last_error === "REAUTH",
    lastError: integ.last_error && integ.last_error !== "REAUTH" ? integ.last_error : null,
    pending,
  };
}
