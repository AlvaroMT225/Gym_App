import type { User } from '@supabase/supabase-js'

// ==================== ROLES ====================
// Mapeo de roles (Supabase DB enum → AppRole):
//   athlete     = ex "USER"
//   coach       = ex "TRAINER"
//   admin       = ex "ADMIN"
//   super_admin = nuevo (admin con acceso total)

export type AppRole = 'athlete' | 'coach' | 'admin' | 'super_admin'

// ==================== PERMISSIONS ====================

export type Permission =
  | 'workouts:read'
  | 'workouts:write'
  | 'clients:read'
  | 'clients:assign'
  | 'machines:manage'
  | 'rankings:manage'
  | 'billing:manage'
  | 'staff:manage'
  | 'gym:settings'

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  athlete: ['workouts:read', 'workouts:write'],
  coach: ['workouts:read', 'workouts:write', 'clients:read', 'clients:assign'],
  admin: [
    'workouts:read',
    'workouts:write',
    'clients:read',
    'clients:assign',
    'machines:manage',
    'rankings:manage',
    'billing:manage',
    'staff:manage',
    'gym:settings',
  ],
  super_admin: [
    'workouts:read',
    'workouts:write',
    'clients:read',
    'clients:assign',
    'machines:manage',
    'rankings:manage',
    'billing:manage',
    'staff:manage',
    'gym:settings',
  ],
}

// ==================== PROFILE (tabla profiles) ====================

export interface UserProfile {
  id: string
  gym_id: string | null
  role: AppRole
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  bio: string | null
  coach_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ==================== AUTH CONTEXT USER ====================
// Objeto de usuario "aplanado" para uso en componentes UI
// Combina Supabase User + UserProfile para conveniencia

export interface AppUser {
  id: string
  name: string        // first_name + last_name, fallback al email
  email: string
  role: AppRole
  avatar: string      // iniciales para el avatar (ej "AM")
  avatarUrl: string | null
}

// ==================== AUTH STATE ====================

export interface AuthState {
  user: AppUser | null
  profile: UserProfile | null
  supabaseUser: User | null
  loading: boolean
  error: string | null
}

// ==================== GUARD RESULT ====================
// Lo que devuelven requireRoleFromRequest y similares

export interface GuardResult {
  userId: string
  email: string
  role: AppRole
}
