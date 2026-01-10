"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Star,
  StarOff,
  Loader2
} from "lucide-react";
import { emailAccountsAPI } from "@/lib/api";
import type { EmailAccount } from "@/types";

interface EmailAccountManagerProps {
  onAccountUpdate?: () => void;
}

export default function EmailAccountManager({ onAccountUpdate }: EmailAccountManagerProps) {
  const { user, isLoaded } = useUser();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user?.id) {
      loadAccounts();
    }
  }, [isLoaded, user?.id]);

  const loadAccounts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await emailAccountsAPI.getAll(user.id);
      setAccounts(data);
      if (onAccountUpdate) {
        onAccountUpdate();
      }
    } catch (error) {
      console.error("Failed to load email accounts:", error);
      alert("Failed to load email accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!user?.id || !accountName.trim()) {
      alert("Please enter an account name");
      return;
    }

    setAdding(true);
    try {
      const response = await emailAccountsAPI.create(user.id, accountName.trim());
      // Store account_id in sessionStorage for callback
      sessionStorage.setItem('oauth_account_id', response.account_id);
      sessionStorage.setItem('oauth_state', response.state);
      // Redirect to OAuth URL
      window.location.href = response.oauth_url;
    } catch (error) {
      console.error("Failed to initiate OAuth:", error);
      alert("Failed to initiate OAuth flow. Please try again.");
      setAdding(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!user?.id) return;
    
    if (!confirm("Are you sure you want to delete this email account? This action cannot be undone.")) {
      return;
    }

    setDeleting(accountId);
    try {
      await emailAccountsAPI.delete(accountId, user.id);
      await loadAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Failed to delete account. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!user?.id) return;

    setSettingDefault(accountId);
    try {
      await emailAccountsAPI.setDefault(accountId, user.id);
      await loadAccounts();
    } catch (error) {
      console.error("Failed to set default account:", error);
      alert("Failed to set default account. Please try again.");
    } finally {
      setSettingDefault(null);
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    if (!user?.id) return;

    setRefreshing(accountId);
    try {
      await emailAccountsAPI.refreshToken(accountId, user.id);
      await loadAccounts();
    } catch (error) {
      console.error("Failed to refresh token:", error);
      alert("Failed to refresh token. Please try again.");
    } finally {
      setRefreshing(null);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Accounts</CardTitle>
          <CardDescription>Manage your Gmail accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user?.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Accounts</CardTitle>
          <CardDescription>Manage your Gmail accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please sign in to manage email accounts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Accounts</CardTitle>
            <CardDescription>Manage your Gmail accounts for email processing</CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant={showAddForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="account-name">Account Name</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="account-name"
                placeholder="e.g., Work Email, Personal Email"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddAccount();
                  }
                }}
              />
              <Button onClick={handleAddAccount} disabled={adding || !accountName.trim()}>
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setAccountName("");
                }}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You will be redirected to Google to authorize access to your Gmail account.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No email accounts configured. Add an account to start processing emails.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    {account.is_default ? (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.name}</p>
                      {account.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      {account.is_active ? (
                        <Badge variant="default" className="text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{account.email}</p>
                    {account.last_authenticated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last authenticated: {new Date(account.last_authenticated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.is_default && account.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(account.id)}
                      disabled={settingDefault === account.id}
                      title="Set as default"
                    >
                      {settingDefault === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRefreshToken(account.id)}
                    disabled={refreshing === account.id}
                    title="Refresh token"
                  >
                    {refreshing === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(account.id)}
                    disabled={deleting === account.id}
                    title="Delete account"
                  >
                    {deleting === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

