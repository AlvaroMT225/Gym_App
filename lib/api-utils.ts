import { NextResponse } from 'next/server'
import { ZodError, ZodType } from 'zod'
import type { createAdminClient } from '@/lib/supabase/server'

// ─── Shared client type (both createClient and createAdminClient return this) ───
type SupabaseClient = ReturnType<typeof createAdminClient>

// ─── Standard error response shape ───────────────────────────────────────────
export type ApiErrorResponse = {
  error: string
  code: string
  details?: unknown
}

// ─── handleApiError ───────────────────────────────────────────────────────────
// Converts any thrown value into a typed NextResponse with the correct status.
// Usage: catch (err) { return handleApiError(err) }
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Zod validation failure → 400
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: error.flatten(),
      },
      { status: 400 }
    )
  }

  // Named domain errors thrown by requireAuth / requireRole / route logic
  if (error instanceof Error) {
    switch (error.message) {
      case 'UNAUTHORIZED':
        return NextResponse.json(
          { error: 'No autenticado', code: 'UNAUTHORIZED' },
          { status: 401 }
        )
      case 'FORBIDDEN':
        return NextResponse.json(
          { error: 'Sin permisos suficientes', code: 'FORBIDDEN' },
          { status: 403 }
        )
      case 'NOT_FOUND':
        return NextResponse.json(
          { error: 'Recurso no encontrado', code: 'NOT_FOUND' },
          { status: 404 }
        )
      case 'CONFLICT':
        return NextResponse.json(
          { error: 'Conflicto de datos', code: 'CONFLICT' },
          { status: 409 }
        )
    }
  }

  // Unexpected error → 500
  console.error('[handleApiError] unhandled error:', error)
  return NextResponse.json(
    { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

// ─── requireAuth ──────────────────────────────────────────────────────────────
// Verifies a valid Supabase session exists. Throws 'UNAUTHORIZED' otherwise.
export async function requireAuth(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

// ─── requireRole ──────────────────────────────────────────────────────────────
// Verifies session + role membership. Throws 'FORBIDDEN' if role not allowed.
// Returns { user, profile: { role, gym_id } } for downstream use.
export async function requireRole(
  supabase: SupabaseClient,
  allowedRoles: string[]
): Promise<{
  user: Awaited<ReturnType<typeof requireAuth>>
  profile: { role: string; gym_id: string | null }
}> {
  const user = await requireAuth(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .select('role, gym_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) throw new Error('UNAUTHORIZED')

  const profile = data as { role: string; gym_id: string | null }
  if (!allowedRoles.includes(profile.role)) throw new Error('FORBIDDEN')

  return { user, profile }
}

// ─── validateBody ─────────────────────────────────────────────────────────────
// Parses the request body against a Zod schema.
// Throws ZodError on failure — handleApiError converts it to a 400.
export async function validateBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  const body: unknown = await request.json()
  return schema.parse(body)
}

// ─── paginationParams ─────────────────────────────────────────────────────────
// Extracts limit (default 50, max 200) and offset (default 0) from URL params.
export function paginationParams(searchParams: URLSearchParams): {
  limit: number
  offset: number
} {
  const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)

  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200)
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0)

  return { limit, offset }
}
