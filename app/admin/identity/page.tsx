import type { Metadata } from "next";
import { IdentityAdminVerifyClient } from "@/components/identity/IdentityAdminVerifyClient";

export const metadata: Metadata = { title: "Identity Verification · Admin" };

export default function AdminIdentityVerificationPage() {
  return <IdentityAdminVerifyClient />;
}
