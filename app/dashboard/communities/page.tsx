import { MyCommunitiesClient } from "@/components/dashboard/my-communities-client";

export const metadata = {
  title: "Communities · Dashboard",
  description:
    "Community Hub — manage communities you own or administer from the Owner Console.",
};

export default function DashboardCommunitiesPage() {
  return <MyCommunitiesClient />;
}
