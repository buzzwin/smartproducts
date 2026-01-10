"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { emailAgentAPI } from "@/lib/api";

interface ProcessingStatusProps {
  onProcess?: () => void;
}

export default function ProcessingStatus({ onProcess }: ProcessingStatusProps) {
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await emailAgentAPI.getDashboardStats();
      setStats(statsData);
      
      // Get last processed time from activity feed
      const activity = await emailAgentAPI.getActivityFeed(1);
      if (activity && activity.length > 0 && activity[0].processed_at) {
        setLastProcessed(activity[0].processed_at);
      }
    } catch (error) {
      console.error("Failed to load processing stats:", error);
    }
  };

  const handleProcess = async () => {
    if (processing) return;
    
    setProcessing(true);
    try {
      await emailAgentAPI.processEmails();
      await loadStats();
      if (onProcess) {
        onProcess();
      }
    } catch (error) {
      console.error("Failed to process emails:", error);
      alert("Failed to process emails. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!stats) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3 animate-pulse" />
        Loading...
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {lastProcessed ? (
          <>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Last: {new Date(lastProcessed).toLocaleTimeString()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(lastProcessed).toLocaleDateString()}
            </span>
          </>
        ) : (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Not processed yet
          </Badge>
        )}
      </div>
      <button
        onClick={handleProcess}
        disabled={processing}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        {processing ? (
          <>
            <RefreshCw className="h-3 w-3 inline mr-1 animate-spin" />
            Processing...
          </>
        ) : (
          "Process Now"
        )}
      </button>
    </div>
  );
}

