import { cookies } from "next/headers";
import { AdminLogin } from "../../components/admin-login";
import { AdminDashboard } from "../../components/admin-dashboard";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { isAdminSession } from "../../lib/admin-session";
export const dynamic = "force-dynamic";
export default async function Admin(){const store=await cookies();const authorized=await isAdminSession(store.get("l3p_admin")?.value);return <main className="page-shell"><SiteHeader/><p className="section-label">ZONA PRIVADA</p><h1 className="page-title">{authorized?"Buenas, equipo.":"Acceso privado."}</h1>{authorized?<AdminDashboard/>:<section className="admin-notice"><p className="section-label">LOS TRES PACOS</p><h2>Solo personal autorizado.</h2><p>Introduce la contraseña de administración para continuar.</p><AdminLogin/></section>}<SiteFooter/></main>}
