import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede llamarse desde un Server Component — ignorar en ese caso
          }
        },
      },
    }
  )
}

// Cliente con service role para operaciones privilegiadas server-side
export async function createServiceClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Helper to sign all file URLs within a form structure for private storage
export async function signFormFileUrls(formulario: any) {
  if (!formulario) return formulario

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (formulario.bloques) {
    for (const b of formulario.bloques) {
      if (b.preguntas) {
        for (const p of b.preguntas) {
          if (p.tipo === 'archivo' && p.respuestas && p.respuestas[0]) {
            const resp = p.respuestas[0]
            if (resp.archivos && Array.isArray(resp.archivos)) {
              const signedFiles = []
              for (const file of resp.archivos) {
                if (file.path) {
                  const { data: signed } = await supabase.storage
                    .from('formularios-archivos')
                    .createSignedUrl(file.path, 3600)
                  signedFiles.push({
                    ...file,
                    url: signed?.signedUrl || file.url
                  })
                } else {
                  signedFiles.push(file)
                }
              }
              resp.archivos = signedFiles
            } else if (resp.archivo_url) {
              const path = resp.archivo_url.startsWith('http')
                ? resp.archivo_url.split('/').slice(-3).join('/')
                : resp.archivo_url
              
              const { data: signed } = await supabase.storage
                .from('formularios-archivos')
                .createSignedUrl(path, 3600)
              
              if (signed?.signedUrl) {
                resp.archivo_url = signed.signedUrl
              }
            }
          }
        }
      }
    }
  }
  return formulario
}
