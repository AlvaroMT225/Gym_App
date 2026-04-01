import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type RequestWithHeaders = Pick<Request, 'headers'>

function requireEnv(
  name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY'
) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`)
  }

  return value
}

function getBearerAuthorization(request?: RequestWithHeaders) {
  const authorization = request?.headers.get('authorization')?.trim()

  if (!authorization) {
    return null
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ? `Bearer ${match[1].trim()}` : null
}

export async function createClient(request?: RequestWithHeaders) {
  const cookieStore = await cookies()
  const authorization = getBearerAuthorization(request)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: authorization
        ? {
            headers: {
              Authorization: authorization,
            },
          }
        : undefined,
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
            // setAll called from a Server Component - cookies can only be set
            // from Server Actions or Route Handlers. The middleware handles refresh.
          }
        },
      },
    }
  )
}

// Service role client for admin operations (bypasses RLS)
// Only use in trusted server-side contexts (API routes, server actions)
export function createAdminClient() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}

// Stateless anon client for auth operations that must not mutate the current session.
export function createStatelessClient() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
