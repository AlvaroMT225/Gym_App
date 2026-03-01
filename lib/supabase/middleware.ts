import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { AppRole } from '@/lib/auth/types'

function getDashboardForRole(role: AppRole): string {
  if (role === 'admin' || role === 'super_admin') return '/admin'
  if (role === 'coach') return '/trainer'
  return '/dashboard'
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICO: getUser() valida el token JWT con Supabase (no solo decodifica).
  // No reemplazar con getSession() ya que no valida contra el servidor.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Rutas siempre accesibles (sin importar autenticacion)
  const isApiAuthRoute = path.startsWith('/api/auth/')
  const isPublicAsset = path.startsWith('/_next/') || path.includes('.')
  if (isApiAuthRoute || isPublicAsset) {
    return supabaseResponse
  }

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register')
  const isDashboardRoute = path.startsWith('/dashboard')
  const isTrainerRoute = path.startsWith('/trainer')
  const isAdminRoute = path.startsWith('/admin')
  const isProtectedRoute = isDashboardRoute || isTrainerRoute || isAdminRoute

  // --- Usuario NO autenticado ---
  if (!user) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', path)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // --- Usuario autenticado: obtener rol del perfil ---
  // Solo consultamos el perfil cuando es necesario para decisiones de ruta
  let userRole: AppRole = 'athlete'

  if (isAuthRoute || isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role) {
      userRole = profile.role as AppRole
    }
  }

  // --- Autenticado intentando acceder a /login o /register ---
  if (isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = getDashboardForRole(userRole)
    return NextResponse.redirect(url)
  }

  // --- Control de acceso por rol en rutas protegidas ---

  // /admin solo para admin y super_admin
  if (isAdminRoute && userRole !== 'admin' && userRole !== 'super_admin') {
    const url = request.nextUrl.clone()
    url.pathname = getDashboardForRole(userRole)
    return NextResponse.redirect(url)
  }

  // /trainer solo para coach, admin y super_admin
  if (isTrainerRoute && userRole !== 'coach' && userRole !== 'admin' && userRole !== 'super_admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // /dashboard para coaches los redirige a /trainer
  if (isDashboardRoute && (userRole === 'coach')) {
    const url = request.nextUrl.clone()
    url.pathname = '/trainer'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
