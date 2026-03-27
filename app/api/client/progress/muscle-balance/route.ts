import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

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

const AXES: { key: string; label: string }[] = [
  { key: "chest", label: "Pecho" },
  { key: "back", label: "Espalda" },
  { key: "shoulders", label: "Hombros" },
  { key: "biceps", label: "Bíceps" },
  { key: "triceps", label: "Tríceps" },
  { key: "legs", label: "Piernas" },
]

function normalizeValues(raw: number[]): number[] {
  const max = Math.max(...raw)
  if (max === 0) return raw.map(() => 0)
  return raw.map((v) => Math.round((v / max) * 100))
}

interface QrWithMachine {
  total_volume: number | null
  machines: { muscle_groups: unknown } | { muscle_groups: unknown }[] | null
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const period = parsePeriod(request.nextUrl.searchParams.get("period"))
    const periodStart = getPeriodStart(period)

    const rawByGroup = new Map<string, number>(AXES.map((a) => [a.key, 0]))

    if (period === "all") {
      // Use precomputed xp_by_group for full history
      const { data, error } = await supabase
        .from("athlete_xp_totals")
        .select("xp_by_group")
        .eq("athlete_id", userId)
        .maybeSingle()

      if (error) {
        console.error("GET /api/client/progress/muscle-balance xp_totals error:", error)
        return NextResponse.json({ error: "Error al obtener balance muscular" }, { status: 500 })
      }

      const xpByGroup = data?.xp_by_group
      if (xpByGroup && typeof xpByGroup === "object") {
        for (const axis of AXES) {
          const val = (xpByGroup as Record<string, unknown>)[axis.key]
          if (typeof val === "number") rawByGroup.set(axis.key, val)
        }
      }
    } else {
      // Use qr_sessions volume accumulated per muscle group
      let query = supabase
        .from("qr_sessions")
        .select("total_volume, machines(muscle_groups)")
        .eq("athlete_id", userId)
      if (periodStart) query = query.gte("created_at", periodStart)

      const { data, error } = await query

      if (error) {
        console.error("GET /api/client/progress/muscle-balance qr_sessions error:", error)
        return NextResponse.json({ error: "Error al obtener balance muscular" }, { status: 500 })
      }

      for (const row of (data ?? []) as QrWithMachine[]) {
        const machine = Array.isArray(row.machines) ? row.machines[0] : row.machines
        if (!machine) continue
        const groups = (machine as Record<string, unknown>).muscle_groups
        if (!Array.isArray(groups)) continue
        const volume = typeof row.total_volume === "number" ? row.total_volume : 0
        for (const g of groups) {
          if (typeof g === "string" && rawByGroup.has(g)) {
            rawByGroup.set(g, (rawByGroup.get(g) ?? 0) + volume)
          }
        }
      }
    }

    const rawValues = AXES.map((a) => rawByGroup.get(a.key) ?? 0)
    const values = normalizeValues(rawValues)
    const maxRaw = Math.max(...rawValues)
    const dominantIndex = maxRaw > 0 ? rawValues.indexOf(maxRaw) : -1
    const dominantGroup = dominantIndex >= 0 ? AXES[dominantIndex].label : null

    return NextResponse.json({
      labels: AXES.map((a) => a.label),
      values,
      raw_values: rawValues,
      dominant_group: dominantGroup,
    })
  } catch (error) {
    console.error("GET /api/client/progress/muscle-balance unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
