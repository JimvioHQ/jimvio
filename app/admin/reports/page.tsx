import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reports</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Analytics and platform reports</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            High-level metrics are on the <Link href="/admin" className="text-[var(--color-accent)] hover:underline">Overview</Link> page (users, vendors, products, orders, revenue, communities). Here you can add:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1">
            <li>Exportable CSV/Excel reports</li>
            <li>Date-range filters for revenue and orders</li>
            <li>Vendor performance reports</li>
            <li>Affiliate and creator earnings reports</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
