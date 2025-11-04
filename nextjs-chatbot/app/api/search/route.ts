/**
 * API Route Handler for Exa Search
 * =================================
 * This route handles search requests using Exa AI API.
 * It performs web searches and returns results with sources.
 */

import { NextRequest } from 'next/server'

/**
 * POST handler for Exa search
 * 
 * This function:
 * 1. Receives search query from the client
 * 2. Performs search using Exa AI API
 * 3. Returns search results with sources
 * 
 * @param request - Next.js request object containing search query
 * @returns Search results with sources
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body to get search query
    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate API key exists
    const apiKey = process.env.EXA_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Perform search using Exa AI API
    const searchResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: query.trim(),
        num_results: 5, // Get top 5 results
        contents: {
          text: true,
          summary: true,
        },
      }),
    })

    // Check if request was successful
    if (!searchResponse.ok) {
      const error = await searchResponse.text()
      return new Response(
        JSON.stringify({ error: `Exa API error: ${error}` }),
        { status: searchResponse.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const searchData = await searchResponse.json()

    // Format results with sources
    const results = {
      query: query.trim(),
      results: searchData.results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        summary: result.text?.substring(0, 300) || result.summary || '',
        publishedDate: result.published_date,
      })) || [],
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // Handle any errors that occur during the request
    console.error('Search API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

