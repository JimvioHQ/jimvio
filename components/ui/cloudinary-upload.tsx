"use client";

import React, { useRef } from "react";
import { Upload, Loader2, Image as ImageIcon, Video, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import type { CloudinaryFolder } from "@/services/media/cloudinary";
import { cn } from "@/lib/utils";

interface CloudinaryUploadButtonProps {
  folder: CloudinaryFolder;
  resourceType?: "image" | "video" | "raw";
  onUploadSuccess: (url: string, publicId: string) => void;
  onUploadError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function CloudinaryUploadButton({
  folder,
  resourceType = "image",
  onUploadSuccess,
  onUploadError,
  buttonText = "Upload File",
  className,
  variant = "outline",
}: CloudinaryUploadButtonProps) {
  const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, resourceType);
    if (result) {
      onUploadSuccess(result.url, result.publicId);
    } else if (error && onUploadError) {
      onUploadError(error);
    }
  };

  const Icon = resourceType === "video" ? Video : resourceType === "image" ? ImageIcon : FileIcon;

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={resourceType === "video" ? "video/*" : resourceType === "image" ? "image/*" : "*/*"}
      />
      
      <Button
        type="button"
        variant={variant}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading ? `Uploading... ${progress}%` : buttonText}
      </Button>
      
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * A beautiful dropzone style uploader for larger areas (like product images)
 */
export function CloudinaryDropzone({
  folder,
  resourceType = "image",
  onUploadSuccess,
  onUploadError,
  label = "Click to upload or drag and drop",
  sublabel = "SVG, PNG, JPG or GIF (max. 5MB)",
  className,
}: CloudinaryUploadButtonProps & { label?: string; sublabel?: string }) {
  const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, resourceType);
    if (result) {
      onUploadSuccess(result.url, result.publicId);
    } else if (error && onUploadError) {
      onUploadError(error);
    }
  };

  const Icon = resourceType === "video" ? Video : resourceType === "image" ? ImageIcon : FileIcon;

  return (
    <div className={cn("w-full", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={resourceType === "video" ? "video/*" : resourceType === "image" ? "image/*" : "*/*"}
      />
      
      <div 
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors bg-zinc-50/50 hover:bg-zinc-100/50",
          uploading ? "border-[var(--color-accent)] opacity-80 cursor-wait" : "border-zinc-200 dark:border-border"
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
              <p className="text-sm font-semibold text-[var(--color-accent)]">Uploading... {progress}%</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white dark:bg-surface shadow-sm border border-zinc-100 dark:border-border rounded-full mb-3">
                <Upload className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
              <p className="text-xs text-zinc-500">{sublabel}</p>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
