import { z } from "zod"

// A. machine
export const machineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  muscle_groups: z.array(z.string()).optional(),
  equipment_type: z
    .enum(["machine", "free_weight", "cable", "bodyweight", "cardio", "resistance_band"])
    .optional(),
  status: z.enum(["available", "in_use", "maintenance", "out_of_order"]).optional(),
  location: z.string().max(100).optional(),
})

// B. promotion
export const promotionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  discount_type: z.enum(["percentage", "fixed"]).optional(),
  discount_value: z.number().min(0),
  code: z.string().min(1).max(50).optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  starts_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  max_uses: z.number().int().min(1).optional(),
})

// C. tutorial
export const tutorialSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000).optional(),
  machine_id: z.string().uuid(),
  difficulty_level: z.number().int().min(1).max(5).optional(),
  order_index: z.number().int().min(0).optional(),
})

// D. staff update
export const staffUpdateSchema = z.object({
  role: z.enum(["athlete", "coach", "admin"]).optional(),
  permissions: z.array(z.string()).optional(),
})

// E. settings info
export const settingsInfoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
})

// F. settings schedule
export const settingsScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      day_of_week: z.number().int().min(0).max(6),
      opens_at: z.string().optional(),
      closes_at: z.string().optional(),
      is_closed: z.boolean().optional(),
    })
  ),
})

/* ── Endpoint-specific schemas (camelCase, matching actual request bodies) ── */

// POST /api/admin/machines
export const machineBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  equipmentType: z.string().min(1),
  muscleGroups: z.array(z.string()).optional(),
  location: z.string().max(100).optional(),
  status: z.string().optional(),
})

// PUT /api/admin/machines/[machineId]
export const machineUpdateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  equipmentType: z.string().min(1).optional(),
  muscleGroups: z.array(z.string()).optional(),
  location: z.string().max(100).optional(),
  status: z.string().optional(),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
})

// POST /api/admin/promotions
export const promotionBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().finite().min(0),
  code: z.string().min(1).max(50).optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  maxUses: z.number().int().min(1).optional(),
  minPlanType: z.enum(["basic", "premium", "vip", "custom"]).optional(),
})

// PUT /api/admin/promotions/[promoId]
export const promotionUpdateBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  discountValue: z.number().finite().min(0).optional(),
  code: z.string().min(1).max(50).optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  maxUses: z.number().int().min(1).optional(),
  minPlanType: z.enum(["basic", "premium", "vip", "custom"]).optional(),
})

// POST /api/admin/tutorials
export const tutorialBodySchema = z.object({
  machineId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(5000).optional(),
  videoUrl: z.string().max(500).optional(),
  difficultyLevel: z.number().finite().optional(),
  durationMinutes: z.number().finite().optional(),
  steps: z.unknown().optional(),
  orderIndex: z.number().finite().optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/admin/tutorials/[tutorialId]
export const tutorialUpdateBodySchema = z.object({
  machineId: z.string().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
  videoUrl: z.string().max(500).optional(),
  difficultyLevel: z.number().finite().optional(),
  durationMinutes: z.number().finite().optional(),
  steps: z.unknown().optional(),
  orderIndex: z.number().finite().optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/admin/staff/[staffId]
export const staffUpdateBodySchema = z.object({
  role: z.enum(["admin", "coach", "super_admin"]).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
})
export const staffBodySchema = staffUpdateBodySchema

// PUT /api/admin/settings (outer wrapper)
export const settingsUpdateBodySchema = z.discriminatedUnion("section", [
  z.object({
    section: z.literal("info"),
    data: z.object({
      name: z.string().min(1).max(100),
      address: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      phone: z.string().max(20).optional(),
      email: z.string().email().optional(),
      timezone: z.string().max(100).optional(),
    }),
  }),
  z.object({
    section: z.literal("schedules"),
    data: z.object({
      schedules: z.array(
        z.object({
          dayOfWeek: z.number().finite().optional(),
          opensAt: z.string().optional(),
          closesAt: z.string().optional(),
          isClosed: z.boolean().optional(),
        })
      ),
    }),
  }),
  z.object({
    section: z.literal("settings"),
    data: z.object({
      settings: z.record(z.unknown()),
    }),
  }),
])
export const settingsBodySchema = settingsUpdateBodySchema

// PUT /api/admin/account
export const accountUpdateBodySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().max(500).optional(),
})
