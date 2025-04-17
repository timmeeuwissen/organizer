import { defineEventHandler, getQuery, readBody, createError } from 'h3'

/**
 * API proxy endpoint that forwards requests to external APIs
 * This helps avoid CORS issues and provides a consistent way to make external requests
 * 
 * Usage: /api/proxy?url=https://api.example.com/endpoint
 * 
 * The request method, headers, and body will be forwarded to the target URL
 * Authorization headers from the client will also be forwarded
 */
export default defineEventHandler(async (event) => {
  // Get the target URL from the query parameters
  const query = getQuery(event)
  const targetUrl = query.url as string

  if (!targetUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required url parameter'
    })
  }

  try {
    // Get the original request details
    const method = event.node.req.method || 'GET'
    const headers: Record<string, string> = {}
    
    // Copy relevant headers from the original request
    for (const [key, value] of Object.entries(event.node.req.headers)) {
      if (
        key.toLowerCase() !== 'host' && 
        key.toLowerCase() !== 'origin' &&
        key.toLowerCase() !== 'referer' &&
        key.toLowerCase() !== 'content-length'
      ) {
        if (typeof value === 'string') {
          headers[key] = value
        } else if (Array.isArray(value) && value.length > 0) {
          headers[key] = value[0]
        }
      }
    }

    // Get the request body for appropriate methods
    let body = null
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await readBody(event)
    }

    // Make the request to the target URL
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    })

    // Check if the response is OK
    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: response.statusText,
        data: await response.text()
      })
    }

    // Try to parse the response as JSON, but fall back to text if it fails
    let data
    try {
      data = await response.json()
    } catch (e) {
      data = await response.text()
    }

    // Return the data from the proxied request
    return data
  } catch (error: any) {
    console.error('API proxy error:', error)
    
    // Return a proper error response
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error',
      data: error.data || error.message || 'Something went wrong'
    })
  }
})
