// Inicio del flujo OAuth 2.0 de Google (el administrador pulsa «Vincular cuenta de Google»).
// `state` va firmado con SESSION_SECRET y se ata al navegador con una cookie SameSite=Lax (la cookie de sesión
// es Strict y no viaja en la vuelta desde Google, así que el callback se autentica con esta firma).
import { hmac, json, readSession } from "../../../_lib/session.js";
import { AUTH_COOKIE, authUrl, oauthConfigured, pkceChallenge, randomToken } from "../../../_lib/gcal.js";

const TTL = 600;

export async function onRequestGet({ request, env }) {
  if (!(await readSession(env, request))) return json({ error: "Sesión no válida." }, 401);
  if (!oauthConfigured(env) || !env.SESSION_SECRET) return json({ error: "Falta configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI en el servidor." }, 503);

  const nonce = randomToken(16);
  const verifier = randomToken(32);
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const state = `${exp}.${nonce}.${await hmac(env.SESSION_SECRET, `gauth.${exp}.${nonce}`)}`;
  const secure = new URL(request.url).protocol === "https:";
  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl(env, { state, challenge: await pkceChallenge(verifier) }),
      "cache-control": "no-store",
      "set-cookie": `${AUTH_COOKIE}=${nonce}.${verifier}; Path=/api/admin/google; HttpOnly; SameSite=Lax; Max-Age=${TTL}${secure ? "; Secure" : ""}`,
    },
  });
}
