import Link from "next/link";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { retryIngestSource, runIngestNow } from "@/lib/editorial/ingest/actions";
import { loadIngestDesk } from "@/lib/editorial/ingest/store";

const NOTICES: Record<string, string> = {
  storage: "Ingestion storage is not ready. No external items were written.",
  stopped: "Emergency stop is on. The cycle did not fetch sources.",
  disabled: "Ingestion is disabled. Change the mode on Sources to run a cycle.",
  ran: "The ingestion cycle finished.",
  retry_limited: "That source has reached its retry limit.",
  invalid: "That retry could not be started.",
  denied: "You do not have permission to run ingestion.",
};

export default async function MediaIngestionPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; drafted?: string; review?: string; published?: string; failed?: string }>;
}) {
  const params = await searchParams;
  const desk = await loadIngestDesk();
  const names = new Map(desk.sources.map((source) => [source.id, source.name]));
  const failedJobs = desk.jobs.filter((job) => String(job.status ?? "") === "failed").length;
  const lastSuccess =
    desk.sources
      .map((source) => source.lastSuccessAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const message = params.notice ? NOTICES[params.notice] ?? "" : "";
  const counts = ["drafted", "review", "published", "failed"]
    .map((key) => {
      const value = Number(params[key as "drafted"]);
      return Number.isInteger(value) && value >= 0 && value < 1000 ? `${key} ${value}` : "";
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em]">Ingestion</h1>
          <p className="mt-1 text-sm text-[#667085]">Discovered items, evidence, image rights, and failed jobs. Drafts stay off the public site.</p>
        </div>
        <form action={runIngestNow}>
          <button type="submit" className="inline-flex h-11 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">Run due sources</button>
        </form>
      </div>
      {message ? <p className="mt-4 rounded-xl bg-[#fff8eb] px-4 py-3 text-sm text-[#8a5a12]">{message}{counts ? ` ${counts}.` : ""}</p> : null}
      {desk.unavailable ? <div className="mt-4"><StorageNotice /></div> : null}
      <p className="mt-4 text-sm text-[#344054]">
        Mode: <span className="font-semibold">{desk.settings.mode}</span>. Emergency stop: <span className="font-semibold">{desk.settings.emergencyStop ? "on" : "off"}</span>.
        Daily cap: <span className="font-semibold">{desk.settings.dailyPublishCap}</span>.
        Owner automatic publication: <span className="font-semibold">{desk.settings.ownerAutopublishAuthorized ? "recorded" : "not authorized"}</span>.
        Queue: <span className="font-semibold">{desk.items.length}</span> stored items, <span className="font-semibold">{failedJobs}</span> failed jobs in this view.
        {lastSuccess ? (
          <> Last source success: <time dateTime={lastSuccess}>{lastSuccess}</time>.</>
        ) : (
          <> No source has succeeded yet.</>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/media/admin/articles?status=review" className="text-[#fd5000]">Editorial review queue</Link>
        <Link href="/media/admin/scheduled" className="text-[#fd5000]">Scheduled</Link>
        <Link href="/media/admin/articles?status=published" className="text-[#fd5000]">Published</Link>
        <Link href="/media/admin/sources" className="text-[#fd5000]">Sources</Link>
      </div>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[#eceff3] bg-white">
        <h2 className="px-4 pt-4 font-bold">Discovered stories</h2>
        <table className="mt-2 w-full min-w-[760px] text-left text-sm">
          <thead className="text-[#667085]">
            <tr>
              <th className="px-4 py-2 font-semibold">Item</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Image</th>
              <th className="px-4 py-2 font-semibold">Article</th>
            </tr>
          </thead>
          <tbody>
            {desk.items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-4 text-[#667085]">No external items are stored.</td></tr>
            ) : desk.items.map((item) => {
              const id = String(item.id ?? "");
              const status = String(item.status ?? "");
              return (
                <tr key={id} className="border-t border-[#eceff3] align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{String(item.title ?? "")}</p>
                    <p className="text-[#667085]">{names.get(String(item.source_id ?? "")) ?? "Source"}</p>
                    {String(item.url ?? "").startsWith("https://") ? (
                      <a href={String(item.url ?? "")} rel="noopener noreferrer" className="break-all text-[#3b5ccc]">{String(item.url ?? "")}</a>
                    ) : null}
                    {item.duplicate_of ? <p className="mt-1 text-xs text-[#98a2b3]">Duplicate of {String(item.duplicate_of)}</p> : null}
                    {item.evidence ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold">Evidence</summary>
                        <p className="mt-1 whitespace-pre-wrap text-[#344054]">{String(item.evidence)}</p>
                      </details>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {status}
                    {item.sensitive ? " · sensitive" : ""}
                    {item.filter_reason ? ` · ${String(item.filter_reason)}` : ""}
                  </td>
                  <td className="px-4 py-3">{String(item.image_status ?? "")}{item.image_note ? `: ${String(item.image_note)}` : ""}</td>
                  <td className="px-4 py-3">
                    {item.article_id ? <Link href={`/media/admin/articles/${String(item.article_id)}`} className="font-semibold text-[#fd5000]">Open draft</Link> : "None"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[#eceff3] bg-white">
        <h2 className="px-4 pt-4 font-bold">Jobs</h2>
        <table className="mt-2 w-full min-w-[680px] text-left text-sm">
          <thead className="text-[#667085]">
            <tr>
              <th className="px-4 py-2 font-semibold">Job</th>
              <th className="px-4 py-2 font-semibold">Result</th>
              <th className="px-4 py-2 font-semibold">Retry</th>
            </tr>
          </thead>
          <tbody>
            {desk.jobs.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-4 text-[#667085]">No ingestion jobs are stored.</td></tr>
            ) : desk.jobs.map((job) => {
              const id = String(job.id ?? "");
              const failed = String(job.status ?? "") === "failed";
              const sourceId = String(job.source_id ?? "");
              return (
                <tr key={id} className="border-t border-[#eceff3]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{names.get(sourceId) ?? "Source"}</p>
                    <p className="text-[#667085]">{String(job.kind ?? "")} · attempt {String(job.attempt ?? "")}</p>
                  </td>
                  <td className="px-4 py-3">{String(job.status ?? "")}{job.error ? `: ${String(job.error)}` : ""} · {String(job.item_count ?? 0)} items</td>
                  <td className="px-4 py-3">
                    {failed && sourceId ? (
                      <form action={retryIngestSource}>
                        <input type="hidden" name="id" value={sourceId} />
                        <button type="submit" className="inline-flex h-11 items-center rounded-lg border border-[#e6e8ee] px-3 text-sm font-semibold">Retry</button>
                      </form>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
