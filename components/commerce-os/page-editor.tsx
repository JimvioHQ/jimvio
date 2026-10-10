"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PageEditor({
  storeId,
  page,
  viewHref,
}: {
  storeId: string;
  viewHref: string;
  page: {
    id: string;
    title: string;
    handle: string;
    body_html: string;
    published: boolean;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body_html || "");
  const [published, setPublished] = useState(page.published);
  const [savedTitle, setSavedTitle] = useState(page.title);
  const [savedBody, setSavedBody] = useState(page.body_html || "");
  const [savedPublished, setSavedPublished] = useState(page.published);
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    title !== savedTitle || body !== savedBody || published !== savedPublished;

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function save(nextPublished: boolean) {
    setPending(nextPublished ? "publish" : "draft");
    setError(null);
    setMessage(null);
    const res = await fetch("/api/commerce/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        pageId: page.id,
        title,
        body_html: body,
        published: nextPublished,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Could not save this page.");
      return;
    }
    const saved = json.page as { title?: string; body_html?: string; published?: boolean };
    const nextTitle = saved.title || title;
    const nextBody = typeof saved.body_html === "string" ? saved.body_html : body;
    const nextStatus = Boolean(saved.published);
    setTitle(nextTitle);
    setBody(nextBody);
    setPublished(nextStatus);
    setSavedTitle(nextTitle);
    setSavedBody(nextBody);
    setSavedPublished(nextStatus);
    setMessage(nextStatus ? "Published." : "Draft saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            {page.handle}
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            {published ? "Published" : "Draft"}
            {dirty ? " · Unsaved changes" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/commerce/pages"
            onClick={(event) => {
              if (dirty && !window.confirm("Leave this page without saving changes?")) {
                event.preventDefault();
              }
            }}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]"
          >
            Back
          </Link>
          <a
            href={viewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827]"
          >
            View
          </a>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void save(false)}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#E5E7EB] px-3 text-sm font-semibold text-[#111827] disabled:opacity-60"
          >
            {pending === "draft" ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void save(true)}
            className="inline-flex min-h-10 items-center rounded-lg bg-[#FF5A1F] px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending === "publish" ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#374151]">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#FF5A1F]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#374151]">Content</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm leading-6 text-[#111827] outline-none focus:border-[#FF5A1F]"
        />
      </label>
      <p className="text-xs text-[#6B7280]">
        Sections marked for the merchant to complete should be filled in before publishing a commitment.
      </p>
    </div>
  );
}
