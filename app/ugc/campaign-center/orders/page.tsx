import { redirect } from "next/navigation";

/**
 * Brand workspace "Orders" historically pointed at a missing Campaign Center route.
 * Seller order fulfillment lives on the marketplace /orders surface.
 */
export default function CampaignCenterOrdersRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;
  redirect("/orders");
}
