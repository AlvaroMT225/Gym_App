import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { profilePatchBodySchema } from "@/lib/validations/athlete"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, bio, avatar_url, settings")
      .eq("id", sessionOrResponse.userId)
      .maybeSingle()

    if (error) {
      console.error("GET /api/profile error:", error)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error("GET /api/profile unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const { firstName, lastName, email, phone, bio } = await validateBody(request, profilePatchBodySchema)

    // Build update object — only include fields that were sent
    const updates: Record<string, string | null> = {}
    if (firstName !== undefined) updates.first_name = firstName.trim() || null
    if (lastName !== undefined) updates.last_name = lastName.trim() || null
    if (email !== undefined) updates.email = email.trim() || null
    if (phone !== undefined) updates.phone = phone.trim() || null
    if (bio !== undefined) updates.bio = bio.trim() || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", sessionOrResponse.userId)
      .select("id, first_name, last_name, email, phone, bio, avatar_url")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 })
      }
      console.error("PATCH /api/profile error:", error)
      return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error("PATCH /api/profile unexpected error:", error)
    return handleApiError(error)
  }
}
