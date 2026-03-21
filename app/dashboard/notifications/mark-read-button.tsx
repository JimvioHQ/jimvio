"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const markRead = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);
      router.refresh();
    });
  };

  return (
    <Button variant="ghost" size="sm" className="text-xs rounded-lg h-7" disabled={isPending} onClick={markRead}>
      Mark read
    </Button>
  );
}
