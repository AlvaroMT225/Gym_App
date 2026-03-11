import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AppRole, GuardResult } from './types'

// ==================== RESPONSE HELPERS ====================

export function unauthorizedResponse(message = 'No autorizado') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Acceso denegado') {
  return NextResponse.json({ error: message }, { status: 403 })
}

// ==================== ROLE NORMALIZATION ====================
// Acepta roles legacy ("USER","TRAINER","ADMIN") y los mapea a AppRole
// para compatibilidad con los Route Handlers existentes

function normalizeRole(role: string): AppRole {
  const legacyMap: Record<string, AppRole> = {
    USER: 'athlete',
    TRAINER: 'coach',
    ADMIN: 'admin',
  }
  return (legacyMap[role] as AppRole) ?? (role as AppRole)
}

// ==================== GUARD FUNCTIONS ====================

/**
 * Obtiene el usuario autenticado y su perfil desde Supabase.
 * Para uso en Route Handlers y Server Actions.
 */
export async function getAuthUserWithProfile(request?: Request) {
  const supabase = await createClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, gym_id, role, first_name, last_name, email, avatar_url, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return { supabase, user, profile }
}

/**
 * Requiere autenticacion. Devuelve GuardResult o NextResponse 401.
 */
export async function requireAuth(): Promise<GuardResult | NextResponse> {
  const result = await getAuthUserWithProfile()
  if (!result) return unauthorizedResponse()

  return {
    userId: result.user.id,
    email: result.user.email ?? '',
    role: result.profile.role as AppRole,
  }
}

/**
 * Requiere rol especifico. Acepta roles nuevos ("athlete","coach","admin")
 * y legacy ("USER","TRAINER","ADMIN") para compatibilidad con rutas existentes.
 *
 * @param request - Route request usada para auth por cookies web o Bearer mobile
 * @param allowedRoles - Roles permitidos (nuevos o legacy)
 * @returns GuardResult con { userId, email, role } o NextResponse (401/403)
 */
export async function requireRoleFromRequest(
  request: Request,
  allowedRoles: string[]
): Promise<GuardResult | NextResponse> {
  const result = await getAuthUserWithProfile(request)
  if (!result) return unauthorizedResponse('No autorizado - sesion invalida')

  const userRole = result.profile.role as AppRole
  const normalizedAllowed = allowedRoles.map(normalizeRole)

  if (!normalizedAllowed.includes(userRole)) {
    return forbiddenResponse('No tienes permiso para acceder a este recurso')
  }

  return {
    userId: result.user.id,
    email: result.user.email ?? '',
    role: userRole,
  }
}
