"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminBtnSecondary } from "@/lib/admin/ui";
import { cn } from "@/lib/utils";
import type { ExportFormat, ExportResource } from "@/lib/admin/export/types";
import { EXPORT_FORMATS } from "@/lib/admin/export/types";

const FORMAT_ICONS: Record<ExportFormat, React.ElementType> = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  pdf: FileText,
  json: FileJson,
};

type Props = {
  resource: ExportResource;
  /** Query string without leading `?`, e.g. `range=mtd&payment=paid` */
  query?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function AdminExportMenu({
  resource,
  query = "",
  label = "Export",
  className,
  disabled,
}: Props) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setLoading(format);
    try {
      const params = new URLSearchParams(query);
      params.set("resource", resource);
      params.set("format", format);

      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Export failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `jimvio-${resource}.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || loading != null}>
        <button type="button" className={cn(adminBtnSecondary, className)}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-md">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Choose format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXPORT_FORMATS.map((fmt) => {
          const Icon = FORMAT_ICONS[fmt.id];
          const busy = loading === fmt.id;
          return (
            <DropdownMenuItem
              key={fmt.id}
              disabled={busy || loading != null}
              onClick={() => handleExport(fmt.id)}
              className="flex items-start gap-2.5 py-2"
            >
              {busy ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{fmt.label}</p>
                <p className="text-[11px] text-muted-foreground">{fmt.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
