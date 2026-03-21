import React from "react";
import Link from "next/link";
import { getPendingVendors } from "@/services/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const pending = await getPendingVendors();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Verification Requests</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Review vendor, creator, and affiliate applications</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Pending vendor verifications
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">{pending.length} awaiting review</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-text-muted)] rounded-xl bg-[var(--color-surface-secondary)]/50">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-[var(--color-text-primary)]">All caught up</p>
              <p className="text-sm">No pending vendor verifications.</p>
            </div>
          ) : (
            pending.map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)]/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">{v.business_name || "Unnamed store"}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {v.profiles?.email ?? "—"} · {v.business_country || "—"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Submitted {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive">
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            Creator and affiliate verification requests can be added here. For now, vendor applications are listed above.
            Use the <Link href="/admin/vendors" className="text-[var(--color-accent)] hover:underline">Vendors</Link> page to view all stores and their verification status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
