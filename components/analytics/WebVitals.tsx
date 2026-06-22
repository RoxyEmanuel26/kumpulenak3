"use client";

import { useReportWebVitals } from "next/web-vitals";
import { Analytics } from "@/lib/analytics";

/**
 * Lightweight component to automatically capture Core Web Vitals (LCP, CLS, INP)
 * and forward them to our existing Plausible/Umami instance.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // We log the value directly, rounded for cleaner analytics
    Analytics.trackWebVital(
      metric.name,
      Math.round(metric.value),
      metric.rating
    );
  });

  return null; // This component renders nothing
}
