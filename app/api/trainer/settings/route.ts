import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { getTrainerSettings, updateTrainerSettings } from "@/lib/trainer-settings"
import { getTrainerById } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const trainer = getTrainerById(sessionOrResponse.userId)
  const settings = getTrainerSettings(sessionOrResponse.userId)

  return NextResponse.json({
    profile: {
      name: trainer?.name || sessionOrResponse.name,
      email: trainer?.email || sessionOrResponse.email,
      avatar: trainer?.avatar || sessionOrResponse.avatar,
    },
    settings,
  })
}

export async function PUT(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const body = await request.json()
  const updated = updateTrainerSettings(sessionOrResponse.userId, body)

  return NextResponse.json({ settings: updated })
}
