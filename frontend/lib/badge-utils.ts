/**
 * Badge utility functions for consistent badge styling
 * Provides helpers for status, priority, and severity badges
 */

import { statusColors } from './design-tokens';
import { cn } from './utils';

// Status types
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type FeatureStatus = 'discovery' | 'design' | 'development' | 'shipped' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'low_severity' | 'medium_severity' | 'high_severity';

// Badge variant types
export type BadgeVariant = 
  | 'default' 
  | 'secondary' 
  | 'destructive' 
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Get badge variant based on status
 */
export function getStatusBadgeVariant(status: TaskStatus | FeatureStatus): BadgeVariant {
  switch (status) {
    case 'done':
    case 'shipped':
      return 'success';
    case 'in_progress':
    case 'development':
      return 'info';
    case 'blocked':
      return 'destructive';
    case 'design':
      return 'warning';
    case 'discovery':
      return 'info';
    case 'archived':
      return 'secondary';
    case 'todo':
    default:
      return 'default';
  }
}

/**
 * Get badge variant based on priority
 */
export function getPriorityBadgeVariant(priority: Priority): BadgeVariant {
  switch (priority) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
}

/**
 * Get badge variant based on severity
 */
export function getSeverityBadgeVariant(severity: Severity): BadgeVariant {
  switch (severity) {
    case 'high_severity':
      return 'destructive';
    case 'medium_severity':
      return 'warning';
    case 'low_severity':
      return 'success';
    default:
      return 'default';
  }
}

/**
 * Get status color (for inline styles)
 */
export function getStatusColor(status: TaskStatus | FeatureStatus): string {
  const colorMap: Record<string, string> = {
    todo: `rgb(${statusColors.todo})`,
    in_progress: `rgb(${statusColors.in_progress})`,
    blocked: `rgb(${statusColors.blocked})`,
    done: `rgb(${statusColors.done})`,
    discovery: `rgb(${statusColors.discovery})`,
    design: `rgb(${statusColors.design})`,
    development: `rgb(${statusColors.development})`,
    shipped: `rgb(${statusColors.shipped})`,
    archived: `rgb(${statusColors.archived})`,
  };
  return colorMap[status] || colorMap.todo;
}

/**
 * Get priority color (for inline styles)
 */
export function getPriorityColor(priority: Priority): string {
  const colorMap: Record<Priority, string> = {
    low: `rgb(${statusColors.low})`,
    medium: `rgb(${statusColors.medium})`,
    high: `rgb(${statusColors.high})`,
    critical: `rgb(${statusColors.critical})`,
  };
  return colorMap[priority] || colorMap.low;
}

/**
 * Get severity color (for inline styles)
 */
export function getSeverityColor(severity: Severity): string {
  const colorMap: Record<Severity, string> = {
    low_severity: `rgb(${statusColors.low_severity})`,
    medium_severity: `rgb(${statusColors.medium_severity})`,
    high_severity: `rgb(${statusColors.high_severity})`,
  };
  return colorMap[severity] || colorMap.low_severity;
}

/**
 * Format status text for display
 */
export function formatStatus(status: TaskStatus | FeatureStatus): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format priority text for display
 */
export function formatPriority(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Format severity text for display
 */
export function formatSeverity(severity: Severity): string {
  return severity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get badge size classes
 */
export function getBadgeSizeClasses(size: BadgeSize = 'md'): string {
  const sizeMap = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };
  return sizeMap[size];
}

/**
 * Get badge variant classes (extended from shadcn/ui)
 */
export function getBadgeVariantClasses(variant: BadgeVariant = 'default'): string {
  const variantMap: Record<BadgeVariant, string> = {
    default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border-border',
    success: 'border-transparent bg-green-500 text-white hover:bg-green-600',
    warning: 'border-transparent bg-amber-500 text-white hover:bg-amber-600',
    info: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
  };
  return variantMap[variant];
}

/**
 * Get complete badge classes for a status
 */
export function getStatusBadgeClasses(
  status: TaskStatus | FeatureStatus,
  size: BadgeSize = 'md',
  className?: string
): string {
  const variant = getStatusBadgeVariant(status);
  return cn(
    'inline-flex items-center rounded-full border font-semibold transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    getBadgeVariantClasses(variant),
    getBadgeSizeClasses(size),
    className
  );
}

/**
 * Get complete badge classes for a priority
 */
export function getPriorityBadgeClasses(
  priority: Priority,
  size: BadgeSize = 'md',
  className?: string
): string {
  const variant = getPriorityBadgeVariant(priority);
  return cn(
    'inline-flex items-center rounded-full border font-semibold transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    getBadgeVariantClasses(variant),
    getBadgeSizeClasses(size),
    className
  );
}

/**
 * Get complete badge classes for a severity
 */
export function getSeverityBadgeClasses(
  severity: Severity,
  size: BadgeSize = 'md',
  className?: string
): string {
  const variant = getSeverityBadgeVariant(severity);
  return cn(
    'inline-flex items-center rounded-full border font-semibold transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    getBadgeVariantClasses(variant),
    getBadgeSizeClasses(size),
    className
  );
}

