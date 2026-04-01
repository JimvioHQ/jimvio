/**
 * hooks/use-cloudinary-upload.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Universal Cloudinary upload hook for client components.
 *
 * Usage:
 *   const { upload, uploading, progress, error } = useCloudinaryUpload("jimvio/products");
 *   const result = await upload(file);  // → { url, publicId }
 *
 * How it works:
 *   1. Calls /api/uploads/signature (authenticated) to get a signed set of params
 *   2. Posts the file DIRECTLY to Cloudinary (file never goes through your server)
 *   3. Returns the secure_url + public_id for you to save in your DB
 */
"use client";

import { useState, useCallback } from "react";
import type { CloudinaryFolder } from "@/services/media/cloudinary";

export interface UploadResult {
  url:        string;
  publicId:   string;
  resourceType: "image" | "video" | "raw";
  width?:     number;
  height?:    number;
  format?:    string;
  bytes?:     number;
  duration?:  number;
}

interface UseCloudinaryUploadReturn {
  upload:    (file: File, resourceType?: "image" | "video" | "raw") => Promise<UploadResult | null>;
  uploading: boolean;
  progress:  number;
  error:     string | null;
  reset:     () => void;
}

export function useCloudinaryUpload(
  folder: CloudinaryFolder = "jimvio/products"
): UseCloudinaryUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (
      file: File,
      resourceType: "image" | "video" | "raw" = file.type.startsWith("video/") ? "video" : "image"
    ): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // 1️⃣  Get signed upload params from the server
        const sigRes = await fetch("/api/uploads/signature", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ folder }),
        });

        if (!sigRes.ok) {
          const j = await sigRes.json().catch(() => ({}));
          throw new Error(j?.error ?? "Failed to get upload signature");
        }

        const { data: sig } = await sigRes.json();

        // 2️⃣  Build form data
        const formData = new FormData();
        formData.append("file",      file);
        formData.append("api_key",   sig.apiKey);
        formData.append("timestamp", sig.timestamp);
        formData.append("signature", sig.signature);
        formData.append("folder",    sig.folder);

        const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

        // 3️⃣  XHR so we can track progress
        const result = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", endpoint);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve({
                url:          data.secure_url,
                publicId:     data.public_id,
                resourceType: data.resource_type,
                width:        data.width,
                height:       data.height,
                format:       data.format,
                bytes:        data.bytes,
                duration:     data.duration,
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

          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(formData);
        });

        setProgress(100);
        return result;
      } catch (err: any) {
        const msg = err?.message ?? "Upload failed";
        setError(msg);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [folder]
  );

  return { upload, uploading, progress, error, reset };
}
