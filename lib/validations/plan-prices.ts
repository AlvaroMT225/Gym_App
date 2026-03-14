import { z } from "zod"

export const PLAN_TYPES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annual",
] as const

export type PlanType = (typeof PLAN_TYPES)[number]

export const planPriceBodySchema = z.object({
  plan_type: z.enum(PLAN_TYPES),
  price: z.number().positive(),
  is_active: z.boolean().optional(),
})

export const planPriceUpdateBodySchema = z.object({
  price: z.number().positive().optional(),
  is_active: z.boolean().optional(),
})
