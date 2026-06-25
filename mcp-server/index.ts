#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const BARCOFORMS_URL = process.env.BARCOFORMS_URL ?? 'http://localhost:3000'
const MCP_API_KEY = process.env.MCP_API_KEY ?? ''

if (!MCP_API_KEY) {
  process.stderr.write('Error: MCP_API_KEY no está configurada\n')
  process.exit(1)
}

const crearFormularioInput = z.object({
  nombre_cliente: z.string().describe('Nombre de la persona de contacto en la empresa cliente'),
  empresa_cliente: z.string().describe('Nombre de la empresa o marca del cliente'),
  rubro: z.string().describe('Industria o sector en el que opera la empresa (ej: logística, salud, tecnología B2B)'),
  tamanio_empresa: z.string().optional().describe('Tamaño aproximado: startup, pyme o corporación'),
  tipo_servicio: z.string().optional().describe('Servicio que BARCO va a prestarle (ej: diagnóstico de marca, posicionamiento)'),
  objetivo_diagnostico: z.string().optional().describe('Qué se busca descubrir o lograr con este diagnóstico'),
  notas_adicionales: z.string().optional().describe('Cualquier contexto extra relevante: investigación previa, desafíos detectados, particularidades del cliente'),
})

const server = new Server(
  { name: 'barcoforms-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'crear_formulario',
      description: `Crea un formulario de diagnóstico de marca personalizado en BarcoForms.
Usa este tool cuando el usuario ya tenga suficiente contexto sobre el cliente y quiera generar el cuestionario.
Devuelve el link directo al editor donde puede revisar, ajustar y publicar el formulario.`,
      inputSchema: {
        type: 'object',
        properties: {
          nombre_cliente: { type: 'string', description: 'Nombre de la persona de contacto' },
          empresa_cliente: { type: 'string', description: 'Nombre de la empresa cliente' },
          rubro: { type: 'string', description: 'Industria o sector de la empresa' },
          tamanio_empresa: { type: 'string', description: 'Tamaño: startup, pyme o corporación' },
          tipo_servicio: { type: 'string', description: 'Servicio que BARCO va a prestarle' },
          objetivo_diagnostico: { type: 'string', description: 'Qué se busca descubrir con este diagnóstico' },
          notas_adicionales: { type: 'string', description: 'Contexto extra, investigación previa, desafíos detectados' },
        },
        required: ['nombre_cliente', 'empresa_cliente', 'rubro'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'crear_formulario') {
    return { content: [{ type: 'text', text: `Tool desconocida: ${request.params.name}` }], isError: true }
  }

  const parsed = crearFormularioInput.safeParse(request.params.arguments)
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Parámetros inválidos: ${parsed.error.issues[0].message}` }],
      isError: true,
    }
  }

  const response = await fetch(`${BARCOFORMS_URL}/api/mcp/crear-formulario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': MCP_API_KEY,
    },
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const error = await response.text()
    return {
      content: [{ type: 'text', text: `Error al crear el formulario: ${error}` }],
      isError: true,
    }
  }

  const result = await response.json() as {
    formulario_id: string
    url_editor: string
    nombre_cliente: string
    empresa_cliente: string
    bloques_generados: number
    preguntas_generadas: number
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Formulario creado para **${result.nombre_cliente}** (${result.empresa_cliente})

📋 **${result.bloques_generados} bloques** · **${result.preguntas_generadas} preguntas** generadas con IA

🔗 **Abrí el editor para revisar y publicar:**
${result.url_editor}

Desde ahí podés ajustar cualquier pregunta, reordenar bloques y publicar el link para enviárselo al cliente.`,
      },
    ],
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
