import { NextRequest, NextResponse } from "next/server"
import { createUser } from "@/lib/auth/demo-users"
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contrasena son requeridos" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const user = await createUser(name, email, password)
    const token = await createSessionToken(user)

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    })

    return response
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Email already registered") {
      return NextResponse.json(
        { error: "Este email ya esta registrado" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
