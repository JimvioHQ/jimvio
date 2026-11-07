import { permanentRedirect } from "next/navigation";

/**
 * Brand workspace "Orders" historically pointed at a missing Campaign Center route.
 * Seller order fulfillment lives on the marketplace /orders surface.
 */
export default async function CampaignCenterOrdersRedirect() {
  permanentRedirect("/orders");
}
