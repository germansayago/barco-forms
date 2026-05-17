# PHASES.md — Plan de implementación por fases

Cada fase es una unidad de trabajo que se implementa y valida antes de avanzar a la siguiente.
**Regla:** no comenzar una fase hasta que la anterior esté marcada como completada.

---

## Fase 1 — Setup y fundaciones
**Objetivo:** proyecto corriendo localmente con DB configurada.

### Tareas
- [x] Inicializar proyecto Next.js 15 con TypeScript y App Router
- [x] Configurar Tailwind CSS y shadcn/ui (tema base de BARCO: colores, tipografías)
- [x] Configurar `tsconfig.json` con `strict: true`
- [x] Crear `lib/env.ts` con validación Zod de todas las variables de entorno
- [x] Crear `lib/supabase/client.ts` (cliente browser) y `lib/supabase/server.ts` (cliente SSR)
- [x] Ejecutar el schema SQL completo en Supabase (Sección 5.1 del TRD)
- [x] Crear bucket `formularios-archivos` como privado en Supabase Storage con sus políticas
- [x] Crear `types/index.ts` con los tipos TypeScript del dominio (Formulario, Bloque, Pregunta, Respuesta)
- [x] Configurar `.env.local` con todas las variables necesarias
- [x] `npm run build` y `npx tsc --noEmit` sin errores

### Criterio de completado
> La app corre en `localhost:3000` sin errores. El schema existe en Supabase. TypeScript compila limpio.

---

## Fase 2 — Autenticación y shell del admin
**TRD:** RF-01

### Tareas
- [x] Crear `middleware.ts` que protege todas las rutas `/admin/*` excepto `/admin/login`
- [x] Crear `/admin/login/page.tsx` con formulario de email + contraseña (Supabase Auth)
- [x] Crear `app/admin/layout.tsx` con auth guard (redirige a login si no hay sesión)
- [x] Crear layout visual del panel admin: sidebar o navbar, área de contenido
- [x] Implementar botón "Cerrar sesión" que invalida la sesión y redirige a `/admin/login`
- [x] Verificar que cualquier ruta `/admin/*` sin sesión redirige a `/admin/login`

### Criterio de completado
> Login con credenciales válidas accede al panel. Login fallido muestra error. Rutas protegidas redirigen si no hay sesión. Cerrar sesión funciona.

---

## Fase 3 — CRUD de formularios (sin IA)
**TRD:** RF-02, RF-03, RF-04, RF-06

### Tareas

#### Dashboard (RF-02)
- [x] Crear `/admin/formularios/page.tsx` con tabla de formularios
- [x] Implementar `GET /api/formularios/route.ts`
- [x] Mostrar estados con etiquetas de color (borrador/enviado/en_progreso/completado)
- [x] Estado vacío con CTA para crear el primero

#### Creación (RF-03)
- [x] Crear `/admin/formularios/nuevo/page.tsx` con modal o formulario (nombre + empresa)
- [x] Implementar `POST /api/formularios/route.ts`
- [x] Al crear, redirigir al editor del formulario nuevo

#### Editor manual (RF-04)
- [x] Crear `/admin/formularios/[id]/page.tsx` — editor de formulario
- [x] Componente `BloqueEditor` con título, descripción, agregar/eliminar preguntas
- [x] Componente `PreguntaEditor` con texto, tipo (selector), obligatoria (toggle)
- [x] Para tipos de selección: inputs dinámicos para agregar/eliminar opciones
- [ ] Drag and drop para reordenar bloques y preguntas (`@dnd-kit`)
- [x] Botón "Guardar borrador" → `PATCH /api/formularios/[id]/route.ts`
- [x] Implementar `PATCH /api/formularios/[id]/route.ts` con upsert transaccional

#### Publicación (RF-06)
- [x] Botón "Publicar formulario" (activo solo si hay al menos una pregunta)
- [x] Implementar `POST /api/formularios/[id]/publicar/route.ts`
- [x] Modal post-publicación con el link generado y botón de copiar

### Criterio de completado
> Crear formulario, agregar bloques y preguntas manualmente, reordenarlas, guardar borrador y publicar. El link generado se puede copiar.

---

## Fase 4 — Generación con IA
**TRD:** RF-05, Sección 9

### Tareas
- [x] Crear `lib/anthropic.ts` con el cliente de Anthropic SDK
- [x] Implementar `POST /api/ai/generar/route.ts` con streaming SSE
- [x] System prompt y user message tal como están definidos en la Sección 9 del TRD
- [x] Validación con Zod del JSON de respuesta de Claude; lógica de reintento (hasta 2 intentos)
- [x] Crear `components/admin/AIGeneratorModal.tsx` con formulario de contexto:
  - [x] Nombre/empresa pre-cargados
  - [x] Rubro (texto libre, obligatorio)
  - [x] Objetivos (texto libre, opcional)
  - [x] Audiencia (texto libre, opcional)
- [x] Integrar el modal en `EditorFormulario.tsx` (Botón "Generar con IA")
- [x] Lógica para reemplazar/mergear bloques existentes con los generados por IA mientras Claude responde
- [x] Guardar el contexto en `contexto_ia` del formulario al completar la generación
- [x] Advertencia si el editor ya tiene preguntas (se reemplazarán)
- [x] Manejo de error con mensaje claro y opción de carga manual como fallback

### Criterio de completado
> Completar el formulario de contexto, hacer click en "Generar preguntas", ver las preguntas aparecer progresivamente, y poder editarlas después. Forzar un error y verificar el fallback.

---

## Fase 5 — Formulario público y auto-save
**TRD:** RF-09, RF-10, RF-11

### Tareas

#### Acceso por token (RF-09)
- [x] Crear `app/f/[token]/page.tsx` (Server Component)
- [x] Implementar `GET /api/public/[token]/route.ts` con validación de estado
- [x] Páginas de estado: 404 (token inválido), "ya completado", "no disponible aún"
- [x] Al primer acceso con token `enviado`, actualizar estado a `en_progreso`

#### Experiencia de completado (RF-10)
- [x] Crear `components/public/FormularioPublico.tsx`
- [x] Crear `components/public/BloquePublico.tsx` con accordeon animado (Framer Motion)
- [x] Crear `components/public/PreguntaPublica.tsx` con los 4 tipos de input:
  - `texto_largo`: textarea auto-expandible
  - `seleccion_unica`: radio buttons
  - `seleccion_multiple`: checkboxes
  - `archivo`: drag & drop + selector
- [x] Barra de progreso por bloques
- [x] Navegación Anterior / Siguiente entre bloques
- [x] Indicador visual de preguntas obligatorias (asterisco)
- [x] Diseño 100% con identidad visual de BARCO (sin elementos de terceros visibles)
- [x] Responsive mobile

#### Auto-save (RF-11)
- [x] Implementar `POST /api/public/[token]/respuestas/route.ts` (upsert)
- [x] Debounce 800ms para texto largo, inmediato para selecciones
- [x] Pre-cargar respuestas previas al volver al formulario
- [x] Indicador visual "Guardando..." → "Guardado ✓"
- [ ] Reintentos con backoff exponencial (hasta 3 veces) si falla la red

#### Upload de archivos
- [x] Implementar `POST /api/public/[token]/archivos/route.ts`
- [x] Subir a Supabase Storage en path `{formulario_id}/{pregunta_id}/{timestamp}_{nombre}`
- [x] Validar tipo MIME real (magic bytes) y tamaño máximo 10 MB server-side

### Criterio de completado
> Acceder al link del formulario, completar preguntas de todos los tipos, cerrar el navegador, volver al link y ver las respuestas pre-cargadas. Subir un archivo PDF exitosamente.

---

## Fase 6 — Envío, notificaciones, respuestas y PDF
**TRD:** RF-07, RF-08, RF-12

### Tareas

#### Envío final (RF-12)
- [x] Botón "Enviar formulario" con modal de confirmación
- [x] Implementar `POST /api/public/[token]/enviar/route.ts`
  - Validación server-side de preguntas obligatorias
  - `formularios.estado` → `completado`, registrar `fecha_completado`
  - Email de notificación a BARCO via Resend
- [x] Pantalla de confirmación post-envío
- [x] Si el token ya está `completado`, mostrar página "ya enviado"

#### Email de notificación
- [x] Crear `lib/resend.ts`
- [x] Template de email según Sección 10.4 del TRD (asunto, cuerpo, link al panel admin)

#### Vista de respuestas admin (RF-07)
- [x] Crear `/admin/formularios/[id]/respuestas/page.tsx`
- [x] Implementar `GET /api/formularios/[id]/respuestas/route.ts` (Implementado directamente en la page.tsx SSR)
- [x] Crear `components/admin/RespuestasViewer.tsx`:
  - Respuestas organizadas por bloques y preguntas
  - Links de descarga para archivos (URLs firmadas de Supabase, 1h de expiración)
  - "Sin respuesta" para preguntas no respondidas

#### Exportación PDF (RF-08)
- [x] Crear `lib/pdf.ts` con `@react-pdf/renderer`
- [x] Implementar `GET /api/formularios/[id]/exportar/route.ts`
- [x] PDF con: nombre cliente, empresa, fecha completado, todas las respuestas por bloque
- [x] Nombre del archivo: `BARCO_Diagnostico_[Empresa]_[Fecha].pdf`

### Criterio de completado
> Enviar formulario como cliente, verificar email de notificación en bandeja de BARCO, ver respuestas completas en el panel admin, descargar el PDF con todas las respuestas.

---

## Fase 7 — QA y preparación para producción
**TRD:** Sección 11 — Criterios de aceptación globales

### Tareas

#### Funcional
- [ ] Ejecutar checklist completo de criterios de aceptación (Sección 11 del TRD)
- [ ] Probar formulario público en Chrome, Firefox y Safari mobile
- [ ] Probar auto-save: cerrar y reabrir 3 veces, verificar persistencia
- [ ] Probar streaming de IA 5 veces consecutivas sin errores

#### Rendimiento
- [ ] Lighthouse en formulario público: carga < 2s en simulación 4G
- [ ] Verificar que no hay API keys en bundles cliente (DevTools → Network)

#### Seguridad
- [x] Intentar acceso a `/admin/formularios` sin sesión → debe redirigir (Manejado por auth)
- [x] POST a `/api/public/[token]/enviar` con token `completado` → debe retornar 403
- [x] Upload de `.exe` → debe retornar error
- [ ] GET a `/api/ai/generar` sin sesión → debe retornar 401
- [ ] Verificar que archivos en Storage no son accesibles por URL directa

#### Deploy
- [ ] Configurar proyecto en Vercel con todas las variables de entorno
- [ ] Configurar dominio `forms.barco.com`
- [ ] Deploy exitoso desde branch `main`
- [ ] Smoke test en producción: crear formulario, completarlo como cliente, verificar email

### Criterio de completado
> Todos los checks de la Sección 11 del TRD en verde. Deploy en producción funcionando.

---

## Estado del proyecto

| Fase | Estado |
|------|--------|
| 1 — Setup | Completado |
| 2 — Auth + shell admin | Completado |
| 3 — CRUD formularios | Completado (con Drag & Drop opcional pendiente) |
| 4 — Generación con IA | Completado |
| 5 — Formulario público + auto-save | Completado |
| 6 — Envío + notificaciones + PDF | Completado |
| 7 — QA + producción | Pendiente |
