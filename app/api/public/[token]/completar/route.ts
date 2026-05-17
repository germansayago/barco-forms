import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/resend'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: form, error: fetchError } = await supabase
    .from('formularios')
    .select('nombre_cliente, empresa_cliente, estado')
    .eq('id', token)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (form.estado === 'completado') {
    return NextResponse.json({ error: 'El formulario ya fue completado previamente' }, { status: 403 })
  }

  const { error } = await supabase
    .from('formularios')
    .update({ estado: 'completado' })
    .eq('id', token)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enviar notificación por email a BARCO
  if (process.env.RESEND_API_KEY && process.env.BARCO_NOTIFICATION_EMAIL) {
    try {
      const formUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/formularios/${token}`
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'notificaciones@barco.com',
        to: process.env.BARCO_NOTIFICATION_EMAIL,
        subject: `✅ Diagnóstico completado: ${form.empresa_cliente}`,
        html: `
          <h2>¡Nuevo diagnóstico completado!</h2>
          <p>El cliente <strong>${form.nombre_cliente}</strong> de la empresa <strong>${form.empresa_cliente}</strong> acaba de finalizar su formulario de diagnóstico de marca.</p>
          <p>Puedes revisar sus respuestas y generar el reporte en PDF haciendo clic en el siguiente enlace:</p>
          <a href="${formUrl}" style="display:inline-block;padding:10px 20px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">Ver Resultados</a>
        `
      })
    } catch (emailErr) {
      console.error('Error enviando email:', emailErr)
      // No frenamos el completado del formulario si falla el email
    }
  }

  return NextResponse.json({ success: true })
}
