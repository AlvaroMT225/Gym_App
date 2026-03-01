import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, requireAuth } from "@/lib/api-utils"

export async function POST() {
  try {
    const supabase = await createClient()
    await requireAuth(supabase)

    const { error } = await supabase.auth.signOut()
    if (error) throw error

    return NextResponse.json({ message: "Logged out successfully" }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
