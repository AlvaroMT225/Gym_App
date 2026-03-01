import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/auth/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const validRoles: AppRole[] = ['athlete', 'coach', 'admin', 'super_admin']
    const userRole: AppRole = validRoles.includes(role) ? role : 'athlete'

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: userRole,
        },
      },
    })

    if (error) {
      console.error('[register] Supabase signUp error:', error)
      const msg =
        error.message.includes('already registered') || error.message.includes('already exists')
          ? 'Este email ya está registrado. Intenta iniciar sesión.'
          : error.message.includes('password')
          ? 'La contraseña no cumple los requisitos mínimos de seguridad.'
          : error.message.includes('email')
          ? 'El formato del email no es válido.'
          : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    // Si la confirmación de email está desactivada, el usuario ya tiene sesión
    const requiresConfirmation = !data.session

    return NextResponse.json({
      requiresConfirmation,
      message: requiresConfirmation
        ? 'Cuenta creada. Revisa tu email para confirmar tu cuenta.'
        : 'Cuenta creada exitosamente.',
      user: requiresConfirmation
        ? null
        : {
            id: data.user.id,
            email: data.user.email,
            role: userRole,
          },
    })
  } catch (err) {
    console.error('[register] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
