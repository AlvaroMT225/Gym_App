import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"

const resetPasswordSchema = z.object({
  email: z.string().email(),
})

const GENERIC_MESSAGE = "If an account exists with this email, a reset link has been sent."

export async function POST(request: Request) {
  try {
    const { email } = await validateBody(request, resetPasswordSchema)
    const supabase = await createClient()
    const origin = new URL(request.url).origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/update-password`,
    })

    if (error) {
      console.error("[POST /api/auth/reset-password] reset error:", error)
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
