import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// Public endpoint — no auth required.
// QR codes are physically printed in the gym; their content is not sensitive.
// Uses admin client to bypass RLS (qr_codes SELECT policy requires auth.uid()).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código QR inválido" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: qr, error: qrError } = await supabase
      .from("qr_codes")
      .select("id, machine_id, is_active, machines(id, name)")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle()

    if (qrError) {
      console.error("GET /api/gym/qr/[code] query error:", qrError)
      return NextResponse.json({ error: "Error al buscar código QR" }, { status: 500 })
    }

    if (!qr) {
      return NextResponse.json({ error: "Código QR no encontrado o inactivo" }, { status: 404 })
    }

    const machine = Array.isArray(qr.machines) ? qr.machines[0] : qr.machines

    return NextResponse.json({
      machineId: qr.machine_id,
      machineName: machine?.name ?? null,
      qrCodeId: qr.id,
    })
  } catch (error) {
    console.error("GET /api/gym/qr/[code] unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
