"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import EmailControlStation from "@/components/email-agent/EmailControlStation";

export default function EmailAgentPage() {
  const router = useRouter();

  return (
    <div className="container py-6">
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h2 className="text-2xl font-semibold">
            Email Agent - Sign In Required
          </h2>
          <p className="text-muted-foreground">
            Please sign in to access the email agent
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In</Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <EmailControlStation />
      </SignedIn>
    </div>
  );
}

