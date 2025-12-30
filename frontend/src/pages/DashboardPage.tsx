import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ingestFolder, FileInfo } from '../services/api'
import { openDrivePicker } from '../services/drivePicker'
import ChatInterface from '../components/ChatInterface'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [folderUrl, setFolderUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [files, setFiles] = useState<FileInfo[]>([])
  const [showPasteInput, setShowPasteInput] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  const handleIngest = async (urlOrId: string) => {
    if (!urlOrId.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await ingestFolder(urlOrId)
      setFolderId(result.folder_id)
      setFolderName(result.folder_name)
      setFiles(result.files)
      setFolderUrl('')
      setShowPasteInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrowseDrive = async () => {
    try {
      setError(null)
      const result = await openDrivePicker()
      if (result) {
        await handleIngest(result.folderId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Drive picker')
    }
  }

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleIngest(folderUrl)
  }

  const handleBack = () => {
    setFiles([])
    setFolderName(null)
    setFolderId(null)
  }

  if (!user) return null

  // Show chat interface when folder is loaded
  if (files.length > 0 && folderId && folderName) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-white/10 bg-gray-950">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Tenex" className="h-8 w-auto" />
            </div>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={user.picture}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full ring-2 ring-white/10"
                />
                <span className="hidden sm:block text-sm text-gray-400">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Chat interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            folderName={folderName}
            folderId={folderId}
            files={files}
            onBack={handleBack}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-brand-400/5 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Tenex" className="h-10 w-auto" />
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={user.picture}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full ring-2 ring-white/10"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content - folder selector */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Glass card container */}
          <div className="p-8 sm:p-10 rounded-3xl glass">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Select a folder
              </h1>
              <p className="text-gray-400 leading-relaxed">
                Choose a Google Drive folder and start asking questions about your documents.
              </p>
            </div>

            {/* Primary: Browse Drive button */}
            <button
              onClick={handleBrowseDrive}
              disabled={isLoading}
              className="btn-primary-glow w-full group flex items-center justify-center gap-3 px-8 py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-semibold text-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Browse Google Drive</span>
              <svg 
                className="w-5 h-5 text-brand-200 group-hover:translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-sm text-gray-500">or paste a link</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Secondary: Paste link */}
            {!showPasteInput ? (
              <button
                onClick={() => setShowPasteInput(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Paste a folder link instead</span>
              </button>
            ) : (
              <form onSubmit={handlePasteSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={folderUrl}
                    onChange={(e) => setFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteInput(false)
                      setFolderUrl('')
                    }}
                    className="flex-1 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!folderUrl.trim() || isLoading}
                    className="flex-1 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Loading...' : 'Analyze'}
                  </button>
                </div>
              </form>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white font-medium">Analyzing your documents...</p>
              <p className="text-gray-400 text-sm">This may take a moment</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
