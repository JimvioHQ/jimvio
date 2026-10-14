import Link from "next/link";
import { PageHeader } from "@/components/ui/admin";
import { adminBtnSecondary, adminInputClass, adminTableShell } from "@/lib/admin/ui";
import { setAffiliateActiveAction } from "@/lib/admin/portal-actions";
import { getAdminDB } from "@/services/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const state = params.state === "active" || params.state === "suspended" ? params.state : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  let query = getAdminDB()
    .from("affiliates")
    .select("id, affiliate_code, is_active, tier, total_clicks, total_conversions, pending_earnings, available_balance", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.ilike("affiliate_code", `%${q.replace(/[%_]/g, "")}%`);
  if (state === "active") query = query.eq("is_active", true);
  if (state === "suspended") query = query.eq("is_active", false);
  const { data, count, error } = await query;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Affiliate" title="Affiliates" subtitle="Account status only. Balances are read from the ledger fields and cannot be marked paid from this screen." />
      <form className="flex flex-wrap gap-2" action="/admin/affiliates">
        <input name="q" defaultValue={q} placeholder="Affiliate code" className={adminInputClass} />
        <select name="state" defaultValue={state} className={adminInputClass}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className={adminBtnSecondary} type="submit">Filter</button>
      </form>
      {error ? <p className="text-sm text-rose-600">Affiliates could not be loaded.</p> : null}
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 font-medium">{row.affiliate_code}</td>
                <td className="px-4 py-3">{row.tier ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{row.total_clicks ?? 0}</td>
                <td className="px-4 py-3 tabular-nums">{row.pending_earnings ?? 0}</td>
                <td className="px-4 py-3">{row.is_active ? "Active" : "Suspended"}</td>
                <td className="px-4 py-3">
                  <form action={setAffiliateActiveAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="active" value={row.is_active ? "0" : "1"} />
                    <input name="reason" required minLength={8} placeholder="Reason" className={adminInputClass} />
                    <button className={adminBtnSecondary} type="submit">{row.is_active ? "Suspend" : "Restore"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={6}>No affiliates match this filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{count ?? 0} affiliates</p>
      <CommissionHistory />
      <div className="flex gap-3 text-sm">
        {page > 1 ? <Link href={`/admin/affiliates?page=${page - 1}&q=${encodeURIComponent(q)}&state=${state}`}>Previous</Link> : null}
        {from + rows.length < (count ?? 0) ? <Link href={`/admin/affiliates?page=${page + 1}&q=${encodeURIComponent(q)}&state=${state}`}>Next</Link> : null}
      </div>
    </div>
  );
}

async function CommissionHistory() {
  const { data, error } = await getAdminDB()
    .from("affiliate_commissions")
    .select("id, order_id, commission_amount, status, lifecycle_status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Recent commissions</h2>
      <p className="text-xs text-[var(--color-text-muted)]">Read only. This list does not mark a commission or payout as paid.</p>
      {error ? <p className="text-sm text-rose-600">Commissions could not be loaded.</p> : null}
      <div className={adminTableShell}>
        <table className="w-full text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Lifecycle</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 font-mono text-[11px]">{row.order_id}</td>
                <td className="px-4 py-3 tabular-nums">{row.commission_amount}</td>
                <td className="px-4 py-3">{row.status ?? "—"}</td>
                <td className="px-4 py-3">{row.lifecycle_status}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 ? <tr><td className="px-4 py-8 text-[var(--color-text-muted)]" colSpan={4}>No commission rows.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
