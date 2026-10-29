import { permanentRedirect } from "next/navigation";

// View Checker became the Jimvio Trust Checker, open to everyone.
export default function Page() {
  permanentRedirect("/trust-checker");
}
