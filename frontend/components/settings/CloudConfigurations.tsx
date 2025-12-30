"use client";

import { useOrganization } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Plus,
  Settings,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { cloudConfigsAPI } from "@/lib/api";
import type { CloudConfig, CloudProvider } from "@/types";
import { AWSConfigForm } from "./AWSConfigForm";
import { AzureConfigForm } from "./AzureConfigForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CloudConfigurations() {
  const { organization, isLoaded } = useOrganization();
  const [configs, setConfigs] = useState<CloudConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<CloudProvider>("aws");
  const [showAWSForm, setShowAWSForm] = useState(false);
  const [showAzureForm, setShowAzureForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CloudConfig | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isLoaded && organization?.id) {
      loadConfigs();
    }
  }, [isLoaded, organization?.id]);

  const loadConfigs = async () => {
    if (!organization?.id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await cloudConfigsAPI.getAll(organization.id);
      setConfigs(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load cloud configurations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!organization?.id) return;
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
      await cloudConfigsAPI.delete(configId, organization.id);
      await loadConfigs();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete configuration"
      );
    }
  };

  const handleTest = async (configId: string) => {
    if (!organization?.id) return;

    try {
      const result = await cloudConfigsAPI.test(configId, organization.id);
      alert(result.message);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to test configuration"
      );
    }
  };

  const handleActivate = async (configId: string) => {
    if (!organization?.id) return;

    try {
      await cloudConfigsAPI.activate(configId, organization.id);
      await loadConfigs();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to activate configuration"
      );
    }
  };

  const handleDeactivate = async (configId: string) => {
    if (!organization?.id) return;

    try {
      await cloudConfigsAPI.deactivate(configId, organization.id);
      await loadConfigs();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to deactivate configuration"
      );
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            Please create or select an organization first.
          </div>
        </CardContent>
      </Card>
    );
  }

  const awsConfigs = configs.filter((c) => c.provider === "aws");
  const azureConfigs = configs.filter((c) => c.provider === "azure");
  const gcpConfigs = configs.filter((c) => c.provider === "gcp");

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Cloud configurations allow you to sync cost data from your cloud
                providers. Configure your credentials below to enable automatic
                cost tracking.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="ml-4"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Get Help
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeProvider}
        onValueChange={(v) => setActiveProvider(v as CloudProvider)}
      >
        <TabsList>
          <TabsTrigger value="aws">AWS</TabsTrigger>
          <TabsTrigger value="azure">Azure</TabsTrigger>
          <TabsTrigger value="gcp" disabled>
            GCP (Coming Soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aws" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">AWS Configurations</h3>
            <Button
              onClick={() => {
                setEditingConfig(null);
                setShowAWSForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-red-600 dark:text-red-400">{error}</div>
              </CardContent>
            </Card>
          ) : awsConfigs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No AWS configurations yet. Click 'Add Configuration' to get
                  started.
                </p>
                <Button variant="outline" onClick={() => setShowHelp(true)}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Need help? See our guide on setting up AWS credentials.
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {awsConfigs.map((config) => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {config.name}
                          {config.is_active && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {config.region && `Region: ${config.region}`}
                          {config.account_id &&
                            ` • Account/Subscription: ${config.account_id}`}
                          <span className="text-xs text-muted-foreground ml-2">
                            (Multiple active configs allowed)
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {config.last_sync_status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {config.last_sync_status === "error" && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {config.last_sync_status === "pending" && (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {config.last_synced_at && (
                        <p className="text-sm text-muted-foreground">
                          Last synced:{" "}
                          {new Date(config.last_synced_at).toLocaleString()}
                        </p>
                      )}
                      {config.last_sync_error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Error: {config.last_sync_error}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(config.id)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingConfig(config);
                            setShowAWSForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        {config.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(config.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(config.id)}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="azure" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Azure Configurations</h3>
            <Button
              onClick={() => {
                setEditingConfig(null);
                setShowAzureForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-red-600 dark:text-red-400">{error}</div>
              </CardContent>
            </Card>
          ) : azureConfigs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No Azure configurations yet. Click 'Add Configuration' to get
                  started.
                </p>
                <Button variant="outline" onClick={() => setShowHelp(true)}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Need help? See our guide on setting up Azure credentials.
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {azureConfigs.map((config) => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {config.name}
                          {config.is_active && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {config.region && `Region: ${config.region}`}
                          {config.account_id &&
                            ` • Subscription: ${config.account_id}`}
                          <span className="text-xs text-muted-foreground ml-2">
                            (Multiple active configs allowed)
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {config.last_sync_status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {config.last_sync_status === "error" && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {config.last_sync_status === "pending" && (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {config.last_synced_at && (
                        <p className="text-sm text-muted-foreground">
                          Last synced:{" "}
                          {new Date(config.last_synced_at).toLocaleString()}
                        </p>
                      )}
                      {config.last_sync_error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Error: {config.last_sync_error}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(config.id)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingConfig(config);
                            setShowAzureForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        {config.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(config.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(config.id)}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AWS Config Form Modal */}
      {showAWSForm && (
        <AWSConfigForm
          organizationId={organization.id}
          config={editingConfig}
          onClose={() => {
            setShowAWSForm(false);
            setEditingConfig(null);
          }}
          onSuccess={() => {
            setShowAWSForm(false);
            setEditingConfig(null);
            loadConfigs();
          }}
        />
      )}

      {/* Azure Config Form Modal */}
      {showAzureForm && (
        <AzureConfigForm
          organizationId={organization.id}
          config={editingConfig}
          onClose={() => {
            setShowAzureForm(false);
            setEditingConfig(null);
          }}
          onSuccess={() => {
            setShowAzureForm(false);
            setEditingConfig(null);
            loadConfigs();
          }}
        />
      )}

      {/* Help Modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Complete Guide: Syncing {activeProvider.toUpperCase()} Costs to
              Your Product
            </DialogTitle>
            <DialogDescription>
              Step-by-step instructions for pulling{" "}
              {activeProvider.toUpperCase()} costs and creating cost records
            </DialogDescription>
          </DialogHeader>
          {activeProvider === "azure" ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  📋 Azure Credential Setup Guide
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  For detailed step-by-step instructions on setting up Azure
                  credentials, see our comprehensive guide:
                </p>
                <div className="mt-3">
                  <a
                    href="/docs/AZURE_CREDENTIAL_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    View Full Azure Credential Setup Guide →
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    (Opens in new tab)
                  </p>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-4">
                  The guide covers:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200 ml-2">
                  <li>Creating Service Principal in Azure AD</li>
                  <li>Setting up client secrets</li>
                  <li>Granting Cost Management Reader permissions</li>
                  <li>Obtaining subscription and tenant IDs</li>
                  <li>Troubleshooting common issues</li>
                  <li>Security best practices</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Quick Overview</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Create App Registration in Azure AD → Note Client ID and
                    Tenant ID
                  </li>
                  <li>
                    Create Client Secret → Copy immediately (only shown once)
                  </li>
                  <li>
                    Grant "Cost Management Reader" role to Service Principal on
                    subscription
                  </li>
                  <li>Get Subscription ID from Azure Portal</li>
                  <li>
                    Enter all credentials in this form and test connection
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  📋 Complete Workflow Overview
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Follow these steps to pull AWS costs and create cost records
                  in your product:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li>
                    <strong>Set up AWS credentials</strong> (this page) -
                    Configure your AWS access keys
                  </li>
                  <li>
                    <strong>Go to your Product</strong> - Navigate to the
                    product where you want to track costs
                  </li>
                  <li>
                    <strong>Open Costs tab</strong> - Click on the "Costs" tab
                    in the product view
                  </li>
                  <li>
                    <strong>Click "Sync Cloud Costs"</strong> - Use the button
                    to open the sync dialog
                  </li>
                  <li>
                    <strong>Select configuration and date range</strong> -
                    Choose which costs to import
                  </li>
                  <li>
                    <strong>Preview (optional)</strong> - Review costs before
                    importing
                  </li>
                  <li>
                    <strong>Sync costs</strong> - Import costs as cost records
                    in your product
                  </li>
                  <li>
                    <strong>View and manage</strong> - Edit, categorize, and
                    link synced costs
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-3">
                  Step 1: Set Up AWS Credentials
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">
                      1.1 Create IAM User in AWS
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                      <li>
                        Sign in to{" "}
                        <a
                          href="https://console.aws.amazon.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          AWS Management Console
                        </a>
                      </li>
                      <li>
                        Navigate to <strong>IAM → Users</strong>
                      </li>
                      <li>
                        Click <strong>"Create user"</strong> or select an
                        existing user
                      </li>
                      <li>
                        For new users: Enter username and select "Provide access
                        to AWS services"
                      </li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium mb-1">
                      1.2 Attach Cost Explorer Permissions
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                      <li>
                        In the user's <strong>Permissions</strong> tab, click
                        "Attach policies directly"
                      </li>
                      <li>
                        Search for <strong>"CostExplorer"</strong> or create a
                        custom policy with these permissions:
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ce:GetCostAndUsage",
      "ce:GetDimensionValues",
      "ce:GetService"
    ],
    "Resource": "*"
  }]
}`}
                        </pre>
                      </li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium mb-1">1.3 Generate Access Keys</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                      <li>
                        Go to the user's <strong>Security credentials</strong>{" "}
                        tab
                      </li>
                      <li>
                        Scroll to <strong>"Access keys"</strong> section
                      </li>
                      <li>
                        Click <strong>"Create access key"</strong>
                      </li>
                      <li>
                        Select{" "}
                        <strong>"Application running outside AWS"</strong> as
                        use case
                      </li>
                      <li>
                        <strong className="text-red-600 dark:text-red-400">
                          Important:
                        </strong>{" "}
                        Copy both Access Key ID and Secret Access Key
                        immediately (Secret Key is only shown once!)
                      </li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium mb-1">
                      1.4 Enter Credentials Here
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                      <li>
                        Click <strong>"Add Configuration"</strong> button above
                      </li>
                      <li>
                        Enter a name for this configuration (e.g., "Production
                        AWS Account")
                      </li>
                      <li>
                        Paste your <strong>Access Key ID</strong> and{" "}
                        <strong>Secret Access Key</strong>
                      </li>
                      <li>
                        Select your AWS <strong>Region</strong> (e.g.,
                        us-east-1)
                      </li>
                      <li>
                        (Optional) Enter your 12-digit{" "}
                        <strong>AWS Account ID</strong>
                      </li>
                      <li>
                        Click <strong>"Test Connection"</strong> to verify
                        credentials work
                      </li>
                      <li>
                        Click <strong>"Save Configuration"</strong>
                      </li>
                      <li>
                        Activate the configuration if you want it to be the
                        default
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">
                  Step 2: Sync Costs to Your Product
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Once your AWS configuration is set up and active:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      Navigate to your <strong>Product</strong> in the
                      application
                    </li>
                    <li>
                      Click on the <strong>"Costs"</strong> tab
                    </li>
                    <li>
                      Click the <strong>"Sync Cloud Costs"</strong> button (next
                      to "Add Cost")
                    </li>
                    <li>
                      In the sync dialog:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>
                          Select your <strong>Cloud Provider</strong> (AWS)
                        </li>
                        <li>
                          Choose your{" "}
                          <strong>active cloud configuration</strong>
                        </li>
                        <li>
                          Set the <strong>date range</strong> for costs
                          (defaults to last month)
                        </li>
                        <li>
                          (Optional) Click <strong>"Preview"</strong> to see
                          what will be imported
                        </li>
                        <li>
                          Click <strong>"Sync Costs"</strong> to import
                        </li>
                      </ul>
                    </li>
                    <li>
                      Wait for the sync to complete - you'll see a summary of
                      created/updated costs
                    </li>
                    <li>
                      View your synced costs in the Costs tab alongside manually
                      entered costs
                    </li>
                  </ol>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">
                  What Happens When You Sync?
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    Each AWS service (EC2, S3, RDS, etc.) becomes a separate{" "}
                    <strong>cost record</strong>
                  </li>
                  <li>
                    Costs are automatically <strong>categorized</strong>{" "}
                    (hardware, software, database, etc.)
                  </li>
                  <li>
                    Costs are linked to your <strong>product</strong> (and
                    optionally to a specific module)
                  </li>
                  <li>
                    Duplicate costs are <strong>detected and updated</strong> if
                    amounts changed
                  </li>
                  <li>
                    All costs appear in your <strong>Costs tab</strong> for
                    viewing and management
                  </li>
                  <li>
                    You can <strong>edit, categorize, and link</strong> synced
                    costs just like manual costs
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Security Best Practices</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    Always use <strong>IAM users</strong> (never root account
                    credentials)
                  </li>
                  <li>
                    Grant <strong>minimum required permissions</strong> (Cost
                    Explorer read-only)
                  </li>
                  <li>
                    <strong>Rotate access keys</strong> regularly (every 90 days
                    recommended)
                  </li>
                  <li>
                    Never share credentials or commit them to version control
                  </li>
                  <li>
                    Use separate IAM users for different
                    applications/environments
                  </li>
                  <li>Monitor IAM user activity in AWS CloudTrail</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Troubleshooting</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">Invalid credentials error:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li>
                        Check that Access Key ID starts with "AKIA" or "ASIA"
                      </li>
                      <li>
                        Verify Secret Access Key is complete (20+ characters)
                      </li>
                      <li>
                        Ensure you copied the keys correctly (no extra spaces)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Access denied error:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li>Verify IAM policy is attached to the user</li>
                      <li>
                        Check that policy includes Cost Explorer permissions
                      </li>
                      <li>Ensure user has "ce:GetCostAndUsage" permission</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">No costs found:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li>Verify the date range has costs in AWS</li>
                      <li>
                        Check AWS Cost Explorer directly to confirm data exists
                      </li>
                      <li>
                        Ensure Cost Explorer is enabled in your AWS account
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                  💡 Pro Tips
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-800 dark:text-green-200">
                  <li>
                    Sync costs <strong>monthly</strong> to keep your data up to
                    date
                  </li>
                  <li>
                    Use <strong>Preview</strong> before syncing large date
                    ranges
                  </li>
                  <li>
                    Costs are auto-categorized, but you can{" "}
                    <strong>edit them</strong> after import
                  </li>
                  <li>
                    Link synced costs to{" "}
                    <strong>features, tasks, or resources</strong> for better
                    tracking
                  </li>
                  <li>
                    Use <strong>filters</strong> in the Costs tab to find
                    specific synced costs
                  </li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
