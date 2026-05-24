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
window.location.href = downloadUrl;
};
