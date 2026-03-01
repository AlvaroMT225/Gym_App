import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, avatar_url")
      .eq("role", "coach")
      .eq("is_active", true)
      .order("first_name")

    if (error) throw error

    const trainers = (data || []).map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      email: p.email,
      phone: p.phone,
      avatar: p.avatar_url || `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}`.toUpperCase(),
    }))

    return NextResponse.json({ trainers })
  } catch {
    return NextResponse.json({ error: "Error al obtener entrenadores" }, { status: 500 })
  }
}
