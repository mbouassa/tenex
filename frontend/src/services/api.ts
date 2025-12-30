const API_URL = 'http://localhost:8000'

export interface User {
  email: string
  name: string
  picture: string
}

export interface AuthResponse {
  user: User
  authenticated: boolean
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include', // Important: send cookies
    })
    
    if (!response.ok) {
      return null
    }
    
    const data: AuthResponse = await response.json()
    return data.user
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export function getLoginUrl(): string {
  return `${API_URL}/auth/login`
}

