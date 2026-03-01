import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const msg =
        error.message.includes('Invalid login credentials')
          ? 'Credenciales inválidas. Verifica tu email y contraseña.'
          : error.message.includes('Email not confirmed')
          ? 'Debes confirmar tu email antes de iniciar sesión.'
          : 'Error al iniciar sesión. Intenta de nuevo.'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    // Obtener perfil con rol
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, gym_id, role, first_name, last_name, email, avatar_url')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role ?? 'athlete',
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        avatar_url: profile?.avatar_url,
        gym_id: profile?.gym_id,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
