import { createClient } from '../client'
import type { MachineUpdate } from '../types/database'

// ==================== MACHINES ====================

export async function getMachines(gymId: string) {
  const supabase = createClient()
  return supabase
    .from('machines')
    .select(`
      *,
      exercises(id, name, muscle_groups),
      qr_codes(id, code, is_active)
    `)
    .eq('gym_id', gymId)
    .order('name')
}

export async function getMachineById(machineId: string) {
  const supabase = createClient()
  return supabase
    .from('machines')
    .select(`
      *,
      exercises(*),
      qr_codes(*),
      machine_tutorials(*)
    `)
    .eq('id', machineId)
    .single()
}

export async function getMachineByQrCode(qrCode: string) {
  const supabase = createClient()
  const { data: qr, error } = await supabase
    .from('qr_codes')
    .select('machine_id')
    .eq('code', qrCode)
    .eq('is_active', true)
    .single()

  if (error || !qr) return { data: null, error }

  return supabase
    .from('machines')
    .select(`
      *,
      exercises(*),
      machine_tutorials(*)
    `)
    .eq('id', qr.machine_id)
    .single()
}

export async function updateMachineStatus(machineId: string, data: MachineUpdate) {
  const supabase = createClient()
  return supabase
    .from('machines')
    .update(data)
    .eq('id', machineId)
    .select()
    .single()
}

// ==================== TUTORIALS ====================

export async function getTutorialsByMachine(machineId: string) {
  const supabase = createClient()
  return supabase
    .from('machine_tutorials')
    .select('*')
    .eq('machine_id', machineId)
    .eq('is_active', true)
    .order('order_index')
}

export async function getTutorialProgress(userId: string) {
  const supabase = createClient()
  return supabase
    .from('user_tutorial_progress')
    .select(`
      *,
      tutorial:machine_tutorials(
        title,
        machine:machines(name)
      )
    `)
    .eq('profile_id', userId)
}

export async function updateTutorialProgress(
  userId: string,
  tutorialId: string,
  progressPercent: number
) {
  const supabase = createClient()
  const isCompleted = progressPercent >= 100

  return supabase
    .from('user_tutorial_progress')
    .upsert({
      profile_id: userId,
      tutorial_id: tutorialId,
      progress_percent: progressPercent,
      completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .select()
    .single()
}

// ==================== EXERCISES ====================

export async function getExercises(gymId?: string, machineId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('exercises')
    .select('*')
    .order('name')

  if (gymId) {
    query = query.or(`gym_id.eq.${gymId},is_public.eq.true`)
  } else {
    query = query.eq('is_public', true)
  }

  if (machineId) {
    query = query.eq('machine_id', machineId)
  }

  return query
}

export async function getExerciseById(exerciseId: string) {
  const supabase = createClient()
  return supabase
    .from('exercises')
    .select(`
      *,
      machine:machines(name, location)
    `)
    .eq('id', exerciseId)
    .single()
}

// ==================== QR CODE SCAN ====================

export async function recordQrScan(qrCode: string, sessionId?: string) {
  const supabase = createClient()

  // Get QR code and increment scan count
  const { data: qr, error } = await supabase
    .from('qr_codes')
    .select('id, machine_id')
    .eq('code', qrCode)
    .eq('is_active', true)
    .single()

  if (error || !qr) return { data: null, error }

  // Increment scan count via RPC
  await supabase.rpc('increment_qr_scan', { p_qr_code: qrCode })

  // Log machine usage in session if session provided
  if (sessionId) {
    await supabase
      .from('session_machines')
      .insert({
        session_id: sessionId,
        machine_id: qr.machine_id,
        qr_code_id: qr.id,
      })
  }

  return { data: qr, error: null }
}

// ==================== RANKINGS ====================

export async function getGymRankings(gymId: string) {
  const supabase = createClient()
  return supabase
    .from('rankings')
    .select(`
      *,
      ranking_entries(
        rank,
        value,
        profile:profiles(first_name, last_name, avatar_url)
      )
    `)
    .eq('gym_id', gymId)
    .eq('is_active', true)
}

export async function getActiveChallenges(gymId: string, userId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  return supabase
    .from('challenges')
    .select(`
      *,
      user_challenges!left(
        current_value,
        completed,
        joined_at
      )
    `)
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
}
