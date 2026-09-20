// Acceso al panel con Supabase Auth (correo + contraseña). Solo entran los usuarios dados de alta en la
// tabla `admins`. La sesión sigue siendo una cookie firmada propia (HttpOnly, SameSite=Strict, 8 h):
// los tokens de Supabase no salen nunca del servidor.
import { MAX_AGE, cookie, createSession, json } from "../../_lib/session.js";

const base = (env) => env.SUPABASE_URL.replace(/\/+$/, "");

async function isAdmin(env, userId) {
  const r = await fetch(`${base(env)}/rest/v1/admins?select=user_id&user_id=eq.${encodeURIComponent(userId)}`, {
    headers: { apikey: env.SUPABASE_SECRET_KEY },
  });
  return r.ok && (await r.json()).length > 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY || !env.SESSION_SECRET)
    return json({ error: "La zona privada aún no está configurada." }, 503);
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Origen no permitido." }, 403);

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
  const password = String(body.password || "").slice(0, 200);
  if (!email || !password) return json({ error: "Correo o contraseña incorrectos." }, 401);

  try {
    const r = await fetch(`${base(env)}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.status === 429) return json({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    const auth = await r.json().catch(() => ({}));
    // Mismo mensaje para «no existe», «contraseña mala» y «no es administrador».
    if (!r.ok || !auth.user?.id || !(await isAdmin(env, auth.user.id))) return json({ error: "Correo o contraseña incorrectos." }, 401);
    const secure = new URL(request.url).protocol === "https:";
    return json({ ok: true }, 200, { "set-cookie": cookie(await createSession(env, auth.user.email || email), MAX_AGE, secure) });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo comprobar el acceso. Inténtalo de nuevo." }, 502);
  }
}
