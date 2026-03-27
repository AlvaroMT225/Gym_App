import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { handleApiError, validateBody } from "@/lib/api-utils"

type Period = "week" | "month" | "year" | "all"

function parsePeriod(value: string | null): Period {
  if (value === "week" || value === "month" || value === "year") return value
  return "all"
}

function getPeriodStart(period: Period): string | null {
  const now = Date.now()
  if (period === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  if (period === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  if (period === "year") return new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

const bodyWeightPostSchema = z.object({
  weight_kg: z.number().min(20).max(300),
  recorded_at: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const period = parsePeriod(request.nextUrl.searchParams.get("period"))
    const periodStart = getPeriodStart(period)

    let logsQuery = supabase
      .from("body_weight_logs")
      .select("id, weight_kg, recorded_at, notes")
      .eq("profile_id", userId)
      .order("recorded_at", { ascending: true })
    if (periodStart) logsQuery = logsQuery.gte("recorded_at", periodStart)

    const [logsResult, profileResult] = await Promise.all([
      logsQuery,
      supabase
        .from("profiles")
        .select("target_weight_kg")
        .eq("id", userId)
        .maybeSingle(),
    ])

    if (logsResult.error) {
      console.error("GET /api/client/body-weight logs error:", logsResult.error)
      return NextResponse.json({ error: "Error al obtener registros de peso" }, { status: 500 })
    }

    return NextResponse.json({
      logs: logsResult.data ?? [],
      target_weight_kg: profileResult.data?.target_weight_kg ?? null,
    })
  } catch (error) {
    console.error("GET /api/client/body-weight unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const { weight_kg, recorded_at, notes } = await validateBody(request, bodyWeightPostSchema)
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId

    const { data, error } = await supabase
      .from("body_weight_logs")
      .insert({
        profile_id: userId,
        weight_kg,
        recorded_at: recorded_at ?? new Date().toISOString(),
        notes: notes ?? null,
      })
      .select("id, weight_kg, recorded_at, notes")
      .single()

    if (error) {
      console.error("POST /api/client/body-weight insert error:", error)
      return NextResponse.json({ error: "Error al registrar peso" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("POST /api/client/body-weight unexpected error:", error)
    return handleApiError(error)
  }
}
