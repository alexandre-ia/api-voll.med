import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/api/axios'
import { authApi } from '@/api/auth'
import { AuthProvider } from './AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { AUTH_TOKEN_KEY } from '@/lib/authSession'
import { createJwt } from '@/test/authToken'

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

function AuthProbe() {
  const { token, user, isAuthenticated, login, logout } = useAuth()

  return (
    <div>
      <span data-testid="token">{token ?? ''}</span>
      <span data-testid="login">{user?.login ?? ''}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <button type="button" onClick={() => void login('admin@vollmed.com', 'senha')}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  const originalAdapter = api.defaults.adapter

  beforeEach(() => {
    vi.mocked(authApi.login).mockReset()
    api.defaults.adapter = originalAdapter
  })

  it('login sem token armazenado persiste a nova sessão', async () => {
    const user = userEvent.setup()
    const token = createJwt({ sub: 'admin@vollmed.com', role: 'ROLE_ADMIN' })
    vi.mocked(authApi.login).mockResolvedValue({ tokenJWT: token })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    await user.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))
    expect(screen.getByTestId('token')).toHaveTextContent(token)
    expect(screen.getByTestId('login')).toHaveTextContent('admin@vollmed.com')
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(token)
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('401 em rota protegida limpa storage e estado global de autenticação', async () => {
    const token = createJwt()
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'token-antigo')
    window.history.pushState({}, '', '/login')
    api.defaults.adapter = async (config) =>
      Promise.reject({
        config,
        response: {
          data: { erro: 'Token inválido ou expirado' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        },
        isAxiosError: true,
      })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')

    await expect(api.get('/pacientes')).rejects.toMatchObject({ response: { status: 401 } })

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'))
    expect(screen.getByTestId('token')).toHaveTextContent('')
    expect(screen.getByTestId('login')).toHaveTextContent('')
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('logout remove todos os dados de autenticação e limpa o estado global', async () => {
    const user = userEvent.setup()
    localStorage.setItem(AUTH_TOKEN_KEY, createJwt())
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'token-antigo')
    window.history.pushState({}, '', '/login')

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'))
    expect(screen.getByTestId('token')).toHaveTextContent('')
    expect(screen.getByTestId('login')).toHaveTextContent('')
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })
})
