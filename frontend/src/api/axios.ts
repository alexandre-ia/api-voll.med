import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  notifyAuthSessionChanged,
  redirectToLoginIfNeeded,
} from '@/lib/authSession'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api' })

function normalizedPath(config: InternalAxiosRequestConfig) {
  const rawUrl = config.url ?? ''
  const baseURL = config.baseURL ?? window.location.origin
  const base = baseURL.startsWith('http') ? baseURL : `${window.location.origin}${baseURL}`
  const pathname = new URL(rawUrl, base).pathname
  return pathname.replace(/^\/api(?=\/)/, '')
}

function isLoginRequest(config: InternalAxiosRequestConfig) {
  return (config.method ?? 'get').toLowerCase() === 'post' && normalizedPath(config) === '/auth/login'
}

api.interceptors.request.use((config) => {
  if (isLoginRequest(config)) {
    delete config.headers.Authorization
    delete config.headers.authorization
    return config
  }

  const { token } = getStoredAuthSession()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginEndpoint = error.config ? isLoginRequest(error.config) : false
    if (error.response?.status === 401 && !isLoginEndpoint) {
      clearStoredAuthSession()
      notifyAuthSessionChanged()
      redirectToLoginIfNeeded()
    }
    return Promise.reject(error)
  }
)

export default api
