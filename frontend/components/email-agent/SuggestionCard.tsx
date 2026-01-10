"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Check, X, Edit, Mail, Link as LinkIcon, Trash2 } from "lucide-react";
import type { ProcessedEmail } from "@/types";

interface SuggestionCardProps {
  suggestion: ProcessedEmail;
  onView: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SuggestionCard({
  suggestion,
  onView,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: SuggestionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "approved":
      case "created":
      case "sent":
        return "default";
      case "rejected":
        return "destructive";
      case "correlated":
        return "outline";
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

  const borderColor =
    suggestion.status === "pending"
      ? "border-l-4 border-l-yellow-500"
      : suggestion.status === "approved" || suggestion.status === "created"
      ? "border-l-4 border-l-green-500"
      : suggestion.status === "rejected"
      ? "border-l-4 border-l-red-500"
      : suggestion.status === "sent"
      ? "border-l-4 border-l-purple-500"
      : "border-l-4 border-l-blue-500";

  return (
    <Card className={borderColor}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{suggestion.subject}</CardTitle>
              <Badge variant={getEntityTypeColor(suggestion.suggested_entity_type) as any}>
                {suggestion.suggested_entity_type}
              </Badge>
              <Badge variant={getStatusColor(suggestion.status) as any}>
                {suggestion.status}
              </Badge>
            </div>
            <CardDescription>
              From: {suggestion.from_email} • {new Date(suggestion.received_date).toLocaleString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestion.suggested_entity_type === "feature" && (
            <div className="text-sm">
              <strong>Feature:</strong> {suggestion.suggested_data.name || "N/A"}
              {suggestion.suggested_data.product_id && (
                <span className="text-muted-foreground ml-2">
                  • Product: {suggestion.suggested_data.product_id}
                </span>
              )}
            </div>
          )}
          {suggestion.suggested_entity_type === "task" && (
            <div className="text-sm">
              <strong>Task:</strong> {suggestion.suggested_data.title || "N/A"}
              {suggestion.suggested_data.priority && (
                <Badge variant="outline" className="ml-2">
                  {suggestion.suggested_data.priority}
                </Badge>
              )}
            </div>
          )}
          {suggestion.suggested_entity_type === "response" && (
            <div className="text-sm">
              <strong>Response:</strong>{" "}
              {(suggestion.suggested_data.suggested_response_text || "").substring(0, 100)}...
            </div>
          )}
          {suggestion.suggested_entity_type === "correlate_task" && (
            <div className="text-sm">
              <strong>Correlate to Task:</strong> {suggestion.correlated_task_id || "N/A"}
              {suggestion.suggested_data.confidence_score && (
                <Badge variant="outline" className="ml-2">
                  {(suggestion.suggested_data.confidence_score * 100).toFixed(0)}% match
                </Badge>
              )}
            </div>
          )}
          {suggestion.email_body && (
            <div className="mt-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-1">Email Content:</div>
              <div className="text-sm whitespace-pre-wrap max-h-24 overflow-y-auto bg-muted/30 p-2 rounded text-muted-foreground">
                {suggestion.email_body.substring(0, 200)}
                {suggestion.email_body.length > 200 && "..."}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {suggestion.status === "pending" && (
            <>
              {onApprove && (
                <Button size="sm" onClick={onApprove}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              {onReject && (
                <Button size="sm" variant="destructive" onClick={onReject}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              )}
              {onEdit && (
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </>
          )}
          {onDelete && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

