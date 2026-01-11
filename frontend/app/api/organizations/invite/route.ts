import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Mark this route as dynamic since it uses headers() via auth()
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId, orgId, orgRole } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can invite members
    if (orgRole !== 'org:admin') {
      return NextResponse.json(
        { message: 'Only organization admins can invite members' },
        { status: 403 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { message: 'No organization selected' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Get the app URL from environment or request headers
    let appUrl: string;
    if (process.env.NEXT_PUBLIC_APP_URL) {
      appUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      appUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    } else {
      // Fallback to request origin
      const url = new URL(request.url);
      appUrl = `${url.protocol}//${url.host}`;
    }
    
    // Set redirect URL to app home page after invitation acceptance
    const redirectUrl = `${appUrl.replace(/\/$/, '')}/`;

    // Create invitation using Clerk
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: role || 'org:member',
      redirectUrl: redirectUrl,
    });

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitationId: invitation.id,
    });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    
    // Handle specific Clerk errors
    if (error.errors) {
      const errorMessage = error.errors[0]?.message || 'Failed to send invitation';
      return NextResponse.json(
        { message: errorMessage },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

