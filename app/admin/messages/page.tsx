import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Messages</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Overview of buyer–supplier conversations</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-text-muted)]">
            Message content is private between buyers and vendors. Admins can add a read-only list of conversations (e.g. for support or dispute context) by querying the <code className="rounded bg-[var(--color-surface-secondary)] px-1">conversations</code> table. For now, use the dashboard Messages page for support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
