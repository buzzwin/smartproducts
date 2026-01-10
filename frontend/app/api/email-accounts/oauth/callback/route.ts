import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Mark this route as dynamic since it uses headers() via auth()
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(
        new URL('/sign-in?redirect=/email-agent?error=unauthorized', request.url)
      );
    }

    // Extract OAuth callback parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/email-agent?error=oauth_error&message=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/email-agent?error=missing_params', request.url)
      );
    }

    // Redirect to client-side page that will complete OAuth
    // The account_id is stored in sessionStorage by EmailAccountManager
    const callbackUrl = new URL('/email-agent', request.url);
    callbackUrl.searchParams.set('oauth_callback', 'true');
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/email-agent?error=callback_error', request.url)
    );
  }
}

