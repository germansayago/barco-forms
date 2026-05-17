import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { ReportePDF } from '@/components/pdf/ReportePDF'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response('No autorizado', { status: 401 })
  }

  // Fetch data
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
    .eq('id', id)
    .single()

  if (error || !form) {
    return new Response('Formulario no encontrado', { status: 404 })
  }

  // Order
  if (form.bloques) {
    form.bloques.sort((a: any, b: any) => a.orden - b.orden)
    form.bloques.forEach((b: any) => {
      if (b.preguntas) {
        b.preguntas.sort((pa: any, pb: any) => pa.orden - pb.orden)
      }
    })
  }

  try {
    const stream = await renderToStream(<ReportePDF form={form} />)
    const filename = `BARCO_Diagnostico_${form.empresa_cliente.replace(/[^a-z0-9]/gi, '_')}.pdf`

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"` // Use 'attachment' to force download
      }
    })
  } catch (pdfError) {
    console.error('PDF Generation error:', pdfError)
    return new Response('Error generando PDF', { status: 500 })
  }
}
