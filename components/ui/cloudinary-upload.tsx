// "use client";

// import React, { useRef } from "react";
// import { Upload, Loader2, Image as ImageIcon, Video, File as FileIcon } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
// import type { CloudinaryFolder } from "@/services/media/cloudinary";
// import { cn } from "@/lib/utils";

// interface CloudinaryUploadButtonProps {
//   folder: CloudinaryFolder;
//   resourceType?: "image" | "video" | "raw";
//   onUploadSuccess: (url: string, publicId: string) => void;
//   onUploadError?: (error: string) => void;
//   buttonText?: string;
//   className?: string;
//   variant?: "default" | "outline" | "ghost" | "secondary";
// }

// export function CloudinaryUploadButton({
//   folder,
//   resourceType = "image",
//   onUploadSuccess,
//   onUploadError,
//   buttonText = "Upload File",
//   className,
//   variant = "outline",
// }: CloudinaryUploadButtonProps) {
//   const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const result = await upload(file, resourceType);
//     if (result) {
//       onUploadSuccess(result.url, result.publicId);
//     } else if (error && onUploadError) {
//       onUploadError(error);
//     }
//   };

//   const Icon = resourceType === "video" ? Video : resourceType === "image" ? ImageIcon : FileIcon;

//   return (
//     <div className={cn("inline-flex flex-col gap-2", className)}>
//       <input
//         type="file"
//         ref={fileInputRef}
//         onChange={handleFileChange}
//         className="hidden"
//         accept={resourceType === "video" ? "video/*" : resourceType === "image" ? "image/*" : "*/*"}
//       />

//       <Button
//         type="button"
//         variant={variant}
//         onClick={() => fileInputRef.current?.click()}
//         disabled={uploading}
//         className="gap-2"
//       >
//         {uploading ? (
//           <Loader2 className="h-4 w-4 animate-spin" />
//         ) : (
//           <Upload className="h-4 w-4" />
//         )}
//         {uploading ? `Uploading... ${progress}%` : buttonText}
//       </Button>

//       {error && <p className="text-xs text-red-500">{error}</p>}
//     </div>
//   );
// }

// /**
//  * A beautiful dropzone style uploader for larger areas (like product images)
//  */
// export function CloudinaryDropzone({
//   folder,
//   resourceType = "image",
//   onUploadSuccess,
//   onUploadError,
//   label = "Click to upload or drag and drop",
//   sublabel = "SVG, PNG, JPG or GIF (max. 5MB)",
//   className,
// }: CloudinaryUploadButtonProps & { label?: React.ReactNode; sublabel?: React.ReactNode }) {
//   const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const result = await upload(file, resourceType);
//     if (result) {
//       onUploadSuccess(result.url, result.publicId);
//     } else if (error && onUploadError) {
//       onUploadError(error);
//     }
//   };

//   const Icon = resourceType === "video" ? Video : resourceType === "image" ? ImageIcon : FileIcon;

//   return (
//     <div className={cn("w-full", className)}>
//       <input
//         type="file"
//         ref={fileInputRef}
//         onChange={handleFileChange}
//         className="hidden"
//         accept={resourceType === "video" ? "video/*" : resourceType === "image" ? "image/*" : "*/*"}
//       />

//       <div 
//         onClick={() => !uploading && fileInputRef.current?.click()}
//         className={cn(
//           "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-sm cursor-pointer transition-colors bg-zinc-50/50 hover:bg-zinc-100/50",
//           uploading ? "border-[var(--color-accent)] opacity-80 cursor-wait" : "border-zinc-200 dark:border-border"
//         )}
//       >
//         <div className="flex flex-col items-center justify-center pt-5 pb-6">
//           {uploading ? (
//             <div className="flex flex-col items-center gap-3">
//               <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
//               <p className="text-sm font-semibold text-[var(--color-accent)]">Uploading... {progress}%</p>
//             </div>
//           ) : (
//             <>
//               <div className="p-3 bg-white dark:bg-surface shadow-none border border-zinc-100 dark:border-border rounded-sm mb-3">
//                 <Upload className="w-6 h-6 text-zinc-400" />
//               </div>
//               <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
//               <p className="text-xs text-zinc-500">{sublabel}</p>
//             </>
//           )}
//         </div>
//       </div>
//       {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
//     </div>
//   );
// }
"use client";

import React, { useRef, useState } from "react";
import { Upload, Loader2, Image as ImageIcon, Video, File as FileIcon, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import type { CloudinaryFolder } from "@/services/media/cloudinary";
import { cn } from "@/lib/utils";

/* ─── shared types ─────────────────────────────────────────── */
interface CloudinaryUploadButtonProps {
  folder: CloudinaryFolder;
  resourceType?: "image" | "video" | "raw";
  onUploadSuccess: (url: string, publicId: string) => void;
  onUploadError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
}

/* ─── helpers ──────────────────────────────────────────────── */
function getIcon(resourceType: "image" | "video" | "raw") {
  if (resourceType === "video") return Video;
  if (resourceType === "image") return ImageIcon;
  return FileIcon;
}

function getAccept(resourceType: "image" | "video" | "raw") {
  if (resourceType === "video") return "video/*";
  if (resourceType === "image") return "image/*";
  return "*/*";
}

/* ═══════════════════════════════════════════════════════════
   CloudinaryUploadButton
   ═══════════════════════════════════════════════════════════ */
export function CloudinaryUploadButton({
  folder,
  resourceType = "image",
  onUploadSuccess,
  onUploadError,
  buttonText = "Upload File",
  className,
}: CloudinaryUploadButtonProps) {
  const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [done, setDone] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDone(false);

    const result = await upload(file, resourceType);
    if (result) {
      onUploadSuccess(result.url, result.publicId);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } else if (error && onUploadError) {
      onUploadError(error);
    }

    // reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={getAccept(resourceType)}
      />

      <button
        type="button"
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all duration-200",
          done
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : uploading
            ? "bg-[#1A1A1A] border-[#2A2A2A] text-zinc-500 cursor-wait"
            : "bg-[#1A1A1A] border-[#2A2A2A] text-zinc-300 hover:text-white hover:border-[#333] hover:bg-[#222]"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span className="tabular-nums">{progress}%</span>
          </>
        ) : done ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Uploaded
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5 shrink-0" />
            {buttonText}
          </>
        )}
      </button>

      {/* Progress bar */}
      {uploading && (
        <div className="h-0.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-[10px] text-rose-400 font-medium">{error}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CloudinaryDropzone
   ═══════════════════════════════════════════════════════════ */
export function CloudinaryDropzone({
  folder,
  resourceType = "image",
  onUploadSuccess,
  onUploadError,
  label,
  sublabel,
  className,
}: CloudinaryUploadButtonProps & {
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
}) {
  const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  async function processFile(file: File) {
    setDone(false);
    const result = await upload(file, resourceType);
    if (result) {
      onUploadSuccess(result.url, result.publicId);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } else if (error && onUploadError) {
      onUploadError(error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploading) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // only fire when leaving the dropzone itself, not child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  /* ── inner content — uses only <span> so it's safe inside <p> ── */
  const Icon = getIcon(resourceType);

  const innerContent = (() => {
    if (uploading) {
      return (
        <span className="flex flex-col items-center gap-3">
          {/* circular progress ring */}
          <span className="relative w-10 h-10 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#1E1E1E" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="#f97316" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          </span>
          <span className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-white tabular-nums">{progress}%</span>
            <span className="text-xs text-zinc-500">Uploading…</span>
          </span>
        </span>
      );
    }

    if (done) {
      return (
        <span className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </span>
          <span className="text-sm font-semibold text-emerald-400">Uploaded successfully</span>
        </span>
      );
    }

    /* default / drag state */
    if (label) {
      // caller passed a custom label — render it directly
      // wrap in a span so block-level children don't cause hydration issues
      return <span className="flex flex-col items-center">{label}</span>;
    }

    return (
      <span className="flex flex-col items-center gap-3">
        <span className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200",
          dragging ? "bg-orange-600/20" : "bg-[#1A1A1A]"
        )}>
          <Icon className={cn(
            "w-4 h-4 transition-colors duration-200",
            dragging ? "text-orange-400" : "text-zinc-500"
          )} />
        </span>
        <span className="flex flex-col items-center gap-1">
          <span className={cn(
            "text-sm font-medium transition-colors duration-200",
            dragging ? "text-white" : "text-zinc-400"
          )}>
            {dragging ? "Drop to upload" : "Drop files here or click to browse"}
          </span>
          <span className="text-xs text-zinc-600">
            {sublabel ?? "PNG, JPG, WEBP — max 10MB"}
          </span>
        </span>
      </span>
    );
  })();

  return (
    <span className={cn("flex flex-col w-full", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={getAccept(resourceType)}
      />

      {/* dropzone area */}
      <span
        role="button"
        tabIndex={0}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex items-center justify-center w-full min-h-[140px] rounded-xl border-2 border-dashed",
          "transition-all duration-200 select-none",
          uploading
            ? "border-orange-500/30 bg-orange-500/3 cursor-wait"
            : done
            ? "border-emerald-500/30 bg-emerald-500/3 cursor-default"
            : dragging
            ? "border-orange-500/50 bg-orange-500/5 cursor-copy"
            : "border-[#1E1E1E] bg-transparent hover:border-[#2A2A2A] hover:bg-[#0D0D0D] cursor-pointer"
        )}
      >
        {innerContent}
      </span>

      {/* error */}
      {error && (
        <span className="flex items-center gap-1.5 mt-2">
          <X className="w-3 h-3 text-rose-500 shrink-0" />
          <span className="text-[10px] text-rose-400 font-medium">{error}</span>
        </span>
      )}
    </span>
  );
}