import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditorFormulario from '@/components/admin/EditorFormulario'

export default async function FormularioEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient()

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

  if (error || !formulario) {
    notFound()
  }

  // Ordenar
  if (formulario.bloques) {
    formulario.bloques.sort((a: any, b: any) => a.orden - b.orden)
    formulario.bloques.forEach((b: any) => {
      if (b.preguntas) {
        b.preguntas.sort((pa: any, pb: any) => pa.orden - pb.orden)
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <EditorFormulario initialData={formulario} />
    </div>
  )
}
