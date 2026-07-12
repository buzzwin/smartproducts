"use client";

import { LayoutDashboard, Boxes, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "workspace" | "management" | "reports";

const items: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "workspace", label: "Workspace", icon: LayoutDashboard },
  { key: "management", label: "Manage", icon: Boxes },
  { key: "reports", label: "Reports", icon: BarChart3 },
];

interface MobileTabBarProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

/**
 * iOS-style fixed bottom tab bar for primary navigation.
 * Shown only on small screens; desktop keeps the top tab row.
 */
export default function MobileTabBar({ activeTab, onChange }: MobileTabBarProps) {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 backdrop-blur-lg safe-bottom"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around px-2 pt-1.5">
        {items.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  active ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
