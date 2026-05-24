export const getDownloadUrl = (
  url: string,
  filename?: string
): string => {
  if (!url) return "";

  const safeName = (filename || "download")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

if (url.includes("/raw/upload/")) {
  return url.replace(
    "/raw/upload/",
    `/raw/upload/fl_attachment:${safeName}/`
  );
}

  return url.replace(
    "/upload/",
    `/upload/fl_attachment:${safeName}/`
  );
};

export const triggerDownload = async (
  url: string,
  filename?: string
) => {
  const downloadUrl = getDownloadUrl(url, filename);

  const response = await fetch(downloadUrl);
  const blob = await response.blob();

  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename || "download";

  document.body.appendChild(a);
  a.click();

  a.remove();

  window.URL.revokeObjectURL(blobUrl);
};
