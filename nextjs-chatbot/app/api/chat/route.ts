/**
 * API Route Handler for Chat Completions
 * =======================================
 * This route handles chat completion requests using OpenRouter API.
 * It supports streaming responses for real-time chat updates.
 */

import { NextRequest } from 'next/server'

/**
 * POST handler for chat completions
 * 
 * This function:
 * 1. Receives chat messages from the client
 * 2. Forwards them to OpenRouter API with streaming enabled
 * 3. Streams the response back to the client in real-time
 * 
 * @param request - Next.js request object containing chat messages and settings
 * @returns Streaming response from OpenRouter API
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body to get messages and configuration
    const body = await request.json()
    const { messages, model, temperature } = body

    // Validate API key exists
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Make request to OpenRouter API with streaming enabled
    // OpenRouter provides unified access to multiple LLM providers
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/chatbot', // Optional: for OpenRouter rankings
        'X-Title': 'Local Chatbot', // Optional: for OpenRouter rankings
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b', // Default model if not specified
        messages: messages, // Conversation history
        temperature: temperature || 0.7, // Creativity parameter (0-2)
        stream: true, // Enable streaming for real-time responses
      }),
    })

    // Check if request was successful
    if (!response.ok) {
      const error = await response.text()
      return new Response(
        JSON.stringify({ error: `OpenRouter API error: ${error}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return the streaming response directly to the client
    // The client will handle parsing the Server-Sent Events (SSE) stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
