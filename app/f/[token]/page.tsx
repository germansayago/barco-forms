import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import FormularioPublico from '@/components/public/FormularioPublico'

export default async function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Usamos Service Role solo para lectura controlada por código,
  // ya que la autenticación pública depende de conocer el UUID.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: form, error } = await supabase
    .from('formularios')
    .select(`
      *,
      bloques (
        *,
        preguntas (
          *,
          respuestas (*)
        )
      )
    `)
    .eq('id', token)
    .single()

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Enlace no válido</h1>
          <p className="text-gray-500 mt-2">El formulario que buscas no existe o fue eliminado.</p>
        </div>
      </div>
    )
  }

  if (form.estado === 'borrador') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Formulario no disponible</h1>
          <p className="text-gray-500 mt-2">Este formulario aún no ha sido publicado.</p>
        </div>
      </div>
    )
  }

  if (form.estado === 'completado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-100 max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">¡Ya completaste este formulario!</h1>
          <p className="text-gray-500 mt-2">Gracias por tu tiempo. El equipo de BARCO ya tiene tus respuestas.</p>
        </div>
      </div>
    )
  }

  // Update status to en_progreso if it was enviado
  if (form.estado === 'enviado') {
    await supabase
      .from('formularios')
      .update({ estado: 'en_progreso' })
      .eq('id', token)
  }

  // Sort blocks and questions
  if (form.bloques) {
    form.bloques.sort((a: any, b: any) => a.orden - b.orden)
    form.bloques.forEach((b: any) => {
      if (b.preguntas) {
        b.preguntas.sort((pa: any, pb: any) => pa.orden - pb.orden)
      }
    })
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-black selection:text-white">
      <div className="max-w-6xl mx-auto">
        <FormularioPublico form={form} />
      </div>
    </div>
  )
}
