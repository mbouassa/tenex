import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, fetchCurrentUser, logout as apiLogout } from '../services/api'

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = async () => {
    setIsLoading(true)
    const result = await fetchCurrentUser()
    setUser(result?.user || null)
    setAccessToken(result?.accessToken || null)
    setIsLoading(false)
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
    setAccessToken(null)
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

