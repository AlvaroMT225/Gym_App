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

const routineExerciseWriteSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.number().int(),
  sets_target: z.number().int().positive(),
  reps_target: z.number().int().positive(),
  rest_seconds: z.number().int().nonnegative().nullable().optional(),
  weight_target: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

function validateUniqueRoutineOrderIndexes(
  exercises: Array<{ order_index: number }>,
  ctx: z.RefinementCtx
) {
  const seen = new Set<number>()

  exercises.forEach((exercise, index) => {
    if (seen.has(exercise.order_index)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se permiten ejercicios con el mismo order_index",
        path: [index, "order_index"],
      })
      return
    }

    seen.add(exercise.order_index)
  })
}

export const routineCreateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).nullable().optional(),
    exercises: z.array(routineExerciseWriteSchema).min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    validateUniqueRoutineOrderIndexes(data.exercises, ctx)
  })

export const routinePatchBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    exercises: z.array(routineExerciseWriteSchema).min(1).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.exercises !== undefined,
    { message: "Se requiere al menos name, description o exercises" }
  )
  .superRefine((data, ctx) => {
    if (data.exercises) {
      validateUniqueRoutineOrderIndexes(data.exercises, ctx)
    }
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
