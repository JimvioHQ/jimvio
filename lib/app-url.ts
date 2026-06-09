import { headers } from "next/headers";

export async function getPublicAppUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ?? headersList.get("host");
    const proto =
      headersList.get("x-forwarded-proto")?.split(",")[0].trim() ??
      (host?.startsWith("localhost") ? "http" : "https");

    if (host) return `${proto}://${host.replace(/\/$/, "")}`;
  } catch {
  }

  return "http://localhost:3000";
}