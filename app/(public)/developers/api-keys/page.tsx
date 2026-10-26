import type { Metadata } from "next";
import { ApiKeyManager } from "@/components/developers/api-key-manager";
import { issuableApiScopes } from "@/lib/dropshipping/api/keys";
import { API_V1_DOCS } from "@/lib/navigation/api-v1-docs";

export const metadata: Metadata = {
  title: "API keys",
  robots: { index: false, follow: false },
};

export default function DeveloperApiKeysPage() {
  return <ApiKeyManager scopes={issuableApiScopes()} docs={API_V1_DOCS} />;
}
