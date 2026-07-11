"use client";

import { useEffect } from "react";
import { ErrorStateBody } from "@/components/error-states/shared";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorStateBody
      variant="page"
      code={error.digest}
      title="This page hit a snag"
      description="Try again — if it's still broken, head back and try a different path."
      details={process.env.NODE_ENV === "development" ? error.stack : undefined}
      actions={[
        { label: "Try again", variant: "primary", onClick: () => reset() },
        { label: "Go back", variant: "ghost", onClick: () => window.history.back() },
      ]}
    />
  );
}