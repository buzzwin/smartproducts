'use client';

import { UserButton as ClerkUserButton, OrganizationSwitcher, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserButton() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-4">
      <OrganizationSwitcher
        appearance={{
          elements: {
            rootBox: "flex items-center",
            organizationSwitcherTrigger: "px-4 py-2 rounded-md border border-input bg-background hover:bg-accent"
          }
        }}
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
        afterLeaveOrganizationUrl="/"
      />
      <ClerkUserButton
        appearance={{
          elements: {
            userButtonTrigger: "focus:shadow-none",
            userButtonBox: "w-8 h-8"
          }
        }}
        afterSignOutUrl="/sign-in"
      />
    </div>
  );
}

