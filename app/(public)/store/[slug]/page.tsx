import { redirect } from "next/navigation";

/** Alias for creator storefronts — admin/order links sometimes use /store/[slug]. */
export default async function StoreAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/vendors/${slug}`);
}
