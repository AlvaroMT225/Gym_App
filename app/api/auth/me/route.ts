import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      avatar: session.avatar,
    },
  })
}
