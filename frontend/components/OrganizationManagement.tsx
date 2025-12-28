'use client';

import { useOrganization, CreateOrganization } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Building2, 
  Mail,
  Crown,
  User
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function OrganizationManagement() {
  const { organization, membership, isLoaded: orgLoaded } = useOrganization();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'org:admin' | 'org:member'>('org:member');

  if (!orgLoaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // If user has no organization, show create organization option
  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Your Organization
          </CardTitle>
          <CardDescription>
            Create an organization to collaborate with your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganization
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg"
              }
            }}
            afterCreateOrganizationUrl="/organization"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Organization Info */}
      {organization && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {organization.name}
                </CardTitle>
                <CardDescription>
                  {organization.membersCount} {organization.membersCount === 1 ? 'member' : 'members'}
                </CardDescription>
              </div>
              <Badge variant={membership?.role === 'org:admin' ? 'default' : 'secondary'}>
                {membership?.role === 'org:admin' ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Member
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Organization Settings */}
            {membership?.role === 'org:admin' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Organization Settings
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your organization settings, members, and invitations.
                  </p>
                </div>

                {/* Invite Members */}
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Members</DialogTitle>
                      <DialogDescription>
                        Send invitations to join your organization. They will receive an email to accept the invitation.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="colleague@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={(value) => setInviteRole(value as 'org:admin' | 'org:member')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="org:member">Member</SelectItem>
                            <SelectItem value="org:admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (!inviteEmail || !organization) return;
                          
                          try {
                            // Use Clerk's invitation API
                            const response = await fetch('/api/organizations/invite', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                email: inviteEmail,
                                role: inviteRole,
                              }),
                            });

                            const data = await response.json();

                            if (response.ok) {
                              alert(`✅ Invitation sent successfully to ${inviteEmail}!`);
                              setInviteEmail('');
                              setInviteRole('org:member');
                              setShowInviteDialog(false);
                            } else {
                              alert(`❌ Failed to send invitation: ${data.message || 'Unknown error'}`);
                            }
                          } catch (error) {
                            console.error('Error sending invitation:', error);
                            alert('Failed to send invitation. Please try again.');
                          }
                        }}
                        disabled={!inviteEmail || !inviteEmail.includes('@')}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Members List */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Organization Members
              </h3>
              <p className="text-sm text-muted-foreground">
                View and manage your organization members in the organization settings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Organization
          </CardTitle>
          <CardDescription>
            Create a new organization to separate different teams or projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganization
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg"
              }
            }}
            afterCreateOrganizationUrl="/organization"
          />
        </CardContent>
      </Card>
    </div>
  );
}

