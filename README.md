# BarcoForms

Plataforma de diagnóstico de marca para BARCO Estrategia de Marca. Permite crear formularios de diagnóstico personalizados, enviarlos a clientes, recopilar respuestas con auto-save y exportar todo en PDF.

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** shadcn/ui + Tailwind CSS + Framer Motion
- **Base de datos:** Supabase (PostgreSQL + Storage)
- **Auth:** Supabase Auth
- **IA:** Anthropic Claude (claude-sonnet-4-6)
- **Email:** Resend
- **PDF:** @react-pdf/renderer
- **Drag & drop:** @dnd-kit
- **Hosting:** Vercel

## Funcionalidades

- **Panel admin** — CRUD de formularios con editor drag & drop de bloques y preguntas
- **Generación con IA** — Claude genera el cuestionario completo a partir del contexto del cliente (rubro, tamaño, objetivo), con control sobre cantidad de secciones y preguntas
- **Formulario público** — Acceso por token único, auto-save con retry, soporte de archivos adjuntos hasta 10MB
- **Notificaciones** — Email a BARCO vía Resend cuando un cliente completa el formulario
- **Exportación PDF** — Reporte completo con todas las respuestas organizado por bloques
- **MCP Server** — Permite crear formularios desde Claude Desktop u otros agentes MCP

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
BARCO_NOTIFICATION_EMAIL=
NEXT_PUBLIC_APP_URL=
MCP_API_KEY=
```

## Desarrollo local

```bash
npm install
npm run dev
```

## MCP Server

Permite que Claude (u otro agente MCP) cree formularios directamente desde una conversación:

```bash
cd mcp-server
npm install
```

Configuración en `mcp-server/claude_desktop_config.json`.
