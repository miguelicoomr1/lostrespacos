import Link from "next/link";

export function SiteHeader({ current }: { current?: string }) {
  return <header className="site-header">
    <Link href="/" className="site-logo">LOS TRES PACOS</Link>
    <nav aria-label="Navegación principal" className="site-nav">
      <Link className={current === "carta" ? "active" : ""} href="/carta">Carta</Link>
      <Link className={current === "galeria" ? "active" : ""} href="/galeria">Galería</Link>
      <Link className={current === "contacto" ? "active" : ""} href="/contacto">Contacto</Link>
    </nav>
    <Link href="/reservas" className="site-book">Reservar</Link>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><p>LOS TRES PACOS · PORTMÁN, MURCIA</p><a href="tel:+34968548498">968 54 84 98</a><Link href="/reservas">Reservar mesa</Link></footer>;
}
