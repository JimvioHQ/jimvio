import { permanentRedirect } from "next/navigation";
import { ownerConsoleHref } from "@/lib/community/owner-console/nav";

/** Legacy /groups → /spaces */
export default async function OwnerConsoleGroupsRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ communitySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { communitySlug } = await params;
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action : undefined;
  permanentRedirect(
    ownerConsoleHref(communitySlug, "spaces", action ? { action } : undefined)
  );
}
