import { NextResponse } from "next/server"
import { trainers } from "@/lib/trainer-data"

export async function GET() {
  return NextResponse.json({
    trainers: trainers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      avatar: t.avatar,
    })),
  })
}

