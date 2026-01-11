"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/share";

interface ShareButtonProps {
  url: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "secondary";
  showText?: boolean;
  className?: string;
}

export default function ShareButton({
  url,
  size = "sm",
  variant = "outline",
  showText = false,
  className = "",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleShare = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setShowTooltip(true);
      setTimeout(() => {
        setCopied(false);
        setShowTooltip(false);
      }, 2000);

      // Try native share API if available (mobile)
      if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: "Shared Link",
            url: url,
          });
        } catch (err) {
          // User cancelled or error occurred, clipboard copy already happened
        }
      }
    } else {
      alert("Failed to copy link. Please copy manually: " + url);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        size={size}
        variant={variant}
        onClick={handleShare}
        className="flex items-center gap-2"
        title="Share link"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            {showText && "Copied!"}
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            {showText && "Share"}
          </>
        )}
      </Button>
      {showTooltip && copied && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50"
          style={{ fontSize: "12px" }}
        >
          Link copied!
        </div>
      )}
    </div>
  );
}

