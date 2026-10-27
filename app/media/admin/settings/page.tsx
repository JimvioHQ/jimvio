import { adminListArticles } from "@/lib/editorial/admin-store";
import { StorageNotice } from "@/components/editorial/admin/notice";

export default async function MediaSettingsPage() {
  const list = await adminListArticles();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-[-0.03em]">Settings</h1>
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#344054]">
        {list.failed ? <StorageNotice failed={!list.unavailable} /> : <p className="rounded-xl bg-[#eefbf3] px-4 py-3 text-[#067647]">Media storage is responding.</p>}
        <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
          <h2 className="font-bold text-[#172033]">Who can publish</h2>
          <p className="mt-2">
            Publishing uses the existing platform administrator check: an active admin role, or an operator listed in the server admin allowlist. Ordinary accounts cannot create, schedule, or publish stories. Preview deployments cannot publish.
          </p>
        </section>
        <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
          <h2 className="font-bold text-[#172033]">Workflow</h2>
          <p className="mt-2">
            Save Draft keeps a story private. Send to review marks it for another administrator. Schedule holds it until the chosen time. Publish asks for confirmation and then makes it public. Unpublish returns it to drafts.
          </p>
        </section>
        <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
          <h2 className="font-bold text-[#172033]">External ingestion</h2>
          <p className="mt-2">
            Source registration, sync status, drafts, and the emergency stop are on Sources and Ingestion. Automatic publication stays off until the server authorization flag is set and an administrator confirms it. Drafts are not public.
          </p>
        </section>
        <section className="rounded-2xl border border-[#eceff3] bg-white p-4">
          <h2 className="font-bold text-[#172033]">Content rules</h2>
          <p className="mt-2">
            Article HTML is limited to text, lists, links, and headings. Scripts, embeds, and inline event handlers are removed. Featured images must be https addresses or files checked on upload. The public site does not show view counts or an editorial-team byline.
          </p>
        </section>
      </div>
    </div>
  );
}
