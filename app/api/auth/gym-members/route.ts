import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { gymMembers } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["ADMIN", "admin", "super_admin"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  return NextResponse.json({ members: gymMembers })
}
