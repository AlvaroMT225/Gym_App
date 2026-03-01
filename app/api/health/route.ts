import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("gyms").select("id").limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          timestamp: new Date().toISOString(),
          version: "1.4.0",
          services: {
            database: "error",
            auth: "available",
          },
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.4.0",
        services: {
          database: "connected",
          auth: "available",
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        version: "1.4.0",
        services: {
          database: "error",
          auth: "available",
        },
      },
      { status: 503 }
    )
  }
}
