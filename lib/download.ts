export const getDownloadUrl = (
  url: string,
  filename?: string
) => {
  if (!url) return "";

  const safeName = (filename || "download")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return url.replace(
    "/upload/",
    `/upload/fl_attachment:${safeName}/`
  );
};
