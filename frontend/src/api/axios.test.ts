import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import api from './axios'
import { AUTH_TOKEN_KEY } from '@/lib/authSession'
import { createJwt } from '@/test/authToken'

function authorizationHeader(config: InternalAxiosRequestConfig) {
  const headers = config.headers as typeof config.headers & { get?: (name: string) => unknown }
  if (typeof headers.get === 'function') return headers.get('Authorization')
  return headers.Authorization ?? headers.authorization
}

function successAdapter(capture: { config?: InternalAxiosRequestConfig }): AxiosAdapter {
  return async (config) => {
    capture.config = config as InternalAxiosRequestConfig
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {},
    }
  }
}

function unauthorizedAdapter(capture: { config?: InternalAxiosRequestConfig }): AxiosAdapter {
  return async (config) => {
    capture.config = config as InternalAxiosRequestConfig
    return Promise.reject({
      config,
      response: {
        data: { erro: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      },
      isAxiosError: true,
    })
  }
}

function forbiddenAdapter(capture: { config?: InternalAxiosRequestConfig }): AxiosAdapter {
  return async (config) => {
    capture.config = config as InternalAxiosRequestConfig
    return Promise.reject({
      config,
      response: {
        data: 'Acesso negado',
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      },
      isAxiosError: true,
    })
  }
}

describe('api axios auth interceptor', () => {
  const originalAdapter = api.defaults.adapter

  beforeEach(() => {
    api.defaults.adapter = originalAdapter
  })

  afterEach(() => {
    api.defaults.adapter = originalAdapter
  })

  it('não envia Authorization no login mesmo com JWT expirado armazenado', async () => {
    const capture: { config?: InternalAxiosRequestConfig } = {}
    const expiredToken = createJwt({ exp: Math.floor(Date.now() / 1000) - 60 })
    localStorage.setItem(AUTH_TOKEN_KEY, expiredToken)
    api.defaults.adapter = successAdapter(capture)

    await api.post('/auth/login', { login: 'admin@vollmed.com', senha: 'senha' })

    expect(authorizationHeader(capture.config!)).toBeUndefined()
  })

  it('envia Authorization em rota protegida quando há token válido', async () => {
    const capture: { config?: InternalAxiosRequestConfig } = {}
    const token = createJwt()
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    api.defaults.adapter = successAdapter(capture)

    await api.get('/pacientes')

    expect(authorizationHeader(capture.config!)).toBe(`Bearer ${token}`)
  })

  it('limpa localStorage e sessionStorage quando rota protegida retorna 401', async () => {
    const capture: { config?: InternalAxiosRequestConfig } = {}
    localStorage.setItem(AUTH_TOKEN_KEY, createJwt())
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'token-antigo')
    window.history.pushState({}, '', '/login')
    api.defaults.adapter = unauthorizedAdapter(capture)

    await expect(api.get('/pacientes')).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('não trata 401 do próprio login como sessão expirada', async () => {
    const capture: { config?: InternalAxiosRequestConfig } = {}
    const token = createJwt()
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    api.defaults.adapter = unauthorizedAdapter(capture)

    await expect(api.post('/auth/login', { login: 'admin@vollmed.com', senha: 'errada' })).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(authorizationHeader(capture.config!)).toBeUndefined()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(token)
  })

  it('mantém a sessão quando rota protegida retorna 403', async () => {
    const capture: { config?: InternalAxiosRequestConfig } = {}
    const token = createJwt()
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    sessionStorage.setItem(AUTH_TOKEN_KEY, token)
    api.defaults.adapter = forbiddenAdapter(capture)

    await expect(api.get('/auth/medicos-disponiveis')).rejects.toMatchObject({ response: { status: 403 } })

    expect(authorizationHeader(capture.config!)).toBe(`Bearer ${token}`)
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(token)
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe(token)
  })
})
