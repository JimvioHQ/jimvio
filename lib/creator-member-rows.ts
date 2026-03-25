/**
 * Shared types + normalization for creator members table (server + client safe).
 * Supabase may return `profiles` as a single object or a one-element array depending on typings.
 */

export type MemberRow = {
  id: string;
  user_id: string;
  plan_type: string | null;
  status: string;
  created_at: string | null;
  amount_paid: number | null;
  last_active?: string | null;
  profiles: { email: string | null; full_name: string | null; avatar_url: string | null; username: string | null } | null;
};

export function normalizeMemberRows(rows: unknown[] | null | undefined): MemberRow[] {
  if (!rows?.length) return [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const p = r["profiles"];
    const prof = (Array.isArray(p) ? p[0] : p) as MemberRow["profiles"];
    return { ...r, profiles: prof ?? null } as MemberRow;
  });
}
