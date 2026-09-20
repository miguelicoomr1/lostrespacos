// Vuelta de Google (redirect URI). Canjea el código, guarda la cuenta elegida por el administrador y
// devuelve al panel. No hay ninguna cuenta ni correo definidos de antemano.
import { hmac, safeEqual } from "../../../_lib/session.js";
import { AUTH_COOKIE, GoogleError, completeConnection, oauthConfigured } from "../../../_lib/gcal.js";
import { configured } from "../../../_lib/supabase.js";

const back = (request, result) => {
  const secure = new URL(request.url).protocol === "https:";
  return new Response(null, {
    status: 302,
    headers: {
      location: `/admin/?google=${result}#config`,
      "cache-control": "no-store",
      "set-cookie": `${AUTH_COOKIE}=; Path=/api/admin/google; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
    },
  });
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return back(request, url.searchParams.get("error") === "access_denied" ? "denied" : "error");
  if (!oauthConfigured(env) || !configured(env) || !env.SESSION_SECRET) return back(request, "error");

  const code = url.searchParams.get("code") || "";
  const [exp, nonce, sig] = (url.searchParams.get("state") || "").split(".");
  const cookie = (request.headers.get("Cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${AUTH_COOKIE}=`))?.slice(AUTH_COOKIE.length + 1) || "";
  const [cookieNonce, verifier] = cookie.split(".");
  const valid = code && exp && nonce && sig && cookieNonce && verifier
    && Number(exp) >= Date.now() / 1000
    && nonce === cookieNonce
    && (await safeEqual(env.SESSION_SECRET, sig, await hmac(env.SESSION_SECRET, `gauth.${exp}.${nonce}`)));
  if (!valid) return back(request, "state");

  try {
    await completeConnection(env, { code, verifier });
    return back(request, "connected");
  } catch (e) {
    console.error(e);
    return back(request, e instanceof GoogleError && ["missing_scope", "missing_refresh"].includes(e.code) ? e.code : "error");
  }
}
