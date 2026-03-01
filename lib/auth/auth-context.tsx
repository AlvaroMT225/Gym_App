"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getDashboardRoute } from "@/lib/auth/permissions"
import { type Permission, ROLE_PERMISSIONS } from "@/lib/auth/types"
import type { AppRole, AppUser, UserProfile } from "@/lib/auth/types"

// ==================== HELPERS ====================

function buildAppUser(
  userId: string,
  email: string,
  profile: UserProfile | null
): AppUser {
  const firstName = profile?.first_name ?? ""
  const lastName = profile?.last_name ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0]
  const role: AppRole = profile?.role ?? "athlete"

  // Iniciales para el avatar
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return {
    id: userId,
    name: fullName,
    email,
    role,
    avatar: initials,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

// ==================== CONTEXT TYPES ====================

interface AuthContextValue {
  user: AppUser | null
  profile: UserProfile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: AppRole
  ) => Promise<{ error?: string; requiresConfirmation?: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ==================== PROVIDER ====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const signOutInFlightRef = useRef(false)
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  // Carga el perfil desde la DB, actualiza el estado y retorna el perfil
  const loadProfile = useCallback(
    async (userId: string, email: string): Promise<UserProfile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("id, gym_id, role, first_name, last_name, email, phone, avatar_url, bio, coach_id, is_active, created_at, updated_at")
        .eq("id", userId)
        .single()

      const userProfile = data as UserProfile | null
      setProfile(userProfile)
      setUser(buildAppUser(userId, email, userProfile))
      return userProfile
    },
    [supabase]
  )

  // Al montar: verificar sesion existente
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? "").finally(() =>
          setIsLoading(false)
        )
      } else {
        setIsLoading(false)
      }
    })

    // Suscribirse a cambios de sesion (login/logout en otra pestana, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await loadProfile(session.user.id, session.user.email ?? "")
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setProfile(null)
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Refrescar perfil en segundo plano para mantener datos actualizados
          loadProfile(session.user.id, session.user.email ?? "")
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, loadProfile])

  // ==================== AUTH FUNCTIONS ====================

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          const msg =
            error.message.includes("Invalid login credentials")
              ? "Email o contraseña incorrectos."
              : error.message.includes("Email not confirmed")
              ? "Debes confirmar tu email antes de iniciar sesion."
              : "Error al iniciar sesion. Intenta de nuevo."
          return { error: msg }
        }

        if (data.user) {
          const profile = await loadProfile(data.user.id, data.user.email ?? "")
          const role: AppRole = profile?.role ?? "athlete"
          const redirectPath = getDashboardRoute(role)
          router.push(redirectPath)
        }

        return {}
      } catch {
        return { error: "Error de conexion. Verifica tu internet." }
      } finally {
        setIsLoading(false)
      }
    },
    [supabase, router, loadProfile]
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: AppRole = "athlete"
    ): Promise<{ error?: string; requiresConfirmation?: boolean }> => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
          },
        })

        if (error) {
          console.error('[auth] signUp error:', error)
          const msg =
            error.message.includes("already registered") ||
            error.message.includes("already exists")
              ? "Este email ya esta registrado. Intenta iniciar sesion."
              : error.message.includes("password")
              ? "La contrasena no cumple los requisitos minimos."
              : error.message
          return { error: msg }
        }

        // Si hay sesion inmediata (confirmacion desactivada)
        if (data.session && data.user) {
          await loadProfile(data.user.id, data.user.email ?? "")
          router.push(getDashboardRoute(role))
          router.refresh()
          return {}
        }

        // Si se requiere confirmar email
        return { requiresConfirmation: true }
      } catch (err) {
        console.error('[auth] signUp unexpected error:', err)
        return { error: err instanceof Error ? err.message : "Error de conexion. Verifica tu internet." }
      } finally {
        setIsLoading(false)
      }
    },
    [supabase, router, loadProfile]
  )

  const signOut = useCallback(async () => {
    if (signOutInFlightRef.current) return
    signOutInFlightRef.current = true
    setIsLoading(true)

    // 1) Limpiar estado en memoria de inmediato
    setUser(null)
    setProfile(null)

    // 2) Limpiar almacenamiento local relacionado a auth
    if (typeof window !== "undefined") {
      const clearAuthKeys = (storage: Storage) => {
        const keysToRemove: string[] = []
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i)
          if (!key) continue
          const lower = key.toLowerCase()
          const isSupabaseAuthToken =
            /^sb-[a-z0-9-]+-auth-token$/i.test(key) || lower === "supabase.auth.token"
          const isSupabaseCodeVerifier =
            /^sb-[a-z0-9-]+-code-verifier$/i.test(key) || lower === "supabase.auth.code_verifier"
          if (isSupabaseAuthToken || isSupabaseCodeVerifier) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => storage.removeItem(key))
      }

      clearAuthKeys(window.localStorage)
      clearAuthKeys(window.sessionStorage)
    }

    const SIGN_OUT_TIMEOUT_MS = 10000
    let shouldForceHardRedirect = false

    // 3) Cerrar sesión remota (cliente + server) en paralelo con timeout no agresivo
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), SIGN_OUT_TIMEOUT_MS)

      try {
        const clientSignOut = Promise.race([
          supabase.auth.signOut().then(({ error }) => {
            if (error) throw error
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Client signOut timeout")), SIGN_OUT_TIMEOUT_MS)
          ),
        ])

        const serverSignOut = fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        }).then((response) => {
          if (!response.ok) {
            throw new Error(`Server signOut failed: ${response.status}`)
          }
        })

        const [clientResult, serverResult] = await Promise.allSettled([
          clientSignOut,
          serverSignOut,
        ])

        if (clientResult.status === "rejected" || serverResult.status === "rejected") {
          shouldForceHardRedirect = true
        }
      } finally {
        clearTimeout(timeoutId)
      }
    } catch {
      shouldForceHardRedirect = true
    } finally {
      // 4) Redirigir siempre a /login, incluso si falla el signOut remoto
      router.replace("/login")
      router.refresh()

      if (typeof window !== "undefined") {
        if (shouldForceHardRedirect) {
          window.location.assign("/login")
        } else {
          setTimeout(() => {
            if (window.location.pathname !== "/login") {
              window.location.assign("/login")
            }
          }, 400)
        }
      }

      setIsLoading(false)
      signOutInFlightRef.current = false
    }
  }, [supabase, router])

  // ==================== REFRESH PROFILE ====================

  const refreshProfile = useCallback(async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadProfile(session.user.id, session.user.email ?? "")
    }
  }, [supabase, loadProfile])

  // ==================== PERMISSION HELPERS ====================

  const hasPermissionFn = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false
      return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
    },
    [user]
  )

  const hasAnyPermissionFn = useCallback(
    (permissions: Permission[]): boolean => {
      if (!user) return false
      return permissions.some((p) => ROLE_PERMISSIONS[user.role]?.includes(p) ?? false)
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        hasPermission: hasPermissionFn,
        hasAnyPermission: hasAnyPermissionFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ==================== HOOK ====================

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
