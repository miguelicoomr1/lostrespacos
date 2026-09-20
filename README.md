# Los Tres Pacos · Portmán

Web pública estática, sin dependencias. Node ≥ 20 solo para generar `dist/`.

```
npm run build   # genera dist/
npm run dev     # build + servidor local en http://localhost:4173
npm run check   # build + auditoría de enlaces, alt, encabezados, JSON-LD, CSP
```

## Estructura

```
src/
  data/        negocio.json (teléfono, dirección, horarios de reserva, zonas, redes, legal)
               carta.json   (carta y precios)   galeria.json
  pages/       una página por archivo .mjs (título, descripción, cuerpo)
  partials/    layout.mjs (head, cabecera, pie, barra móvil) · schema.mjs (JSON-LD)
  assets/      css/ js/ fonts/ img/
  static/      favicon.svg · _headers · _redirects
scripts/       build.mjs · dev.mjs · check.mjs
legacy/        código anterior de panel privado (Next.js + D1). No se compila ni se publica.
```

Editar la carta, los teléfonos o las zonas = tocar `src/data/*.json` y volver a compilar.

## Despliegue (Cloudflare Pages)

- Build command: `node scripts/build.mjs` · Output directory: `dist`
- Variable de entorno **`SITE_URL`** (p. ej. `https://www.midominio.es`, sin barra final) solo en *Production*.
  Con ella se activan canonical, Open Graph, sitemap.xml e indexación. Sin ella la web sale `noindex` y `robots.txt` bloquea todo (evita indexar entornos de prueba).
- `_headers` aplica CSP estricta (`script-src 'self'`, sin inline), HSTS y caché larga para CSS/JS con hash y fuentes.
- `_redirects` reenvía las URLs antiguas (`/pages/carta.html` → `/carta/`).

## Datos pendientes (no inventados)

| Dato | Dónde | Efecto |
|---|---|---|
| Dominio final | `SITE_URL` | canonical, OG, sitemap, JSON-LD con URL |
| Horario de apertura | `negocio.json → openingHours` (formato Schema.org `OpeningHoursSpecification`) | aparece en JSON-LD |
| Coordenadas | `negocio.json → geo` `{lat,lng}` | `GeoCoordinates` en JSON-LD |
| Rango de precios | `negocio.json → priceRange` | `priceRange` en JSON-LD |
| Titular legal (nombre, NIF, domicilio, email) | `negocio.json → legal` | completa `/aviso-legal/` (ahora `noindex` con marcas [PENDIENTE]) |
| Fotos del local, la comida y el interior | `src/assets/img/` + `galeria.json` | la galería solo tiene la fachada |
| Significado de los dos precios («4,00€ / 5,00€») | `carta.json` | ¿tapa/ración? Conviene rotularlo |
| Arroces | `nosotros.mjs` los menciona, la carta no los lista | confirmar |
| Última reserva de cena 22:30 = cierre del servicio | `negocio.json → reservations` | confirmar |

## Preparación fase 2 (Cloudflare + Supabase)

Nada de esto está implementado; solo se ha dejado el terreno:

- `/admin/` y `/api/` reservados: `robots.txt` los excluye, `_headers` los marca `noindex` y `no-store`. La zona privada vivirá ahí (Pages Functions en `functions/`, o SPA en `src/admin`).
- La CSP tiene `connect-src 'self'`; al añadir Supabase basta con sumar su URL de proyecto.
- Datos de negocio, carta, zonas y horarios ya están separados del HTML (`src/data/`), con los mismos campos que tendrán las tablas (`zones`, `menu_items`, `reservations`…). Sustituir el JSON por una consulta a Supabase en el build (o en runtime) no toca las plantillas.
- El formulario de reservas lleva `data-reservation-form`; su lógica está aislada en `src/assets/js/site.js`.
- **Claves**: en frontend solo puede vivir la `anon key` de Supabase y la URL del proyecto (públicas, protegidas por RLS). La `service_role key`, cualquier secreto y las contraseñas viven únicamente como *secrets* de Cloudflare / variables del servidor. `.env*` está en `.gitignore`.
- `legacy/` conserva el panel anterior (contraseña única + D1) como referencia funcional: agenda, zonas, carta y galería. No reutilizar su autenticación: se sustituirá por Supabase Auth.

Las fuentes están autoalojadas (Barlow, licencia OFL en `src/assets/fonts/OFL-barlow.txt`). La web no usa cookies ni servicios de terceros.

## Zona privada (acceso de administrador)

Enlace «Zona privada» en el menú superior → `/admin/`. El formulario llama a Pages Functions (`functions/api/admin/`: `login`, `session`, `logout`).

**Autenticación: Supabase Auth** (correo + contraseña). `login` valida contra Supabase y solo deja entrar a los usuarios de la tabla `admins`. Tras entrar se emite una cookie de sesión propia (HMAC-SHA256, `HttpOnly`, `SameSite=Strict`, 8 h); los tokens de Supabase no salen del servidor. Quitar a alguien de `admins` no cierra su sesión abierta hasta que caduque (8 h máx.).

- Altas: Supabase → Authentication → Users → Add user (Auto Confirm) y luego `insert into public.admins (user_id, email) select id, email from auth.users where email = '…'`.
- Registro público desactivado (Authentication → Sign In / Providers → Email → *Allow new users to sign up* = off).
- Contraseña olvidada / cambio: desde Supabase (Users → Send password recovery). Conviene activar MFA cuando haya SMTP propio.

Variables de servidor (nunca en el código ni en `dist/`):

| Variable | Tipo | Valor |
|---|---|---|
| `SUPABASE_URL` | texto | URL del proyecto |
| `SUPABASE_PUBLISHABLE_KEY` | texto | clave publicable (`sb_publishable_…`), solo para el login |
| `SUPABASE_SECRET_KEY` | secreto | clave secreta (`sb_secret_…`): datos y comprobación de `admins` |
| `SESSION_SECRET` | secreto | cadena aleatoria larga (`openssl rand -hex 32`) |

- **Cloudflare Pages:** Settings → Variables and Secrets. Tras cambiar variables hay que volver a desplegar.
- **Local:** `.dev.vars` (ignorado por git). `npm run dev` lo lee y emula las funciones.
- Antes de publicar, activa una regla de *rate limiting* de Cloudflare sobre `/api/admin/login` (requiere dominio propio).
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` ya no se usan: bórralas de Cloudflare y de `.dev.vars`.

## Panel de gestión (`/admin/`)

Tres pestañas, con guardado explícito y validación en servidor:

- **Reservas**: agenda por día, aforo usado por servicio y zona (aviso si se supera), alta manual, estados (pendiente/confirmada/cancelada) y borrado.
- **Horarios**: servicios y última reserva, duración, horas ofrecidas, zonas y aforo, horario semanal de apertura y días cerrados.
- **Carta y precios**: categorías y platos (alta, baja, orden), precios en texto libre y ajuste porcentual por categoría.

Datos: `functions/api/admin/data.js` (`GET/PUT ?doc=reservas|horarios|carta`), validados en `functions/_lib/validate.js`. Valores iniciales en `functions/_lib/defaults.gen.js` (generado en cada build desde `src/data`).

**Almacenamiento**: KV de Cloudflare enlazado como `STORE` (Pages → Settings → Bindings → KV namespace). Sin ese enlace la API responde 503. En local `npm run dev` lo emula con archivos en `.dev-data/` (ignorado por git). Limitación conocida: cada documento se guarda entero (dos administradores editando a la vez pisarían cambios).

**Pendiente para Supabase**: solo hay que reescribir `read`/`write` de `data.js` (tablas `reservations`, `menu_items`, `zones`, `closed_dates`…). El panel no cambia.

**Aún no conectado a la web pública**: lo guardado en el panel no modifica `/carta/` ni el horario público, que siguen saliendo de `src/data/*.json` en el build. Conectarlos (lectura desde la base de datos en el build o en tiempo de ejecución) y recibir reservas desde el formulario web son los siguientes pasos.

## Google Calendar (zona privada → Configuración)

Las reservas se envían solas al Google Calendar que el propietario vincule. **La cuenta de Google no está en el código, ni en variables, ni se conoce durante el desarrollo**: la elige el propietario con OAuth 2.0 desde `/admin/#config` → «Vincular cuenta de Google» (elige cuenta, autoriza, elige o crea el calendario). El correo mostrado sale de Google, y puede ser distinto del correo con el que entra a la zona privada.

**Puesta en marcha técnica (una vez, sin conocer la cuenta del cliente)**

1. Supabase → SQL Editor: ejecutar `supabase/google.sql` (tabla `integrations`, columnas `google_*` en `reservations`, cola `gcal_deletions`).
2. Google Cloud Console: activar *Google Calendar API*; pantalla de consentimiento; credencial *OAuth client ID* tipo *Web application* con *Authorized redirect URI* = `https://TU-DOMINIO/api/admin/google/callback` (y `http://localhost:4173/api/admin/google/callback` para local). Mientras la app esté en modo *Testing*, Google caduca los tokens a los 7 días: publicarla (*In production*) antes de entregar.
3. Cloudflare Pages (o `.dev.vars`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (secreto), `GOOGLE_REDIRECT_URI`. Solo servidor; nada llega al frontend.

**Permisos pedidos** (mínimos): `calendar.calendarlist.readonly` (listar calendarios), `calendar.app.created` (crear «Reservas - {nombre del negocio}», tomado de `negocio.json`), `calendar.events` (crear/editar/borrar eventos), más `openid email` para leer el correo de la cuenta.

**Cómo funciona**

- `functions/_lib/gcal.js`: OAuth (PKCE + `state` firmado + cookie SameSite=Lax; la de sesión es Strict y no viaja de vuelta desde Google), cliente de Calendar y `reconcile()`.
- El *refresh token* se guarda **cifrado** (AES-GCM, clave derivada de `SESSION_SECRET`) en `integrations`. Cambiar `SESSION_SECRET` obliga a volver a vincular.
- Reserva web → `book_web` (Supabase) → `reconcile(id)` en segundo plano → evento en el calendario elegido → `google_event_id` en la reserva. Si Google falla, la reserva sigue válida y se reintenta con «Sincronizar ahora» o en el siguiente guardado del panel.
- El panel (alta, cambio de estado, borrado, cambio de duración) también dispara `reconcile()`: *cancelada* o borrada = evento retirado; cambios = evento actualizado (una huella `google_sync_hash` evita llamadas repetidas). Los ids de evento derivan del id de la reserva, así que un reintento nunca duplica.
- **Desvincular / cambiar de cuenta**: revoca el token en Google, borra token y calendario y suelta el vínculo de las reservas. Las reservas de Supabase no se tocan; los eventos ya creados quedan en el calendario antiguo. Al vincular otra cuenta y elegir calendario, las reservas futuras se envían al nuevo.
- Si el propietario revoca el acceso desde su cuenta de Google, el panel muestra «Acceso revocado» y pide volver a vincular.
