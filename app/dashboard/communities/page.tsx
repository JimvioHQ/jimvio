import { MyCommunitiesClient } from "@/components/dashboard/my-communities-client";

export const metadata = {
  title: "My Communities · Dashboard",
  description: "Communities you've joined and communities you own.",
};

export default function DashboardCommunitiesPage() {
  return <MyCommunitiesClient />;
}
