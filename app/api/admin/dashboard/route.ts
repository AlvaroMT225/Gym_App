import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

async function getAdminGymId(
  adminId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", adminId)
    .maybeSingle()
  if (error || !data?.gym_id) return null
  return data.gym_id as string
}

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient()

    const gymId = await getAdminGymId(sessionOrResponse.userId, supabase)
    if (!gymId) {
      return NextResponse.json({ error: "No se pudo obtener gym del administrador" }, { status: 500 })
    }

    // Fetch machine IDs for gym-scoped tutorial count (sequential — needed as dependency)
    const { data: gymMachines } = await supabase
      .from("machines")
      .select("id")
      .eq("gym_id", gymId)
    const machineIds = (gymMachines ?? []).map((m) => (m as { id: string }).id)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Parallel batch: 7 KPI queries
    const [
      miembrosResult,
      staffResult,
      maquinasResult,
      ingresosResult,
      pendientesResult,
      vencidosPayResult,
      promosResult,
    ] = await Promise.all([
      // 1. miembrosActivos: athletes activos del gym
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("role", "athlete")
        .eq("is_active", true),

      // 2. staffActivo: admins + coaches activos
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .in("role", ["admin", "coach", "super_admin"])
        .eq("is_active", true),

      // 3. maquinasRegistradas
      supabase
        .from("machines")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId),

      // 4. ingresosMes: pagos cobrados en el mes actual
      supabase
        .from("payments")
        .select("amount")
        .eq("gym_id", gymId)
        .eq("status", "paid")
        .gte("paid_at", startOfMonth),

      // 5. pagosPendientes
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "pending"),

      // 6. pagosVencidos (overdue)
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "overdue"),

      // 7. promosActivas
      supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "active"),
    ])

    // 8. tutorialesActivos: depende de machineIds → query separada
    let tutorialesActivos = 0
    if (machineIds.length > 0) {
      const { count } = await supabase
        .from("machine_tutorials")
        .select("id", { count: "exact", head: true })
        .in("machine_id", machineIds)
        .eq("is_active", true)
      tutorialesActivos = count ?? 0
    }

    // Compute ingresosMes by summing amounts in JS
    const ingresosMes = ((ingresosResult.data ?? []) as { amount: number | null }[]).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    )

    // Log non-fatal errors
    if (miembrosResult.error) console.error("dashboard miembros:", miembrosResult.error)
    if (staffResult.error) console.error("dashboard staff:", staffResult.error)
    if (maquinasResult.error) console.error("dashboard maquinas:", maquinasResult.error)
    if (ingresosResult.error) console.error("dashboard ingresos:", ingresosResult.error)
    if (pendientesResult.error) console.error("dashboard pendientes:", pendientesResult.error)
    if (vencidosPayResult.error) console.error("dashboard vencidos pay:", vencidosPayResult.error)
    if (promosResult.error) console.error("dashboard promos:", promosResult.error)

    return NextResponse.json({
      kpis: {
        miembrosActivos: miembrosResult.count ?? 0,
        staffActivo: staffResult.count ?? 0,
        maquinasRegistradas: maquinasResult.count ?? 0,
        ingresosMes,
        pagosPendientes: pendientesResult.count ?? 0,
        pagosVencidos: vencidosPayResult.count ?? 0,
        promosActivas: promosResult.count ?? 0,
        tutorialesActivos,
      },
      actividadReciente: [],
    })
  } catch (err) {
    console.error("GET /api/admin/dashboard unexpected error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
