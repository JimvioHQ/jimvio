"use client";

import { useState, useCallback, useRef } from "react";
import type { CloudinaryFolder } from "@/services/media/cloudinary";

export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  accessType: "public" | "private" | "authenticated";
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
}

export interface UploadError {
  error: string;
}

export type UploadOutcome = UploadResult | UploadError;

export type AccessType = "public" | "private" | "authenticated";

interface UseCloudinaryUploadReturn {
  upload: (
    file: File,
    resourceType?: "image" | "video" | "raw",
    accessType?: AccessType,
  ) => Promise<UploadOutcome>;
  uploading: boolean;
  progress: number;
  error: string | null;
  cancelUpload: (() => void) | null;
  reset: () => void;
}

export function useCloudinaryUpload(
  folder: CloudinaryFolder = "jimvio/products",
): UseCloudinaryUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so cancelUpload() always closes over the current XHR,
  // even if the component re-renders mid-upload.
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const cancelUpload = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
  }, []);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (
      file: File,
      resourceType: "image" | "video" | "raw" = file.type.startsWith("video/") ? "video" : "image",
      accessType: AccessType = "public",
    ): Promise<UploadOutcome> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      const fail = (msg: string): UploadError => {
        setError(msg);
        return { error: msg };
      };

      try {
        // ── 1. Get signed upload params from the server ──────────────────────
        // The server is responsible for appending `type` to the signature so
        // Cloudinary honours the access-control setting.
        const sigRes = await fetch("/api/uploads/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder, accessType }),
        });

        if (!sigRes.ok) {
          const j = await sigRes.json().catch(() => ({}));
          return fail(j?.error ?? "Failed to get upload signature");
        }

        const { data: sig } = await sigRes.json();

        // ── 2. Build the multipart form ──────────────────────────────────────
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sig.apiKey);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature);
        formData.append("folder", sig.folder);

        // `type` controls Cloudinary delivery:
        //   "upload"         → public (default)
        //   "private"        → private (opaque URL, requires server-signed link)
        //   "authenticated"  → authenticated (Cloudinary access control)
        const cloudinaryType =
          accessType === "public" ? "upload" : accessType;
        formData.append("type", cloudinaryType);

        const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

        // ── 3. XHR upload with progress + cancel support ─────────────────────
        const result = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.open("POST", endpoint);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            xhrRef.current = null;
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve({
                url: data.secure_url,
                publicId: data.public_id,
                resourceType: data.resource_type,
                accessType,
                width: data.width,
                height: data.height,
                format: data.format,
                bytes: data.bytes,
                duration: data.duration,
              });
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err?.error?.message ?? "Upload failed"));
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          };

          xhr.onabort = () => {
            xhrRef.current = null;
            reject(new Error("Upload cancelled"));
          };

          xhr.onerror = () => {
            xhrRef.current = null;
            reject(new Error("Network error during upload"));
          };

          xhr.send(formData);
        });

        setProgress(100);
        return result;

      } catch (err: any) {
        return fail(err?.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [folder],
  );

  return {
    upload,
    uploading,
    progress,
    error,
    // Null when nothing is in-flight, so components can hide the cancel button.
    cancelUpload: uploading ? cancelUpload : null,
    reset,
  };
}