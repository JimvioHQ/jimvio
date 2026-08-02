import type { Metadata } from "next";
import { identityFontVariables } from "@/app/identity/fonts";
import { IdentityShell } from "@/components/identity/identity-ui";

export const metadata: Metadata = {
  title: {
    template: "%s · Jimvio",
    default: "Profile · Jimvio",
  },
};

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={identityFontVariables}>
      <IdentityShell>{children}</IdentityShell>
    </div>
  );
}
