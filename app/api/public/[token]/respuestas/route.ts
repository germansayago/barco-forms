import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  
  // Usamos Service Role ya que este es el endpoint público (sin auth user)
  // El token (UUID del formulario) funciona como clave de acceso.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Validate form is not completed
  const { data: form } = await supabase
    .from('formularios')
    .select('estado')
    .eq('id', token)
    .single()

  if (form?.estado === 'completado') {
    return NextResponse.json({ error: 'Formulario ya completado' }, { status: 403 })
  }

  try {
    const json = await request.json()
    const { pregunta_id, valor_texto, valor_opciones, archivo_url, archivo_nombre, archivos } = json

    if (!pregunta_id) {
      return NextResponse.json({ error: 'pregunta_id es requerido' }, { status: 400 })
    }

    // Upsert respuesta: el CONSTRAINT unique_respuesta (pregunta_id, formulario_id) garantiza que se actualice
    const { error } = await supabase
      .from('respuestas')
      .upsert({
        formulario_id: token,
        pregunta_id,
        valor_texto,
        valor_opciones,
        archivo_url,
        archivo_nombre,
        archivos,
        fecha_guardado: new Date().toISOString()
      }, {
        onConflict: 'pregunta_id,formulario_id'
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
