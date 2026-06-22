"use client";

/**
 * components/video/ShareButton.tsx
 *
 * A share button that appears on watch pages.
 *
 * Behavior:
 *  1. If navigator.share() is available (mobile Chrome, Safari iOS) →
 *     uses the native OS share sheet. Best UX on mobile.
 *  2. Falls back to navigator.clipboard.writeText() on desktop.
 *     Shows a brief "Copied!" toast for 2 seconds.
 *
 * Analytics:
 *  - Fires Analytics.share("native") on successful native share
 *  - Fires Analytics.share("clipboard") on clipboard copy
 *
 * Performance:
 *  - Zero npm dependencies
 *  - No external requests
 *  - Renders a single <button> — negligible LCP impact
 *
 * Usage:
 *   <ShareButton url="https://lusthub.web.id/watch/abc123" title="Video Title" />
 */

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Analytics } from "@/lib/analytics";

interface ShareButtonProps {
  url: string;
  title: string;
  className?: string;
}

export function ShareButton({ url, title, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Strategy 1: Native OS share sheet (mobile-first)
    // navigator.share is available on Chrome Android, Safari iOS, Edge, etc.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        Analytics.share("native");
        return;
      } catch (err) {
        // User cancelled the share dialog — not an error, just ignore
        if (err instanceof Error && err.name === "AbortError") return;
        // Fall through to clipboard on other errors
      }
    }

    // Strategy 2: Clipboard copy (desktop fallback)
    try {
      await navigator.clipboard.writeText(url);
      Analytics.share("clipboard");
      setCopied(true);
      // Reset "Copied!" state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (old browser, insecure context) — silent fail
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label={copied ? "Link copied!" : "Share this video"}
      title={copied ? "Link copied!" : "Share this video"}
      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-full bg-[#272727] hover:bg-[#3F3F3F] border border-white/5 transition-colors text-[#AAAAAA] hover:text-white cursor-pointer text-xs sm:text-sm font-semibold shrink-0 ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
          <span className="font-mono">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="font-mono hidden sm:inline">Share</span>
        </>
      )}
    </button>
  );
}
