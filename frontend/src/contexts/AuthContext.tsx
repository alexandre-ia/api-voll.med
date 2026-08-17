import { createContext, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '@/api/auth'
import type { User } from '@/types/auth'
import {
  AUTH_SESSION_CHANGED_EVENT,
  clearStoredAuthSession,
  emptyAuthSession,
  getStoredAuthSession,
  notifyAuthSessionChanged,
  redirectToLoginIfNeeded,
  saveAuthToken,
} from '@/lib/authSession'

interface AuthContextType {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (login: string, senha: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(getStoredAuthSession)

  useEffect(() => {
    function syncSession() {
      setSession(getStoredAuthSession())
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession)
    window.addEventListener('storage', syncSession)

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession)
      window.removeEventListener('storage', syncSession)
    }
  }, [])

  const login = useCallback(async (loginStr: string, senha: string) => {
    const { tokenJWT } = await authApi.login({ login: loginStr, senha })
    const nextSession = saveAuthToken(tokenJWT)
    setSession(nextSession)
    notifyAuthSessionChanged()
  }, [])

  const logout = useCallback(() => {
    clearStoredAuthSession()
    setSession(emptyAuthSession)
    notifyAuthSessionChanged()
    redirectToLoginIfNeeded()
  }, [])

  const { token, user } = session

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token && !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
