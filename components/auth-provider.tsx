"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

interface AdminPermissions {
  viewAdmins: boolean
  editAdmins: boolean
  deleteAdmins: boolean
  inviteAdmins: boolean
  activateAdmins: boolean
}

interface AuthAdmin {
  id: string
  name: string
  login: string
  role: "super" | "admin"
  permissions?: AdminPermissions
}

interface AuthContextValue {
  admin: AuthAdmin | null
  loading: boolean
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue>({
  admin: null,
  loading: true,
  refresh: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AuthAdmin | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        setAdmin(await res.json())
      } else {
        setAdmin(null)
      }
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <AuthContext.Provider value={{ admin, loading, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
