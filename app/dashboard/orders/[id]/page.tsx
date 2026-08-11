import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Compatibility shim — canonical order detail lives at `/orders/[id]`. */
export default async function DashboardOrderDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/orders/${id}`);
}
