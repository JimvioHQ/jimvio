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

//     // reset so same file can be re-selected
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
//         className={cn(
//           "inline-flex items-center gap-2 h-9 px-4 rounded-xl border text-xs font-semibold transition-all duration-200",
//           done
//             ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
//             : uploading
//             ? "bg-[#1A1A1A] border-[#2A2A2A] text-zinc-500 cursor-wait"
//             : "bg-[#1A1A1A] border-[#2A2A2A] text-zinc-300 hover:text-white hover:border-[#333] hover:bg-[#222]"
//         )}
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
//         <div className="h-0.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
//           <div
//             className="h-full bg-orange-500 rounded-full transition-all duration-300"
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       )}

//       {error && (
//         <p className="text-[10px] text-rose-400 font-medium">{error}</p>
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
//     // only fire when leaving the dropzone itself, not child elements
//     if (!e.currentTarget.contains(e.relatedTarget as Node)) {
//       setDragging(false);
//     }
//   };

//   /* ── inner content — uses only <span> so it's safe inside <p> ── */
//   const Icon = getIcon(resourceType);

//   const innerContent = (() => {
//     if (uploading) {
//       return (
//         <span className="flex flex-col items-center gap-3">
//           {/* circular progress ring */}
//           <span className="relative w-10 h-10 flex items-center justify-center">
//             <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" width="40" height="40">
//               <circle cx="20" cy="20" r="16" fill="none" stroke="#1E1E1E" strokeWidth="3" />
//               <circle
//                 cx="20" cy="20" r="16" fill="none"
//                 stroke="#f97316" strokeWidth="3"
//                 strokeLinecap="round"
//                 strokeDasharray={`${2 * Math.PI * 16}`}
//                 strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
//                 style={{ transition: "stroke-dashoffset 0.3s ease" }}
//               />
//             </svg>
//             <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
//           </span>
//           <span className="flex flex-col items-center gap-1">
//             <span className="text-sm font-semibold text-white tabular-nums">{progress}%</span>
//             <span className="text-xs text-zinc-500">Uploading…</span>
//           </span>
//         </span>
//       );
//     }

//     if (done) {
//       return (
//         <span className="flex flex-col items-center gap-3">
//           <span className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
//             <CheckCircle2 className="w-5 h-5 text-emerald-400" />
//           </span>
//           <span className="text-sm font-semibold text-emerald-400">Uploaded successfully</span>
//         </span>
//       );
//     }

//     /* default / drag state */
//     if (label) {
//       // caller passed a custom label — render it directly
//       // wrap in a span so block-level children don't cause hydration issues
//       return <span className="flex flex-col items-center">{label}</span>;
//     }

//     return (
//       <span className="flex flex-col items-center gap-3">
//         <span className={cn(
//           "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200",
//           dragging ? "bg-orange-600/20" : "bg-[#1A1A1A]"
//         )}>
//           <Icon className={cn(
//             "w-4 h-4 transition-colors duration-200",
//             dragging ? "text-orange-400" : "text-zinc-500"
//           )} />
//         </span>
//         <span className="flex flex-col items-center gap-1">
//           <span className={cn(
//             "text-sm font-medium transition-colors duration-200",
//             dragging ? "text-white" : "text-zinc-400"
//           )}>
//             {dragging ? "Drop to upload" : "Drop files here or click to browse"}
//           </span>
//           <span className="text-xs text-zinc-600">
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
//         className={cn(
//           "flex items-center justify-center w-full min-h-[140px] rounded-xl border-2 border-dashed",
//           "transition-all duration-200 select-none",
//           uploading
//             ? "border-orange-500/30 bg-orange-500/3 cursor-wait"
//             : done
//             ? "border-emerald-500/30 bg-emerald-500/3 cursor-default"
//             : dragging
//             ? "border-orange-500/50 bg-orange-500/5 cursor-copy"
//             : "border-[#1E1E1E] bg-transparent hover:border-[#2A2A2A] hover:bg-[#0D0D0D] cursor-pointer"
//         )}
//       >
//         {innerContent}
//       </span>

//       {/* error */}
//       {error && (
//         <span className="flex items-center gap-1.5 mt-2">
//           <X className="w-3 h-3 text-rose-500 shrink-0" />
//           <span className="text-[10px] text-rose-400 font-medium">{error}</span>
//         </span>
//       )}
//     </span>
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
        className="inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold transition-all duration-200 outline-none"
        style={{
          borderRadius: "var(--radius-sm, 0.5rem)",
          border: "1px solid",
          borderColor: done
            ? "var(--color-success)"
            : "var(--color-border)",
          background: done
            ? "var(--color-success-light)"
            : "var(--color-surface-secondary)",
          color: done
            ? "var(--color-success)"
            : uploading
              ? "var(--color-text-muted)"
              : "var(--color-text-secondary)",
          cursor: uploading ? "wait" : "pointer",
          opacity: uploading && !done ? 0.7 : 1,
        }}
        onMouseEnter={e => {
          if (!uploading && !done) {
            e.currentTarget.style.borderColor = "var(--color-border-strong)";
            e.currentTarget.style.color = "var(--color-text-primary)";
          }
        }}
        onMouseLeave={e => {
          if (!uploading && !done) {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }
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

      {/* Progress bar */}
      {uploading && (
        <div
          className="h-0.5 w-full rounded-full overflow-hidden"
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
      )}

      {error && (
        <p className="text-[10px] font-medium" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
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
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  const Icon = getIcon(resourceType);

  /* ── dropzone border/bg style based on state ── */
  const zoneStyle = (): React.CSSProperties => {
    if (uploading) return {
      borderColor: "var(--color-accent)",
      background: "var(--color-accent-light)",
      cursor: "wait",
    };
    if (done) return {
      borderColor: "var(--color-success)",
      background: "var(--color-success-light)",
      cursor: "default",
    };
    if (dragging) return {
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
          {/* circular progress ring */}
          <span className="relative w-10 h-10 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" width="40" height="40">
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="3"
              />
              <circle
                cx="20" cy="20" r="16"
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
          <span className="flex flex-col items-center gap-1">
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {progress}%
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Uploading…
            </span>
          </span>
        </span>
      );
    }

    if (done) {
      return (
        <span className="flex flex-col items-center gap-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-success-light)" }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--color-success)" }} />
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
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
            background: dragging ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
            border: "1px solid",
            borderColor: dragging ? "var(--color-accent-subtle)" : "var(--color-border)",
          }}
        >
          <Icon
            className="w-4 h-4 transition-colors duration-200"
            style={{ color: dragging ? "var(--color-accent)" : "var(--color-text-muted)" }}
          />
        </span>
        <span className="flex flex-col items-center gap-1">
          <span
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: dragging ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
          >
            {dragging ? "Drop to upload" : "Drop files here or click to browse"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
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
        className="flex items-center justify-center w-full min-h-[140px] border-2 border-dashed transition-all duration-200 select-none outline-none"
        style={{
          borderRadius: "var(--radius-md, 0.75rem)",
          ...zoneStyle(),
        }}
        onMouseEnter={e => {
          if (!uploading && !done && !dragging) {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)";
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)";
          }
        }}
        onMouseLeave={e => {
          if (!uploading && !done && !dragging) {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {innerContent}
      </span>

      {/* error */}
      {error && (
        <span className="flex items-center gap-1.5 mt-2">
          <X className="w-3 h-3 shrink-0" style={{ color: "var(--color-danger)" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--color-danger)" }}>
            {error}
          </span>
        </span>
      )}
    </span>
  );
}