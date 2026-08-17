import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Login from './Login'
import { AuthContext } from '@/contexts/AuthContext'
import { AUTH_TOKEN_KEY } from '@/lib/authSession'
import { createJwt } from '@/test/authToken'

function renderLogin(login = vi.fn()) {
  return render(
    <AuthContext.Provider
      value={{
        token: null,
        user: null,
        isAuthenticated: false,
        login,
        logout: vi.fn(),
      }}
    >
      <Login />
    </AuthContext.Provider>
  )
}

describe('Login', () => {
  it('limpa token inválido anterior ao abrir a tela', async () => {
    const expiredToken = createJwt({ exp: Math.floor(Date.now() / 1000) - 60 })
    localStorage.setItem(AUTH_TOKEN_KEY, expiredToken)
    sessionStorage.setItem(AUTH_TOKEN_KEY, expiredToken)

    renderLogin()

    await waitFor(() => expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull())
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('exibe credenciais inválidas para 401 do /auth/login sem entrar em loop', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue({ response: { status: 401 } })
    window.history.pushState({}, '', '/login')

    renderLogin(login)

    await user.type(screen.getByLabelText('Login'), 'admin@vollmed.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-incorreta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Credenciais inválidas. Verifique seu login e senha.')).toBeInTheDocument()
    expect(login).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
  })
})
