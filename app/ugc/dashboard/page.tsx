import { permanentRedirect } from "next/navigation";

/** Creator dashboard entry redirects to the public UGC discover board. */
export default async function UgcDashboardRedirect() {
  permanentRedirect("/ugc");
}
