"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Details = {
  authorization_id: string;
  client: { name?: string; uri?: string; logo_uri?: string };
  redirect_uri: string;
  scope?: string;
};

export function OAuthConsentClient({ authorizationId }: { authorizationId: string }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          window.location.assign(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
          return;
        }
        const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (detailsError || !data) throw new Error(detailsError?.message || "Authorization request could not be loaded.");
        if (!("authorization_id" in data)) {
          window.location.assign(data.redirect_url);
          return;
        }
        if (!cancelled) setDetails(data as Details);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Authorization request failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authorizationId]);

  async function decide(decision: "approve" | "deny") {
    if (!details || pending) return;
    setPending(decision);
    setError(null);
    try {
      const supabase = createClient();
      if (decision === "approve") {
        const binding = await (supabase as unknown as {
          rpc: (name: string, args: Record<string, string>) => Promise<{ error: { message: string } | null }>;
        }).rpc("register_mcp_oauth_resource_binding", { p_authorization_id: authorizationId });
        if (binding.error) throw new Error(binding.error.message || "The MCP resource could not be bound to this authorization.");
      }
      const result = decision === "approve"
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      if (result.error || !result.data?.redirect_url) throw new Error(result.error?.message || "OAuth decision failed.");
      window.location.assign(result.data.redirect_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "OAuth decision failed.");
      setPending(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-14 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <section className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
        <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-lg font-black text-orange-600 dark:bg-orange-500/10">J</div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Jimvio · Secure authorization</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Connect Media Publisher</h1>
        {loading ? <p className="mt-5 text-sm text-zinc-500">Loading authorization details…</p> : null}
        {error ? <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
        {details ? (
          <>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              <strong>{details.client?.name || "An MCP client"}</strong> is requesting permission to use Jimvio Media editorial tools with your administrator account.
            </p>
            <div className="mt-6 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/70">
              <div><span className="font-semibold">Application</span><p className="mt-1 text-zinc-600 dark:text-zinc-300">{details.client?.name || "Unknown client"}</p></div>
              <div><span className="font-semibold">Redirect destination</span><p className="mt-1 break-all text-zinc-600 dark:text-zinc-300">{details.redirect_uri}</p></div>
              <div><span className="font-semibold">Requested scopes</span><p className="mt-1 text-zinc-600 dark:text-zinc-300">{details.scope || "No additional scopes supplied"}</p></div>
              <p className="border-t border-zinc-200 pt-3 text-xs leading-5 text-zinc-500 dark:border-zinc-700">Granting access permits this client to search, read, create and edit Media drafts, upload featured images, and request publication. Publishing requires a separate article-specific confirmation. Only platform administrators are accepted by the MCP server.</p>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" disabled={Boolean(pending)} onClick={() => void decide("deny")} className="h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700"> {pending === "deny" ? "Denying…" : "Deny"} </button>
              <button type="button" disabled={Boolean(pending)} onClick={() => void decide("approve")} className="h-11 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50">{pending === "approve" ? "Approving…" : "Approve access"}</button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
