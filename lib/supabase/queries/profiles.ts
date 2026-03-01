import { createClient } from '../client'
import type { ProfileUpdate } from '../types/database'

export async function getProfile(userId: string) {
  const supabase = createClient()
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
}

export async function updateProfile(userId: string, data: ProfileUpdate) {
  const supabase = createClient()
  return supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single()
}

export async function getAthleteStats(userId: string) {
  const supabase = createClient()
  return supabase
    .from('user_stats')
    .select('*')
    .eq('profile_id', userId)
    .single()
}

export async function getUserStats(profileId: string): Promise<{
  current_streak: number
  total_points: number
  total_sessions: number
  total_volume_kg: number
  level: number
} | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_stats')
    .select('current_streak, total_points, total_sessions, total_volume_kg, level')
    .eq('profile_id', profileId)
    .single()

  if (error) {
    console.error('[getUserStats] Error:', error)
    return null
  }
  return data
}

export async function getAthleteAchievements(userId: string) {
  const supabase = createClient()
  return supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('profile_id', userId)
    .order('unlocked_at', { ascending: false })
}

export async function getGymMembers(gymId: string) {
  const supabase = createClient()
  return supabase
    .from('profiles')
    .select(`
      *,
      memberships(plan_type, status, end_date),
      user_stats(total_sessions, current_streak, level)
    `)
    .eq('gym_id', gymId)
    .eq('role', 'athlete')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
}

export async function getMembership(userId: string) {
  const supabase = createClient()
  return supabase
    .from('memberships')
    .select('*')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle()
}

export async function getUserMembership(profileId: string): Promise<{
  plan_type: string
  status: string
  start_date: string | null
  end_date: string | null
  auto_renew: boolean
} | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('memberships')
    .select('plan_type, status, start_date, end_date, auto_renew')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getUserMembership] Error:', error)
    return null
  }
  return data
}

export async function getDashboard() {
  const supabase = createClient()
  return supabase
    .from('athlete_dashboard')
    .select('*')
    .single()
}

export async function getNotifications(userId: string, unreadOnly = false) {
  const supabase = createClient()
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  return query
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createClient()
  return supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
}
