"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analytics } from "../lib/analytics";

/**
 * Path-only pageviews through the §18.4 redaction wrapper. The query string
 * (which carries URL-encoded scenario state) never leaves the device.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    analytics.track("page_view", { path: pathname });
  }, [pathname]);
  return null;
}
