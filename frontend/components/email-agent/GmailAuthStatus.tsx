"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { emailAgentAPI } from "@/lib/api";

interface GmailAuthStatusProps {
  onRefresh?: () => void;
}

export default function GmailAuthStatus({ onRefresh }: GmailAuthStatusProps) {
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    token_expires_at?: string;
    needs_refresh?: boolean;
    has_refresh_token?: boolean;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    // Check every 5 minutes if token expires soon
    const interval = setInterval(() => {
      if (authStatus?.needs_refresh) {
        checkAuthStatus();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authStatus?.needs_refresh]);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const status = await emailAgentAPI.checkGmailAuth();
      setAuthStatus(status);
    } catch (error) {
      setAuthStatus({
        authenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await emailAgentAPI.refreshGmailToken();
      setAuthStatus(result);
      if (result.authenticated && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      setAuthStatus({
        authenticated: false,
        error: error instanceof Error ? error.message : "Failed to refresh token",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !authStatus) {
    return <Badge variant="outline">Checking...</Badge>;
  }

  const isAuthenticated = authStatus?.authenticated ?? false;
  const needsRefresh = authStatus?.needs_refresh ?? false;
  const hasError = !!authStatus?.error;

  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let icon = <Clock className="h-3 w-3" />;
  let text = "Unknown";

  if (hasError) {
    badgeVariant = "destructive";
    icon = <AlertCircle className="h-3 w-3" />;
    text = "Error";
  } else if (isAuthenticated && !needsRefresh) {
    badgeVariant = "default";
    icon = <CheckCircle2 className="h-3 w-3" />;
    text = "Connected";
  } else if (isAuthenticated && needsRefresh) {
    badgeVariant = "secondary";
    icon = <Clock className="h-3 w-3" />;
    text = "Expires Soon";
  } else {
    badgeVariant = "destructive";
    icon = <AlertCircle className="h-3 w-3" />;
    text = "Not Connected";
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={badgeVariant} className="flex items-center gap-1">
        {icon}
        {text}
      </Badge>
      {authStatus?.token_expires_at && (
        <span className="text-xs text-muted-foreground">
          Expires: {new Date(authStatus.token_expires_at).toLocaleString()}
        </span>
      )}
      {(needsRefresh || !isAuthenticated) && authStatus?.has_refresh_token && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Token
        </Button>
      )}
      {authStatus?.error && (
        <span className="text-xs text-destructive">{authStatus.error}</span>
      )}
    </div>
  );
}

