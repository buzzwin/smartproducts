"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { unifiedCostsAPI } from "@/lib/api";
import type { Cost } from "@/types";

export default function CostSharePage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const costId = params?.id as string;
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cost when component mounts or when user signs in
  useEffect(() => {
    if (costId && isLoaded && isSignedIn) {
      loadCost();
    } else if (costId && isLoaded && !isSignedIn) {
      // Wait for sign-in, don't load yet
      setLoading(false);
    }
  }, [costId, isSignedIn, isLoaded]);

  // Redirect to workspace when cost is loaded and user is signed in
  useEffect(() => {
    if (isSignedIn && isLoaded && cost && cost.product_id && !loading && !error) {
      // Store in sessionStorage for ProductWorkspace to read
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sharedCostId', cost.id);
        sessionStorage.setItem('sharedProductId', cost.product_id);
        if (cost.module_id) {
          sessionStorage.setItem('sharedModuleId', cost.module_id);
        }
      }
      
      // Small delay to ensure auth state is fully propagated
      const redirectTimer = setTimeout(() => {
        const params = new URLSearchParams({
          product: cost.product_id,
          tab: 'workspace',
          step: 'cost',
          costId: cost.id,
        });
        if (cost.module_id) {
          params.append('module', cost.module_id);
        }
        router.push(`/?${params.toString()}`);
      }, 500);
      return () => clearTimeout(redirectTimer);
    }
  }, [isSignedIn, isLoaded, cost, router, loading, error]);

  const loadCost = async () => {
    try {
      setLoading(true);
      setError(null);
      const costData = await unifiedCostsAPI.getById(costId);
      setCost(costData);
      
      if (!costData.product_id) {
        setError("Cost does not have a product associated");
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cost");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading cost...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-red-600 text-center">
            <h2 className="text-2xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
          <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h2 className="text-2xl font-semibold">Sign In Required</h2>
          <p className="text-muted-foreground">
            Please sign in to view this shared cost
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In</Button>
          </SignInButton>
          {cost && (
            <div className="mt-4 p-4 bg-muted rounded-lg max-w-md">
              <p className="text-sm text-muted-foreground">
                You will be redirected to the cost after signing in.
              </p>
            </div>
          )}
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          {cost ? (
            <>
              <h2 className="text-2xl font-semibold">Redirecting...</h2>
              <p className="text-muted-foreground">
                Taking you to: {cost.name}
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">Loading...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </>
          )}
        </div>
      </SignedIn>
    </div>
  );
}

