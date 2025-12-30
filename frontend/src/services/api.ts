const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export interface User {
  email: string
  name: string
  picture: string
}

export interface AuthResponse {
  user: User
  authenticated: boolean
  access_token?: string
}

export interface FileInfo {
  id: string
  name: string
  mime_type: string
  size?: string
  modified_time?: string
  web_view_link?: string
}

export interface IngestResponse {
  folder_id: string
  folder_name: string
  files: FileInfo[]
  file_count: number
}

export async function fetchCurrentUser(): Promise<{ user: User; accessToken: string } | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      return null
    }
    
    const data: AuthResponse = await response.json()
    return { user: data.user, accessToken: data.access_token || '' }
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

export async function ingestFolder(folderUrl: string): Promise<IngestResponse> {
  const response = await fetch(`${API_URL}/drive/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ folder_url: folderUrl }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to ingest folder')
  }
  
  return response.json()
}
