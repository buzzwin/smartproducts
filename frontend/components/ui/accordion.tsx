"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  type: "single" | "multiple";
  collapsible: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(
  null
);

interface AccordionProps {
  type?: "single" | "multiple";
  collapsible?: boolean;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "single",
      collapsible = false,
      value: controlledValue,
      onValueChange,
      defaultValue,
      children,
      className,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<
      string | undefined
    >(defaultValue);
    const value =
      controlledValue !== undefined ? controlledValue : internalValue;
    const handleValueChange = React.useCallback(
      (newValue: string | undefined) => {
        if (onValueChange) {
          onValueChange(newValue);
        } else {
          setInternalValue(newValue);
        }
      },
      [onValueChange]
    );

    const contextValue = React.useMemo<AccordionContextValue>(
      () => ({
        value,
        onValueChange: handleValueChange,
        type,
        collapsible,
      }),
      [value, handleValueChange, type, collapsible]
    );

    return (
      <AccordionContext.Provider value={contextValue}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("border-b", className)} data-value={value}>
        {children}
      </div>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

const AccordionItemContext = React.createContext<{ value: string } | null>(
  null
);

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ children, className, ...props }, ref) => {
  const context = React.useContext(AccordionContext);
  if (!context)
    throw new Error("AccordionTrigger must be used within Accordion");

  const item = React.useContext(AccordionItemContext);
  if (!item)
    throw new Error("AccordionTrigger must be used within AccordionItem");

  const isOpen = context.value === item.value;

  const handleClick = () => {
    if (isOpen && context.collapsible) {
      context.onValueChange(undefined);
    } else if (!isOpen) {
      context.onValueChange(item.value);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
        isOpen && "[&>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ children, className }, ref) => {
  const context = React.useContext(AccordionContext);
  if (!context)
    throw new Error("AccordionContent must be used within Accordion");

  const item = React.useContext(AccordionItemContext);
  if (!item)
    throw new Error("AccordionContent must be used within AccordionItem");

  const isOpen = context.value === item.value;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden text-sm pb-4 pt-0", className)}
    >
      {children}
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

// Wrap AccordionItem to provide context
const AccordionItemWithContext = React.forwardRef<
  HTMLDivElement,
  AccordionItemProps
>(({ value, children, ...props }, ref) => {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <AccordionItem ref={ref} value={value} {...props}>
        {children}
      </AccordionItem>
    </AccordionItemContext.Provider>
  );
});
AccordionItemWithContext.displayName = "AccordionItem";

// Export with alias
export {
  Accordion,
  AccordionItemWithContext as AccordionItem,
  AccordionTrigger,
  AccordionContent,
};
