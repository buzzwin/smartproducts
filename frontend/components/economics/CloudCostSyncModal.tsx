"use client";

import { useOrganization } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Cloud,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { cloudConfigsAPI, awsCostsAPI, azureCostsAPI } from "@/lib/api";
import type { CloudConfig, CloudProvider, Cost } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface CloudCostSyncModalProps {
  productId: string;
  moduleId?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AccountSyncTabProps {
  config: CloudConfig;
  provider: CloudProvider;
  startDate: string;
  endDate: string;
  moduleId?: string;
  productId: string;
  organizationId: string;
  previewData: Cost[];
  isPreviewing: boolean;
  isSyncing: boolean;
  syncResult?: {
    created_count: number;
    updated_count: number;
    skipped_count: number;
    errors: string[];
  };
  error?: string;
  onPreview: () => void;
  onSync: () => void;
}

function AccountSyncTab({
  config,
  provider,
  startDate,
  endDate,
  previewData,
  isPreviewing,
  isSyncing,
  syncResult,
  error,
  onPreview,
  onSync,
}: AccountSyncTabProps) {
  const hasPreview = previewData.length > 0;
  const hasSyncResult = !!syncResult;

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{config.name}</h3>
            <p className="text-sm text-muted-foreground">
              {provider.toUpperCase()}
              {config.region && ` • ${config.region}`}
              {config.account_id && ` • ${config.account_id}`}
              {config.is_active && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Active
                </Badge>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Preview Section */}
      {hasPreview && (
        <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              📋 Preview: {previewData.length} cost
              {previewData.length !== 1 ? "s" : ""} will be created
            </h4>
            <Badge variant="outline" className="bg-white dark:bg-gray-800">
              Review before syncing
            </Badge>
          </div>

          {/* Summary */}
          <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-semibold text-lg">
                  {previewData[0]?.currency || "USD"}{" "}
                  {previewData
                    .reduce((sum, cost) => sum + (cost.amount || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Costs</p>
                <p className="font-semibold">{previewData.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date Range</p>
                <p className="font-semibold">
                  {startDate && endDate
                    ? `${new Date(startDate).toLocaleDateString()} - ${new Date(
                        endDate
                      ).toLocaleDateString()}`
                    : "Last month"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-semibold">{provider.toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-96 border rounded bg-white dark:bg-gray-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Classification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((cost, index) => (
                  <TableRow key={cost.id || `preview-${index}`}>
                    <TableCell className="font-medium">
                      {cost.name?.replace(/^(AWS|Azure) - /, "") || cost.name}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {cost.currency || "USD"}{" "}
                        {cost.amount?.toFixed(2) || "0.00"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {cost.scope || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>{cost.category || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {cost.cost_type || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cost.cost_classification === "run"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {cost.cost_classification === "run"
                          ? "Run/KTLO"
                          : cost.cost_classification === "change"
                          ? "Change/Growth"
                          : "N/A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-sm">
            <p className="text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> This preview shows what will be created
              when you sync. You can edit, categorize, and link these costs
              after they're imported.
            </p>
          </div>
        </div>
      )}

      {/* Empty State Message */}
      {!hasPreview && !hasSyncResult && !isPreviewing && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                No preview data yet
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Click "Preview" to see what costs will be imported from this
                account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {hasSyncResult && (
        <div className="p-4 rounded-lg border">
          <div className="flex gap-2 items-center mb-2">
            {syncResult.errors.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            <h4 className="font-semibold">Sync Complete</h4>
          </div>
          <div className="space-y-1 text-sm">
            <p>Created: {syncResult.created_count}</p>
            <p>Updated: {syncResult.updated_count}</p>
            <p>Skipped: {syncResult.skipped_count}</p>
            {syncResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  Errors:
                </p>
                <ul className="list-disc list-inside">
                  {syncResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx} className="text-xs">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={isPreviewing || isSyncing || !startDate || !endDate}
        >
          {isPreviewing ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Previewing...
            </>
          ) : (
            "Preview"
          )}
        </Button>
        <Button
          type="button"
          onClick={onSync}
          disabled={isSyncing || isPreviewing || !hasPreview}
          variant={!hasPreview ? "outline" : "default"}
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : !hasPreview ? (
            "Preview First"
          ) : (
            "Sync Costs"
          )}
        </Button>
      </div>
    </div>
  );
}

export function CloudCostSyncModal({
  productId,
  moduleId,
  open,
  onClose,
  onSuccess,
}: CloudCostSyncModalProps) {
  const { organization, isLoaded } = useOrganization();
  const [awsConfigs, setAwsConfigs] = useState<CloudConfig[]>([]);
  const [azureConfigs, setAzureConfigs] = useState<CloudConfig[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  // Track preview data per config
  const [previewData, setPreviewData] = useState<Record<string, Cost[]>>({});
  // Track previewing state per config
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});
  // Track syncing state per config
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  // Track sync results per config
  const [syncResults, setSyncResults] = useState<
    Record<
      string,
      {
        created_count: number;
        updated_count: number;
        skipped_count: number;
        errors: string[];
      }
    >
  >({});
  // Track errors per config
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Set default date range (last month)
  useEffect(() => {
    if (open && !startDate && !endDate) {
      const today = new Date();
      const firstDayCurrent = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      const lastDayLastMonth = new Date(firstDayCurrent.getTime() - 1);
      const firstDayLastMonth = new Date(
        lastDayLastMonth.getFullYear(),
        lastDayLastMonth.getMonth(),
        1
      );

      setStartDate(firstDayLastMonth.toISOString().split("T")[0]);
      setEndDate(firstDayCurrent.toISOString().split("T")[0]);
    }
  }, [open, startDate, endDate]);

  // Load all cloud configs when modal opens
  useEffect(() => {
    if (isLoaded && organization?.id && open) {
      loadAllConfigs();
    }
  }, [isLoaded, organization?.id, open]);

  const loadAllConfigs = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Load both AWS and Azure configs
      const [awsData, azureData] = await Promise.all([
        cloudConfigsAPI.getAll(organization.id, "aws"),
        cloudConfigsAPI.getAll(organization.id, "azure"),
      ]);
      setAwsConfigs(awsData);
      setAzureConfigs(azureData);
    } catch (err) {
      console.error("Failed to load configurations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (configId: string, provider: CloudProvider) => {
    if (!organization?.id) {
      alert("Organization not loaded");
      return;
    }

    setPreviewing((prev) => ({ ...prev, [configId]: true }));
    setErrors((prev) => ({ ...prev, [configId]: "" }));
    setPreviewData((prev) => ({ ...prev, [configId]: [] }));

    try {
      const previewOptions = {
        moduleId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      let result;
      if (provider === "aws") {
        result = await awsCostsAPI.preview(
          organization.id,
          productId,
          configId,
          previewOptions
        );
      } else if (provider === "azure") {
        result = await azureCostsAPI.preview(
          organization.id,
          productId,
          configId,
          previewOptions
        );
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      setPreviewData((prev) => ({ ...prev, [configId]: result.costs || [] }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to preview costs";
      setErrors((prev) => ({ ...prev, [configId]: errorMessage }));
      setPreviewData((prev) => ({ ...prev, [configId]: [] }));
    } finally {
      setPreviewing((prev) => ({ ...prev, [configId]: false }));
    }
  };

  const handleSync = async (configId: string, provider: CloudProvider) => {
    if (!organization?.id) {
      alert("Organization not loaded");
      return;
    }

    setSyncing((prev) => ({ ...prev, [configId]: true }));
    setErrors((prev) => ({ ...prev, [configId]: "" }));

    try {
      const syncOptions = {
        moduleId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      let result;
      if (provider === "aws") {
        result = await awsCostsAPI.sync(
          organization.id,
          productId,
          configId,
          syncOptions
        );
      } else if (provider === "azure") {
        result = await azureCostsAPI.sync(
          organization.id,
          productId,
          configId,
          syncOptions
        );
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      setSyncResults((prev) => ({ ...prev, [configId]: result }));

      if (result.errors.length === 0) {
        // Refresh the page data after successful sync
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sync costs";
      setErrors((prev) => ({ ...prev, [configId]: errorMessage }));
    } finally {
      setSyncing((prev) => ({ ...prev, [configId]: false }));
    }
  };

  if (!isLoaded || !organization) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Cloud className="w-5 h-5" />
            Sync Cloud Costs
          </DialogTitle>
          <DialogDescription>
            Import cost data from your cloud provider into this product
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Help Section */}
          <Accordion
            type="single"
            collapsible
            className="w-full rounded-lg border"
          >
            <AccordionItem value="help" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex gap-2 items-center">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">
                    How to Sync AWS Costs - Step by Step Guide
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="mb-2 font-semibold">
                      Step 1: Set Up AWS Credentials
                    </h4>
                    <p className="mb-2 text-muted-foreground">
                      Before you can sync costs, you need to configure your AWS
                      credentials:
                    </p>
                    <ol className="ml-2 space-y-1 list-decimal list-inside text-muted-foreground">
                      <li>
                        Go to{" "}
                        <strong>Organization → Cloud Configurations</strong>
                      </li>
                      <li>
                        Click <strong>"Add Configuration"</strong> for AWS
                      </li>
                      <li>
                        Follow the instructions to create an IAM user with Cost
                        Explorer permissions
                      </li>
                      <li>Enter your Access Key ID and Secret Access Key</li>
                      <li>Test the connection to verify credentials work</li>
                      <li>Save and activate the configuration</li>
                    </ol>
                    <Link
                      href="/organization?tab=cloud-configs"
                      className="inline-flex gap-1 items-center mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Go to Cloud Configurations{" "}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold">
                      Step 2: Select Configuration and Date Range
                    </h4>
                    <p className="mb-2 text-muted-foreground">
                      In this dialog:
                    </p>
                    <ul className="ml-2 space-y-1 list-disc list-inside text-muted-foreground">
                      <li>
                        Select your <strong>Cloud Provider</strong> (AWS)
                      </li>
                      <li>
                        Choose an <strong>active cloud configuration</strong>
                      </li>
                      <li>
                        Set the <strong>date range</strong> for costs you want
                        to import (defaults to last month)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold">
                      Step 3: Preview Costs (Optional)
                    </h4>
                    <p className="mb-2 text-muted-foreground">
                      Click <strong>"Preview"</strong> to see what costs will be
                      imported before syncing:
                    </p>
                    <ul className="ml-2 space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Shows up to 10 cost items that will be created</li>
                      <li>
                        Displays service name, amount, category, and cost type
                      </li>
                      <li>Helps you verify the data looks correct</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold">Step 4: Sync Costs</h4>
                    <p className="mb-2 text-muted-foreground">
                      Click <strong>"Sync Costs"</strong> to import the costs:
                    </p>
                    <ul className="ml-2 space-y-1 list-disc list-inside text-muted-foreground">
                      <li>
                        Costs are automatically mapped to appropriate categories
                        (hardware, software, database, etc.)
                      </li>
                      <li>
                        Duplicate costs are detected and updated if amounts
                        changed
                      </li>
                      <li>Each AWS service becomes a separate cost record</li>
                      <li>
                        Costs are linked to this product (and optionally to a
                        module)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold">
                      Step 5: View and Manage Synced Costs
                    </h4>
                    <p className="mb-2 text-muted-foreground">
                      After syncing, you can:
                    </p>
                    <ul className="ml-2 space-y-1 list-disc list-inside text-muted-foreground">
                      <li>
                        View all costs in the <strong>Costs tab</strong> of this
                        product
                      </li>
                      <li>Edit cost details, classifications, or categories</li>
                      <li>Link costs to features, tasks, or resources</li>
                      <li>
                        Filter by classification (Run/KTLO vs Change/Growth)
                      </li>
                      <li>View cost breakdowns and summaries</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <p className="mb-1 text-sm font-semibold text-blue-900 dark:text-blue-100">
                      💡 Tips:
                    </p>
                    <ul className="space-y-1 text-xs list-disc list-inside text-blue-800 dark:text-blue-200">
                      <li>Sync costs monthly to keep your data up to date</li>
                      <li>
                        Use Preview to verify data before importing large date
                        ranges
                      </li>
                      <li>
                        Costs are automatically categorized, but you can edit
                        them after import
                      </li>
                      <li>
                        Synced costs appear alongside manually entered costs
                      </li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          {/* Date Range - Shared across all accounts */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Clear all previews when date changes
                  setPreviewData({});
                  setSyncResults({});
                }}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  // Clear all previews when date changes
                  setPreviewData({});
                  setSyncResults({});
                }}
              />
            </div>
          </div>

          {/* Account Tabs */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading configurations...</span>
            </div>
          ) : awsConfigs.length === 0 && azureConfigs.length === 0 ? (
            <div className="p-6 text-center border rounded-lg">
              <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No cloud configurations found. Go to Organization → Cloud
                Configurations to set up AWS or Azure accounts.
              </p>
              <Link
                href="/organization?tab=cloud-configs"
                className="inline-flex gap-1 items-center text-blue-600 dark:text-blue-400 hover:underline"
              >
                Go to Cloud Configurations <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <Tabs
              defaultValue={
                awsConfigs.length > 0
                  ? `aws-${awsConfigs[0].id}`
                  : `azure-${azureConfigs[0].id}`
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-auto gap-2 h-auto p-1 overflow-x-auto">
                {awsConfigs.map((config) => (
                  <TabsTrigger
                    key={`aws-${config.id}`}
                    value={`aws-${config.id}`}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="font-semibold">AWS</span>
                    <span className="truncate max-w-[120px]">
                      {config.name}
                    </span>
                    {config.is_active && (
                      <Badge variant="outline" className="text-xs px-1">
                        Active
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
                {azureConfigs.map((config) => (
                  <TabsTrigger
                    key={`azure-${config.id}`}
                    value={`azure-${config.id}`}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="font-semibold">Azure</span>
                    <span className="truncate max-w-[120px]">
                      {config.name}
                    </span>
                    {config.is_active && (
                      <Badge variant="outline" className="text-xs px-1">
                        Active
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* AWS Account Tabs */}
              {awsConfigs.map((config) => (
                <TabsContent
                  key={`aws-${config.id}`}
                  value={`aws-${config.id}`}
                  className="mt-4 space-y-4"
                >
                  <AccountSyncTab
                    config={config}
                    provider="aws"
                    startDate={startDate}
                    endDate={endDate}
                    moduleId={moduleId}
                    productId={productId}
                    organizationId={organization?.id || ""}
                    previewData={previewData[config.id] || []}
                    isPreviewing={previewing[config.id] || false}
                    isSyncing={syncing[config.id] || false}
                    syncResult={syncResults[config.id]}
                    error={errors[config.id]}
                    onPreview={() => handlePreview(config.id, "aws")}
                    onSync={() => handleSync(config.id, "aws")}
                  />
                </TabsContent>
              ))}

              {/* Azure Account Tabs */}
              {azureConfigs.map((config) => (
                <TabsContent
                  key={`azure-${config.id}`}
                  value={`azure-${config.id}`}
                  className="mt-4 space-y-4"
                >
                  <AccountSyncTab
                    config={config}
                    provider="azure"
                    startDate={startDate}
                    endDate={endDate}
                    moduleId={moduleId}
                    productId={productId}
                    organizationId={organization?.id || ""}
                    previewData={previewData[config.id] || []}
                    isPreviewing={previewing[config.id] || false}
                    isSyncing={syncing[config.id] || false}
                    syncResult={syncResults[config.id]}
                    error={errors[config.id]}
                    onPreview={() => handlePreview(config.id, "azure")}
                    onSync={() => handleSync(config.id, "azure")}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
