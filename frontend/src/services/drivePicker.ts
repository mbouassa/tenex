// Google Drive Picker configuration
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Scope for Drive access
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

let pickerApiLoaded = false
let oauthToken: string | null = null

// Load the Google API scripts
function loadGoogleApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google API'))
    document.body.appendChild(script)
  })
}

function loadGisClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.body.appendChild(script)
  })
}

async function loadPickerApi(): Promise<void> {
  if (pickerApiLoaded) return
  
  await loadGoogleApi()
  
  return new Promise((resolve) => {
    window.gapi.load('picker', () => {
      pickerApiLoaded = true
      resolve()
    })
  })
}

async function getOAuthToken(): Promise<string> {
  if (oauthToken) return oauthToken
  
  await loadGisClient()
  
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        oauthToken = response.access_token || null
        if (oauthToken) {
          resolve(oauthToken)
        } else {
          reject(new Error('No access token received'))
        }
      },
    })
    
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

export interface PickerResult {
  folderId: string
  folderName: string
}

export async function openDrivePicker(): Promise<PickerResult | null> {
  await loadPickerApi()
  const token = await getOAuthToken()
  
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true)
      .setMimeTypes('application/vnd.google-apps.folder')
    
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setCallback((data: { action: string; docs?: Array<{ id: string; name: string }> }) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const folder = data.docs?.[0]
          if (folder) {
            resolve({
              folderId: folder.id,
              folderName: folder.name,
            })
          } else {
            resolve(null)
          }
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .setTitle('Select a folder')
      .build()
    
    picker.setVisible(true)
  })
}

// Type declarations for Google APIs
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void
    }
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => {
            requestAccessToken: (options: { prompt: string }) => void
          }
        }
      }
      picker: {
        DocsView: new (viewId: string) => {
          setSelectFolderEnabled: (enabled: boolean) => typeof window.google.picker.DocsView.prototype
          setIncludeFolders: (include: boolean) => typeof window.google.picker.DocsView.prototype
          setMimeTypes: (mimeTypes: string) => typeof window.google.picker.DocsView.prototype
        }
        PickerBuilder: new () => {
          addView: (view: unknown) => typeof window.google.picker.PickerBuilder.prototype
          setOAuthToken: (token: string) => typeof window.google.picker.PickerBuilder.prototype
          setDeveloperKey: (key: string) => typeof window.google.picker.PickerBuilder.prototype
          setCallback: (callback: (data: unknown) => void) => typeof window.google.picker.PickerBuilder.prototype
          setTitle: (title: string) => typeof window.google.picker.PickerBuilder.prototype
          build: () => { setVisible: (visible: boolean) => void }
        }
        ViewId: {
          FOLDERS: string
        }
        Action: {
          PICKED: string
          CANCEL: string
        }
      }
    }
  }
}

