"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeMediaTag } from "@/lib/editorial/actions";

export function RemoveTagButton({ tag }: { tag: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-semibold text-[#b42318] disabled:opacity-60"
      onClick={() => {
        const ok = window.confirm(`Remove the tag “${tag}” from every article?`);
        if (!ok) return;
        startTransition(async () => {
          await removeMediaTag(tag);
          router.refresh();
        });
      }}
    >
      Remove
    </button>
  );
}
