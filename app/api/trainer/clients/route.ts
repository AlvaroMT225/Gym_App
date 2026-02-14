import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listActiveConsentsForTrainer } from "@/lib/consents"
import { getClientById } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const consents = listActiveConsentsForTrainer(sessionOrResponse.userId)
  const clients = consents
    .map((consent) => {
      const client = getClientById(consent.client_id)
      if (!client) return null
      return {
        client,
        consent: {
          id: consent.id,
          status: consent.status,
          scopes: consent.scopes,
          expires_at: consent.expires_at,
        },
      }
    })
    .filter(Boolean)

  return NextResponse.json({ clients })
}

