import { createClient } from '../client'
import type { UserRole } from '../types/database'

export async function signUp(email: string, password: string, role: UserRole = 'athlete') {
  const supabase = createClient()
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  })
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  const supabase = createClient()
  return supabase.auth.signOut()
}

export async function getSession() {
  const supabase = createClient()
  return supabase.auth.getSession()
}

export async function getUser() {
  const supabase = createClient()
  return supabase.auth.getUser()
}

export async function resetPasswordRequest(email: string) {
  const supabase = createClient()
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  return supabase.auth.updateUser({ password: newPassword })
}
