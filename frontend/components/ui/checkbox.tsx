import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// Simple checkbox component that doesn't require @radix-ui/react-checkbox
const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="relative inline-flex items-center">
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground appearance-none",
        className
      )}
      {...props}
    />
    <Check className="absolute h-4 w-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-primary-foreground" />
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }

