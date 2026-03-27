import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { profilePatchBodySchema } from "@/lib/validations/athlete"

const profilePatchExtendedSchema = profilePatchBodySchema.extend({
  nickname: z.string().max(30).optional(),
  birth_date: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  weight_kg: z.number().min(20).max(300).optional(),
  target_weight_kg: z.number().min(20).max(300).optional(),
})

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, bio, avatar_url, settings, nickname, birth_date, gender, weight_kg, target_weight_kg")
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
    const {
      firstName,
      lastName,
      email,
      phone,
      bio,
      nickname,
      birth_date,
      gender,
      weight_kg,
      target_weight_kg,
    } = await validateBody(request, profilePatchExtendedSchema)

    const updates: Record<string, string | number | null> = {}
    if (firstName !== undefined) updates.first_name = firstName.trim() || null
    if (lastName !== undefined) updates.last_name = lastName.trim() || null
    if (email !== undefined) updates.email = email.trim() || null
    if (phone !== undefined) updates.phone = phone.trim() || null
    if (bio !== undefined) updates.bio = bio.trim() || null
    if (nickname !== undefined) updates.nickname = nickname.trim() || null
    if (birth_date !== undefined) updates.birth_date = birth_date || null
    if (gender !== undefined) updates.gender = gender
    if (weight_kg !== undefined) updates.weight_kg = weight_kg
    if (target_weight_kg !== undefined) updates.target_weight_kg = target_weight_kg

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    const supabase = await createClient()
    const userId = sessionOrResponse.userId

    // Check current weight_kg to decide whether to seed body_weight_logs
    let currentWeightKg: number | null = null
    if (weight_kg !== undefined) {
      const { data: currentProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("weight_kg")
        .eq("id", userId)
        .maybeSingle()

      if (fetchError) {
        console.error("PATCH /api/profile weight fetch error:", fetchError)
        return NextResponse.json({ error: "Error al obtener perfil actual" }, { status: 500 })
      }

      currentWeightKg = (currentProfile as { weight_kg: number | null } | null)?.weight_kg ?? null
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, first_name, last_name, email, phone, bio, avatar_url, nickname, birth_date, gender, weight_kg, target_weight_kg")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 })
      }
      console.error("PATCH /api/profile error:", error)
      return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }

    // Seed body_weight_logs only on first weight entry
    if (weight_kg !== undefined && currentWeightKg === null) {
      const { error: logError } = await supabase
        .from("body_weight_logs")
        .insert({
          profile_id: userId,
          weight_kg,
          recorded_at: new Date().toISOString(),
          notes: "Peso inicial registrado en onboarding",
        })

      if (logError) {
        console.error("PATCH /api/profile body_weight_logs insert error:", logError)
        // Non-blocking: profile already updated, log failure is not critical
      }
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error("PATCH /api/profile unexpected error:", error)
    return handleApiError(error)
  }
}
