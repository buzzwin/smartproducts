/**
 * API Proxy Helper
 * 
 * This helper allows Next.js API routes to safely call the internal Python backend
 * without exposing internal URLs to the browser.
 * 
 * Usage in Next.js API routes:
 * ```ts
 * import { proxyToBackend } from '@/lib/apiProxy';
 * 
 * export async function GET(request: NextRequest) {
 *   return proxyToBackend(request, '/api/products');
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the internal backend API URL.
 * This should NOT be exposed to the browser (no NEXT_PUBLIC_ prefix).
 */
function getBackendApiUrl(): string {
  // In Railway, use the internal service name (without .railway.internal)
  // Examples: 
  //   - http://incredible-prosperity:5000 (Railway internal service name)
  //   - http://localhost:8000 (local development)
  // Fallback to localhost for local development
  const apiUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:8000';
  
  // Remove trailing slash if present
  let url = apiUrl.replace(/\/$/, '');
  
  // Remove .railway.internal if present (not needed, just use service name)
  url = url.replace(/\.railway\.internal/g, '');
  
  return url;
}

/**
 * Proxy a request to the internal backend API.
 * 
 * @param request - The Next.js request object
 * @param backendPath - The path on the backend API (e.g., '/api/products')
 * @param options - Optional configuration
 * @returns NextResponse with the backend response
 */
export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<NextResponse> {
  try {
    const backendUrl = getBackendApiUrl();
    const fullUrl = `${backendUrl}${backendPath}`;
    
    // Get query string from request URL
    const searchParams = request.nextUrl.searchParams.toString();
    const urlWithQuery = searchParams ? `${fullUrl}?${searchParams}` : fullUrl;
    
    // Prepare headers (forward relevant headers, but don't expose internal URLs)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Get request body if present
    let body: BodyInit | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          body = await request.text(); // Preserve original JSON
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          body = await request.text();
        } else {
          body = await request.arrayBuffer();
        }
      } catch (e) {
        // No body or error reading body, continue without it
        body = undefined;
      }
    }
    
    // Make request to backend
    const method = options.method || request.method;
    const controller = new AbortController();
    const timeout = options.timeout || 30000; // 30 second default timeout
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const backendResponse = await fetch(urlWithQuery, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle 204 No Content responses (no body)
      if (backendResponse.status === 204) {
        return new NextResponse(null, {
          status: 204,
          statusText: backendResponse.statusText,
        });
      }
      
      // Get response body
      const responseBody = await backendResponse.text();
      
      // Create response with same status and headers
      let response: NextResponse;
      if (!responseBody || responseBody.trim() === '') {
        // Empty response - return null JSON
        response = NextResponse.json(null, {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
        });
      } else {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(responseBody);
          response = NextResponse.json(jsonData, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
          });
        } catch (parseError) {
          // Not JSON - return as text
          response = new NextResponse(responseBody, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: {
              'Content-Type': backendResponse.headers.get('content-type') || 'text/plain',
            },
          });
        }
      }
      
      // Forward relevant headers (excluding internal/server headers)
      const headersToForward = [
        'content-type',
        'cache-control',
        'expires',
        'etag',
        'last-modified',
      ];
      
      headersToForward.forEach((headerName) => {
        const headerValue = backendResponse.headers.get(headerName);
        if (headerValue) {
          response.headers.set(headerName, headerValue);
        }
      });
      
      return response;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Backend request timeout' },
          { status: 504 }
        );
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy request to backend',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Create a proxy handler for a specific backend endpoint.
 * Useful for creating route handlers that proxy to the backend.
 */
export function createProxyHandler(backendPath: string) {
  return async (request: NextRequest) => {
    return proxyToBackend(request, backendPath);
  };
}

