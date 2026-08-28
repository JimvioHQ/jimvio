"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type SearchGroup = {
  campaigns?: Array<{ id: string; title: string; status?: string }>;
  creators?: Array<{ id: string; display_name?: string; username?: string }>;
  brands?: Array<{ id: string; business_name?: string }>;
  library?: Array<{ id: string; title?: string | null; file_url?: string }>;
  invitations?: Array<{ id: string; invitee_username?: string | null; status?: string }>;
  applications?: Array<{ id: string; campaign_id?: string; status?: string }>;
};

export function UGCGlobalSearchPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);
  const [data, setData] = useState<SearchGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    if (!query.trim()) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/search?q=${encodeURIComponent(query.trim())}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("search failed");
      const json = await res.json();
      setData(json.data ?? json);
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (submitted.trim()) void load(submitted);
  }, [submitted, load]);

  const hasResults =
    data &&
    [
      data.campaigns,
      data.creators,
      data.brands,
      data.library,
      data.invitations,
      data.applications,
    ].some((arr) => (arr?.length ?? 0) > 0);

  return (
    <UGCPageShell
      titleKey="search"
      subtitleKey="searchSubtitle"
    >
      <UGCFilterBar
        search={q}
        onSearchChange={setQ}
      >
        <Button
          className="rounded-xl bg-[#FF5A1F] hover:bg-[#E54E18]"
          onClick={() => setSubmitted(q)}
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </UGCFilterBar>

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={() => void load(submitted)} /> : null}
      {!loading && !error && !submitted.trim() ? (
        <UGCPageEmpty
          title="Search the UGC workspace"
          description="Type a keyword to search across campaigns, creators, and more."
        />
      ) : null}
      {!loading && !error && submitted.trim() && !hasResults ? (
        <UGCPageEmpty
          title="No results"
          description={`Nothing matched “${submitted.trim()}”.`}
        />
      ) : null}

      {!loading && !error && hasResults && data ? (
        <div className="space-y-4">
          {(data.campaigns?.length ?? 0) > 0 ? (
            <Section title="Campaigns">
              {data.campaigns!.map((c) => (
                <Row key={c.id} href={`/ugc/${c.id}`} title={c.title} meta={c.status} />
              ))}
            </Section>
          ) : null}
          {(data.creators?.length ?? 0) > 0 ? (
            <Section title="Creators">
              {data.creators!.map((c) => (
                <Row
                  key={c.id}
                  title={c.display_name || c.username || "Creator"}
                  meta={c.username ? `@${c.username}` : undefined}
                />
              ))}
            </Section>
          ) : null}
          {(data.brands?.length ?? 0) > 0 ? (
            <Section title="Brands">
              {data.brands!.map((b) => (
                <Row key={b.id} title={b.business_name || "Brand"} />
              ))}
            </Section>
          ) : null}
          {(data.library?.length ?? 0) > 0 ? (
            <Section title="Library">
              {data.library!.map((item) => (
                <Row
                  key={item.id}
                  href={item.file_url}
                  title={item.title || item.file_url || "Asset"}
                  external
                />
              ))}
            </Section>
          ) : null}
          {(data.invitations?.length ?? 0) > 0 ? (
            <Section title="Invitations">
              {data.invitations!.map((i) => (
                <Row
                  key={i.id}
                  title={i.invitee_username || "Invitation"}
                  meta={i.status}
                />
              ))}
            </Section>
          ) : null}
          {(data.applications?.length ?? 0) > 0 ? (
            <Section title="Applications">
              {data.applications!.map((a) => (
                <Row
                  key={a.id}
                  href={a.campaign_id ? `/ugc/${a.campaign_id}` : undefined}
                  title={`Application ${a.id.slice(0, 8)}`}
                  meta={a.status}
                />
              ))}
            </Section>
          ) : null}
        </div>
      ) : null}
    </UGCPageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
      <h2 className="text-[14px] font-bold text-[#111827]">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({
  title,
  meta,
  href,
  external,
}: {
  title: string;
  meta?: string;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#F3F4F6] px-3 py-2.5">
      <p className="truncate text-[13px] font-semibold text-[#111827]">{title}</p>
      {meta ? <span className="shrink-0 text-[11px] text-[#6B7280]">{meta}</span> : null}
    </div>
  );
  if (!href) return inner;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className="block hover:opacity-90">
      {inner}
    </Link>
  );
}
