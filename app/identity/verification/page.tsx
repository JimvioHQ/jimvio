import { redirect } from "next/navigation";

export const metadata = { title: "Verification" };

export default async function IdentityVerificationRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  redirect(`/settings/verification${suffix}`);
}
