import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, gym_id, role, first_name, last_name, email, avatar_url, is_active')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        gym_id: profile.gym_id,
        is_active: profile.is_active,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
