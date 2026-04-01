import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRoleFromRequest } from "@/lib/auth/guards"
import { handleApiError, validateBody } from "@/lib/api-utils"
import { createClient, createStatelessClient } from "@/lib/supabase/server"

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contraseña no puede ser igual a la actual",
    path: ["newPassword"],
  })

export async function POST(request: NextRequest) {
  const sessionOrResponse = await requireRoleFromRequest(request, ["USER"])
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse

  try {
    const { currentPassword, newPassword } = await validateBody(request, changePasswordSchema)

    if (!sessionOrResponse.email) {
      return NextResponse.json({ error: "No se pudo identificar el email del usuario" }, { status: 400 })
    }

    const verificationClient = createStatelessClient()
    const { error: verificationError } = await verificationClient.auth.signInWithPassword({
      email: sessionOrResponse.email,
      password: currentPassword,
    })

    if (verificationError) {
      const isInvalidCredentials = verificationError.message.includes("Invalid login credentials")

      if (isInvalidCredentials) {
        return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 401 })
      }

      console.error("POST /api/client/auth/change-password verification error:", verificationError)
      return NextResponse.json({ error: "No se pudo verificar la contraseña actual" }, { status: 500 })
    }

    const supabase = await createClient(request)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      console.error("POST /api/client/auth/change-password update error:", updateError)
      return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/client/auth/change-password unexpected error:", error)
    return handleApiError(error)
  }
}
