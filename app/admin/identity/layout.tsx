import type { Metadata } from "next";
import { identityFontVariables } from "@/app/identity/fonts";
import { IdentityShell } from "@/components/identity/identity-ui";

export const metadata: Metadata = {
  title: "Identity Verification · Admin · Jimvio",
};

export default function AdminIdentityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={identityFontVariables}>
      <IdentityShell contained className="p-4 lg:p-8">
        {children}
      </IdentityShell>
    </div>
  );
}
