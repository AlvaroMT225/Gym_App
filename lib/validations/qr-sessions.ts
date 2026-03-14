import { z } from "zod"

// POST /api/client/qr-sessions
export const qrSessionBodySchema = z.object({
  machine_id: z.string().uuid(),
  sets_data: z
    .array(
      z.object({
        weight: z.number().positive(),
        reps: z.number().int().positive(),
      })
    )
    .min(1, "Se requiere al menos 1 serie"),
  notes: z.string().max(500).optional(),
})

export type QrSessionBody = z.infer<typeof qrSessionBodySchema>
