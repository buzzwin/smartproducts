# Clerk Authentication Setup

Clerk has been successfully integrated into the SmartProducts Platform with organizational support.

## Setup Instructions

1. **Create a Clerk Account**
   - Go to https://dashboard.clerk.com
   - Sign up for a free account

2. **Create an Application**
   - Create a new application in the Clerk dashboard
   - Choose "Next.js" as your framework

3. **Enable Organizations**
   - In your Clerk dashboard, go to **Organizations** settings
   - Enable "Organizations" feature
   - Configure organization settings (allow personal accounts, etc.)

4. **Get Your API Keys**
   - Go to **API Keys** in your Clerk dashboard
   - Copy your `Publishable Key` and `Secret Key`

5. **Configure Environment Variables**
   - Create a `.env.local` file in the `frontend` directory
   - Add the following variables:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

6. **Restart Your Dev Server**
   ```bash
   npm run dev
   ```

## Features Implemented

### Authentication
- ✅ User sign-in and sign-up pages
- ✅ Protected routes via middleware
- ✅ User profile button with dropdown menu
- ✅ Sign out functionality

### Organizations
- ✅ Organization switcher component
- ✅ Create and switch between organizations
- ✅ Organization context available throughout the app

### UI Components
- ✅ `UserButton` component with organization switcher
- ✅ Sign-in/sign-up pages with Clerk components
- ✅ Protected content that only shows when signed in

## Routes

- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/` - Main application (protected, requires authentication)

## Usage in Components

### Check Authentication Status
```tsx
import { useUser, useAuth } from '@clerk/nextjs'

function MyComponent() {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  
  if (!isLoaded) return <div>Loading...</div>
  
  return <div>Hello {user?.firstName}</div>
}
```

### Get Current Organization
```tsx
import { useOrganization } from '@clerk/nextjs'

function MyComponent() {
  const { organization, isLoaded } = useOrganization()
  
  if (!isLoaded) return <div>Loading...</div>
  
  return <div>Current org: {organization?.name}</div>
}
```

### Protect API Routes
```tsx
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId, orgId } = await auth()
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Use userId and orgId to filter data
  return Response.json({ data: '...' })
}
```

## Middleware Protection

The `middleware.ts` file protects all routes except:
- `/sign-in`
- `/sign-up`
- `/` (home page - but content is protected by SignedIn/SignedOut)

All other routes require authentication.

## Next Steps

1. **Backend Integration**: Update your backend API to accept Clerk JWT tokens
2. **Organization-based Data Filtering**: Filter products, costs, etc. by organization
3. **Role-based Access Control**: Implement roles and permissions within organizations
4. **Team Management**: Add team member management UI

## Clerk Dashboard Features

In the Clerk dashboard, you can:
- View all users and organizations
- Manage user roles and permissions
- Configure authentication methods (email, OAuth, etc.)
- Set up custom domains
- View analytics and logs

