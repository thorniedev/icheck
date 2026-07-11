// Authentication Types

import type { User } from './models'

export interface AuthSession {
  user: User
  expires: Date
  iat?: number
  exp?: number
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupPayload {
  email: string
  password: string
  confirmPassword: string
  name: string
  schoolCode: string
  role: 'teacher' | 'student'
}

export interface OAuthProvider {
  id: string
  name: string
  type: 'oauth'
  signinUrl: string
  callbackUrl: string
}

export interface JwtPayload {
  sub: string // subject (user id)
  email: string
  role: string
  schoolId: string
  iat: number
  exp: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface PermissionContext {
  userId: string
  role: string
  schoolId: string
  resourceId?: string
  resourceType?: string
}

export interface Permission {
  resource: string
  action: string
  condition?: (context: PermissionContext) => boolean
}

export interface RolePermissions {
  [role: string]: Permission[]
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
  session?: AuthSession
}

export interface QRCodePayload {
  token: string
  classroomId: string
  issuedAt: Date
  expiresAt: Date
  sessionId: string
}

export interface MFAOptions {
  enabled: boolean
  method?: 'sms' | 'email' | 'authenticator'
  verified?: boolean
}
