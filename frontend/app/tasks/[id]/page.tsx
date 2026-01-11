"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { tasksAPI } from "@/lib/api";
import type { Task } from "@/types";

export default function TaskSharePage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const taskId = params?.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load task when component mounts or when user signs in
  useEffect(() => {
    if (taskId && isLoaded && isSignedIn) {
      loadTask();
    } else if (taskId && isLoaded && !isSignedIn) {
      // Wait for sign-in, don't load yet
      setLoading(false);
    }
  }, [taskId, isSignedIn, isLoaded]);

  // Redirect to workspace when task is loaded and user is signed in
  useEffect(() => {
    if (isSignedIn && isLoaded && task && task.product_id && !loading && !error) {
      // Store in sessionStorage for ProductWorkspace to read
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sharedTaskId', task.id);
        sessionStorage.setItem('sharedProductId', task.product_id);
        if (task.module_id) {
          sessionStorage.setItem('sharedModuleId', task.module_id);
        }
      }
      
      // Small delay to ensure auth state is fully propagated
      const redirectTimer = setTimeout(() => {
        const params = new URLSearchParams({
          product: task.product_id,
          tab: 'workspace',
          step: 'execution',
          taskId: task.id,
        });
        if (task.module_id) {
          params.append('module', task.module_id);
        }
        router.push(`/?${params.toString()}`);
      }, 500);
      return () => clearTimeout(redirectTimer);
    }
  }, [isSignedIn, isLoaded, task, router, loading, error]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const taskData = await tasksAPI.get(taskId);
      setTask(taskData);
      
      if (!taskData.product_id) {
        setError("Task does not have a product associated");
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading task...</p>
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
            Please sign in to view this shared task
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In</Button>
          </SignInButton>
          {task && (
            <div className="mt-4 p-4 bg-muted rounded-lg max-w-md">
              <p className="text-sm text-muted-foreground">
                You will be redirected to the task after signing in.
              </p>
            </div>
          )}
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          {task ? (
            <>
              <h2 className="text-2xl font-semibold">Redirecting...</h2>
              <p className="text-muted-foreground">
                Taking you to: {task.title}
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

