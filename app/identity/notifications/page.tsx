import type { Metadata } from "next";
import { IdentityNotificationsClient } from "@/components/identity/IdentityNotificationsClient";

export const metadata: Metadata = { title: "Notifications" };

export default function IdentityNotificationsPage() {
  return <IdentityNotificationsClient />;
}
