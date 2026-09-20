import { env } from "cloudflare:workers";
const encoder = new TextEncoder();
function toBase64(bytes: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
async function sign(value: string) { const key = await crypto.subtle.importKey("raw", encoder.encode(env.ADMIN_PASSWORD), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return toBase64(await crypto.subtle.sign("HMAC", key, encoder.encode(value))); }
export async function createAdminSession() { const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8; return `${expires}.${await sign(String(expires))}`; }
export async function isAdminSession(token?: string) { if (!token || !env.ADMIN_PASSWORD) return false; const [expires, signature] = token.split("."); if (!expires || !signature || Number(expires) < Date.now() / 1000) return false; return signature === await sign(expires); }
