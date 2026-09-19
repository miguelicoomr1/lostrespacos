import Link from "next/link";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

const dishes = ["Arroz con pulpo", "Calamares", "Pescado a la plancha", "Tapas", "Michirones"];

export default function Nosotros() {
  return <main className="page-shell story-page"><SiteHeader />
    <section className="story-hero"><p className="section-label">NOSOTROS · PORTMÁN</p><h1 className="page-title">Una casa<br />del pueblo.</h1><p className="page-lead">Los Tres Pacos es café-bar, cocina y punto de encuentro en la costera localidad de Portmán, dentro del municipio de La Unión.</p></section>
    <section className="story-image" aria-label="Fachada de Los Tres Pacos y su ilustración de Portmán" role="img"><p>PORTMÁN · MURCIA</p></section>
    <section className="story-grid"><p className="section-label">UNA HISTORIA COMPARTIDA</p><div><h2>Más de tres<br /><em>décadas</em> a la mesa.</h2><p>Una publicación del canal verificado La Unión Ciudad del Cante y Minera, de 2017, sitúa el origen de Los Tres Pacos más de treinta años atrás y lo vincula a Francisca, Francisco y su hijo Francisco. Es una historia familiar que forma parte del recuerdo del establecimiento.</p><p>El bar está en el corazón de Portmán: prensa y publicaciones locales lo retratan como lugar de parada para vecinos, caminantes y reuniones del pueblo. También ha participado en la vida festiva local.</p></div></section>
    <section className="story-food"><div><p className="section-label">COCINA DE CERCA</p><h2>Mar, arroz<br />y barra.</h2></div><div><p>La propuesta se apoya en la cocina tradicional murciana, con producto fresco y de proximidad. En la carta conviven arroces, pescados y mariscos, carnes y tapas para compartir.</p><ul>{dishes.map(dish => <li key={dish}>{dish}</li>)}</ul><Link className="button button-dark" href="/carta">Ver la carta</Link></div></section>
    <section className="story-note"><p>Una fuente local informó de la reforma de los espacios del restaurante en 2023 para acoger a más comensales en un entorno renovado.</p><a href="https://www.facebook.com/lostrespacos" target="_blank" rel="noreferrer">Seguir la actualidad en Facebook ↗</a></section>
    <section className="story-sources"><p className="section-label">FUENTES</p><p>Información contrastada a partir de la ficha turística regional, una publicación histórica local y medios/comercios de Portmán. Cuando se aporte una cronología oficial del negocio, esta página se actualizará con ella.</p></section><SiteFooter />
  </main>;
}
