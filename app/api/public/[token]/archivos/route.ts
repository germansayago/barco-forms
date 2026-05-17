import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pregunta_id = formData.get('pregunta_id') as string;

    if (!file || !pregunta_id) {
      return NextResponse.json({ error: 'Archivo y pregunta_id son requeridos' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${token}/${pregunta_id}/${timestamp}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('archivos')
      .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('archivos').getPublicUrl(path);

    return NextResponse.json({ success: true, url: publicUrl, filename: file.name, path })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { path } = await request.json();
    if (!path) return NextResponse.json({ error: 'Path requerido' }, { status: 400 });

    const { error } = await supabase.storage.from('archivos').remove([path]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
