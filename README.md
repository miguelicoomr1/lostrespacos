# Los Tres Pacos · Portmán

Web del café-bar Los Tres Pacos (Portmán, La Unión, Murcia): web pública, reservas online, zona privada de gestión y sincronización con Google Calendar.

- **Sin dependencias.** Node ≥ 20 solo para generar `dist/`.
- **Hosting:** Cloudflare Pages (estático + Pages Functions).
- **Base de datos y acceso:** Supabase (Postgres + Auth).
- **Agenda:** Google Calendar, vinculado por el propietario con OAuth 2.0.

## Qué hace la web

### 1. Web pública

| Página | Ruta | Contenido |
|---|---|---|
| Inicio | `/` | Presentación, llamada, ruta en Google Maps y reserva |
| Carta | `/carta/` | Carta y precios, **leídos de la base de datos** en cada visita (con la carta del build como respaldo) |
| Reservas | `/reservas/` | Formulario de reserva; zonas y horas **leídas de la base de datos** |
| Nosotros | `/nosotros/` | Historia del local |
| Galería | `/galeria/` | Fotos |
| Contacto | `/contacto/` | Dirección, teléfono, redes, enlaces a Google Maps |
| Aviso legal | `/aviso-legal/` | Datos del titular (pendientes, ver más abajo) |

Además: barra de acciones fija en móvil (Llamar · Cómo llegar · Reservar), datos estructurados JSON-LD (`Restaurant`/`BarOrPub`, horario, precio, coordenadas), `sitemap.xml`, `robots.txt`, Open Graph, fuentes autoalojadas y **sin cookies ni servicios de terceros**. La CSP es estricta (`script-src 'self'`, sin inline).

### 2. Reservas online

1. El cliente elige fecha, hora, zona y personas, y deja nombre y teléfono en `/reservas/`.
2. `functions/api/reservas.js` valida el formato, comprueba el origen, aplica un anti-bot básico (campo trampa y tiempo mínimo) y llama a la función SQL `book_web`.
3. `book_web` valida **todo** en Postgres, dentro de una transacción con bloqueo: fecha futura, tamaño máximo del grupo, zona activa, hora ofrecida y dentro de un servicio, día no cerrado, límite de 3 solicitudes pendientes por teléfono y **aforo por zona** (solapando la duración de la reserva).
4. La reserva entra como **pendiente**. El personal la confirma por teléfono desde el panel.
5. Si hay una cuenta de Google vinculada, el evento se crea en su calendario (ver más abajo).

Mensajes de error claros al cliente: fecha pasada, grupo demasiado grande, zona no disponible, hora no disponible, día cerrado, demasiadas pendientes, sin sitio en esa zona.

### 3. Zona privada (`/admin/`)

Acceso con **Supabase Auth** (correo + contraseña); solo entran los usuarios de la tabla `admins`. Tras entrar se emite una cookie de sesión propia (HMAC-SHA256, `HttpOnly`, `SameSite=Strict`, 8 h): los tokens de Supabase no salen del servidor. Cuatro pestañas, con guardado explícito y validación en servidor:

- **Reservas:** agenda por día, aforo usado por servicio y zona (aviso si se supera), alta manual, estados (pendiente / confirmada / cancelada), borrado y filtros.
- **Horarios:** servicios y última reserva, duración de cada reserva, máximo de personas por reserva web, horas ofrecidas, zonas y aforo, horario semanal de apertura y días cerrados.
- **Carta y precios:** categorías y platos (alta, baja, orden), precios en texto libre y ajuste porcentual por categoría. Lo que se guarda aparece en `/carta/`.
- **Configuración:** integración con Google Calendar (siguiente apartado).

### 4. Google Calendar

Las reservas se envían solas al Google Calendar que el propietario vincule. **La cuenta de Google no está en el código, ni en variables, ni se conoce durante el desarrollo**: la elige el propietario con OAuth 2.0 desde `/admin/#config`. El correo mostrado sale de Google y puede ser distinto del correo con el que entra a la zona privada.

Desde **Configuración → Google Calendar** el propietario puede:

- **Vincular cuenta de Google:** elige cuenta, autoriza y vuelve al panel.
- **Elegir calendario:** la lista se obtiene de Google. También puede **crear** «Reservas - {nombre del negocio}» (el nombre sale de `negocio.json`).
- **Probar conexión**, **Cambiar calendario**, **Sincronizar ahora** y **Desvincular cuenta**.

Comportamiento:

- Reserva web → `book_web` (Supabase) → evento en el calendario elegido → `google_event_id` guardado en la reserva. Título: `Reserva - Juan (4 pers.)`, con `[Pendiente]` delante si aún no está confirmada.
- Alta, cambio de estado, edición o borrado desde el panel actualizan o retiran el evento. Una reserva *cancelada* o borrada retira su evento.
- Si Google falla, la reserva sigue válida y se reintenta con «Sincronizar ahora» o en el siguiente guardado del panel. Los ids de evento derivan del id de la reserva, así que un reintento nunca duplica.
- **Desvincular / cambiar de cuenta:** revoca el token en Google, borra token y calendario y suelta el vínculo de las reservas. Las reservas de Supabase no se tocan; los eventos ya creados quedan en el calendario antiguo. Al vincular otra cuenta y elegir calendario, las reservas futuras se envían al nuevo.
- Si el propietario revoca el acceso desde su cuenta de Google, el panel muestra «Acceso revocado» y pide volver a vincular.

Detalles técnicos: `functions/_lib/gcal.js` (OAuth con PKCE, `state` firmado y cookie `SameSite=Lax`, cliente de Calendar y `reconcile()`), endpoints en `functions/api/admin/google/`. El *refresh token* se guarda **cifrado** (AES-GCM, clave derivada de `SESSION_SECRET`; cambiar `SESSION_SECRET` obliga a volver a vincular). Permisos pedidos, los mínimos: `calendar.calendarlist.readonly`, `calendar.app.created`, `calendar.events`, más `openid email`.

## Estructura

```
src/
  data/        negocio.json (contacto, dirección, coordenadas, horario, precio, reservas, zonas, redes, legal)
               carta.json   galeria.json
  pages/       una página por archivo .mjs (título, descripción, cuerpo)
  partials/    layout.mjs · schema.mjs (JSON-LD) · dynamic.mjs (zonas que salen de la base de datos)
  assets/      css/ js/ (site.js público, admin.js panel) fonts/ img/
  static/      favicon.svg · _headers · _redirects
functions/     Pages Functions
  api/reservas.js            reserva pública
  api/admin/                 login · logout · session · data (reservas/horarios/carta)
  api/admin/google/          connect · callback · status · calendars · test · sync · disconnect
  carta/ reservas/           páginas estáticas con datos de la base
  _lib/                      session · supabase · validate · overlay · gcal (+ *.gen.js generados en el build)
supabase/      schema.sql · functions.sql · booking.sql · seed.sql · google.sql · gen-seed.mjs
scripts/       build.mjs · dev.mjs · check.mjs
legacy/        panel anterior (Next.js + D1). No se compila ni se publica.
```

## Puesta en marcha

### Supabase

En **SQL Editor**, ejecutar en este orden (todos son idempotentes):

1. `supabase/schema.sql`: tablas y RLS.
2. `supabase/functions.sql`: lectura y guardado por documento.
3. `supabase/booking.sql`: reservas web y guardado de reservas.
4. `supabase/seed.sql`: carga inicial (se regenera con `node supabase/gen-seed.mjs`).
5. `supabase/google.sql`: integración con Google Calendar.

Después, cargar el horario real de apertura desde el panel (Horarios) o con SQL. El panel numera los días con **0 = lunes … 6 = domingo**.

Altas de administrador: Supabase → Authentication → Users → Add user (Auto Confirm) y luego. La tabla `admins` no está en los scripts anteriores; si no existe, créala una vez (sin políticas: solo el servidor accede):

```sql
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade, email text not null);
alter table public.admins enable row level security;

insert into public.admins (user_id, email) select id, email from auth.users where email = 'correo@ejemplo.es';
```

Registro público desactivado (Authentication → Sign In / Providers → Email → *Allow new users to sign up* = off). Contraseña olvidada o cambio: desde Supabase (Users → Send password recovery).

### Google Cloud (una vez, sin conocer la cuenta del cliente)

1. Activar **Google Calendar API**.
2. Google Auth Platform: pantalla de consentimiento (*Externo*), añadir los tres permisos de Calendar y, mientras esté en *Testing*, los usuarios de prueba. **Publicar la aplicación antes de entregarla**: en *Testing* los tokens caducan a los 7 días.
3. Credenciales → ID de cliente OAuth, tipo *Aplicación web*, con estos URI de redirección: `https://TU-DOMINIO/api/admin/google/callback` y, para local, `http://localhost:4173/api/admin/google/callback`.

### Cloudflare Pages

- **Build command:** `node scripts/build.mjs` · **Build output directory:** `dist` · **Root directory:** vacío.
- Sin build command el sitio se publica vacío (404 en todas las páginas): `dist/` no está en git.

Variables (Settings → Variables and Secrets; tras cambiarlas hay que **volver a desplegar**):

| Variable | Tipo | Valor |
|---|---|---|
| `NODE_VERSION` | texto | `20` |
| `SITE_URL` | texto | `https://www.midominio.es` (sin barra final). Solo en *Production*. Activa canonical, Open Graph, sitemap.xml e indexación; sin ella la web sale `noindex` y `robots.txt` bloquea todo |
| `SUPABASE_URL` | texto | URL del proyecto |
| `SUPABASE_PUBLISHABLE_KEY` | texto | clave publicable (`sb_publishable_…`), solo para el login |
| `SUPABASE_SECRET_KEY` | secreto | clave secreta (`sb_secret_…`): datos y comprobación de `admins` |
| `SESSION_SECRET` | secreto | cadena aleatoria larga (`openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` | texto | ID de cliente OAuth |
| `GOOGLE_CLIENT_SECRET` | secreto | secreto de cliente OAuth |
| `GOOGLE_REDIRECT_URI` | texto | `https://TU-DOMINIO/api/admin/google/callback`, idéntico al de Google Cloud |

Las claves de Google y la `SUPABASE_SECRET_KEY` viven **solo en el servidor**: nunca en el código ni en `dist/`. `.env*`, `.dev.vars` y `.dev-data/` están en `.gitignore`.

Antes de publicar, conviene activar una regla de *rate limiting* de Cloudflare sobre `/api/admin/login` (requiere dominio propio).

### Entrega al propietario

Tras el despliegue, el propietario solo tiene que: entrar en `/admin/` → **Configuración** → **Vincular cuenta de Google** → elegir su cuenta y autorizar → elegir o crear el calendario. No hace falta tocar código.

## Desarrollo local

```
npm run build   # genera dist/
npm run dev     # build + servidor en http://localhost:4173 (emula las Pages Functions)
npm run check   # build + auditoría de enlaces, alt, encabezados, JSON-LD, metadatos y CSP
```

Copiar `.dev.vars.example` a `.dev.vars` y rellenarlo (Supabase, `SESSION_SECRET` y, para probar Google, las tres `GOOGLE_*` con `GOOGLE_REDIRECT_URI=http://localhost:4173/api/admin/google/callback`). `npm run dev` lo lee al arrancar. **No sirve Live Server** (puerto 5500): no ejecuta las funciones ni compila.

## Editar contenido

- Teléfono, dirección, coordenadas, horario, precio, redes, zonas y datos legales: `src/data/negocio.json`.
- Carta base y galería: `src/data/carta.json`, `src/data/galeria.json`. La carta en vivo se edita desde el panel.
- Tras cambiar `src/data/*`, volver a compilar y desplegar.

## Seguridad

- Cookie de sesión `HttpOnly`, `SameSite=Strict`, con `Secure` en HTTPS; comprobación de `Origin` en todas las escrituras.
- Mismo mensaje para «no existe», «contraseña mala» y «no es administrador».
- RLS activado en todas las tablas; `reservations`, `integrations` y `gcal_deletions` sin políticas: solo accede el servidor con la secret key.
- La reserva pública no puede saltarse el aforo ni los horarios: se valida en Postgres, no en el navegador.
- Quitar a alguien de `admins` no cierra su sesión abierta hasta que caduque (8 h máx.).
- Guardar reservas desde el panel solo borra las que existían al cargar (`at`), para no perder reservas web recientes. Limitación conocida: cada documento se guarda entero; dos administradores editando a la vez pisarían cambios.

## Datos pendientes (no inventados)

| Dato | Dónde | Efecto |
|---|---|---|
| Titular legal (nombre, NIF, domicilio, email) | `negocio.json → legal` | completa `/aviso-legal/` (ahora `noindex` con marcas [PENDIENTE]) |
| Fotos del local, la comida y el interior | `src/assets/img/` + `galeria.json` | la galería solo tiene la fachada |
| Significado de los dos precios («4,00€ / 5,00€») | `carta.json` | ¿tapa/ración? Conviene rotularlo |
| Arroces | `nosotros.mjs` los menciona, la carta no los lista | confirmar |
| Última reserva de cena 22:30 = cierre del servicio | `negocio.json → reservations` | confirmar |

## Notas

- **Bloqueos de LaLiga:** en días de partido, los operadores españoles bloquean IPs de Cloudflare y la web (`pages.dev` incluido) puede tardar o no cargar. Es ajeno al código; un dominio propio reduce el riesgo, no lo elimina. Estado en vivo: hayahora.futbol.
- `legacy/` conserva el panel anterior (contraseña única + D1) solo como referencia funcional. No reutilizar su autenticación.

---

Web desarrollada por [MiguelicooMR1](https://miguelicoomr1.github.io/portfolio/).
