import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminDisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Disputes</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Resolve buyer–seller disputes</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Dispute resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-text-muted)]">
            When you add a <code className="rounded bg-[var(--color-surface-secondary)] px-1">disputes</code> or <code className="rounded bg-[var(--color-surface-secondary)] px-1">order_disputes</code> table, list them here. Admin actions: view dispute details, assign resolution (refund buyer, favor vendor, partial refund), add internal notes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
