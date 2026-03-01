import { z } from "zod"

// A. comment
export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  is_private: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

// B. proposal
export const proposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["routine", "goal", "nutrition"]).optional(),
  content: z.record(z.unknown()).optional(),
})

// C. template
export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().uuid(),
        order_index: z.number().int().min(0),
        sets_target: z.number().int().min(1).max(20).optional(),
        reps_target: z.number().int().min(1).max(100).optional(),
        rest_seconds: z.number().int().min(0).max(600).optional(),
      })
    )
    .optional(),
})

// D. planned session
export const plannedSessionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  scheduled_at: z.string().datetime(),
  content: z.array(z.unknown()).optional(),
})

/* ── Endpoint-specific schemas (camelCase, matching actual request bodies) ── */

// POST .../sessions/[sessionId]/comment
export const commentBodySchema = z.object({
  comment: z.string().min(1).max(2000),
})

// PUT .../routine/proposal
export const routineProposalBodySchema = z.object({
  title: z.string().max(200).optional(),
  weeks: z.number().int().min(1).max(52).optional(),
  progression: z.string().max(2000).optional(),
  exercises: z.array(z.unknown()).optional(),
})

// POST / PUT .../planned-sessions
export const plannedSessionBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().optional(),
  items: z.array(z.unknown()).optional(),
  changelogEntry: z.string().max(200).optional(),
})

// POST / PUT .../templates (camelCase body)
export const templateBodySchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.string().min(1),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.number().int().min(1).optional(),
      reps: z.number().int().min(1).optional(),
    })
  ),
})
