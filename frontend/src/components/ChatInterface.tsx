import { useState, useRef, useEffect } from 'react'
import { FileInfo } from '../services/api'

// Types for chat
interface Citation {
  file_name: string
  file_id: string
  web_view_link?: string
  chunk_index: number
  text: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  isLoading?: boolean
}

interface ChatInterfaceProps {
  folderName: string
  folderId: string
  files: FileInfo[]
  onBack: () => void
}

// File type icons
function getFileIcon(mimeType: string): string {
  if (mimeType.includes('document')) return '📄'
  if (mimeType.includes('spreadsheet')) return '📊'
  if (mimeType.includes('presentation')) return '📽️'
  if (mimeType.includes('pdf')) return '📕'
  return '📄'
}

export default function ChatInterface({ folderName, folderId, files, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFiles(false)
      }
    }
    if (showFiles) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFiles])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isLoading: true,
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInput('')
    setIsLoading(true)

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    try {
      const response = await fetch('http://localhost:8000/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          folder_id: folderId,
          question: userMessage.content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: loadingMessage.id,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
      }

      setMessages(prev => prev.map(m => 
        m.id === loadingMessage.id ? assistantMessage : m
      ))
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === loadingMessage.id 
          ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isLoading: false }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - matches main header width */}
      <div className="flex-shrink-0 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            title="Change folder"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="relative flex items-center gap-4" ref={dropdownRef}>
            {/* Folder icon */}
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            
            {/* Folder name and file count */}
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-medium text-white">{folderName}</h2>
              <span className="text-gray-600">·</span>
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>{files.length} files</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${showFiles ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Files dropdown */}
            {showFiles && (
              <div className="absolute top-full left-0 mt-2 w-72 py-2 rounded-xl bg-gray-900 border border-white/10 shadow-xl shadow-black/50 z-50">
                <div className="px-3 pb-2 mb-2 border-b border-white/5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Indexed files</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.web_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors group"
                    >
                      <span className="text-lg">{getFileIcon(file.mime_type)}</span>
                      <span className="flex-1 text-sm text-gray-300 group-hover:text-white truncate">
                        {file.name}
                      </span>
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state - centered input */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-2xl">
            {/* Title */}
            <h2 className="text-2xl font-medium text-white text-center mb-8">
              What would you like to know?
            </h2>
            
            {/* Centered input */}
            <div className="relative group mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-600/20 via-brand-500/10 to-brand-600/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your documents..."
                  rows={1}
                  style={{ overflow: input.includes('\n') || (inputRef.current && inputRef.current.scrollHeight > 60) ? 'auto' : 'hidden' }}
                  className="w-full px-5 py-4 pr-16 max-h-40 rounded-2xl bg-gray-900/80 border border-white/[0.08] text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/20 transition-all duration-200"
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3">
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      input.trim() 
                        ? 'bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 active:scale-95' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { text: 'What is this folder about?', icon: '📁' },
                { text: 'Summarize the main points', icon: '✨' },
                { text: 'Key dates and deadlines', icon: '📅' },
              ].map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => setInput(suggestion.text)}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-gray-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200"
                >
                  <span className="text-base opacity-70 group-hover:opacity-100 transition-opacity">{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-brand-600 text-white rounded-2xl rounded-br-md px-4 py-3'
                        : 'bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-gray-400 text-sm">Thinking...</span>
                      </div>
                    ) : (
                      <>
                        <p className={`whitespace-pre-wrap ${message.role === 'assistant' ? 'text-gray-200' : ''}`}>
                          {message.content}
                        </p>
                        
                        {/* Citations */}
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Sources</p>
                            <div className="space-y-2">
                              {message.citations.map((citation, i) => (
                                <a
                                  key={i}
                                  href={citation.web_view_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-300 group-hover:text-white truncate">
                                        {citation.file_name}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        "{citation.text.slice(0, 120)}..."
                                      </p>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input area - bottom */}
        <div className="flex-shrink-0 pb-6 pt-4">
          <div className="max-w-3xl mx-auto px-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-600/20 via-brand-500/10 to-brand-600/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your documents..."
                  rows={1}
                  style={{ overflow: input.includes('\n') || (inputRef.current && inputRef.current.scrollHeight > 60) ? 'auto' : 'hidden' }}
                  className="w-full px-5 py-4 pr-16 max-h-40 rounded-2xl bg-gray-900/80 border border-white/[0.08] text-white placeholder-gray-500 resize-none focus:outline-none focus:border-white/20 transition-all duration-200"
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3">
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      input.trim() 
                        ? 'bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 active:scale-95' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}

