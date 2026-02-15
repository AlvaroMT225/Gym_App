import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { listTemplates, createTemplate } from "@/lib/trainer-templates"
import { exerciseCatalog } from "@/lib/trainer-data"

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const templates = listTemplates(sessionOrResponse.userId)
  // Enrich with exercise names
  const enriched = templates.map((t) => ({
    ...t,
    exercises: t.exercises.map((e) => ({
      ...e,
      exerciseName: exerciseCatalog.find((ex) => ex.id === e.exerciseId)?.name || e.exerciseId,
    })),
  }))

  return NextResponse.json({ templates: enriched })
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const body = await request.json()
  const { title, description, type, exercises } = body

  if (!title || !type || !exercises?.length) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const template = createTemplate({
    trainerId: sessionOrResponse.userId,
    title,
    description: description || "",
    type,
    exercises,
  })

  return NextResponse.json({ template }, { status: 201 })
}
