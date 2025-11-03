'use client'

/**
 * Main Chat Page Component
 * ========================
 * This is the main chat interface component that provides:
 * - Real-time streaming chat with LLM models
 * - Model selection and temperature control
 * - Elegant UI using shadcn/ui components
 * - Message history management
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Settings, Trash2, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

/**
 * CodeBlock Component with Copy Button
 * ====================================
 * A wrapper component that displays code with syntax highlighting
 * and includes a copy button for easy code copying.
 */
const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false)
  
  /**
   * Handle copying code to clipboard
   * Shows visual feedback when code is successfully copied
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      // Reset the check icon back to copy icon after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }
  
  return (
    <div className="relative group">
      {/* Copy Button - appears in top-right corner of code block */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 bg-background/90 hover:bg-background border border-border/50 opacity-70 hover:opacity-100 transition-opacity z-10 shadow-sm"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      
      {/* Syntax Highlighter */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        PreTag="div"
        className="rounded-lg !my-4 border border-border/50 overflow-hidden shadow-lg"
        customStyle={{
          margin: '0',
          padding: '1.25rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          backgroundColor: '#1e1e1e', // VS Code dark background
        }}
        showLineNumbers={false}
        wrapLines={true}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

// Type definition for chat messages
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Available LLM models through OpenRouter
const MODELS = [
  { value: 'openai/gpt-oss-120b', label: 'GPT-OSS-120B' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
]

export default function ChatPage() {
  // State management for chat messages
  const [messages, setMessages] = useState<Message[]>([])
  
  // State for user input
  const [input, setInput] = useState('')
  
  // State for loading indicator (shows when AI is responding)
  const [isLoading, setIsLoading] = useState(false)
  
  // State for model selection (default: GPT-OSS-120B)
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b')
  
  // State for temperature slider (controls response creativity)
  const [temperature, setTemperature] = useState([0.7])
  
  // State for sidebar visibility (settings panel)
  const [showSettings, setShowSettings] = useState(false)
  
  // Ref to scroll to bottom when new messages arrive
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Ref for the input field to maintain focus
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Auto-scroll to bottom when new messages are added
   * This ensures users always see the latest message
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Handle sending a message
   * 
   * This function:
   * 1. Adds the user message to the chat
   * 2. Calls the API to get AI response with streaming
   * 3. Updates the UI in real-time as chunks arrive
   */
  const handleSend = async () => {
    // Don't send empty messages
    if (!input.trim() || isLoading) return

    // Get the current input and clear it
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to chat history
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    // Add placeholder for assistant response (will be updated via streaming)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      // Make API request to our Next.js API route
      // The route will forward the request to OpenRouter with streaming enabled
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages, // Send all messages for context
          model: selectedModel,
          temperature: temperature[0],
        }),
      })

      // Check if request failed
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      // Handle streaming response
      // OpenRouter returns Server-Sent Events (SSE) format
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      if (reader) {
        // Process the stream chunk by chunk
        while (true) {
          const { done, value } = await reader.read()
          
          // Stream is complete
          if (done) break

          // Decode the chunk (SSE format)
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          // Parse each line in the SSE stream
          for (const line of lines) {
            // SSE format: "data: {...}"
            if (line.startsWith('data: ')) {
              const data = line.slice(6) // Remove "data: " prefix
              
              // Skip [DONE] marker and empty data
              if (data === '[DONE]' || !data.trim()) continue

              try {
                // Parse JSON from SSE data
                const parsed = JSON.parse(data)
                
                // Extract content delta from the response
                const content = parsed.choices?.[0]?.delta?.content
                
                if (content) {
                  // Append new content to the assistant message
                  assistantMessage += content
                  
                  // Update the last message in real-time
                  setMessages((prev) => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: assistantMessage,
                    }
                    return updated
                  })
                }
              } catch (e) {
                // Skip invalid JSON (can happen during streaming)
                console.error('Error parsing SSE data:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      // Handle errors by showing error message to user
      console.error('Error sending message:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        }
        return updated
      })
    } finally {
      // Always set loading to false when done
      setIsLoading(false)
      // Focus input field for next message
      inputRef.current?.focus()
    }
  }

  /**
   * Handle keyboard shortcuts
   * Enter = send message, Shift+Enter = new line
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * Clear all chat messages
   */
  const handleClear = () => {
    setMessages([])
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Settings Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-card border-r border-border transition-transform duration-300 z-40 ${
          showSettings ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(false)}
            >
              ×
            </Button>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Temperature: {temperature[0].toFixed(1)}
            </label>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Controls creativity. Higher = more creative, Lower = more focused
            </p>
          </div>

          {/* Clear Chat Button */}
          <Button
            variant="outline"
            onClick={handleClear}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">AI Chatbot</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="container mx-auto max-w-5xl space-y-6">
            {messages.length === 0 ? (
              // Empty state when no messages
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-16 w-16 text-muted-foreground" />
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Start a conversation</h2>
                  <p className="text-muted-foreground">
                    Choose a model and start chatting with AI
                  </p>
                </div>
              </div>
            ) : (
              // Render all chat messages
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-5 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-lg px-6 py-4 max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      // Render markdown for assistant messages
                      // This allows the LLM to format responses with markdown (headers, lists, code blocks, etc.)
                      <div className="max-w-none break-words">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Custom styling for code blocks with syntax highlighting and copy button
                            code: ({ node, className, children, ...props }: any) => {
                              // Extract language from className (e.g., "language-python" -> "python")
                              const match = /language-(\w+)/.exec(className || '')
                              const language = match ? match[1] : ''
                              
                              // Check if this is inline code (not wrapped in pre tag)
                              const inline = !match || !className?.includes('language-')
                              
                              // Render code blocks with syntax highlighting and copy functionality
                              // Use CodeBlock component for editor-like appearance with copy button
                              return !inline ? (
                                // Code block (not inline) - render with syntax highlighting and copy button
                                <CodeBlock language={language || 'text'}>
                                  {String(children).replace(/\n$/, '')}
                                </CodeBlock>
                              ) : (
                                // Inline code - simple styling without syntax highlighting
                                <code
                                  className="px-2 py-1 rounded bg-muted border border-border/50 text-sm font-mono"
                                  {...props}
                                >
                                  {children}
                                </code>
                              )
                            },
                            // Custom styling for pre tags
                            pre: ({ children }: any) => {
                              // react-markdown wraps code blocks in <pre><code>
                              // Since we handle code blocks with SyntaxHighlighter in the code component,
                              // we need to pass through the children without the pre wrapper
                              // The SyntaxHighlighter uses PreTag="div" so it replaces the pre tag
                              if (children && typeof children === 'object' && 'props' in children) {
                                // If it's a code block, return the code component directly
                                return children
                              }
                              // Fallback for any other pre tags
                              return <pre className="p-0 my-3 overflow-x-auto">{children}</pre>
                            },
                            // Custom styling for paragraphs - with more spacing
                            p: ({ children }) => <p className="my-3 last:my-0 leading-relaxed">{children}</p>,
                            // Custom styling for lists
                            ul: ({ children }) => <ul className="my-3 ml-6 list-disc space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="my-3 ml-6 list-decimal space-y-1">{children}</ol>,
                            // Custom styling for list items - with more spacing
                            li: ({ children }) => <li className="my-2 leading-relaxed">{children}</li>,
                            // Custom styling for headings - with more spacing
                            h1: ({ children }) => <h1 className="text-2xl font-bold my-4 mt-6">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold my-3 mt-5">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold my-3 mt-4">{children}</h3>,
                            // Custom styling for links
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:text-primary/80"
                              >
                                {children}
                              </a>
                            ),
                            // Custom styling for blockquotes - with more padding
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-primary pl-6 italic my-4 py-2">
                                {children}
                              </blockquote>
                            ),
                            // Custom styling for horizontal rules
                            hr: () => <hr className="my-6 border-border" />,
                            // Custom styling for tables - with more spacing and padding
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border border-border rounded-md overflow-hidden">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border border-border px-6 py-4 bg-muted font-semibold text-left">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-border px-6 py-3">{children}</td>
                            ),
                          }}
                        >
                          {message.content || (isLoading && index === messages.length - 1 ? '...' : '')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      // Plain text for user messages
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto max-w-5xl px-6 py-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by OpenRouter API
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

