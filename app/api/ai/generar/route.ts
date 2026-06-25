import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';

function buildSystemPrompt(cantidadBloques: number, preguntasPorBloque: number) {
  return `Eres un asistente especializado en la metodología de diagnóstico de marca de BARCO Estrategia de Marca, una agencia argentina de estrategia y posicionamiento de marca para empresas B2B.

Tu tarea es generar un cuestionario de diagnóstico de marca personalizado basado en el contexto del cliente que se te proporciona.

El cuestionario debe:
- Estar organizado en exactamente ${cantidadBloques} bloques temáticos
- Contener exactamente ${preguntasPorBloque} preguntas por bloque
- Usar preguntas profundas y reflexivas, no superficiales
- Estar en español rioplatense (vos, en lugar de tú)
- Tener un tono profesional pero conversacional, acorde a una consultoría premium
- Priorizar el tipo "texto_largo" para preguntas que requieren reflexión
- Usar "seleccion_unica" o "seleccion_multiple" solo cuando sea genuinamente útil para categorizar
- Usar "archivo" cuando la pregunta requiera que el cliente adjunte material visual, documentos o referencias (ej: logo actual, manual de marca, materiales de comunicación, referencias de estilo)

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
}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response('No autorizado', { status: 401 });
    }

    const {
      nombre_cliente,
      empresa_cliente,
      rubro,
      tamanio_empresa,
      tipo_servicio,
      objetivo_diagnostico,
      notas_adicionales,
      cantidad_bloques = 5,
      preguntas_por_bloque = 5,
    } = await request.json();

    const userMessage = `Generá un cuestionario de diagnóstico de marca para el siguiente cliente:

- Nombre del cliente: ${nombre_cliente}
- Empresa: ${empresa_cliente}
- Rubro/industria: ${rubro}
- Tamaño de la empresa: ${tamanio_empresa || 'No especificado'}
- Tipo de servicio que BARCO va a prestar: ${tipo_servicio || 'No especificado'}
- Objetivo principal del diagnóstico: ${objetivo_diagnostico || 'No especificado'}
${notas_adicionales ? `- Notas adicionales: ${notas_adicionales}` : ''}

Adaptá la profundidad, el foco y el lenguaje de las preguntas al contexto específico de este cliente.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      stream: true,
      system: buildSystemPrompt(cantidad_bloques, preguntas_por_bloque),
      messages: [
        { role: "user", content: userMessage }
      ]
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error generando IA:', error);
    return new Response(error.message, { status: 500 });
  }
}

export async function GET() {
  return new Response('No autorizado', { status: 401 });
}
