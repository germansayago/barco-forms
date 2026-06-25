import { z } from 'zod'

const envSchema = z.object({
  // Supabase — públicas (cliente)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Supabase — solo server
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Anthropic — solo server
  ANTHROPIC_API_KEY: z.string().min(1),

  // Resend — solo server
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  BARCO_NOTIFICATION_EMAIL: z.string().email(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // MCP
  MCP_API_KEY: z.string().min(1),
})

// Se valida en runtime solo en el servidor. En el cliente solo están disponibles las NEXT_PUBLIC_*.
const _env = envSchema.safeParse(process.env)

if (!_env.success && typeof window === 'undefined') {
  console.error('Variables de entorno inválidas o faltantes:')
  console.error(_env.error.flatten().fieldErrors)
  throw new Error('Variables de entorno inválidas. Revisá .env.local')
}

export const env = _env.success ? _env.data : ({} as z.infer<typeof envSchema>)
