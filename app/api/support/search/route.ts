import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_ARTICLES } from "@/lib/support/articles";
import { searchSupportArticles } from "@/lib/support/search";
import { listOwnTickets } from "@/lib/support/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? undefined;
  const articles = searchSupportArticles(SUPPORT_ARTICLES, q, { category, limit: 8 });

  let tickets: Array<{ publicRef: string; subject: string; status: string; href: string }> = [];
  const includeTickets = url.searchParams.get("tickets") === "1";
  if (includeTickets && q.trim().length >= 2) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const result = await listOwnTickets(user.id, { q, limit: 5 });
      if ("tickets" in result && result.tickets) {
        tickets = result.tickets.map((ticket) => ({
          publicRef: ticket.public_ref,
          subject: ticket.subject,
          status: ticket.status,
          href: `/help/tickets/${ticket.public_ref}`,
        }));
      }
    }
  }

  return NextResponse.json({ articles, tickets });
}
