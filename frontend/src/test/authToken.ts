import type { Role } from '@/types/auth'

interface JwtPayloadOptions {
  sub?: string
  role?: Role
  exp?: number
}

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

export function createJwt({
  sub = 'admin@vollmed.com',
  role = 'ROLE_ADMIN',
  exp = Math.floor(Date.now() / 1000) + 3600,
}: JwtPayloadOptions = {}) {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ sub, role, exp })}.signature`
}
