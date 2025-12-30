import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
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

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Welcome, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-lg text-gray-400 mb-12">
            You're signed in and ready to go.
          </p>

          {/* Placeholder for next step */}
          <div className="max-w-xl mx-auto p-8 rounded-2xl glass">
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Drive integration coming next
            </h2>
            <p className="text-gray-400">
              Soon you'll be able to paste a Google Drive folder link here
              and ask questions about your documents.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

