"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, User, MessageSquare, Calendar } from "lucide-react";
import type { TaskComment } from "@/types";
import { tasksAPI } from "@/lib/api";

interface TaskCommentsViewProps {
  taskId: string;
  onUpdate?: () => void;
}

export default function TaskCommentsView({ taskId, onUpdate }: TaskCommentsViewProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>("all");

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const task = await tasksAPI.getById(taskId);
      const sortedComments = (task.comments || []).sort((a: TaskComment, b: TaskComment) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Newest first
      });
      setComments(sortedComments);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onUpdate) {
      onUpdate();
    }
  }, [comments, onUpdate]);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "email":
        return <Badge variant="default" className="text-xs">Email</Badge>;
      case "manual":
        return <Badge variant="secondary" className="text-xs">Manual</Badge>;
      case "system":
        return <Badge variant="outline" className="text-xs">System</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{source}</Badge>;
    }
  };

  const filteredComments = filterSource === "all" 
    ? comments 
    : comments.filter(c => c.source === filterSource);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="all">All Sources</option>
              <option value="email">Email</option>
              <option value="manual">Manual</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            {filterSource === "all" 
              ? "No comments yet." 
              : `No ${filterSource} comments.`}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`border rounded-lg p-3 ${
                  comment.source === "email" 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {comment.source === "email" ? (
                      <Mail className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">
                      {comment.author || "Unknown"}
                    </span>
                    {getSourceBadge(comment.source || "manual")}
                    {comment.email_id && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap">{comment.text}</div>
                {comment.email_subject && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <strong>Subject:</strong> {comment.email_subject}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

