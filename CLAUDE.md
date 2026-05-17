# CLAUDE.md — BarcoForms

Documento de reglas de trabajo para el agente. Leerlo completo antes de escribir cualquier código.

> **Nota Next.js:** Esta versión puede tener cambios de API respecto a versiones anteriores. Ante dudas, consultar `node_modules/next/dist/docs/`.

## Fuente de verdad

- **Spec completa:** `base/BARCO_TRD_v1.md`
- **Referencia visual:** `base/ux-1.png`, `base/ux-2.png`, `base/ux-3.png`
- Este archivo define *cómo* trabajar; el TRD define *qué* construir.

---

## Stack — versiones fijas

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 15.x |
| UI | shadcn/ui + Tailwind CSS | latest |
| Animaciones | Framer Motion | 11.x |
| Base de datos | Supabase (PostgreSQL) | cliente JS v2 |
| Auth | Supabase Auth | incluido en cliente v2 |
| Storage | Supabase Storage | incluido en cliente v2 |
| IA | Anthropic SDK (`claude-sonnet-4-6`) | latest |
| Email | Resend | latest |
| PDF | @react-pdf/renderer | latest |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable | latest |
| Validación | Zod | latest |
| Hosting | Vercel | — |

No cambiar ninguna de estas elecciones sin preguntar primero.

---

## Estructura de carpetas (respetar siempre)

```
/
├── app/
│   ├── admin/          → Panel protegido (auth guard en layout)
│   ├── f/[token]/      → Formulario público
│   └── api/            → Route handlers
├── components/
│   ├── admin/          → Componentes del panel
│   └── public/         → Componentes del formulario público
├── lib/
│   ├── supabase/       → client.ts (browser) y server.ts (SSR)
│   ├── anthropic.ts
│   ├── resend.ts
│   └── pdf.ts
└── types/
    └── index.ts        → Tipos TypeScript del dominio
```

No crear carpetas fuera de esta estructura sin consultar.

---

## Reglas de trabajo

### Lo que el agente puede hacer libremente
- Leer archivos del proyecto
- Escribir y editar código dentro de la estructura definida
- Instalar dependencias que estén en el stack aprobado
- Ejecutar `npm run dev`, `npm run build`, `npx tsc --noEmit`

### Lo que el agente debe preguntar antes de hacer
- Cambiar el schema SQL de Supabase (cualquier ALTER TABLE o cambio de políticas RLS)
- Agregar una dependencia que no esté en el stack aprobado
- Modificar `tailwind.config.ts` o el sistema de diseño base
- Crear o modificar variables de entorno (`.env.local`)
- Tocar la configuración de Vercel o Supabase fuera del código

### Lo que el agente nunca debe hacer
- Hacer `git commit` ni `git push` sin que el usuario lo pida explícitamente
- Crear cuentas en servicios externos (Resend, Vercel, Supabase)
- Exponer variables de entorno sensibles en código cliente (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`)
- Implementar funcionalidades fuera de la fase actual (ver `PHASES.md`)
- Usar `any` en TypeScript sin justificación explícita

---

## Convenciones de código

- **Lenguaje:** TypeScript estricto. `strict: true` en `tsconfig.json`.
- **Componentes:** functional components, sin class components.
- **Server vs Client:** preferir Server Components. Usar `"use client"` solo cuando sea necesario (interactividad, hooks de estado).
- **Fetching:** usar Server Components para fetching inicial. Las mutaciones van a Route Handlers (`/api/...`).
- **Naming:** archivos en kebab-case (`form-editor.tsx`), componentes en PascalCase (`FormEditor`), funciones en camelCase.
- **Comentarios:** solo cuando el "por qué" no es obvio. No comentar el "qué".
- **Errores:** no usar `try/catch` vacíos. Propagar errores o mostrarlos al usuario.
- **Variables de entorno:** usar Zod para validarlas al inicio de la app (en `lib/env.ts`).

---

## Seguridad — recordatorios críticos

1. La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en Route Handlers server-side. Jamás en componentes.
2. La `ANTHROPIC_API_KEY` solo en `/api/ai/generar/route.ts`.
3. Verificar sesión de Supabase Auth en el servidor en cada endpoint de `/api/formularios/*` y `/api/ai/*`.
4. Los endpoints `/api/public/[token]/*` son públicos pero deben validar el token y el estado del formulario.
5. Validar tipo MIME real de archivos (magic bytes), no solo la extensión.

---

## Identidad visual de BARCO

- Paleta, tipografías y espaciados definidos en `tailwind.config.ts` como variables custom.
- Sin elementos de proveedores terceros visibles en el formulario público (sin "Powered by Supabase", etc.).
- Animaciones de transición entre bloques con Framer Motion, curvas acordes a marca premium.
- El formulario público es la cara de BARCO ante sus clientes: calidad visual no negociable.

---

## Modelo de trabajo por sesión

Cada sesión debe enfocarse en **una sola fase** de `PHASES.md`.

Al inicio de una sesión, el usuario indicará:
> "Estamos en la Fase X. Implementá [RF específicos o tarea concreta]."

El agente:
1. Lee el TRD para entender los criterios de aceptación de esos RFs.
2. Implementa solo lo indicado.
3. Al terminar cada RF o tarea significativa, reporta brevemente qué se hizo y qué sigue.
4. No avanza a la siguiente fase sin que el usuario lo indique.
