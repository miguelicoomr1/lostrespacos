import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { createAdminSession } from "../../../../lib/admin-session";
export async function POST(request: Request) { const { password } = await request.json().catch(() => ({ password: "" })); if (!env.ADMIN_PASSWORD) return Response.json({ error: "La zona privada aún no está configurada." }, { status: 503 }); if (password !== env.ADMIN_PASSWORD) return Response.json({ error: "Contraseña incorrecta." }, { status: 401 }); const store = await cookies(); store.set("l3p_admin", await createAdminSession(), { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 }); return Response.json({ ok: true }); }
