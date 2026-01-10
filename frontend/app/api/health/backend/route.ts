/**
 * Health check API route for testing backend connectivity.
 * This route tests the internal backend URL from server-side environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/apiProxy';

// Mark as dynamic since it makes dynamic requests
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the backend URL from environment (server-side only)
    const backendUrl = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Test by calling the backend health endpoint (or root)
    const testUrl = `${backendUrl.replace(/\/$/, '')}/health`;
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      const responseBody = await response.text();
      let data: any;
      try {
        data = responseBody ? JSON.parse(responseBody) : { message: 'OK' };
      } catch {
        data = { message: responseBody || 'OK' };
      }
      
      return NextResponse.json({
        success: true,
        backendUrl: backendUrl.replace(/\.railway\.internal/g, ''), // Don't expose internal domain
        testUrl,
        status: response.status,
        statusText: response.statusText,
        response: data,
        headers: {
          'content-type': response.headers.get('content-type'),
        },
      });
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        backendUrl: backendUrl.replace(/\.railway\.internal/g, ''),
        testUrl,
        error: fetchError.message || 'Failed to connect',
        errorType: fetchError.name || 'UnknownError',
        errorDetails: {
          code: fetchError.code,
          cause: fetchError.cause?.message,
        },
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Health check failed',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testUrl, endpoint = '/health' } = body;
    
    if (!testUrl) {
      return NextResponse.json({
        success: false,
        error: 'testUrl is required',
      }, { status: 400 });
    }
    
    // Remove .railway.internal if present
    let cleanUrl = testUrl.replace(/\.railway\.internal/g, '');
    // Ensure it ends with the endpoint
    const fullUrl = cleanUrl.replace(/\/$/, '') + endpoint;
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      const responseBody = await response.text();
      let data: any;
      try {
        data = responseBody ? JSON.parse(responseBody) : { message: 'OK' };
      } catch {
        data = { message: responseBody || 'OK' };
      }
      
      return NextResponse.json({
        success: true,
        testUrl: fullUrl,
        status: response.status,
        statusText: response.statusText,
        response: data,
        headers: {
          'content-type': response.headers.get('content-type'),
        },
      });
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        testUrl: fullUrl,
        error: fetchError.message || 'Failed to connect',
        errorType: fetchError.name || 'UnknownError',
        errorDetails: {
          code: fetchError.code,
          cause: fetchError.cause?.message,
        },
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Test failed',
    }, { status: 500 });
  }
}

