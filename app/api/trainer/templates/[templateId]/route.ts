import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { getTemplateById, updateTemplate, deleteTemplate, duplicateTemplate } from "@/lib/trainer-templates"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const { templateId } = await params
  const template = getTemplateById(templateId)
  if (!template || template.trainerId !== sessionOrResponse.userId) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ template })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const { templateId } = await params
  const existing = getTemplateById(templateId)
  if (!existing || existing.trainerId !== sessionOrResponse.userId) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
  }

  const body = await request.json()
  const { action } = body

  if (action === "duplicate") {
    const duplicated = duplicateTemplate(templateId)
    if (!duplicated) {
      return NextResponse.json({ error: "Error al duplicar" }, { status: 500 })
    }
    return NextResponse.json({ template: duplicated })
  }

  const updated = updateTemplate(templateId, {
    title: body.title,
    description: body.description,
    type: body.type,
    exercises: body.exercises,
  })

  if (!updated) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json({ template: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["TRAINER", "ADMIN"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  const { templateId } = await params
  const existing = getTemplateById(templateId)
  if (!existing || existing.trainerId !== sessionOrResponse.userId) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })
  }

  deleteTemplate(templateId)
  return NextResponse.json({ ok: true })
}
