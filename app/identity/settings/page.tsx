import { redirect } from "next/navigation";

export const metadata = { title: "Settings" };

export default function IdentitySettingsRedirectPage() {
  redirect("/settings/profile");
}
