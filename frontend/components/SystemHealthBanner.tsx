"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";

type Health = "checking" | "ok" | "db_down" | "backend_down";

/**
 * Polls the backend health endpoint and shows a prominent banner on the
 * dashboard when the API or its database is unreachable, so connectivity
 * problems are visible instead of surfacing as empty data or a cryptic error.
 */
export default function SystemHealthBanner() {
  const [health, setHealth] = useState<Health>("checking");
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/health/backend", { cache: "no-store" });
      // The health route responds 503 only when it cannot reach the backend at all.
      if (!res.ok) {
        setHealth("backend_down");
        return;
      }
      const data = await res.json().catch(() => null);
      const backendStatus: number | undefined = data?.status;
      const dbState: string | undefined = data?.response?.database;

      if (data?.success === false) {
        setHealth("backend_down");
      } else if (dbState === "disconnected" || (backendStatus ?? 200) >= 500) {
        // Backend answered, but reports its database is unreachable.
        setHealth("db_down");
      } else {
        setHealth("ok");
      }
    } catch {
      // fetch threw -> the frontend couldn't even reach its own API route.
      setHealth("backend_down");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  if (health === "checking" || health === "ok") return null;

  const message =
    health === "db_down"
      ? "Can't reach the database. Dashboard data may be missing or fail to load."
      : "Can't reach the API server. The dashboard can't load data right now.";

  const hint =
    health === "db_down"
      ? "Check the backend's DATABASE_URL / DATABASE_TYPE configuration."
      : "Check that the backend service is running and API_URL is set correctly.";

  return (
    <div
      role="alert"
      className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">{message}</div>
            <div className="text-sm text-muted-foreground">{hint}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Link href="/health">
            <Button variant="outline" size="sm">
              Diagnostics
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={check}
            disabled={checking}
            className="gap-2"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
