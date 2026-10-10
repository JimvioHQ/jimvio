import Link from "next/link";
import { TicketList } from "@/components/support/ticket-list";

export default function MyTicketsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">My tickets</h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Only tickets on the signed-in account are listed. A reference by itself is not access.
          </p>
        </div>
        <Link href="/help/tickets/new" className="rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white">
          Create a ticket
        </Link>
      </div>
      <TicketList />
    </div>
  );
}
