const API_URL = 'http://localhost:8000'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl glass hover:bg-white/10 transition-all duration-300 group">
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/login`
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Tenex" className="h-14 w-auto" />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-gray-300 mb-8 animate-fade-in"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            AI-powered document intelligence
          </div>

          {/* Headline */}
          <h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="gradient-text">Ask anything</span>
            <br />
            <span className="text-white">about your Drive</span>
          </h1>

          {/* Subheadline */}
          <p 
            className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto mb-12 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            Paste any Google Drive folder link. Get instant answers 
            with citations pointing to the exact source.
          </p>

          {/* CTA Button */}
          <div 
            className="animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <button
              onClick={handleGoogleLogin}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-full font-semibold text-lg shadow-2xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-105 transition-all duration-300"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
              <svg 
                className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {/* Trust text */}
          <p 
            className="text-sm text-gray-500 mt-6 animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            Read-only access · Your data stays private
          </p>
        </div>

        {/* Feature cards */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-20 animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          <FeatureCard
            icon="📁"
            title="Paste any link"
            description="Supports folders with docs, sheets, PDFs, and more"
          />
          <FeatureCard
            icon="💬"
            title="Ask questions"
            description="Natural language queries about your content"
          />
          <FeatureCard
            icon="📎"
            title="Get citations"
            description="Every answer links back to the source document"
          />
        </div>
      </main>
    </div>
  )
}

