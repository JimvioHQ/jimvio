"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { recordReferralVisit } from "@/lib/actions/affiliate";

/**
 * Handles capturing 'ref' from URL query parameters.
 * Sets a persistent session cookie and increments clicks via server action.
 */
function ReferralCapture() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (ref) {
      console.log(`[ReferralCapture] Found ref: ${ref}, pathname: ${window.location.pathname}`);
      // 1. Record visit via server action (sets cookie internally)
      recordReferralVisit(ref, window.location.pathname);
      
      // 2. Clean up URL (optional but cleaner)
      // window.history.replaceState({}, '', window.location.pathname);
    }
  }, [ref]);

  return null;
}

export function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <ReferralCapture />
    </Suspense>
  );
}

