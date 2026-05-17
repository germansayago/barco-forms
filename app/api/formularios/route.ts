import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const crearFormularioSchema = z.object({
  nombre_cliente: z.string().min(1, 'El nombre del cliente es obligatorio'),
  empresa_cliente: z.string().min(1, 'La empresa es obligatoria'),
})

export async function GET() {
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener formularios ordenados por fecha_creacion descendente
  const { data: formularios, error } = await supabase
    .from('formularios')
    .select('*')
    .order('fecha_creacion', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(formularios)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const json = await request.json()
    const parsed = crearFormularioSchema.safeParse(json)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    
    const { nombre_cliente, empresa_cliente } = parsed.data

    const { data: nuevoFormulario, error } = await supabase
      .from('formularios')
      .insert({
        nombre_cliente,
        empresa_cliente,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(nuevoFormulario, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
