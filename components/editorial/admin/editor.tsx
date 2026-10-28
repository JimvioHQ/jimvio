"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveMediaArticle } from "@/lib/editorial/actions";
import { RichTextEditor } from "@/components/editorial/admin/rich-text";
import styles from "@/components/editorial/editorial.module.css";
import { MEDIA_CATEGORIES, MEDIA_SECTIONS, type AdminArticle, type ArticleInput, type FieldErrors, type MediaStatus } from "@/lib/editorial/types";
import { MAX_IMAGE_BYTES } from "@/lib/editorial/images";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import { statusLabel } from "@/lib/editorial/status";
import { categoryLabel } from "@/lib/editorial/validate";

const TABS = ["Content", "SEO", "Settings", "Preview"] as const;
type Tab = (typeof TABS)[number];

const SECTION_LABELS: Record<(typeof MEDIA_SECTIONS)[number], string> = {
  hero: "Hero",
  featured: "Featured rail",
  news: "Latest news",
  magazine: "Magazine",
  guide: "Guides",
  standard: "Category only",
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ArticleEditor({
  article,
  suggestedAuthor,
  audit,
}: {
  article: AdminArticle | null;
  suggestedAuthor: string | null;
  audit: { id: string; action: string; createdAt: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("Content");
  const [confirm, setConfirm] = useState<null | "publish" | "unpublish" | "archive" | "restore">(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [uploadError, setUploadError] = useState("");
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [bodyHtml, setBodyHtml] = useState(article?.bodyHtml ?? "");
  const [category, setCategory] = useState<string>(article?.category ?? "news");
  const [kicker, setKicker] = useState(article?.kicker ?? "");
  const [imageUrl, setImageUrl] = useState(article?.imageUrl ?? "");
  const [imageAlt, setImageAlt] = useState(article?.imageAlt ?? "");
  const [section, setSection] = useState<string>(article?.section ?? "standard");
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "");
  const [seoTitle, setSeoTitle] = useState(article?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(article?.seoDescription ?? "");
  const [authorName, setAuthorName] = useState(article?.authorName ?? suggestedAuthor ?? "");
  const [scheduledAt, setScheduledAt] = useState(article?.scheduledAt ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [sourceName, setSourceName] = useState(article?.sourceName ?? "");
  const [sourceUrl, setSourceUrl] = useState(article?.sourceUrl ?? "");
  const [correctionNote, setCorrectionNote] = useState(article?.correctionNote ?? "");
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(article?.updatedAt ?? "");
  const [idempotencyKey] = useState(() => globalThis.crypto?.randomUUID?.() ?? "");

  const input: ArticleInput = {
    title,
    excerpt,
    bodyHtml,
    category,
    kicker,
    imageUrl,
    imageAlt,
    section,
    tags,
    seoTitle,
    seoDescription,
    authorName,
    scheduledAt,
    slug,
    expectedUpdatedAt,
    idempotencyKey: article ? undefined : idempotencyKey,
    sourceName,
    sourceUrl,
    correctionNote,
  };

  function save(intent: MediaStatus) {
    setError("");
    setConflict(false);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveMediaArticle(article?.id ?? null, input, intent);
      if (!result.ok) {
        setError(result.error);
        setConflict(Boolean(result.conflict));
        setFieldErrors(result.fieldErrors ?? {});
        if (
          result.fieldErrors?.slug ||
          result.fieldErrors?.scheduledAt ||
          result.fieldErrors?.sourceName ||
          result.fieldErrors?.sourceUrl ||
          result.fieldErrors?.correctionNote
        ) {
          setTab("Settings");
        }
        setConfirm(null);
        return;
      }
      setConfirm(null);
      setSlug(result.slug);
      setExpectedUpdatedAt(result.updatedAt);
      if (!article) router.push(`/media/admin/articles/${result.id}`);
      else router.refresh();
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Images must be 4 MB or smaller.");
      return;
    }
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/media/images", { method: "POST", body });
    const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !payload?.url) {
      setUploadError(payload?.error || "The image could not be uploaded. Use a JPEG, PNG, WebP, or GIF under 4 MB, or paste an https URL.");
      return;
    }
    setImageUrl(payload.url);
    if (!imageAlt) setImageAlt(title);
  }

  const fieldClass = "mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3 text-sm outline-none focus:border-[#fd5000]";
  const previewHtml = sanitizeArticleHtml(bodyHtml);

  return (
    <div className="rounded-2xl border border-[#eceff3] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#141820]">
            {article ? "Edit article" : "Create / Edit Article"}
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            {article ? `Status: ${statusLabel(article.status)}` : "Drafts stay private until you publish."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {article?.status === "archived" ? (
            <button type="button" disabled={pending} onClick={() => setConfirm("restore")} className="h-10 rounded-lg border border-[#e6e8ee] bg-white px-4 text-sm font-semibold text-[#172033] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] disabled:opacity-60">
              Restore to draft
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => save(article?.status === "published" ? "published" : "draft")}
              className="h-10 rounded-lg border border-[#e6e8ee] bg-white px-4 text-sm font-semibold text-[#172033] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] disabled:opacity-60"
            >
              {article?.status === "published" ? "Save changes" : "Save Draft"}
            </button>
          )}
          {article && article.status !== "archived" ? (
            <button type="button" disabled={pending} onClick={() => setConfirm("archive")} className="h-10 rounded-lg border border-[#e6e8ee] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]">
              Archive
            </button>
          ) : null}
          {article?.status === "published" ? (
            <button type="button" disabled={pending} onClick={() => setConfirm("unpublish")} className="h-10 rounded-lg border border-[#e6e8ee] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]">
              Unpublish
            </button>
          ) : article?.status === "archived" ? null : (
            <>
              {article?.status === "draft" ? (
                <button type="button" disabled={pending} onClick={() => save("review")} className="h-10 rounded-lg border border-[#e6e8ee] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]">
                  Send to review
                </button>
              ) : null}
              <button type="button" disabled={pending} onClick={() => save("scheduled")} className="h-10 rounded-lg border border-[#e6e8ee] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]">
                Schedule
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirm("publish")} className="h-10 rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] disabled:opacity-60">
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      {confirm ? (
        <div className="mt-4 rounded-xl border border-[#ffd7c2] bg-[#fff7f2] px-4 py-3 text-sm text-[#7a3416]">
          <p className="font-semibold">
            {confirm === "publish"
              ? "Publish this story now?"
              : confirm === "archive"
                ? "Archive this story?"
                : confirm === "restore"
                  ? "Restore this story to a draft?"
                  : "Move this story back to draft?"}
          </p>
          <p className="mt-1">
            {confirm === "publish"
              ? "It will appear on Jimvio Media for every visitor."
              : confirm === "archive"
                ? "It will leave the public site. You can restore it to a draft later."
                : confirm === "restore"
                  ? "It stays private until you publish it again."
                  : "It will leave the public site and stay in drafts."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                save(confirm === "publish" ? "published" : confirm === "archive" ? "archived" : "draft")
              }
              className="h-9 rounded-lg bg-[#fd5000] px-3 text-sm font-semibold text-white"
            >
              {confirm === "publish" ? "Publish" : confirm === "archive" ? "Archive" : confirm === "restore" ? "Restore" : "Unpublish"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-lg border border-[#e6e8ee] bg-white px-3 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-4 rounded-lg bg-[#fff1f1] px-3 py-2 text-sm text-[#b42318]">
          <p>{error}</p>
          {conflict ? (
            <button type="button" onClick={() => window.location.reload()} className="mt-2 font-semibold underline">
              Reload the latest version
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex gap-5 border-b border-[#eceff3] text-sm font-semibold">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`border-b-2 pb-2 ${tab === item ? "border-[#fd5000] text-[#fd5000]" : "border-transparent text-[#667085]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Content" ? (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-[#172033]">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a compelling title..." className={fieldClass} />
            {fieldErrors.title ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.title}</span> : null}
          </label>
          <label className="block text-sm font-semibold text-[#172033]">
            Excerpt
            <textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="Write a short summary..." className="mt-1 min-h-20 w-full rounded-lg border border-[#e6e8ee] px-3 py-2 text-sm outline-none focus:border-[#fd5000]" />
            {fieldErrors.excerpt ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.excerpt}</span> : null}
          </label>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#172033]">Featured Image</p>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-[#e6e8ee] px-3 text-sm font-semibold">
                Change Image
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => onFile(event.target.files?.[0])} />
              </label>
            </div>
            {imageUrl ? (
              // Editorial previews use the stored URL directly so a rejected upload never renders.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={imageAlt || ""} className="mt-3 aspect-[16/7] w-full rounded-xl object-cover" />
            ) : (
              <div className="mt-3 flex aspect-[16/7] items-center justify-center rounded-xl bg-[#f4f5f7] text-sm text-[#98a2b3]">
                No image selected
              </div>
            )}
            <label className="mt-3 block text-sm font-semibold text-[#172033]">
              Image URL
              <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://" className={fieldClass} />
            </label>
            <label className="mt-3 block text-sm font-semibold text-[#172033]">
              Image description
              <input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} className={fieldClass} />
            </label>
            {fieldErrors.imageUrl ? <p className="mt-1 text-xs font-medium text-[#b42318]">{fieldErrors.imageUrl}</p> : null}
            {uploadError ? <p className="mt-1 text-xs font-medium text-[#b42318]">{uploadError}</p> : null}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-[#172033]">Content</p>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
            {fieldErrors.bodyHtml ? <p className="mt-1 text-xs font-medium text-[#b42318]">{fieldErrors.bodyHtml}</p> : null}
          </div>
        </div>
      ) : null}

      {tab === "SEO" ? (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            SEO title
            <input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className={fieldClass} />
            <span className="mt-1 block text-xs font-medium text-[#667085]">{seoTitle.trim().length}/70</span>
            {fieldErrors.seoTitle ? <span className="text-xs text-[#b42318]">{fieldErrors.seoTitle}</span> : null}
          </label>
          <label className="block text-sm font-semibold">
            SEO description
            <textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-[#e6e8ee] px-3 py-2 text-sm outline-none focus:border-[#fd5000]" />
            <span className="mt-1 block text-xs font-medium text-[#667085]">{seoDescription.trim().length}/160</span>
            {fieldErrors.seoDescription ? <span className="text-xs text-[#b42318]">{fieldErrors.seoDescription}</span> : null}
          </label>
          <div className="rounded-xl border border-[#eceff3] bg-[#fafbfc] p-4">
            <p className="text-xs uppercase tracking-wide text-[#667085]">Search preview</p>
            <p className="mt-2 text-lg text-[#1a46c4]">{seoTitle || title || "Article title"}</p>
            <p className="text-sm text-[#067647]">jimvio.com/media/article/{slug || article?.slug || "story"}</p>
            <p className="mt-1 text-sm text-[#475467]">{seoDescription || excerpt || "The excerpt appears here."}</p>
          </div>
        </div>
      ) : null}

      {tab === "Settings" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value as ArticleInput["category"])} className={fieldClass}>
              {MEDIA_CATEGORIES.map((item) => (
                <option key={item.slug} value={item.slug}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Homepage section
            <select value={section} onChange={(event) => setSection(event.target.value as ArticleInput["section"])} className={fieldClass}>
              {MEDIA_SECTIONS.map((item) => (
                <option key={item} value={item}>{SECTION_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Internal label
            <input value={kicker} onChange={(event) => setKicker(event.target.value)} placeholder="Not shown on the public site" className={fieldClass} />
            <span className="mt-1 block text-xs font-medium text-[#667085]">Public cards use the category name.</span>
          </label>
          <label className="text-sm font-semibold">
            Internal attribution
            <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} className={fieldClass} />
            <span className="mt-1 block text-xs font-medium text-[#667085]">Not shown on the public site.</span>
            {fieldErrors.authorName ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.authorName}</span> : null}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Address
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Generated from the title until you set one"
              className={fieldClass}
              spellCheck={false}
            />
            {fieldErrors.slug ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.slug}</span> : null}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Tags
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="markets, founders" className={fieldClass} />
            {fieldErrors.tags ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.tags}</span> : null}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Source name
            <input
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="Leave blank for reporting without an external source"
              className={fieldClass}
            />
            <span className="mt-1 block text-xs font-medium text-[#667085]">{sourceName.trim().length}/120</span>
            {fieldErrors.sourceName ? <span className="text-xs font-medium text-[#b42318]">{fieldErrors.sourceName}</span> : null}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Source link
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://"
              inputMode="url"
              spellCheck={false}
              className={fieldClass}
            />
            {fieldErrors.sourceUrl ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.sourceUrl}</span> : null}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Update note
            <textarea
              value={correctionNote}
              onChange={(event) => setCorrectionNote(event.target.value)}
              placeholder="Shown on the story after a correction. Leave blank when nothing changed."
              className="mt-1 min-h-24 w-full rounded-lg border border-[#e6e8ee] px-3 py-2 text-sm outline-none focus:border-[#fd5000]"
            />
            <span className="mt-1 block text-xs font-medium text-[#667085]">{correctionNote.trim().length}/500</span>
            {fieldErrors.correctionNote ? <span className="text-xs font-medium text-[#b42318]">{fieldErrors.correctionNote}</span> : null}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Schedule time
            <input
              type="datetime-local"
              suppressHydrationWarning
              value={toLocalInput(scheduledAt)}
              onChange={(event) => {
                const next = event.target.value;
                setScheduledAt(next ? new Date(next).toISOString() : "");
              }}
              className={fieldClass}
            />
            {fieldErrors.scheduledAt ? <span className="mt-1 block text-xs font-medium text-[#b42318]">{fieldErrors.scheduledAt}</span> : null}
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={pending || !article || article.status === "published" || article.status === "archived"}
              onClick={() => save("review")}
              className="h-10 rounded-lg border border-[#e6e8ee] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] disabled:opacity-50"
            >
              Send to review
            </button>
            {!article ? <p className="mt-2 text-xs text-[#667085]">Save a draft before sending it for review.</p> : null}
            {article?.status === "published" || article?.status === "archived" ? (
              <p className="mt-2 text-xs text-[#667085]">Unpublish or restore the story before sending it back to review.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "Preview" ? (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#fd5000]">{categoryLabel(category)}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{title || "Untitled story"}</h2>
          <p className="mt-3 text-[#4b5568]">{excerpt}</p>
          <div className={`${styles.body} mt-6 text-[16px]`} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          {sourceName.trim() || sourceUrl.trim() ? (
            <p className="mt-4 text-sm text-[#667085]">Source: {sourceName.trim() || sourceUrl.trim()}</p>
          ) : null}
          {correctionNote.trim() ? <p className="mt-2 text-sm text-[#475467]">Update. {correctionNote.trim()}</p> : null}
          {article ? (
            <Link href={`/media/preview/${article.id}`} className="mt-6 inline-flex text-sm font-semibold text-[#3b5ccc]">
              Open reader preview
            </Link>
          ) : null}
        </div>
      ) : null}

      {audit.length > 0 ? (
        <section className="mt-8 border-t border-[#eceff3] pt-4">
          <h2 className="text-sm font-bold text-[#172033]">Publishing history</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {audit.map((entry) => (
              <li key={entry.id}>
                <time dateTime={entry.createdAt}>
                  {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(entry.createdAt))} UTC
                </time>
                <span> · {entry.action.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
