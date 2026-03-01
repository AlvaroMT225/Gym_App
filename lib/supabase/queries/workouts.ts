import { createClient } from '../client'
import type { WorkoutSessionInsert, WorkoutSetInsert, RoutineInsert, RoutineExerciseInsert } from '../types/database'

// ==================== SESSIONS ====================

export async function startSession(data: WorkoutSessionInsert) {
  const supabase = createClient()
  return supabase
    .from('workout_sessions')
    .insert(data)
    .select()
    .single()
}

export async function completeSession(sessionId: string, durationMinutes: number, notes?: string) {
  const supabase = createClient()
  return supabase
    .from('workout_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      notes,
    })
    .eq('id', sessionId)
    .select()
    .single()
}

export async function getRecentSessions(userId: string, limit = 10) {
  const supabase = createClient()
  return supabase
    .from('workout_sessions')
    .select(`
      *,
      routine:routines(name),
      workout_sets(count)
    `)
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(limit)
}

export async function getSessionById(sessionId: string) {
  const supabase = createClient()
  return supabase
    .from('workout_sessions')
    .select(`
      *,
      routine:routines(name, description),
      workout_sets(
        *,
        exercise:exercises(name, muscle_groups, equipment_type)
      )
    `)
    .eq('id', sessionId)
    .single()
}

// ==================== SETS ====================

export async function addSet(data: WorkoutSetInsert) {
  const supabase = createClient()
  return supabase
    .from('workout_sets')
    .insert(data)
    .select()
    .single()
}

export async function updateSet(setId: string, data: Partial<WorkoutSetInsert>) {
  const supabase = createClient()
  return supabase
    .from('workout_sets')
    .update(data)
    .eq('id', setId)
    .select()
    .single()
}

export async function deleteSet(setId: string) {
  const supabase = createClient()
  return supabase
    .from('workout_sets')
    .delete()
    .eq('id', setId)
}

// ==================== ROUTINES ====================

export async function getRoutines(userId: string) {
  const supabase = createClient()
  return supabase
    .from('routines')
    .select(`
      *,
      routine_exercises(
        *,
        exercise:exercises(name, muscle_groups)
      )
    `)
    .eq('profile_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
}

export async function getRoutineById(routineId: string) {
  const supabase = createClient()
  return supabase
    .from('routines')
    .select(`
      *,
      routine_exercises(
        *,
        exercise:exercises(*)
      )
    `)
    .eq('id', routineId)
    .single()
}

export async function createRoutine(data: RoutineInsert) {
  const supabase = createClient()
  return supabase
    .from('routines')
    .insert(data)
    .select()
    .single()
}

export async function updateRoutine(routineId: string, data: Partial<RoutineInsert>) {
  const supabase = createClient()
  return supabase
    .from('routines')
    .update(data)
    .eq('id', routineId)
    .select()
    .single()
}

export async function deleteRoutine(routineId: string) {
  const supabase = createClient()
  return supabase
    .from('routines')
    .update({ is_active: false })
    .eq('id', routineId)
}

export async function addExerciseToRoutine(data: RoutineExerciseInsert) {
  const supabase = createClient()
  return supabase
    .from('routine_exercises')
    .insert(data)
    .select()
    .single()
}

export async function removeExerciseFromRoutine(routineExerciseId: string) {
  const supabase = createClient()
  return supabase
    .from('routine_exercises')
    .delete()
    .eq('id', routineExerciseId)
}

// ==================== PERSONAL RECORDS ====================

export async function getPersonalRecords(userId: string, exerciseId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('personal_records')
    .select(`
      *,
      exercise:exercises(name, muscle_groups)
    `)
    .eq('profile_id', userId)
    .order('achieved_at', { ascending: false })

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId)
  }

  return query
}

export async function getProgressData(userId: string, exerciseId: string) {
  const supabase = createClient()
  return supabase
    .from('personal_records')
    .select('value, achieved_at, record_type')
    .eq('profile_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('record_type', '1rm')
    .order('achieved_at', { ascending: true })
    .limit(30)
}

// ==================== VOLUME & STATS ====================

export async function getWeeklyVolume(userId: string) {
  const supabase = createClient()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  return supabase
    .from('workout_sessions')
    .select('started_at, total_volume_kg, total_sets, duration_minutes')
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .gte('started_at', weekAgo.toISOString())
    .order('started_at', { ascending: true })
}

export async function getMonthlySessionCount(userId: string) {
  const supabase = createClient()
  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  return supabase
    .from('workout_sessions')
    .select('id', { count: 'exact' })
    .eq('profile_id', userId)
    .eq('status', 'completed')
    .gte('started_at', monthAgo.toISOString())
}
