import { permanentRedirect } from "next/navigation";
import { UGC_BRAND_WORKSPACE_CANONICAL } from "@/lib/ugc/routes";

/**
 * Compatibility alias. Without this static segment, /ugc/brand-workspace is
 * incorrectly captured by /ugc/[id] as a campaign detail id.
 */
export default async function BrandWorkspaceAliasRedirect() {
  permanentRedirect(UGC_BRAND_WORKSPACE_CANONICAL);
}
