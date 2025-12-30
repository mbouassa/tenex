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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Change folder"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📁</span>
                <h2 className="text-lg font-semibold text-white">{folderName}</h2>
              </div>
              <p className="text-sm text-gray-500">{files.length} files indexed</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowFiles(!showFiles)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showFiles ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Files</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showFiles ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Collapsible files panel */}
        {showFiles && (
          <div className="border-t border-white/5 bg-gray-900/50">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <a
                    key={file.id}
                    href={file.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm transition-colors group"
                  >
                    <span>{getFileIcon(file.mime_type)}</span>
                    <span className="text-gray-300 group-hover:text-white truncate max-w-[150px]">
                      {file.name}
                    </span>
                    <svg className="w-3 h-3 text-gray-500 group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Ask about your documents</h3>
              <p className="text-gray-400 max-w-md mb-8">
                I've analyzed {files.length} file{files.length !== 1 ? 's' : ''} from your folder. 
                Ask me anything about their contents.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['What is this folder about?', 'Summarize the main points', 'What are the key dates mentioned?'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages list */
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
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-white/10 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <p className="text-xs text-gray-600 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

