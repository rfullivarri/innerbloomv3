# Gamification Platform (Next.js + Railway + Neon + Clerk)

Esta carpeta contiene una re-implementación moderna del landing de gamificación utilizando un stack basado en **Next.js**. El objetivo es preparar el proyecto para ejecutarse en Railway, utilizar Neon como proveedor de PostgreSQL y Clerk como solución de autenticación. Además, toda la maquetación se estandariza con Tailwind CSS.

## Estructura

- `app/`: Rutas del App Router de Next.js, incluyendo la página pública y rutas protegidas.
- `components/`: Componentes reutilizables del frontend.
- `lib/`: Utilidades compartidas (conexión a base de datos, clientes de Clerk, helpers de estilos).
- `public/`: Recursos estáticos compartidos.
- `styles/`: Hojas de estilo globales.
- `env.example`: Variables de entorno requeridas para desplegar la aplicación.

## Variables de entorno

Copia `env.example` a `.env.local` (para desarrollo local) o configúralas como variables en Railway:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL=postgresql://<usuario>:<password>@<host>/<database>?sslmode=require
NEXT_PUBLIC_APP_URL=https://<tu-subdominio>.up.railway.app
```

Para Neon, obtén la cadena de conexión en la consola y pégala en `DATABASE_URL`.

## Scripts disponibles

- `npm run dev`: Ejecuta Next.js en modo desarrollo.
- `npm run build`: Construye la aplicación para producción.
- `npm run start`: Sirve la build de producción (ideal para Railway).
- `npm run lint`: Ejecuta los chequeos de ESLint.

> [!NOTE]
> Todos los comandos anteriores delegan en `scripts/run-next.mjs`, que fuerza la variable de entorno `NEXT_IGNORE_INCORRECT_LOCKFILE` para evitar que Next.js intente "parchear" el `package-lock.json` cuando se trabaja sin conexión o detrás de proxys restringidos. Esto elimina las advertencias como `Found lockfile missing swc dependencies` y permite desarrollar sin fricciones en entornos offline o con políticas de red estrictas.

## Despliegue en Railway

1. Crea un nuevo proyecto en Railway y sube este repositorio.
2. Añade un servicio de base de datos PostgreSQL en Neon y configura la variable `DATABASE_URL` en Railway.
3. Configura las variables de Clerk (publishable y secret key).
4. Ejecuta `npm install` y `npm run build` como parte del deploy.

## Clerk

La aplicación está integrada con Clerk mediante el middleware y los componentes que provee `@clerk/nextjs`. Las rutas bajo `/dashboard` están protegidas y requieren sesión válida.

## Estado actual

Esta migración crea la base del proyecto moderno sin eliminar los archivos originales. Puedes continuar desarrollando nuevas funcionalidades dentro de la carpeta `npm`.
