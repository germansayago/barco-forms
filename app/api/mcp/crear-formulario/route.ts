import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const requestSchema = z.object({
  nombre_cliente: z.string().min(1),
  empresa_cliente: z.string().min(1),
  rubro: z.string().min(1),
  tamanio_empresa: z.string().optional(),
  tipo_servicio: z.string().optional(),
  objetivo_diagnostico: z.string().optional(),
  notas_adicionales: z.string().optional(),
})

const bloqueIASchema = z.object({
  titulo: z.string(),
  descripcion: z.string(),
  preguntas: z.array(z.object({
    texto: z.string(),
    tipo: z.enum(['texto_largo', 'seleccion_unica', 'seleccion_multiple']),
    obligatoria: z.boolean(),
    opciones: z.array(z.string()).nullable(),
  })),
})

const respuestaIASchema = z.object({
  bloques: z.array(bloqueIASchema),
})

const SYSTEM_PROMPT = `Eres un asistente especializado en la metodología de diagnóstico de marca de BARCO Estrategia de Marca, una agencia argentina de estrategia y posicionamiento de marca para empresas B2B.

Tu tarea es generar un cuestionario de diagnóstico de marca personalizado basado en el contexto del cliente que se te proporciona.

El cuestionario debe:
- Estar organizado en bloques temáticos (entre 6 y 10 bloques)
- Contener entre 5 y 8 preguntas por bloque
- Usar preguntas profundas y reflexivas, no superficiales
- Estar en español rioplatense (vos, en lugar de tú)
- Tener un tono profesional pero conversacional, acorde a una consultoría premium
- Priorizar el tipo "texto_largo" para preguntas que requieren reflexión
- Usar "seleccion_unica" o "seleccion_multiple" solo cuando sea genuinamente útil para categorizar

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
}`

function buildUserMessage(data: z.infer<typeof requestSchema>): string {
  return `Generá un cuestionario de diagnóstico de marca para el siguiente cliente:

- Nombre del cliente: ${data.nombre_cliente}
- Empresa: ${data.empresa_cliente}
- Rubro/industria: ${data.rubro}
- Tamaño de la empresa: ${data.tamanio_empresa || 'No especificado'}
- Tipo de servicio que BARCO va a prestar: ${data.tipo_servicio || 'No especificado'}
- Objetivo principal del diagnóstico: ${data.objetivo_diagnostico || 'No especificado'}
${data.notas_adicionales ? `- Notas adicionales: ${data.notas_adicionales}` : ''}

Adaptá la profundidad, el foco y el lenguaje de las preguntas al contexto específico de este cliente.`
}

export async function POST(request: Request) {
  // Autenticación por API key
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const data = parsed.data

  // Generar preguntas con IA (sin streaming — necesitamos el JSON completo)
  let bloquesIA: z.infer<typeof respuestaIASchema>['bloques']
  for (let intento = 1; intento <= 2; intento++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(data) }],
    })

    const texto = response.content[0].type === 'text' ? response.content[0].text : ''

    const parseResult = respuestaIASchema.safeParse(JSON.parse(texto))
    if (parseResult.success) {
      bloquesIA = parseResult.data.bloques
      break
    }
    if (intento === 2) {
      return NextResponse.json({ error: 'No se pudo generar el formulario con IA' }, { status: 500 })
    }
  }

  // Crear el formulario en Supabase
  const { data: formulario, error: formError } = await supabase
    .from('formularios')
    .insert({
      nombre_cliente: data.nombre_cliente,
      empresa_cliente: data.empresa_cliente,
      generado_con_ia: true,
      contexto_ia: data,
    })
    .select()
    .single()

  if (formError || !formulario) {
    return NextResponse.json({ error: 'Error al crear el formulario' }, { status: 500 })
  }

  // Insertar bloques y preguntas
  for (let bi = 0; bi < bloquesIA!.length; bi++) {
    const bloqueData = bloquesIA![bi]
    const bloqueId = uuidv4()

    const { error: bloqueError } = await supabase.from('bloques').insert({
      id: bloqueId,
      formulario_id: formulario.id,
      titulo: bloqueData.titulo,
      descripcion: bloqueData.descripcion,
      orden: bi,
    })

    if (bloqueError) {
      return NextResponse.json({ error: 'Error al guardar bloques' }, { status: 500 })
    }

    const preguntas = bloqueData.preguntas.map((p, pi) => ({
      id: uuidv4(),
      bloque_id: bloqueId,
      texto: p.texto,
      tipo: p.tipo,
      obligatoria: p.obligatoria,
      opciones: p.opciones,
      orden: pi,
    }))

    const { error: pregError } = await supabase.from('preguntas').insert(preguntas)
    if (pregError) {
      return NextResponse.json({ error: 'Error al guardar preguntas' }, { status: 500 })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  return NextResponse.json({
    formulario_id: formulario.id,
    url_editor: `${appUrl}/admin/formularios/${formulario.id}`,
    nombre_cliente: formulario.nombre_cliente,
    empresa_cliente: formulario.empresa_cliente,
    bloques_generados: bloquesIA!.length,
    preguntas_generadas: bloquesIA!.reduce((acc, b) => acc + b.preguntas.length, 0),
  }, { status: 201 })
}
