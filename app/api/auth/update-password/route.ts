import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, requireAuth, validateBody } from "@/lib/api-utils"

const updatePasswordSchema = z.object({
  password: z.string().min(8).max(100),
})

export async function POST(request: Request) {
  try {
    const { password } = await validateBody(request, updatePasswordSchema)
    const supabase = await createClient()
    await requireAuth(supabase)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
