/**
 * Catch-all proxy route for backend API
 * 
 * This route proxies all requests from /api/proxy/* to the internal backend API.
 * 
 * Example:
 * - Frontend: /api/proxy/products -> Backend: http://backend:5000/api/products
 * - Frontend: /api/proxy/costs/123 -> Backend: http://backend:5000/api/costs/123
 */

import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/apiProxy';

// Mark this route as dynamic since it proxies dynamic requests
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}

export async function PUT(request: NextRequest) {
  return handleProxy(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request);
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request);
}

async function handleProxy(request: NextRequest) {
  // Extract the path from the catch-all route
  // e.g., /api/proxy/products/123 -> /api/products/123
  const pathname = request.nextUrl.pathname;
  const backendPath = pathname.replace('/api/proxy', '');
  
  if (!backendPath || backendPath === '/') {
    return new Response(
      JSON.stringify({ error: 'Invalid proxy path' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return proxyToBackend(request, backendPath);
}

