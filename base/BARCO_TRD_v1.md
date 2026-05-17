# Documento de Requerimientos Técnicos (TRD) v1.0
# Sistema de Formularios de Onboarding con Generación por IA — BARCO Estrategia de Marca

**Versión:** 1.0  
**Fecha:** 2026-05-14  
**Estado:** Listo para desarrollo  
**Basado en:** Briefing Técnico v2

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Requerimientos funcionales](#2-requerimientos-funcionales)
3. [Requerimientos no funcionales](#3-requerimientos-no-funcionales)
4. [Arquitectura técnica](#4-arquitectura-técnica)
5. [Modelo de datos](#5-modelo-de-datos)
6. [API — Endpoints y contratos](#6-api--endpoints-y-contratos)
7. [Flujos de usuario detallados](#7-flujos-de-usuario-detallados)
8. [Consideraciones de seguridad](#8-consideraciones-de-seguridad)
9. [Diseño del prompt de IA](#9-diseño-del-prompt-de-ia)
10. [Configuración de entorno](#10-configuración-de-entorno)
11. [Criterios de aceptación globales](#11-criterios-de-aceptación-globales)

---

## 1. Resumen ejecutivo

### 1.1 Problema que se resuelve

BARCO Estrategia de Marca realiza un diagnóstico inicial para cada cliente nuevo mediante un cuestionario de marca profundo (~46 preguntas en 8 bloques temáticos). El proceso actual es completamente manual: generan el cuestionario en Claude, copian las preguntas a un Word, envían el archivo por email y el cliente devuelve el documento completado.

Este flujo tiene tres fallas críticas:
- **Experiencia degradada para el cliente:** completar un Word no está a la altura del posicionamiento de marca de BARCO.
- **Sin persistencia de progreso:** si el cliente cierra el archivo, pierde trabajo.
- **Proceso manual para BARCO:** sin canal centralizado para gestionar ni visualizar respuestas.

### 1.2 Solución propuesta

Sistema web de tres módulos:

| Módulo | Usuario | Propósito |
|--------|---------|-----------|
| **Panel de administración** | BARCO (interno) | Crear y gestionar formularios, ver y exportar respuestas |
| **Motor de IA** | BARCO (interno) | Generar preguntas automáticamente via Claude API |
| **Formulario público** | Cliente final | Completar el cuestionario online con guardado automático |

### 1.3 Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework full-stack | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Animaciones | Framer Motion |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación admin | Supabase Auth |
| Storage de archivos | Supabase Storage |
| IA | Anthropic Claude API (`claude-sonnet-4-6`) |
| Email transaccional | Resend |
| Hosting | Vercel — subdominio `forms.barco.com` |

### 1.4 Alcance de v1

**Incluido:** panel admin, generación con IA (streaming), formulario público con token, guardado automático, tipos de input (texto, selección, archivo), estados de token, notificación por email.

**Excluido:** editor visual de marca, múltiples roles de admin, comentarios sobre respuestas, versionado de formularios, regeneración parcial por bloque.

---

## 2. Requerimientos funcionales

### RF-01 — Autenticación del panel de administración

**Descripción:** El panel de administración debe estar protegido mediante autenticación. Solo usuarios autorizados de BARCO pueden acceder.

**Implementación:** Supabase Auth con email + contraseña. En v1 no hay registro libre — las cuentas se crean manualmente desde el dashboard de Supabase.

**Criterios de aceptación:**
- [ ] Un usuario no autenticado que intente acceder a cualquier ruta `/admin/*` es redirigido a `/admin/login`.
- [ ] Tras login exitoso, el usuario es redirigido al dashboard de formularios.
- [ ] El token de sesión se mantiene entre recargas de página (Supabase maneja esto con cookies httpOnly).
- [ ] El botón "Cerrar sesión" invalida la sesión y redirige a `/admin/login`.
- [ ] Contraseña incorrecta muestra mensaje de error claro sin revelar si el email existe.

---

### RF-02 — Listado de formularios (dashboard admin)

**Descripción:** Vista principal del panel donde BARCO ve todos los formularios creados.

**Criterios de aceptación:**
- [ ] Se muestra una tabla/grilla con: nombre del cliente, empresa, estado, fecha de creación, fecha de completado (si aplica).
- [ ] Los estados posibles se muestran con etiqueta visual diferenciada: `borrador` (gris), `enviado` (azul), `en_progreso` (amarillo), `completado` (verde).
- [ ] Cada fila tiene acciones rápidas: ver respuestas, copiar link, editar.
- [ ] La lista está ordenada por fecha de creación descendente.
- [ ] Si no hay formularios, se muestra un estado vacío con CTA para crear el primero.

---

### RF-03 — Creación de formulario

**Descripción:** BARCO puede iniciar la creación de un nuevo formulario asignado a un cliente.

**Criterios de aceptación:**
- [ ] El formulario de creación solicita: nombre del cliente (obligatorio), empresa del cliente (obligatorio).
- [ ] Al confirmar, el sistema crea el registro en DB con estado `borrador` y redirige al editor de formulario.
- [ ] El token de acceso se genera en este momento (UUID v4) pero el formulario no se activa hasta que BARCO lo publique.
- [ ] El campo empresa es texto libre (no catálogo).

---

### RF-04 — Editor de formulario — carga manual

**Descripción:** BARCO puede construir el formulario agregando bloques y preguntas manualmente.

**Criterios de aceptación:**
- [ ] BARCO puede agregar un nuevo bloque con: título (obligatorio) y descripción (opcional).
- [ ] Dentro de cada bloque, BARCO puede agregar preguntas con: texto (obligatorio), tipo de input, indicador de obligatoriedad.
- [ ] Tipos de input disponibles: `texto_largo`, `seleccion_unica`, `seleccion_multiple`, `archivo`.
- [ ] Para tipos de selección, BARCO puede definir las opciones (mínimo 2). Las opciones se agregan y eliminan dinámicamente.
- [ ] Los bloques y las preguntas son reordenables mediante drag-and-drop.
- [ ] BARCO puede eliminar preguntas y bloques (con confirmación de diálogo antes de eliminar).
- [ ] Los cambios se guardan explícitamente con un botón "Guardar borrador" o implícitamente al salir (con prompt de confirmación si hay cambios no guardados).

---

### RF-05 — Editor de formulario — generación con IA

**Descripción:** BARCO puede generar el cuestionario automáticamente usando la API de Claude.

**Criterios de aceptación:**
- [ ] En el editor de un formulario nuevo (sin preguntas), aparece la opción "Generar con IA".
- [ ] Al seleccionar "Generar con IA", se muestra un formulario de contexto con los campos:
  - Nombre y empresa del cliente (pre-cargados desde el formulario, editables)
  - Rubro/industria (texto libre, obligatorio)
  - Tamaño de la empresa: `startup`, `pyme`, `corporación` (selector, obligatorio)
  - Tipo de servicio BARCO: `diagnóstico de marca`, `arquitectura comercial B2B`, `estrategia de posicionamiento`, `otro` (selector)
  - Objetivo principal del diagnóstico (textarea, obligatorio)
  - Notas adicionales (textarea, opcional)
- [ ] El botón "Generar preguntas" está deshabilitado hasta que los campos obligatorios estén completos.
- [ ] Al hacer click en "Generar preguntas", se inicia una llamada streaming a la API de Claude. BARCO ve las preguntas aparecer progresivamente en el editor.
- [ ] Una vez completada la generación, las preguntas están en estado editable: BARCO puede modificar texto, tipo, opciones, reordenar y eliminar.
- [ ] Si la respuesta de Claude es JSON malformado, el sistema reintenta automáticamente una vez (sin acción del usuario).
- [ ] Si falla dos veces consecutivas, se muestra un mensaje de error con la opción de cargar manualmente.
- [ ] El contexto ingresado se guarda en el campo `contexto_ia` del formulario para referencia futura.
- [ ] BARCO puede usar "Generar con IA" incluso sobre un formulario que ya tiene preguntas (con advertencia de que se reemplazará el contenido actual).

---

### RF-06 — Publicación del formulario y generación de link

**Descripción:** BARCO publica el formulario y obtiene el link para enviar al cliente.

**Criterios de aceptación:**
- [ ] El botón "Publicar formulario" está disponible cuando el formulario tiene al menos un bloque con al menos una pregunta.
- [ ] Al publicar, el estado cambia de `borrador` a `enviado` y el token queda activo.
- [ ] El sistema muestra el link completo (ej: `https://forms.barco.com/f/abc123xyz`) con un botón de copiar al portapapeles.
- [ ] El link lleva al formulario público correspondiente.
- [ ] Un formulario publicado no puede volver a estado borrador (es de solo lectura en cuanto a estructura, pero BARCO puede ver su estado y respuestas).

---

### RF-07 — Vista de respuestas (admin)

**Descripción:** BARCO puede ver las respuestas de un cliente una vez que completó el formulario.

**Criterios de aceptación:**
- [ ] Las respuestas se muestran organizadas por bloques y preguntas, en el mismo orden del formulario.
- [ ] Para respuestas de texto largo, se muestra el texto completo.
- [ ] Para selección, se muestran las opciones seleccionadas.
- [ ] Para archivos, se muestra el nombre del archivo con un link de descarga seguro (URL firmada de Supabase Storage, con expiración de 1 hora).
- [ ] Las preguntas sin respuesta muestran "Sin respuesta" claramente diferenciado.
- [ ] Se muestra la fecha/hora de cada guardado de respuesta.

---

### RF-08 — Exportación de respuestas

**Descripción:** BARCO puede descargar las respuestas en formato PDF.

**Criterios de aceptación:**
- [ ] El botón "Exportar PDF" está disponible en la vista de respuestas de un formulario completado.
- [ ] El PDF generado incluye: nombre del cliente, empresa, fecha de completado, y todas las respuestas organizadas por bloque/pregunta.
- [ ] El PDF se descarga directamente al navegador.
- [ ] El PDF tiene el nombre de archivo `BARCO_Diagnostico_[EmpresaCliente]_[Fecha].pdf`.
- [ ] Las respuestas de archivo (uploads) aparecen como mención del nombre del archivo (no el archivo embebido).

---

### RF-09 — Formulario público — acceso por token

**Descripción:** El cliente accede al formulario mediante el link con token único.

**Criterios de aceptación:**
- [ ] La ruta `/f/[token]` carga el formulario correspondiente al token.
- [ ] Si el token no existe, se muestra una página de error 404 con mensaje amigable.
- [ ] Si el token está en estado `completado`, se muestra una página informando que el formulario ya fue enviado.
- [ ] Si el token está en estado `borrador` (no publicado), se muestra una página de error informando que el formulario aún no está disponible.
- [ ] No se requiere autenticación ni registro para acceder. El token es suficiente.
- [ ] Al primer acceso, el estado del formulario cambia de `enviado` a `en_progreso`.

---

### RF-10 — Formulario público — experiencia de completado

**Descripción:** El cliente completa las preguntas del formulario de forma intuitiva.

**Criterios de aceptación:**
- [ ] Las preguntas se organizan visualmente por bloques, con título y descripción del bloque visible.
- [ ] El formulario muestra un indicador de progreso (bloques completados / total de bloques).
- [ ] Las preguntas de tipo `texto_largo` tienen un textarea que se expande automáticamente al escribir.
- [ ] Las preguntas de tipo `seleccion_unica` muestran radio buttons con las opciones definidas.
- [ ] Las preguntas de tipo `seleccion_multiple` muestran checkboxes con las opciones definidas.
- [ ] Las preguntas de tipo `archivo` permiten arrastrar o seleccionar archivos. Tipos permitidos: PDF, JPG, PNG, DOCX, DOC. Tamaño máximo: 10 MB por archivo.
- [ ] Las preguntas obligatorias están marcadas con indicador visual (ej: asterisco rojo).
- [ ] El formulario es navegable por bloques (botones Anterior / Siguiente o navegación lateral).
- [ ] El diseño aplica completamente la identidad visual de BARCO (tipografías, colores, espaciados). No hay elementos de terceros visibles.
- [ ] El formulario es completamente funcional en mobile (responsive).

---

### RF-11 — Guardado automático de progreso

**Descripción:** Las respuestas del cliente se guardan automáticamente en el servidor.

**Criterios de aceptación:**
- [ ] Cada respuesta se guarda en el servidor inmediatamente después de que el usuario cambia el valor (debounce de 800ms para textos largos, inmediato para selecciones).
- [ ] Si el cliente cierra el navegador y vuelve al mismo link, sus respuestas previas están pre-cargadas en el formulario.
- [ ] Se muestra un indicador discreto de estado de guardado: "Guardando…" → "Guardado" (con timestamp).
- [ ] Si el guardado falla (error de red), se muestra un aviso de reintento. El sistema reintenta hasta 3 veces con backoff exponencial.
- [ ] Las respuestas parciales se guardan aunque el formulario no se haya enviado.

---

### RF-12 — Envío final del formulario

**Descripción:** El cliente envía el formulario cuando lo ha completado.

**Criterios de aceptación:**
- [ ] El botón "Enviar formulario" está disponible en cualquier momento pero valida las preguntas obligatorias antes de confirmar el envío.
- [ ] Si hay preguntas obligatorias sin responder, se muestra un listado de las mismas y el envío no procede.
- [ ] Al hacer click en "Enviar", se muestra un modal de confirmación: "¿Estás seguro de que querés enviar? No podrás editar tus respuestas después."
- [ ] Al confirmar, el sistema marca el token como `completado` y registra `fecha_completado`.
- [ ] El cliente ve una pantalla de confirmación de envío exitoso con mensaje de agradecimiento de BARCO.
- [ ] Se envía una notificación por email a BARCO informando que el formulario fue completado (con nombre del cliente y link directo a las respuestas en el panel admin).
- [ ] Si el cliente intenta volver al link después de enviado, ve la página de "formulario ya completado".

---

## 3. Requerimientos no funcionales

### RNF-01 — Identidad visual

El formulario público y el panel admin deben implementar completamente el sistema de diseño de BARCO:
- Las fuentes se cargan desde Google Fonts o están auto-hospedadas (sin fallback a fuentes del sistema en áreas visibles al cliente).
- La paleta de colores, espaciados y radios de borde son variables de Tailwind definidas en `tailwind.config.ts`.
- No debe haber ningún texto ni logotipo de proveedores terceros visible en el formulario público ("Powered by Supabase", "Vercel", etc.).
- La animación del acordeón de preguntas y transiciones entre bloques usan Framer Motion con curvas de animación acordes a la estética de marca.

### RNF-02 — Rendimiento

- El formulario público debe cargar en menos de 2 segundos en una conexión 4G estándar.
- Las llamadas de auto-guardado no deben bloquear la UI (fire-and-forget con feedback visual).
- El streaming de generación de preguntas con IA debe comenzar a mostrar contenido en menos de 3 segundos desde el click.

### RNF-03 — Disponibilidad

- El sistema se hospeda en Vercel con despliegue automático desde el branch `main`.
- Supabase Free Tier tiene SLA razonable para el volumen de BARCO (decenas de clientes/año).
- En caso de caída de la API de Claude, el sistema debe degradar gracefully: mostrar el editor manual sin interrumpir la operación general del panel.

### RNF-04 — Escalabilidad

El sistema no requiere arquitectura de alta escala. El volumen esperado es:
- ~50 formularios por año
- ~5 usuarios concurrentes máximo
- Archivos subidos: ~100 MB/año estimado

La infraestructura del Free Tier es suficiente para v1.

### RNF-05 — Compatibilidad de navegadores

- El formulario público debe funcionar correctamente en: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+.
- En mobile: iOS Safari 17+ y Chrome for Android.
- No se soporta IE11 ni versiones anteriores.

### RNF-06 — Accesibilidad

- Los elementos de formulario tienen etiquetas ARIA correctas.
- El contraste de color cumple WCAG 2.1 nivel AA.
- El formulario es navegable por teclado.

---

## 4. Arquitectura técnica

### 4.1 Estructura de la aplicación

```
forms.barco.com/
├── /admin                     → Panel de administración (protegido)
│   ├── /admin/login           → Página de login
│   ├── /admin/formularios     → Dashboard — listado de formularios
│   ├── /admin/formularios/nuevo → Crear formulario
│   └── /admin/formularios/[id] → Editor / vista de formulario
│       └── /admin/formularios/[id]/respuestas → Vista de respuestas
└── /f/[token]                 → Formulario público (cliente final)
```

### 4.2 Estructura del proyecto Next.js

```
/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                    → Layout con auth guard
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── formularios/
│   │       ├── page.tsx                  → Dashboard
│   │       ├── nuevo/
│   │       │   └── page.tsx
│   │       └── [id]/
│   │           ├── page.tsx              → Editor de formulario
│   │           └── respuestas/
│   │               └── page.tsx
│   ├── f/
│   │   └── [token]/
│   │       └── page.tsx                  → Formulario público
│   └── api/
│       ├── formularios/
│       │   ├── route.ts                  → GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts              → GET, PATCH, DELETE
│       │       ├── publicar/
│       │       │   └── route.ts          → POST
│       │       ├── respuestas/
│       │       │   └── route.ts          → GET
│       │       └── exportar/
│       │           └── route.ts          → GET (PDF)
│       ├── ai/
│       │   └── generar/
│       │       └── route.ts              → POST (streaming)
│       └── public/
│           └── [token]/
│               ├── route.ts              → GET (cargar formulario)
│               ├── respuestas/
│               │   └── route.ts          → POST (auto-save)
│               ├── archivos/
│               │   └── route.ts          → POST (upload)
│               └── enviar/
│                   └── route.ts          → POST (submit final)
├── components/
│   ├── admin/
│   │   ├── FormularioEditor.tsx
│   │   ├── BloqueEditor.tsx
│   │   ├── PreguntaEditor.tsx
│   │   ├── AIGeneratorModal.tsx
│   │   └── RespuestasViewer.tsx
│   └── public/
│       ├── FormularioPublico.tsx
│       ├── BloquePublico.tsx
│       ├── PreguntaPublica.tsx
│       └── ProgressBar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     → Supabase browser client
│   │   └── server.ts                     → Supabase server client (SSR)
│   ├── anthropic.ts                      → Claude API client
│   ├── resend.ts                         → Resend email client
│   └── pdf.ts                            → Generación de PDF
└── types/
    └── index.ts                          → Tipos TypeScript del dominio
```

### 4.3 Diagrama de flujo de datos

```
┌─────────────────────────────────────────────────────────────┐
│                        BARCO (Admin)                         │
│                                                              │
│  Browser → /admin/* → Next.js Server → Supabase DB          │
│                   ↘                                          │
│                    → /api/ai/generar → Claude API            │
│                                     ← streaming response     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Cliente Final                           │
│                                                              │
│  Browser → /f/[token] → Next.js Server → Supabase DB        │
│                ↓                                             │
│  Autosave → /api/public/[token]/respuestas → Supabase DB     │
│  Upload  → /api/public/[token]/archivos → Supabase Storage   │
│  Submit  → /api/public/[token]/enviar → Supabase DB          │
│                                       → Resend (email)       │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Autenticación y middleware

El middleware de Next.js (`middleware.ts`) protege todas las rutas `/admin/*` (excepto `/admin/login`) verificando la sesión de Supabase Auth. Las rutas `/api/formularios/*` y `/api/ai/*` también requieren sesión válida verificada server-side.

Las rutas `/f/[token]` y `/api/public/[token]/*` son públicas pero validadas por token.

---

## 5. Modelo de datos

### 5.1 Esquema SQL completo

```sql
-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: formularios
-- ============================================================
CREATE TABLE public.formularios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_cliente   TEXT        NOT NULL,
  empresa_cliente  TEXT        NOT NULL,
  token_acceso     UUID        UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  estado           TEXT        NOT NULL DEFAULT 'borrador'
                               CHECK (estado IN ('borrador', 'enviado', 'en_progreso', 'completado')),
  generado_con_ia  BOOLEAN     NOT NULL DEFAULT false,
  contexto_ia      JSONB,      -- Guarda el input del form de contexto para referencia
  fecha_creacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_envio      TIMESTAMPTZ,
  fecha_completado TIMESTAMPTZ,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_formularios_estado ON public.formularios(estado);
CREATE INDEX idx_formularios_token  ON public.formularios(token_acceso);

-- Row Level Security
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden leer/escribir formularios
CREATE POLICY "Admin puede gestionar formularios"
  ON public.formularios
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permite lectura pública por token (para el formulario público)
CREATE POLICY "Lectura pública por token"
  ON public.formularios
  FOR SELECT
  TO anon
  USING (token_acceso IS NOT NULL);

-- ============================================================
-- TABLA: bloques
-- ============================================================
CREATE TABLE public.bloques (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID    NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  titulo        TEXT    NOT NULL,
  descripcion   TEXT,
  orden         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_bloques_formulario ON public.bloques(formulario_id, orden);

ALTER TABLE public.bloques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede gestionar bloques"
  ON public.bloques FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Lectura pública de bloques"
  ON public.bloques FOR SELECT TO anon
  USING (true);

-- ============================================================
-- TABLA: preguntas
-- ============================================================
CREATE TABLE public.preguntas (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bloque_id   UUID    NOT NULL REFERENCES public.bloques(id) ON DELETE CASCADE,
  texto       TEXT    NOT NULL,
  tipo        TEXT    NOT NULL
              CHECK (tipo IN ('texto_largo', 'seleccion_unica', 'seleccion_multiple', 'archivo')),
  opciones    JSONB,   -- Array de strings: ["Opción A", "Opción B"]. Solo para tipos de selección.
  obligatoria BOOLEAN NOT NULL DEFAULT false,
  orden       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_preguntas_bloque ON public.preguntas(bloque_id, orden);

ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede gestionar preguntas"
  ON public.preguntas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Lectura pública de preguntas"
  ON public.preguntas FOR SELECT TO anon
  USING (true);

-- ============================================================
-- TABLA: respuestas
-- ============================================================
CREATE TABLE public.respuestas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id     UUID        NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
  formulario_id   UUID        NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  valor_texto     TEXT,                -- Para tipo texto_largo
  valor_opciones  JSONB,               -- Array de strings seleccionados: ["Opción A"]
  archivo_url     TEXT,                -- Path en Supabase Storage
  archivo_nombre  TEXT,                -- Nombre original del archivo
  fecha_guardado  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Una sola respuesta por pregunta por formulario (upsert en auto-save)
  CONSTRAINT unique_respuesta UNIQUE (pregunta_id, formulario_id)
);

CREATE INDEX idx_respuestas_formulario ON public.respuestas(formulario_id);

ALTER TABLE public.respuestas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede leer todas las respuestas"
  ON public.respuestas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anon puede insertar y actualizar respuestas"
  ON public.respuestas FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon puede actualizar respuestas"
  ON public.respuestas FOR UPDATE TO anon
  USING (true);
```

### 5.2 Estructura del JSON `contexto_ia`

El campo `contexto_ia` (JSONB) almacena el contexto ingresado por BARCO al generar con IA:

```json
{
  "nombre_cliente": "Juan Pérez",
  "empresa_cliente": "Alza Construcciones",
  "rubro": "Construcción e ingeniería civil",
  "tamanio_empresa": "pyme",
  "tipo_servicio": "diagnóstico de marca",
  "objetivo_diagnostico": "Entender la percepción actual de marca y los diferenciales competitivos que Alza no está comunicando.",
  "notas_adicionales": "La empresa tiene 20 años de historia y quiere renovar su posicionamiento."
}
```

### 5.3 Supabase Storage — estructura de buckets

```
Bucket: "formularios-archivos"   (privado — no público)
  /
  └── {formulario_id}/
      └── {pregunta_id}/
          └── {timestamp}_{nombre_original}
```

Los archivos se acceden mediante URLs firmadas con expiración de 1 hora generadas server-side.

---

## 6. API — Endpoints y contratos

Todos los endpoints bajo `/api/formularios/*` y `/api/ai/*` requieren sesión Supabase Auth válida (verificada mediante cookie en el header de la request). Los endpoints bajo `/api/public/*` son públicos pero validados por token.

### 6.1 Formularios (Admin)

---

#### `POST /api/formularios`
Crea un nuevo formulario.

**Request body:**
```json
{
  "nombre_cliente": "Juan Pérez",
  "empresa_cliente": "Alza Construcciones"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "nombre_cliente": "Juan Pérez",
  "empresa_cliente": "Alza Construcciones",
  "token_acceso": "uuid",
  "estado": "borrador",
  "fecha_creacion": "2026-05-14T10:00:00Z"
}
```

**Errores:**
- `400` — campos obligatorios faltantes
- `401` — no autenticado

---

#### `GET /api/formularios`
Lista todos los formularios ordenados por fecha de creación descendente.

**Response `200`:**
```json
{
  "formularios": [
    {
      "id": "uuid",
      "nombre_cliente": "Juan Pérez",
      "empresa_cliente": "Alza Construcciones",
      "estado": "completado",
      "generado_con_ia": true,
      "fecha_creacion": "2026-05-14T10:00:00Z",
      "fecha_completado": "2026-05-20T15:30:00Z"
    }
  ]
}
```

---

#### `GET /api/formularios/[id]`
Obtiene un formulario completo con sus bloques y preguntas.

**Response `200`:**
```json
{
  "id": "uuid",
  "nombre_cliente": "Juan Pérez",
  "empresa_cliente": "Alza Construcciones",
  "token_acceso": "uuid",
  "estado": "enviado",
  "generado_con_ia": true,
  "contexto_ia": { ... },
  "bloques": [
    {
      "id": "uuid",
      "titulo": "Historia y origen",
      "descripcion": "...",
      "orden": 0,
      "preguntas": [
        {
          "id": "uuid",
          "texto": "¿Cómo surgió la empresa?",
          "tipo": "texto_largo",
          "opciones": null,
          "obligatoria": true,
          "orden": 0
        }
      ]
    }
  ]
}
```

**Errores:**
- `404` — formulario no encontrado
- `401` — no autenticado

---

#### `PATCH /api/formularios/[id]`
Actualiza metadata del formulario o su estructura completa (bloques y preguntas).

**Request body (actualización de estructura completa):**
```json
{
  "bloques": [
    {
      "id": "uuid-existente-o-null-para-nuevo",
      "titulo": "Historia y origen",
      "descripcion": "...",
      "orden": 0,
      "preguntas": [
        {
          "id": "uuid-existente-o-null",
          "texto": "¿Cómo surgió la empresa?",
          "tipo": "texto_largo",
          "opciones": null,
          "obligatoria": true,
          "orden": 0
        }
      ]
    }
  ]
}
```

**Implementación:** La actualización de estructura usa una transacción que elimina los bloques/preguntas no presentes en el payload y hace upsert de los presentes. Esto simplifica el manejo del estado del editor.

**Response `200`:** El formulario actualizado (misma estructura que GET).

---

#### `POST /api/formularios/[id]/publicar`
Cambia el estado de `borrador` a `enviado` y activa el token.

**Validaciones:**
- El formulario debe tener al menos un bloque con al menos una pregunta.
- El estado debe ser `borrador`.

**Response `200`:**
```json
{
  "url_publica": "https://forms.barco.com/f/abc123xyz",
  "token_acceso": "uuid",
  "estado": "enviado"
}
```

**Errores:**
- `400` — sin preguntas o estado inválido para publicar

---

#### `GET /api/formularios/[id]/respuestas`
Obtiene las respuestas de un formulario con la estructura de bloques y preguntas.

**Response `200`:**
```json
{
  "formulario": {
    "id": "uuid",
    "nombre_cliente": "Juan Pérez",
    "empresa_cliente": "Alza Construcciones",
    "fecha_completado": "2026-05-20T15:30:00Z"
  },
  "bloques": [
    {
      "titulo": "Historia y origen",
      "preguntas": [
        {
          "texto": "¿Cómo surgió la empresa?",
          "tipo": "texto_largo",
          "respuesta": {
            "valor_texto": "La empresa surgió en 2004...",
            "valor_opciones": null,
            "archivo_url": null,
            "archivo_nombre": null,
            "fecha_guardado": "2026-05-20T14:00:00Z"
          }
        }
      ]
    }
  ]
}
```

---

#### `GET /api/formularios/[id]/exportar`
Genera y descarga un PDF con las respuestas.

**Response `200`:** Binary (application/pdf) con header `Content-Disposition: attachment; filename="BARCO_Diagnostico_AlzaConstrucciones_20260520.pdf"`

---

### 6.2 Generación con IA

#### `POST /api/ai/generar`
Genera preguntas usando la API de Claude con streaming.

**Request body:**
```json
{
  "formulario_id": "uuid",
  "contexto": {
    "nombre_cliente": "Juan Pérez",
    "empresa_cliente": "Alza Construcciones",
    "rubro": "Construcción e ingeniería civil",
    "tamanio_empresa": "pyme",
    "tipo_servicio": "diagnóstico de marca",
    "objetivo_diagnostico": "Entender los diferenciales competitivos...",
    "notas_adicionales": "20 años de historia..."
  }
}
```

**Response:** `200` con `Content-Type: text/event-stream` (Server-Sent Events)

El stream emite eventos en el siguiente formato:
```
data: {"type":"delta","content":"{\n  \"bloques\": ["}

data: {"type":"delta","content":"\n    {"}

data: {"type":"done","bloques":[{...}]}

data: [DONE]
```

Cuando el cliente recibe `type: "done"`, el JSON completo está disponible en `bloques`.

**Errores (en el stream):**
```
data: {"type":"error","message":"Error al generar preguntas. Por favor intentá de nuevo.","retry": true}
```

Si `retry: true`, el cliente reintenta automáticamente. En el segundo error, `retry: false`.

---

### 6.3 Formulario público (cliente final)

#### `GET /api/public/[token]`
Carga el formulario público para el cliente.

**Comportamiento:**
1. Valida que el token exista.
2. Valida el estado: si es `completado`, retorna `{ "estado": "completado" }`.
3. Si es `borrador`, retorna `{ "estado": "borrador" }` (no disponible).
4. Si es `enviado` o `en_progreso`, retorna el formulario con las respuestas previas cargadas.
5. Si es `enviado`, actualiza el estado a `en_progreso`.

**Response `200` (formulario disponible):**
```json
{
  "estado": "en_progreso",
  "nombre_cliente": "Juan Pérez",
  "empresa_cliente": "Alza Construcciones",
  "bloques": [
    {
      "id": "uuid",
      "titulo": "Historia y origen",
      "descripcion": "...",
      "orden": 0,
      "preguntas": [
        {
          "id": "uuid",
          "texto": "¿Cómo surgió la empresa?",
          "tipo": "texto_largo",
          "opciones": null,
          "obligatoria": true,
          "orden": 0,
          "respuesta_previa": {
            "valor_texto": "La empresa surgió en 2004...",
            "valor_opciones": null,
            "archivo_url": null,
            "archivo_nombre": null
          }
        }
      ]
    }
  ]
}
```

**Response `200` (formulario completado):**
```json
{ "estado": "completado" }
```

---

#### `POST /api/public/[token]/respuestas`
Guarda o actualiza una respuesta (auto-save). Usa upsert.

**Request body:**
```json
{
  "pregunta_id": "uuid",
  "valor_texto": "La empresa surgió en 2004...",
  "valor_opciones": null,
  "archivo_url": null,
  "archivo_nombre": null
}
```

**Validaciones:**
- El token debe existir y estar en estado `enviado` o `en_progreso`.
- Si el token está `completado`, retorna `403`.
- `pregunta_id` debe pertenecer al formulario del token.

**Response `200`:**
```json
{ "ok": true, "fecha_guardado": "2026-05-20T14:00:00Z" }
```

---

#### `POST /api/public/[token]/archivos`
Sube un archivo al Supabase Storage.

**Request:** `multipart/form-data` con campo `archivo` (File) y campo `pregunta_id` (string).

**Validaciones:**
- Tipos permitidos: `application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- Tamaño máximo: 10 MB.
- Token válido y en estado activo.

**Response `200`:**
```json
{
  "archivo_url": "formularios-archivos/uuid-formulario/uuid-pregunta/1716300000_informe.pdf",
  "archivo_nombre": "informe.pdf"
}
```

El cliente llama a continuación a `POST /api/public/[token]/respuestas` con los campos `archivo_url` y `archivo_nombre` del response anterior.

---

#### `POST /api/public/[token]/enviar`
Envío final del formulario.

**Validaciones previas (server-side):**
1. Token existe y está en estado `en_progreso`.
2. Todas las preguntas con `obligatoria: true` tienen respuesta guardada.

**Request body:** `{}` (sin body, o body vacío).

**Response `200`:**
```json
{ "ok": true }
```

**Response `422` (preguntas obligatorias sin responder):**
```json
{
  "error": "preguntas_obligatorias_sin_respuesta",
  "preguntas_ids": ["uuid-1", "uuid-2"]
}
```

**Side effects del envío:**
1. `formularios.estado` → `completado`
2. `formularios.fecha_completado` → NOW()
3. Email de notificación enviado a BARCO via Resend.

---

## 7. Flujos de usuario detallados

### Flujo 1 — BARCO crea un formulario con generación por IA

```
[BARCO] Accede a https://forms.barco.com/admin
   ↓
[Sistema] Verifica sesión Supabase Auth
   ↓ (no autenticado)
   → Redirige a /admin/login
   ↓ (autenticado)
   → Muestra dashboard de formularios

[BARCO] Click en "Nuevo formulario"
   ↓
[Sistema] Muestra modal o página de creación
[BARCO] Ingresa "Juan Pérez" y "Alza Construcciones" → Click "Crear"
   ↓
[API] POST /api/formularios → crea registro con estado "borrador"
   ↓
[Sistema] Redirige a /admin/formularios/[id] (editor vacío)

[BARCO] Click en "Generar con IA"
   ↓
[Sistema] Muestra modal/panel con formulario de contexto:
  - Nombre/empresa: pre-cargados
  - Rubro: vacío (obligatorio)
  - Tamaño: selector
  - Tipo de servicio: selector
  - Objetivo: textarea (obligatorio)
  - Notas: textarea (opcional)

[BARCO] Completa los campos → Click "Generar preguntas"
   ↓
[Sistema] Deshabilita botón, muestra spinner de "Generando..."
[API] POST /api/ai/generar (streaming)
   ↓
[Claude API] Recibe prompt + contexto → devuelve JSON en streaming
   ↓
[Sistema] Parsea el stream y va renderizando bloques y preguntas
           en el editor a medida que llegan (UX progresivo)
   ↓
[Sistema] Streaming completo → habilita el editor

[BARCO] Revisa el resultado generado:
  - Puede editar texto de preguntas
  - Puede cambiar tipos de input
  - Puede reordenar con drag-and-drop
  - Puede agregar/eliminar preguntas o bloques

[BARCO] Click en "Guardar borrador" → guarda el estado del editor
[BARCO] Click en "Publicar formulario"
   ↓
[API] POST /api/formularios/[id]/publicar
   ↓ (validación: tiene preguntas)
[Sistema] Cambia estado a "enviado", muestra el link generado:
          https://forms.barco.com/f/abc123xyz

[BARCO] Copia el link → lo envía al cliente por email (fuera del sistema)
```

---

### Flujo 2 — BARCO crea un formulario manualmente

```
[BARCO] Crea formulario → llega al editor vacío
[BARCO] Click en "Agregar bloque"
   ↓
[Sistema] Muestra un bloque nuevo con campo de título y descripción
[BARCO] Ingresa título: "Historia y origen"

[BARCO] Click en "Agregar pregunta" dentro del bloque
   ↓
[Sistema] Muestra inputs: texto, tipo (selector), obligatoria (toggle)
[BARCO] Ingresa la pregunta y selecciona tipo "texto_largo"

[BARCO] Repite para todas las preguntas y bloques necesarios

[BARCO] Reordena arrastrando → Click "Guardar borrador"
   ↓
[API] PATCH /api/formularios/[id] (body: estructura completa)
   ↓
[BARCO] Click "Publicar formulario" → obtiene link → envía al cliente
```

---

### Flujo 3 — Cliente completa el formulario

```
[Cliente] Recibe email con link, hace click en
          https://forms.barco.com/f/abc123xyz
   ↓
[Sistema] Carga /f/abc123xyz (Server Component)
[API] GET /api/public/abc123xyz
   ↓ (token válido, estado "enviado")
[Sistema] Actualiza estado a "en_progreso"
[Sistema] Renderiza formulario con identidad visual de BARCO

[Cliente] Ve el formulario: indicador de progreso, bloques visibles

[Cliente] Expande Bloque 1 → responde la primera pregunta (textarea)
   ↓ (después de 800ms de inactividad — debounce)
[API] POST /api/public/abc123xyz/respuestas
      { pregunta_id, valor_texto: "La empresa..." }
[Sistema] Muestra "Guardado ✓" en el indicador

[Cliente] Navega a Bloque 2 → responde preguntas de selección
[Cliente] En Bloque 3 → sube un archivo PDF
   ↓
[API] POST /api/public/abc123xyz/archivos (multipart)
[Sistema] Sube a Supabase Storage → devuelve archivo_url y archivo_nombre
   ↓
[API] POST /api/public/abc123xyz/respuestas
      { pregunta_id, archivo_url: "...", archivo_nombre: "..." }

[Cliente] Cierra el navegador (accidental)
   ↓
[Cliente] Vuelve a abrir el mismo link al día siguiente
[Sistema] GET /api/public/abc123xyz → devuelve respuestas previas pre-cargadas
          El cliente retoma donde lo dejó

[Cliente] Completa el formulario → Click "Enviar formulario"
   ↓
[Sistema] Muestra modal de confirmación: "¿Enviar? No podrás editar después."
[Cliente] Confirma

[API] POST /api/public/abc123xyz/enviar
   ↓ Validación server-side: preguntas obligatorias respondidas ✓
[Sistema] Marca formulario como "completado"
[Resend] Envía email a hola@barco.com:
         "Juan Pérez completó su diagnóstico. Ver respuestas: [link admin]"

[Sistema] Muestra pantalla de confirmación al cliente:
          "¡Listo! Recibimos tu diagnóstico. El equipo de BARCO te contactará pronto."

[Cliente] Intenta volver al mismo link más tarde
[Sistema] Muestra: "Este formulario ya fue enviado. ¡Gracias por completarlo!"
```

---

### Flujo 4 — BARCO revisa respuestas y exporta

```
[BARCO] Dashboard → ve que "Alza Construcciones" tiene estado "completado" (verde)
[BARCO] Click en "Ver respuestas"
   ↓
[Sistema] Carga /admin/formularios/[id]/respuestas

[API] GET /api/formularios/[id]/respuestas
[Sistema] Renderiza respuestas por bloque y pregunta

[BARCO] Lee las respuestas de texto
[BARCO] Para archivos → Click en nombre del archivo
   ↓
[Sistema] Genera URL firmada de Supabase Storage (1h de expiración)
[Sistema] Abre/descarga el archivo

[BARCO] Click "Exportar PDF"
   ↓
[API] GET /api/formularios/[id]/exportar
[Sistema] Genera PDF con todas las respuestas
[Sistema] Descarga: "BARCO_Diagnostico_AlzaConstrucciones_20260520.pdf"
```

---

## 8. Consideraciones de seguridad

### 8.1 Autenticación y autorización

- **Admin:** Supabase Auth con email + contraseña. JWT de Supabase verificado server-side en cada request a rutas `/api/formularios/*` y `/api/ai/*`. No se usa el JWT del cliente para autorizar — se verifica en el server via `createServerClient`.
- **Formulario público:** el token UUID (v4) es el único mecanismo de acceso. Su entropía (~122 bits) lo hace impráctico de adivinar por fuerza bruta.
- **Rate limiting:** implementar rate limiting en `/api/public/[token]/respuestas` y `/api/public/[token]/enviar` para prevenir abuso (ej: 60 requests/minuto por IP usando `@upstash/ratelimit` o middleware de Vercel).

### 8.2 API Key de Anthropic

- La API key de Anthropic se almacena **exclusivamente** como variable de entorno del servidor (`ANTHROPIC_API_KEY`).
- El endpoint `/api/ai/generar` verifica la sesión de Supabase antes de invocar la API de Claude.
- La API key **nunca** se expone al cliente (no se usa en código de componentes React ni en llamadas client-side).

### 8.3 Almacenamiento de archivos

- El bucket `formularios-archivos` de Supabase Storage se configura como **privado** (sin acceso público).
- Los archivos se acceden únicamente via URLs firmadas generadas server-side con `createSignedUrl()` de Supabase, con expiración de 1 hora.
- Validación de tipo MIME y tamaño en el endpoint de upload (no solo en el cliente):
  ```typescript
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  ```
- El path de almacenamiento incluye el `formulario_id` y `pregunta_id` para aislar archivos por formulario.

### 8.4 Row Level Security (RLS) de Supabase

Todas las tablas tienen RLS habilitado con las siguientes políticas:
- **Usuarios autenticados (admin BARCO):** acceso completo (SELECT, INSERT, UPDATE, DELETE) a todas las tablas.
- **Usuarios anónimos (cliente final):** solo SELECT en `formularios`, `bloques`, `preguntas`; INSERT y UPDATE en `respuestas`.
- Los usuarios anónimos **no pueden** actualizar el estado de `formularios` directamente — el endpoint `/api/public/[token]/enviar` lo hace server-side con el cliente de Supabase con rol de servicio.

### 8.5 Variables de entorno sensibles

Ninguna variable sensible puede estar en el cliente. Las siguientes son exclusivamente server-side:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Solo para operaciones server-side privilegiadas
RESEND_API_KEY=re_...
```

Las variables públicas (seguras para el cliente) usan el prefijo `NEXT_PUBLIC_`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 8.6 Validación de inputs

- Todos los inputs del formulario de contexto de IA se validan con Zod en el servidor antes de construir el prompt de Claude.
- El texto ingresado en el formulario de contexto se sanitiza para prevenir prompt injection (no se interpolan directamente strings sin escapar en el prompt del sistema).
- Los uploads de archivos validan tipo MIME real (con `file-type` o verificando magic bytes), no solo la extensión del nombre de archivo.

### 8.7 CORS y headers de seguridad

Configurar en `next.config.ts`:
```typescript
headers: [
  {
    source: '/api/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
    ],
  },
]
```

---

## 9. Diseño del prompt de IA

### 9.1 System prompt

```
Eres un asistente especializado en la metodología de diagnóstico de marca de BARCO Estrategia de Marca, una agencia argentina de estrategia y posicionamiento de marca para empresas B2B.

Tu tarea es generar un cuestionario de diagnóstico de marca personalizado basado en el contexto del cliente que se te proporciona.

El cuestionario debe:
- Estar organizado en bloques temáticos (entre 6 y 10 bloques)
- Contener entre 5 y 8 preguntas por bloque
- Usar preguntas profundas y reflexivas, no superficiales
- Estar en español rioplatense (vos, en lugar de tú)
- Tener un tono profesional pero conversacional, acorde a una consultoría premium
- Priorizar el tipo "texto_largo" para preguntas que requieren reflexión
- Usar "seleccion_unica" o "seleccion_multiple" solo cuando sea genuinamente útil para categorizar

Bloques típicos para un diagnóstico de marca (adaptar según el rubro y tipo de servicio):
1. Historia y origen
2. Identidad de marca actual
3. Propuesta de valor
4. Posicionamiento y diferenciación
5. Audiencias y clientes
6. Comunicación y canales
7. Competencia y contexto
8. Proyección estratégica

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional, sin explicaciones, sin markdown. El JSON debe ser válido y seguir exactamente este esquema:

{
  "bloques": [
    {
      "titulo": "string",
      "descripcion": "string",
      "preguntas": [
        {
          "texto": "string",
          "tipo": "texto_largo" | "seleccion_unica" | "seleccion_multiple",
          "obligatoria": boolean,
          "opciones": ["string"] | null
        }
      ]
    }
  ]
}
```

### 9.2 User message (con contexto dinámico)

```
Generá un cuestionario de diagnóstico de marca para el siguiente cliente:

- Nombre del cliente: {nombre_cliente}
- Empresa: {empresa_cliente}
- Rubro/industria: {rubro}
- Tamaño de la empresa: {tamanio_empresa}
- Tipo de servicio que BARCO va a prestar: {tipo_servicio}
- Objetivo principal del diagnóstico: {objetivo_diagnostico}
{notas_adicionales ? `- Notas adicionales: {notas_adicionales}` : ''}

Adaptá la profundidad, el foco y el lenguaje de las preguntas al contexto específico de este cliente.
```

### 9.3 Parámetros de la llamada a Claude

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 8192,
  stream: true,
  system: SYSTEM_PROMPT,
  messages: [
    { role: "user", content: buildUserMessage(contexto) }
  ]
});
```

### 9.4 Lógica de parseo y reintento

```typescript
async function generateWithRetry(contexto: ContextoIA, attempt = 1): Promise<Bloque[]> {
  const rawJson = await streamClaudeResponse(contexto);
  
  try {
    const parsed = JSON.parse(rawJson);
    const validated = BloqueSchema.array().parse(parsed.bloques);
    return validated;
  } catch (error) {
    if (attempt < 2) {
      return generateWithRetry(contexto, attempt + 1);
    }
    throw new Error("No se pudo generar el cuestionario después de 2 intentos.");
  }
}
```

---

## 10. Configuración de entorno

### 10.1 Variables de entorno requeridas

```bash
# .env.local (nunca commitear)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Solo server-side

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notificaciones@barco.com
BARCO_NOTIFICATION_EMAIL=hola@barco.com

# App
NEXT_PUBLIC_APP_URL=https://forms.barco.com
```

### 10.2 Configuración de Supabase

1. Crear proyecto en Supabase.
2. Ejecutar el SQL de esquema completo (Sección 5.1) en el SQL Editor.
3. Crear bucket `formularios-archivos` como privado.
4. Configurar las políticas de Storage:
   ```sql
   -- Solo usuarios autenticados pueden descargar archivos
   CREATE POLICY "Admin descarga archivos"
     ON storage.objects FOR SELECT TO authenticated
     USING (bucket_id = 'formularios-archivos');

   -- Usuarios anónimos pueden subir archivos (controlado por el endpoint)
   CREATE POLICY "Upload público controlado"
     ON storage.objects FOR INSERT TO anon
     WITH CHECK (bucket_id = 'formularios-archivos');
   ```
5. Crear usuario admin en Supabase Auth → Authentication → Users.

### 10.3 Configuración de Vercel

1. Importar repositorio de GitHub.
2. Configurar todas las variables de entorno de `.env.local`.
3. Configurar dominio custom: `forms.barco.com` → CNAME a `cname.vercel-dns.com`.
4. Habilitar Vercel Analytics (opcional, no expone datos de clientes).

### 10.4 Configuración de Resend

1. Crear cuenta en Resend.
2. Verificar el dominio `barco.com` (agregar registros DNS MX/TXT/DKIM).
3. El email de notificación se envía desde `notificaciones@barco.com` al completarse cada formulario.

**Template del email de notificación a BARCO:**
```
Asunto: [BARCO] Juan Pérez completó su diagnóstico de marca

Hola equipo,

Juan Pérez (Alza Construcciones) completó su formulario de diagnóstico.

Fecha de completado: 20/05/2026 a las 15:30

Ver respuestas completas:
https://forms.barco.com/admin/formularios/[id]/respuestas

—
Sistema de Formularios BARCO
```

---

## 11. Criterios de aceptación globales

Antes de considerar el sistema listo para producción, deben cumplirse todos los siguientes criterios:

### Funcionales

- [ ] Un usuario admin puede hacer login, crear un formulario con IA y con carga manual, y publicarlo.
- [ ] El streaming de generación con IA muestra preguntas progresivamente sin errores en al menos 5 pruebas consecutivas.
- [ ] El formulario público carga correctamente en Chrome, Firefox y Safari mobile.
- [ ] El auto-save funciona: cerrar y reabrir el link restaura las respuestas.
- [ ] El envío final valida preguntas obligatorias y notifica a BARCO por email.
- [ ] La vista de respuestas muestra correctamente texto, selecciones y links de descarga de archivos.
- [ ] La exportación PDF genera un documento con todas las respuestas correctamente.

### No funcionales

- [ ] El formulario público carga en menos de 2 segundos en conexión 4G (verificado con Lighthouse).
- [ ] No hay ningún texto o logo de proveedores terceros visible en el formulario público.
- [ ] La API key de Anthropic no aparece en ningún bundle de cliente (verificar con DevTools → Network).
- [ ] Los archivos subidos no son accesibles via URL directa sin token firmado.
- [ ] El panel admin retorna 401 para cualquier request no autenticada.

### Seguridad

- [ ] Intentar acceder a `/admin/formularios` sin sesión redirige a `/admin/login`.
- [ ] Intentar hacer POST a `/api/public/[token]/enviar` con un token ya completado retorna `403`.
- [ ] Subir un archivo con extensión `.exe` retorna error de tipo no permitido.
- [ ] El endpoint `/api/ai/generar` sin sesión retorna `401`.

---

*Fin del Documento de Requerimientos Técnicos v1.0*  
*BARCO Estrategia de Marca — Sistema de Formularios de Onboarding*
