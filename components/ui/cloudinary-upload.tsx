
// "use client";

// import React, { useRef, useState } from "react";
// import { Upload, Loader2, Image as ImageIcon, Video, File as FileIcon, CheckCircle2, X } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
// import type { CloudinaryFolder } from "@/services/media/cloudinary";
// import { cn } from "@/lib/utils";

// /* ─── shared types ─────────────────────────────────────────── */
// interface CloudinaryUploadButtonProps {
//   folder: CloudinaryFolder;
//   resourceType?: "image" | "video" | "raw";
//   onUploadSuccess: (url: string, publicId: string) => void;
//   onUploadError?: (error: string) => void;
//   buttonText?: string;
//   className?: string;
//   variant?: "default" | "outline" | "ghost" | "secondary";
// }

// /* ─── helpers ──────────────────────────────────────────────── */
// function getIcon(resourceType: "image" | "video" | "raw") {
//   if (resourceType === "video") return Video;
//   if (resourceType === "image") return ImageIcon;
//   return FileIcon;
// }

// function getAccept(resourceType: "image" | "video" | "raw") {
//   if (resourceType === "video") return "video/*";
//   if (resourceType === "image") return "image/*";
//   return "*/*";
// }

// /* ═══════════════════════════════════════════════════════════
//    CloudinaryUploadButton
//    ═══════════════════════════════════════════════════════════ */
// export function CloudinaryUploadButton({
//   folder,
//   resourceType = "image",
//   onUploadSuccess,
//   onUploadError,
//   buttonText = "Upload File",
//   className,
// }: CloudinaryUploadButtonProps) {
//   const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [done, setDone] = useState(false);

//   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setDone(false);

//     const result = await upload(file, resourceType);
//     if (result) {
//       onUploadSuccess(result.url, result.publicId);
//       setDone(true);
//       setTimeout(() => setDone(false), 2500);
//     } else if (error && onUploadError) {
//       onUploadError(error);
//     }

//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   return (
//     <div className={cn("inline-flex flex-col gap-1.5", className)}>
//       <input
//         type="file"
//         ref={fileInputRef}
//         onChange={handleFileChange}
//         className="hidden"
//         accept={getAccept(resourceType)}
//       />

//       <button
//         type="button"
//         onClick={() => !uploading && fileInputRef.current?.click()}
//         disabled={uploading}
//         className="inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold transition-all duration-200 outline-none"
//         style={{
//           borderRadius: "var(--radius-sm, 0.5rem)",
//           border: "1px solid",
//           borderColor: done
//             ? "var(--color-success)"
//             : "var(--color-border)",
//           background: done
//             ? "var(--color-success-light)"
//             : "var(--color-surface-secondary)",
//           color: done
//             ? "var(--color-success)"
//             : uploading
//               ? "var(--color-text-muted)"
//               : "var(--color-text-secondary)",
//           cursor: uploading ? "wait" : "pointer",
//           opacity: uploading && !done ? 0.7 : 1,
//         }}
//         onMouseEnter={e => {
//           if (!uploading && !done) {
//             e.currentTarget.style.borderColor = "var(--color-border-strong)";
//             e.currentTarget.style.color = "var(--color-text-primary)";
//           }
//         }}
//         onMouseLeave={e => {
//           if (!uploading && !done) {
//             e.currentTarget.style.borderColor = "var(--color-border)";
//             e.currentTarget.style.color = "var(--color-text-secondary)";
//           }
//         }}
//       >
//         {uploading ? (
//           <>
//             <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
//             <span className="tabular-nums">{progress}%</span>
//           </>
//         ) : done ? (
//           <>
//             <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
//             Uploaded
//           </>
//         ) : (
//           <>
//             <Upload className="h-3.5 w-3.5 shrink-0" />
//             {buttonText}
//           </>
//         )}
//       </button>

//       {/* Progress bar */}
//       {uploading && (
//         <div
//           className="h-0.5 w-full rounded-full overflow-hidden"
//           style={{ background: "var(--color-border)" }}
//         >
//           <div
//             className="h-full rounded-full transition-all duration-300"
//             style={{
//               width: `${progress}%`,
//               background: "var(--color-accent)",
//             }}
//           />
//         </div>
//       )}

//       {error && (
//         <p className="text-[10px] font-medium" style={{ color: "var(--color-danger)" }}>
//           {error}
//         </p>
//       )}
//     </div>
//   );
// }

// /* ═══════════════════════════════════════════════════════════
//    CloudinaryDropzone
//    ═══════════════════════════════════════════════════════════ */
// export function CloudinaryDropzone({
//   folder,
//   resourceType = "image",
//   onUploadSuccess,
//   onUploadError,
//   label,
//   sublabel,
//   className,
// }: CloudinaryUploadButtonProps & {
//   label?: React.ReactNode;
//   sublabel?: React.ReactNode;
// }) {
//   const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [dragging, setDragging] = useState(false);
//   const [done, setDone] = useState(false);

//   async function processFile(file: File) {
//     setDone(false);
//     const result = await upload(file, resourceType);
//     if (result) {
//       onUploadSuccess(result.url, result.publicId);
//       setDone(true);
//       setTimeout(() => setDone(false), 2000);
//     } else if (error && onUploadError) {
//       onUploadError(error);
//     }
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   }

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) processFile(file);
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setDragging(false);
//     if (uploading) return;
//     const file = e.dataTransfer.files?.[0];
//     if (file) processFile(file);
//   };

//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     if (!uploading) setDragging(true);
//   };

//   const handleDragLeave = (e: React.DragEvent) => {
//     if (!e.currentTarget.contains(e.relatedTarget as Node)) {
//       setDragging(false);
//     }
//   };

//   const Icon = getIcon(resourceType);

//   /* ── dropzone border/bg style based on state ── */
//   const zoneStyle = (): React.CSSProperties => {
//     if (uploading) return {
//       borderColor: "var(--color-accent)",
//       background: "var(--color-accent-light)",
//       cursor: "wait",
//     };
//     if (done) return {
//       borderColor: "var(--color-success)",
//       background: "var(--color-success-light)",
//       cursor: "default",
//     };
//     if (dragging) return {
//       borderColor: "var(--color-accent)",
//       background: "var(--color-accent-light)",
//       cursor: "copy",
//     };
//     return {
//       borderColor: "var(--color-border)",
//       background: "transparent",
//       cursor: "pointer",
//     };
//   };

//   /* ── inner content ── */
//   const innerContent = (() => {
//     if (uploading) {
//       return (
//         <span className="flex flex-col items-center gap-3">
//           {/* circular progress ring */}
//           <span className="relative w-10 h-10 flex items-center justify-center">
//             <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" width="40" height="40">
//               <circle
//                 cx="20" cy="20" r="16"
//                 fill="none"
//                 stroke="var(--color-border)"
//                 strokeWidth="3"
//               />
//               <circle
//                 cx="20" cy="20" r="16"
//                 fill="none"
//                 stroke="var(--color-accent)"
//                 strokeWidth="3"
//                 strokeLinecap="round"
//                 strokeDasharray={`${2 * Math.PI * 16}`}
//                 strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
//                 style={{ transition: "stroke-dashoffset 0.3s ease" }}
//               />
//             </svg>
//             <Loader2
//               className="w-4 h-4 animate-spin"
//               style={{ color: "var(--color-accent)" }}
//             />
//           </span>
//           <span className="flex flex-col items-center gap-1">
//             <span
//               className="text-sm font-semibold tabular-nums"
//               style={{ color: "var(--color-text-primary)" }}
//             >
//               {progress}%
//             </span>
//             <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
//               Uploading…
//             </span>
//           </span>
//         </span>
//       );
//     }

//     if (done) {
//       return (
//         <span className="flex flex-col items-center gap-3">
//           <span
//             className="w-10 h-10 rounded-full flex items-center justify-center"
//             style={{ background: "var(--color-success-light)" }}
//           >
//             <CheckCircle2 className="w-5 h-5" style={{ color: "var(--color-success)" }} />
//           </span>
//           <span className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
//             Uploaded successfully
//           </span>
//         </span>
//       );
//     }

//     if (label) {
//       return <span className="flex flex-col items-center">{label}</span>;
//     }

//     return (
//       <span className="flex flex-col items-center gap-3">
//         <span
//           className="w-10 h-10 flex items-center justify-center transition-colors duration-200"
//           style={{
//             borderRadius: "var(--radius-sm, 0.5rem)",
//             background: dragging ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//             border: "1px solid",
//             borderColor: dragging ? "var(--color-accent-subtle)" : "var(--color-border)",
//           }}
//         >
//           <Icon
//             className="w-4 h-4 transition-colors duration-200"
//             style={{ color: dragging ? "var(--color-accent)" : "var(--color-text-muted)" }}
//           />
//         </span>
//         <span className="flex flex-col items-center gap-1">
//           <span
//             className="text-sm font-medium transition-colors duration-200"
//             style={{ color: dragging ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
//           >
//             {dragging ? "Drop to upload" : "Drop files here or click to browse"}
//           </span>
//           <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
//             {sublabel ?? "PNG, JPG, WEBP — max 10MB"}
//           </span>
//         </span>
//       </span>
//     );
//   })();

//   return (
//     <span className={cn("flex flex-col w-full", className)}>
//       <input
//         type="file"
//         ref={fileInputRef}
//         onChange={handleFileChange}
//         className="hidden"
//         accept={getAccept(resourceType)}
//       />

//       {/* dropzone area */}
//       <span
//         role="button"
//         tabIndex={0}
//         onClick={() => !uploading && fileInputRef.current?.click()}
//         onKeyDown={e => e.key === "Enter" && !uploading && fileInputRef.current?.click()}
//         onDrop={handleDrop}
//         onDragOver={handleDragOver}
//         onDragLeave={handleDragLeave}
//         className="flex items-center justify-center w-full min-h-[140px] border-2 border-dashed transition-all duration-200 select-none outline-none"
//         style={{
//           borderRadius: "var(--radius-md, 0.75rem)",
//           ...zoneStyle(),
//         }}
//         onMouseEnter={e => {
//           if (!uploading && !done && !dragging) {
//             (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)";
//             (e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)";
//           }
//         }}
//         onMouseLeave={e => {
//           if (!uploading && !done && !dragging) {
//             (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
//             (e.currentTarget as HTMLElement).style.background = "transparent";
//           }
//         }}
//       >
//         {innerContent}
//       </span>

//       {/* error */}
//       {error && (
//         <span className="flex items-center gap-1.5 mt-2">
//           <X className="w-3 h-3 shrink-0" style={{ color: "var(--color-danger)" }} />
//           <span className="text-[10px] font-medium" style={{ color: "var(--color-danger)" }}>
//             {error}
//           </span>
//         </span>
//       )}
//     </span>
//   );
// }

"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  Upload,
  Loader2,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  CheckCircle2,
  X,
  Ban,
} from "lucide-react";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";
import type { CloudinaryFolder } from "@/services/media/cloudinary";
import { cn } from "@/lib/utils";

/* ─── constants ────────────────────────────────────────────── */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/* ─── shared types ─────────────────────────────────────────── */
interface CloudinaryUploadButtonProps {
  folder: CloudinaryFolder;
  resourceType?: "image" | "video" | "raw";
  onUploadSuccess: (url: string, publicId: string) => void;
  onUploadError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  /** Mirrors shadcn Button variant — wired to the button style below */
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

/** Returns a human-readable validation error or null if the file is fine. */
function validateFile(
  file: File,
  resourceType: "image" | "video" | "raw",
): string | null {
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `File is ${mb} MB — max 10 MB allowed`;
  }
  if (resourceType === "image" && !file.type.startsWith("image/")) {
    return "Only image files are accepted here";
  }
  if (resourceType === "video" && !file.type.startsWith("video/")) {
    return "Only video files are accepted here";
  }
  return null;
}

/* ─── variant style map ────────────────────────────────────── */
const variantBase: Record<
  NonNullable<CloudinaryUploadButtonProps["variant"]>,
  React.CSSProperties
> = {
  default: {
    background: "var(--color-accent)",
    color: "var(--color-accent-foreground)",
    borderColor: "var(--color-accent)",
  },
  outline: {
    background: "transparent",
    color: "var(--color-text-secondary)",
    borderColor: "var(--color-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-secondary)",
    borderColor: "transparent",
  },
  secondary: {
    background: "var(--color-surface-secondary)",
    color: "var(--color-text-secondary)",
    borderColor: "var(--color-border)",
  },
};

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
  variant = "outline",
}: CloudinaryUploadButtonProps) {
  const { upload, uploading, progress, cancelUpload } =
    useCloudinaryUpload(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [done, setDone] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setDone(false);
      setLocalError(null);

      // Client-side validation before hitting the network
      const validationError = validateFile(file, resourceType);
      if (validationError) {
        setLocalError(validationError);
        onUploadError?.(validationError);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // upload() now returns { url, publicId } | { error: string } | null
      const result = await upload(file, resourceType);

      if (result && "url" in result) {
        onUploadSuccess(result.url, result.publicId);
        setDone(true);
        setTimeout(() => setDone(false), 2500);
      } else if (result && "error" in result) {
        setLocalError(result.error);
        onUploadError?.(result.error);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [upload, resourceType, onUploadSuccess, onUploadError],
  );

  const baseStyle = variantBase[variant];

  return (
    <div
      className={cn("inline-flex flex-col gap-1.5", className)}
      aria-live="polite"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={getAccept(resourceType)}
      />

      <button
        type="button"
        aria-busy={uploading}
        aria-label={
          uploading
            ? `Uploading, ${progress}% complete`
            : done
              ? "Upload complete"
              : buttonText
        }
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold",
          "transition-all duration-200 rounded-[var(--radius-sm,0.5rem)] border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
          "disabled:cursor-wait",
        )}
        style={{
          ...baseStyle,
          ...(done && {
            borderColor: "var(--color-success)",
            background: "var(--color-success-light)",
            color: "var(--color-success)",
          }),
          opacity: uploading && !done ? 0.7 : 1,
        }}
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

      {/* Progress bar + cancel */}
      {uploading && (
        <div className="flex items-center gap-2">
          <div
            className="h-0.5 flex-1 rounded-full overflow-hidden"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "var(--color-accent)",
              }}
            />
          </div>
          {cancelUpload && (
            <button
              type="button"
              onClick={cancelUpload}
              aria-label="Cancel upload"
              className="shrink-0 text-[10px] font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {localError && (
        <p
          role="alert"
          className="text-[10px] font-medium"
          style={{ color: "var(--color-danger)" }}
        >
          {localError}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CloudinaryDropzone
   ═══════════════════════════════════════════════════════════ */

interface RejectedFile {
  name: string;
  reason: string;
}

export function CloudinaryDropzone({
  folder,
  resourceType = "image",
  onUploadSuccess,
  onUploadError,
  label,
  sublabel,
  className,
  multiple = false,
}: CloudinaryUploadButtonProps & {
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  /** Allow picking/dropping multiple files. Each is uploaded sequentially. */
  multiple?: boolean;
}) {
  const { upload, uploading, progress, cancelUpload } =
    useCloudinaryUpload(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);

  const processFiles = useCallback(
    async (files: File[]) => {
      setDone(false);
      setLocalError(null);
      setRejected([]);

      const valid: File[] = [];
      const invalid: RejectedFile[] = [];

      for (const file of files) {
        const err = validateFile(file, resourceType);
        if (err) invalid.push({ name: file.name, reason: err });
        else valid.push(file);
      }

      if (invalid.length) setRejected(invalid);
      if (!valid.length) return;

      // Upload sequentially so progress is meaningful per file.
      for (const file of valid) {
        // Generate a local object-URL preview for images before uploading.
        if (resourceType === "image") {
          const objectUrl = URL.createObjectURL(file);
          setPreview(objectUrl);
        }

        const result = await upload(file, resourceType);

        if (result && "url" in result) {
          // Swap the object-URL for the persisted Cloudinary URL.
          if (resourceType === "image") setPreview(result.url);
          onUploadSuccess(result.url, result.publicId);
          setDone(true);
        } else if (result && "error" in result) {
          setLocalError(result.error);
          onUploadError?.(result.error);
          // Clear the optimistic preview on failure.
          setPreview(null);
        }
      }

      // Brief "done" flash, then reset state (but keep preview).
      setTimeout(() => setDone(false), 2000);

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [upload, resourceType, onUploadSuccess, onUploadError],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) processFiles(multiple ? files : [files[0]]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploading) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  const Icon = getIcon(resourceType);

  /* ── border/bg based on state ── */
  const zoneStyle = (): React.CSSProperties => {
    if (uploading)
      return {
        borderColor: "var(--color-accent)",
        background: "var(--color-accent-light)",
        cursor: "wait",
      };
    if (done)
      return {
        borderColor: "var(--color-success)",
        background: "var(--color-success-light)",
        cursor: "default",
      };
    if (dragging)
      return {
        borderColor: "var(--color-accent)",
        background: "var(--color-accent-light)",
        cursor: "copy",
      };
    return {
      borderColor: "var(--color-border)",
      background: "transparent",
      cursor: "pointer",
    };
  };

  /* ── inner content ── */
  const innerContent = (() => {
    if (uploading) {
      return (
        <span className="flex flex-col items-center gap-3">
          <span className="relative w-10 h-10 flex items-center justify-center">
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 40 40"
              width="40"
              height="40"
            >
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="3"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "var(--color-accent)" }}
            />
          </span>

          <span className="flex flex-col items-center gap-1.5">
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {progress}%
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Uploading…
            </span>
            {cancelUpload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelUpload();
                }}
                aria-label="Cancel upload"
                className="mt-1 text-[10px] font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
                style={{ color: "var(--color-text-muted)" }}
              >
                Cancel
              </button>
            )}
          </span>
        </span>
      );
    }

    if (done) {
      return (
        <span className="flex flex-col items-center gap-3">
          {/* Image preview if we have one */}
          {preview && resourceType === "image" ? (
            <span
              className="w-16 h-16 rounded-md overflow-hidden border"
              style={{ borderColor: "var(--color-success)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
            </span>
          ) : (
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-success-light)" }}
            >
              <CheckCircle2
                className="w-5 h-5"
                style={{ color: "var(--color-success)" }}
              />
            </span>
          )}
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-success)" }}
          >
            Uploaded successfully
          </span>
        </span>
      );
    }

    if (label) {
      return <span className="flex flex-col items-center">{label}</span>;
    }

    return (
      <span className="flex flex-col items-center gap-3">
        <span
          className="w-10 h-10 flex items-center justify-center transition-colors duration-200"
          style={{
            borderRadius: "var(--radius-sm, 0.5rem)",
            background: dragging
              ? "var(--color-accent-light)"
              : "var(--color-surface-secondary)",
            border: "1px solid",
            borderColor: dragging
              ? "var(--color-accent-subtle)"
              : "var(--color-border)",
          }}
        >
          <Icon
            className="w-4 h-4 transition-colors duration-200"
            style={{
              color: dragging
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
            }}
          />
        </span>
        <span className="flex flex-col items-center gap-1">
          <span
            className="text-sm font-medium transition-colors duration-200"
            style={{
              color: dragging
                ? "var(--color-text-primary)"
                : "var(--color-text-secondary)",
            }}
          >
            {dragging ? "Drop to upload" : "Drop files here or click to browse"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {sublabel ?? "PNG, JPG, WEBP — max 10 MB"}
          </span>
        </span>
      </span>
    );
  })();

  return (
    <span className={cn("flex flex-col w-full", className)} aria-live="polite">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={getAccept(resourceType)}
        multiple={multiple}
      />

      {/* dropzone */}
      <span
        role="button"
        tabIndex={0}
        aria-busy={uploading}
        aria-label={
          uploading
            ? `Uploading, ${progress}% complete`
            : "Upload area — click or drop files here"
        }
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          !uploading &&
          fileInputRef.current?.click()
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex items-center justify-center w-full min-h-[140px]",
          "border-2 border-dashed transition-all duration-200 select-none",
          "rounded-[var(--radius-md,0.75rem)]",
          // Keyboard focus ring (replaces the removed outline-none)
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
        )}
        style={zoneStyle()}
        onMouseEnter={(e) => {
          if (!uploading && !done && !dragging) {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--color-border-strong)";
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-surface-secondary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!uploading && !done && !dragging) {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--color-border)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {innerContent}
      </span>

      {/* Hard upload error */}
      {localError && (
        <span
          role="alert"
          className="flex items-center gap-1.5 mt-2"
        >
          <X
            className="w-3 h-3 shrink-0"
            style={{ color: "var(--color-danger)" }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--color-danger)" }}
          >
            {localError}
          </span>
        </span>
      )}

      {/* Per-file rejection reasons */}
      {rejected.length > 0 && (
        <ul role="list" aria-label="Rejected files" className="flex flex-col gap-1 mt-2">
          {rejected.map(({ name, reason }) => (
            <li
              key={name}
              className="flex items-start gap-1.5"
            >
              <Ban
                className="w-3 h-3 mt-0.5 shrink-0"
                style={{ color: "var(--color-danger)" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--color-danger)" }}
              >
                <span className="font-semibold">{name}</span> — {reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}