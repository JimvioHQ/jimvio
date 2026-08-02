import type { Metadata } from "next";
import { identityFontVariables } from "./fonts";
import { IdentityShell } from "@/components/identity/identity-ui";

export const metadata: Metadata = {
  title: {
    template: "%s · Jimvio Identity",
    default: "Jimvio Identity",
  },
};

export default function IdentityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={identityFontVariables}>
      <IdentityShell>{children}</IdentityShell>
    </div>
  );
}
