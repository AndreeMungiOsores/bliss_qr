# QR Router

Generador local de QR estaticos y dinamicos para enlaces. El QR dinamico guarda una URL fija como `/r/insta`; el destino real vive en la base de datos y puede cambiar sin reimprimir el QR.

## Stack

- Next.js 16 + React 19 + TypeScript
- Prisma 6 + SQLite local
- `qrcode.react` para preview SVG
- `qrcode` para exportar SVG/PNG desde API
- Tailwind CSS 4

## Desarrollo local

```bash
npm install
npm run db:setup
npm run dev
```

Abre `http://localhost:3000`.

`npm run db:setup` crea `prisma/dev.db` usando la migracion SQL incluida. Tambien puedes usar Prisma Migrate en otra maquina con:

```bash
npm run db:migrate -- --name init
```

En este entorno Windows, `prisma migrate dev` devolvio un error interno del schema engine sin detalle, por eso el proyecto incluye el setup SQLite directo.

## Variables

Copia `.env.example` a `.env`:

```env
DATABASE_URL="file:./dev.db"
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

## Vercel + GitHub

El repo puede desplegarse en Vercel desde GitHub. Para produccion no uses SQLite, porque el filesystem de Vercel no es persistente para una base local.

Recomendado:

1. Crea una base Postgres en Neon, Supabase o Prisma Postgres.
2. Cambia `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Configura variables en Vercel:

```env
DATABASE_URL="postgresql://..."
APP_BASE_URL="https://q.tudominio.com"
IP_HASH_SECRET="un-secreto-largo"
```

4. Ejecuta migraciones contra Postgres desde local:

```bash
npm run db:migrate -- --name init
```

5. Conecta el repo de GitHub en Vercel y asigna un dominio fijo como `q.tudominio.com`.

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
- Postgres en produccion.
- Dominio custom corto.
- Mas analitica por dispositivo/pais si lo necesitas.
