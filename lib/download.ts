export const getDownloadUrl = (
  url: string,
  filename?: string
) => {
  if (!url) return "";

  const cleanUrl = url.split("?")[0];

  const safeName = (filename || "download")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return cleanUrl.replace(
    "/upload/",
    `/upload/fl_attachment:${safeName}/`
  );
};
