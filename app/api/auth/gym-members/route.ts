import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session"
import { hasPermission } from "@/lib/auth/permissions"
import { gymMembers } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: "Sesion invalida" }, { status: 401 })
  }

  if (!hasPermission(session.role, "billing:manage")) {
    return NextResponse.json(
      { error: "No tienes permisos para acceder a esta informacion" },
      { status: 403 }
    )
  }

  return NextResponse.json({ members: gymMembers })
}
