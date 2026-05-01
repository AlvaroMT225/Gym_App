import { NextRequest, NextResponse } from "next/server"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

const AVATAR_BUCKET = "avatars"
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function getAvatarObjectPath(userId: string) {
  return `${userId}/avatar.jpg`
}

function sanitizeLogError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      name?: unknown
      code?: unknown
      message?: unknown
      statusCode?: unknown
    }

    return {
      name: typeof candidate.name === "string" ? candidate.name : undefined,
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      message: typeof candidate.message === "string" ? candidate.message : undefined,
      statusCode:
        typeof candidate.statusCode === "number" || typeof candidate.statusCode === "string"
          ? candidate.statusCode
          : undefined,
    }
  }

  return { message: String(error) }
}

function extractAvatarFile(formData: FormData) {
  const candidate = formData.get("avatar") ?? formData.get("file")
  return candidate instanceof File ? candidate : null
}

function validateAvatarFile(file: File | null) {
  if (!file) {
    return "Debes adjuntar una imagen"
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Formato de imagen no permitido"
  }

  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return "La imagen supera el limite de 5 MB"
  }

  return null
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const formData = await request.formData()
    const file = extractAvatarFile(formData)
    const validationError = validateAvatarFile(file)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const objectPath = getAvatarObjectPath(userId)
    const buffer = Buffer.from(await file!.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(objectPath, buffer, {
      contentType: file!.type,
      upsert: true,
    })

    if (uploadError) {
      console.error("POST /api/client/profile/avatar upload error:", sanitizeLogError(uploadError))
      return NextResponse.json({ error: "Error al subir avatar" }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath)
    const avatar_url = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url })
      .eq("id", userId)

    if (updateError) {
      console.error("POST /api/client/profile/avatar profile update error:", sanitizeLogError(updateError))
      await supabase.storage.from(AVATAR_BUCKET).remove([objectPath])
      return NextResponse.json({ error: "Error al actualizar avatar" }, { status: 500 })
    }

    return NextResponse.json({ avatar_url })
  } catch (error) {
    console.error("POST /api/client/profile/avatar unexpected error:", sanitizeLogError(error))
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const supabase = await createClient(request)
    const userId = sessionOrResponse.userId
    const objectPath = getAvatarObjectPath(userId)

    const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([objectPath])

    if (removeError) {
      console.error("DELETE /api/client/profile/avatar remove error:", sanitizeLogError(removeError))
      return NextResponse.json({ error: "Error al eliminar avatar" }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId)

    if (updateError) {
      console.error("DELETE /api/client/profile/avatar profile update error:", sanitizeLogError(updateError))
      return NextResponse.json({ error: "Error al limpiar avatar" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/client/profile/avatar unexpected error:", sanitizeLogError(error))
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
