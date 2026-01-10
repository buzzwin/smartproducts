"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, RefreshCw, CheckCircle, XCircle, MessageSquare, Link as LinkIcon, Clock, Trash2, Eye, Filter, Send, MessageSquarePlus } from "lucide-react";
import { emailAgentAPI, emailAccountsAPI } from "@/lib/api";
import type { ProcessedEmail, EmailAccount } from "@/types";
import GmailAuthStatus from "./GmailAuthStatus";
import SuggestionDetailModal from "./SuggestionDetailModal";
import EmailAccountManager from "./EmailAccountManager";

export default function EmailControlStation() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<any>(null);
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountManager, setShowAccountManager] = useState(false);
  // Default to today's date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const [sinceDate, setSinceDate] = useState<string>(getTodayDate());
  const [maxEmails, setMaxEmails] = useState<number>(20);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user?.id) {
      loadAccounts();
      handleOAuthCallback();
    }
  }, [isLoaded, user?.id]);

  useEffect(() => {
    loadData();
    checkAuth();
  }, [filterStatus, filterEntityType]);

  useEffect(() => {
    // Set default account when accounts are loaded
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAccount = accounts.find(a => a.is_default && a.is_active);
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      } else {
        // Use first active account if no default
        const firstActive = accounts.find(a => a.is_active);
        if (firstActive) {
          setSelectedAccountId(firstActive.id);
        }
      }
    }
  }, [accounts, selectedAccountId]);

  const loadAccounts = async () => {
    if (!user?.id) return;
    
    try {
      const data = await emailAccountsAPI.getAll(user.id);
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load email accounts:", error);
    }
  };

  const handleOAuthCallback = async () => {
    const oauthCallback = searchParams?.get('oauth_callback');
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    
    if (oauthCallback === 'true' && code && state && user?.id) {
      try {
        // Get account_id from sessionStorage (stored during OAuth initiation)
        const accountId = sessionStorage.getItem('oauth_account_id');
        const storedState = sessionStorage.getItem('oauth_state');
        
        if (accountId && storedState === state) {
          // Complete OAuth flow
          await emailAccountsAPI.oauthCallback(accountId, user.id, code, state);
          
          // Clean up sessionStorage
          sessionStorage.removeItem('oauth_account_id');
          sessionStorage.removeItem('oauth_state');
          
          // Reload accounts
          await loadAccounts();
          
          // Remove query params from URL
          window.history.replaceState({}, '', window.location.pathname);
          
          alert("Email account connected successfully!");
        } else {
          alert("OAuth callback failed: Invalid state or missing account ID");
        }
      } catch (error) {
        console.error("Failed to complete OAuth:", error);
        alert("Failed to complete OAuth flow. Please try again.");
      }
    }
  };

  const checkAuth = async () => {
    try {
      const authStatus = await emailAgentAPI.checkGmailAuth();
      setIsAuthenticated(authStatus.authenticated || false);
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setIsAuthenticated(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, emailsData] = await Promise.all([
        emailAgentAPI.getDashboardStats(),
        emailAgentAPI.getSuggestions(
          filterStatus !== "all" ? filterStatus : undefined,
          filterEntityType !== "all" ? filterEntityType : undefined,
          100 // Max limit supported by backend
        )
      ]);
      setStats(statsData);
      // Sort emails by received date, newest first
      const sortedEmails = [...emailsData].sort((a, b) => 
        new Date(b.received_date).getTime() - new Date(a.received_date).getTime()
      );
      setEmails(sortedEmails);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessEmails = async () => {
    if (!user?.id) {
      alert("Please sign in to process emails.");
      return;
    }

    setProcessing(true);
    try {
      const dateParam = sinceDate ? new Date(sinceDate) : new Date(getTodayDate());
      await emailAgentAPI.processEmails(maxEmails, dateParam, user.id, selectedAccountId || undefined);
      await loadData();
      // Keep the date set to today after processing
    } catch (error) {
      console.error("Failed to process emails:", error);
      alert("Failed to process emails. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleView = (email: ProcessedEmail) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this email? This action cannot be undone.")) {
      return;
    }

    setDeleting(id);
    try {
      await emailAgentAPI.deleteSuggestion(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete email:", error);
      alert("Failed to delete email. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleDetailClose = () => {
    setShowDetailModal(false);
    setSelectedEmail(null);
    loadData();
  };

  const handleQuickRespond = (email: ProcessedEmail) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
    // The modal will handle showing the response interface
  };

  const handleQuickCorrelate = (email: ProcessedEmail) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
    // The modal will handle showing the correlate interface
  };

  const handleQuickCommentOrStatus = (email: ProcessedEmail) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
    // The modal will handle showing the comment/status interface
  };

  // Filter all emails (no tabs, show everything)
  const filteredEmails = emails.filter((email) => {
    if (filterStatus !== "all" && email.status !== filterStatus) return false;
    if (filterEntityType !== "all" && email.suggested_entity_type !== filterEntityType) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "created":
      case "sent":
      case "correlated":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "default";
      case "task":
        return "secondary";
      case "response":
        return "outline";
      case "correlate_task":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Account Manager */}
      <EmailAccountManager onAccountUpdate={loadAccounts} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Control Station</h1>
          <p className="text-muted-foreground mt-1">
            Manage email processing and AI suggestions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <GmailAuthStatus onRefresh={() => { loadData(); checkAuth(); }} />
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="email-account" className="text-xs">Email Account</Label>
                <Select
                  value={selectedAccountId || ""}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger id="email-account" className="w-48">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(a => a.is_active)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            {account.is_default && <span className="text-yellow-500">★</span>}
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground">({account.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label htmlFor="since-date" className="text-xs">Process from date</Label>
              <Input
                id="since-date"
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="max-emails" className="text-xs">Max emails</Label>
              <Input
                id="max-emails"
                type="number"
                min="1"
                max="50"
                value={maxEmails}
                onChange={(e) => setMaxEmails(parseInt(e.target.value) || 20)}
                className="w-24"
              />
            </div>
            <Button
              onClick={handleProcessEmails}
              disabled={processing}
              className="mt-6"
            >
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
      {loading ? (
        <div className="text-center py-8">Loading stats...</div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_emails || 0}</div>
              <p className="text-xs text-muted-foreground">Processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_suggestions || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Correlated</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.correlated_count || 0}</div>
              <p className="text-xs text-muted-foreground">Linked to tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.created_features || 0) + (stats.created_tasks || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.created_features || 0} features, {stats.created_tasks || 0} tasks
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-2 py-1 bg-background"
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
            className="border rounded px-2 py-1 bg-background"
          >
            <option value="all">All</option>
            <option value="response">Response</option>
            <option value="feature">Feature</option>
            <option value="task">Task</option>
            <option value="correlate_task">Correlate</option>
          </select>
        </div>
      </div>

      {/* Email Inbox */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Inbox
          </CardTitle>
          <CardDescription>
            Click on any email to view details and take action
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading emails...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No emails found. Process emails to get started.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEmails.map((email) => {
                const isPending = email.status === "pending";
                const isUnread = isPending;
                return (
                  <div
                    key={email.id}
                    onClick={() => handleView(email)}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all
                      ${isUnread ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' : 'hover:bg-muted/50'}
                      ${selectedEmail?.id === email.id ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {isUnread && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                          <span className={`font-semibold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {email.from_email}
                          </span>
                          <Badge variant={getEntityTypeColor(email.suggested_entity_type) as any} className="text-xs">
                            {email.suggested_entity_type}
                          </Badge>
                          <Badge variant={getStatusColor(email.status) as any} className="text-xs">
                            {email.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(email.received_date).toLocaleDateString()} {new Date(email.received_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-medium mb-1 line-clamp-1">
                          {email.subject || "(No subject)"}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {email.email_body ? email.email_body.substring(0, 150) : "No preview available"}
                          {email.email_body && email.email_body.length > 150 ? "..." : ""}
                        </div>
                        {(email.suggested_entity_type === "feature" && email.suggested_data && typeof email.suggested_data === 'object' && 'name' in email.suggested_data) && (
                          <div className="text-xs mt-1 text-muted-foreground">
                            <strong>Feature:</strong> {email.suggested_data.name}
                          </div>
                        )}
                        {(email.suggested_entity_type === "task" && email.suggested_data && typeof email.suggested_data === 'object' && 'title' in email.suggested_data) && (
                          <div className="text-xs mt-1 text-muted-foreground">
                            <strong>Task:</strong> {email.suggested_data.title}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Quick Actions */}
                        {/* Respond button - available for all email types */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickRespond(email);
                          }}
                          className="h-8 text-xs"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Respond
                        </Button>
                        {(email.suggested_entity_type === "task" || email.suggested_entity_type === "feature" || email.suggested_entity_type === "correlate_task") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickCorrelate(email);
                              }}
                              className="h-8 text-xs"
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Correlate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickCommentOrStatus(email);
                              }}
                              className="h-8 text-xs"
                            >
                              <MessageSquarePlus className="h-3 w-3 mr-1" />
                              Comment/Status
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(email.id);
                          }}
                          disabled={deleting === email.id}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deleting === email.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedEmail && (
        <SuggestionDetailModal
          suggestion={selectedEmail}
          isOpen={showDetailModal}
          onClose={handleDetailClose}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
