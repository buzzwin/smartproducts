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
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { cloudConfigsAPI, awsCostsAPI } from "@/lib/api";
import type { CloudConfig, CloudProvider, Cost } from "@/types";
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
import Link from "next/link";

interface CloudCostSyncModalProps {
  productId: string;
  moduleId?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CloudCostSyncModal({
  productId,
  moduleId,
  open,
  onClose,
  onSuccess,
}: CloudCostSyncModalProps) {
  const { organization, isLoaded } = useOrganization();
  const [provider, setProvider] = useState<CloudProvider>("aws");
  const [configs, setConfigs] = useState<CloudConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [previewData, setPreviewData] = useState<Cost[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    created_count: number;
    updated_count: number;
    skipped_count: number;
    errors: string[];
  } | null>(null);

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

  // Load cloud configs when provider changes
  useEffect(() => {
    if (isLoaded && organization?.id && open) {
      loadConfigs();
    }
  }, [isLoaded, organization?.id, provider, open]);

  const loadConfigs = async () => {
    if (!organization?.id) return;

    try {
      const data = await cloudConfigsAPI.getAll(organization.id, provider);
      // Show all configs for the provider, not just active ones
      // User can select any config they want to use
      setConfigs(data);
      if (data.length > 0 && !selectedConfigId) {
        // Prefer active config if available, otherwise use first one
        const activeConfig = data.find((c) => c.is_active);
        setSelectedConfigId(activeConfig ? activeConfig.id : data[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load configurations"
      );
    }
  };

  const handlePreview = async () => {
    if (!organization?.id || !selectedConfigId) {
      alert("Please select a cloud configuration");
      return;
    }

    setPreviewing(true);
    setError(null);
    setPreviewData(null);

    try {
      const result = await awsCostsAPI.preview(
        organization.id,
        productId,
        selectedConfigId,
        {
          moduleId,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }
      );
      // Preview API returns AWSCostSyncResponse with costs array
      setPreviewData(result.costs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview costs");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSync = async () => {
    if (!organization?.id || !selectedConfigId) {
      alert("Please select a cloud configuration");
      return;
    }

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await awsCostsAPI.sync(
        organization.id,
        productId,
        selectedConfigId,
        {
          moduleId,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }
      );
      setSyncResult(result);
      if (result.errors.length === 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync costs");
    } finally {
      setSyncing(false);
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
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <Label htmlFor="provider">Cloud Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v as CloudProvider);
                setSelectedConfigId("");
                setPreviewData(null);
              }}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws">AWS</SelectItem>
                <SelectItem value="azure" disabled>
                  Azure (Coming Soon)
                </SelectItem>
                <SelectItem value="gcp" disabled>
                  GCP (Coming Soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configuration Selection */}
          <div>
            <Label htmlFor="config">Cloud Configuration *</Label>
            <Select
              value={selectedConfigId}
              onValueChange={setSelectedConfigId}
            >
              <SelectTrigger id="config">
                <SelectValue placeholder="Select a configuration" />
              </SelectTrigger>
              <SelectContent>
                {configs.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No {provider.toUpperCase()} configurations found
                  </div>
                ) : (
                  configs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name} {config.region && `(${config.region})`}{" "}
                      {config.is_active && "✓"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {configs.length === 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Go to Organization → Cloud Configurations to set up a
                configuration. Make sure the configuration is for the{" "}
                {provider.toUpperCase()} provider.
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Preview Section */}
          {previewData && (
            <div className="p-4 rounded-lg border">
              <h4 className="mb-2 font-semibold">
                Preview ({previewData.length} costs)
              </h4>
              <div className="overflow-y-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((cost) => (
                      <TableRow key={cost.id || cost.name}>
                        <TableCell>{cost.name}</TableCell>
                        <TableCell>
                          {cost.currency} {cost.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{cost.category}</TableCell>
                        <TableCell>{cost.cost_type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.length > 10 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    ... and {previewData.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={previewing || !selectedConfigId || syncing}
            >
              {previewing ? (
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
              onClick={handleSync}
              disabled={syncing || !selectedConfigId || previewing}
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Costs"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
