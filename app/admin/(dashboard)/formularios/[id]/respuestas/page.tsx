import { notFound } from 'next/navigation'
import { createClient, signFormFileUrls } from '@/lib/supabase/server'
import RespuestasViewer from '@/components/admin/RespuestasViewer'

export default async function RespuestasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return <div>No autorizado</div>
  }

  // Fetch form with blocks, questions and their answers
  const { data: formulario, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error || !formulario) {
    notFound()
  }

  // Order
  if (formulario.bloques) {
    formulario.bloques.sort((a: any, b: any) => a.orden - b.orden)
    formulario.bloques.forEach((b: any) => {
      if (b.preguntas) {
        b.preguntas.sort((pa: any, pb: any) => pa.orden - pb.orden)
      }
    })
  }

  // Sign private storage URLs
  const formularioSigned = await signFormFileUrls(formulario)

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6">
      <RespuestasViewer form={formularioSigned} />
    </div>
  )
}
