import Link from "next/link";
import { StorageNotice } from "@/components/editorial/admin/notice";
import { LICENSED_PROVIDERS, REJECTED_CANDIDATES, UNVERIFIED_CANDIDATES, VERIFIED_FEEDS } from "@/lib/editorial/ingest/catalog";
import { addIngestSource, enableVerifiedSource, saveIngestControls, setIngestSourceEnabled, setIngestSourceReview } from "@/lib/editorial/ingest/actions";
import { loadIngestDesk } from "@/lib/editorial/ingest/store";
import { MEDIA_CATEGORIES } from "@/lib/editorial/types";

const NOTICES: Record<string, string> = {
  storage: "Ingestion storage is not ready. The media migrations have not been applied, so nothing was saved.",
  saved: "Ingestion settings were saved.",
  stopped: "Emergency stop is on. Fetching and publishing stay closed.",
  enabled: "The source was enabled after its feed returned items.",
  denied: "You do not have permission to change ingestion.",
  invalid: "That address did not return a usable RSS or Atom feed, so it was not enabled.",
  credentials: "That provider needs credentials or a license. It was not activated.",
  autopublish: "Automatic publication was not turned on. The server authorization flag is not set.",
  confirm: "Settings were saved, but owner authorization was not granted. Type AUTHORIZE AUTOMATIC PUBLICATION to grant it.",
};

export default async function MediaSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const desk = await loadIngestDesk();
  const message = notice ? NOTICES[notice] : "";
  const known = new Set(desk.sources.map((source) => source.locator));

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Sources</h1>
      <p className="mt-1 text-sm text-[#667085]">
        External discovery uses verified feeds. The default mode creates drafts. Automatic publication is off.
      </p>
      {message ? <p className="mt-4 rounded-xl bg-[#fff8eb] px-4 py-3 text-sm text-[#8a5a12]">{message}</p> : null}
      {desk.unavailable ? <div className="mt-4"><StorageNotice /></div> : null}
      <form action={saveIngestControls} className="mt-5 space-y-4 rounded-2xl border border-[#eceff3] bg-white p-4">
        <h2 className="font-bold text-[#172033]">Publishing controls</h2>
        <label className="block text-sm">
          <span className="font-semibold">Mode</span>
          <select name="mode" defaultValue={desk.settings.mode} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3">
            <option value="disabled">Disabled</option>
            <option value="discovery">External discovery only</option>
            <option value="draft">Research and draft creation</option>
            <option value="review">Editorial review required</option>
            <option value="auto">Controlled automatic publication</option>
          </select>
        </label>
        <p className="text-sm text-[#667085]">
          Controlled automatic publication still sends the story to review unless the server flag is set and the confirmation below matches. Sensitive or single-source stories stay in review.
        </p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="emergency" defaultChecked={desk.settings.emergencyStop} />
          Emergency stop
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Daily publication cap
            <input name="cap" type="number" min={0} max={10} defaultValue={desk.settings.dailyPublishCap} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" />
            <span className="mt-1 block text-xs font-medium text-[#667085]">Target 5–10 articles a day. Stories are spaced through the UTC day. Fewer run when the checks do not pass. A cap of 0 keeps new stories in review.</span>
          </label>
          <label className="text-sm">Items per run
            <input name="items" type="number" min={1} max={40} defaultValue={desk.settings.maxItemsPerRun} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" />
          </label>
          <label className="text-sm">Retry limit
            <input name="retries" type="number" min={1} max={8} defaultValue={desk.settings.retryLimit} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" />
          </label>
          <label className="text-sm">Stale after days
            <input name="stale" type="number" min={1} max={90} defaultValue={desk.settings.staleDays} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Blocked categories</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {MEDIA_CATEGORIES.map((category) => (
              <label key={category.slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="blocked" value={category.slug} defaultChecked={desk.settings.blockedCategories.includes(category.slug)} />
                {category.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="owner" defaultChecked={desk.settings.ownerAutopublishAuthorized} />
          Owner authorizes automatic publication
        </label>
        <label className="block text-sm">
          Confirmation phrase
          <input name="confirmation" autoComplete="off" placeholder={desk.settings.ownerAutopublishAuthorized ? "Already authorized. Leave blank to keep it." : "AUTHORIZE AUTOMATIC PUBLICATION"} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" />
          <span className="mt-1 block text-xs text-[#667085]">{desk.settings.ownerAutopublishAuthorized ? "Authorization is active. Untick the box above to revoke it." : "Needed only to grant authorization the first time."}</span>
        </label>
        <button type="submit" className="inline-flex h-11 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">Save controls</button>
      </form>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Verified public feeds</h2>
        <p className="mt-1 text-sm text-[#667085]">Each feed was checked before it was listed. Enabling it checks the feed again.</p>
        <div className="mt-3 space-y-3">
          {VERIFIED_FEEDS.map((source) => (
            <article key={source.locator} className="rounded-2xl border border-[#eceff3] bg-white p-4">
              <h3 className="font-bold">{source.name}</h3>
              <p className="mt-1 break-all text-sm text-[#344054]">{source.locator}</p>
              <p className="mt-2 text-sm text-[#667085]">{source.termsNote}</p>
              <p className="mt-1 text-sm text-[#667085]">{source.rateNote}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#98a2b3]">{source.accessMethod} · {source.language} · {source.region} · images {source.imageRights}</p>
              {known.has(source.locator) ? (
                <p className="mt-3 text-sm font-semibold text-[#067647]">Already in the registry.</p>
              ) : (
                <form action={enableVerifiedSource} className="mt-3">
                  <input type="hidden" name="locator" value={source.locator} />
                  <button type="submit" className="inline-flex h-11 items-center rounded-lg border border-[#fd5000] px-4 text-sm font-semibold text-[#fd5000]">Enable after a live check</button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Candidates · not yet verified</h2>
        <p className="mt-1 text-sm text-[#667085]">
          These feeds are discovery candidates only. Jimvio has not confirmed their live feed health, publisher terms, or access policies. They cannot be enabled from this list.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {UNVERIFIED_CANDIDATES.map((source) => (
            <article key={source.locator} className="rounded-2xl border border-dashed border-[#d0d5dd] bg-[#fcfcfd] p-4">
              <h3 className="font-bold">{source.name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#8a5a12]">{source.region} · {source.language} · Not verified</p>
              <p className="mt-2 break-all text-sm text-[#344054]">{source.locator}</p>
              <p className="mt-2 text-sm text-[#667085]">{source.termsNote}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[#eceff3] bg-white">
        <h2 className="px-4 pt-4 font-bold">Registry</h2>
        <table className="mt-2 w-full min-w-[640px] text-left text-sm">
          <thead className="text-[#667085]">
            <tr>
              <th className="px-4 py-2 font-semibold">Source</th>
              <th className="px-4 py-2 font-semibold">Health</th>
              <th className="px-4 py-2 font-semibold">Last success</th>
              <th className="px-4 py-2 font-semibold">Control</th>
            </tr>
          </thead>
          <tbody>
            {desk.sources.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-4 text-[#667085]">No sources are saved yet.</td></tr>
            ) : desk.sources.map((source) => (
              <tr key={source.id} className="border-t border-[#eceff3]">
                <td className="px-4 py-3">
                  <p className="font-semibold">{source.name}</p>
                  <p className="break-all text-[#667085]">{source.locator}</p>
                  <p className="text-xs text-[#98a2b3]">{source.enabled ? "Enabled" : "Disabled"} · every {source.pollMinutes} minutes · {source.permittedUsage} · {source.alwaysReview ? "always sent to review" : "may publish automatically when every check passes"}</p>
                </td>
                <td className="px-4 py-3">{source.health}{source.lastError ? `: ${source.lastError}` : ""}</td>
                <td className="px-4 py-3">{source.lastSuccessAt ? source.lastSuccessAt.slice(0, 16).replace("T", " ") : "Never"}</td>
                <td className="px-4 py-3">
                  <form action={setIngestSourceEnabled}>
                    <input type="hidden" name="id" value={source.id} />
                    <input type="hidden" name="enabled" value={source.enabled ? "0" : "1"} />
                    <button type="submit" className="inline-flex h-11 items-center rounded-lg border border-[#e6e8ee] px-3 text-sm font-semibold">{source.enabled ? "Disable" : "Enable saved source"}</button>
                  </form>
                  <form action={setIngestSourceReview} className="mt-2">
                    <input type="hidden" name="id" value={source.id} />
                    <input type="hidden" name="review" value={source.alwaysReview ? "0" : "1"} />
                    <button type="submit" className="inline-flex h-11 items-center rounded-lg border border-[#e6e8ee] px-3 text-sm font-semibold">{source.alwaysReview ? "Allow automatic publishing" : "Always send to review"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form action={addIngestSource} className="mt-6 space-y-3 rounded-2xl border border-[#eceff3] bg-white p-4">
        <h2 className="font-bold">Add a feed</h2>
        <p className="text-sm text-[#667085]">An enabled feed is fetched once before it is saved. Licensed providers cannot be activated here.</p>
        <label className="block text-sm">Name<input name="name" required className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" /></label>
        <label className="block text-sm">HTTPS feed URL<input name="locator" type="url" required className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Kind
            <select name="kind" className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3">
              <option value="rss">RSS</option>
              <option value="atom">Atom</option>
              <option value="announcement">Announcement feed</option>
              <option value="educational">Educational feed</option>
            </select>
          </label>
          <label className="text-sm">Category
            <select name="category" className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3">
              {MEDIA_CATEGORIES.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}
            </select>
          </label>
          <label className="text-sm">Permitted use
            <select name="usage" className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3">
              <option value="facts">Facts for an original briefing</option>
              <option value="link">Link only</option>
              <option value="full">Licensed full text, still rewritten</option>
            </select>
          </label>
          <label className="text-sm">Language<input name="language" defaultValue="en" className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" /></label>
          <label className="text-sm">Region<input name="region" defaultValue="global" className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" /></label>
          <label className="text-sm">Poll minutes<input name="poll" type="number" min={60} max={10080} defaultValue={360} className="mt-1 h-11 w-full rounded-lg border border-[#e6e8ee] px-3" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="review" /> Always send drafts to review</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" /> Enable after the feed check succeeds</label>
        <button type="submit" className="inline-flex h-11 items-center rounded-lg bg-[#172033] px-4 text-sm font-semibold text-white">Save source</button>
      </form>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#eceff3] bg-white p-4">
          <h2 className="font-bold">Needs a license or key</h2>
          <ul className="mt-2 space-y-2 text-sm text-[#344054]">
            {LICENSED_PROVIDERS.map((provider) => <li key={provider.name}><span className="font-semibold">{provider.name}.</span> {provider.reason}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#eceff3] bg-white p-4">
          <h2 className="font-bold">Checked and not registered</h2>
          <ul className="mt-2 space-y-2 text-sm text-[#344054]">
            {REJECTED_CANDIDATES.map((candidate) => <li key={candidate.name}><span className="font-semibold">{candidate.name}.</span> {candidate.reason}</li>)}
          </ul>
        </div>
      </section>
      <p className="mt-4 text-sm">
        <Link href="/media/admin/ingestion" className="font-semibold text-[#fd5000]">Open ingestion desk</Link>
      </p>
    </div>
  );
}
