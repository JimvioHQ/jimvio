/**
 * Browser upload to the Supabase Storage `media` bucket via a server-issued
 * signed URL. Used when Cloudinary rejects a public upload.
 */
export type StorageUploadResult = { url: string; path: string; bytes: number };

export async function uploadToMediaStorage(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<StorageUploadResult> {
  const contentType = (file.type || "").toLowerCase();
  const res = await fetch("/api/uploads/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, contentType, size: file.size }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    signedUrl?: string;
    path?: string;
    publicUrl?: string;
    error?: string;
  };
  if (!res.ok || !json.signedUrl || !json.publicUrl || !json.path) {
    throw new Error(json.error || "Upload failed");
  }

  const form = new FormData();
  form.append("cacheControl", "31536000");
  form.append("", file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", json.signedUrl!);
    xhr.setRequestHeader("x-upsert", "false");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });

  return { url: json.publicUrl, path: json.path, bytes: file.size };
}
