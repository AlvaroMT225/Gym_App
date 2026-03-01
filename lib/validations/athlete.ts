import { z } from "zod"

/* ── Spec schemas (snake_case, for reference / future reuse) ── */

// A. workout_session
export const workoutSessionSchema = z.object({
  machine_id: z.string().uuid(),
  sets: z.array(
    z.object({
      weight: z.number().nonnegative(),
      reps: z.number().int().positive(),
      rpe: z.number().min(1).max(10).optional(),
    })
  ).min(1),
  source: z.enum(["qr", "manual"]).optional(),
})

// B. routine
export const routineSchema = z.object({
  name: z.string().min(1).max(100),
  exercises: z.array(
    z.object({
      exercise_id: z.string().uuid(),
      sets: z.number().int().positive(),
      reps: z.number().int().positive(),
      rest_seconds: z.number().int().nonnegative().optional(),
      notes: z.string().max(500).optional(),
    })
  ).min(1),
})

// C. consent
export const consentSchema = z.object({
  trainer_id: z.string().uuid(),
  scopes: z.array(z.string()).min(1),
  expires_at: z.string().datetime({ offset: true }).optional(),
})

// D. tutorial_progress
export const tutorialProgressSchema = z.object({
  tutorial_id: z.string().uuid(),
  progress_percent: z.number().int().min(0).max(100),
})

// E. profile_update
export const profileUpdateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
})

/* ── Endpoint-specific schemas (camelCase, matching actual request bodies) ── */

// POST /api/client/workout-sessions
export const qrSessionBodySchema = z.object({
  machineId: z.string().uuid(),
  sets: z.array(
    z.object({
      weight: z.number().nonnegative(),
      reps: z.number().int().positive(),
      rpe: z.number().min(1).max(10).optional(),
    })
  ).min(1),
  source: z.enum(["qr", "manual"]).optional(),
})

// POST /api/consents
export const consentBodySchema = z.object({
  trainerId: z.string().uuid(),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime({ offset: true }).optional(),
})

// PATCH /api/consents/[id]
export const consentUpdateBodySchema = z.object({
  scopes: z.array(z.string()).min(1).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
}).refine(
  (data) => data.scopes !== undefined || data.expiresAt !== undefined,
  { message: "Se requiere al menos scopes o expiresAt" }
)

// POST /api/client/tutorials/progress
export const tutorialProgressBodySchema = z.object({
  tutorialId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
})

// PATCH /api/profile
export const profilePatchBodySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
})
