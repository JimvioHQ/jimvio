import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { adminListArticles, adminRecentMediaAudit } from "@/lib/editorial/admin-store";
import { parseDeskRange, summarizeDesk } from "@/lib/editorial/discover";
import { statusLabel } from "@/lib/editorial/status";

const AUDIT_LABELS: Record<string, string> = {
  media_draft: "Saved draft",
  media_review: "Sent to review",
  media_scheduled: "Scheduled",
  media_published: "Published",
  media_archived: "Archived",
  media_tag_removed: "Removed a tag",
};

function auditLabel(action: string) {
  return AUDIT_LABELS[action] ?? action.replaceAll("_", " ");
}

function formatAuditTime(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "Unknown time";
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(time))} UTC`;
}

export default async function MediaAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) redirect(auth.status === 401 ? "/login?next=/media/admin" : "/");
  const params = await searchParams;
  const range = parseDeskRange(params.from, params.to);
  const list = await adminListArticles();
  const audit = await adminRecentMediaAudit();
  const summary = summarizeDesk(list.articles, range);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Analytics</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#667085]">
        These figures count stored Media articles. They are not page views, and this desk does not collect search queries or referral sources.
      </p>
      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-[#172033]">
          From
          <input
            type="date"
            name="from"
            defaultValue={range.from}
            className="mt-1 block h-10 rounded-lg border border-[#e6e8ee] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
          />
        </label>
        <label className="text-sm font-semibold text-[#172033]">
          To
          <input
            type="date"
            name="to"
            defaultValue={range.to}
            className="mt-1 block h-10 rounded-lg border border-[#e6e8ee] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-[#172033] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
        >
          Apply range
        </button>
      </form>
      <p className="mt-3 text-xs text-[#667085]">
        The publication range is {range.from} through {range.to}, using UTC dates. Status and section totals cover the loaded library and ignore this range.
      </p>
      {list.failed ? (
        <div className="mt-4">
          <StorageNotice failed={!list.unavailable} />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#475467]">
            {summary.capped
              ? "This load returned 500 articles, which is the desk limit. Older articles are not included."
              : `This load includes every stored article it returned (${summary.loaded}).`}
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
              <h2 className="font-bold">Published in range</h2>
              <p className="mt-2 text-3xl font-bold tracking-[-0.03em]">{summary.publishedInRange}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#667085]">
                Articles whose status is published and whose publication timestamp falls in the UTC range above.
              </p>
            </section>
            <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
              <h2 className="font-bold">By status</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {Object.entries(summary.byStatus).map(([status, count]) => (
                  <li key={status} className="flex justify-between gap-3">
                    <span>{statusLabel(status as keyof typeof summary.byStatus)}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
              <h2 className="font-bold">By section</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {summary.byCategory.map((category) => (
                  <li key={category.slug} className="flex justify-between gap-3">
                    <span>{category.label}</span>
                    <span className="font-semibold">{category.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="mt-3 rounded-2xl border border-[#eceff3] bg-white p-4">
            <h2 className="font-bold">Publication months</h2>
            <p className="mt-1 text-xs text-[#667085]">UTC months that contain at least one publication in the selected range.</p>
            {summary.months.length === 0 ? (
              <p className="mt-3 text-sm text-[#667085]">No publications in this range.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {summary.months.map((month) => (
                  <li key={month.month} className="flex justify-between gap-3">
                    <span>{month.month}</span>
                    <span className="font-semibold">{month.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <section className="mt-4 rounded-2xl border border-[#eceff3] bg-white p-4">
        <h2 className="font-bold">Editorial activity</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#667085]">
          Recent publishing actions stored for Media articles. Names, email addresses, and IP addresses are not shown.
        </p>
        {audit.failed ? (
          <p className="mt-3 text-sm text-[#667085]">Publishing history could not be loaded.</p>
        ) : audit.entries.length === 0 ? (
          <p className="mt-3 text-sm text-[#667085]">No Media publishing actions are stored.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {audit.entries.map((entry) => (
              <li key={entry.id}>
                <time dateTime={entry.createdAt}>{formatAuditTime(entry.createdAt)}</time>
                <span> · {auditLabel(entry.action)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
