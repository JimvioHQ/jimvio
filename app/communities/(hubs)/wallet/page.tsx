import { redirect } from "next/navigation";

/** Community Wallet deep-links to the canonical Jimvio Wallet. */
export default function CommunityWalletRedirectPage() {
  redirect("/wallet");
}
