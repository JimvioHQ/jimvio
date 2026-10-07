import { redirect } from "next/navigation";

/**
 * Jimvio does not currently publish a public investor-relations dossier
 * (no verified funding, valuation, or securities materials in-repo).
 * Route investors to the contact form instead of a fabricated IR page.
 */
export default function InvestorsRedirectPage() {
  redirect("/contact?topic=investors");
}
