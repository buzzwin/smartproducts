import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { TaskStatus, FeatureStatus, Priority, Severity, BadgeSize } from "@/lib/badge-utils"
import {
  getStatusBadgeClasses,
  getPriorityBadgeClasses,
  getSeverityBadgeClasses,
  formatStatus,
  formatPriority,
  formatSeverity,
} from "@/lib/badge-utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  // Status badge props
  status?: TaskStatus | FeatureStatus;
  // Priority badge props
  priority?: Priority;
  // Severity badge props
  severity?: Severity;
  // Custom size override
  badgeSize?: BadgeSize;
}

function Badge({ 
  className, 
  variant, 
  size,
  status,
  priority,
  severity,
  badgeSize,
  children,
  ...props 
}: BadgeProps) {
  // If status is provided, use status badge styling
  if (status) {
    return (
      <div
        className={getStatusBadgeClasses(status, badgeSize || size || 'md', className)}
        {...props}
      >
        {children || formatStatus(status)}
      </div>
    )
  }

  // If priority is provided, use priority badge styling
  if (priority) {
    return (
      <div
        className={getPriorityBadgeClasses(priority, badgeSize || size || 'md', className)}
        {...props}
      >
        {children || formatPriority(priority)}
      </div>
    )
  }

  // If severity is provided, use severity badge styling
  if (severity) {
    return (
      <div
        className={getSeverityBadgeClasses(severity, badgeSize || size || 'md', className)}
        {...props}
      >
        {children || formatSeverity(severity)}
      </div>
    )
  }

  // Default badge with variant
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
