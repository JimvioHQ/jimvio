import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { CommerceShell } from "@/components/commerce-os/commerce-shell";

export default async function CommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/commerce");
  }

  return <CommerceShell>{children}</CommerceShell>;
}
