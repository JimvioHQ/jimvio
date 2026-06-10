"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ConfirmPublishButton({
  productId,
  status,
  images,
  onSuccess,
}: {
  productId: string;
  status?: string;
  images?: unknown;
  onSuccess?: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  function parseImages(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
      } catch {
        if (raw.startsWith("http")) return [raw];
      }
    }
    return [];
  }

  const imgs = parseImages(images);
  const isDraft = (status ?? "draft") === "draft";

  async function handlePublish() {
    if (!isDraft) return;
    if (imgs.length === 0) {
      toast.error("Product has no images — leave as Draft until images are added");
      return;
    }
    if (!confirm("Publish this product to active? This will make it visible in the store.")) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("products").update({ status: "active", is_active: true }).eq("id", productId);
      if (error) {
        console.error("Publish failed:", error);
        toast.error("Failed to publish product");
      } else {
        toast.success("Product published");
        onSuccess?.(productId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isDraft) return null;

  return (
    <button
      onClick={handlePublish}
      disabled={loading}
      title={imgs.length === 0 ? "Product has no images" : "Publish product"}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 8,
        border: "none",
        background: imgs.length === 0 ? "#94a3b8" : "#16a34a",
        color: "#fff",
        fontWeight: 700,
        cursor: loading || imgs.length === 0 ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Publishing…" : "Publish"}
    </button>
  );
}
