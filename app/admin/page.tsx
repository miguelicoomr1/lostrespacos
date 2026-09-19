import { cookies } from "next/headers";
import { AdminLogin } from "../../components/admin-login";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { isAdminSession } from "../../lib/admin-session";
export const dynamic = "force-dynamic";
export default async function Admin(){const store=await cookies();const authorized=await isAdminSession(store.get("l3p_admin")?.value);return <main className="page-shell"><SiteHeader/><p className="section-label">ZONA PRIVADA</p><h1 className="page-title">{authorized?"Buenas, equipo.":"Acceso privado."}</h1>{authorized?<section className="admin-notice"><p className="section-label">SESIÓN ACTIVA</p><h2>Panel de gestión</h2><p>Desde aquí se habilitarán la agenda, las zonas, las capacidades, la carta y la galería al completar la configuración operativa.</p></section>:<section className="admin-notice"><p className="section-label">LOS TRES PACOS</p><h2>Solo personal autorizado.</h2><p>Introduce la contraseña de administración para continuar.</p><AdminLogin/></section>}<SiteFooter/></main>}
