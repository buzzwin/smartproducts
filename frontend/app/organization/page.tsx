'use client';

import { OrganizationProfile } from '@clerk/nextjs';
import { OrganizationManagement } from '@/components/OrganizationManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function OrganizationPage() {
  const [view, setView] = useState<'management' | 'settings'>('management');

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Organization Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization, invite members, and configure settings
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={view === 'management' ? 'default' : 'outline'}
          onClick={() => setView('management')}
        >
          Overview
        </Button>
        <Button
          variant={view === 'settings' ? 'default' : 'outline'}
          onClick={() => setView('settings')}
        >
          Full Settings
        </Button>
      </div>

      {view === 'management' ? (
        <OrganizationManagement />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>
              Complete organization management interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationProfile
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-lg"
                }
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

