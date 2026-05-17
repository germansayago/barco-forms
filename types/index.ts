export type FormularioEstado = 'borrador' | 'enviado' | 'en_progreso' | 'completado'

export type PreguntaTipo = 'texto_largo' | 'seleccion_unica' | 'seleccion_multiple' | 'archivo'

export type TamanioEmpresa = 'startup' | 'pyme' | 'corporación'

export type TipoServicio =
  | 'diagnóstico de marca'
  | 'arquitectura comercial B2B'
  | 'estrategia de posicionamiento'
  | 'otro'

export interface ContextoIA {
  nombre_cliente: string
  empresa_cliente: string
  rubro: string
  tamanio_empresa: TamanioEmpresa
  tipo_servicio: TipoServicio
  objetivo_diagnostico: string
  notas_adicionales?: string
}

export interface Pregunta {
  id: string
  bloque_id: string
  texto: string
  tipo: PreguntaTipo
  opciones: string[] | null
  obligatoria: boolean
  orden: number
}

export interface Bloque {
  id: string
  formulario_id: string
  titulo: string
  descripcion: string | null
  orden: number
  preguntas: Pregunta[]
}

export interface Formulario {
  id: string
  nombre_cliente: string
  empresa_cliente: string
  token_acceso: string
  estado: FormularioEstado
  generado_con_ia: boolean
  contexto_ia: ContextoIA | null
  fecha_creacion: string
  fecha_envio: string | null
  fecha_completado: string | null
  created_by: string | null
}

export interface FormularioConBloques extends Formulario {
  bloques: Bloque[]
}

export interface Respuesta {
  id: string
  pregunta_id: string
  formulario_id: string
  valor_texto: string | null
  valor_opciones: string[] | null
  archivo_url: string | null
  archivo_nombre: string | null
  fecha_guardado: string
}

export interface PreguntaConRespuesta extends Pregunta {
  respuesta_previa: Pick<Respuesta, 'valor_texto' | 'valor_opciones' | 'archivo_url' | 'archivo_nombre'> | null
}

export interface BloqueConRespuestas extends Omit<Bloque, 'preguntas'> {
  preguntas: PreguntaConRespuesta[]
}

// Payload para el editor — bloques con preguntas sin IDs (para elementos nuevos)
export interface BloqueEditorPayload {
  id: string | null
  titulo: string
  descripcion: string | null
  orden: number
  preguntas: PreguntaEditorPayload[]
}

export interface PreguntaEditorPayload {
  id: string | null
  texto: string
  tipo: PreguntaTipo
  opciones: string[] | null
  obligatoria: boolean
  orden: number
}
