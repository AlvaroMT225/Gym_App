import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"

const profileSelect =
  "id, first_name, last_name, nickname, bio, avatar_url, birth_date, gender, weight_kg, height_cm, phone, email, role, gym_id, created_at"

const clientProfilePatchSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100).optional(),
    last_name: z.string().trim().max(100).optional(),
    nickname: z.string().trim().max(20).optional(),
    bio: z.string().trim().max(160).optional(),
    birth_date: z.string().trim().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    weight_kg: z.number().finite().optional(),
    height_cm: z.number().finite().optional(),
    phone: z.string().trim().max(30).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Se requiere al menos un campo para actualizar",
  })

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const { data, error } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", sessionOrResponse.userId)
      .maybeSingle()

    if (error) {
      console.error("GET /api/client/profile error:", error)
      return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/client/profile unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const body = await validateBody(request, clientProfilePatchSchema)
    const updates: Record<string, string | number | null> = {}

    if (body.first_name !== undefined) updates.first_name = body.first_name || null
    if (body.last_name !== undefined) updates.last_name = body.last_name || null
    if (body.nickname !== undefined) updates.nickname = body.nickname || null
    if (body.bio !== undefined) updates.bio = body.bio || null
    if (body.birth_date !== undefined) updates.birth_date = body.birth_date || null
    if (body.gender !== undefined) updates.gender = body.gender
    if (body.weight_kg !== undefined) updates.weight_kg = body.weight_kg
    if (body.height_cm !== undefined) updates.height_cm = body.height_cm
    if (body.phone !== undefined) updates.phone = body.phone || null

    const supabase = await createClient(request)

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", sessionOrResponse.userId)

    if (updateError) {
      console.error("PATCH /api/client/profile update error:", updateError)
      return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }

    const { data, error: selectError } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", sessionOrResponse.userId)
      .single()

    if (selectError) {
      console.error("PATCH /api/client/profile select error:", selectError)
      return NextResponse.json({ error: "Error al leer perfil actualizado" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("PATCH /api/client/profile unexpected error:", error)
    return handleApiError(error)
  }
}
