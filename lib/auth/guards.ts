import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session"
import type { Role, SessionPayload } from "@/lib/auth/types"

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export function unauthorizedResponse(message = "No autorizado") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = "Prohibido") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function requireRoleFromRequest(
  request: NextRequest,
  allowedRoles: Role[]
): Promise<SessionPayload | NextResponse> {
  const session = await getSessionFromRequest(request)
  if (!session) return unauthorizedResponse()
  if (!allowedRoles.includes(session.role)) {
    return forbiddenResponse()
  }
  return session
}

