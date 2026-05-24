export const getDownloadUrl = (
  url: string,
  filename?: string
) => {
  if (!url) return "";

  const cleanUrl = url.split("?")[0];

  if (!filename) {
    return cleanUrl.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );
  }

  const safeName = filename
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");

  return cleanUrl.replace(
    "/upload/",
    `/upload/fl_attachment:${safeName}/`
  );
};
