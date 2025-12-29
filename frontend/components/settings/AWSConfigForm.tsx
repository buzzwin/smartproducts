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
import type { CloudConfig, AWSCloudConfigCreate } from "@/types";
// Tooltip temporarily disabled - install @radix-ui/react-tooltip to enable
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '@/components/ui/tooltip';

const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "sa-east-1",
  "ca-central-1",
];

interface AWSConfigFormProps {
  organizationId: string;
  config?: CloudConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AWSConfigForm({
  organizationId,
  config,
  onClose,
  onSuccess,
}: AWSConfigFormProps) {
  const [name, setName] = useState(config?.name || "");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState(config?.region || "us-east-1");
  const [accountId, setAccountId] = useState(config?.account_id || "");
  const [isActive, setIsActive] = useState(config?.is_active || false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const configData: AWSCloudConfigCreate = {
        name,
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        region,
        account_id: accountId || undefined,
        is_active: isActive,
      };

      if (config) {
        await cloudConfigsAPI.update(config.id, organizationId, {
          provider: "aws",
          ...configData,
        });
      } else {
        await cloudConfigsAPI.create(organizationId, {
          provider: "aws",
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
    if (!accessKeyId || !secretAccessKey) {
      alert("Please enter access key ID and secret access key to test");
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
          provider: "aws",
          name: `Test-${Date.now()}`,
          access_key_id: accessKeyId,
          secret_access_key: secretAccessKey,
          region,
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
            {config ? "Edit AWS Configuration" : "Add AWS Configuration"}
          </DialogTitle>
          <DialogDescription>
            Configure AWS credentials to sync cost data from AWS Cost Explorer
          </DialogDescription>
        </DialogHeader>

        {/* Help Section */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="help">
            <AccordionTrigger className="text-sm font-medium">
              📖 How to Get AWS Credentials
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Sign in to AWS Management Console
                    (https://console.aws.amazon.com)
                  </li>
                  <li>Navigate to IAM service → Users</li>
                  <li>Click "Create user" or select existing user</li>
                  <li>
                    For new user: Enter username, select "Provide access to AWS
                    services"
                  </li>
                  <li>
                    Attach policy: Click "Attach policies directly" → Search for
                    "CostExplorer" or create custom policy
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="policy">
                        <AccordionTrigger className="text-xs">
                          Show IAM Policy JSON
                        </AccordionTrigger>
                        <AccordionContent>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetDimensionValues",
        "ce:GetService"
      ],
      "Resource": "*"
    }
  ]
}`}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </li>
                  <li>Complete user creation</li>
                  <li>Select the user → Go to "Security credentials" tab</li>
                  <li>
                    Scroll to "Access keys" section → Click "Create access key"
                  </li>
                  <li>Select "Application running outside AWS" as use case</li>
                  <li>
                    Copy the Access Key ID and Secret Access Key immediately
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Secret Access Key is only shown once
                    </span>
                  </li>
                  <li>Paste credentials into this form</li>
                </ol>
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                  <p className="text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold">
                      Store credentials securely. Secret Access Key is only
                      shown once.
                    </span>
                  </p>
                </div>
                <a
                  href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  AWS IAM Documentation →
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
              placeholder="e.g., Production AWS Account"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="accessKeyId">Access Key ID *</Label>
              <div title="Starts with 'AKIA' or 'ASIA'. Found in IAM → Users → Security credentials → Access keys">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Input
              id="accessKeyId"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AKIA..."
              required
              pattern="^(AKIA|ASIA)[A-Z0-9]{16}$"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="secretAccessKey">Secret Access Key *</Label>
              <div title="20+ character string. Only shown once when created. If lost, create a new access key.">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Sensitive
              </span>
            </div>
            <Input
              id="secretAccessKey"
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="Enter secret access key"
              required
              minLength={20}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="region">Region *</Label>
              <div title="AWS region where your resources are located. Cost Explorer data is global, but region helps with API calls.">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Select value={region} onValueChange={setRegion} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AWS_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="accountId">Account ID (Optional)</Label>
              <div title="Your 12-digit AWS account ID. Optional but helps identify the account. Found in top-right corner of AWS Console.">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Input
              id="accountId"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="123456789012"
              pattern="[0-9]{12}"
            />
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
              disabled={testing || !accessKeyId || !secretAccessKey}
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
