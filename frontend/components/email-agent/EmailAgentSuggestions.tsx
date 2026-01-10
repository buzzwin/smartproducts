"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, RefreshCw, Filter, Trash2 } from "lucide-react";
import { emailAgentAPI } from "@/lib/api";
import type { ProcessedEmail } from "@/types";
import SuggestionCard from "./SuggestionCard";
import SuggestionDetailModal from "./SuggestionDetailModal";
import GmailAuthStatus from "./GmailAuthStatus";

interface EmailAgentSuggestionsProps {
  onUpdate?: () => void;
}

export default function EmailAgentSuggestions({ onUpdate }: EmailAgentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProcessedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProcessedEmail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sinceDate, setSinceDate] = useState<string>("");
  const [maxEmails, setMaxEmails] = useState<number>(20);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    loadSuggestions();
    checkAuth();
  }, [filterStatus, filterEntityType]);

  const checkAuth = async () => {
    try {
      const authStatus = await emailAgentAPI.checkGmailAuth();
      setIsAuthenticated(authStatus.authenticated || false);
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setIsAuthenticated(false);
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const status = filterStatus !== "all" ? filterStatus : undefined;
      const entityType = filterEntityType !== "all" ? filterEntityType : undefined;
      const data = await emailAgentAPI.getSuggestions(status, entityType, 100);
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessEmails = async () => {
    setProcessing(true);
    try {
      const dateParam = sinceDate ? new Date(sinceDate) : undefined;
      await emailAgentAPI.processEmails(maxEmails, dateParam);
      await loadSuggestions();
      if (onUpdate) onUpdate();
      // Clear the date after processing
      setSinceDate("");
    } catch (error) {
      console.error("Failed to process emails:", error);
      alert("Failed to process emails. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleView = (suggestion: ProcessedEmail) => {
    setSelectedSuggestion(suggestion);
    setShowDetailModal(true);
  };

  const handleApprove = async (suggestion: ProcessedEmail) => {
    try {
      await emailAgentAPI.approveSuggestion(suggestion.id);
      await loadSuggestions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to approve suggestion:", error);
      alert("Failed to approve suggestion. Please try again.");
    }
  };

  const handleReject = async (suggestion: ProcessedEmail) => {
    if (!confirm("Are you sure you want to reject this suggestion?")) {
      return;
    }
    try {
      await emailAgentAPI.rejectSuggestion(suggestion.id);
      await loadSuggestions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to reject suggestion:", error);
      alert("Failed to reject suggestion. Please try again.");
    }
  };

  const handleDelete = async (suggestion: ProcessedEmail) => {
    if (!confirm("Are you sure you want to delete this suggestion? This action cannot be undone.")) {
      return;
    }
    try {
      await emailAgentAPI.deleteSuggestion(suggestion.id);
      await loadSuggestions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to delete suggestion:", error);
      alert("Failed to delete suggestion. Please try again.");
    }
  };

  const handleDetailClose = () => {
    setShowDetailModal(false);
    setSelectedSuggestion(null);
    loadSuggestions();
    if (onUpdate) onUpdate();
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterEntityType !== "all" && s.suggested_entity_type !== filterEntityType) return false;
    return true;
  });

  const stats = {
    total: suggestions.length,
    pending: suggestions.filter((s) => s.status === "pending").length,
    features: suggestions.filter((s) => s.suggested_entity_type === "feature").length,
    tasks: suggestions.filter((s) => s.suggested_entity_type === "task").length,
    responses: suggestions.filter((s) => s.suggested_entity_type === "response").length,
    correlated: suggestions.filter((s) => s.suggested_entity_type === "correlate_task").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email AI Suggestions</h2>
          <p className="text-muted-foreground mt-1">
            Review and manage AI-generated suggestions from emails
          </p>
        </div>
        <div className="flex items-center gap-4">
          <GmailAuthStatus onRefresh={() => { loadSuggestions(); checkAuth(); }} />
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="since-date-suggestions" className="text-xs">Process from date (optional)</Label>
              <Input
                id="since-date-suggestions"
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-40"
                placeholder="Select date"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="max-emails-suggestions" className="text-xs">Max emails</Label>
              <Input
                id="max-emails-suggestions"
                type="number"
                min="1"
                max="50"
                value={maxEmails}
                onChange={(e) => setMaxEmails(parseInt(e.target.value) || 20)}
                className="w-24"
              />
            </div>
            <Button onClick={handleProcessEmails} disabled={processing} className="mt-6">
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Process Emails Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.features}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Correlated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.correlated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="created">Created</option>
            <option value="correlated">Correlated</option>
            <option value="sent">Sent</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Type:</span>
          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="feature">Feature</option>
            <option value="task">Task</option>
            <option value="response">Response</option>
            <option value="correlate_task">Correlate</option>
          </select>
        </div>
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="text-center py-8">Loading suggestions...</div>
      ) : filteredSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No suggestions found. Process emails to generate suggestions.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onView={() => handleView(suggestion)}
              onApprove={
                suggestion.status === "pending"
                  ? () => handleApprove(suggestion)
                  : undefined
              }
              onReject={
                suggestion.status === "pending"
                  ? () => handleReject(suggestion)
                  : undefined
              }
              onEdit={
                suggestion.status === "pending"
                  ? () => handleView(suggestion)
                  : undefined
              }
              onDelete={() => handleDelete(suggestion)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSuggestion && (
        <SuggestionDetailModal
          suggestion={selectedSuggestion}
          isOpen={showDetailModal}
          onClose={handleDetailClose}
          onUpdate={loadSuggestions}
        />
      )}
    </div>
  );
}

