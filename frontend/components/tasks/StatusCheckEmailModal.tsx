"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Modal from "../Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tasksAPI, resourcesAPI } from "@/lib/api";
import type { Resource } from "@/types";
import { Send, Loader2, Mail } from "lucide-react";

interface StatusCheckEmailModalProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export default function StatusCheckEmailModal({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  onSent,
}: StatusCheckEmailModalProps) {
  const { user } = useUser();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [resourceEmail, setResourceEmail] = useState<string>("");
  const [resourceName, setResourceName] = useState<string>("");
  const [ccEmails, setCcEmails] = useState<string>("");
  const [selectedCcResources, setSelectedCcResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadResources();
      // Reset form
      setSelectedResourceId("");
      setResourceEmail("");
      setResourceName("");
      setCcEmails("");
      setSelectedCcResources([]);
      setEmailSubject("");
      setEmailBody("");
    }
  }, [isOpen]);

  const loadResources = async () => {
    try {
      const data = await resourcesAPI.getAll();
      setResources(data || []);
    } catch (error) {
      console.error("Failed to load resources:", error);
      alert("Failed to load resources");
    }
  };

  const handleResourceSelect = (resourceId: string) => {
    setSelectedResourceId(resourceId);
    const resource = resources.find((r) => r.id === resourceId);
    if (resource) {
      setResourceEmail(resource.email || "");
      setResourceName(resource.name || "");
    }
  };

  const handleCcResourceToggle = (resourceId: string) => {
    setSelectedCcResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const ccPreview = [
    ...(ccEmails ? ccEmails.split(",").map((e) => e.trim()) : []),
    ...selectedCcResources
      .map((id) => {
        const resource = resources.find((r) => r.id === id);
        return resource?.email;
      })
      .filter((email): email is string => !!email),
  ].join(", ");

  const handleGenerateEmail = async () => {
    if (!resourceEmail) {
      alert("Please select a resource or enter an email address");
      return;
    }

    setGenerating(true);
    try {
      // Get user's name from Clerk
      const userName =
        user?.fullName ||
        user?.firstName ||
        user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
        "User";

      const response = await tasksAPI.generateStatusEmail(taskId, {
        resource_id: selectedResourceId || undefined,
        resource_email: resourceEmail,
        resource_name: resourceName,
        user_name: userName,
      });

      setEmailSubject(response.subject);
      setEmailBody(response.body);
    } catch (error: any) {
      console.error("Failed to generate email:", error);
      alert(error.message || "Failed to generate email");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!resourceEmail || !emailSubject || !emailBody) {
      alert("Please generate the email first");
      return;
    }

    setSending(true);
    try {
      await tasksAPI.sendStatusEmail(taskId, {
        to_email: resourceEmail,
        subject: emailSubject,
        body: emailBody,
        cc: ccPreview || undefined,
      });

      alert("Status check email sent successfully");
      onSent?.();
      onClose();
    } catch (error: any) {
      console.error("Failed to send email:", error);
      alert(error.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Status Check Email"
    >
      <div className="space-y-6">
        {/* Resource Selection */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="resource-select">Select Resource</Label>
            <Select
              value={selectedResourceId || undefined}
              onValueChange={handleResourceSelect}
            >
              <SelectTrigger id="resource-select" className="mt-1">
                <SelectValue placeholder="Select a resource" />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {resources
                  .filter((r) => r.email)
                  .map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name} ({resource.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="resource-email">Or Enter Email Address</Label>
            <Input
              id="resource-email"
              type="email"
              value={resourceEmail}
              onChange={(e) => setResourceEmail(e.target.value)}
              placeholder="email@example.com"
              className="mt-1"
            />
          </div>

          {resourceEmail && (
            <div>
              <Label htmlFor="resource-name">Resource Name</Label>
              <Input
                id="resource-name"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="Name (optional)"
                className="mt-1"
              />
            </div>
          )}

          {/* CC Section */}
          <div className="space-y-2">
            <Label>CC Recipients</Label>
            <Input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="mt-1"
            />

            {resources.filter((r) => r.email).length > 0 && (
              <div className="mt-2 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Or select from resources:
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-2 border rounded p-2">
                  {resources
                    .filter((r) => r.email && r.id !== selectedResourceId)
                    .map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`cc-${resource.id}`}
                          checked={selectedCcResources.includes(resource.id)}
                          onChange={() =>
                            handleCcResourceToggle(resource.id)
                          }
                          className="rounded"
                        />
                        <label
                          htmlFor={`cc-${resource.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {resource.name} ({resource.email})
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {ccPreview && (
              <div className="text-sm text-muted-foreground mt-1">
                CC: {ccPreview}
              </div>
            )}
          </div>
        </div>

        {/* Generate Email Button */}
        <div>
          <Button
            onClick={handleGenerateEmail}
            disabled={generating || !resourceEmail}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Generate Email
              </>
            )}
          </Button>
        </div>

        {/* Email Preview */}
        {emailSubject && emailBody && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-1 font-semibold"
              />
            </div>

            <div>
              <Label>To</Label>
              <Input
                value={`${resourceName} <${resourceEmail}>`}
                disabled
                className="mt-1 bg-muted"
              />
            </div>

            {ccPreview && (
              <div>
                <Label>CC</Label>
                <Input
                  value={ccPreview}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            )}

            <div>
              <Label>Email Body</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={12}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendEmail}
                disabled={sending}
                className="flex-1"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

