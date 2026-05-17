import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const preguntaSchema = z.object({
  id: z.string().uuid(),
  texto: z.string().min(1, 'El texto es obligatorio'),
  tipo: z.enum(['texto_largo', 'seleccion_unica', 'seleccion_multiple', 'archivo']),
  opciones: z.array(z.string()).nullable(),
  obligatoria: z.boolean(),
  orden: z.number(),
})

const bloqueSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().nullable(),
  orden: z.number(),
  preguntas: z.array(preguntaSchema),
})

const updateFormularioSchema = z.object({
  nombre_cliente: z.string().min(1),
  empresa_cliente: z.string().min(1),
  bloques: z.array(bloqueSchema),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient()

  // Fetch form with nested blocks and questions
  const { data: formulario, error } = await supabase
    .from('formularios')
    .select(`
      *,
      bloques (
        *,
        preguntas (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  // Sort bloques and preguntas manually just in case Supabase returns them unordered
  if (formulario.bloques) {
    formulario.bloques.sort((a: any, b: any) => a.orden - b.orden)
    formulario.bloques.forEach((b: any) => {
      if (b.preguntas) {
        b.preguntas.sort((pa: any, pb: any) => pa.orden - pb.orden)
      }
    })
  }

  return NextResponse.json(formulario)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const json = await request.json()
    const parsed = updateFormularioSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { nombre_cliente, empresa_cliente, bloques } = parsed.data

    // 1. Update main Formulario
    const { error: formError } = await supabase
      .from('formularios')
      .update({ nombre_cliente, empresa_cliente })
      .eq('id', id)
      .eq('created_by', user.id) // Security check

    if (formError) throw formError

    // Extract all incoming IDs to know what to keep
    const incomingBloquesIds = bloques.map((b) => b.id)
    const incomingPreguntasIds = bloques.flatMap((b) => b.preguntas.map((p) => p.id))

    // 2. Fetch current IDs from DB to detect deletions
    const { data: currentBloques } = await supabase
      .from('bloques')
      .select('id')
      .eq('formulario_id', id)
    
    const currentBloqueIds = currentBloques?.map((b) => b.id) || []
    
    // We only delete bloques. Cascade will handle deleting related preguntas
    const bloquesToDelete = currentBloqueIds.filter(blockId => !incomingBloquesIds.includes(blockId))
    
    if (bloquesToDelete.length > 0) {
      await supabase.from('bloques').delete().in('id', bloquesToDelete)
    }

    // Prepare arrays for upsert
    const bloquesToUpsert = bloques.map(({ preguntas, ...b }) => ({
      ...b,
      formulario_id: id,
    }))

    const preguntasToUpsert = bloques.flatMap((b) => 
      b.preguntas.map((p) => ({
        ...p,
        bloque_id: b.id,
      }))
    )

    // 3. Upsert Bloques
    if (bloquesToUpsert.length > 0) {
      const { error: bloquesError } = await supabase.from('bloques').upsert(bloquesToUpsert)
      if (bloquesError) throw bloquesError
    }

    // 4. Fetch current Preguntas (to delete those removed from existing bloques)
    // Actually, any missing pregunta from incomingPreguntasIds should be deleted
    // But we must scope it to the current form's bloques.
    const { data: currentPreguntas } = await supabase
      .from('preguntas')
      .select('id, bloque_id')
      .in('bloque_id', incomingBloquesIds) // Only check against surviving bloques

    const currentPreguntasIds = currentPreguntas?.map(p => p.id) || []
    const preguntasToDelete = currentPreguntasIds.filter(id => !incomingPreguntasIds.includes(id))

    if (preguntasToDelete.length > 0) {
      await supabase.from('preguntas').delete().in('id', preguntasToDelete)
    }

    // 5. Upsert Preguntas
    if (preguntasToUpsert.length > 0) {
      const { error: preguntasError } = await supabase.from('preguntas').upsert(preguntasToUpsert)
      if (preguntasError) throw preguntasError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Editor Save Error:', err)
    return NextResponse.json({ error: 'Error al guardar el formulario' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { error } = await supabase
    .from('formularios')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
