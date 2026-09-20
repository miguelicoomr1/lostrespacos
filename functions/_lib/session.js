// Sesión de administración: cookie firmada con HMAC-SHA256. Los secretos llegan por `env`, nunca del frontend.
const enc = new TextEncoder();
export const COOKIE = "l3p_admin";
export const MAX_AGE = 60 * 60 * 8;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

// Comparación en tiempo constante (las cadenas se reducen antes a HMAC de igual longitud).
export async function safeEqual(secret, a, b) {
  const [x, y] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function createSession(env, email) {
  const payload = `${Math.floor(Date.now() / 1000) + MAX_AGE}.${b64(enc.encode(email))}`;
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}

export async function readSession(env, request) {
  if (!env.SESSION_SECRET) return null;
  const token = (request.headers.get("Cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const [exp, mail, sig] = (token || "").split(".");
  if (!exp || !mail || !sig || Number(exp) < Date.now() / 1000) return null;
  if (!(await safeEqual(env.SESSION_SECRET, sig, await hmac(env.SESSION_SECRET, `${exp}.${mail}`)))) return null;
  try { return { email: atob(mail.replace(/-/g, "+").replace(/_/g, "/")) }; } catch { return null; }
}

export const cookie = (value, maxAge, secure = true) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
