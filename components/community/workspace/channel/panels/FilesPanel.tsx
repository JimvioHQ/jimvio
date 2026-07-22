"use client";

import { FileText } from "lucide-react";
import { ChannelEmptyState } from "../ChannelEmptyState";

/** Phase 1 placeholder — Files architecture reserved for PDFs, docs, AI summary. */
export function FilesPanel() {
  return (
    <ChannelEmptyState
      icon={FileText}
      title="Files"
      description="Shared documents, PDFs, and downloads will live here. Architecture is ready for upload, preview, and AI summaries."
    />
  );
}
