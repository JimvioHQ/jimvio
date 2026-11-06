import { redirect } from "next/navigation";

/**
 * All conversations — community DMs, direct messages and marketplace
 * (buyer ↔ store) chats — live in one inbox at /communities/messages.
 * Older links (?conversation=, ?vendor=, ?thread=) keep working.
 */
export default async function MessagesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kept = new URLSearchParams();
  for (const key of ["thread", "conversation", "vendor"] as const) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first && /^[0-9a-f-]{36}$/i.test(first)) kept.set(key, first);
  }
  const query = kept.toString();
  redirect(`/communities/messages${query ? `?${query}` : ""}`);
}
