import { TicketDetail } from "@/components/support/ticket-detail";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return <TicketDetail publicRef={ref} />;
}
