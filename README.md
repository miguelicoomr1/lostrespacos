# Los Tres Pacos · Portmán

## Web pública

Web estática en HTML, CSS y JavaScript. Abre index.html directamente; no necesita instalación ni compilación.

- index.html: inicio.
- pages/: nosotros, carta completa, galería, reservas y contacto.
- assets/: estilos y navegación móvil, más el comportamiento original del formulario.
- public/images/: imágenes del establecimiento.

Para GitHub Pages, publica la rama main desde la raíz del repositorio.

## Reservas

El formulario de pages/reservas.html conserva sus campos y su comportamiento original: muestra un mensaje para confirmar por teléfono. Todavía no envía ni guarda solicitudes. La carta conserva los 55 platos recuperados.

## Panel privado conservado para la próxima integración

Se conserva el código original del panel (agenda, zonas, carta y galería), el acceso privado y las rutas de reservas:

- app/admin/ y components/admin-*.tsx: panel y acceso.
- app/api/admin/ y app/api/reservations/: rutas originales del servidor.
- app/reservas/: formulario original de la versión con servidor.
- app/layout.tsx, app/globals.css y components/site-chrome.tsx: presentación original.
- lib/, db/ y drizzle/: sesión, catálogo, lógica y esquema originales.

Este código queda pendiente de configurar y no se ejecuta en GitHub Pages. El enlace «Zona privada» de la portada conserva la dirección anterior del panel; no se ha comprobado su despliegue.

La implementación conservada utiliza Cloudflare D1 y una contraseña de administración. La conexión con Supabase, la adaptación del esquema y de la autenticación, y la configuración de compilación y despliegue en Cloudflare quedan para más adelante. No se han añadido credenciales ni activado servicios.

Las fuentes de la web pública se cargan desde Google Fonts. Antes de publicar, completa la información legal del titular con sus datos reales.
