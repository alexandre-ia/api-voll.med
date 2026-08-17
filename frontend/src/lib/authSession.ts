import type { JwtPayload, Role, User } from '@/types/auth'

export const AUTH_TOKEN_KEY = 'token'
export const AUTH_SESSION_CHANGED_EVENT = 'auth-session-changed'

const VALID_ROLES: readonly Role[] = [
  'ROLE_ADMIN',
  'ROLE_FUNCIONARIO',
  'ROLE_MEDICO',
  'ROLE_AUDITOR',
  'ROLE_GESTOR',
]

export interface AuthSession {
  token: string | null
  user: User | null
}

export const emptyAuthSession: AuthSession = { token: null, user: null }

function isBrowser() {
  return typeof window !== 'undefined'
}

function isRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role)
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    )
    const parsed = JSON.parse(json) as Partial<JwtPayload>

    if (typeof parsed.sub !== 'string') return null
    if (typeof parsed.role !== 'string') return null
    if (typeof parsed.exp !== 'number') return null

    return parsed as JwtPayload
  } catch {
    return null
  }
}

export function userFromToken(token: string, now = Date.now()): User | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  if (!isRole(payload.role)) return null
  if (payload.exp * 1000 <= now) return null

  return { login: payload.sub, role: payload.role }
}

export function getStoredAuthToken() {
  if (!isBrowser()) return null
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function clearStoredAuthSession() {
  if (!isBrowser()) return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

export function notifyAuthSessionChanged() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}

export function getStoredAuthSession(): AuthSession {
  const token = getStoredAuthToken()
  if (!token) return emptyAuthSession

  const user = userFromToken(token)
  if (!user) {
    clearStoredAuthSession()
    return emptyAuthSession
  }

  return { token, user }
}

export function saveAuthToken(token: string): AuthSession {
  const user = userFromToken(token)
  if (!user) {
    clearStoredAuthSession()
    return emptyAuthSession
  }

  localStorage.setItem(AUTH_TOKEN_KEY, token)
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
  return { token, user }
}

export function clearInvalidStoredAuthSession() {
  const token = getStoredAuthToken()
  if (!token) return false
  if (userFromToken(token)) return false

  clearStoredAuthSession()
  notifyAuthSessionChanged()
  return true
}

export function redirectToLoginIfNeeded() {
  if (!isBrowser()) return
  if (window.location.pathname === '/login') return

  window.location.href = '/login'
}
