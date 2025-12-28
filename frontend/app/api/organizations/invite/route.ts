import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

    // Create invitation using Clerk
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: role || 'org:member',
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

