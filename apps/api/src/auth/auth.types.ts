export interface AuthUser {
  id: string
  email: string
}

export interface AccessTokenPayload {
  sub: string
  email: string
  type: 'access'
}

export interface GoogleProfile {
  id: string
  email: string
  name?: string
  picture?: string
}
