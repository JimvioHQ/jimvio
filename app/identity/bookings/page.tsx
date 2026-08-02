import type { Metadata } from "next";
import { IdentityBookingsClient } from "@/components/identity/IdentityBookingsClient";

export const metadata: Metadata = { title: "Booking inbox" };

export default function IdentityBookingsPage() {
  return <IdentityBookingsClient />;
}
