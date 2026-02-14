"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { type Role, type Permission, ROLE_PERMISSIONS } from "./types"

interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  avatar: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { error: data.error || "Error al iniciar sesion" }
        }
        setUser(data.user)
        router.push("/dashboard")
        router.refresh()
        return {}
      } catch {
        return { error: "Error de conexion" }
      }
    },
    [router]
  )

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { error: data.error || "Error al registrarse" }
        }
        setUser(data.user)
        router.push("/dashboard")
        router.refresh()
        return {}
      } catch {
        return { error: "Error de conexion" }
      }
    },
    [router]
  )

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    router.push("/login")
    router.refresh()
  }, [router])

  const hasPermissionFn = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false
      return ROLE_PERMISSIONS[user.role].includes(permission)
    },
    [user]
  )

  const hasAnyPermissionFn = useCallback(
    (permissions: Permission[]): boolean => {
      if (!user) return false
      return permissions.some((p) => ROLE_PERMISSIONS[user.role].includes(p))
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        hasPermission: hasPermissionFn,
        hasAnyPermission: hasAnyPermissionFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
