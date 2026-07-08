# QR Router

Generador local de QR estaticos y dinamicos para enlaces. El QR dinamico guarda una URL fija como `/r/insta`; el destino real vive en la base de datos y puede cambiar sin reimprimir el QR.

## Stack

- Next.js 16 + React 19 + TypeScript
- Prisma 6 + PostgreSQL en Supabase
- `qrcode.react` para preview SVG
- `qrcode` para exportar SVG/PNG desde API
- Tailwind CSS 4

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

El proyecto apunta a Supabase por medio de `DATABASE_URL`. Copia `.env.example` a `.env` y reemplaza `YOUR_DATABASE_PASSWORD`.

Para aplicar migraciones pendientes:

```bash
npm run db:deploy
```

Las tablas fisicas en Supabase usan prefijo del proyecto para no confundirse con otros datos:

```txt
bliss_qr_links
bliss_qr_styles
bliss_qr_visits
bliss_qr_destination_versions
```

## Variables

Copia `.env.example` a `.env`:

```env
DATABASE_URL="postgresql://postgres.yqgnssxyimiigoewiidr:YOUR_DATABASE_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?schema=public&connection_limit=1"
SUPABASE_URL="https://yqgnssxyimiigoewiidr.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
APP_BASE_URL="http://localhost:3000"
IP_HASH_SECRET="replace-with-a-long-random-string"
```

Para probar desde un celular en la misma red, usa la IP local de tu PC en `APP_BASE_URL`, por ejemplo:

```env
APP_BASE_URL="http://192.168.1.20:3000"
```

## Scripts

```bash
npm run dev        # servidor local
npm run build      # build de produccion
npm run lint       # ESLint
npm run db:setup   # crea SQLite local desde SQL
npm run db:studio  # abre Prisma Studio
```

## QR dinamico

Un QR dinamico contiene:

```txt
https://q.tudominio.com/r/insta
```

La base de datos guarda:

```txt
insta -> https://www.instagram.com/tu_usuario
```

Cuando editas el destino, el QR sigue apuntando a `/r/insta`, pero la redireccion cambia.

## Vercel + GitHub + Supabase

El repo puede desplegarse en Vercel desde GitHub. En Vercel configura estas variables:

```env
DATABASE_URL="postgresql://postgres.yqgnssxyimiigoewiidr:YOUR_DATABASE_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?schema=public&connection_limit=1"
SUPABASE_URL="https://yqgnssxyimiigoewiidr.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
APP_BASE_URL="https://q.tudominio.com"
IP_HASH_SECRET="un-secreto-largo"
```

En runtime, la app usa `SUPABASE_SERVICE_ROLE_KEY` de forma server-side para leer y escribir en Supabase sin exponer esa clave al navegador. `DATABASE_URL` se conserva para Prisma y migraciones.

Conecta el repo de GitHub en Vercel y asigna un dominio fijo como `q.tudominio.com`.

Para QRs impresos, usa siempre el dominio final de produccion, no una URL preview de Vercel.

## Endpoints

- `GET /api/links`
- `POST /api/links`
- `GET /api/links/:id`
- `PATCH /api/links/:id`
- `DELETE /api/links/:id`
- `GET /api/links/:id/qr?format=svg|png`
- `GET /r/:slug`

## Pendientes naturales

- Login/admin antes de publicar.
- Rate limiting para creacion y redireccion.
- Dominio custom corto.
- Mas analitica por dispositivo/pais si lo necesitas.
