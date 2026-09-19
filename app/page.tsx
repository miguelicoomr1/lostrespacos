import Link from "next/link";
import { CookieBanner } from "../components/cookie-banner";

const highlights = [
  ["Arroz con pulpo", "La especialidad que define la casa."],
  ["Calamares", "Un clásico para compartir."],
  ["Michirones", "Tradición murciana en la mesa."],
];

export default function Home() {
  return <main>
    <section className="hero" id="inicio">
      <nav className="nav" aria-label="Navegación principal"><Link href="#inicio" className="wordmark">LOS TRES PACOS</Link><div className="nav-links"><Link href="/carta">Carta</Link><Link href="/galeria">Galería</Link><Link href="/contacto">Contacto</Link></div><Link href="/reservas" className="nav-book">Reservar</Link></nav>
      <div className="hero-photo" aria-hidden="true" /><div className="hero-shade" />
      <div className="hero-copy"><p className="place">PORTMÁN · MURCIA</p><h1>El sabor de<br />estar aquí.</h1><p className="hero-intro">Café, bar y cocina de siempre junto al Mediterráneo.</p><div className="hero-actions"><Link href="/reservas" className="button button-light">Reservar mesa</Link><Link href="/carta" className="text-link">Ver carta <span>↗</span></Link></div></div>
      <div className="ceramic-orbit" aria-hidden="true"><div /><i /><b /></div><p className="hero-scroll">BAJAR PARA DESCUBRIR</p>
    </section>
    <section className="manifesto"><p className="section-label">LOS TRES PACOS · PORTMÁN</p><div className="manifesto-grid"><h2>Una mesa de<br /><em>cerca.</em></h2><p>En la costera localidad de Portmán, Los Tres Pacos reúne una cocina tradicional murciana, producto de la zona y una forma de recibir que se disfruta sin prisa.</p></div></section>
    <section className="photo-slice"><div className="slice-image" /><div className="slice-ink"><p>TRADICIÓN · MAR · MESA</p><p>CAFÉ · BAR · PORTMÁN</p></div></section>
    <section className="highlights"><div><p className="section-label">EN LA MESA</p><h2>Los sabores<br />que vuelven.</h2></div><div className="highlight-list">{highlights.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div><Link href="/carta" aria-label={`Ver ${title} en la carta`}>↗</Link></article>)}</div></section>
    <section className="reserve-banner"><div><p className="section-label">TU MESA EN PORTMÁN</p><h2>Nos vemos<br /><em>en la mesa.</em></h2></div><div className="reserve-card"><p>Comida</p><strong>13:00 — 15:30</strong><p>Cena</p><strong>19:30 — 22:30</strong><Link href="/reservas" className="button button-dark">Elegir una mesa</Link></div></section>
    <footer className="footer"><div><p className="footer-logo">LOS TRES<br />PACOS</p><p>Portmán, Murcia</p></div><div><a href="tel:+34968548498">968 54 84 98</a><a href="https://www.facebook.com/lostrespacos" target="_blank" rel="noreferrer">Facebook</a><a href="https://www.instagram.com/lospacosportman/" target="_blank" rel="noreferrer">Instagram</a></div><div><Link href="/aviso-legal">Aviso legal</Link><Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/politica-cancelacion">Política de cancelación</Link></div><p className="credit">Diseñado y desarrollado por <a href="https://miguelicoomr1.github.io/portfolio/" target="_blank" rel="noreferrer">MiguelicooMR1</a></p></footer>
    <a href="tel:+34968548498" className="call-fab" aria-label="Llamar a Los Tres Pacos">Llamar <span>↗</span></a><CookieBanner />
  </main>;
}
