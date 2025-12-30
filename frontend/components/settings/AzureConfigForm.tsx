"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cloudConfigsAPI } from "@/lib/api";
import type { CloudConfig, AzureCloudConfigCreate } from "@/types";

const AZURE_REGIONS = [
  { value: "eastus", label: "East US" },
  { value: "eastus2", label: "East US 2" },
  { value: "westus", label: "West US" },
  { value: "westus2", label: "West US 2" },
  { value: "centralus", label: "Central US" },
  { value: "northcentralus", label: "North Central US" },
  { value: "southcentralus", label: "South Central US" },
  { value: "westcentralus", label: "West Central US" },
  { value: "canadacentral", label: "Canada Central" },
  { value: "canadaeast", label: "Canada East" },
  { value: "brazilsouth", label: "Brazil South" },
  { value: "northeurope", label: "North Europe" },
  { value: "westeurope", label: "West Europe" },
  { value: "uksouth", label: "UK South" },
  { value: "ukwest", label: "UK West" },
  { value: "francecentral", label: "France Central" },
  { value: "francesouth", label: "France South" },
  { value: "germanywestcentral", label: "Germany West Central" },
  { value: "norwayeast", label: "Norway East" },
  { value: "switzerlandnorth", label: "Switzerland North" },
  { value: "southeastasia", label: "Southeast Asia" },
  { value: "eastasia", label: "East Asia" },
  { value: "australiaeast", label: "Australia East" },
  { value: "australiasoutheast", label: "Australia Southeast" },
  { value: "japaneast", label: "Japan East" },
  { value: "japanwest", label: "Japan West" },
  { value: "koreacentral", label: "Korea Central" },
  { value: "koreasouth", label: "Korea South" },
  { value: "southafricanorth", label: "South Africa North" },
  { value: "uaenorth", label: "UAE North" },
];

interface AzureConfigFormProps {
  organizationId: string;
  config?: CloudConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AzureConfigForm({
  organizationId,
  config,
  onClose,
  onSuccess,
}: AzureConfigFormProps) {
  const [name, setName] = useState(config?.name || "");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [region, setRegion] = useState(config?.region || "");
  const [isActive, setIsActive] = useState(config?.is_active || false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const configData: AzureCloudConfigCreate = {
        name,
        subscription_id: subscriptionId,
        client_id: clientId,
        client_secret: clientSecret,
        tenant_id: tenantId,
        region: region || undefined,
        is_active: isActive,
      };

      if (config) {
        await cloudConfigsAPI.update(config.id, organizationId, {
          provider: "azure",
          ...configData,
        });
      } else {
        await cloudConfigsAPI.create(organizationId, {
          provider: "azure",
          ...configData,
        });
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!subscriptionId || !clientId || !clientSecret || !tenantId) {
      alert("Please enter all required credentials to test");
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // If editing existing config, test it directly
      if (config) {
        const result = await cloudConfigsAPI.test(config.id, organizationId);
        alert(result.message);
      } else {
        // For new configs, create a temporary config to test
        const tempConfig = await cloudConfigsAPI.create(organizationId, {
          provider: "azure",
          name: `Test-${Date.now()}`,
          subscription_id: subscriptionId,
          client_id: clientId,
          client_secret: clientSecret,
          tenant_id: tenantId,
          region: region || undefined,
          is_active: false,
        });

        try {
          const result = await cloudConfigsAPI.test(
            tempConfig.id,
            organizationId
          );
          alert(result.message);
        } finally {
          // Always delete the temporary config
          await cloudConfigsAPI
            .delete(tempConfig.id, organizationId)
            .catch(() => {
              // Ignore errors when deleting temp config
            });
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to test credentials"
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {config ? "Edit Azure Configuration" : "Add Azure Configuration"}
          </DialogTitle>
          <DialogDescription>
            Configure Azure Service Principal credentials to sync cost data from Azure Cost Management
          </DialogDescription>
        </DialogHeader>

        {/* Help Section */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="help">
            <AccordionTrigger className="text-sm font-medium">
              📖 How to Get Azure Credentials
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Sign in to Azure Portal (https://portal.azure.com)
                  </li>
                  <li>
                    Navigate to <strong>Azure Active Directory</strong> →{" "}
                    <strong>App registrations</strong>
                  </li>
                  <li>Click <strong>"New registration"</strong></li>
                  <li>
                    Enter a name (e.g., "Cost Management Service Principal"),
                    select supported account types, and click{" "}
                    <strong>"Register"</strong>
                  </li>
                  <li>
                    After registration, note the <strong>Application (client) ID</strong>{" "}
                    and <strong>Directory (tenant) ID</strong> from the Overview page
                  </li>
                  <li>
                    Go to <strong>"Certificates & secrets"</strong> → Click{" "}
                    <strong>"New client secret"</strong>
                  </li>
                  <li>
                    Enter a description, set expiration, and click{" "}
                    <strong>"Add"</strong>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Copy the secret value immediately - it's only shown once
                    </span>
                  </li>
                  <li>
                    Go to <strong>Subscriptions</strong> → Select your subscription →
                    <strong> Access control (IAM)</strong>
                  </li>
                  <li>
                    Click <strong>"Add"</strong> → <strong>"Add role assignment"</strong>
                  </li>
                  <li>
                    Select role: <strong>"Cost Management Reader"</strong> (or create
                    custom role with <code>Microsoft.CostManagement/*/read</code>{" "}
                    permissions)
                  </li>
                  <li>
                    Click <strong>"Next"</strong> → Select <strong>"User, group, or service principal"</strong>
                  </li>
                  <li>
                    Click <strong>"Select members"</strong> → Search for your app
                    registration name → Select it → <strong>"Select"</strong>
                  </li>
                  <li>Click <strong>"Review + assign"</strong> → <strong>"Review + assign"</strong></li>
                  <li>
                    Find your <strong>Subscription ID</strong> in the Subscriptions
                    page (copy the Subscription ID GUID)
                  </li>
                  <li>Enter all credentials in this form</li>
                </ol>
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                  <p className="text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold">
                      Store credentials securely. Client secret is only shown once.
                    </span>
                  </p>
                </div>
                <a
                  href="https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Azure Service Principal Documentation →
                </a>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Azure Subscription"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="subscriptionId">Subscription ID *</Label>
              <div title="GUID found in Azure Portal → Subscriptions → Your subscription">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Input
              id="subscriptionId"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="tenantId">Tenant ID *</Label>
              <div title="Directory (tenant) ID from App registration Overview page">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Input
              id="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="clientId">Client ID (Application ID) *</Label>
              <div title="Application (client) ID from App registration Overview page">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="clientSecret">Client Secret *</Label>
              <div title="Secret value from App registration → Certificates & secrets. Only shown once when created.">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Sensitive
              </span>
            </div>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter client secret"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="region">Region (Optional)</Label>
              <div title="Azure region. Optional but helps identify the region for your resources.">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select a region (optional)" />
              </SelectTrigger>
              <SelectContent>
                {AZURE_REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Set as active configuration
            </Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !subscriptionId || !clientId || !clientSecret || !tenantId}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

